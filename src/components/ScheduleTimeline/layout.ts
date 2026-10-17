// ScheduleTimeline's pure logic: normalising items, finding conflicts (overlaps within a lane), packing overlapping
// items into stacked rows, and choosing the time axis's ticks.
import type { ReactNode } from 'react';
import type { Tone } from '../../utils/types';
import { addDays, MINUTE_MS, snapTime } from './zone';

export interface TimelineLane {
  id: string;
  label: string;
  description?: ReactNode;
}

export interface TimelineItem {
  id: string;
  laneId: string;
  /** A Date, epoch milliseconds or an ISO 8601 string. */
  start: Date | number | string;
  end: Date | number | string;
  label: string;
  /** Defaults to `accent`. */
  tone?: Tone;
  /** A locked item can't be moved or resized. */
  isLocked?: boolean;
  /** More about the item, shown in its details popover (and the phone agenda). */
  detail?: ReactNode;
}

export interface TimelineRange {
  start: Date;
  end: Date;
}

/** An item with its instants as epoch milliseconds. */
export interface PlacedItem {
  item: TimelineItem;
  id: string;
  laneId: string;
  start: number;
  end: number;
  /** The stacked row it sits in within its lane (0 = top). */
  row: number;
}

function toMs(value: Date | number | string): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

/**
 * The items that overlap `[rangeStart, rangeEnd)`, with numeric times, sorted by lane then start. Items with invalid
 * times, or that end before they start, are left out.
 */
export function normalizeItems(
  items: readonly TimelineItem[],
  rangeStart: number,
  rangeEnd: number,
): PlacedItem[] {
  const placed: PlacedItem[] = [];
  for (const item of items) {
    const start = toMs(item.start);
    const end = toMs(item.end);
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      if (start < rangeEnd && end > rangeStart) {
        placed.push({ item, id: item.id, laneId: item.laneId, start, end, row: 0 });
      }
    }
  }
  return placed.sort((a, b) => a.start - b.start || a.end - b.end || a.id.localeCompare(b.id));
}

/** For each item that overlaps another in its lane, the ids of the items it overlaps. */
export function findConflicts(items: readonly PlacedItem[]): Map<string, string[]> {
  const conflicts = new Map<string, string[]>();
  const byLane = new Map<string, PlacedItem[]>();
  for (const item of items) {
    const lane = byLane.get(item.laneId) ?? [];
    lane.push(item);
    byLane.set(item.laneId, lane);
  }
  for (const lane of byLane.values()) {
    const sorted = [...lane].sort((a, b) => a.start - b.start);
    for (let index = 0; index < sorted.length; index += 1) {
      const current = sorted[index];
      if (!current) {
        continue;
      }
      for (let next = index + 1; next < sorted.length; next += 1) {
        const other = sorted[next];
        if (!other || other.start >= current.end) {
          break;
        }
        conflicts.set(current.id, [...(conflicts.get(current.id) ?? []), other.id]);
        conflicts.set(other.id, [...(conflicts.get(other.id) ?? []), current.id]);
      }
    }
  }
  return conflicts;
}

/**
 * Assigns each item (sorted by start) to the first stacked row in its lane that is free at its start, so overlapping
 * items sit one above the other. Returns the number of rows each lane needs (at least 1).
 */
export function packRows(items: PlacedItem[]): Map<string, number> {
  const rowEnds = new Map<string, number[]>();
  for (const item of items) {
    const ends = rowEnds.get(item.laneId) ?? [];
    let row = ends.findIndex((end) => end <= item.start);
    if (row < 0) {
      row = ends.length;
      ends.push(item.end);
    } else {
      ends[row] = item.end;
    }
    item.row = row;
    rowEnds.set(item.laneId, ends);
  }
  return new Map([...rowEnds].map(([lane, ends]) => [lane, Math.max(1, ends.length)]));
}

/** Tick spacing candidates in minutes, from a quarter hour to a day. */
const TICK_STEPS = [15, 30, 60, 120, 180, 360, 720, 1440] as const;

/** The smallest tick step whose labels are at least `minPx` apart. */
export function chooseTickStep(pxPerMinute: number, minPx: number): number {
  return TICK_STEPS.find((step) => step * pxPerMinute >= minPx) ?? 1440;
}

/**
 * Tick instants every `stepMinutes` of wall-clock time from `start` (inclusive, rounded up to the grid) to `end`
 * (exclusive). Day-sized steps follow calendar days.
 */
export function timeTicks(
  start: number,
  end: number,
  stepMinutes: number,
  timeZone: string,
): number[] {
  const ticks: number[] = [];
  let tick = snapTime(start, Math.min(stepMinutes, 1440), timeZone, 'ceil');
  // Guard against runaway loops for absurd ranges.
  while (tick < end && ticks.length < 2000) {
    ticks.push(tick);
    tick =
      stepMinutes >= 1440
        ? addDays(tick, Math.round(stepMinutes / 1440), timeZone)
        : snapTime(tick + stepMinutes * MINUTE_MS, stepMinutes, timeZone);
  }
  return ticks;
}
