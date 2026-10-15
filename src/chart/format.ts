// Number and time formatting for chart axes, tooltips, summaries and tables.

/**
 * The smallest and largest of the values, or `undefined` when there are none. A loop rather than
 * `Math.min(...values)`, which overflows the argument list on long series.
 */
export function extent(values: Iterable<number>): [number, number] | undefined {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  return min <= max ? [min, max] : undefined;
}

/** Formats a value with an optional unit ("1,234 kWh"). */
export function formatValue(value: number, locale: string, unit?: string): string {
  const text = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
  return unit === undefined ? text : `${text} ${unit}`;
}

/** Milliseconds since the epoch from a Date, a number or an ISO string. */
export function toTime(value: Date | number | string): number {
  return value instanceof Date
    ? value.getTime()
    : typeof value === 'number'
      ? value
      : Date.parse(value);
}

/** Formats an instant in a time zone, as a date and time. */
export function formatTime(time: number, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(time);
}
