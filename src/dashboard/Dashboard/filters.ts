// Dashboard filters (§9.2): host-defined selections data sources can depend on, cascading from parent to child.

import type { JsonValue, LocalizedText } from '../types';

/** One choice of a filter. */
export interface FilterOption {
  value: JsonValue;
  label: string;
}

/** A dashboard filter (§9.2). */
export interface DashboardFilterDefinition {
  id: string;
  label: LocalizedText;
  /** Cascading: shown once the parent has a value, and cleared when it changes (CTX-08). */
  parentId?: string;
  /** Static choices… */
  options?: readonly FilterOption[];
  /** …or choices loaded for the parents' values. */
  loadOptions?: (args: {
    parentValues: Record<string, JsonValue>;
    signal: AbortSignal;
    context: unknown;
  }) => Promise<readonly FilterOption[]>;
  /** Adds an "All" choice, meaning no filter (`null`). */
  allowsAll?: boolean;
  /** With a single choice, shows it as text rather than a control (CTX-09). Defaults to true. */
  isHiddenWhenSingleOption?: boolean;
}

/** The filters in dependency order: every parent before its children, otherwise as declared (CTX-08). */
export function orderedFilters(
  filters: readonly DashboardFilterDefinition[],
): DashboardFilterDefinition[] {
  const byId = new Map(filters.map((filter) => [filter.id, filter]));
  const ordered: DashboardFilterDefinition[] = [];
  const placed = new Set<string>();
  const place = (filter: DashboardFilterDefinition, trail: Set<string>) => {
    if (placed.has(filter.id) || trail.has(filter.id)) {
      return;
    }
    const parent = filter.parentId === undefined ? undefined : byId.get(filter.parentId);
    if (parent) {
      place(parent, new Set([...trail, filter.id]));
    }
    placed.add(filter.id);
    ordered.push(filter);
  };
  for (const filter of filters) {
    place(filter, new Set());
  }
  return ordered;
}

/** The ids of every filter below `filterId`: its children, their children, and so on. */
export function descendantFilters(
  filters: readonly DashboardFilterDefinition[],
  filterId: string,
): string[] {
  const result: string[] = [];
  const queue = [filterId];
  while (queue.length > 0) {
    const parent = queue.shift();
    for (const filter of filters) {
      if (filter.parentId === parent && !result.includes(filter.id)) {
        result.push(filter.id);
        queue.push(filter.id);
      }
    }
  }
  return result;
}

/** The values with `filterId` set, and every filter below it cleared, as a parent change requires (CTX-08). */
export function withFilterValue(
  filters: readonly DashboardFilterDefinition[],
  values: Readonly<Record<string, JsonValue>>,
  filterId: string,
  value: JsonValue,
): Record<string, JsonValue> {
  const next: Record<string, JsonValue> = { ...values, [filterId]: value };
  if (JSON.stringify(values[filterId] ?? null) !== JSON.stringify(value)) {
    for (const child of descendantFilters(filters, filterId)) {
      next[child] = null;
    }
  }
  return next;
}

/** The parents' values a filter's choices depend on, nearest first. */
export function parentValuesOf(
  filters: readonly DashboardFilterDefinition[],
  values: Readonly<Record<string, JsonValue>>,
  filter: DashboardFilterDefinition,
): Record<string, JsonValue> {
  const result: Record<string, JsonValue> = {};
  const byId = new Map(filters.map((item) => [item.id, item]));
  for (let parent = filter.parentId; parent !== undefined; parent = byId.get(parent)?.parentId) {
    if (parent in result) {
      break;
    }
    result[parent] = values[parent] ?? null;
  }
  return result;
}

/** How many filters have a value (for the phone's filters button). */
export function activeFilterCount(values: Readonly<Record<string, JsonValue>>): number {
  return Object.values(values).filter((value) => value !== null).length;
}
