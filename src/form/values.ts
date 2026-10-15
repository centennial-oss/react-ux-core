// Value rules: what counts as empty, the values actions receive (hidden fields and `emptyAs` applied), dirty fields,
// and the PATCH-style patch.

import { evaluate } from '@tanstack/react-form';
import { isFieldVisible, isInputField } from './fieldIndex';
import type { AnyFieldConfig, AnyInputFieldConfig } from './internalTypes';
import { deleteAt, getAt, normalizePath, setAt } from './paths';
import type { DeepPartial, EmptyAs, FormConfig } from './types';

const ARRAY_TYPES = new Set(['multiselect', 'checkboxGroup', 'files', 'array']);

/** `undefined`, `null`, an empty string or an empty list. */
export function isEmptyValue(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}

/** Whether a required field's value is missing, by value type: an unchecked checkbox or an empty list fails. */
export function isMissingValue(field: AnyInputFieldConfig, value: unknown): boolean {
  if (field.type === 'checkbox' || field.type === 'switch') {
    return value !== true;
  }
  if (typeof value === 'string') {
    return value.trim() === '';
  }
  return isEmptyValue(value);
}

export interface SubmitValueOptions {
  emptyAs: EmptyAs;
  shouldSubmitHiddenFields: boolean;
}

function joinPath(prefix: string, name: string): string {
  const normalized = normalizePath(name);
  return prefix === '' ? normalized : `${prefix}.${normalized}`;
}

function applyEmptyAs<T>(result: T, path: string, mode: EmptyAs): T {
  if (mode === 'omit') {
    return deleteAt(result, path);
  }
  return setAt(result, path, mode === 'null' ? null : '');
}

function prepareFields<T>(
  result: T,
  fields: readonly AnyFieldConfig[],
  scope: unknown,
  prefix: string,
  options: SubmitValueOptions,
): T {
  let next = result;
  for (const field of fields) {
    if (!isInputField(field)) {
      continue;
    }
    const path = joinPath(prefix, field.name);
    if (!isFieldVisible(field, scope) && !options.shouldSubmitHiddenFields) {
      next = deleteAt(next, path);
      continue;
    }
    const value = getAt(next, path);
    if (field.type === 'array' && Array.isArray(value)) {
      value.forEach((item: unknown, index) => {
        next = prepareFields(next, field.fields ?? [], item, `${path}[${String(index)}]`, options);
      });
    }
    if (!isEmptyValue(value)) {
      continue;
    }
    // List values stay `[]` unless the field itself says otherwise; the form-wide default is for single values.
    if (ARRAY_TYPES.has(field.type)) {
      if (field.emptyAs !== undefined && field.emptyAs !== 'empty-string') {
        next = applyEmptyAs(next, path, field.emptyAs);
      }
      continue;
    }
    next = applyEmptyAs(next, path, field.emptyAs ?? options.emptyAs);
  }
  return next;
}

/** The values actions receive: hidden fields left out (unless configured) and empty values per `emptyAs`. */
export function prepareSubmitValues<V>(
  values: V,
  fields: readonly AnyFieldConfig[],
  options: SubmitValueOptions,
): V {
  return prepareFields(values, fields, values, '', options);
}

/** Names of the top-level fields (arrays as a whole) whose value differs from the default. */
export function getDirtyFields(
  values: unknown,
  defaultValues: unknown,
  fields: readonly AnyFieldConfig[],
  options: Pick<SubmitValueOptions, 'shouldSubmitHiddenFields'>,
): string[] {
  const names: string[] = [];
  for (const field of fields) {
    if (!isInputField(field)) {
      continue;
    }
    if (!isFieldVisible(field, values) && !options.shouldSubmitHiddenFields) {
      continue;
    }
    const name = normalizePath(field.name);
    if (!evaluate(getAt(values, name), getAt(defaultValues, name))) {
      names.push(name);
    }
  }
  return names;
}

/**
 * The changed and cleared fields only, for PATCH-style APIs. Values are as submitted (`emptyAs` applied); a cleared
 * field whose `emptyAs` is `omit` is sent as `null`, because leaving it out would mean "unchanged".
 */
export function buildPatch<V>(
  values: V,
  defaultValues: V,
  fields: readonly AnyFieldConfig[],
  options: SubmitValueOptions,
): DeepPartial<V> {
  const submitted = prepareSubmitValues(values, fields, options);
  let patch = {} as DeepPartial<V>;
  for (const name of getDirtyFields(values, defaultValues, fields, options)) {
    const value = getAt(submitted, name);
    patch = setAt(patch, name, value === undefined ? null : value);
  }
  return patch;
}

/**
 * The PATCH-style patch for `values` against the config's defaults: changed and cleared fields only, with hidden
 * fields and `emptyAs` handled as on submit. ConfigForm passes the same patch to actions as `context.patch`.
 */
export function createPatch<V, TCustom extends string = never>(
  config: FormConfig<V, TCustom>,
  values: V,
): DeepPartial<V> {
  return buildPatch(values, config.defaultValues, config.fields, {
    emptyAs: config.emptyAs ?? 'null',
    shouldSubmitHiddenFields: config.shouldSubmitHiddenFields ?? false,
  });
}
