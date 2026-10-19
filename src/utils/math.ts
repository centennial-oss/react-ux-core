// Small numeric helpers shared across components, so ranges, steps and extents behave the same everywhere.

/** `value` limited to the range from `min` to `max`. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** The remainder of `value` divided by `divisor`, always from 0 up to `divisor` (`mod(-1, 8)` is 7), for wrapping. */
export function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

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

/**
 * The number of decimals in `value` as JavaScript writes it, including exponent notation (`1e-7` has 7), so values
 * computed from it can be rounded free of float noise (0.1 + 0.2).
 */
export function decimalsOf(value: number): number {
  const text = String(value);
  const exponent = /e-(\d+)$/.exec(text);
  if (exponent) {
    const mantissaDecimals = text.slice(0, exponent.index).split('.')[1]?.length ?? 0;
    return Number(exponent[1]) + mantissaDecimals;
  }
  return text.split('.')[1]?.length ?? 0;
}

/** `value` rounded to `decimals` places, as a number (`roundTo(0.1 + 0.2, 1)` is 0.3). */
export function roundTo(value: number, decimals: number): number {
  return Number(value.toFixed(Math.min(100, Math.max(0, decimals))));
}
