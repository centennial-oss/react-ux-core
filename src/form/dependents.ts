// Dependent fields: when a field changes, reset, reload or recompute the fields that depend on it. Runs from
// TanStack Form's form-level change listener, right after the parent's value is set and before validation, so the
// change and its consequences land in one update.

import type { AnyFormApi } from '@tanstack/react-form';
import { isInputField } from './fieldIndex';
import type { AnyFieldConfig, AnyInputFieldConfig } from './internalTypes';
import { getAt, normalizePath } from './paths';

/** The empty value of a field type: what a reset sets. */
export function emptyValueFor(field: AnyInputFieldConfig): unknown {
  switch (field.type) {
    case 'text':
    case 'email':
    case 'phone':
    case 'url':
    case 'password':
    case 'textarea':
    case 'pillbox':
      return '';
    case 'checkbox':
    case 'switch':
      return false;
    case 'multiselect':
    case 'checkboxGroup':
    case 'files':
    case 'array':
      return [];
    default:
      return null;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype
  );
}

/** Leaf paths of a partial update (plain objects are walked; arrays and other values are leaves). */
function leafPaths(partial: unknown, prefix = ''): [string, unknown][] {
  if (!isPlainObject(partial)) {
    return prefix === '' ? [] : [[prefix, partial]];
  }
  return Object.entries(partial).flatMap(([key, value]) =>
    leafPaths(value, prefix === '' ? key : `${prefix}.${key}`),
  );
}

/** Sets a value without marking the field as edited by the user, and clears what it showed. */
function setQuietly(form: AnyFormApi, path: string, value: unknown) {
  form.setFieldValue(path, value, {
    dontUpdateMeta: true,
    dontValidate: true,
    dontRunListeners: true,
  });
  if (form.getFieldMeta(path)) {
    form.setFieldMeta(path, (meta) => ({
      ...meta,
      isTouched: false,
      isBlurred: false,
      errorMap: {},
      errorSourceMap: {},
    }));
  }
}

interface Dependent {
  field: AnyInputFieldConfig;
  /** The dependent field's full path. */
  path: string;
  /** Where its `visibleWhen`-style functions look: the whole form, or the array item. */
  scopePath: string;
}

/** Fields that depend on `changedPath`, at top level and among siblings in the same array item. */
function findDependents(fields: readonly AnyFieldConfig[], changedPath: string): Dependent[] {
  const changed = normalizePath(changedPath);
  const result: Dependent[] = [];
  const visit = (entries: readonly AnyFieldConfig[], prefix: string, values: unknown) => {
    for (const field of entries) {
      if (!isInputField(field)) {
        continue;
      }
      const name = normalizePath(field.name);
      const path = prefix === '' ? name : `${prefix}.${name}`;
      const parents = field.dependsOn?.fields.map((parent) => {
        const parentName = normalizePath(parent);
        return prefix === '' ? parentName : `${prefix}.${parentName}`;
      });
      if (parents?.includes(changed)) {
        result.push({ field, path, scopePath: prefix });
      }
      if (field.type === 'array' && changed.startsWith(`${path}[`)) {
        const match = /^\[(\d+)\]/.exec(changed.slice(path.length));
        if (match) {
          visit(field.fields ?? [], `${path}[${match[1] ?? ''}]`, values);
        }
      }
    }
  };
  visit(fields, '', undefined);
  return result;
}

/**
 * Applies the `dependsOn` rules triggered by a change at `changedPath`, cascading to fields that depend on the fields
 * it changed (each field at most once). Returns the paths whose items should reload.
 */
export function applyDependents(
  form: AnyFormApi,
  fields: readonly AnyFieldConfig[],
  changedPath: string,
  visited = new Set<string>([normalizePath(changedPath)]),
): string[] {
  const reloads: string[] = [];
  for (const { field, path, scopePath } of findDependents(fields, changedPath)) {
    const rule = field.dependsOn?.onChange;
    if (rule === undefined || visited.has(path)) {
      continue;
    }
    visited.add(path);
    const changed: string[] = [];
    if (rule === 'reset' || rule === 'reload') {
      setQuietly(form, path, emptyValueFor(field));
      changed.push(path);
      if (rule === 'reload') {
        reloads.push(path);
      }
    } else {
      const scope: unknown =
        scopePath === '' ? form.state.values : getAt(form.state.values, scopePath);
      for (const [leaf, value] of leafPaths(rule(scope as never))) {
        const leafPath = scopePath === '' ? leaf : `${scopePath}.${leaf}`;
        setQuietly(form, leafPath, value);
        changed.push(normalizePath(leafPath));
      }
    }
    for (const next of changed) {
      reloads.push(...applyDependents(form, fields, next, visited));
    }
  }
  return reloads;
}
