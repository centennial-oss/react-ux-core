// Locale-aware reading and writing of plain numbers typed into fields: the locale's decimal and grouping characters,
// with tolerance for pasted text that uses the other convention ("1.5" in a German field).

import { localeSeparators, numberFormat } from '../../utils/intl';

// Spaces (including the no-break and narrow no-break spaces some locales group with) and apostrophes (Swiss
// grouping) never carry meaning inside a number.
const IGNORABLE = /[\s\u00a0\u202f'\u2019]/g;
// Minus signs: ASCII hyphen-minus and the Unicode minus Intl writes in some locales.
const MINUS = /^[-\u2212]/;

/**
 * Normalises typed or pasted digits into a plain decimal string ("1234.5", "-0.25"), or null when the text isn't a
 * number. Accepts the locale's grouping and decimal characters, and the other convention when it's unambiguous: with
 * both `.` and `,` present the last one is the decimal point; otherwise the locale's decimal point is one, and the
 * other character is grouping when every group after it has three digits ("1,234" in English, "1.234.567" anywhere),
 * or the decimal point when not ("1,5" in English).
 */
export function normalizeNumberText(text: string, locale: string): string | null {
  let value = text.replace(IGNORABLE, '');
  let sign = '';
  if (MINUS.test(value)) {
    sign = '-';
    value = value.slice(1);
  } else if (value.startsWith('+')) {
    value = value.slice(1);
  }
  if (value === '') {
    return null;
  }
  const { decimal, group } = localeSeparators(locale);
  const hasDot = value.includes('.');
  const hasComma = value.includes(',');
  let decimalChar: string | null = null;
  if (hasDot && hasComma) {
    decimalChar = value.lastIndexOf('.') > value.lastIndexOf(',') ? '.' : ',';
  } else if (hasDot || hasComma) {
    const char = hasDot ? '.' : ',';
    const [, ...groups] = value.split(char);
    // The locale's decimal point is always one; otherwise a run of three-digit groups is grouping ("1.234.567" in
    // English is a pasted European number, "1,5" a pasted decimal).
    const isGrouping =
      char !== decimal &&
      groups.every((digits) => digits.length === 3) &&
      (groups.length > 1 || char === group);
    decimalChar = isGrouping ? null : char;
  }
  const groupChar = decimalChar === '.' ? ',' : decimalChar === ',' ? '.' : null;
  if (groupChar !== null) {
    value = value.split(groupChar).join('');
  } else if (decimalChar === null) {
    value = value.replace(/[.,]/g, '');
  }
  if (decimalChar !== null && decimalChar !== '.') {
    value = value.replace(decimalChar, '.');
  }
  if (!/^(\d+\.?\d*|\.\d+)$/.test(value)) {
    return null;
  }
  return `${sign}${value}`;
}

/** Parses typed digits for `locale` (see `normalizeNumberText`) into a number, or null. */
export function parseLocaleNumber(text: string, locale: string): number | null {
  const normalized = normalizeNumberText(text, locale);
  return normalized === null ? null : Number(normalized);
}

/** Writes a number for editing: the locale's decimal point, no grouping, up to `maximumFractionDigits`. */
export function formatPlainNumber(
  value: number,
  locale: string,
  maximumFractionDigits = 6,
): string {
  return numberFormat(locale, { useGrouping: false, maximumFractionDigits }).format(value);
}
