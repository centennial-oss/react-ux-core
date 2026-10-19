import { useField, useSelector } from '@tanstack/react-form';
import { useMemo, type ComponentType } from 'react';

import { cn } from '../utils/cn';
import { isFieldDisabled } from './fieldIndex';
import type { AnyInputFieldConfig } from './internalTypes';
import { getAt } from './paths';
import { useFormRuntime } from './runtime';
import type { FieldRendererProps, FormFieldApi } from './types';
import { sameOptions } from './fields/shared';
import { createFieldValidators } from './validation';
import { useFormMessages } from './messages';

/** Column-span classes inside a section grid, from the form's own width (a container query) up. */
export const colSpanClasses = {
  1: '',
  2: '@min-[40rem]/form:col-span-2',
  3: '@min-[40rem]/form:col-span-3',
  4: '@min-[40rem]/form:col-span-4',
  full: 'col-span-full',
} as const;

/** The span class for a field, never wider than its section. */
export function spanClass(colSpan: AnyInputFieldConfig['colSpan'], columns: number): string {
  if (colSpan === undefined || colSpan === 'full') {
    return colSpan === 'full' ? colSpanClasses.full : '';
  }
  return colSpanClasses[Math.min(colSpan, columns) as 1 | 2 | 3 | 4];
}

function messageOf(error: unknown): string | undefined {
  if (typeof error === 'string') {
    return error === '' ? undefined : error;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const { message } = error;
    return typeof message === 'string' ? message : undefined;
  }
  return undefined;
}

export interface FieldSlotProps {
  field: AnyInputFieldConfig;
  /** The field's full path. */
  path: string;
  /** Where its `visibleWhen`-style functions and `validate` look: `''` for the form, or an array item's path. */
  scopePath: string;
  /** Columns of the surrounding grid. */
  columns: number;
}

/** Binds one config field to TanStack Form and draws it with its registered renderer. */
export function FieldSlot({ field, path, scopePath, columns }: FieldSlotProps) {
  const runtime = useFormRuntime();
  const { form, registry, reloadKeys, status, afterPress } = runtime;
  const messages = useFormMessages();

  const validators = useMemo(
    () =>
      createFieldValidators(
        field,
        () => {
          const values: unknown = form.state.values;
          return scopePath === '' ? values : getAt(values, scopePath);
        },
        () => messages,
      ),
    [field, form, scopePath, messages],
  );
  const api = useField({ form, name: path, validators });
  const hasAttemptedSubmit = useSelector(form.store, (state) => state.submissionAttempts > 0);
  const isDisabledByValues = useSelector(form.store, (state) => {
    const values: unknown = state.values;
    return isFieldDisabled(field, scopePath === '' ? values : getAt(values, scopePath));
  });

  // Items computed from the values (a list that depends on other fields) re-render only when the list changes.
  const resolvedItems = useSelector(
    form.store,
    (state) => {
      const { items } = field;
      if (typeof items !== 'function') {
        return undefined;
      }
      const values: unknown = state.values;
      return items((scopePath === '' ? values : getAt(values, scopePath)) as never);
    },
    { compare: sameOptions },
  );
  const config = useMemo(
    () => (resolvedItems === undefined ? field : { ...field, items: resolvedItems }),
    [field, resolvedItems],
  );

  const { meta } = api.state;
  const errorMap: Record<string, unknown> = meta.errorMap;
  const hasServerError = errorMap.onServer !== undefined;
  // Errors show once the field has been left, after a submit attempt, or when the server reported one.
  const isShown = meta.isBlurred || hasAttemptedSubmit || hasServerError;
  const allErrors = (meta.errors as unknown[])
    .map(messageOf)
    .filter((message): message is string => message !== undefined);
  const errors = isShown ? [...new Set(allErrors)] : [];
  const value: unknown = api.state.value;

  const fieldApi: FormFieldApi = {
    name: path,
    value,
    onChange: (next) => {
      api.handleChange(next);
    },
    onBlur: () => {
      afterPress(() => {
        api.handleBlur();
      });
    },
    errors,
    errorMessage: errors[0],
    isInvalid: errors.length > 0,
    isRequired: field.isRequired ?? false,
    isDisabled: isDisabledByValues,
    // Values can't change while a submit is running.
    isReadOnly: field.isReadOnly === true || status === 'submitting',
    isValidating: meta.isValidating,
    isDirty: !meta.isDefaultValue,
    reloadKey: reloadKeys[path] ?? 0,
    getValues: () => form.state.values as unknown,
  };

  const Renderer = registry.renderers[field.type] as
    ComponentType<FieldRendererProps<AnyInputFieldConfig>> | undefined;
  if (!Renderer) {
    throw new Error(
      `ConfigForm has no renderer for field type "${field.type}". Register one with createFieldRegistry.`,
    );
  }

  return (
    <div
      data-form-field={path}
      data-invalid={errors.length > 0 || undefined}
      className={cn('min-w-0 scroll-mb-24', spanClass(field.colSpan, columns))}
    >
      <Renderer field={fieldApi} config={config} />
    </div>
  );
}
