// Wall-clock arithmetic in an IANA time zone with plain Date and Intl (the main entry doesn't use the
// @internationalized/date peer here): calendar parts of an instant, the instant of a wall-clock time, day and week
// starts, and snapping to a minute grid. Instants are epoch milliseconds.

export const MINUTE_MS = 60_000;
export const DAY_MS = 86_400_000;

/** An instant's wall-clock parts in a time zone. `month` is 1–12; `weekday` is 0 (Sunday) to 6. */
export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
}

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const formatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      weekday: 'short',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

function rawParts(ms: number, timeZone: string) {
  const values: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};
  for (const part of partsFormatter(timeZone).formatToParts(ms)) {
    values[part.type] = part.value;
  }
  return values;
}

/** The wall-clock parts of instant `ms` in `timeZone`. */
export function zonedParts(ms: number, timeZone: string): ZonedParts {
  const values = rawParts(ms, timeZone);
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    weekday: WEEKDAYS[values.weekday ?? 'Sun'] ?? 0,
  };
}

/** The zone's offset from UTC at instant `ms`, in milliseconds (positive east of Greenwich). */
export function zoneOffset(ms: number, timeZone: string): number {
  const values = rawParts(ms, timeZone);
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  return asUtc - (ms - (((ms % 1000) + 1000) % 1000));
}

/**
 * The instant of a wall-clock time in `timeZone`. Out-of-range fields roll over (day 32 is the 1st of next month).
 * A time skipped by a daylight-saving change resolves to the instant just after the gap.
 */
export function fromZoned(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): number {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const first = guess - zoneOffset(guess, timeZone);
  const second = guess - zoneOffset(first, timeZone);
  return first === second ? first : Math.max(first, second);
}

/** Midnight at the start of `ms`'s day in `timeZone`. */
export function startOfDay(ms: number, timeZone: string): number {
  const { year, month, day } = zonedParts(ms, timeZone);
  return fromZoned(timeZone, year, month, day);
}

/** The same wall-clock time `days` days later (calendar days, so daylight-saving changes don't shift it). */
export function addDays(ms: number, days: number, timeZone: string): number {
  const { year, month, day, hour, minute } = zonedParts(ms, timeZone);
  return fromZoned(timeZone, year, month, day + days, hour, minute);
}

/** Midnight at the start of `ms`'s week in `timeZone`, with weeks starting on `firstDay` (0 = Sunday). */
export function startOfWeek(ms: number, timeZone: string, firstDay: number): number {
  const { year, month, day, weekday } = zonedParts(ms, timeZone);
  const back = (weekday - firstDay + 7) % 7;
  return fromZoned(timeZone, year, month, day - back);
}

/** Rounds `ms` to a multiple of `stepMinutes` of wall-clock time in `timeZone` (`floor`, `ceil` or nearest). */
export function snapTime(
  ms: number,
  stepMinutes: number,
  timeZone: string,
  mode: 'round' | 'floor' | 'ceil' = 'round',
): number {
  const step = Math.max(1, stepMinutes) * MINUTE_MS;
  const offset = zoneOffset(ms, timeZone);
  const local = ms + offset;
  const snapped = Math[mode](local / step) * step;
  return snapped - offset;
}

/** The number of whole calendar days from `start` to `end` in `timeZone`, or null if they aren't whole days. */
export function wholeDays(start: number, end: number, timeZone: string): number | null {
  const days = Math.round((end - start) / DAY_MS);
  return days >= 1 && addDays(start, days, timeZone) === end ? days : null;
}

/** The locale's first day of the week (0 = Sunday), or Monday when the browser doesn't say. */
export function localeFirstDay(locale: string): number {
  try {
    const info = new Intl.Locale(locale) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    const firstDay = info.getWeekInfo?.().firstDay ?? info.weekInfo?.firstDay;
    return firstDay === undefined ? 1 : firstDay % 7;
  } catch {
    return 1;
  }
}
