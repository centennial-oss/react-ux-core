// Exact decimal arithmetic on strings, for money. A decimal string ("1234.50", "-0.3", ".5") is read into a scaled
// integer (a BigInt and a count of fraction digits), so sums and products never pick up binary floating-point drift:
// decimalAdd('0.1', '0.2') is exactly '0.3'.
//
// Results keep their scale instead of trimming zeros, the way money is written: adding "1.50" and "2" gives "3.50",
// multiplying "1.50" by "3" gives "4.50", and multiplying "19.99" by "0.5" gives "9.995". Round a result to the
// currency's minor units with `roundHalfEven`.

/** A decimal as a scaled integer: `units / 10 ** scale`. */
interface Scaled {
  units: bigint;
  scale: number;
}

const DECIMAL = /^([+-]?)(\d*)(?:\.(\d*))?$/;

function read(value: string): Scaled | null {
  const match = DECIMAL.exec(value.trim());
  if (!match) {
    return null;
  }
  const [, sign = '', whole = '', fraction = ''] = match;
  if (whole === '' && fraction === '') {
    return null;
  }
  const units = BigInt(`${whole || '0'}${fraction}`);
  return { units: sign === '-' ? -units : units, scale: fraction.length };
}

function parse(value: string, name: string): Scaled {
  const scaled = read(value);
  if (!scaled) {
    throw new RangeError(`${name} is not a decimal string: "${value}"`);
  }
  return scaled;
}

/** Writes a scaled integer back as a decimal string with exactly `scale` fraction digits. */
function write({ units, scale }: Scaled): string {
  const negative = units < 0n;
  const digits = (negative ? -units : units).toString().padStart(scale + 1, '0');
  const whole = digits.slice(0, digits.length - scale);
  const fraction = digits.slice(digits.length - scale);
  // Zero has no sign: "-0.00" is written "0.00".
  return `${negative ? '-' : ''}${whole}${scale > 0 ? `.${fraction}` : ''}`;
}

/** Re-expresses `value` with `scale` fraction digits (scale must not shrink). */
function rescale(value: Scaled, scale: number): bigint {
  return value.units * 10n ** BigInt(scale - value.scale);
}

function align(a: Scaled, b: Scaled): [bigint, bigint, number] {
  const scale = Math.max(a.scale, b.scale);
  return [rescale(a, scale), rescale(b, scale), scale];
}

/**
 * Whether `value` is a plain decimal string these helpers accept: an optional sign, digits, and an optional `.`
 * with fraction digits ("12", "-0.50", ".5", "3."). No grouping, exponents, currency symbols or spaces inside.
 */
export function isDecimal(value: string): boolean {
  return read(value) !== null;
}

/**
 * The sum of two decimal strings, exact, with the larger of their scales: `decimalAdd('0.1', '0.2')` is `'0.3'`,
 * `decimalAdd('1.50', '2')` is `'3.50'`. Throws a `RangeError` if either isn't a decimal string (see `isDecimal`).
 */
export function decimalAdd(a: string, b: string): string {
  const [x, y, scale] = align(parse(a, 'a'), parse(b, 'b'));
  return write({ units: x + y, scale });
}

/** `a - b`, exact, with the larger of their scales: `decimalSubtract('10.00', '0.01')` is `'9.99'`. */
export function decimalSubtract(a: string, b: string): string {
  const [x, y, scale] = align(parse(a, 'a'), parse(b, 'b'));
  return write({ units: x - y, scale });
}

/**
 * The sum of any number of decimal strings, exact, with the largest of their scales. An empty list sums to `'0'`.
 * Useful for invoice subtotals.
 */
export function decimalSum(values: readonly string[]): string {
  return values.reduce((total, value) => decimalAdd(total, value), '0');
}

/**
 * `a × b`, exact, for a price times a quantity (or a rate). The result's scale is the sum of both scales, so nothing
 * is rounded: `decimalMultiply('19.99', '3')` is `'59.97'`, `decimalMultiply('2.50', '1.5')` is `'3.750'`. Round it
 * to the currency's minor units with `roundHalfEven`.
 */
export function decimalMultiply(a: string, b: string): string {
  const x = parse(a, 'a');
  const y = parse(b, 'b');
  return write({ units: x.units * y.units, scale: x.scale + y.scale });
}

/**
 * `percent` per cent of `value`, exact: `decimalPercentOf('80.00', '12.5')` is `'10.00000'` (a scale two more than
 * the sum of both scales). Round it with `roundHalfEven`.
 */
export function decimalPercentOf(value: string, percent: string): string {
  const x = parse(value, 'value');
  const y = parse(percent, 'percent');
  return write({ units: x.units * y.units, scale: x.scale + y.scale + 2 });
}

/** `-value`, keeping its scale. */
export function decimalNegate(value: string): string {
  const x = parse(value, 'value');
  return write({ units: -x.units, scale: x.scale });
}

/**
 * Compares two decimal strings by value, ignoring scale: -1 when `a < b`, 0 when equal (`'1.50'` and `'1.5'`), 1
 * when `a > b`. Use it as an `Array.prototype.sort` comparator, or for min/max checks.
 */
export function decimalCompare(a: string, b: string): -1 | 0 | 1 {
  const [x, y] = align(parse(a, 'a'), parse(b, 'b'));
  return x < y ? -1 : x > y ? 1 : 0;
}

/**
 * Rounds a decimal string to `digits` fraction digits with round-half-to-even (banker's rounding, the IEEE 754
 * default, which doesn't bias totals upward), padding with zeros when it has fewer: `roundHalfEven('2.345', 2)` is
 * `'2.34'`, `roundHalfEven('2.355', 2)` is `'2.36'`, `roundHalfEven('-0.125', 2)` is `'-0.12'`, `roundHalfEven('7',
 * 2)` is `'7.00'`. `digits` is usually the currency's minor units (see `currencyMinorUnits`).
 */
export function roundHalfEven(value: string, digits: number): string {
  if (!Number.isInteger(digits) || digits < 0) {
    throw new RangeError(`digits must be a whole number of 0 or more, not ${String(digits)}`);
  }
  const x = parse(value, 'value');
  if (x.scale <= digits) {
    return write({ units: rescale(x, digits), scale: digits });
  }
  const divisor = 10n ** BigInt(x.scale - digits);
  const negative = x.units < 0n;
  const magnitude = negative ? -x.units : x.units;
  let quotient = magnitude / divisor;
  const twiceRemainder = (magnitude % divisor) * 2n;
  if (twiceRemainder > divisor || (twiceRemainder === divisor && quotient % 2n === 1n)) {
    quotient += 1n;
  }
  return write({ units: negative ? -quotient : quotient, scale: digits });
}

/**
 * The number of fraction digits in `value` that aren't trailing zeros: 2 for `'1.25'`, 1 for `'1.50'`, 0 for
 * `'3.000'`. Use it to check an amount against a currency's minor units.
 */
export function decimalPrecision(value: string): number {
  const fraction = parse(value, 'value').scale > 0 ? (value.trim().split('.')[1] ?? '') : '';
  return fraction.replace(/0+$/, '').length;
}
