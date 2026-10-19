// Windowing for lists of equal-sized items: which items a scrolled viewport shows, so only those are rendered.

/** A run of item indexes, `start` inclusive and `end` exclusive. */
export interface IndexWindow {
  start: number;
  end: number;
}

/**
 * The items of `itemSize` pixels (out of `count`) that a viewport `viewportSize` pixels long shows when scrolled
 * `offset` pixels past the first, with `overscan` more on each side so a quick scroll doesn't show gaps. `offset` is
 * rounded down to a multiple of `step` items first, so the window (and what renders from it) changes only every
 * `step` items of scrolling.
 */
export function fixedSizeWindow(
  offset: number,
  viewportSize: number,
  itemSize: number,
  count: number,
  overscan = 0,
  step = 1,
): IndexWindow {
  if (count <= 0 || itemSize <= 0) {
    return { start: 0, end: 0 };
  }
  const size = Math.max(1, Math.floor(step));
  const first = Math.floor(Math.max(0, offset) / itemSize / size) * size;
  const shown = Math.ceil(Math.max(0, viewportSize) / itemSize) + size;
  return {
    start: Math.min(count, Math.max(0, first - overscan)),
    end: Math.min(count, first + shown + overscan),
  };
}
