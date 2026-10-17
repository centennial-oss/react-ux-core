// Ready-made EditableTable editors: CCUX fields at size `sm`, wired to the cell's name, error and value.

import type { ReactNode } from 'react';
import { MoneyField } from '../components/MoneyField/MoneyField';
import { Option } from '../components/ListBox/ListBoxParts';
import { NumberField } from '../components/NumberField/NumberField';
import { Select } from '../components/Select/Select';
import { TextField } from '../components/TextField/TextField';
import type { EditorProps } from './editableColumns';

/** The props every field takes from the cell. */
function cellProps<Row, Value>(props: EditorProps<Row, Value>) {
  return {
    'aria-label': props['aria-label'],
    'aria-describedby': props['aria-describedby'],
    isInvalid: props.isInvalid,
    isDisabled: props.isDisabled,
    size: 'sm' as const,
    className: 'w-full',
  };
}

/** A TextField editor for string values. */
export function textEditor<Row>({
  placeholder,
  maxLength,
}: { placeholder?: string; maxLength?: number } = {}) {
  return function TextEditor(props: EditorProps<Row, string>): ReactNode {
    return (
      <TextField
        {...cellProps(props)}
        value={props.value}
        onChange={(value) => {
          props.onChange(value);
        }}
        placeholder={placeholder}
        maxLength={maxLength}
      />
    );
  };
}

/** A NumberField editor for `number | null` values; it commits when the cell is left or Enter is pressed. */
export function numberEditor<Row>({
  minValue,
  maxValue,
  step,
  formatOptions,
  suffix,
}: {
  minValue?: number;
  maxValue?: number;
  step?: number;
  formatOptions?: Intl.NumberFormatOptions;
  /** A unit after the number ("ms"). */
  suffix?: string;
} = {}) {
  return function NumberEditor(props: EditorProps<Row, number | null>): ReactNode {
    return (
      <NumberField
        {...cellProps(props)}
        value={props.value}
        onChange={(value) => {
          props.onChange(value);
        }}
        minValue={minValue}
        maxValue={maxValue}
        step={step}
        formatOptions={formatOptions}
        suffix={suffix}
      />
    );
  };
}

/**
 * A Select editor over fixed options, for string ids. The value type defaults to `string`; pass
 * `selectEditor<Row, string | null>` for a column that may be empty.
 */
export function selectEditor<Row, Value extends string | null = string>({
  options,
}: {
  options: readonly { id: NonNullable<Value>; label: string }[];
}) {
  return function SelectEditor(props: EditorProps<Row, Value>): ReactNode {
    return (
      <Select<object, NonNullable<Value>>
        {...cellProps(props)}
        value={props.value}
        onChange={(value) => {
          props.onChange(value);
        }}
      >
        {options.map((option) => (
          <Option key={option.id} id={option.id} textValue={option.label}>
            {option.label}
          </Option>
        ))}
      </Select>
    );
  };
}

/** A MoneyField editor for decimal-string amounts (`string | null`). */
export function moneyEditor<Row>({
  currency,
  allowsNegative,
}: {
  currency: string;
  allowsNegative?: boolean;
}) {
  return function MoneyEditor(props: EditorProps<Row, string | null>): ReactNode {
    return (
      <MoneyField
        {...cellProps(props)}
        currency={currency}
        allowsNegative={allowsNegative}
        value={props.value}
        onChange={(value) => {
          props.onChange(value);
        }}
      />
    );
  };
}
