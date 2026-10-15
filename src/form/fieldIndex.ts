// Walking a form config: which entries are inputs, which field a value path belongs to, and whether it's visible.

import type { AnyFieldConfig, AnyInputFieldConfig } from './internalTypes';
import { getAt, normalizePath } from './paths';

const NON_INPUT_TYPES = new Set(['display', 'separator', 'banner']);

/** True for entries that hold a value (everything except display, separator and banner). */
export function isInputField(field: AnyFieldConfig): field is AnyInputFieldConfig {
  return !NON_INPUT_TYPES.has(field.type);
}

/** The key of a config entry: its `name`, or its `id` for display items. */
export function fieldKey(field: AnyFieldConfig): string {
  return isInputField(field) ? normalizePath(field.name) : field.id;
}

/** Whether an entry is shown for these values (and, inside an array item, that item's values). */
export function isFieldVisible(field: AnyFieldConfig, scopeValues: unknown): boolean {
  return field.visibleWhen ? field.visibleWhen(scopeValues as never) : true;
}

/** Whether an entry is disabled by its config for these values. */
export function isFieldDisabled(field: AnyFieldConfig, scopeValues: unknown): boolean {
  if (!isInputField(field)) {
    return false;
  }
  return field.isDisabled === true || (field.disabledWhen?.(scopeValues as never) ?? false);
}

/** The input field a value path belongs to, with whether it (and every array around it) is visible. */
export interface FieldMatch {
  field: AnyInputFieldConfig;
  /** The field's full path (with array indexes). */
  path: string;
  isVisible: boolean;
}

/**
 * Finds the field that owns `path` (for example a schema issue or server error path). A path inside a field's value
 * (`address.city` under a field named `address`) belongs to that field. Returns `undefined` when no field matches.
 */
export function findField(
  fields: readonly AnyFieldConfig[],
  path: string,
  values: unknown,
  scopeValues: unknown = values,
  prefix = '',
): FieldMatch | undefined {
  const target = normalizePath(path);
  for (const field of fields) {
    if (!isInputField(field)) {
      continue;
    }
    const name = normalizePath(field.name);
    const fullName = prefix === '' ? name : `${prefix}.${name}`;
    const isVisible = isFieldVisible(field, scopeValues);
    if (field.type === 'array') {
      const match = new RegExp(`^${escapeRegExp(fullName)}\\[(\\d+)\\]\\.(.+)$`).exec(target);
      if (match) {
        const index = Number(match[1]);
        const item = getAt(values, `${fullName}[${String(index)}]`);
        const inner = findField(
          field.fields ?? [],
          target,
          values,
          item,
          `${fullName}[${String(index)}]`,
        );
        return inner ? { ...inner, isVisible: isVisible && inner.isVisible } : undefined;
      }
    }
    if (
      target === fullName ||
      target.startsWith(`${fullName}.`) ||
      target.startsWith(`${fullName}[`)
    ) {
      return { field, path: fullName, isVisible };
    }
  }
  return undefined;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
