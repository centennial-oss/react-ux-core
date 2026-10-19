// Number and time formatting for chart axes, tooltips, summaries and tables, with the shared cached formatters.

import { dateTimeFormat, numberFormat } from '../utils/intl';

export { extent } from '../utils/math';

/** Formats a value with an optional unit ("1,234 kWh"). */
export function formatValue(value: number, locale: string, unit?: string): string {
  const text = numberFormat(locale, { maximumFractionDigits: 2 }).format(value);
  return unit === undefined ? text : `${text} ${unit}`;
}

/** Formats an instant in a time zone, as a date and time. */
export function formatTime(time: number, locale: string, timeZone: string): string {
  return dateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(time);
}

/** Formats a percentage given from 0 to 100 ("62%"), in the locale's style. */
export function formatPercent(value: number, locale: string): string {
  return numberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(value / 100);
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
  const text = numberFormat(locale, {
    maximumFractionDigits: 2,
    signDisplay: 'exceptZero',
  }).format(value);
  return unit === undefined ? text : `${text} ${unit}`;
}
