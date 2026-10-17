// Pure size arithmetic for SplitView: CSS lengths to pixels, and pane sizes (percentages that add up to 100).

/** Font sizes that `rem` and `em` lengths resolve against, in pixels. */
export interface FontSizes {
  root: number;
  own: number;
}

/**
 * A CSS length (`240px`, `12rem`, `20em`, `30%`) in pixels, with `%` taken of `containerPx`. A bare number is
 * pixels. Anything else (or a percentage before the container is measured) is `undefined`.
 */
export function lengthToPx(
  length: string,
  containerPx: number | undefined,
  fonts: FontSizes,
): number | undefined {
  const match = /^\s*(-?\d*\.?\d+)\s*(px|rem|em|%)?\s*$/.exec(length);
  if (!match) {
    return undefined;
  }
  const value = Number(match[1]);
  switch (match[2]) {
    case 'rem':
      return value * fonts.root;
    case 'em':
      return value * fonts.own;
    case '%':
      return containerPx === undefined ? undefined : (value / 100) * containerPx;
    default:
      return value;
  }
}

/** A pane's minimum size as a percentage of the container: numbers are percentages already, strings CSS lengths. */
export function minToPercent(
  min: number | string | undefined,
  containerPx: number | undefined,
  fonts: FontSizes,
): number {
  if (min === undefined) {
    return 0;
  }
  if (typeof min === 'number') {
    return clamp(min, 0, 100);
  }
  const px = lengthToPx(min, containerPx, fonts);
  return px === undefined || !containerPx ? 0 : clamp((px / containerPx) * 100, 0, 100);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** `sizes` scaled to add up to 100, or equal sizes when they don't fit `count` panes. */
export function normalizeSizes(sizes: readonly number[] | undefined, count: number): number[] {
  const total = sizes?.reduce((sum, size) => sum + Math.max(0, size), 0) ?? 0;
  if (sizes?.length !== count || total <= 0) {
    return Array.from({ length: count }, () => 100 / count);
  }
  return sizes.map((size) => (Math.max(0, size) / total) * 100);
}

/**
 * Raises panes below their minimum (collapsed panes, at 0, stay collapsed), taking the space from panes above
 * theirs, largest surplus first. Used when the container shrinks below what the minimums need.
 */
export function fitToMinimums(sizes: readonly number[], mins: readonly number[]): number[] {
  const next = [...sizes];
  let deficit = 0;
  next.forEach((size, index) => {
    const min = mins[index] ?? 0;
    if (size > 0 && size < min) {
      deficit += min - size;
      next[index] = min;
    }
  });
  while (deficit > 0.001) {
    const donors = next
      .map((size, index) => ({ index, surplus: size - (mins[index] ?? 0) }))
      .filter((donor) => donor.surplus > 0.001 && sizes[donor.index] !== 0);
    if (donors.length === 0) {
      break;
    }
    const share = deficit / donors.length;
    for (const { index, surplus } of donors) {
      const take = Math.min(share, surplus);
      next[index] = (next[index] ?? 0) - take;
      deficit -= take;
    }
  }
  return next;
}

export interface PairLimits {
  /** Minimums of the panes before and after the handle, in percent. */
  minBefore: number;
  minAfter: number;
  isBeforeCollapsible: boolean;
  isAfterCollapsible: boolean;
}

/** The lowest and highest size the pane before a handle can take (0 or the whole pair when it collapses). */
export function pairRange(total: number, limits: PairLimits): { min: number; max: number } {
  const min = limits.isBeforeCollapsible ? 0 : Math.min(limits.minBefore, total);
  const max = limits.isAfterCollapsible ? total : Math.max(total - limits.minAfter, min);
  return { min, max };
}

/**
 * Where a drag puts the pane before a handle, given the size it was dragged to: within the minimums, or collapsed
 * once dragged past half of a collapsible pane's minimum.
 */
export function dragPair(want: number, total: number, limits: PairLimits): number {
  if (limits.isBeforeCollapsible && want < limits.minBefore / 2) {
    return 0;
  }
  if (limits.isAfterCollapsible && total - want < limits.minAfter / 2) {
    return total;
  }
  const low = Math.min(limits.minBefore, total);
  return clamp(want, low, Math.max(total - limits.minAfter, low));
}

/**
 * Where a keyboard step puts the pane before a handle: one step past a minimum collapses a collapsible pane, and
 * one step out of a collapsed pane opens it at its minimum.
 */
export function stepPair(current: number, want: number, total: number, limits: PairLimits): number {
  const { minBefore, minAfter, isBeforeCollapsible, isAfterCollapsible } = limits;
  const low = Math.min(minBefore, total);
  const high = Math.max(total - minAfter, low);
  if (want < current) {
    if (current >= total && isAfterCollapsible) {
      return high;
    }
    return want < low ? (isBeforeCollapsible ? 0 : low) : Math.min(want, high);
  }
  if (current <= 0 && isBeforeCollapsible) {
    return low;
  }
  return want > high ? (isAfterCollapsible ? total : high) : Math.max(want, low);
}

/** `sizes` with the pair at `index` and `index + 1` split so the first is `before` (the pair keeps its total). */
export function withPair(sizes: readonly number[], index: number, before: number): number[] {
  const total = (sizes[index] ?? 0) + (sizes[index + 1] ?? 0);
  const next = [...sizes];
  next[index] = before;
  next[index + 1] = total - before;
  return next;
}
