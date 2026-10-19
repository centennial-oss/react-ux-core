// Fictional order books for /finance stories and tests: a "STAR/USD" pair and a binary market, "Will the comet be
// visible to the naked eye by June?". Deterministic: sizes follow a fixed pattern, not randomness.

import type { BookLevel } from '../src/finance/book';

/** Writes an integer count of 10^-scale units as a decimal string: (10125, 2) is "101.25". */
function units(value: number, scale: number): string {
  const digits = String(Math.abs(value)).padStart(scale + 1, '0');
  const whole = digits.slice(0, digits.length - scale);
  const fraction = digits.slice(digits.length - scale);
  return `${value < 0 ? '-' : ''}${whole}${scale > 0 ? `.${fraction}` : ''}`;
}

/** A size pattern that rises away from the spread, with some bumps. */
function sizeUnits(index: number, seed: number): number {
  return 250 + ((index * 37 + seed * 13) % 50) * 45 + index * 120;
}

/**
 * STAR/USD with `levels` levels a side, a 0.05 tick, best bid 101.20 and best ask 101.25. Sizes have three decimals.
 * `version` shifts the sizes, for update tests.
 */
export function starBook(levels = 20, version = 0): { bids: BookLevel[]; asks: BookLevel[] } {
  const bids = Array.from({ length: levels }, (_, index) => ({
    price: units(10120 - index * 5, 2),
    size: units(sizeUnits(index, 1 + version), 3),
  }));
  const asks = Array.from({ length: levels }, (_, index) => ({
    price: units(10125 + index * 5, 2),
    size: units(sizeUnits(index, 2 + version), 3),
  }));
  return { bids, asks };
}

/** STAR/USD with the user's own orders on the second bid and the third ask. */
export function starBookWithOwnOrders(levels = 12): { bids: BookLevel[]; asks: BookLevel[] } {
  const { bids, asks } = starBook(levels);
  return {
    bids: bids.map((level, index) => (index === 1 ? { ...level, isOwn: true } : level)),
    asks: asks.map((level, index) => (index === 2 ? { ...level, isOwn: true } : level)),
  };
}

export const cometQuestion = 'Will the comet be visible to the naked eye by June?';

/** The comet market's YES book: prices 0–1 in cents, best bid 0.61 and best ask 0.62, whole-share sizes. */
export function cometBook(levels = 8): { bids: BookLevel[]; asks: BookLevel[] } {
  return {
    bids: Array.from({ length: levels }, (_, index) => ({
      price: units(61 - index, 2),
      size: String(400 + ((index * 53) % 7) * 150 + index * 90),
    })),
    asks: Array.from({ length: levels }, (_, index) => ({
      price: units(62 + index, 2),
      size: String(350 + ((index * 41) % 5) * 170 + index * 110),
    })),
  };
}

/** The app's estimate for $50 of YES at 0.62 with no fees: 80.64 shares that pay $80.64 if right, a 61.28% return. */
export const cometYesEstimate = {
  averagePrice: '0.62',
  quantity: '80.64',
  cost: '50.00',
  fees: '0.00',
  payout: '80.64',
  returnPct: '61.28',
} as const;
