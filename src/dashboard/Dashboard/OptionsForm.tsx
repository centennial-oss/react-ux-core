// A form generated from an options schema (WID-05), so simple widget types need no hand-written editor; data sources
// can use the same schema for their parameters (DATA-16). Fields are named like ConfigForm's and drawn with CCUX
// controls: text, number, switch, select, pillbox (segmented), colour token and time range.

import { useEffect, useMemo } from 'react';
import { Option } from '../../components/ListBox/ListBoxParts';
import { NumberField } from '../../components/NumberField/NumberField';
import { Pillbox } from '../../components/Pillbox/Pillbox';
import { Select } from '../../components/Select/Select';
import { Switch } from '../../components/Switch/Switch';
import { TextArea } from '../../components/TextArea/TextArea';
import { TextField } from '../../components/TextField/TextField';
import { TimeRangePicker } from '../../components/TimeRangePicker/TimeRangePicker';
import { isTimeRange } from '../../components/TimeRangePicker/resolveTimeRange';
import { cn } from '../../utils/cn';
import { readText, type DashboardStrings } from '../messages';
import type {
  JsonObject,
  JsonValue,
  OptionsField,
  OptionsSchema,
  ValidationResult,
} from '../types';

/** The chart palette slots and tones a colour option offers. */
const COLORS = [
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'chart-6',
  'chart-7',
  'chart-8',
  'chart-9',
  'chart-10',
  'accent',
  'success',
  'warning',
  'danger',
  'neutral',
] as const;

/** Swatch classes for each colour token, as complete strings. */
const swatchClasses: Record<(typeof COLORS)[number], string> = {
  'chart-1': 'bg-chart-1',
  'chart-2': 'bg-chart-2',
  'chart-3': 'bg-chart-3',
  'chart-4': 'bg-chart-4',
  'chart-5': 'bg-chart-5',
  'chart-6': 'bg-chart-6',
  'chart-7': 'bg-chart-7',
  'chart-8': 'bg-chart-8',
  'chart-9': 'bg-chart-9',
  'chart-10': 'bg-chart-10',
  accent: 'bg-accent-solid',
  success: 'bg-success-solid',
  warning: 'bg-warning-solid',
  danger: 'bg-danger-solid',
  neutral: 'bg-neutral-solid',
};

const AUTO = '__auto__';

/** A choice's key: strings and numbers as text, anything else as JSON. */
const scalarKey = (value: JsonValue): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : JSON.stringify(value);

/** Problems with the values: required fields left empty, numbers out of range, and the type's own issues. */
export function schemaIssues<T extends JsonObject>(
  schema: OptionsSchema<T>,
  value: T,
  messages: DashboardStrings,
  validation?: ValidationResult,
): Map<string, string> {
  const issues = new Map<string, string>();
  for (const field of schema) {
    // Stored options can hold anything, or nothing, whatever the type says.
    const current: JsonValue | undefined = value[field.name];
    const isEmpty = current === undefined || current === null || current === '';
    if (field.isRequired && isEmpty) {
      issues.set(field.name, messages.requiredField);
    } else if (field.type === 'number' && typeof current === 'number') {
      const min = field.minValue ?? Number.NEGATIVE_INFINITY;
      const max = field.maxValue ?? Number.POSITIVE_INFINITY;
      if (current < min || current > max) {
        issues.set(
          field.name,
          messages.numberOutOfRange({
            min: field.minValue ?? Number.MIN_SAFE_INTEGER,
            max: field.maxValue ?? Number.MAX_SAFE_INTEGER,
          }),
        );
      }
    }
  }
  for (const issue of validation?.issues ?? []) {
    if (issue.path !== undefined && !issues.has(issue.path)) {
      issues.set(issue.path, issue.message);
    }
  }
  return issues;
}

export interface OptionsFormProps<T extends JsonObject> {
  schema: OptionsSchema<T>;
  value: T;
  onChange: (value: T) => void;
  onValidityChange?: (isValid: boolean) => void;
  /** The type's or source's own validation, shown beside the fields it names. */
  validation?: ValidationResult;
  messages: DashboardStrings;
  timeZone?: string;
}

/** The fields of an options schema, bound to `value`. */
export function OptionsForm<T extends JsonObject>({
  schema,
  value,
  onChange,
  onValidityChange,
  validation,
  messages,
  timeZone,
}: OptionsFormProps<T>) {
  const issues = useMemo(
    () => schemaIssues(schema, value, messages, validation),
    [schema, value, messages, validation],
  );
  const isValid = issues.size === 0 && validation?.isValid !== false;
  useEffect(() => {
    onValidityChange?.(isValid);
  }, [isValid, onValidityChange]);

  const set = (name: string, next: JsonValue | undefined) => {
    const copy: JsonObject = { ...value };
    if (next === undefined) {
      Reflect.deleteProperty(copy, name);
    } else {
      copy[name] = next;
    }
    onChange(copy as T);
  };

  const field = (definition: OptionsField<T>) => {
    const { name } = definition;
    const label = readText(definition.label, messages);
    const description =
      definition.description === undefined ? undefined : readText(definition.description, messages);
    const current: JsonValue | undefined = value[name];
    const error = issues.get(name);
    const common = {
      label,
      description,
      isRequired: definition.isRequired,
      isInvalid: error !== undefined,
      errorMessage: error,
    };
    switch (definition.type) {
      case 'text':
        return (
          <TextField
            {...common}
            value={typeof current === 'string' ? current : ''}
            placeholder={definition.placeholder}
            onChange={(next) => {
              set(name, next);
            }}
          />
        );
      case 'textarea':
        return (
          <TextArea
            {...common}
            value={typeof current === 'string' ? current : ''}
            placeholder={definition.placeholder}
            minRows={definition.minRows}
            maxRows={definition.maxRows}
            onChange={(next) => {
              set(name, next);
            }}
          />
        );
      case 'number':
        return (
          <NumberField
            {...common}
            value={typeof current === 'number' ? current : null}
            minValue={definition.minValue}
            maxValue={definition.maxValue}
            step={definition.step}
            onChange={(next) => {
              set(name, next ?? null);
            }}
          />
        );
      case 'switch':
        return (
          <Switch
            isSelected={current === true}
            description={description}
            onChange={(next) => {
              set(name, next);
            }}
          >
            {label}
          </Switch>
        );
      case 'pillbox':
        return (
          <div className="flex flex-col gap-1">
            <span id={`${name}-label`} className="text-sm font-medium">
              {label}
            </span>
            <Pillbox
              aria-labelledby={`${name}-label`}
              value={scalarKey(current ?? definition.items[0]?.id ?? null)}
              options={definition.items.map((item) => ({
                id: String(item.id),
                label: readText(item.label, messages),
              }))}
              onChange={(next) => {
                const item = definition.items.find((candidate) => String(candidate.id) === next);
                set(name, item?.id ?? next);
              }}
            />
          </div>
        );
      case 'select':
        return (
          <Select
            {...common}
            value={current === undefined || current === null ? null : scalarKey(current)}
            onChange={(next) => {
              const item = definition.items.find((candidate) => String(candidate.id) === next);
              set(name, item?.id ?? next);
            }}
          >
            {definition.items.map((item) => (
              <Option key={String(item.id)} id={String(item.id)}>
                {readText(item.label, messages)}
              </Option>
            ))}
          </Select>
        );
      case 'color':
        return (
          <Select
            {...common}
            value={typeof current === 'string' ? current : AUTO}
            onChange={(next) => {
              set(name, next === AUTO ? undefined : next);
            }}
          >
            {[AUTO, ...COLORS].map((color) => (
              <Option
                key={color}
                id={color}
                textValue={
                  color === AUTO ? messages.colorAuto : messages.colorOption({ name: color })
                }
              >
                <span className="flex items-center gap-2">
                  {color !== AUTO && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        'inline-block size-3 rounded-full',
                        swatchClasses[color as (typeof COLORS)[number]],
                      )}
                    />
                  )}
                  {color === AUTO ? messages.colorAuto : messages.colorOption({ name: color })}
                </span>
              </Option>
            ))}
          </Select>
        );
      case 'timeRange':
        return (
          <TimeRangePicker
            label={label}
            timeZone={timeZone}
            value={isTimeRange(current) ? current : null}
            onChange={(next) => {
              set(name, next as unknown as JsonValue);
            }}
          />
        );
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {schema.map((definition) => (
        <div key={definition.name}>{field(definition)}</div>
      ))}
    </div>
  );
}
