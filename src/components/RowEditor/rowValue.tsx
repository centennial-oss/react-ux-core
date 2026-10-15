// The value column shared by ScheduleEditor and TierEditor: a NumberField by default, or the app's own field.

import type { ReactNode } from 'react';
import { useLocale } from 'react-aria-components';
import { NumberField } from '../NumberField/NumberField';

/** What a custom value field receives. */
export interface RowValueFieldProps<V> {
  value: V;
  onChange: (value: V) => void;
  /** Names the field when the table layout shows the column heading instead of a label. */
  'aria-label'?: string;
  /** The field's visible label in the card layout. */
  label?: string;
  isDisabled: boolean;
}

/** Numbers use a NumberField with these options. */
export interface NumberValueProps {
  renderValue?: never;
  /** The value of an added row. Defaults to 0. */
  newRowValue?: number;
  /** `Intl.NumberFormat` options, for example `{ style: 'percent' }` or a currency. */
  formatOptions?: Intl.NumberFormatOptions;
  /** Shown after the number ("kW"). */
  unit?: string;
  minValue?: number;
  maxValue?: number;
  step?: number;
  formatValue?: (value: number) => string;
  toNumber?: never;
}

/** Any other value needs its own field, a starting value and a text form. */
export interface CustomValueProps<V> {
  renderValue: (props: RowValueFieldProps<V>) => ReactNode;
  newRowValue: V;
  formatValue: (value: V) => string;
  /** A number for each value (shading, charts). */
  toNumber?: (value: V) => number;
  formatOptions?: never;
  unit?: never;
  minValue?: never;
  maxValue?: never;
  step?: never;
}

/** Number options when the value is a number; a custom field otherwise. */
export type RowValueProps<V> = [V] extends [number] ? NumberValueProps : CustomValueProps<V>;

/** Formatting and the field for a row editor's value column. */
export function useRowValue<V>(props: NumberValueProps | CustomValueProps<V>) {
  const { locale } = useLocale();
  const custom = props.renderValue === undefined ? undefined : props;
  const numeric = props.renderValue === undefined ? props : undefined;
  const numberFormat = new Intl.NumberFormat(locale, numeric?.formatOptions);
  // Without a custom field, V is number (RowValueProps ties them together).
  const asNumber = (value: V) => value as unknown as number;
  const formatValue = (value: V): string =>
    custom
      ? custom.formatValue(value)
      : numeric?.formatValue
        ? numeric.formatValue(asNumber(value))
        : `${numberFormat.format(asNumber(value))}${numeric?.unit === undefined ? '' : ` ${numeric.unit}`}`;
  return {
    formatValue,
    toNumber: custom ? custom.toNumber : asNumber,
    newRowValue: custom ? custom.newRowValue : ((numeric?.newRowValue ?? 0) as unknown as V),
    renderField: (field: RowValueFieldProps<V>) =>
      custom ? (
        custom.renderValue(field)
      ) : (
        <NumberField
          label={field.label}
          aria-label={field['aria-label']}
          value={asNumber(field.value)}
          onChange={(next) => {
            field.onChange((next ?? 0) as unknown as V);
          }}
          formatOptions={numeric?.formatOptions}
          suffix={numeric?.unit}
          minValue={numeric?.minValue}
          maxValue={numeric?.maxValue}
          step={numeric?.step}
          isDisabled={field.isDisabled}
        />
      ),
  };
}
