// GanttChart's time scale: the zoom levels, calendar units (hours to years) in a time zone, the ticks between them,
// the default range around the tasks, keyboard steps, and the non-working time to shade. Built on ScheduleTimeline's
// wall-clock arithmetic (zone.ts) and its tick spacing (layout.ts).
import { DAY_MS } from '../../utils/time';
import { timeTicks } from '../ScheduleTimeline/layout';
import { stepSnapped } from '../ScheduleTimeline/timeEdit';
import {
  addDays,
  fromZoned,
  MINUTE_MS,
  snapTime,
  startOfDay,
  startOfWeek,
  zonedParts,
} from '../ScheduleTimeline/zone';
import type { GanttZoom } from './types';

/** A calendar unit the scale is divided into. */
export type TimeUnit = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface ZoomScale {
  /** One column of the scale (the header's bottom row). */
  unit: TimeUnit;
  /** The header's top row. */
  major: TimeUnit;
  /** Pixels per day. */
  pxPerDay: number;
  /** Moves and resizes snap to this many minutes unless the app says otherwise. */
  snapMinutes: number;
  /** Whether non-working days are shaded (they're too thin to see from months up). */
  isShaded: boolean;
}

/** From the closest zoom to the farthest. */
export const ZOOMS: readonly GanttZoom[] = ['hour', 'day', 'week', 'month', 'quarter'];

export const ZOOM_SCALES: Readonly<Record<GanttZoom, ZoomScale>> = {
  hour: { unit: 'hour', major: 'day', pxPerDay: 48 * 24, snapMinutes: 15, isShaded: true },
  day: { unit: 'day', major: 'month', pxPerDay: 40, snapMinutes: 1440, isShaded: true },
  week: { unit: 'week', major: 'month', pxPerDay: 16, snapMinutes: 1440, isShaded: true },
  month: { unit: 'month', major: 'year', pxPerDay: 4, snapMinutes: 1440, isShaded: false },
  quarter: { unit: 'quarter', major: 'year', pxPerDay: 1.5, snapMinutes: 1440, isShaded: false },
};

export const HOUR_MS = 60 * MINUTE_MS;
/** Guards tick loops against absurd ranges. */
const MAX_TICKS = 5000;

/** The start of the `unit` that contains `ms` in `timeZone` (weeks start on `firstDay`, 0 = Sunday). */
export function unitStart(ms: number, unit: TimeUnit, timeZone: string, firstDay: number): number {
  switch (unit) {
    case 'hour':
      return snapTime(ms, 60, timeZone, 'floor');
    case 'day':
      return startOfDay(ms, timeZone);
    case 'week':
      return startOfWeek(ms, timeZone, firstDay);
    default: {
      const { year, month } = zonedParts(ms, timeZone);
      if (unit === 'year') {
        return fromZoned(timeZone, year, 1, 1);
      }
      return fromZoned(timeZone, year, unit === 'quarter' ? month - ((month - 1) % 3) : month, 1);
    }
  }
}

/** `ms` moved by `count` units of wall-clock time (calendar days, months and years, so DST changes don't shift it). */
export function addUnits(ms: number, unit: TimeUnit, count: number, timeZone: string): number {
  switch (unit) {
    case 'hour':
      return ms + count * HOUR_MS;
    case 'day':
      return addDays(ms, count, timeZone);
    case 'week':
      return addDays(ms, 7 * count, timeZone);
    default: {
      const { year, month, day, hour, minute } = zonedParts(ms, timeZone);
      const months = unit === 'year' ? 12 * count : unit === 'quarter' ? 3 * count : count;
      return fromZoned(timeZone, year, month + months, day, hour, minute);
    }
  }
}

/** The starts of every `unit` that overlaps `[start, end)`, the first at or before `start`. */
export function unitTicks(
  start: number,
  end: number,
  unit: TimeUnit,
  timeZone: string,
  firstDay: number,
): number[] {
  const first = unitStart(start, unit, timeZone, firstDay);
  if (unit === 'hour' || unit === 'day') {
    return timeTicks(first, end, unit === 'hour' ? 60 : 1440, timeZone);
  }
  const ticks: number[] = [];
  for (let tick = first; tick < end && ticks.length < MAX_TICKS;) {
    ticks.push(tick);
    tick = addUnits(tick, unit, 1, timeZone);
  }
  return ticks;
}

/**
 * The range the timeline covers by default: the tasks' dates (`extent`) with a column of room before and two after,
 * on column boundaries. Without tasks, two weeks' worth of columns from the one holding `now`.
 */
export function defaultRange(
  extent: readonly [number, number] | undefined,
  zoom: GanttZoom,
  timeZone: string,
  firstDay: number,
  now: number,
): { start: number; end: number } {
  const { unit } = ZOOM_SCALES[zoom];
  const [min, max] = extent ?? [now, now];
  const start = addUnits(unitStart(min, unit, timeZone, firstDay), unit, -1, timeZone);
  const end = addUnits(unitStart(max, unit, timeZone, firstDay), unit, extent ? 2 : 14, timeZone);
  return { start, end };
}

/** One keyboard step of `snapMinutes` from `ms`, to the next snapped time in `direction` (`-1` earlier, `1` later). */
export function stepTime(
  ms: number,
  direction: -1 | 1,
  snapMinutes: number,
  timeZone: string,
): number {
  // A day step across a daylight-saving change lands an hour off midnight; snapping again puts it back.
  return snapTime(stepSnapped(ms, direction, snapMinutes, timeZone), snapMinutes, timeZone);
}

/** The hours of a working day, from `start` (inclusive) to `end` (exclusive), 0–24. */
export interface GanttWorkingHours {
  start: number;
  end: number;
}

/**
 * The non-working stretches of `[start, end)` as `[from, to)` pairs, neighbours merged: whole days that aren't in
 * `workingDays` (0 = Sunday), and with `workingHours`, the hours outside them on working days.
 */
export function nonWorkingSpans(
  start: number,
  end: number,
  timeZone: string,
  workingDays: ReadonlySet<number>,
  workingHours?: GanttWorkingHours,
): [number, number][] {
  const spans: [number, number][] = [];
  const add = (from: number, to: number) => {
    if (to <= from) {
      return;
    }
    const last = spans.at(-1);
    if (last && last[1] >= from) {
      last[1] = Math.max(last[1], to);
    } else {
      spans.push([from, to]);
    }
  };
  let day = startOfDay(start, timeZone);
  let { year, month, day: date, weekday } = zonedParts(day, timeZone);
  for (let count = 0; day < end && count < MAX_TICKS; count += 1) {
    const next = fromZoned(timeZone, year, month, date + 1);
    if (!workingDays.has(weekday)) {
      add(day, next);
    } else if (workingHours) {
      add(day, Math.min(next, fromZoned(timeZone, year, month, date, workingHours.start)));
      add(Math.max(day, fromZoned(timeZone, year, month, date, workingHours.end)), next);
    }
    day = next;
    ({ year, month, day: date } = zonedParts(day, timeZone));
    weekday = (weekday + 1) % 7;
  }
  return spans;
}

/** Pixels per millisecond at a zoom. */
export function pxPerMsAt(zoom: GanttZoom): number {
  return ZOOM_SCALES[zoom].pxPerDay / DAY_MS;
}
