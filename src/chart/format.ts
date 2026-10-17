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

/** Formats a percentage given from 0 to 100 ("62%"), in the locale's style. */
export function formatPercent(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(
    value / 100,
  );
}

/** Formats a series' value: as a percentage for `format: 'percent'`, otherwise with the series' unit. */
export function formatSeriesValue(
  value: number,
  locale: string,
  series: { unit?: string; format?: 'number' | 'percent' } | undefined,
): string {
  return series?.format === 'percent'
    ? formatPercent(value, locale)
    : formatValue(value, locale, series?.unit);
}

/** Formats a change with its sign ("+1,200", "-300"; zero unsigned), with an optional unit. */
export function formatSigned(value: number, locale: string, unit?: string): string {
  const text = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
    signDisplay: 'exceptZero',
  }).format(value);
  return unit === undefined ? text : `${text} ${unit}`;
}
