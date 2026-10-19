// Where a Carousel can stop and where each slide sits. Positions count slides from the first slide in view. A looping
// carousel never wraps its position: it keeps counting past the ends (9, 10, … or −1, −2, …), so every move slides the
// same way it points, and each slide is drawn in the lap nearest the view (`slotOf`).

import { clamp, mod } from '../../utils/math';

/** How far the arrows, keys, swipes and autoplay move: one slide, or a page (the slides in view). */
export type CarouselMoveBy = 'slide' | 'page';

export interface CarouselLayout {
  /** How many slides there are. */
  count: number;
  /** How many slides are in view at once, at least 1. */
  columns: number;
  /** Whether moving past the last slide goes on to the first (only when there's more than a view of slides). */
  isLooping: boolean;
  moveBy: CarouselMoveBy;
}

/** Whether there's more than one view of slides, so the carousel can move at all. */
export function canMove({ count, columns }: CarouselLayout): boolean {
  return count > columns;
}

/** The last position that still fills the view, when not looping. */
export function lastStart({ count, columns }: CarouselLayout): number {
  return Math.max(0, count - columns);
}

/** How many places the carousel can stop at: each slide, or each page. These are the dots. */
export function snapCount(layout: CarouselLayout): number {
  if (!canMove(layout)) {
    return 1;
  }
  if (layout.moveBy === 'page') {
    return Math.ceil(layout.count / layout.columns);
  }
  return layout.isLooping ? layout.count : lastStart(layout) + 1;
}

/** The first slide in view at a stop. A non-looping carousel's last page ends at the last slide. */
export function startOfSnap(layout: CarouselLayout, snap: number): number {
  if (layout.moveBy === 'slide') {
    return snap;
  }
  const start = snap * layout.columns;
  return layout.isLooping ? start : Math.min(start, lastStart(layout));
}

/**
 * The stop showing `index` (0 to count − 1) first, or, between stops, the one before it (`isRoundingUp` false) or
 * after it (true). Looping, the stop after the last page is `snapCount` (the first page, a lap on).
 */
export function snapOfIndex(layout: CarouselLayout, index: number, isRoundingUp = false): number {
  const last = snapCount(layout) - 1;
  if (!layout.isLooping && index >= lastStart(layout)) {
    return last;
  }
  if (layout.moveBy === 'slide') {
    return index;
  }
  const snap = (isRoundingUp ? Math.ceil : Math.floor)(index / layout.columns);
  return layout.isLooping ? snap : Math.min(snap, last);
}

/** The position `steps` stops on from `position` (negative steps go back). Without looping it stops at the ends. */
export function stepPosition(layout: CarouselLayout, position: number, steps: number): number {
  if (!canMove(layout) || steps === 0) {
    return position;
  }
  const isRoundingUp = steps < 0;
  if (!layout.isLooping) {
    const index = clamp(position, 0, lastStart(layout));
    const snap = clamp(snapOfIndex(layout, index, isRoundingUp) + steps, 0, snapCount(layout) - 1);
    return startOfSnap(layout, snap);
  }
  const { count } = layout;
  const snaps = snapCount(layout);
  const lap = Math.floor(position / count);
  const target = lap * snaps + snapOfIndex(layout, position - lap * count, isRoundingUp) + steps;
  const targetLap = Math.floor(target / snaps);
  return targetLap * count + startOfSnap(layout, target - targetLap * snaps);
}

/**
 * The position showing slide `index` first, as near `position` as possible: the shortest way round when looping,
 * and no further than the last full view when not.
 */
export function positionOfIndex(layout: CarouselLayout, position: number, index: number): number {
  if (!canMove(layout)) {
    return 0;
  }
  if (!layout.isLooping) {
    return clamp(index, 0, lastStart(layout));
  }
  const { count } = layout;
  let delta = mod(index - position, count);
  if (delta > count / 2) {
    delta -= count;
  }
  return position + delta;
}

/**
 * The first of the `count` consecutive slots a looping carousel draws its slides in, for a move from `from` to
 * `position`, so every slot the move passes through is filled. The spare slots go half before and half after (room
 * for a move that starts while the last is still sliding), or all on one side for a drag that way (`isForward`).
 */
export function loopWindowStart(
  layout: CarouselLayout,
  from: number,
  position: number,
  isForward?: boolean,
): number {
  const low = Math.min(from, position);
  const high = Math.max(from, position);
  if (isForward === true) {
    return low;
  }
  if (isForward === false) {
    return high + layout.columns - layout.count;
  }
  const spare = Math.max(0, layout.count - (high - low + layout.columns));
  return low - Math.floor(spare / 2);
}

/** Whether a looping move from `from` to `position` passes through more slots than there are slides to fill them. */
export function isTooFarToSlide(layout: CarouselLayout, from: number, position: number): boolean {
  return Math.abs(position - from) + layout.columns > layout.count;
}

/** The slot slide `index` is drawn in: its own index, or, looping, its copy inside the window from `windowStart`. */
export function slotOf(layout: CarouselLayout, index: number, windowStart: number): number {
  if (!layout.isLooping) {
    return index;
  }
  return index + Math.ceil((windowStart - index) / layout.count) * layout.count;
}

/**
 * The slides to draw, in order: those within a view of the view, and every slide a sliding move passes. After a jump,
 * those near where it jumped from stay too, out of view until the next move (so focus that was there can follow).
 * Looping, only the slots in the window from `windowStart`.
 */
export function slidesNear(
  layout: CarouselLayout,
  from: number,
  position: number,
  windowStart: number,
  isJump: boolean,
): number[] {
  const { count, columns, isLooping } = layout;
  const lowest = isLooping ? windowStart : 0;
  const highest = isLooping ? windowStart + count : count;
  const spans: [number, number][] =
    isJump && from !== position
      ? [
          [from - columns, from + 2 * columns],
          [position - columns, position + 2 * columns],
        ]
      : [[Math.min(from, position) - columns, Math.max(from, position) + 2 * columns]];
  const slides = new Set<number>();
  for (const [start, end] of spans) {
    for (let slot = Math.max(start, lowest); slot < Math.min(end, highest); slot++) {
      slides.add(isLooping ? mod(slot, count) : slot);
    }
  }
  return [...slides].sort((a, b) => a - b);
}
