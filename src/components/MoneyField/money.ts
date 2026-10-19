// Money formatting and parsing on decimal strings, through Intl. Amounts never pass through a float: Intl formats the
// decimal string itself, and typed text is normalised as text.

import { normalizeNumberText } from '../UnitField/number';
import { decimalPrecision, roundHalfEven } from './decimal';

/**
 * The standard number of fraction digits for an ISO 4217 currency, from `Intl.NumberFormat`: 2 for USD and EUR, 0
 * for JPY and KRW, 3 for BHD and KWD.
 */
export function currencyMinorUnits(currency: string): number {
  return (
    new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
      .maximumFractionDigits ?? 2
  );
}

/**
 * Formats a decimal string exactly. Intl accepts decimal strings (ES2023) and formats them without converting to a
 * float, so amounts beyond 2^53 keep every digit. TypeScript's ES2022 library only types number and bigint.
 */
function formatExact(formatter: Intl.NumberFormat, value: string): Intl.NumberFormatPart[] {
  return formatter.formatToParts(value as unknown as number);
}

export interface FormatMoneyOptions {
  /** A BCP 47 locale. Defaults to the browser's. */
  locale?: string;
  /** Fraction digits. Defaults to the currency's standard (`currencyMinorUnits`). */
  minorUnits?: number;
  /** `parentheses` writes negatives the accounting way, "($1,234.50)", where the locale has that style. */
  negativeStyle?: 'minus' | 'parentheses';
  /** `symbol` ("$", the default), `narrowSymbol`, `code` ("USD") or `name` ("1,234.50 US dollars"). */
  currencyDisplay?: 'symbol' | 'narrowSymbol' | 'code' | 'name';
  /** Leaves the currency out, keeping the locale's grouping and decimal point ("1,234.50"). */
  isCurrencyHidden?: boolean;
}

function moneyFormatter(currency: string, options: FormatMoneyOptions): Intl.NumberFormat {
  const digits = options.minorUnits ?? currencyMinorUnits(currency);
  return new Intl.NumberFormat(options.locale, {
    style: 'currency',
    currency,
    currencyDisplay: options.currencyDisplay ?? 'symbol',
    currencySign: options.negativeStyle === 'parentheses' ? 'accounting' : 'standard',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/**
 * Formats a decimal-string amount as money for the locale, rounding half-even to the currency's minor units:
 * `formatMoney('1234.5', 'USD')` is "$1,234.50"; with `{ negativeStyle: 'parentheses' }`, `'-5'` is "($5.00)".
 */
export function formatMoney(
  value: string,
  currency: string,
  options: FormatMoneyOptions = {},
): string {
  const digits = options.minorUnits ?? currencyMinorUnits(currency);
  const parts = formatExact(moneyFormatter(currency, options), roundHalfEven(value, digits));
  if (!options.isCurrencyHidden) {
    return parts.map((part) => part.value).join('');
  }
  // Drop the currency and the spacing that separated it from the number.
  const kept = parts.filter((part) => part.type !== 'currency');
  return kept
    .filter(
      (part, index) =>
        !(
          part.type === 'literal' &&
          part.value.trim() === '' &&
          (index === 0 || index === kept.length - 1)
        ),
    )
    .map((part) => part.value)
    .join('')
    .trim();
}

/** Where the locale puts the currency symbol relative to the number. */
export function currencySymbolPosition(
  currency: string,
  locale: string | undefined,
): { symbol: string; position: 'start' | 'end' } {
  const parts = new Intl.NumberFormat(locale, { style: 'currency', currency }).formatToParts(1);
  const currencyIndex = parts.findIndex((part) => part.type === 'currency');
  const integerIndex = parts.findIndex((part) => part.type === 'integer');
  return {
    symbol: parts[currencyIndex]?.value ?? currency,
    position: currencyIndex > integerIndex ? 'end' : 'start',
  };
}

/** Why typed text isn't an acceptable amount. */
export type MoneyParseError = 'invalid' | 'tooManyDecimals' | 'negative';

export type MoneyParseResult =
  { value: string | null; error?: undefined } | { value?: undefined; error: MoneyParseError };

// Everything that may surround an amount in pasted text: currency symbols and codes, letters, spaces.
const NOISE = /[^\d.,\-\u2212+()]/g;

/**
 * Reads typed or pasted text as an amount with exactly `minorUnits` fraction digits: "$1,234.5" becomes "1234.50",
 * "(12.00)" and "−12" become "-12.00", "" becomes null. Currency symbols, codes and spaces are ignored; grouping
 * and the decimal point follow the locale, with the other convention accepted when unambiguous. Fails with
 * `tooManyDecimals` when there are non-zero digits past `minorUnits` (so JPY rejects "12.5"), with `negative` when
 * `allowsNegative` is false, and with `invalid` otherwise.
 */
export function parseMoneyInput(
  text: string,
  {
    locale,
    minorUnits,
    allowsNegative = true,
  }: { locale: string; minorUnits: number; allowsNegative?: boolean },
): MoneyParseResult {
  let cleaned = text.replace(NOISE, '');
  if (cleaned === '') {
    return text.trim() === '' ? { value: null } : { error: 'invalid' };
  }
  let isNegative = false;
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    isNegative = true;
    cleaned = cleaned.slice(1, -1);
  }
  if (/[-\u2212]$/.test(cleaned)) {
    // Some locales and spreadsheets write the minus after the number.
    isNegative = !isNegative;
    cleaned = cleaned.slice(0, -1);
  }
  if (/[()]/.test(cleaned)) {
    return { error: 'invalid' };
  }
  const normalized = normalizeNumberText(cleaned, locale);
  if (normalized === null) {
    return { error: 'invalid' };
  }
  let amount = normalized;
  if (isNegative) {
    amount = amount.startsWith('-') ? amount.slice(1) : `-${amount}`;
  }
  if (decimalPrecision(amount) > minorUnits) {
    return { error: 'tooManyDecimals' };
  }
  const value = roundHalfEven(amount, minorUnits);
  if (!allowsNegative && value.startsWith('-')) {
    return { error: 'negative' };
  }
  return { value };
}

/** Writes an amount for editing: the locale's decimal point, no grouping or currency ("1234,50" in German). */
export function formatMoneyForEditing(value: string, locale: string, minorUnits: number): string {
  const formatter = new Intl.NumberFormat(locale, {
    useGrouping: false,
    minimumFractionDigits: minorUnits,
    maximumFractionDigits: minorUnits,
  });
  return formatExact(formatter, roundHalfEven(value, minorUnits))
    .map((part) => (part.type === 'minusSign' ? '-' : part.value))
    .join('');
}
