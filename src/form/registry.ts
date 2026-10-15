// The field registry: which renderer draws each field type.

import { createContext, useContext } from 'react';
import { builtInFields } from './fields';
import type { FieldRenderer } from './types';

/** Renderers by field type. */
export interface FieldRegistry {
  readonly renderers: Readonly<Record<string, FieldRenderer>>;
}

/**
 * A registry of the built-in renderers plus the given ones, which add domain field types or replace built-ins:
 * `createFieldRegistry({ sitePicker: SitePickerField })`. Custom renderers get the same `field` API as built-ins.
 */
export function createFieldRegistry(
  renderers: Readonly<Record<string, FieldRenderer>> = {},
): FieldRegistry {
  return { renderers: { ...builtInFields, ...renderers } };
}

/** The registry with only the built-in renderers. */
export const defaultFieldRegistry: FieldRegistry = createFieldRegistry();

/** Provides a registry to every ConfigForm below it (a form's own `registry` prop wins). */
export const FieldRegistryContext = createContext<FieldRegistry>(defaultFieldRegistry);

export function useFieldRegistry(): FieldRegistry {
  return useContext(FieldRegistryContext);
}
