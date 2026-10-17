// Order book arithmetic on decimal strings: price grouping (tick aggregation), sorting, cumulative totals, spread and
// mid price. Prices and sizes never pass through a float; only bar widths and chart geometry use numbers.

import {
  decimalAdd,
  decimalCompare,
  decimalMultiply,
  decimalSubtract,
  isDecimal,
  roundHalfEven,
} from '../components/MoneyField/decimal';

/** One price level of an order book. Prices and sizes are decimal strings ("101.25", "3.5"). */
export interface BookLevel {
  price: string;
  size: string;
  /** The cumulative size from the best price to this level. Worked out when missing. */
  total?: string;
  /** Highlights levels with the user's own orders. */
  isOwn?: boolean;
}

/** A side of the book. */
export type BookSide = 'bid' | 'ask';

/** A level ready to show: its total is always present. */
export interface ResolvedLevel {
  price: string;
  size: string;
  total: string;
  isOwn: boolean;
}

/** The number of fraction digits a decimal string is written with: 2 for "1.50", 0 for "12". */
export function decimalScale(value: string): number {
  const fraction = value.trim().split('.')[1];
  return fraction === undefined ? 0 : fraction.length;
}

/** `value` as a scaled integer at `scale` fraction digits (scale must be at least the value's own). */
function toUnits(value: string, scale: number): bigint {
  const trimmed = value.trim();
  const isNegative = trimmed.startsWith('-');
  const [whole = '', fraction = ''] = trimmed.replace(/^[+-]/, '').split('.');
  const units = BigInt(`${whole || '0'}${fraction.padEnd(scale, '0')}`);
  return isNegative ? -units : units;
}

/**
 * Rounds `price` to a multiple of `grouping`, down (`floor`, for bids) or up (`ceil`, for asks), written with the
 * grouping's scale: `groupPrice('101.27', '0.1', 'floor')` is `'101.2'`, `groupPrice('101.27', '0.5', 'ceil')` is
 * `'101.5'`, `groupPrice('101.27', '10', 'floor')` is `'100'`.
 */
export function groupPrice(price: string, grouping: string, mode: 'floor' | 'ceil'): string {
  const scale = Math.max(decimalScale(price), decimalScale(grouping));
  const units = toUnits(price, scale);
  const step = toUnits(grouping, scale);
  if (step <= 0n) {
    return price;
  }
  let buckets = units / step;
  const remainder = units % step;
  if (remainder !== 0n) {
    if (mode === 'floor' && units < 0n) {
      buckets -= 1n;
    } else if (mode === 'ceil' && units > 0n) {
      buckets += 1n;
    }
  }
  const grouped = buckets * step;
  const isNegative = grouped < 0n;
  const digits = (isNegative ? -grouped : grouped).toString().padStart(scale + 1, '0');
  const text = `${isNegative ? '-' : ''}${digits.slice(0, digits.length - scale)}${
    scale > 0 ? `.${digits.slice(digits.length - scale)}` : ''
  }`;
  // Exact (the value is a multiple of the grouping), so this only drops the extra digits.
  return roundHalfEven(text, decimalScale(grouping));
}

function isUsable(level: BookLevel): boolean {
  return isDecimal(level.price) && isDecimal(level.size);
}

/**
 * One side of the book, best price first (highest bid, lowest ask), grouped to `grouping` when given (bids round
 * down and asks up, so a grouped level never looks better than its orders), cut to `depth` levels, with cumulative
 * totals. Levels whose price or size isn't a decimal string are skipped. A level's own `total` is kept only when the
 * side isn't grouped.
 */
export function resolveSide(
  levels: readonly BookLevel[],
  side: BookSide,
  { grouping, depth }: { grouping?: string; depth?: number } = {},
): ResolvedLevel[] {
  const byPrice = new Map<
    string,
    { price: string; size: string; total?: string; isOwn: boolean }
  >();
  const isGrouped = grouping !== undefined && isDecimal(grouping);
  for (const level of levels) {
    if (!isUsable(level)) {
      continue;
    }
    const price = isGrouped
      ? groupPrice(level.price, grouping, side === 'bid' ? 'floor' : 'ceil')
      : level.price;
    // Key by value, so "1.5" and "1.50" are one level.
    const key = roundHalfEven(price, 12);
    const existing = byPrice.get(key);
    if (existing) {
      existing.size = decimalAdd(existing.size, level.size);
      existing.isOwn ||= level.isOwn === true;
      existing.total = undefined;
    } else {
      byPrice.set(key, {
        price,
        size: level.size,
        total: isGrouped ? undefined : level.total,
        isOwn: level.isOwn === true,
      });
    }
  }
  const sorted = [...byPrice.values()].sort((a, b) =>
    side === 'bid' ? decimalCompare(b.price, a.price) : decimalCompare(a.price, b.price),
  );
  const shown = depth === undefined ? sorted : sorted.slice(0, Math.max(0, depth));
  let running = '0';
  return shown.map((level) => {
    running = decimalAdd(running, level.size);
    return {
      price: level.price,
      size: level.size,
      total: level.total !== undefined && isDecimal(level.total) ? level.total : running,
      isOwn: level.isOwn,
    };
  });
}

/** The spread (best ask minus best bid) and the mid price, or null when either side is empty. */
export function spreadAndMid(
  bestBid: string | undefined,
  bestAsk: string | undefined,
): { spread: string; mid: string } | null {
  if (bestBid === undefined || bestAsk === undefined) {
    return null;
  }
  return {
    spread: decimalSubtract(bestAsk, bestBid),
    mid: trimTo(
      decimalMultiply(decimalAdd(bestAsk, bestBid), '0.5'),
      Math.max(decimalScale(bestBid), decimalScale(bestAsk)),
    ),
  };
}

/** Drops trailing zeros past `minScale` fraction digits: `trimTo('101.2250', 2)` is `'101.225'`, `('101.200', 2)` is `'101.20'`. */
export function trimTo(value: string, minScale: number): string {
  const scale = decimalScale(value);
  if (scale <= minScale) {
    return value;
  }
  let text = value;
  let digits = scale;
  while (digits > minScale && text.endsWith('0')) {
    text = text.slice(0, -1);
    digits -= 1;
  }
  return text.endsWith('.') ? text.slice(0, -1) : text;
}

/** The largest scale among the values, so a column lines up. */
export function maxScale(values: readonly string[]): number {
  return values.reduce((scale, value) => Math.max(scale, decimalScale(value)), 0);
}

/** The largest of the values (decimal strings), or undefined for none. */
export function decimalMax(values: readonly string[]): string | undefined {
  let best: string | undefined;
  for (const value of values) {
    if (best === undefined || decimalCompare(value, best) > 0) {
      best = value;
    }
  }
  return best;
}
