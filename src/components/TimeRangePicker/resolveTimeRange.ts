// Time range values, the relative-time grammar, and resolving ranges to concrete instants. No React here: apps can
// use these on their own, for example to resolve a range read from the URL before fetching data.

import {
  fromAbsolute,
  parseAbsolute,
  parseDate,
  parseDateTime,
  startOfMonth,
  startOfWeek,
  startOfYear,
  toCalendarDate,
  toZoned,
  type ZonedDateTime,
} from '@internationalized/date';

/**
 * A unit in a relative time expression: `s` seconds, `m` minutes, `h` hours, `d` days, `w` weeks, `M` months,
 * `y` years.
 */
export type TimeUnit = 's' | 'm' | 'h' | 'd' | 'w' | 'M' | 'y';

/**
 * A range relative to the current time, as two expressions, for example `{ kind: 'relative', from: '-24h', to:
 * 'now' }` ("the last 24 hours") or `{ kind: 'relative', from: 'now/M', to: 'now' }` ("this month").
 *
 * Expression grammar:
 *
 * ```
 * expression = "now" operation* | operation+
 * operation  = offset | snap
 * offset     = ("+" | "-") digits unit       (1–6 digits)
 * snap       = "/" unit
 * unit       = "s" | "m" | "h" | "d" | "w" | "M" | "y"
 * ```
 *
 * - An expression starts at the current time; a leading `now` is optional (`-24h` is `now-24h`).
 * - Operations apply left to right: `now-1d/d` is the start of yesterday, `now-1M/M` the start of last month.
 * - `s`, `m` and `h` offsets are exact elapsed time. `d`, `w`, `M` and `y` offsets are calendar steps in the time zone:
 *   a day across a daylight-saving change is 23 or 25 hours, and month steps keep the day where possible
 *   (31 March − 1M is 28 February).
 * - `/unit` snaps back to the start of that unit in the time zone: `/d` midnight, `/w` the start of the week
 *   (Monday unless `firstDayOfWeek` says otherwise), `/M` the 1st, `/y` 1 January; `/h`, `/m` and `/s` truncate.
 * - A range is half-open: it includes `from` and excludes `to`.
 *
 * Expressions are short plain strings, so a range can be stored in a URL as it is.
 */
export interface RelativeTimeRange {
  kind: 'relative';
  /** Where the range starts, for example `-24h` or `now/d`. */
  from: string;
  /** Where the range ends, usually `now`. */
  to: string;
}

/**
 * A fixed range between two ISO 8601 strings. With an offset or `Z` (`2026-10-01T06:00:00Z`) a string is that
 * instant; without one (`2026-10-01T00:00` or `2026-10-01`) it's a wall time (midnight for a date) in the time zone
 * the range is resolved in. The picker writes UTC instants (`…Z`).
 */
export interface AbsoluteTimeRange {
  kind: 'absolute';
  start: string;
  end: string;
}

/** A time range: a plain, serialisable object that apps can store, for example in the URL. */
export type TimeRange = RelativeTimeRange | AbsoluteTimeRange;

/** The concrete instants a range covers: from `start` (included) to `end` (excluded). */
export interface ResolvedTimeRange {
  start: Date;
  end: Date;
}

export type DayOfWeek = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

export interface ResolveTimeRangeOptions {
  /** The day a week starts on for `/w`. Defaults to `mon` (ISO 8601). */
  firstDayOfWeek?: DayOfWeek;
}

const UNITS = 'smhdwMy';
const EXPRESSION = /^(?:now)?(?:[+-]\d{1,6}[smhdwMy]|\/[smhdwMy])*$/;
const OPERATION = /([+-])(\d{1,6})([smhdwMy])|\/([smhdwMy])/g;

function isTimeUnit(value: string): value is TimeUnit {
  return value.length === 1 && UNITS.includes(value);
}

/** Whether `expression` follows the relative-time grammar (see `RelativeTimeRange`). */
export function isRelativeTimeExpression(expression: string): boolean {
  return expression !== '' && EXPRESSION.test(expression);
}

const MS: Partial<Record<TimeUnit, number>> = { s: 1000, m: 60_000, h: 3_600_000 };

/** Moves by `amount` units: exact elapsed time for s/m/h, calendar steps in the zone for d/w/M/y. */
function offset(date: ZonedDateTime, amount: number, unit: TimeUnit): ZonedDateTime {
  switch (unit) {
    case 'd':
      return date.add({ days: amount });
    case 'w':
      return date.add({ weeks: amount });
    case 'M':
      return date.add({ months: amount });
    case 'y':
      return date.add({ years: amount });
    default:
      return fromAbsolute(date.toDate().getTime() + amount * (MS[unit] ?? 0), date.timeZone);
  }
}

/** Snaps back to the start of `unit` in the date's own time zone. */
function snap(date: ZonedDateTime, unit: TimeUnit, firstDayOfWeek: DayOfWeek): ZonedDateTime {
  const ms = MS[unit];
  if (ms !== undefined) {
    // Truncate the wall-clock time using the offset in force at this instant, so the repeated hour when clocks go
    // back snaps within the right occurrence (setting the fields would pick the earlier one).
    const local = date.toDate().getTime() + date.offset;
    return fromAbsolute(local - (((local % ms) + ms) % ms) - date.offset, date.timeZone);
  }
  const day = toCalendarDate(date);
  const start =
    unit === 'd'
      ? day
      : unit === 'w'
        ? startOfWeek(day, 'en-US', firstDayOfWeek)
        : unit === 'M'
          ? startOfMonth(day)
          : startOfYear(day);
  return toZoned(start, date.timeZone);
}

/** Evaluates a relative expression against `now`. Throws a `RangeError` if it doesn't follow the grammar. */
function evaluate(expression: string, now: ZonedDateTime, firstDayOfWeek: DayOfWeek): Date {
  if (!isRelativeTimeExpression(expression)) {
    throw new RangeError(`Invalid relative time expression: "${expression}"`);
  }
  let date = now;
  for (const [, sign, digits, unit, snapUnit] of expression.matchAll(OPERATION)) {
    if (snapUnit !== undefined && isTimeUnit(snapUnit)) {
      date = snap(date, snapUnit, firstDayOfWeek);
    } else if (
      sign !== undefined &&
      digits !== undefined &&
      unit !== undefined &&
      isTimeUnit(unit)
    ) {
      date = offset(date, Number(digits) * (sign === '-' ? -1 : 1), unit);
    }
  }
  return date.toDate();
}

const HAS_OFFSET = /(?:Z|[+-]\d{2}(?::?\d{2})?)$/i;

/** Parses an absolute ISO 8601 string (see `AbsoluteTimeRange`). Throws a `RangeError` if it isn't one. */
function parseInstant(value: string, timeZone: string): Date {
  try {
    if (value.includes('T') && HAS_OFFSET.test(value)) {
      return parseAbsolute(value.toUpperCase(), timeZone).toDate();
    }
    return (
      value.includes('T')
        ? toZoned(parseDateTime(value), timeZone)
        : toZoned(parseDate(value), timeZone)
    ).toDate();
  } catch {
    throw new RangeError(`Invalid ISO 8601 date or date-time: "${value}"`);
  }
}

/** Whether `value` is a well-formed time range (shape and syntax), for example after reading it from a URL. */
export function isTimeRange(value: unknown): value is TimeRange {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const range = value as Record<string, unknown>;
  if (range.kind === 'relative') {
    return (
      typeof range.from === 'string' &&
      typeof range.to === 'string' &&
      isRelativeTimeExpression(range.from) &&
      isRelativeTimeExpression(range.to)
    );
  }
  if (range.kind === 'absolute') {
    if (typeof range.start !== 'string' || typeof range.end !== 'string') {
      return false;
    }
    try {
      parseInstant(range.start, 'UTC');
      parseInstant(range.end, 'UTC');
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * The concrete instants of a time range: relative expressions are evaluated against `now` in `timeZone` (so "this
 * month" starts at midnight on the 1st there, across daylight-saving changes), absolute strings are parsed (wall
 * times without an offset are read in `timeZone`).
 *
 * Throws a `RangeError` for a malformed range, an invalid `now` or an unknown time zone; check untrusted input with
 * `isTimeRange` first. The result isn't reordered: a range whose `from` comes after its `to` resolves as written.
 */
export function resolveTimeRange(
  value: TimeRange,
  now: Date | number,
  timeZone: string,
  options: ResolveTimeRangeOptions = {},
): ResolvedTimeRange {
  const nowMs = typeof now === 'number' ? now : now.getTime();
  if (!Number.isFinite(nowMs)) {
    throw new RangeError('Invalid "now" for resolveTimeRange');
  }
  if (!isTimeRange(value)) {
    throw new RangeError('Invalid time range');
  }
  // Throws a RangeError for an unknown zone.
  const zonedNow = fromAbsolute(nowMs, timeZone);
  if (value.kind === 'absolute') {
    return { start: parseInstant(value.start, timeZone), end: parseInstant(value.end, timeZone) };
  }
  const firstDayOfWeek = options.firstDayOfWeek ?? 'mon';
  return {
    start: evaluate(value.from, zonedNow, firstDayOfWeek),
    end: evaluate(value.to, zonedNow, firstDayOfWeek),
  };
}

/** A relative range of the simple "last N units" form (`-Nu` to `now`), or null. */
export function lastAmount(
  value: TimeRange | null | undefined,
): { amount: number; unit: TimeUnit } | null {
  if (value?.kind !== 'relative' || value.to !== 'now') {
    return null;
  }
  const match = /^(?:now)?-(\d{1,6})([smhdwMy])$/.exec(value.from);
  const unit = match?.[2];
  if (match === null || unit === undefined || !isTimeUnit(unit)) {
    return null;
  }
  return { amount: Number(match[1]), unit };
}

/** Whether two ranges are the same value. */
export function isSameTimeRange(
  a: TimeRange | null | undefined,
  b: TimeRange | null | undefined,
): boolean {
  if (!a || a.kind !== b?.kind) {
    return false;
  }
  return a.kind === 'relative'
    ? b.kind === 'relative' && a.from === b.from && a.to === b.to
    : b.kind === 'absolute' && a.start === b.start && a.end === b.end;
}
