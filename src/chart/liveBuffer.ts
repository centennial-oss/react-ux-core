// The points behind a LiveTimeSeries, outside React. New points wait in a pending queue until the chart's next
// animation frame moves them into the drawn arrays (or, while the chart is paused, until it resumes), and points
// older than the retention window are dropped from both, so memory never grows past `retainMs` of data.

import { toTime } from './format';

/** A drawn point: Chart.js's parsed shape (time in ms, value or null for a gap). */
export interface LivePoint {
  x: number;
  y: number | null;
}

export interface LiveBuffer {
  /** The drawn points for a series: the same array every time, mutated in place by `flush` and `prune`. */
  points: (seriesId: string) => LivePoint[];
  /** Queues points for a series (times as Date, ms or ISO strings). */
  append: (
    seriesId: string,
    points: readonly { t: Date | number | string; v: number | null }[],
  ) => void;
  /** Moves queued points into the drawn arrays, in time order. Returns whether anything moved. */
  flush: () => boolean;
  /**
   * Drops queued points, and drawn ones unless `shouldKeepDrawn` (a paused chart's frozen view), older than
   * `retainMs` before the latest point.
   */
  prune: (retainMs: number, shouldKeepDrawn?: boolean) => void;
  /** The number of queued points. */
  pendingCount: () => number;
  /** The latest time among drawn and queued points, or undefined when there are none. */
  latest: () => number | undefined;
  /** The number of drawn and queued points, across every series. */
  size: () => number;
  /** Drops every point. */
  clear: () => void;
}

/** Index of the first point at or after `time` (points sorted by time). */
function firstAtOrAfter(points: readonly LivePoint[], time: number): number {
  let low = 0;
  let high = points.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if ((points[middle]?.x ?? 0) < time) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low;
}

export function createLiveBuffer(): LiveBuffer {
  const drawn = new Map<string, LivePoint[]>();
  const pending = new Map<string, LivePoint[]>();
  let latestTime: number | undefined;

  const drawnFor = (id: string) => {
    let points = drawn.get(id);
    if (!points) {
      points = [];
      drawn.set(id, points);
    }
    return points;
  };

  return {
    points: drawnFor,
    append(id, points) {
      const queue = pending.get(id) ?? [];
      for (const point of points) {
        const x = toTime(point.t);
        if (!Number.isFinite(x)) {
          continue;
        }
        queue.push({ x, y: point.v });
        latestTime = latestTime === undefined ? x : Math.max(latestTime, x);
      }
      pending.set(id, queue);
    },
    flush() {
      let hasMoved = false;
      for (const [id, queue] of pending) {
        if (queue.length === 0) {
          continue;
        }
        const points = drawnFor(id);
        const last = points.at(-1)?.x ?? Number.NEGATIVE_INFINITY;
        let isOrdered = true;
        let previous = last;
        for (const point of queue) {
          isOrdered &&= point.x >= previous;
          previous = point.x;
          points.push(point);
        }
        if (!isOrdered) {
          points.sort((a, b) => a.x - b.x);
        }
        hasMoved = true;
      }
      pending.clear();
      return hasMoved;
    },
    prune(retainMs, shouldKeepDrawn = false) {
      if (latestTime === undefined) {
        return;
      }
      const cutoff = latestTime - retainMs;
      if (!shouldKeepDrawn) {
        for (const points of drawn.values()) {
          const start = firstAtOrAfter(points, cutoff);
          if (start > 0) {
            points.splice(0, start);
          }
        }
      }
      for (const [id, queue] of pending) {
        // Queues are almost always in time order, so the first point says whether any are old.
        if ((queue[0]?.x ?? cutoff) < cutoff) {
          pending.set(
            id,
            queue.filter((point) => point.x >= cutoff),
          );
        }
      }
    },
    pendingCount() {
      let count = 0;
      for (const queue of pending.values()) {
        count += queue.length;
      }
      return count;
    },
    latest: () => latestTime,
    size() {
      let count = 0;
      for (const points of drawn.values()) {
        count += points.length;
      }
      for (const queue of pending.values()) {
        count += queue.length;
      }
      return count;
    },
    clear() {
      for (const points of drawn.values()) {
        points.length = 0;
      }
      pending.clear();
      latestTime = undefined;
    },
  };
}
