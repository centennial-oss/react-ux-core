// The filter controls (CTX-08, CTX-09): one Select per filter in dependency order, children shown once their parent
// has a value, choices loaded for the parents' values, a lone choice selected and shown as text, and a value whose
// choice disappeared reset.

import { useEffect, useState } from 'react';
import { Option } from '../../components/ListBox/ListBoxParts';
import { Select } from '../../components/Select/Select';
import { cn } from '../../utils/cn';
import { readText, type DashboardStrings } from '../messages';
import type { JsonValue } from '../types';
import {
  orderedFilters,
  parentValuesOf,
  type DashboardFilterDefinition,
  type FilterOption,
} from './filters';

/** The key of the "All" choice, which means no filter (`null`). */
const ALL = '__all__';
const keyOf = (value: JsonValue | undefined) =>
  value === null || value === undefined ? ALL : JSON.stringify(value);
const isSameValue = (a: JsonValue | undefined, b: JsonValue | undefined) => keyOf(a) === keyOf(b);

/** A filter's choices: its static ones, or loaded for the parents' values (undefined while loading). */
function useFilterOptions(
  filter: DashboardFilterDefinition,
  parentValues: Record<string, JsonValue>,
  runtimeContext: unknown,
): readonly FilterOption[] | undefined {
  const parentKey = JSON.stringify(parentValues);
  const [loaded, setLoaded] = useState<{
    key: string;
    context: unknown;
    options: readonly FilterOption[];
  } | null>(null);
  const { loadOptions } = filter;
  useEffect(() => {
    if (!loadOptions) {
      return;
    }
    const controller = new AbortController();
    loadOptions({
      parentValues: JSON.parse(parentKey) as Record<string, JsonValue>,
      signal: controller.signal,
      context: runtimeContext,
    })
      .then((options) => {
        if (!controller.signal.aborted) {
          setLoaded({ key: parentKey, context: runtimeContext, options });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoaded({ key: parentKey, context: runtimeContext, options: [] });
        }
      });
    return () => {
      controller.abort();
    };
  }, [loadOptions, parentKey, runtimeContext]);
  if (!loadOptions) {
    return filter.options ?? [];
  }
  return loaded?.key === parentKey && loaded.context === runtimeContext
    ? loaded.options
    : undefined;
}

interface FilterControlProps {
  filter: DashboardFilterDefinition;
  value: JsonValue | undefined;
  parentValues: Record<string, JsonValue>;
  onChange: (filterId: string, value: JsonValue) => void;
  runtimeContext: unknown;
  messages: DashboardStrings;
}

function FilterControl({
  filter,
  value,
  parentValues,
  onChange,
  runtimeContext,
  messages,
}: FilterControlProps) {
  const options = useFilterOptions(filter, parentValues, runtimeContext);
  const label = readText(filter.label, messages);
  const first = options?.[0];
  // A lone choice is selected; a value whose choice is gone resets to All, or the first choice (CTX-09).
  useEffect(() => {
    if (!options) {
      return;
    }
    let next: JsonValue | undefined;
    if (options.length === 1 && first) {
      next = first.value;
    } else if (
      value !== undefined &&
      value !== null &&
      !options.some((option) => isSameValue(option.value, value))
    ) {
      next = filter.allowsAll ? null : (first?.value ?? null);
    } else if ((value === undefined || value === null) && !filter.allowsAll && first) {
      next = first.value;
    }
    if (next !== undefined && !isSameValue(next, value)) {
      onChange(filter.id, next);
    }
  }, [options, first, value, filter.id, filter.allowsAll, onChange]);

  if (options?.length === 1 && first && filter.isHiddenWhenSingleOption !== false) {
    return (
      <p className="flex min-h-hit items-center gap-1.5 text-sm">
        <span className="text-fg-muted">{label}</span>
        <span className="font-medium">{first.label}</span>
      </p>
    );
  }
  return (
    <Select
      label={label}
      labelPosition="side"
      size="sm"
      value={options ? keyOf(value) : null}
      placeholder={options ? undefined : messages.loading}
      isDisabled={!options}
      onChange={(key) => {
        const option = options?.find((candidate) => keyOf(candidate.value) === key);
        onChange(filter.id, option ? option.value : null);
      }}
      className="min-w-40"
    >
      {[
        ...(filter.allowsAll ? [{ value: null, label: messages.allOption }] : []),
        ...(options ?? []),
      ].map((option) => (
        <Option key={keyOf(option.value)} id={keyOf(option.value)}>
          {option.label}
        </Option>
      ))}
    </Select>
  );
}

export interface FilterBarProps {
  filters: readonly DashboardFilterDefinition[];
  values: Readonly<Record<string, JsonValue>>;
  onChange: (filterId: string, value: JsonValue) => void;
  runtimeContext: unknown;
  messages: DashboardStrings;
  /** Stacks the controls (the phone's filters sheet). */
  isStacked?: boolean;
}

/** The dashboard's filters, in dependency order (CTX-08). */
export function FilterBar({
  filters,
  values,
  onChange,
  runtimeContext,
  messages,
  isStacked = false,
}: FilterBarProps) {
  const ordered = orderedFilters(filters);
  return (
    <div
      className={cn(
        'flex min-w-0 gap-x-4 gap-y-2',
        isStacked ? 'flex-col' : 'flex-wrap items-center',
      )}
    >
      {ordered.map((filter) => {
        // A child shows once its parent has a value other than All (CTX-08).
        const parentValue = filter.parentId === undefined ? undefined : values[filter.parentId];
        if (filter.parentId !== undefined && (parentValue === undefined || parentValue === null)) {
          return null;
        }
        return (
          <FilterControl
            key={filter.id}
            filter={filter}
            value={values[filter.id]}
            parentValues={parentValuesOf(filters, values, filter)}
            onChange={onChange}
            runtimeContext={runtimeContext}
            messages={messages}
          />
        );
      })}
    </div>
  );
}
