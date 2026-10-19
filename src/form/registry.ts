// The field registry: which renderer draws each field type.

import { createContext, useContext } from 'react';
import { preloadComponent } from '../utils/lazyComponent';
import { isInputField } from './fieldIndex';
import { builtInFields } from './fields';
import type { AnyFieldConfig } from './internalTypes';
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

/**
 * Starts loading the renderers that load on first use (see `lazyField`) for every type in `fields`, array items'
 * included, so fields that appear later (behind `visibleWhen`, in a new array item) are ready when they do.
 */
export function preloadRenderers(registry: FieldRegistry, fields: readonly AnyFieldConfig[]): void {
  for (const field of fields) {
    if (isInputField(field)) {
      preloadComponent(registry.renderers[field.type]);
      if (field.type === 'array') {
        preloadRenderers(registry, field.fields ?? []);
      }
    }
  }
}
