// Spreadsheet values by column type: parsing typed and pasted text, the checks behind cell errors, display and edit
// text, sorting order, filters and search. Pure functions; formatters are made once per column and locale.

import { dateTimeFormat, localeSeparators, numberFormat } from '../../utils/intl';
import { isList } from '../filterText';
import type { FilterConfig, FilterValue } from '../types';
import type { SpreadsheetStrings } from './messages';
import type {
  SpreadsheetColumn,
  SpreadsheetColumnType,
  SpreadsheetRow,
  SpreadsheetValue,
} from './types';
import { utcDay } from '../../utils/time';

/** The result of parsing text for a column: a value, or why the text doesn't fit. */
export type ParseResult = { value: SpreadsheetValue; error?: undefined } | { error: string };

const ISO_DATE = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
const PLAIN_NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;
const TRUE_WORDS = new Set(['true', 'yes', 'y', '1', 'x', '✓', '✔', 'on']);
const FALSE_WORDS = new Set(['false', 'no', 'n', '0', 'off']);
/** Floating-point slack when checking `step`. */
const STEP_EPSILON = 1e-9;

export function typeOf(column: SpreadsheetColumn): SpreadsheetColumnType {
  return column.type ?? 'text';
}

export function isEmptyValue(value: SpreadsheetValue | undefined): boolean {
  return value === null || value === undefined || value === '';
}

/** The value a cleared cell gets: unchecked for checkboxes, empty otherwise. */
export function emptyValueFor(column: SpreadsheetColumn): SpreadsheetValue {
  return typeOf(column) === 'boolean' ? false : null;
}

/** The alignment a column gets by default. */
export function alignOf(column: SpreadsheetColumn): 'start' | 'center' | 'end' {
  if (column.align) {
    return column.align;
  }
  const type = typeOf(column);
  if (type === 'number' || type === 'date') {
    return 'end';
  }
  return type === 'boolean' ? 'center' : 'start';
}

/** Formatters and lookups for one column in one locale, made once and reused for every cell. */
export interface ColumnFormat {
  column: SpreadsheetColumn;
  type: SpreadsheetColumnType;
  /** Text shown in the cell. */
  display: (value: SpreadsheetValue | undefined) => string;
  /** Text placed in the editor (plain numbers, ISO dates, option labels). */
  edit: (value: SpreadsheetValue | undefined) => string;
  /** Text copied to the clipboard, which `parse` reads back. */
  copy: (value: SpreadsheetValue | undefined) => string;
  /** Lower-case text that search matches against. */
  search: (value: SpreadsheetValue | undefined) => string;
  parse: (text: string) => ParseResult;
  /** The error for a value already in the sheet (a wrong type, an empty required cell, a failed check). */
  check: (value: SpreadsheetValue | undefined, row: SpreadsheetRow) => string | undefined;
  /** Orders two non-empty values. */
  compare: (a: SpreadsheetValue, b: SpreadsheetValue) => number;
  /** The option labels by id (`enum`). */
  optionLabels: ReadonlyMap<string, string>;
}

interface LocaleNumbers {
  group: string;
  decimal: string;
  editFormat: Intl.NumberFormat;
}

const localeNumbers = new Map<string, LocaleNumbers>();

function numbersFor(locale: string): LocaleNumbers {
  let numbers = localeNumbers.get(locale);
  if (!numbers) {
    const { group, decimal } = localeSeparators(locale);
    numbers = {
      group,
      decimal,
      editFormat: numberFormat(locale, { useGrouping: false, maximumFractionDigits: 20 }),
    };
    localeNumbers.set(locale, numbers);
  }
  return numbers;
}

/**
 * Reads a number typed or pasted in `locale`: plain JavaScript numbers always work, and locale text (grouping,
 * decimal comma, currency symbols, a trailing percent for percent columns) is understood. `null` when it isn't one.
 */
export function parseNumber(text: string, locale: string, isPercent = false): number | null {
  const trimmed = text.trim();
  if (PLAIN_NUMBER.test(trimmed)) {
    return Number(trimmed);
  }
  const { group, decimal } = numbersFor(locale);
  const hasPercent = trimmed.includes('%');
  let normalized = trimmed
    .replace(/[\s\u00a0\u202f]/g, '')
    .split(group)
    .join('')
    .split(decimal)
    .join('.')
    // Currency symbols, codes and the percent sign around the number.
    .replace(/^[^\d+\-.]+|[^\d.]+$/g, '');
  // An accounting negative, "(12.50)".
  if (/^\(.*\)$/.test(trimmed)) {
    normalized = `-${normalized.replace(/[()]/g, '')}`;
  }
  if (!PLAIN_NUMBER.test(normalized)) {
    return null;
  }
  const number = Number(normalized);
  return hasPercent && isPercent ? number / 100 : number;
}

function isoOf(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const dateOrders = new Map<string, ('day' | 'month' | 'year')[]>();

/** The order day, month and year are written in for `locale` ("month day year" in en-US). */
function dateOrderFor(locale: string): ('day' | 'month' | 'year')[] {
  let order = dateOrders.get(locale);
  if (!order) {
    order = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'numeric', day: 'numeric' })
      .formatToParts(new Date(Date.UTC(2001, 10, 22)))
      .flatMap((part) =>
        part.type === 'day' || part.type === 'month' || part.type === 'year' ? [part.type] : [],
      );
    dateOrders.set(locale, order);
  }
  return order;
}

/**
 * Reads a date typed or pasted in `locale` as ISO text (`2026-10-17`): ISO dates, numeric dates in the locale's
 * order (`10/17/2026` in en-US, `17.10.2026` in de-DE) and text the browser understands ("Oct 17, 2026"). `null`
 * when it isn't one.
 */
export function parseDate(text: string, locale: string): string | null {
  const trimmed = text.trim();
  const iso = ISO_DATE.exec(trimmed);
  if (iso) {
    return isoOf(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }
  const numeric = /^(\d{1,4})[./-](\d{1,2})[./-](\d{1,4})$/.exec(trimmed);
  if (numeric) {
    const order = dateOrderFor(locale);
    const parts: Record<string, number> = {};
    order.forEach((part, index) => {
      parts[part] = Number(numeric[index + 1]);
    });
    let year = parts.year ?? NaN;
    if (year < 100) {
      year += 2000;
    }
    return isoOf(year, parts.month ?? NaN, parts.day ?? NaN);
  }
  if (!/[a-z]/i.test(trimmed)) {
    return null;
  }
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) {
    return null;
  }
  const date = new Date(parsed);
  return isoOf(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** Whether text reads as checked, unchecked, or neither (`null`), including the locale's own yes and no. */
export function parseBoolean(text: string, yes: string, no: string): boolean | null {
  const word = text.trim().toLowerCase();
  if (TRUE_WORDS.has(word) || word === yes.toLowerCase()) {
    return true;
  }
  if (word === '' || FALSE_WORDS.has(word) || word === no.toLowerCase()) {
    return false;
  }
  return null;
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  const match = ISO_DATE.exec(value);
  return match !== null && isoOf(Number(match[1]), Number(match[2]), Number(match[3])) === value;
}

/** Builds a column's formatters for `locale`. */
export function columnFormat(
  column: SpreadsheetColumn,
  locale: string,
  messages: SpreadsheetStrings,
  collator: Intl.Collator,
): ColumnFormat {
  const type = typeOf(column);
  const numbers = numbersFor(locale);
  const valueFormat = numberFormat(locale, column.formatOptions);
  const plainFormat = numberFormat(locale);
  const dateFormat = dateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' });
  const options = column.options ?? [];
  const optionLabels = new Map(options.map((option) => [option.id, option.label]));
  const optionOrder = new Map(options.map((option, index) => [option.id, index]));
  const isPercent = column.formatOptions?.style === 'percent';

  const raw = (value: SpreadsheetValue | undefined) =>
    value === null || value === undefined ? '' : String(value);

  const display = (value: SpreadsheetValue | undefined): string => {
    if (value === null || value === undefined) {
      return '';
    }
    switch (type) {
      case 'number':
        return typeof value === 'number' && Number.isFinite(value)
          ? valueFormat.format(value)
          : String(value);
      case 'date':
        return isIsoDate(value) ? dateFormat.format(utcDay(value)) : String(value);
      case 'enum':
        return typeof value === 'string' ? (optionLabels.get(value) ?? value) : String(value);
      case 'boolean':
        return value === true ? messages.yes : value === false ? messages.no : String(value);
      case 'text':
        return String(value);
    }
  };

  const edit = (value: SpreadsheetValue | undefined): string => {
    if (type === 'number' && typeof value === 'number') {
      return numbers.editFormat.format(value);
    }
    if (type === 'enum' && typeof value === 'string') {
      return optionLabels.get(value) ?? value;
    }
    return raw(value);
  };

  const copy = (value: SpreadsheetValue | undefined): string => {
    if (type === 'boolean') {
      return value === true ? 'TRUE' : value === false ? 'FALSE' : raw(value);
    }
    return edit(value);
  };

  const search = (value: SpreadsheetValue | undefined): string => {
    if (type === 'enum' && typeof value === 'string') {
      return `${value} ${optionLabels.get(value) ?? ''}`.toLowerCase();
    }
    return raw(value).toLowerCase();
  };

  /** Checks a value of the right type against the column's limits and its own `validate`. */
  const limits = (value: SpreadsheetValue, row: SpreadsheetRow): string | undefined => {
    if (
      type === 'text' &&
      column.maxLength !== undefined &&
      String(value).length > column.maxLength
    ) {
      return messages.spreadsheetTooLong({ max: column.maxLength });
    }
    if (type === 'number' && typeof value === 'number') {
      if (column.minValue !== undefined && value < column.minValue) {
        return messages.spreadsheetTooLow({ min: plainFormat.format(column.minValue) });
      }
      if (column.maxValue !== undefined && value > column.maxValue) {
        return messages.spreadsheetTooHigh({ max: plainFormat.format(column.maxValue) });
      }
      if (column.step !== undefined && column.step > 0) {
        const steps = (value - (column.minValue ?? 0)) / column.step;
        if (Math.abs(steps - Math.round(steps)) > STEP_EPSILON) {
          return column.step === 1
            ? messages.spreadsheetWholeNumber
            : messages.spreadsheetStepMismatch({ step: plainFormat.format(column.step) });
        }
      }
    }
    return column.validate?.(value, row);
  };

  const invalidOption = () => {
    const labels = options.slice(0, 6).map((option) => option.label);
    return messages.spreadsheetInvalidOption({
      options: options.length > 6 ? `${labels.join(', ')}, …` : labels.join(', '),
    });
  };

  const parse = (text: string): ParseResult => {
    if (type === 'boolean') {
      const checked = parseBoolean(text, messages.yes, messages.no);
      return checked === null ? { error: messages.spreadsheetInvalidBoolean } : { value: checked };
    }
    if (text.trim() === '') {
      return { value: null };
    }
    switch (type) {
      case 'number': {
        const number = parseNumber(text, locale, isPercent);
        return number === null ? { error: messages.spreadsheetInvalidNumber } : { value: number };
      }
      case 'date': {
        const date = parseDate(text, locale);
        return date === null ? { error: messages.spreadsheetInvalidDate } : { value: date };
      }
      case 'enum': {
        const wanted = text.trim();
        const lower = wanted.toLowerCase();
        const option =
          options.find((candidate) => candidate.id === wanted) ??
          options.find((candidate) => candidate.label.toLowerCase() === lower) ??
          options.find((candidate) => candidate.id.toLowerCase() === lower);
        return option ? { value: option.id } : { error: invalidOption() };
      }
      case 'text':
        return { value: text };
    }
  };

  const check = (value: SpreadsheetValue | undefined, row: SpreadsheetRow): string | undefined => {
    if (
      isEmptyValue(value) ||
      (type === 'boolean' && value === false && column.isRequired !== true)
    ) {
      return column.isRequired === true && type !== 'boolean'
        ? messages.spreadsheetRequired
        : undefined;
    }
    const present = value ?? null;
    switch (type) {
      case 'number':
        if (typeof present !== 'number' || !Number.isFinite(present)) {
          return messages.spreadsheetInvalidNumber;
        }
        break;
      case 'date':
        if (!isIsoDate(present)) {
          return messages.spreadsheetInvalidDate;
        }
        break;
      case 'boolean':
        if (typeof present !== 'boolean') {
          return messages.spreadsheetInvalidBoolean;
        }
        break;
      case 'enum':
        if (typeof present !== 'string' || !optionLabels.has(present)) {
          return invalidOption();
        }
        break;
      case 'text':
        break;
    }
    return limits(present, row);
  };

  const compare = (a: SpreadsheetValue, b: SpreadsheetValue): number => {
    if (type === 'number' && typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }
    if (type === 'boolean' && typeof a === 'boolean' && typeof b === 'boolean') {
      return Number(a) - Number(b);
    }
    if (type === 'enum' && typeof a === 'string' && typeof b === 'string') {
      const order = (optionOrder.get(a) ?? options.length) - (optionOrder.get(b) ?? options.length);
      if (order !== 0) {
        return order;
      }
    }
    // Values of the wrong type sort after the right ones, then as text.
    const rightType = (value: SpreadsheetValue) =>
      type === 'number'
        ? typeof value === 'number'
        : type === 'boolean'
          ? typeof value === 'boolean'
          : true;
    const typed = Number(rightType(b)) - Number(rightType(a));
    return typed !== 0 ? typed : collator.compare(String(a), String(b));
  };

  return {
    column,
    type,
    display,
    edit,
    copy,
    search,
    parse,
    check,
    compare,
    optionLabels,
  };
}

/** Parses text for a column and checks the value against its limits, as typing, pasting and filling do. */
export function parseForColumn(
  format: ColumnFormat,
  text: string,
  row: SpreadsheetRow,
): ParseResult {
  const parsed = format.parse(text);
  if (parsed.error !== undefined || parsed.value === null) {
    return parsed;
  }
  const error = format.check(parsed.value, row);
  // An empty required cell is shown as a problem but may be typed (the user may be clearing it to retype).
  return error === undefined ? parsed : { error };
}

/** The filter control for a column, as the shared table filters describe it. */
export function filterConfigFor(format: ColumnFormat): FilterConfig {
  const { column } = format;
  switch (format.type) {
    case 'number':
      return { id: column.id, label: column.label, type: 'numberRange' };
    case 'date':
      return { id: column.id, label: column.label, type: 'dateRange' };
    case 'boolean':
      return { id: column.id, label: column.label, type: 'boolean' };
    case 'enum':
      return {
        id: column.id,
        label: column.label,
        type: 'multiEnum',
        options: column.options ?? [],
      };
    case 'text':
      return { id: column.id, label: column.label, type: 'text' };
  }
}

/** Whether a filter value is set (an empty list or blank text isn't). */
export function isFilterActive(value: FilterValue | undefined): boolean {
  if (value === undefined) {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim() !== '';
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === 'object') {
    return Object.values(value).some((part) => part !== undefined && part !== '');
  }
  return true;
}

/** Whether a cell value passes its column's filter. */
export function matchesFilter(
  format: ColumnFormat,
  value: SpreadsheetValue | undefined,
  filter: FilterValue,
): boolean {
  switch (format.type) {
    case 'text':
      return typeof filter === 'string'
        ? format.search(value).includes(filter.trim().toLowerCase())
        : true;
    case 'boolean':
      return typeof filter === 'boolean' ? (value === true) === filter : true;
    case 'enum':
      return isList(filter) ? typeof value === 'string' && filter.includes(value) : true;
    case 'number': {
      if (typeof filter !== 'object' || isList(filter) || 'start' in filter) {
        return true;
      }
      if (typeof value !== 'number') {
        return false;
      }
      return (
        (filter.min === undefined || value >= filter.min) &&
        (filter.max === undefined || value <= filter.max)
      );
    }
    case 'date': {
      if (typeof filter !== 'object' || isList(filter) || !('start' in filter)) {
        return true;
      }
      return typeof value === 'string' && value >= filter.start && value <= filter.end;
    }
  }
}
