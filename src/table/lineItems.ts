// Invoice arithmetic for LineItemsEditor: line amounts, discounts, taxes by rate and the total, all on decimal strings
// (never floats) with round-half-to-even per line. Built on the main entry's decimal helpers.

import {
  decimalMultiply,
  decimalPercentOf,
  isDecimal,
  roundHalfEven,
} from '../components/MoneyField/decimal';

/** A discount on a line or on the whole order: a percentage of the amount, or a fixed amount in major units. */
export interface LineItemDiscount {
  type: 'percent' | 'amount';
  /** A decimal string: "10" (per cent) or "25.00" (an amount). */
  value: string;
}

/** One line of an invoice, quote or order. Amounts and quantities are decimal strings, never floats. */
export interface LineItem {
  id: string;
  description: string;
  /** A decimal string ("2", "1.5"). */
  quantity: string;
  /** The price of one unit in major units ("19.99"). With an inclusive tax rate, it includes the tax. */
  unitPrice: string;
  /** One of the editor's `taxRates`; no rate means the line isn't taxed. */
  taxRateId?: string;
  /** The line's own discount, applied before the order discount. An `amount` is for the whole line. */
  discount?: LineItemDiscount;
}

/** A tax rate lines can use. */
export interface TaxRate {
  id: string;
  /** "VAT", "Sales tax". */
  label: string;
  /** A decimal string: "20" for 20%. */
  percent: string;
  /** Prices on lines with this rate already include the tax (as in most VAT countries). */
  isInclusive?: boolean;
}

/** Order-level adjustments. */
export interface LineItemsAdjustments {
  /** A discount on the order, spread across the lines before tax. */
  discount?: LineItemDiscount;
  /** Shipping in major units, added after tax (untaxed). */
  shipping?: string;
}

/** One line's figures, in major units with the currency's minor units. */
export interface LineTotals {
  id: string;
  /** Quantity × unit price, rounded. */
  gross: string;
  /** The line's own discount. */
  discount: string;
  /** Gross less the line's own discount: what the line's amount column shows. */
  amount: string;
  /** The line's share of the order discount. */
  orderDiscount: string;
  /** Amount less the order discount share: what tax is charged on. */
  taxable: string;
  /** The line's tax (included in `taxable` for inclusive rates). */
  tax: string;
}

/** The tax collected at one rate. */
export interface TaxTotal {
  rateId: string;
  label: string;
  percent: string;
  isInclusive: boolean;
  /** The amount taxed at this rate (tax included, for inclusive rates). */
  taxable: string;
  amount: string;
}

/** The figures `computeTotals` returns, as decimal strings with the currency's minor units. */
export interface LineItemsTotals {
  lines: readonly LineTotals[];
  /** The sum of the line amounts (after line discounts, before the order discount). */
  subtotal: string;
  /** The order discount. */
  discount: string;
  /** Tax by rate, in the order of `taxRates`, for the rates in use. */
  taxByRate: readonly TaxTotal[];
  /** All tax, inclusive and exclusive. */
  tax: string;
  /** The part of `tax` already inside the prices (inclusive rates). */
  inclusiveTax: string;
  shipping: string;
  /** Subtotal − discount + exclusive tax + shipping. */
  total: string;
}

export interface ComputeTotalsOptions {
  /** Digits after the decimal point. Defaults to 2; pass `currencyMinorUnits(currency)` for others (JPY 0). */
  minorUnits?: number;
}

/** A decimal string in minor units (an integer), after rounding half-even to `digits`. Bad input counts as 0. */
function toMinor(value: string | undefined, digits: number): bigint {
  if (value === undefined || !isDecimal(value)) {
    return 0n;
  }
  return BigInt(roundHalfEven(value, digits).replace('.', ''));
}

/** Minor units back to a decimal string with `digits` fraction digits. */
function fromMinor(units: bigint, digits: number): string {
  const negative = units < 0n;
  const text = (negative ? -units : units).toString().padStart(digits + 1, '0');
  const whole = text.slice(0, text.length - digits);
  const fraction = text.slice(text.length - digits);
  return `${negative && units !== 0n ? '-' : ''}${whole}${digits > 0 ? `.${fraction}` : ''}`;
}

/** `numerator / denominator` rounded half-even to an integer (denominator positive). */
function divideHalfEven(numerator: bigint, denominator: bigint): bigint {
  const negative = numerator < 0n;
  const magnitude = negative ? -numerator : numerator;
  let quotient = magnitude / denominator;
  const twiceRemainder = (magnitude % denominator) * 2n;
  if (twiceRemainder > denominator || (twiceRemainder === denominator && quotient % 2n === 1n)) {
    quotient += 1n;
  }
  return negative ? -quotient : quotient;
}

/** `percent`% of an amount in minor units, rounded half-even to minor units. */
function percentOfMinor(units: bigint, percent: string, digits: number): bigint {
  if (!isDecimal(percent)) {
    return 0n;
  }
  return toMinor(decimalPercentOf(fromMinor(units, digits), percent), digits);
}

/** The tax inside a tax-inclusive amount: amount × p / (100 + p), rounded half-even. */
function inclusiveTaxOf(units: bigint, percent: string): bigint {
  if (!isDecimal(percent)) {
    return 0n;
  }
  const scale = percent.trim().split('.')[1]?.length ?? 0;
  const rate = BigInt(percent.trim().replace('.', '').replace(/^\+/, '') || '0');
  const hundred = 100n * 10n ** BigInt(scale);
  const denominator = hundred + rate;
  return denominator <= 0n ? 0n : divideHalfEven(units * rate, denominator);
}

function discountOf(units: bigint, discount: LineItemDiscount | undefined, digits: number): bigint {
  if (!discount) {
    return 0n;
  }
  return discount.type === 'percent'
    ? percentOfMinor(units, discount.value, digits)
    : toMinor(discount.value, digits);
}

/**
 * Totals for an invoice, exact and rounded half-even **per line** to the currency's minor units:
 *
 * 1. Each line's gross is quantity × unit price, rounded; its own discount (a percentage of the gross, rounded, or
 *    a fixed amount) comes off to give the line amount. The subtotal is the sum of the line amounts.
 * 2. A percentage order discount is taken from each line amount and rounded per line; a fixed order discount is
 *    spread across the lines in proportion to their amounts (the last line takes the rounding remainder). The
 *    discount is the sum of the shares.
 * 3. Tax is charged per line on what's left, rounded per line: `amount × rate` for exclusive rates, and
 *    `amount × rate / (100 + rate)` for inclusive rates (whose prices already hold the tax).
 * 4. The total is subtotal − discount + exclusive tax + shipping. Shipping isn't taxed.
 *
 * Quantities and prices that aren't decimal strings (a half-typed value) count as zero. Amounts may go negative
 * (credit lines); nothing is clamped.
 */
export function computeTotals(
  items: readonly LineItem[],
  taxRates: readonly TaxRate[] = [],
  adjustments: LineItemsAdjustments = {},
  { minorUnits = 2 }: ComputeTotalsOptions = {},
): LineItemsTotals {
  const digits = minorUnits;
  const rates = new Map(taxRates.map((rate) => [rate.id, rate]));

  const base = items.map((item) => {
    const gross =
      isDecimal(item.quantity) && isDecimal(item.unitPrice)
        ? toMinor(decimalMultiply(item.quantity, item.unitPrice), digits)
        : 0n;
    const discount = discountOf(gross, item.discount, digits);
    return { item, gross, discount, amount: gross - discount };
  });
  const subtotal = base.reduce((sum, line) => sum + line.amount, 0n);

  // The order discount, per line.
  const orderDiscount = adjustments.discount;
  let shares: bigint[];
  if (!orderDiscount) {
    shares = base.map(() => 0n);
  } else if (orderDiscount.type === 'percent') {
    shares = base.map((line) => percentOfMinor(line.amount, orderDiscount.value, digits));
  } else {
    const total = toMinor(orderDiscount.value, digits);
    let lastIndex = -1;
    base.forEach((line, index) => {
      if (line.amount !== 0n) {
        lastIndex = index;
      }
    });
    let allocated = 0n;
    shares = base.map((line, index) => {
      if (subtotal === 0n || line.amount === 0n) {
        return 0n;
      }
      const share =
        index === lastIndex ? total - allocated : divideHalfEven(total * line.amount, subtotal);
      allocated += share;
      return share;
    });
  }

  const taxed = new Map<string, { taxable: bigint; amount: bigint }>();
  const lines: LineTotals[] = base.map((line, index) => {
    const share = shares[index] ?? 0n;
    const taxable = line.amount - share;
    const rate = line.item.taxRateId === undefined ? undefined : rates.get(line.item.taxRateId);
    let tax = 0n;
    if (rate) {
      tax = rate.isInclusive
        ? inclusiveTaxOf(taxable, rate.percent)
        : percentOfMinor(taxable, rate.percent, digits);
      const sum = taxed.get(rate.id) ?? { taxable: 0n, amount: 0n };
      taxed.set(rate.id, { taxable: sum.taxable + taxable, amount: sum.amount + tax });
    }
    return {
      id: line.item.id,
      gross: fromMinor(line.gross, digits),
      discount: fromMinor(line.discount, digits),
      amount: fromMinor(line.amount, digits),
      orderDiscount: fromMinor(share, digits),
      taxable: fromMinor(taxable, digits),
      tax: fromMinor(tax, digits),
    };
  });

  let tax = 0n;
  let inclusiveTax = 0n;
  const taxByRate: TaxTotal[] = taxRates.flatMap((rate) => {
    const sum = taxed.get(rate.id);
    if (!sum) {
      return [];
    }
    tax += sum.amount;
    if (rate.isInclusive) {
      inclusiveTax += sum.amount;
    }
    return [
      {
        rateId: rate.id,
        label: rate.label,
        percent: rate.percent,
        isInclusive: rate.isInclusive === true,
        taxable: fromMinor(sum.taxable, digits),
        amount: fromMinor(sum.amount, digits),
      },
    ];
  });

  const discount = shares.reduce((sum, share) => sum + share, 0n);
  const shipping = toMinor(adjustments.shipping, digits);
  return {
    lines,
    subtotal: fromMinor(subtotal, digits),
    discount: fromMinor(discount, digits),
    taxByRate,
    tax: fromMinor(tax, digits),
    inclusiveTax: fromMinor(inclusiveTax, digits),
    shipping: fromMinor(shipping, digits),
    total: fromMinor(subtotal - discount + (tax - inclusiveTax) + shipping, digits),
  };
}

/**
 * Reads a discount typed as text: "10%" (or "10 %") is a percentage, "25.00" an amount. Returns `null` for empty
 * text and `undefined` when the text isn't a discount. Decimals use a point.
 */
export function parseDiscount(text: string): LineItemDiscount | null | undefined {
  const trimmed = text.trim();
  if (trimmed === '') {
    return null;
  }
  if (trimmed.endsWith('%')) {
    const value = trimmed.slice(0, -1).trim();
    return isDecimal(value) ? { type: 'percent', value } : undefined;
  }
  return isDecimal(trimmed) ? { type: 'amount', value: trimmed } : undefined;
}

/** Writes a discount as the text `parseDiscount` reads ("10%", "25.00"). */
export function discountText(discount: LineItemDiscount | undefined): string {
  if (!discount) {
    return '';
  }
  return discount.type === 'percent' ? `${discount.value}%` : discount.value;
}
