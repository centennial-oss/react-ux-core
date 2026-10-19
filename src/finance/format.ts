// Locale formatting for decimal strings. Intl formats a decimal string exactly (ES2023), so prices and sizes never
// pass through a float. TypeScript's ES2022 library only types number and bigint, hence the cast.

import { decimalMultiply, isDecimal } from '../components/MoneyField/decimal';
import { formatMoney } from '../components/MoneyField/money';
import { numberFormat } from '../utils/intl';

/** How prices are shown: plain numbers (exchanges) or 0–1 prices as percentages (prediction markets). */
export type PriceFormat = 'price' | 'probability';

function formatExact(formatter: Intl.NumberFormat, value: string): string {
  return formatter.format(value as unknown as number);
}

/** A decimal string with the locale's grouping and decimal point, and exactly `digits` fraction digits. */
export function formatDecimal(value: string, locale: string, digits: number): string {
  if (!isDecimal(value)) {
    return value;
  }
  return formatExact(
    numberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }),
    value,
  );
}

/**
 * A price: a plain number with `digits` fraction digits, or for `probability`, the 0–1 price as a percentage with
 * two fewer digits ("0.62" is "62%", "0.625" is "62.5%").
 */
export function formatPrice(
  value: string,
  locale: string,
  { format = 'price', digits }: { format?: PriceFormat; digits: number },
): string {
  if (!isDecimal(value)) {
    return value;
  }
  if (format === 'probability') {
    const percentDigits = Math.max(0, digits - 2);
    return formatExact(
      numberFormat(locale, {
        style: 'percent',
        minimumFractionDigits: percentDigits,
        maximumFractionDigits: percentDigits,
      }),
      value,
    );
  }
  return formatDecimal(value, locale, digits);
}

/**
 * A percentage given in per cent ("61.28" is "61.28%"), keeping its digits (at most `maxDigits`). `hasSign` writes
 * "+61.28%" for gains.
 */
export function formatPercentValue(
  percent: string,
  locale: string,
  { hasSign = false, maxDigits = 2 }: { hasSign?: boolean; maxDigits?: number } = {},
): string {
  if (!isDecimal(percent)) {
    return percent;
  }
  const fraction = percent.split('.')[1]?.length ?? 0;
  const digits = Math.min(fraction, maxDigits);
  return formatExact(
    numberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
      signDisplay: hasSign ? 'exceptZero' : 'auto',
    }),
    decimalMultiply(percent, '0.01'),
  );
}

/** Money, or the text as given when it isn't a decimal string. */
export function money(
  value: string,
  currency: string,
  locale: string,
  minorUnits?: number,
): string {
  if (!isDecimal(value)) {
    return value;
  }
  return formatMoney(value, currency, { locale, minorUnits });
}
