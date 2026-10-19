// Cached Intl formatters. Building a formatter is far slower than using one, and components ask for the same few
// over and over (often on every render), so each locale and options pair is built once and shared.

import { useLocale } from 'react-aria-components';

// Keyed on the formatter type, locale and options. The key space is small in practice (a few locales, a handful of
// option sets); the cap only guards against unbounded growth from options built out of data, such as units.
const formatters = new Map<string, unknown>();

function cachedFormatter<T, O>(
  Formatter: new (locale: string, options?: O) => T,
  locale: string,
  options?: O,
): T {
  const key = `${Formatter.name}|${locale}|${options === undefined ? '' : JSON.stringify(options)}`;
  let formatter = formatters.get(key) as T | undefined;
  if (!formatter) {
    if (formatters.size >= 500) {
      formatters.clear();
    }
    formatter = new Formatter(locale, options);
    formatters.set(key, formatter);
  }
  return formatter;
}

/** A shared `Intl.NumberFormat` for the locale and options. */
export function numberFormat(
  locale: string,
  options?: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  return cachedFormatter(Intl.NumberFormat, locale, options);
}

/** A shared `Intl.DateTimeFormat` for the locale and options. */
export function dateTimeFormat(
  locale: string,
  options?: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  return cachedFormatter(Intl.DateTimeFormat, locale, options);
}

/** A shared `Intl.ListFormat` for the locale and options. */
export function listFormat(locale: string, options?: Intl.ListFormatOptions): Intl.ListFormat {
  return cachedFormatter(Intl.ListFormat, locale, options);
}

/** A shared `Intl.NumberFormat` for the UIProvider's locale. */
export function useNumberFormat(options?: Intl.NumberFormatOptions): Intl.NumberFormat {
  return numberFormat(useLocale().locale, options);
}

/** A shared `Intl.DateTimeFormat` for the UIProvider's locale. */
export function useDateTimeFormat(options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  return dateTimeFormat(useLocale().locale, options);
}

/** A shared `Intl.ListFormat` for the UIProvider's locale ("A, B and C" by default). */
export function useListFormat(
  options: Intl.ListFormatOptions = { type: 'conjunction', style: 'long' },
): Intl.ListFormat {
  return listFormat(useLocale().locale, options);
}

/**
 * A unit's name as Intl writes it after `amount` ("hours" for 3 with `long`, "h" with `narrow`), or the unit's
 * identifier when Intl gives no name. `unit` is a sanctioned Intl unit such as "hour" or "megabit-per-second".
 */
export function unitName(
  locale: string,
  unit: string,
  unitDisplay: 'narrow' | 'short' | 'long' = 'long',
  amount = 2,
): string {
  const name = numberFormat(locale, { style: 'unit', unit, unitDisplay })
    .formatToParts(amount)
    .filter((part) => part.type === 'unit')
    .map((part) => part.value)
    .join('')
    .trim();
  return name === '' ? unit : name;
}

/** The characters a locale uses for its decimal point and digit grouping. */
export interface LocaleSeparators {
  decimal: string;
  group: string;
}

/** The decimal and grouping characters for `locale`, from `Intl.NumberFormat`. */
export function localeSeparators(locale: string): LocaleSeparators {
  const parts = numberFormat(locale).formatToParts(12345.6);
  return {
    decimal: parts.find((part) => part.type === 'decimal')?.value ?? '.',
    group: parts.find((part) => part.type === 'group')?.value ?? ',',
  };
}
