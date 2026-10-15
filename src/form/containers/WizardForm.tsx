import { useSelector } from '@tanstack/react-form';
import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { OverlayTriggerStateContext, useLocale } from 'react-aria-components';
import type { DialogSize } from '../../components/Dialog/Dialog';
import {
  DescriptionList,
  type DescriptionItem,
} from '../../components/DescriptionList/DescriptionList';
import { StepDialog, type DialogStep } from '../../components/StepDialog/StepDialog';
import { useTimeZone } from '../../provider/context';
import { fieldKey, findField, isFieldVisible, isInputField } from '../fieldIndex';
import { focusFirstInvalid } from '../focus';
import { formatFieldValue } from '../format';
import { FieldEntry, fieldGridClasses } from '../FormFields';
import { FormStatus } from '../FormStatus';
import type { AnyFieldConfig } from '../internalTypes';
import { getAt, normalizePath } from '../paths';
import { FormRuntimeContext, useFormRuntime, type FormRuntime } from '../runtime';
import type { AnyFieldPath } from '../types';
import { useFormController, type FormControllerOptions } from '../useFormController';
import { useFormMessages } from '../messages';

/** One step of a wizard: the fields it collects, by name. */
export interface WizardStep<V> {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  fields: readonly (AnyFieldPath<V> | (string & {}))[];
  /** Columns from tablet width up. Defaults to 1. */
  columns?: 1 | 2 | 3 | 4;
}

export interface WizardFormProps<V, TCustom extends string = never> extends Omit<
  FormControllerOptions<V, TCustom>,
  'mode' | 'defaultMode' | 'onModeChange' | 'hasEditToggle'
> {
  title: ReactNode;
  steps: readonly WizardStep<V>[];
  /** Adds a final step listing every value with its label before the final confirm. */
  hasSummaryStep?: boolean;
  /** Defaults to `md`. */
  size?: DialogSize;
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

interface ResolvedStep {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  columns: 1 | 2 | 3 | 4;
  fields: readonly AnyFieldConfig[];
}

function resolveSteps(fields: readonly AnyFieldConfig[], steps: readonly WizardStep<unknown>[]) {
  const byKey = new Map(fields.map((field) => [fieldKey(field), field]));
  return steps.map((step): ResolvedStep => ({
    id: step.id,
    title: step.title,
    description: step.description,
    columns: step.columns ?? 1,
    fields: step.fields.flatMap((reference) => {
      const field = byKey.get(reference) ?? byKey.get(normalizePath(reference));
      return field ? [field] : [];
    }),
  }));
}

/**
 * The open wizard's content. Every step's fields stay mounted (hidden when not current), so values and validation
 * span the whole wizard. It closes the wizard after a successful submit, and starts over when the wizard closes.
 */
/** A summary step's content: each step's title and its fields' labels and values. */
interface StepSummary {
  id: string;
  title: ReactNode;
  items: DescriptionItem[];
}

function WizardBody({
  steps,
  current,
  summary,
  onClose,
}: {
  steps: readonly ResolvedStep[];
  current: number;
  /** Set when the wizard has a summary step (shown after the last field step). */
  summary?: readonly StepSummary[];
  onClose: () => void;
}) {
  const { status, revert, setRootElement } = useFormRuntime();
  const overlay = useContext(OverlayTriggerStateContext);
  // Close once, when the status becomes `succeeded` (the overlay state is a new object on every render).
  const latestOverlay = useRef(overlay);
  useLayoutEffect(() => {
    latestOverlay.current = overlay;
  });
  useEffect(() => {
    if (status === 'succeeded') {
      latestOverlay.current?.close();
    }
  }, [status]);
  useEffect(
    () => () => {
      revert();
      onClose();
    },
    [revert, onClose],
  );
  return (
    <div ref={setRootElement} className="@container/form flex flex-col gap-4">
      <FormStatus />
      {steps.map((step, index) => (
        <div
          key={step.id}
          data-wizard-step={step.id}
          hidden={index !== current}
          className="flex flex-col gap-4"
        >
          {step.description !== undefined && (
            <p className="text-sm text-fg-muted">{step.description}</p>
          )}
          <div className={fieldGridClasses(step.columns)}>
            {step.fields.map((field) => (
              <FieldEntry key={fieldKey(field)} field={field} scopePath="" columns={step.columns} />
            ))}
          </div>
        </div>
      ))}
      {summary && current === steps.length && (
        <div className="flex flex-col gap-4">
          {summary
            .filter((entry) => entry.items.length > 0)
            .map((entry) => (
              <div key={entry.id} className="flex flex-col gap-1">
                <h4 className="text-xs font-semibold text-fg-muted">{entry.title}</h4>
                <DescriptionList items={entry.items} columns={1} />
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

/** Validates one step's visible fields, showing their errors; returns how many are invalid. */
async function validateStep(runtime: FormRuntime, step: ResolvedStep): Promise<number> {
  const { form } = runtime;
  const values: unknown = form.state.values;
  const names = step.fields
    .filter((field) => isInputField(field) && isFieldVisible(field, values))
    .map(fieldKey);
  // `validateField` returns errors or a promise of them; wait for any async validators.
  await Promise.all(
    names.map((name) => Promise.resolve(form.validateField(name, 'submit') as unknown)),
  );
  let invalid = 0;
  for (const name of Object.keys(form.state.fieldMeta)) {
    const belongs = names.some(
      (key) => name === key || name.startsWith(`${key}.`) || name.startsWith(`${key}[`),
    );
    if (!belongs) {
      continue;
    }
    // Show this step's errors now, as if the user had left each field.
    form.setFieldMeta(name, (meta) => ({ ...meta, isBlurred: true }));
    if ((form.getFieldMeta(name)?.errors.length ?? 0) > 0) {
      invalid += 1;
    }
  }
  return invalid;
}

function WizardDialog({
  title,
  steps,
  hasSummaryStep,
  size,
  isOpen,
  defaultOpen,
  onOpenChange,
}: Pick<
  WizardFormProps<unknown>,
  'title' | 'hasSummaryStep' | 'size' | 'isOpen' | 'defaultOpen' | 'onOpenChange'
> & {
  steps: readonly ResolvedStep[];
}) {
  const runtime = useFormRuntime();
  const { form } = runtime;
  const messages = useFormMessages();
  const { locale } = useLocale();
  const timeZone = useTimeZone();
  const [current, setCurrent] = useState(0);
  const values: unknown = useSelector(form.store, (state) => state.values as unknown);

  const resetStep = useCallback(() => {
    setCurrent(0);
  }, []);

  // The summary, like every step, renders inside the same body, so the body (and its fields) stays mounted until
  // the wizard closes.
  const summary: StepSummary[] | undefined = hasSummaryStep
    ? steps.map((step) => ({
        id: step.id,
        title: step.title,
        items: step.fields
          .filter((field) => isInputField(field) && isFieldVisible(field, values))
          .flatMap((field): DescriptionItem[] =>
            isInputField(field) && field.type !== 'array'
              ? [
                  {
                    id: fieldKey(field),
                    label: field.label,
                    value: formatFieldValue(field, getAt(values, normalizePath(field.name)), {
                      scope: values,
                      locale,
                      timeZone,
                      messages,
                    }),
                  },
                ]
              : [],
          ),
      }))
    : undefined;
  const body = <WizardBody steps={steps} current={current} summary={summary} onClose={resetStep} />;

  const dialogSteps: DialogStep[] = [
    ...steps.map((step): DialogStep => ({
      id: step.id,
      title: step.title,
      content: body,
      validate: async () => {
        const invalid = await validateStep(runtime, step);
        if (invalid === 0) {
          return true;
        }
        requestAnimationFrame(() => {
          focusFirstInvalid(document.querySelector<HTMLElement>(`[data-wizard-step="${step.id}"]`));
        });
        return messages.fixFields({ count: invalid });
      },
    })),
    ...(hasSummaryStep ? [{ id: '__summary', title: messages.summary, content: body }] : []),
  ];

  return (
    <StepDialog
      title={title}
      steps={dialogSteps}
      size={size}
      isOpen={isOpen}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      step={current}
      onStepChange={setCurrent}
      confirmLabel={
        runtime.actions.submitLabel ??
        (runtime.actions.kind === 'update' ? messages.save : messages.create)
      }
      onConfirm={async () => {
        const outcome = await runtime.submitAndWait();
        if (outcome === 'succeeded') {
          return;
        }
        if (outcome === 'failed') {
          // Return to the first step with an invalid field.
          const invalid = Object.entries(form.state.fieldMeta)
            .filter(([, meta]) => (meta?.errors.length ?? 0) > 0)
            .map(([name]) => name);
          const stepIndex = steps.findIndex((step) =>
            invalid.some(
              (name) => findField(step.fields, name, form.state.values as unknown) !== undefined,
            ),
          );
          if (stepIndex >= 0) {
            setCurrent(stepIndex);
          }
          throw new Error(
            invalid.length > 0
              ? messages.fixFields({ count: invalid.length })
              : messages.genericError,
          );
        }
        // Needs confirmation: the confirmation dialog takes over; keep the wizard open.
        throw new Error(messages.confirmSubmitTitle);
      }}
    />
  );
}

/**
 * A ConfigForm as a step-by-step dialog: each step lists its fields and must be valid before Next. An optional
 * generated summary step lists every value with its label before the final confirm, which submits the form. On
 * phones it's a full-screen sheet showing "Step 2 of 4".
 */
export function WizardForm<V, TCustom extends string = never>({
  title,
  steps,
  hasSummaryStep,
  size,
  isOpen,
  defaultOpen,
  onOpenChange,
  ...options
}: WizardFormProps<V, TCustom>) {
  const runtime = useFormController(options);
  const resolved = useMemo(
    () => resolveSteps(runtime.fields, steps as readonly WizardStep<unknown>[]),
    [runtime.fields, steps],
  );
  return (
    <FormRuntimeContext.Provider value={runtime}>
      <WizardDialog
        title={title}
        steps={resolved}
        hasSummaryStep={hasSummaryStep}
        size={size}
        isOpen={isOpen}
        defaultOpen={defaultOpen}
        onOpenChange={onOpenChange}
      />
    </FormRuntimeContext.Provider>
  );
}
