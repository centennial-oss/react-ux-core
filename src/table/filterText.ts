// Filter values in words: the text of an active filter's chip. Kept apart from the filter controls, so a component
// that only describes filters doesn't load the controls (date pickers, combo boxes).

import { parseDate } from '@internationalized/date';
import { dateTimeFormat, numberFormat } from '../utils/intl';
import type { TableStrings } from './messages';
import type {
  DateRangeFilterValue,
  FilterConfig,
  FilterOption,
  FilterValue,
  FilterValues,
  NumberRangeFilterValue,
} from './types';

/** No filter values, as a shared default. */
export const NO_FILTERS: FilterValues = {};

/** Type guards and parsing shared with the filter controls. */
export function isList(value: FilterValue | undefined): value is readonly string[] {
  return Array.isArray(value);
}

export function isRange(value: FilterValue | undefined): value is NumberRangeFilterValue {
  return typeof value === 'object' && !Array.isArray(value) && !('start' in value);
}

export function isDateRange(value: FilterValue | undefined): value is DateRangeFilterValue {
  return typeof value === 'object' && !Array.isArray(value) && 'start' in value;
}

function optionLabel(options: readonly FilterOption[], id: string): string {
  return options.find((option) => option.id === id)?.label ?? id;
}

export function tryDate(iso: string) {
  try {
    return parseDate(iso);
  } catch {
    return null;
  }
}

/** The chip text for an active filter, or `undefined` when its value means "not applied". */
export function describeFilter(
  filter: FilterConfig,
  value: FilterValue | undefined,
  messages: TableStrings,
  locale: string,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const number = (amount: number) =>
    `${numberFormat(locale).format(amount)}${filter.type === 'numberRange' && filter.unit ? ` ${filter.unit}` : ''}`;
  switch (filter.type) {
    case 'text':
      return typeof value === 'string' && value.trim() !== ''
        ? `${filter.label}: “${value.trim()}”`
        : undefined;
    case 'enum':
      return typeof value === 'string'
        ? `${filter.label}: ${optionLabel(filter.options, value)}`
        : undefined;
    case 'multiEnum':
      return isList(value) && value.length > 0
        ? `${filter.label}: ${value.map((id) => optionLabel(filter.options, id)).join(', ')}`
        : undefined;
    case 'boolean':
      return typeof value === 'boolean'
        ? `${filter.label}: ${value ? (filter.trueLabel ?? messages.yes) : (filter.falseLabel ?? messages.no)}`
        : undefined;
    case 'asyncEntity':
      return typeof value === 'string'
        ? `${filter.label}: ${filter.getOptionLabel?.(value) ?? value}`
        : undefined;
    case 'dateRange': {
      if (!isDateRange(value)) {
        return undefined;
      }
      const start = tryDate(value.start);
      const end = tryDate(value.end);
      if (!start || !end) {
        return undefined;
      }
      const format = dateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' });
      return `${filter.label}: ${format.formatRange(start.toDate('UTC'), end.toDate('UTC'))}`;
    }
    case 'numberRange': {
      if (!isRange(value) || (value.min === undefined && value.max === undefined)) {
        return undefined;
      }
      if (value.min !== undefined && value.max !== undefined) {
        return `${filter.label}: ${number(value.min)}–${number(value.max)}`;
      }
      return value.min === undefined
        ? `${filter.label}: ≤ ${number(value.max ?? 0)}`
        : `${filter.label}: ≥ ${number(value.min)}`;
    }
  }
}

/** The active filters as chip entries. */
export function activeFilters(
  filters: readonly FilterConfig[],
  values: FilterValues,
  messages: TableStrings,
  locale: string,
): { id: string; text: string }[] {
  return filters.flatMap((filter) => {
    const text = describeFilter(filter, values[filter.id], messages, locale);
    return text === undefined ? [] : [{ id: filter.id, text }];
  });
}
