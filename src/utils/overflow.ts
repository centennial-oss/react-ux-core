// Priority-based overflow for a row (or column) of items that don't all fit: which to move into a "more" menu.

/** One item in a row that can overflow. */
export interface OverflowEntry {
  /** Its size along the row, in CSS pixels (its width in a horizontal row). */
  size: number;
  /** Higher priorities stay visible longer; among equal priorities, the last item overflows first. */
  priority: number;
  /** A separator divides neighbouring visible items whose segments differ. */
  segment?: number;
}

export interface OverflowOptions {
  /** The space between neighbouring items (the flex gap). Defaults to 0. */
  gap?: number;
  /** The size of the "more" trigger, which joins the end of the row once anything overflows. Defaults to 0. */
  moreSize?: number;
  /** The size of a separator, margins included. Defaults to 0. */
  separatorSize?: number;
}

/** Room for sub-pixel rounding in measured sizes. */
const TOLERANCE = 0.5;

/**
 * Which items to hide so the rest fit in `available`. None when everything fits; otherwise the lowest priority first
 * (ties from the end), until the visible items, their separators and the "more" trigger fit. Returns the hidden items'
 * indices in ascending order. O(n log n): each hidden item adjusts the total in constant time.
 */
export function overflowByPriority(
  entries: readonly OverflowEntry[],
  available: number,
  { gap = 0, moreSize = 0, separatorSize = 0 }: OverflowOptions = {},
): number[] {
  const count = entries.length;
  const separator = separatorSize + gap;
  const divides = (a: number, b: number) =>
    a >= 0 && b < count && (entries[a]?.segment ?? 0) !== (entries[b]?.segment ?? 0);

  let total = 0;
  for (let index = 0; index < count; index++) {
    total += (entries[index]?.size ?? 0) + (index > 0 ? gap : 0);
    if (divides(index - 1, index)) {
      total += separator;
    }
  }
  if (count === 0 || total <= available + TOLERANCE) {
    return [];
  }

  // From here the "more" trigger is in the row: one more gap (after the last item) and its own size.
  total += gap + moreSize;
  // The visible items as a doubly linked list, so hiding one finds its visible neighbours in constant time.
  const previous = Array.from({ length: count }, (_, index) => index - 1);
  const next = Array.from({ length: count }, (_, index) => index + 1);
  const order = Array.from({ length: count }, (_, index) => index).sort(
    (a, b) => (entries[a]?.priority ?? 0) - (entries[b]?.priority ?? 0) || b - a,
  );
  const hidden: number[] = [];
  for (const index of order) {
    if (total <= available + TOLERANCE) {
      break;
    }
    const before = previous[index] ?? -1;
    const after = next[index] ?? count;
    total -= (entries[index]?.size ?? 0) + gap;
    total +=
      separator *
      (Number(divides(before, after)) -
        Number(divides(before, index)) -
        Number(divides(index, after)));
    if (before >= 0) {
      next[before] = after;
    }
    if (after < count) {
      previous[after] = before;
    }
    hidden.push(index);
  }
  return hidden.sort((a, b) => a - b);
}
