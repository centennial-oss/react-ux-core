// View-mode formatting: a readable rendering of each field type's value.

import { DateFormatter } from '@internationalized/date';
import type { ReactNode } from 'react';
import { formatTimeRange, getDefaultTimeRangePresets } from '../components/TimeRangePicker/labels';
import { isTimeRange } from '../components/TimeRangePicker/resolveTimeRange';

import {
  currencyDigits,
  moneyToNumber,
  percentToFraction,
  toCalendarDate,
  toDateRange,
  toTime,
  toZonedDateTime,
} from './fields/convert';
import type { AnyInputFieldConfig } from './internalTypes';
import type { FieldOption, FileReferenceInfo } from './types';
import { type FormStrings } from './messages';

export interface FormatContext {
  /** The values `visibleWhen`-style functions see: the form's, or an array item's. */
  scope: unknown;
  locale: string;
  timeZone: string;
  messages: FormStrings;
}

interface FormattingOptions {
  formatOptions?: Intl.NumberFormatOptions;
  unit?: string;
  currency?: string;
  moneyAs?: 'decimal' | 'minor';
  minorUnits?: number;
  percentAs?: 'fraction' | 'whole';
  maximumFractionDigits?: number;
  timeZone?: string;
  describeFile?: (reference: never) => FileReferenceInfo;
}

function optionsOf(field: AnyInputFieldConfig, scope: unknown): readonly FieldOption[] {
  const { items } = field;
  if (typeof items === 'function') {
    return items(scope as never);
  }
  return items ?? [];
}

function labelOf(options: readonly FieldOption[], key: unknown): string {
  const option = options.find((candidate) => candidate.id === key || String(candidate.id) === key);
  return option?.label ?? String(key);
}

function formatNumber(value: number, locale: string, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(locale, options).format(value);
}

function fileName(entry: unknown, describe: FormattingOptions['describeFile']): string {
  if (entry instanceof File) {
    return entry.name;
  }
  return describe ? describe(entry as never).name : String(entry);
}

/** The view-mode rendering of a field's value; `undefined` shows as "Not set". */
export function formatFieldValue(
  field: AnyInputFieldConfig,
  value: unknown,
  context: FormatContext,
): ReactNode {
  if (field.formatValue) {
    return field.formatValue(value as never, context.scope as never);
  }
  const { locale, timeZone, messages } = context;
  const options = field as AnyInputFieldConfig & FormattingOptions;
  switch (field.type) {
    case 'password':
      return typeof value === 'string' && value !== '' ? '••••••••' : undefined;
    case 'number': {
      if (typeof value !== 'number') {
        return undefined;
      }
      const text = formatNumber(value, locale, options.formatOptions);
      return options.unit === undefined ? text : `${text} ${options.unit}`;
    }
    case 'money': {
      const currency = options.currency ?? 'USD';
      const digits = options.minorUnits ?? currencyDigits(currency);
      const amount = moneyToNumber(value, options.moneyAs, digits);
      return amount === null
        ? undefined
        : formatNumber(amount, locale, {
            style: 'currency',
            currency,
            minimumFractionDigits: digits,
            maximumFractionDigits: digits,
          });
    }
    case 'percent': {
      const fraction = percentToFraction(value, options.percentAs);
      return fraction === null
        ? undefined
        : formatNumber(fraction, locale, {
            style: 'percent',
            maximumFractionDigits: options.maximumFractionDigits ?? 0,
          });
    }
    case 'select':
    case 'combobox':
    case 'radio':
    case 'pillbox':
      return value === null || value === undefined || value === ''
        ? undefined
        : labelOf(optionsOf(field, context.scope), value);
    case 'multiselect':
    case 'checkboxGroup': {
      if (!Array.isArray(value) || value.length === 0) {
        return undefined;
      }
      const choices = optionsOf(field, context.scope);
      return (value as unknown[]).map((key) => labelOf(choices, key)).join(', ');
    }
    case 'checkbox':
    case 'switch':
      return value === true ? messages.yes : messages.no;
    case 'date': {
      const date = toCalendarDate(value);
      return date
        ? new DateFormatter(locale, { dateStyle: 'medium', timeZone }).format(date.toDate(timeZone))
        : undefined;
    }
    case 'dateRange': {
      const range = toDateRange(value);
      return range
        ? new DateFormatter(locale, { dateStyle: 'medium', timeZone }).formatRange(
            range.start.toDate(timeZone),
            range.end.toDate(timeZone),
          )
        : undefined;
    }
    case 'time': {
      const time = toTime(value);
      return time
        ? new DateFormatter(locale, {
            hour: 'numeric',
            minute: '2-digit',
            ...(time.second === 0 ? {} : { second: '2-digit' }),
            timeZone: 'UTC',
          }).format(new Date(Date.UTC(1970, 0, 1, time.hour, time.minute, time.second)))
        : undefined;
    }
    case 'dateTime': {
      const zone = options.timeZone ?? timeZone;
      const date = toZonedDateTime(value, zone);
      return date
        ? new DateFormatter(locale, {
            dateStyle: 'medium',
            timeStyle: 'short',
            timeZone: zone,
          }).format(date.toDate())
        : undefined;
    }
    case 'timeRange':
      return isTimeRange(value)
        ? formatTimeRange(value, {
            messages,
            locale,
            timeZone: options.timeZone ?? timeZone,
            presets: getDefaultTimeRangePresets(messages),
          }) || undefined
        : undefined;
    case 'file':
    case 'files': {
      const entries: unknown[] = Array.isArray(value)
        ? (value as unknown[])
        : value === null || value === undefined
          ? []
          : [value];
      return entries.length === 0
        ? undefined
        : entries.map((entry) => fileName(entry, options.describeFile)).join(', ');
    }
    default:
      return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
  }
}
