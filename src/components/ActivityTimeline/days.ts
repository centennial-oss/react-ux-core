// Day grouping for ActivityTimeline: calendar days in a time zone, so "today" is the viewer's (or the app's) today.

import { dateTimeFormat } from '../../utils/intl';
import { isValidDate } from '../../utils/time';

/** A function that gives an instant's calendar day as `YYYY-MM-DD` in `timeZone` (one formatter for many dates). */
export function dayKeyer(timeZone: string): (date: Date) => string {
  const format = dateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return (date) => {
    const parts = format.formatToParts(date);
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((item) => item.type === type)?.value ?? '';
    return `${part('year')}-${part('month')}-${part('day')}`;
  };
}

/** An instant's calendar day as `YYYY-MM-DD` in `timeZone`. */
export function dayKey(date: Date, timeZone: string): string {
  return dayKeyer(timeZone)(date);
}

/** The day before a `YYYY-MM-DD` day (calendar arithmetic, so daylight-saving changes don't matter). */
export function previousDayKey(key: string): string {
  const [year = 0, month = 1, day = 1] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
}

/** Consecutive items that fall on the same day, in the order given. */
export interface DayGroup<T> {
  key: string;
  /** The first item's instant, for formatting the day. */
  date: Date;
  items: T[];
}

/** Splits items (already in order, usually newest first) into runs that share a calendar day in `timeZone`. */
export function groupByDay<T>(
  items: readonly T[],
  dateOf: (item: T) => Date,
  timeZone: string,
): DayGroup<T>[] {
  const keyOf = dayKeyer(timeZone);
  const groups: DayGroup<T>[] = [];
  for (const item of items) {
    const date = dateOf(item);
    const key = isValidDate(date) ? keyOf(date) : '';
    const last = groups.at(-1);
    if (last?.key === key) {
      last.items.push(item);
    } else {
      groups.push({ key, date, items: [item] });
    }
  }
  return groups;
}
