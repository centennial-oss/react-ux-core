// A widget instance's options as its type sees them: migrated from an older options version (MOD-06), with the type's
// defaults under them.

import type { AnyWidgetType, JsonObject, WidgetInstance } from '../types';

/** Whether the instance's options are older than its type's options version. */
export function needsOptionsMigration(
  definition: AnyWidgetType,
  instance: Readonly<WidgetInstance>,
): boolean {
  return (
    definition.migrateOptions !== undefined &&
    definition.optionsVersion !== undefined &&
    (instance.optionsVersion ?? 0) < definition.optionsVersion
  );
}

/** The instance's stored options, migrated to the type's current version when they're older. */
export function migratedOptions(
  definition: AnyWidgetType,
  instance: Readonly<WidgetInstance>,
): JsonObject {
  const stored = instance.options ?? {};
  return needsOptionsMigration(definition, instance) && definition.migrateOptions
    ? (definition.migrateOptions(stored, instance.optionsVersion ?? 0) as JsonObject)
    : stored;
}

/** The options a widget renders with: migrated, over the type's defaults (§7.5). */
export function resolveOptions(
  definition: AnyWidgetType,
  instance: Readonly<WidgetInstance>,
): JsonObject {
  return { ...(definition.defaultOptions as JsonObject), ...migratedOptions(definition, instance) };
}

/**
 * The instance with its options migrated and stamped with the type's version, so the migrated form is what's saved
 * next (MOD-06). Unchanged instances are returned as they are; unknown properties are kept (MOD-03).
 */
export function migrateInstanceOptions(
  definition: AnyWidgetType | undefined,
  instance: WidgetInstance,
): WidgetInstance {
  if (!definition || !needsOptionsMigration(definition, instance)) {
    return instance;
  }
  return {
    ...instance,
    options: migratedOptions(definition, instance),
    optionsVersion: definition.optionsVersion,
  };
}
