// Snapped time edits shared by ScheduleTimeline and EventCalendar: stepping a time one snap with the keyboard, and
// where a move, a resize from either end, or a new item lands after a drag.
import { clamp } from '../../utils/math';
import { MINUTE_MS, snapTime } from './zone';

/** What a drag does to an item's times: moves it, moves its start or its end, or draws out a new one. */
export type TimeEditKind = 'move' | 'start' | 'end' | 'create';

/** The time one snap after (`direction` 1) or before (-1) `ms`, on the snap grid. */
export function stepSnapped(
  ms: number,
  direction: 1 | -1,
  snapMinutes: number,
  timeZone: string,
): number {
  const snapMs = Math.max(1, snapMinutes) * MINUTE_MS;
  return direction > 0
    ? snapTime(ms, snapMinutes, timeZone, 'floor') + snapMs
    : snapTime(ms, snapMinutes, timeZone, 'ceil') - snapMs;
}

/**
 * Where an item from `start` to `end` lands after a drag of `deltaMs`, snapped to `snapMinutes`: moved whole, or its
 * start or end moved (keeping at least one snap). For `create`, `start` is the pressed time and the result spans from
 * there to the pointer's time, kept within `bounds` and at least one snap long.
 */
export function editTimes(
  kind: TimeEditKind,
  start: number,
  end: number,
  deltaMs: number,
  snapMinutes: number,
  timeZone: string,
  bounds: { start: number; end: number },
): { start: number; end: number } {
  const snapMs = Math.max(1, snapMinutes) * MINUTE_MS;
  switch (kind) {
    case 'move': {
      const moved = snapTime(start + deltaMs, snapMinutes, timeZone);
      return { start: moved, end: moved + (end - start) };
    }
    case 'start':
      return {
        start: Math.min(end - snapMs, snapTime(start + deltaMs, snapMinutes, timeZone)),
        end,
      };
    case 'end':
      return {
        start,
        end: Math.max(start + snapMs, snapTime(end + deltaMs, snapMinutes, timeZone)),
      };
    default: {
      const anchor = snapTime(start, snapMinutes, timeZone, 'floor');
      const current = clamp(
        snapTime(start + deltaMs, snapMinutes, timeZone),
        bounds.start,
        bounds.end,
      );
      const from = Math.min(anchor, current);
      const to = Math.max(anchor, current);
      return { start: from, end: to === from ? from + snapMs : to };
    }
  }
}
