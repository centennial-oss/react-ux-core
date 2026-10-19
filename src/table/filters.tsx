// Declarative filters: the controls in the filter panel (the text of an active filter's chip is in filterText.ts).

import { useLocale } from 'react-aria-components';
import { Checkbox } from '../components/Checkbox/Checkbox';
import { CheckboxGroup } from '../components/Checkbox/CheckboxGroup';
import { ComboBox } from '../components/ComboBox/ComboBox';
import { DateRangePicker } from '../components/DatePicker/DateRangePicker';
import { Option } from '../components/ListBox/ListBoxParts';
import { NumberField } from '../components/NumberField/NumberField';
import { Radio, RadioGroup } from '../components/RadioGroup/RadioGroup';
import { Select } from '../components/Select/Select';
import { TextField } from '../components/TextField/TextField';

import { isDateRange, isList, isRange, tryDate } from './filterText';
import type {
  FilterConfig,
  FilterOption,
  FilterValue,
  FilterValues,
  NumberRangeFilterValue,
} from './types';
import { useTableMessages } from './messages';

export { activeFilters, describeFilter } from './filterText';

const ANY = '__any';

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
          case 'text':
            return (
              <TextField
                key={filter.id}
                label={filter.label}
                placeholder={filter.placeholder}
                value={typeof value === 'string' ? value : ''}
                onChange={(next) => {
                  set(filter.id, next === '' ? undefined : next);
                }}
              />
            );
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
