// The value editor of a condition row, chosen by the field's type and the operator's value shape: one editor, a
// From/To pair for `between`, a list for `in`/`notIn`, or nothing for `exists`. Editors are named by `aria-label`
// (the row's group gives the context); the row shows errors under them.

import { parseDate, type CalendarDate } from '@internationalized/date';
import { useState } from 'react';
import { useEntryMessages } from '../../provider/context';
import { CidrField } from '../CidrField/CidrField';
import { CidrList } from '../CidrField/CidrList';
import { DatePicker } from '../DatePicker/DatePicker';
import { Option } from '../ListBox/ListBoxParts';
import { MultiSelect } from '../MultiSelect/MultiSelect';
import { NumberField } from '../NumberField/NumberField';
import { Select } from '../Select/Select';
import { Switch } from '../Switch/Switch';
import { TextField } from '../TextField/TextField';
import { DurationField } from '../UnitField/DurationField';
import { defaultRuleBuilderMessages } from './messages';
import { valueShape } from './ruleTree';
import type { RuleField, RuleOperator } from './types';

interface EditorProps {
  field: RuleField;
  operator: RuleOperator;
  value: unknown;
  onChange: (value: unknown) => void;
  label: string;
  isInvalid: boolean;
  isDisabled: boolean;
}

function toDate(value: unknown): CalendarDate | null {
  if (typeof value !== 'string' || value === '') {
    return null;
  }
  try {
    return parseDate(value);
  } catch {
    return null;
  }
}

const asString = (value: unknown) => (typeof value === 'string' ? value : '');
const asNumber = (value: unknown) => (typeof value === 'number' ? value : null);

/** One value: the editor for the field's type. */
function SingleEditor({ field, value, onChange, label, isInvalid, isDisabled }: EditorProps) {
  const common = { 'aria-label': label, isInvalid, isDisabled };
  switch (field.type) {
    case 'number':
      return (
        <NumberField
          {...common}
          value={asNumber(value)}
          onChange={onChange}
          suffix={field.unit}
          className="min-w-0 flex-1"
        />
      );
    case 'duration':
      return (
        <DurationField
          {...common}
          value={asNumber(value)}
          onChange={onChange}
          className="min-w-0 flex-1"
        />
      );
    case 'enum':
      return (
        <Select
          {...common}
          items={field.options ?? []}
          value={typeof value === 'string' ? value : null}
          onChange={onChange}
          className="min-w-0 flex-1"
        >
          {(option) => <Option id={option.id}>{option.label}</Option>}
        </Select>
      );
    case 'boolean':
      return (
        <Switch
          aria-label={label}
          isDisabled={isDisabled}
          isSelected={value === true}
          onChange={onChange}
          className="min-w-0"
        />
      );
    case 'date':
      return (
        <DatePicker
          {...common}
          value={toDate(value)}
          onChange={(date) => {
            onChange(date ? date.toString() : null);
          }}
          className="min-w-0 flex-1"
        />
      );
    case 'cidr':
      return (
        <CidrField
          aria-label={label}
          isDisabled={isDisabled}
          hasRangeInfo={false}
          value={asString(value)}
          onChange={onChange}
          className="min-w-0 flex-1"
        />
      );
    default:
      return (
        <TextField
          {...common}
          value={asString(value)}
          onChange={onChange}
          autoComplete="off"
          className="min-w-0 flex-1"
        />
      );
  }
}

/** Comma-separated text for a list of plain values. Keeps what's typed (a trailing comma) while it means the same. */
function ListText({ field, value, onChange, label, isInvalid, isDisabled }: EditorProps) {
  const messages = useEntryMessages(defaultRuleBuilderMessages);
  const values = Array.isArray(value) ? (value as unknown[]) : [];
  const join = (items: readonly unknown[]) => items.map(String).join(', ');
  const parse = (text: string): unknown[] =>
    text
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part !== '')
      .map((part) => {
        if (field.type !== 'number') {
          return part;
        }
        const number = Number(part);
        // Leaves unreadable numbers as text, so validation can flag them.
        return Number.isFinite(number) ? number : part;
      });
  const [text, setText] = useState(() => join(values));
  if (join(parse(text)) !== join(values)) {
    setText(join(values));
  }
  return (
    <TextField
      aria-label={label}
      isInvalid={isInvalid}
      isDisabled={isDisabled}
      description={messages.ruleListHint}
      value={text}
      onChange={(next) => {
        setText(next);
        onChange(parse(next));
      }}
      autoComplete="off"
      className="min-w-0 flex-1"
    />
  );
}

function ListEditor(props: EditorProps) {
  const { field, value, onChange, label, isInvalid, isDisabled } = props;
  const values = Array.isArray(value) ? (value as unknown[]) : [];
  if (field.type === 'enum' || field.type === 'multiEnum') {
    return (
      <MultiSelect
        aria-label={label}
        isInvalid={isInvalid}
        isDisabled={isDisabled}
        items={field.options ?? []}
        value={values.filter((item): item is string => typeof item === 'string')}
        onChange={onChange}
        className="min-w-0 flex-1"
      >
        {(option) => <Option id={option.id}>{option.label}</Option>}
      </MultiSelect>
    );
  }
  if (field.type === 'cidr') {
    return (
      <CidrList
        aria-label={label}
        isDisabled={isDisabled}
        hasRangeInfo={false}
        value={values.filter((item): item is string => typeof item === 'string')}
        onChange={onChange}
        className="min-w-0 flex-1"
      />
    );
  }
  return <ListText {...props} />;
}

export interface ConditionValueProps {
  field: RuleField;
  operator: RuleOperator;
  value: unknown;
  onChange: (value: unknown) => void;
  isInvalid: boolean;
  isDisabled: boolean;
}

/** The value editor(s) for a condition. */
export function ConditionValue({ field, operator, value, onChange, ...rest }: ConditionValueProps) {
  const messages = useEntryMessages(defaultRuleBuilderMessages);
  const shape = valueShape(field, operator);
  if (shape === 'none') {
    return null;
  }
  if (shape === 'list') {
    return (
      <ListEditor
        {...rest}
        field={field}
        operator={operator}
        value={value}
        onChange={onChange}
        label={messages.ruleValue}
      />
    );
  }
  if (shape === 'pair') {
    const pair = Array.isArray(value) ? (value as unknown[]) : [];
    const [from = null, to = null] = pair;
    return (
      <div className="flex min-w-0 flex-wrap items-start gap-2">
        <SingleEditor
          {...rest}
          field={field}
          operator={operator}
          value={from}
          onChange={(next) => {
            onChange([next, to]);
          }}
          label={messages.ruleValueFrom}
        />
        <SingleEditor
          {...rest}
          field={field}
          operator={operator}
          value={to}
          onChange={(next) => {
            onChange([from, next]);
          }}
          label={messages.ruleValueTo}
        />
      </div>
    );
  }
  return (
    <SingleEditor
      {...rest}
      field={field}
      operator={operator}
      value={value}
      onChange={onChange}
      label={messages.ruleValue}
    />
  );
}
