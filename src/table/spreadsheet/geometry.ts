// Column widths and positions for the virtualised grid.

import { clamp } from '../../utils/math';
import type { SpreadsheetColumnType } from './types';

export const MIN_COLUMN_WIDTH = 48;
export const MAX_COLUMN_WIDTH = 1200;

const DEFAULT_WIDTHS: Record<SpreadsheetColumnType, number> = {
  text: 160,
  number: 120,
  boolean: 96,
  date: 136,
  enum: 144,
};

export function defaultWidth(type: SpreadsheetColumnType): number {
  return DEFAULT_WIDTHS[type];
}

export function clampWidth(width: number): number {
  return Math.round(clamp(width, MIN_COLUMN_WIDTH, MAX_COLUMN_WIDTH));
}

/** A column's CSS width (`160px`, `10rem`, `12em`, or a bare number of pixels) in pixels; `fallback` otherwise. */
export function widthInPixels(width: string | undefined, fallback: number, remPixels = 16): number {
  const match = width === undefined ? null : /^\s*(\d+(?:\.\d+)?)\s*(px|rem|em)?\s*$/.exec(width);
  if (!match) {
    return fallback;
  }
  const amount = Number(match[1]);
  return clampWidth(match[2] === 'rem' || match[2] === 'em' ? amount * remPixels : amount);
}

/** Where each column starts: `offsets[i]` for column `i`, and the total width at the end. */
export function columnOffsets(widths: readonly number[]): number[] {
  const offsets = [0];
  let total = 0;
  for (const width of widths) {
    total += width;
    offsets.push(total);
  }
  return offsets;
}

/** The column at `x` (pixels from the first column's start), clamped to the columns there are. */
export function columnAt(offsets: readonly number[], x: number): number {
  const last = offsets.length - 2;
  if (last < 0) {
    return -1;
  }
  let low = 0;
  let high = last;
  while (low < high) {
    const middle = (low + high + 1) >> 1;
    if ((offsets[middle] ?? 0) <= x) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }
  return low;
}
