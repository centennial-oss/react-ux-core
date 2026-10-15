// Conversions between the values a field holds (per its config) and the values its input component works with.

import {
  CalendarDate,
  Time,
  ZonedDateTime,
  parseAbsolute,
  parseDate,
  parseTime,
} from '@internationalized/date';
import type { DateRange } from '../../components/DatePicker/DateRangePicker';
import type { DateValueFormat, IsoDateRange } from '../types';

function attempt<T>(parse: () => T): T | null {
  try {
    return parse();
  } catch {
    return null;
  }
}

/** A `CalendarDate` from a held value (a `CalendarDate` or an ISO date string). */
export function toCalendarDate(value: unknown): CalendarDate | null {
  if (value instanceof CalendarDate) {
    return value;
  }
  return typeof value === 'string' && value !== '' ? attempt(() => parseDate(value)) : null;
}

export function fromCalendarDate(date: CalendarDate | null, format: DateValueFormat | undefined) {
  if (!date) {
    return null;
  }
  return format === 'iso' ? date.toString() : date;
}

/** A date range of `CalendarDate`s from a held value (`CalendarDate`s or ISO strings). */
export function toDateRange(value: unknown): DateRange | null {
  if (typeof value !== 'object' || value === null || !('start' in value) || !('end' in value)) {
    return null;
  }
  const start = toCalendarDate(value.start);
  const end = toCalendarDate(value.end);
  return start && end ? { start, end } : null;
}

export function fromDateRange(
  range: DateRange | null,
  format: DateValueFormat | undefined,
): DateRange | IsoDateRange | null {
  if (!range) {
    return null;
  }
  return format === 'iso' ? { start: range.start.toString(), end: range.end.toString() } : range;
}

/** A `Time` from a held value (a `Time` or an ISO time string such as `"17:30:00"`). */
export function toTime(value: unknown): Time | null {
  if (value instanceof Time) {
    return value;
  }
  return typeof value === 'string' && value !== '' ? attempt(() => parseTime(value)) : null;
}

export function fromTime(time: Time | null, format: DateValueFormat | undefined) {
  if (!time) {
    return null;
  }
  return format === 'iso' ? time.toString() : time;
}

/** A `ZonedDateTime` in `timeZone` from a held value (a `ZonedDateTime` or an ISO instant). */
export function toZonedDateTime(value: unknown, timeZone: string): ZonedDateTime | null {
  if (value instanceof ZonedDateTime) {
    return value;
  }
  return typeof value === 'string' && value !== ''
    ? attempt(() => parseAbsolute(value, timeZone))
    : null;
}

export function fromZonedDateTime(date: ZonedDateTime | null, format: DateValueFormat | undefined) {
  if (!date) {
    return null;
  }
  return format === 'iso' ? date.toAbsoluteString() : date;
}

/** The standard number of minor-unit digits for a currency (2 for USD, 0 for JPY). */
export function currencyDigits(currency: string): number {
  return (
    attempt(
      () =>
        new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
          .maximumFractionDigits,
    ) ?? 2
  );
}

/** The amount in major units from a held money value (a decimal string, or integer minor units). */
export function moneyToNumber(
  value: unknown,
  moneyAs: 'decimal' | 'minor' | undefined,
  digits: number,
): number | null {
  if (moneyAs === 'minor') {
    return typeof value === 'number' && Number.isFinite(value) ? value / 10 ** digits : null;
  }
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

/** A held money value from an amount in major units: a fixed-point decimal string, or rounded minor units. */
export function moneyFromNumber(
  amount: number | null,
  moneyAs: 'decimal' | 'minor' | undefined,
  digits: number,
): string | number | null {
  if (amount === null || Number.isNaN(amount)) {
    return null;
  }
  return moneyAs === 'minor' ? Math.round(amount * 10 ** digits) : amount.toFixed(digits);
}

/** Rounds away floating-point noise, such as 0.07 × 100 = 7.000000000000001. */
function clean(value: number): number {
  return Number(value.toPrecision(12));
}

/** The fraction (0.25 for 25 %) from a held percentage. */
export function percentToFraction(value: unknown, percentAs: 'fraction' | 'whole' | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return percentAs === 'whole' ? clean(value / 100) : value;
}

/** A held percentage from a fraction. */
export function percentFromFraction(
  fraction: number | null,
  percentAs: 'fraction' | 'whole' | undefined,
) {
  if (fraction === null || Number.isNaN(fraction)) {
    return null;
  }
  return percentAs === 'whole' ? clean(fraction * 100) : fraction;
}
