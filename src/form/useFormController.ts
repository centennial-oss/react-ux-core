// The form controller: creates the TanStack form for a config and runs the submit lifecycle
// (editing → validating → submitting → succeeded | failed | needs-confirmation). ConfigForm and every container use
// it; each form has exactly one.

import {
  evaluate,
  useForm,
  useSelector,
  type AnyFormApi,
  type StandardSchemaV1,
} from '@tanstack/react-form';
import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  createElement,
  Fragment,
  type ReactNode,
  type Ref,
} from 'react';
import { toast } from '../components/Toast/toastStore';

import { useControllableState } from '../utils/useControllableState';
import { applyDependents } from './dependents';
import { fieldKey, findField } from './fieldIndex';
import { focusFirstInvalid } from './focus';
import type { AnyFieldConfig } from './internalTypes';
import { normalizePath } from './paths';
import { useFieldRegistry, type FieldRegistry } from './registry';
import type { ActionInfo, FormMode, FormRuntime, ResolvedSection, SubmitStatus } from './runtime';
import type { FormConfig, SubmitResult, SubmitSuccess } from './types';
import { createUploadStore, runUploads } from './uploads';
import { configFormValidationLogic, createSchemaValidators } from './validation';
import { buildPatch, getDirtyFields, prepareSubmitValues, type SubmitValueOptions } from './values';
import { useFormMessages } from './messages';

/** Reported to `onSuccess` after a create, update or delete succeeds. */
export interface FormSuccessEvent<V> {
  action: 'create' | 'update' | 'delete';
  result: SubmitSuccess;
  /** The submitted values (hidden fields and `emptyAs` applied). */
  values: V;
}

/** Imperative access to a form, through `ref`. */
export interface ConfigFormHandle<V> {
  /** Re-seeds the form: with `values`, they become the new defaults. */
  reset: (values?: V) => void;
  /** Validates and submits, like pressing the submit button. */
  submit: () => void;
  getValues: () => V;
  /** Whether any value differs from the defaults. */
  isDirty: () => boolean;
}

export interface FormControllerOptions<V, TCustom extends string = never> {
  config: FormConfig<V, TCustom>;
  /** Field renderers. Defaults to the nearest `FieldRegistryContext`, or the built-ins. */
  registry?: FieldRegistry;
  /** `view` shows the values read-only. Controlled; see `defaultMode`. */
  mode?: FormMode;
  defaultMode?: FormMode;
  onModeChange?: (mode: FormMode) => void;
  /** Shows Edit in view mode and returns to view mode after a save or cancel. */
  hasEditToggle?: boolean;
  /** When this changes, the form re-seeds from `config.defaultValues` (for example when another record loads). */
  resetKey?: unknown;
  /** Called when the form gains or loses unsaved changes (to block navigation, for example). */
  onDirtyChange?: (isDirty: boolean) => void;
  /** Called when any value changes. Observe only: the form owns its values. */
  onValuesChange?: (values: V) => void;
  onSuccess?: (event: FormSuccessEvent<V>) => void;
  ref?: Ref<ConfigFormHandle<V>>;
}

function errorText(reason: unknown, fallback: string): string {
  return reason instanceof Error && reason.message !== '' ? reason.message : fallback;
}

function resolveSections(
  fields: readonly AnyFieldConfig[],
  layout: FormConfig<unknown>['layout'],
): ResolvedSection[] {
  if (!layout || layout.length === 0) {
    return [
      {
        id: 'fields',
        isCollapsible: false,
        defaultExpanded: true,
        columns: 1,
        fields,
      },
    ];
  }
  const byKey = new Map(fields.map((field) => [fieldKey(field), field]));
  const placed = new Set<string>();
  const sections: ResolvedSection[] = layout.map((section) => ({
    id: section.id,
    title: section.title,
    description: section.description,
    isCollapsible: section.isCollapsible ?? false,
    defaultExpanded: section.defaultExpanded ?? true,
    columns: section.columns ?? 1,
    fields: section.fields.flatMap((reference) => {
      const key = byKey.has(reference) ? reference : normalizePath(reference);
      const field = byKey.get(key);
      if (!field) {
        return [];
      }
      placed.add(key);
      return [field];
    }),
  }));
  // Fields no section lists still show, in a last untitled section, so nothing disappears silently.
  const rest = fields.filter((field) => !placed.has(fieldKey(field)));
  if (rest.length > 0) {
    sections.push({
      id: '__rest',
      isCollapsible: false,
      defaultExpanded: true,
      columns: 1,
      fields: rest,
    });
  }
  return sections;
}

function actionInfo(config: FormConfig<unknown>): ActionInfo {
  const { actions } = config;
  if (!actions) {
    return { kind: 'none', hasRevert: false, hasDelete: false };
  }
  if (actions.create) {
    return { kind: 'create', submitLabel: actions.submitLabel, hasRevert: false, hasDelete: false };
  }
  return {
    kind: 'update',
    submitLabel: actions.submitLabel,
    hasRevert: actions.hasRevert ?? true,
    hasDelete: actions.delete !== undefined,
    deleteConfirmation: actions.deleteConfirmation,
  };
}

/** Clears server errors on every field (before a new submit or a revert). */
function clearServerErrors(form: AnyFormApi) {
  for (const name of Object.keys(form.state.fieldMeta)) {
    const meta = form.getFieldMeta(name);
    if (meta?.errorMap.onServer !== undefined) {
      form.setFieldMeta(name, (previous) => ({
        ...previous,
        errorMap: { ...previous.errorMap, onServer: undefined },
      }));
    }
  }
}

function setServerError(form: AnyFormApi, path: string, message: string) {
  form.setFieldMeta(path, (previous) => ({
    ...previous,
    errorMap: { ...previous.errorMap, onServer: message },
  }));
}

/** Names of mounted fields that have errors. */
function invalidFieldNames(form: AnyFormApi): string[] {
  return Object.entries(form.state.fieldMeta)
    .filter(([, meta]) => (meta?.errors.length ?? 0) > 0)
    .map(([name]) => name);
}

export function useFormController<V, TCustom extends string = never>(
  options: FormControllerOptions<V, TCustom>,
): FormRuntime {
  const { config, resetKey, hasEditToggle = false } = options;
  const messages = useFormMessages();
  const contextRegistry = useFieldRegistry();
  const registry = options.registry ?? contextRegistry;
  const formId = useId();
  const fields: readonly AnyFieldConfig[] = config.fields;
  const looseConfig = config as unknown as FormConfig<unknown>;

  // The current defaults: the config's, until a save or reset re-seeds the form with other values. Dirty state
  // compares against them, and TanStack Form is given them (it re-applies its options on every render, so it must
  // see the re-seeded values too). A new `config.defaultValues` (by deep comparison) replaces them; TanStack then
  // shows it if the user hasn't touched the form.
  const [defaults, setDefaults] = useState<V>(config.defaultValues);
  const [configDefaults, setConfigDefaults] = useState<V>(config.defaultValues);
  if (!evaluate(configDefaults, config.defaultValues)) {
    setConfigDefaults(config.defaultValues);
    setDefaults(config.defaultValues);
  }
  const defaultsRef = useRef(defaults);

  const [mode, setMode] = useControllableState<FormMode>(
    options.mode,
    options.defaultMode ?? 'edit',
    options.onModeChange,
  );
  const [status, setStatusState] = useState<SubmitStatus>('editing');
  // Mirrors `status` synchronously, so a submit can report how it ended as soon as it settles.
  const statusRef = useRef<SubmitStatus>('editing');
  const setStatus = useCallback((next: SubmitStatus) => {
    statusRef.current = next;
    setStatusState(next);
  }, []);
  const [formError, setFormError] = useState<ReactNode>(null);
  const [announcement, setAnnouncement] = useState('');
  const [confirmation, setConfirmation] = useState<FormRuntime['confirmation']>(null);
  const [reloadKeys, setReloadKeys] = useState<Record<string, number>>({});
  const [forcedOpenSections, setForcedOpenSections] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [focusRequest, setFocusRequest] = useState(0);
  const [uploads] = useState(createUploadStore);
  const rootRef = useRef<HTMLElement | null>(null);
  const isConfirmedRef = useRef(false);
  const isSubmittingRef = useRef(false);

  const sections = useMemo(
    () => resolveSections(fields, looseConfig.layout),
    [fields, looseConfig.layout],
  );
  const actions = useMemo(() => actionInfo(looseConfig), [looseConfig]);
  const valueOptions: SubmitValueOptions = useMemo(
    () => ({
      emptyAs: config.emptyAs ?? 'null',
      shouldSubmitHiddenFields: config.shouldSubmitHiddenFields ?? false,
    }),
    [config.emptyAs, config.shouldSubmitHiddenFields],
  );

  // The latest props for TanStack callbacks, which outlive a render.
  const latest = useRef({ config, fields, sections, messages, options, valueOptions, setMode });
  useLayoutEffect(() => {
    latest.current = { config, fields, sections, messages, options, valueOptions, setMode };
    defaultsRef.current = defaults;
  });

  const schemaValidators = useMemo(
    () =>
      config.schema
        ? createSchemaValidators(
            config.schema as StandardSchemaV1<unknown, unknown>,
            () => latest.current.fields,
          )
        : undefined,
    [config.schema],
  );

  const handlers = useRef<{ submit: () => Promise<void>; invalid: () => void }>({
    submit: () => Promise.resolve(),
    invalid: () => undefined,
  });

  const form = useForm({
    defaultValues: defaults,
    validationLogic: configFormValidationLogic,
    // Always validate everything on submit (TanStack would otherwise stop early on known errors).
    canSubmitWhenInvalid: true,
    validators: schemaValidators,
    listeners: {
      onChange: ({ fieldApi }) => {
        const name: unknown = fieldApi.name;
        if (typeof name !== 'string') {
          return;
        }
        const reloads = applyDependents(engine, latest.current.fields, name);
        if (reloads.length > 0) {
          setReloadKeys((keys) => {
            const next = { ...keys };
            for (const path of reloads) {
              next[path] = (next[path] ?? 0) + 1;
            }
            return next;
          });
        }
      },
    },
    onSubmit: () => handlers.current.submit(),
    onSubmitInvalid: () => {
      handlers.current.invalid();
    },
  });
  const engine: AnyFormApi = form;

  /** Resets the form to `values` (which become the defaults) or to the current defaults. */
  const reseed = useCallback(
    (values?: V) => {
      const next = values ?? defaultsRef.current;
      defaultsRef.current = next;
      setDefaults(next);
      engine.reset(next);
      clearServerErrors(engine);
      setFormError(null);
      setAnnouncement('');
      setStatus('editing');
    },
    [engine, setStatus],
  );

  const requestFocus = useCallback(() => {
    // Open collapsed sections that hold an invalid field, then focus it once they've rendered.
    const invalid = invalidFieldNames(engine);
    const open = new Set<string>();
    for (const section of latest.current.sections) {
      if (
        section.isCollapsible &&
        section.fields.some((field) =>
          invalid.some((name) => {
            const key = fieldKey(field);
            return name === key || name.startsWith(`${key}.`) || name.startsWith(`${key}[`);
          }),
        )
      ) {
        open.add(section.id);
      }
    }
    setForcedOpenSections(open);
    setFocusRequest((count) => count + 1);
  }, [engine]);

  useEffect(() => {
    if (focusRequest === 0) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      focusFirstInvalid(rootRef.current);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [focusRequest]);

  const applyResult = useCallback(
    (result: SubmitResult, values: V, submitted: V) => {
      const { messages: text, options: currentOptions } = latest.current;
      if (result.ok === true) {
        const kind = actions.kind === 'update' ? 'update' : 'create';
        // An update re-seeds with the saved values (no longer dirty); a create starts over.
        reseed(kind === 'update' ? values : undefined);
        setStatus('succeeded');
        if (result.message !== undefined) {
          toast.success(result.message);
        }
        currentOptions.onSuccess?.({ action: kind, result, values: submitted });
        if (hasEditToggle) {
          latest.current.setMode('view');
        }
        return;
      }
      if (result.ok === 'confirm') {
        setStatus('needs-confirmation');
        setConfirmation({ warning: result.warning, confirmLabel: result.confirmLabel });
        return;
      }
      setStatus('failed');
      const unplaced: string[] = [];
      let placed = 0;
      for (const [path, message] of Object.entries(result.fieldErrors ?? {})) {
        const match = findField(latest.current.fields, path, values);
        if (match?.isVisible) {
          setServerError(engine, match.path, message);
          placed += 1;
        } else {
          unplaced.push(message);
        }
      }
      const parts: ReactNode[] = [];
      if (result.formError !== undefined && result.formError !== null) {
        parts.push(result.formError);
      }
      if (unplaced.length > 0) {
        parts.push(unplaced.join(' '));
      }
      if (parts.length === 0 && placed === 0) {
        parts.push(text.genericError);
      }
      setFormError(
        parts.length === 0
          ? null
          : parts.length === 1
            ? parts[0]
            : createElement(
                Fragment,
                null,
                ...parts.flatMap((part, index) => (index === 0 ? [part] : [' ', part])),
              ),
      );
      if (placed > 0) {
        setAnnouncement(text.fixFields({ count: placed }));
        requestFocus();
      }
    },
    [actions.kind, engine, hasEditToggle, requestFocus, reseed, setStatus],
  );

  handlers.current.submit = async () => {
    const { config: current, messages: text, valueOptions: valueOpts } = latest.current;
    const action = current.actions?.create ?? current.actions?.update;
    if (!action) {
      return;
    }
    setStatus('submitting');
    const failures = await runUploads(engine, latest.current.fields, uploads, text);
    if (failures.length > 0) {
      for (const failure of failures) {
        setServerError(engine, failure.path, failure.message);
      }
      setStatus('failed');
      setAnnouncement(text.fixFields({ count: failures.length }));
      requestFocus();
      return;
    }
    const values = engine.state.values as V;
    const defaults = defaultsRef.current;
    const submitted = prepareSubmitValues(values, latest.current.fields, valueOpts);
    const context = {
      dirtyFields: getDirtyFields(values, defaults, latest.current.fields, valueOpts),
      patch: buildPatch(values, defaults, latest.current.fields, valueOpts),
      isConfirmed: isConfirmedRef.current,
    };
    let result: SubmitResult;
    try {
      result = await action(submitted, context);
    } catch (reason) {
      result = { ok: false, formError: errorText(reason, text.genericError) };
    }
    applyResult(result, values, submitted);
  };

  handlers.current.invalid = () => {
    setStatus('failed');
    const count = invalidFieldNames(engine).length;
    setAnnouncement(latest.current.messages.fixFields({ count: Math.max(count, 1) }));
    requestFocus();
  };

  const runSubmit = useCallback(
    (isConfirmed: boolean): Promise<SubmitStatus> => {
      if (isSubmittingRef.current) {
        return Promise.resolve(statusRef.current);
      }
      isSubmittingRef.current = true;
      isConfirmedRef.current = isConfirmed;
      clearServerErrors(engine);
      setFormError(null);
      setAnnouncement('');
      setConfirmation(null);
      setStatus('validating');
      return engine
        .handleSubmit()
        .then(() => statusRef.current)
        .finally(() => {
          isSubmittingRef.current = false;
        });
    },
    [engine, setStatus],
  );

  const submit = useCallback(() => {
    void runSubmit(false);
  }, [runSubmit]);

  const submitAndWait = useCallback(() => runSubmit(false), [runSubmit]);

  const confirmSubmit = useCallback(() => {
    void runSubmit(true);
  }, [runSubmit]);

  const cancelConfirmation = useCallback(() => {
    // The confirmation dialog also reports closing after Confirm; that resubmit is already running.
    if (isSubmittingRef.current) {
      return;
    }
    setConfirmation(null);
    setStatus('editing');
  }, []);

  const revert = useCallback(() => {
    reseed();
    if (hasEditToggle) {
      latest.current.setMode('view');
    }
  }, [hasEditToggle, reseed]);

  const deleteRecord = useCallback(async () => {
    const { config: current, messages: text, options: currentOptions } = latest.current;
    const remove = current.actions?.delete;
    if (!remove) {
      return;
    }
    const result = await remove();
    if (result.ok === true) {
      currentOptions.onSuccess?.({
        action: 'delete',
        result,
        values: engine.state.values as V,
      });
      if (result.message !== undefined) {
        toast.success(result.message);
      }
      return;
    }
    const message =
      result.ok === false && typeof result.formError === 'string'
        ? result.formError
        : text.genericError;
    throw new Error(message);
  }, [engine]);

  // Re-seed when the record being edited changes.
  const previousResetKey = useRef(resetKey);
  useEffect(() => {
    if (Object.is(previousResetKey.current, resetKey)) {
      return;
    }
    previousResetKey.current = resetKey;
    reseed(latest.current.config.defaultValues);
  }, [reseed, resetKey]);

  // Unsaved changes, by deep comparison with the defaults (visible fields only).
  const isDirty = useSelector(engine.store, (state) => {
    const values: unknown = state.values;
    return (
      getDirtyFields(values, defaults, latest.current.fields, latest.current.valueOptions).length >
      0
    );
  });
  const reportedDirty = useRef(false);
  useEffect(() => {
    if (reportedDirty.current !== isDirty) {
      reportedDirty.current = isDirty;
      latest.current.options.onDirtyChange?.(isDirty);
    }
  }, [isDirty]);

  // Value observers, without re-rendering the form on every change.
  useEffect(() => {
    let previous: unknown = engine.state.values;
    const subscription = engine.store.subscribe(() => {
      const values: unknown = engine.state.values;
      if (values !== previous) {
        previous = values;
        latest.current.options.onValuesChange?.(values as V);
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [engine]);

  useImperativeHandle(
    options.ref,
    () => ({
      reset: (values?: V) => {
        reseed(values);
      },
      submit,
      getValues: () => engine.state.values as V,
      isDirty: () => {
        const values: unknown = engine.state.values;
        return (
          getDirtyFields(
            values,
            defaultsRef.current,
            latest.current.fields,
            latest.current.valueOptions,
          ).length > 0
        );
      },
    }),
    [engine, reseed, submit],
  );

  const setRootElement = useCallback((element: HTMLElement | null) => {
    rootRef.current = element;
  }, []);

  // Whether a pointer is pressed anywhere (the submit button may be outside the form, in a dialog footer).
  const isPointerDownRef = useRef(false);
  const pendingAfterPress = useRef<(() => void)[]>([]);
  useEffect(() => {
    const down = () => {
      isPointerDownRef.current = true;
    };
    const up = () => {
      isPointerDownRef.current = false;
      const callbacks = pendingAfterPress.current;
      pendingAfterPress.current = [];
      if (callbacks.length > 0) {
        // After the click that follows this pointerup has been handled.
        requestAnimationFrame(() => {
          for (const callback of callbacks) {
            callback();
          }
        });
      }
    };
    document.addEventListener('pointerdown', down, true);
    document.addEventListener('pointerup', up, true);
    document.addEventListener('pointercancel', up, true);
    return () => {
      document.removeEventListener('pointerdown', down, true);
      document.removeEventListener('pointerup', up, true);
      document.removeEventListener('pointercancel', up, true);
    };
  }, []);
  const afterPress = useCallback((callback: () => void) => {
    if (isPointerDownRef.current) {
      pendingAfterPress.current.push(callback);
    } else {
      callback();
    }
  }, []);

  return useMemo(
    () => ({
      form: engine,
      formId,
      fields,
      sections,
      registry,
      mode,
      setMode,
      hasEditToggle,
      actions,
      status,
      isDirty,
      formError,
      announcement,
      confirmation,
      confirmSubmit,
      cancelConfirmation,
      submit,
      submitAndWait,
      revert,
      deleteRecord,
      reloadKeys,
      uploads,
      forcedOpenSections,
      setRootElement,
      afterPress,
    }),
    [
      engine,
      formId,
      fields,
      sections,
      registry,
      mode,
      setMode,
      hasEditToggle,
      actions,
      status,
      isDirty,
      formError,
      announcement,
      confirmation,
      confirmSubmit,
      cancelConfirmation,
      submit,
      submitAndWait,
      revert,
      deleteRecord,
      reloadKeys,
      uploads,
      forcedOpenSections,
      setRootElement,
      afterPress,
    ],
  );
}
