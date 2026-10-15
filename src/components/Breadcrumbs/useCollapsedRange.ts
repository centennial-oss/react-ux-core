import { useCallback, useLayoutEffect, useState, type RefObject } from 'react';

/** Items `start` up to (not including) `end` are collapsed into the menu. */
export interface CollapsedRange {
  start: number;
  end: number;
}

// Sub-pixel widths are rounded differently in different places; this keeps an exact fit from collapsing.
const EPSILON = 0.5;

/**
 * Which items to collapse so the trail fits `available` pixels. `widths` are the items' natural widths (each with
 * its trailing separator); `menuWidth` is the menu trigger's (with its separator). The first and last items always
 * stay; trailing items are kept for as long as they fit, since they're closest to the current page.
 */
export function computeCollapsedRange(
  widths: readonly number[],
  menuWidth: number,
  available: number,
): CollapsedRange | null {
  const count = widths.length;
  const total = widths.reduce((sum, width) => sum + width, 0);
  if (count <= 2 || total <= available + EPSILON) {
    return null;
  }
  let used = (widths[0] ?? 0) + menuWidth + (widths[count - 1] ?? 0);
  let end = count - 1;
  // Item 1 is always collapsed (otherwise the menu would be empty), so trailing items stop at index 2.
  while (end > 2 && used + (widths[end - 1] ?? 0) <= available + EPSILON) {
    end -= 1;
    used += widths[end] ?? 0;
  }
  return { start: 1, end };
}

function isSameRange(a: CollapsedRange | null, b: CollapsedRange | null) {
  return a === b || (a !== null && b !== null && a.start === b.start && a.end === b.end);
}

/**
 * Measures the trail and returns the range of items to collapse. `listRef` is the visible list (its width is the space
 * available); `measureRef` is an invisible copy of every item followed by the menu trigger, laid out at natural width.
 * A ResizeObserver on both re-measures when the space or the labels change; `items` changing re-measures before paint.
 */
export function useCollapsedRange(
  listRef: RefObject<HTMLElement | null>,
  measureRef: RefObject<HTMLElement | null>,
  items: unknown,
): CollapsedRange | null {
  const [range, setRange] = useState<CollapsedRange | null>(null);

  const measure = useCallback(() => {
    const list = listRef.current;
    const row = measureRef.current;
    if (!list || !row) {
      return;
    }
    const widths = Array.from(row.children, (child) => child.getBoundingClientRect().width);
    const menuWidth = widths.pop() ?? 0;
    const next = computeCollapsedRange(widths, menuWidth, list.getBoundingClientRect().width);
    setRange((current) => (isSameRange(current, next) ? current : next));
  }, [listRef, measureRef]);

  // Layout effects run before paint, so a trail that doesn't fit never flashes at full length.
  useLayoutEffect(() => {
    measure();
  }, [measure, items]);

  useLayoutEffect(() => {
    const list = listRef.current;
    const row = measureRef.current;
    if (!list || !row) {
      return;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    observer.observe(row);
    return () => {
      observer.disconnect();
    };
  }, [listRef, measureRef, measure]);

  return range;
}
