// The dashboard's layout engine (ARCH-01): pure functions over grid rectangles, with no DOM, React or timers, so every
// operation is deterministic (GRID-09) and testable on its own. Positions and sizes are whole grid units; `x` counts
// from the inline start, so a layout mirrors in right-to-left (I18N-03), and `y` from the top.
//
// Every operation returns a new layout in reading order (GRID-08) with no overlaps (GRID-04): items fixed in place
// (locked ones, and the one being moved or resized) keep their spot, every other item keeps its own when it's free and
// otherwise moves down below whatever it hits, and with vertical compaction everything then floats up as far as it can
// (GRID-05). Collisions are found with a per-row occupancy bitmap, so a 100-widget page settles in well under a
// millisecond (PERF-01) and a drag can run an operation on every pointer move (GRID-14).

import { clamp } from '../../utils/math';

/** A rectangle on the grid, in whole grid units. */
export interface GridRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A placed item: its rectangle, the id it's known by, and whether it's locked in place (EDIT-15). */
export interface LayoutEntry extends GridRect {
  id: string;
  /** Can't be moved or resized, and stays put while other items move around it. */
  isLocked?: boolean;
}

/** An item to place: without `x` and `y` (or with either missing) it's auto-placed (GRID-06). */
export interface LayoutDraft {
  id: string;
  x?: number;
  y?: number;
  w: number;
  h: number;
  isLocked?: boolean;
}

/** An item's size limits in grid units. Defaults: at least 2×2, at most the column count wide and 48 rows tall. */
export interface SizeLimits {
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

/** `vertical`: items float up into empty space after every change. `none`: empty space stays. */
export type Compaction = 'vertical' | 'none';

/** The edge or corner a resize pulls: the opposite edge stays where it is. */
export type ResizeAnchor = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export interface LayoutOptions {
  /** The column count items must fit in. */
  columns: number;
  /** Defaults to `vertical`. */
  compaction?: Compaction;
  /** Each item's size limits, by id (GRID-07). */
  limits?: (id: string) => SizeLimits | undefined;
}

/** The default size limits (GRID-07). */
export const DEFAULT_SIZE_LIMITS = { minW: 2, minH: 2, maxH: 48 } as const;

/** The most columns the engine supports: the occupancy bitmap holds two 32-bit words per row. */
export const MAX_COLUMNS = 64;

const noLimits = (): undefined => undefined;

/** Orders items top to bottom, then inline start to end, then by id: reading order (GRID-08). */
function compareReading(a: LayoutEntry, b: LayoutEntry): number {
  return a.y - b.y || a.x - b.x || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/** Item ids in reading order: by `y`, then `x`, then `id` (GRID-08). */
export function readingOrder(layout: readonly LayoutEntry[]): string[] {
  return [...layout].sort(compareReading).map((item) => item.id);
}

/** Whether two rectangles share any cell. */
export function rectsOverlap(a: GridRect, b: GridRect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** The rows a layout covers: the largest `y + h`, or 0 for an empty layout. */
export function layoutRows(layout: readonly GridRect[]): number {
  let rows = 0;
  for (const item of layout) {
    rows = Math.max(rows, item.y + item.h);
  }
  return rows;
}

/** A whole number from `value`, or `fallback` when it isn't a finite number. */
function whole(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) ? Math.round(value) : fallback;
}

/** An item's width and height limits, in grid units, for a grid of `columns`. */
export function limitsFor(
  limits: SizeLimits | undefined,
  columns: number,
): { minW: number; maxW: number; minH: number; maxH: number } {
  const maxW = clamp(whole(limits?.maxW, columns), 1, columns);
  const maxH = Math.max(1, whole(limits?.maxH, DEFAULT_SIZE_LIMITS.maxH));
  return {
    minW: clamp(whole(limits?.minW, DEFAULT_SIZE_LIMITS.minW), 1, maxW),
    maxW,
    minH: clamp(whole(limits?.minH, DEFAULT_SIZE_LIMITS.minH), 1, maxH),
    maxH,
  };
}

/** `w` and `h` held to the limits and the column count (GRID-07). */
export function clampSize(
  size: { w: number; h: number },
  limits: SizeLimits | undefined,
  columns: number,
): { w: number; h: number } {
  const range = limitsFor(limits, columns);
  return {
    w: clamp(whole(size.w, range.minW), range.minW, range.maxW),
    h: clamp(whole(size.h, range.minH), range.minH, range.maxH),
  };
}

/** Bits `from` (included) to `to` (excluded) of a 32-bit word, as an unsigned number. */
function wordBits(from: number, to: number): number {
  const start = clamp(from, 0, 32);
  const end = clamp(to, 0, 32);
  if (end <= start) {
    return 0;
  }
  const span = end - start;
  return (span === 32 ? 0xffffffff : ((1 << span) - 1) << start) >>> 0;
}

/**
 * Which cells are taken, one row at a time, as a bitmask of columns in two 32-bit words. Checking whether a rectangle
 * fits costs one AND per row it covers, however many items are placed.
 */
class Occupancy {
  private readonly low: number[] = [];
  private readonly high: number[] = [];

  constructor(readonly columns: number) {}

  /** The rows that hold anything; every row from here down is empty. */
  get rowCount(): number {
    return this.low.length;
  }

  private rowFits(row: number, low: number, high: number): boolean {
    return (
      row >= this.low.length ||
      (((this.low[row] ?? 0) & low) === 0 && ((this.high[row] ?? 0) & high) === 0)
    );
  }

  /** Whether the rectangle lies inside the columns and every cell it covers is free. */
  fits(rect: GridRect): boolean {
    if (rect.x < 0 || rect.y < 0 || rect.x + rect.w > this.columns) {
      return false;
    }
    const low = wordBits(rect.x, rect.x + rect.w);
    const high = wordBits(rect.x - 32, rect.x + rect.w - 32);
    for (let row = rect.y; row < rect.y + rect.h; row++) {
      if (!this.rowFits(row, low, high)) {
        return false;
      }
    }
    return true;
  }

  add(rect: GridRect): void {
    const low = wordBits(rect.x, rect.x + rect.w);
    const high = wordBits(rect.x - 32, rect.x + rect.w - 32);
    for (let row = rect.y; row < rect.y + rect.h; row++) {
      while (this.low.length <= row) {
        this.low.push(0);
        this.high.push(0);
      }
      this.low[row] = ((this.low[row] ?? 0) | low) >>> 0;
      this.high[row] = ((this.high[row] ?? 0) | high) >>> 0;
    }
  }

  /**
   * The first `y` at or below `rect.y` where the rectangle fits: pushed down past whatever it hits. A rectangle
   * outside the columns never fits, so it stays at its own `y`.
   */
  lowestFreeY(rect: GridRect): number {
    let y = Math.max(0, rect.y);
    if (rect.x < 0 || rect.x + rect.w > this.columns) {
      return y;
    }
    while (!this.fits({ ...rect, y })) {
      y++;
    }
    return y;
  }

  /**
   * How far up the rectangle floats from `rect.y` (which must fit) before it would hit something: the gravity of
   * vertical compaction.
   */
  floatUp(rect: GridRect): number {
    const low = wordBits(rect.x, rect.x + rect.w);
    const high = wordBits(rect.x - 32, rect.x + rect.w - 32);
    let y = Math.min(rect.y, this.rowCount);
    while (y > 0 && this.rowFits(y - 1, low, high)) {
      y--;
    }
    return y;
  }

  /**
   * The first place a `w` × `h` item fits, scanning rows top to bottom and columns from the inline start (GRID-06),
   * starting at `from` when given.
   */
  firstFit(w: number, h: number, from?: { x: number; y: number }): { x: number; y: number } {
    const width = Math.min(w, this.columns);
    const startY = Math.max(0, from?.y ?? 0);
    for (let y = startY; ; y++) {
      const startX = y === startY ? Math.max(0, from?.x ?? 0) : 0;
      for (let x = startX; x + width <= this.columns; x++) {
        if (this.fits({ x, y, w: width, h })) {
          return { x, y };
        }
      }
    }
  }
}

/** The item held to its limits, the columns and the top of the grid, at whole-unit coordinates. */
function clampEntry(
  item: LayoutDraft,
  columns: number,
  limits: SizeLimits | undefined,
): LayoutEntry & { isPlaced: boolean } {
  const { w, h } = clampSize(item, limits, columns);
  const isPlaced =
    item.x !== undefined &&
    item.y !== undefined &&
    Number.isFinite(item.x) &&
    Number.isFinite(item.y);
  const entry: LayoutEntry & { isPlaced: boolean } = {
    id: item.id,
    x: isPlaced ? clamp(Math.round(item.x ?? 0), 0, columns - w) : 0,
    y: isPlaced ? Math.max(0, Math.round(item.y ?? 0)) : 0,
    w,
    h,
    isPlaced,
  };
  if (item.isLocked) {
    entry.isLocked = true;
  }
  return entry;
}

/** A copy of an entry without engine bookkeeping. */
function toEntry(item: LayoutEntry, at: { x: number; y: number }): LayoutEntry {
  const entry: LayoutEntry = { id: item.id, x: at.x, y: at.y, w: item.w, h: item.h };
  if (item.isLocked) {
    entry.isLocked = true;
  }
  return entry;
}

/**
 * Places `items` (in reading order) so none overlap. `fixed` items keep their spot whatever they cover, and are laid
 * down first; every other item keeps its own spot when it's free and otherwise moves down past what it hits. With
 * `swapWith` (a move, under vertical compaction), an item the moved one lands on first tries the space just above
 * it, so dropping a widget onto another swaps them rather than pushing both down.
 */
function resolveOverlaps(
  items: readonly LayoutEntry[],
  columns: number,
  isFixed: (item: LayoutEntry) => boolean,
  swapWith?: LayoutEntry,
): LayoutEntry[] {
  const taken = new Occupancy(columns);
  const result: LayoutEntry[] = [];
  const movable: LayoutEntry[] = [];
  for (const item of items) {
    if (!isFixed(item)) {
      movable.push(item);
      continue;
    }
    // Two fixed items can only overlap in an invalid document: the later one in reading order moves down.
    const placed = taken.fits(item)
      ? item
      : toEntry(item, { x: item.x, y: taken.lowestFreeY(item) });
    taken.add(placed);
    result.push(placed);
  }
  movable.forEach((item, index) => {
    if (taken.fits(item)) {
      taken.add(item);
      result.push(item);
      return;
    }
    if (swapWith && rectsOverlap(item, swapWith)) {
      const above = { ...item, y: swapWith.y - item.h };
      const isFree =
        above.y >= 0 &&
        taken.fits(above) &&
        !movable.some((other, otherIndex) => otherIndex > index && rectsOverlap(above, other));
      if (isFree) {
        const placed = toEntry(item, above);
        taken.add(placed);
        result.push(placed);
        return;
      }
    }
    const placed = toEntry(item, { x: item.x, y: taken.lowestFreeY(item) });
    taken.add(placed);
    result.push(placed);
  });
  return result.sort(compareReading);
}

/**
 * Floats every unlocked item up as far as it goes, in reading order, past nothing (GRID-05). Locked items stay where
 * they are and block the others. The input must not overlap.
 */
function compactVertically(items: readonly LayoutEntry[], columns: number): LayoutEntry[] {
  const taken = new Occupancy(columns);
  for (const item of items) {
    if (item.isLocked) {
      taken.add(item);
    }
  }
  const result = items.map((item) => {
    if (item.isLocked) {
      return item;
    }
    // Overlapping input (not expected) is pushed down first, so the result never overlaps.
    const y = taken.fits(item) ? taken.floatUp(item) : taken.lowestFreeY(item);
    const placed = y === item.y ? item : toEntry(item, { x: item.x, y });
    taken.add(placed);
    return placed;
  });
  return result.sort(compareReading);
}

/** Resolves overlaps (fixing `isFixed` items) and compacts when asked: the last step of every operation. */
function settle(
  items: LayoutEntry[],
  options: LayoutOptions,
  isFixed: (item: LayoutEntry) => boolean,
  swapWith?: LayoutEntry,
): LayoutEntry[] {
  const resolved = resolveOverlaps(items.sort(compareReading), options.columns, isFixed, swapWith);
  return (options.compaction ?? 'vertical') === 'vertical'
    ? compactVertically(resolved, options.columns)
    : resolved;
}

/** The column count held to what the engine supports. */
function columnsOf(options: LayoutOptions): number {
  return clamp(whole(options.columns, 1), 1, MAX_COLUMNS);
}

/**
 * The layout made valid (MOD-07): sizes held to their limits and the columns (GRID-07), positions to whole units in
 * bounds, overlaps resolved (locked items win), items without a position auto-placed in array order at the first
 * place they fit (GRID-06), then compacted when compaction is on. Normalizing a normalized layout changes nothing.
 */
export function normalizeLayout(
  items: readonly LayoutDraft[],
  options: LayoutOptions,
): LayoutEntry[] {
  const columns = columnsOf(options);
  const limits = options.limits ?? noLimits;
  const placed: LayoutEntry[] = [];
  const unplaced: LayoutEntry[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    // A repeated id would make every later operation ambiguous; the first one wins.
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    const { isPlaced, ...entry } = clampEntry(item, columns, limits(item.id));
    (isPlaced ? placed : unplaced).push(entry);
  }
  const resolved = resolveOverlaps(
    placed.sort(compareReading),
    columns,
    (item) => item.isLocked === true,
  );
  if (unplaced.length > 0) {
    const taken = new Occupancy(columns);
    for (const item of resolved) {
      taken.add(item);
    }
    for (const item of unplaced) {
      const at = taken.firstFit(item.w, item.h);
      const entry = toEntry(item, at);
      taken.add(entry);
      resolved.push(entry);
    }
  }
  return settle(resolved, { ...options, columns }, (item) => item.isLocked === true);
}

/**
 * Vertical compaction of a layout on its own (or, with `compaction: 'none'`, only its overlaps resolved). Sizes are
 * left as they are; use `normalizeLayout` to also apply limits and auto-placement.
 */
export function compactLayout(
  layout: readonly LayoutEntry[],
  options: LayoutOptions,
): LayoutEntry[] {
  const columns = columnsOf(options);
  // Items wider than the grid, or past its edge, are brought inside it first.
  const inside = layout.map((item) => {
    const w = clamp(item.w, 1, columns);
    const x = clamp(item.x, 0, columns - w);
    return w === item.w && x === item.x ? item : { ...item, x, w };
  });
  return settle(inside, { ...options, columns }, (item) => item.isLocked === true);
}

/**
 * The layout with item `id` set to `rect` (held to its limits, the columns and the top of the grid): the one
 * operation behind moves, resizes, keyboard steps and the Move/Resize dialog. It never covers a locked item: it moves
 * down past one instead. Items in the way make way; when only the position changed and compaction is vertical, each
 * first tries the space just above the item (so dropping onto a widget swaps the two), else moves down. Then the
 * layout is compacted. Locked or unknown items leave the layout as it is.
 */
export function placeItem(
  layout: readonly LayoutEntry[],
  id: string,
  rect: GridRect,
  options: LayoutOptions,
): LayoutEntry[] {
  const columns = columnsOf(options);
  const item = layout.find((entry) => entry.id === id);
  if (!item || item.isLocked) {
    return [...layout].sort(compareReading);
  }
  const { w, h } = clampSize(rect, options.limits?.(id), columns);
  const target: LayoutEntry = {
    ...toEntry(item, {
      x: clamp(whole(rect.x, item.x), 0, columns - w),
      y: Math.max(0, whole(rect.y, item.y)),
    }),
    w,
    h,
  };
  const locked = new Occupancy(columns);
  for (const entry of layout) {
    if (entry.isLocked) {
      locked.add(entry);
    }
  }
  const placed = locked.fits(target) ? target : { ...target, y: locked.lowestFreeY(target) };
  const isMove = w === item.w && h === item.h;
  const isVertical = (options.compaction ?? 'vertical') === 'vertical';
  return settle(
    [...layout.filter((entry) => entry.id !== id), placed],
    { ...options, columns },
    (entry) => entry.isLocked === true || entry.id === id,
    isMove && isVertical ? placed : undefined,
  );
}

/**
 * The layout with item `id` moved to `to`, held inside the columns (see `placeItem`): items it lands on make way,
 * swapping with it where there's room, then the layout is compacted.
 */
export function moveItem(
  layout: readonly LayoutEntry[],
  id: string,
  to: { x: number; y: number },
  options: LayoutOptions,
): LayoutEntry[] {
  const item = layout.find((entry) => entry.id === id);
  return item
    ? placeItem(layout, id, { x: to.x, y: to.y, w: item.w, h: item.h }, options)
    : [...layout].sort(compareReading);
}

/**
 * The layout with item `id` resized to `size` by pulling `anchor`: the opposite edges stay put, so pulling the
 * inline-start (`w`) or top (`n`) edge moves the item's corner. The size is held to the item's limits and the columns
 * (GRID-07, EDIT-17) and the grid's edges; an edge-only anchor keeps the other dimension. Items in the way move down,
 * then the layout is compacted. Locked or unknown items leave the layout as it is.
 */
export function resizeItem(
  layout: readonly LayoutEntry[],
  id: string,
  size: { w: number; h: number },
  anchor: ResizeAnchor,
  options: LayoutOptions,
): LayoutEntry[] {
  const columns = columnsOf(options);
  const item = layout.find((entry) => entry.id === id);
  if (!item || item.isLocked) {
    return [...layout].sort(compareReading);
  }
  return placeItem(
    layout,
    id,
    resizedRect(item, size, anchor, columns, options.limits?.(id)),
    options,
  );
}

/** The rectangle `item` gets when `anchor` is pulled to make it `size`, inside the grid and the item's limits. */
export function resizedRect(
  item: GridRect,
  size: { w: number; h: number },
  anchor: ResizeAnchor,
  columns: number,
  limits?: SizeLimits,
): GridRect {
  const isHorizontal = anchor.includes('e') || anchor.includes('w');
  const isVertical = anchor.includes('n') || anchor.includes('s');
  const fromStart = anchor.includes('w');
  const fromTop = anchor.includes('n');
  const range = limitsFor(limits, columns);
  // The room to grow into: up to the grid's edge on the side being pulled.
  const maxW = Math.max(
    range.minW,
    Math.min(range.maxW, fromStart ? item.x + item.w : columns - item.x),
  );
  const maxH = fromTop ? Math.max(range.minH, Math.min(range.maxH, item.y + item.h)) : range.maxH;
  const w = isHorizontal ? clamp(whole(size.w, item.w), range.minW, maxW) : item.w;
  const h = isVertical ? clamp(whole(size.h, item.h), range.minH, maxH) : item.h;
  return {
    x: clamp(fromStart ? item.x + item.w - w : item.x, 0, columns - w),
    y: Math.max(0, fromTop ? item.y + item.h - h : item.y),
    w,
    h,
  };
}

/**
 * The first free position for a `w` × `h` item in `layout`, scanning rows top to bottom and columns from the inline
 * start (GRID-06). With `from`, the scan starts there: after a focused widget (EDIT-10) or beside the original of a
 * duplicate (EDIT-19).
 */
export function autoPlace(
  layout: readonly GridRect[],
  size: { w: number; h: number },
  columns: number,
  from?: { x: number; y: number },
): { x: number; y: number } {
  const width = clamp(whole(columns, 1), 1, MAX_COLUMNS);
  const taken = new Occupancy(width);
  for (const item of layout) {
    taken.add(item);
  }
  return taken.firstFit(clamp(whole(size.w, 1), 1, width), Math.max(1, whole(size.h, 1)), from);
}

/**
 * A layout for a narrower grid, derived from the canonical one (RESP-04): widgets in reading order, each width scaled
 * by `toColumns / fromColumns` (rounded, at least the scaled minimum, at most `toColumns`), placed at the first place
 * they fit, then compacted. Widgets that shared a row stay side by side where they fit. Derived layouts aren't stored
 * (RESP-05), and every item in them is movable.
 */
export function deriveLayout(
  canonical: readonly LayoutEntry[],
  fromColumns: number,
  toColumns: number,
  limits: (id: string) => SizeLimits | undefined = noLimits,
): LayoutEntry[] {
  const from = clamp(whole(fromColumns, 1), 1, MAX_COLUMNS);
  const to = clamp(whole(toColumns, 1), 1, MAX_COLUMNS);
  const ordered = [...canonical].sort(compareReading);
  if (to >= from) {
    return ordered;
  }
  const ratio = to / from;
  const taken = new Occupancy(to);
  const placed = ordered.map((item) => {
    const range = limitsFor(limits(item.id), from);
    const minW = clamp(Math.round(range.minW * ratio), 1, to);
    const w = clamp(Math.round(item.w * ratio), minW, to);
    const h = clamp(item.h, range.minH, range.maxH);
    const at = taken.firstFit(w, h);
    const entry: LayoutEntry = { id: item.id, x: at.x, y: at.y, w, h };
    taken.add(entry);
    return entry;
  });
  return compactVertically(placed.sort(compareReading), to);
}

/**
 * The layout re-expressed for a new canonical column count (GRID-03): positions and widths scaled and rounded,
 * widths kept at or above each item's minimum, then normalized.
 */
export function rescaleLayout(
  layout: readonly LayoutEntry[],
  fromColumns: number,
  toColumns: number,
  options: Omit<LayoutOptions, 'columns'> = {},
): LayoutEntry[] {
  const from = clamp(whole(fromColumns, 1), 1, MAX_COLUMNS);
  const to = clamp(whole(toColumns, 1), 1, MAX_COLUMNS);
  const ratio = to / from;
  return normalizeLayout(
    layout.map((item) => ({
      ...item,
      x: Math.round(item.x * ratio),
      w: Math.round(item.w * ratio),
    })),
    { ...options, columns: to },
  );
}
