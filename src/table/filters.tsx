// Declarative filters: the controls in the filter panel, and the text of an active filter's chip.

import { parseDate } from '@internationalized/date';
import { useLocale } from 'react-aria-components';
import { Checkbox } from '../components/Checkbox/Checkbox';
import { CheckboxGroup } from '../components/Checkbox/CheckboxGroup';
import { ComboBox } from '../components/ComboBox/ComboBox';
import { DateRangePicker } from '../components/DatePicker/DateRangePicker';
import { Option } from '../components/ListBox/ListBoxParts';
import { NumberField } from '../components/NumberField/NumberField';
import { Radio, RadioGroup } from '../components/RadioGroup/RadioGroup';
import { Select } from '../components/Select/Select';

import type {
  DateRangeFilterValue,
  FilterConfig,
  FilterOption,
  FilterValue,
  FilterValues,
  NumberRangeFilterValue,
} from './types';
import { useTableMessages, type TableStrings } from './messages';

const ANY = '__any';

function isList(value: FilterValue | undefined): value is readonly string[] {
  return Array.isArray(value);
}

function isRange(value: FilterValue | undefined): value is NumberRangeFilterValue {
  return typeof value === 'object' && !Array.isArray(value) && !('start' in value);
}

function isDateRange(value: FilterValue | undefined): value is DateRangeFilterValue {
  return typeof value === 'object' && !Array.isArray(value) && 'start' in value;
}

function optionLabel(options: readonly FilterOption[], id: string): string {
  return options.find((option) => option.id === id)?.label ?? id;
}

function tryDate(iso: string) {
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
    `${new Intl.NumberFormat(locale).format(amount)}${filter.type === 'numberRange' && filter.unit ? ` ${filter.unit}` : ''}`;
  switch (filter.type) {
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
      const format = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' });
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

/** One control per filter; changes apply at once. */
export function FilterPanel({
  filters,
  values,
  onChange,
}: {
  filters: readonly FilterConfig[];
  values: FilterValues;
  onChange: (values: FilterValues) => void;
}) {
  const messages = useTableMessages();
  const set = (id: string, value: FilterValue | undefined) => {
    onChange({ ...values, [id]: value });
  };

  return (
    <div className="flex flex-col gap-4">
      {filters.map((filter) => {
        const value = values[filter.id];
        switch (filter.type) {
          case 'enum':
            return (
              <Select
                key={filter.id}
                label={filter.label}
                value={typeof value === 'string' ? value : ANY}
                onChange={(key) => {
                  set(filter.id, key === ANY ? undefined : key);
                }}
              >
                <Option id={ANY}>{messages.any}</Option>
                {filter.options.map((option) => (
                  <Option key={option.id} id={option.id}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            );
          case 'multiEnum':
            return (
              <CheckboxGroup
                key={filter.id}
                label={filter.label}
                value={isList(value) ? [...value] : []}
                onChange={(next) => {
                  set(filter.id, next.length === 0 ? undefined : next);
                }}
              >
                {filter.options.map((option) => (
                  <Checkbox key={option.id} value={option.id}>
                    {option.label}
                  </Checkbox>
                ))}
              </CheckboxGroup>
            );
          case 'boolean':
            return (
              <RadioGroup
                key={filter.id}
                label={filter.label}
                orientation="horizontal"
                value={typeof value === 'boolean' ? String(value) : ANY}
                onChange={(next) => {
                  set(filter.id, next === ANY ? undefined : next === 'true');
                }}
              >
                <Radio value={ANY}>{messages.any}</Radio>
                <Radio value="true">{filter.trueLabel ?? messages.yes}</Radio>
                <Radio value="false">{filter.falseLabel ?? messages.no}</Radio>
              </RadioGroup>
            );
          case 'dateRange': {
            const start = isDateRange(value) ? tryDate(value.start) : null;
            const end = isDateRange(value) ? tryDate(value.end) : null;
            return (
              <DateRangePicker
                key={filter.id}
                label={filter.label}
                value={start && end ? { start, end } : null}
                onChange={(range) => {
                  set(
                    filter.id,
                    range
                      ? { start: range.start.toString(), end: range.end.toString() }
                      : undefined,
                  );
                }}
              />
            );
          }
          case 'numberRange': {
            const range = isRange(value) ? value : {};
            const update = (part: 'min' | 'max', amount: number | null) => {
              const next: NumberRangeFilterValue = { ...range, [part]: amount ?? undefined };
              set(filter.id, next.min === undefined && next.max === undefined ? undefined : next);
            };
            return (
              <fieldset key={filter.id} className="flex min-w-0 flex-col gap-1.5">
                <legend className="mb-1.5 text-sm font-medium text-fg">{filter.label}</legend>
                <div className="grid grid-cols-2 gap-2">
                  <NumberField
                    label={messages.minimum}
                    value={range.min ?? null}
                    onChange={(amount) => {
                      update('min', amount);
                    }}
                    suffix={filter.unit}
                  />
                  <NumberField
                    label={messages.maximum}
                    value={range.max ?? null}
                    onChange={(amount) => {
                      update('max', amount);
                    }}
                    suffix={filter.unit}
                  />
                </div>
              </fieldset>
            );
          }
          case 'asyncEntity':
            return (
              <ComboBox
                key={filter.id}
                label={filter.label}
                loadItems={async (query: string, signal: AbortSignal) => [
                  ...(await filter.loadOptions(query, signal)),
                ]}
                value={typeof value === 'string' ? value : null}
                onChange={(key) => {
                  set(filter.id, key === null ? undefined : String(key));
                }}
              >
                {(option: FilterOption) => <Option id={option.id}>{option.label}</Option>}
              </ComboBox>
            );
        }
      })}
    </div>
  );
}

/** The locale, for describing filters outside React components' render (hooks only). */
export function useFilterLocale(): string {
  return useLocale().locale;
}
