// Rating arithmetic, kept apart from the component so it's tested on its own.

import { clamp } from '../../utils/math';

/** How much of icon `index` (from 0) a value fills: 0 to 1. 3.7 fills icons 0–2, 70% of icon 3, and none after. */
export function iconFill(value: number, index: number): number {
  return clamp(value - index, 0, 1);
}

/**
 * The rating under a pointer `fraction` (0–1) of the way along the icons, from the start: the icon it's on, or the
 * half of it with `step` 0.5. Never below one step, so a press always chooses something.
 */
export function ratingAt(fraction: number, maxValue: number, step: number): number {
  // A hair below a boundary still counts as the icon before it, so the very edge of icon 3 isn't icon 4.
  return clamp(Math.ceil((clamp(fraction, 0, 1) * maxValue) / step - 1e-9) * step, step, maxValue);
}

/**
 * The rating `steps` steps from `value` (null is no rating), within one step and `maxValue`, or 0 (no rating) when
 * `isClearable`. Returns null for no rating. Stepping down from no rating leaves it at none.
 */
export function steppedRating(
  value: number | null,
  steps: number,
  { maxValue, step, isClearable }: { maxValue: number; step: number; isClearable: boolean },
): number | null {
  if (value === null && steps < 0) {
    return null;
  }
  // Snap first, so an off-step value (3.7 with whole steps) moves to a neighbouring step.
  const from = value === null ? 0 : (steps > 0 ? Math.floor : Math.ceil)(value / step) * step;
  const next = clamp(from + steps * step, isClearable ? 0 : step, maxValue);
  return next === 0 ? null : next;
}
