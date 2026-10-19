// EventCalendar's pure layout: events as instants in the calendar's time zone, each view's visible range and days,
// bars packed into rows over runs of days (month weeks and the all-day row) with what doesn't fit counted for "+N
// more", and timed events placed side by side in day columns. Every pass is one sort plus linear work, so hundreds of
// events in a month and dense weeks lay out in a few milliseconds.
import { toEpochMs, type Instant } from '../../utils/time';
import type { TimelineItem } from '../ScheduleTimeline/layout';
import {
  addDays,
  DAY_MS,
  fromZoned,
  MINUTE_MS,
  startOfDay,
  startOfWeek,
  zonedParts,
} from '../ScheduleTimeline/zone';

export type EventCalendarView = 'month' | 'week' | 'day' | 'agenda';

/**
 * An event: ScheduleTimeline's item, so the same events can feed both. Its `laneId` is optional here and unused.
 */
export interface EventCalendarItem extends Omit<TimelineItem, 'laneId'> {
  laneId?: string;
  /**
   * All day: drawn in the all-day row and as a bar in the month. Its start and end are read as days in the calendar's
   * time zone, the end exclusive: a one-day event on 14 October runs from `2026-10-14` to `2026-10-15`. Events of 24
   * hours or more are drawn there too.
   */
  isAllDay?: boolean;
}

/** A new event drawn out by drag or added with Enter. */
export interface EventCalendarDraft {
  start: Date;
  end: Date;
  isAllDay: boolean;
}

/** An event with its instants as epoch milliseconds. */
export interface CalendarEntry {
  item: EventCalendarItem;
  id: string;
  start: number;
  end: number;
  /** The `isAllDay` flag. */
  isAllDay: boolean;
  /** Drawn as a bar in the week and day views' all-day row: all day, or 24 hours or more. */
  isLong: boolean;
}

export interface MsRange {
  start: number;
  end: number;
}

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Midnight at the start of `value`'s day; a date-only ISO string is that day in `timeZone`, not in UTC. */
function dayOf(value: Instant, timeZone: string): number {
  if (typeof value === 'string') {
    const match = ISO_DAY.exec(value);
    if (match) {
      return fromZoned(timeZone, Number(match[1]), Number(match[2]), Number(match[3]));
    }
  }
  const ms = toEpochMs(value);
  return Number.isFinite(ms) ? startOfDay(ms, timeZone) : Number.NaN;
}

/** An all-day event's end: the midnight at or after it (end exclusive). */
function dayEndOf(value: Instant, timeZone: string): number {
  const day = dayOf(value, timeZone);
  const ms = typeof value === 'string' && ISO_DAY.test(value) ? day : toEpochMs(value);
  return ms === day ? day : addDays(day, 1, timeZone);
}

/**
 * The events that overlap `range`, with numeric times, sorted by start, longer first. All-day events snap to whole
 * days (at least one). Events with invalid times, or that end before they start, are left out.
 */
export function normalizeEntries(
  items: readonly EventCalendarItem[],
  range: MsRange,
  timeZone: string,
): CalendarEntry[] {
  const entries: CalendarEntry[] = [];
  for (const item of items) {
    const isAllDay = item.isAllDay === true;
    let start: number;
    let end: number;
    if (isAllDay) {
      start = dayOf(item.start, timeZone);
      end = dayEndOf(item.end, timeZone);
      if (Number.isFinite(start) && Number.isFinite(end) && end <= start) {
        end = addDays(start, 1, timeZone);
      }
    } else {
      start = toEpochMs(item.start);
      end = toEpochMs(item.end);
    }
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      if (start < range.end && end > range.start) {
        entries.push({
          item,
          id: item.id,
          start,
          end,
          isAllDay,
          isLong: isAllDay || end - start >= DAY_MS,
        });
      }
    }
  }
  return entries.sort((a, b) => a.start - b.start || b.end - a.end || a.id.localeCompare(b.id));
}

/** The month, week or day containing `anchor` (the agenda shows a month). */
export function periodOf(
  view: EventCalendarView,
  anchor: number,
  timeZone: string,
  firstDay: number,
): MsRange {
  if (view === 'day') {
    const start = startOfDay(anchor, timeZone);
    return { start, end: addDays(start, 1, timeZone) };
  }
  if (view === 'week') {
    const start = startOfWeek(anchor, timeZone, firstDay);
    return { start, end: addDays(start, 7, timeZone) };
  }
  const { year, month } = zonedParts(anchor, timeZone);
  return {
    start: fromZoned(timeZone, year, month, 1),
    end: fromZoned(timeZone, year, month + 1, 1),
  };
}

/** What a view shows around `anchor`: its period, and for the month, the whole weeks that hold it. */
export function viewRange(
  view: EventCalendarView,
  anchor: number,
  timeZone: string,
  firstDay: number,
): MsRange {
  const period = periodOf(view, anchor, timeZone, firstDay);
  if (view !== 'month') {
    return period;
  }
  const lastWeek = startOfWeek(addDays(period.end, -1, timeZone), timeZone, firstDay);
  return {
    start: startOfWeek(period.start, timeZone, firstDay),
    end: addDays(lastWeek, 7, timeZone),
  };
}

/** The midnights from `range.start` up to and including `range.end`: n days have n + 1 boundaries. */
export function dayBoundaries(range: MsRange, timeZone: string): number[] {
  const days = [range.start];
  let day = range.start;
  // Guard against runaway loops for absurd ranges.
  while (day < range.end && days.length < 400) {
    day = addDays(day, 1, timeZone);
    days.push(day);
  }
  return days;
}

/** The index of the day holding `ms` in `days` (boundaries), -1 before the first and `days.length - 1` after. */
export function dayIndexOf(days: readonly number[], ms: number): number {
  let low = 0;
  let high = days.length;
  // The number of boundaries at or before ms, less one.
  while (low < high) {
    const middle = (low + high) >> 1;
    if ((days[middle] ?? 0) <= ms) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low - 1;
}

/** An event's span of days in `days`, clipped to them: [first, last], both included. */
function daySpan(days: readonly number[], start: number, end: number): [number, number] {
  const count = days.length - 1;
  return [
    Math.max(0, dayIndexOf(days, start)),
    Math.min(count - 1, dayIndexOf(days, Math.max(start, end - 1))),
  ];
}

/** An event drawn across a run of days in one row of days (a month week, or the all-day row). */
export interface BarSegment {
  entry: CalendarEntry;
  /** The first and last day columns it covers, within its row. */
  first: number;
  last: number;
  /** Its stacked row (0 = top). */
  row: number;
  /** Whether it spans days (drawn as a bar), rather than a timed event within one day (a chip). */
  isBar: boolean;
  /** Whether the event goes on before or after this segment. */
  hasMoreBefore: boolean;
  hasMoreAfter: boolean;
}

/** One row of days: its visible segments, and each day's event count and how many of those don't fit. */
export interface DayRowLayout {
  segments: BarSegment[];
  counts: number[];
  hidden: number[];
}

/**
 * Splits `entries` into rows of `columns` days over `days` (boundaries), stacks each row's segments into rows
 * (longest and earliest first) and keeps `maxRows` of them per day: a day with more shows `maxRows - 1` and a "+N
 * more" in the last place. A segment shows only where it fits on every day it covers.
 */
export function layoutDayRows(
  entries: readonly CalendarEntry[],
  days: readonly number[],
  columns: number,
  maxRows: number,
): DayRowLayout[] {
  const dayCount = days.length - 1;
  const rowCount = Math.max(1, Math.ceil(dayCount / columns));
  const pending: BarSegment[][] = Array.from({ length: rowCount }, () => []);
  for (const entry of entries) {
    const [first, last] = daySpan(days, entry.start, entry.end);
    if (last < first) {
      continue;
    }
    const isBar = entry.isLong || first !== last;
    for (let row = Math.floor(first / columns); row <= Math.floor(last / columns); row += 1) {
      const rowStart = row * columns;
      const segmentFirst = Math.max(first, rowStart);
      const segmentLast = Math.min(last, rowStart + columns - 1);
      pending[row]?.push({
        entry,
        first: segmentFirst - rowStart,
        last: segmentLast - rowStart,
        row: 0,
        isBar,
        hasMoreBefore: entry.start < (days[segmentFirst] ?? entry.start),
        hasMoreAfter: entry.end > (days[segmentLast + 1] ?? entry.end),
      });
    }
  }
  return pending.map((segments) => {
    segments.sort(
      (a, b) =>
        a.first - b.first ||
        Number(b.isBar) - Number(a.isBar) ||
        b.last - b.first - (a.last - a.first) ||
        a.entry.start - b.entry.start,
    );
    const counts = new Array<number>(columns).fill(0);
    const rowEnds: number[] = [];
    for (const segment of segments) {
      let row = rowEnds.findIndex((end) => end < segment.first);
      if (row < 0) {
        row = rowEnds.length;
      }
      rowEnds[row] = segment.last;
      segment.row = row;
      for (let column = segment.first; column <= segment.last; column += 1) {
        counts[column] = (counts[column] ?? 0) + 1;
      }
    }
    const limit = counts.map((count) => (count > maxRows ? maxRows - 1 : maxRows));
    const shown = new Array<number>(columns).fill(0);
    const visible = segments.filter((segment) => {
      for (let column = segment.first; column <= segment.last; column += 1) {
        if (segment.row >= (limit[column] ?? 0)) {
          return false;
        }
      }
      for (let column = segment.first; column <= segment.last; column += 1) {
        shown[column] = (shown[column] ?? 0) + 1;
      }
      return true;
    });
    return {
      segments: visible,
      counts,
      hidden: counts.map((count, column) => count - (shown[column] ?? 0)),
    };
  });
}

/** A timed event's part within one day column, placed beside the events it overlaps. */
export interface TimedSegment {
  entry: CalendarEntry;
  day: number;
  /** Wall-clock minutes from the day's midnight. */
  startMinute: number;
  endMinute: number;
  /** Its column among the events it overlaps, and how many columns they need. */
  column: number;
  columns: number;
  hasMoreBefore: boolean;
  hasMoreAfter: boolean;
}

/** Wall-clock minutes from `dayStart` to `ms` (exact on days a daylight-saving change makes shorter or longer). */
export function minuteOfDay(
  ms: number,
  dayStart: number,
  dayEnd: number,
  timeZone: string,
): number {
  if (ms >= dayEnd) {
    return 1440;
  }
  if (dayEnd - dayStart === DAY_MS) {
    return (ms - dayStart) / MINUTE_MS;
  }
  const { hour, minute } = zonedParts(ms, timeZone);
  return hour * 60 + minute;
}

/**
 * The timed (not long) entries split into day columns over `days`, each day's sorted by start and placed in columns
 * so overlapping events sit side by side. Events shorter than `minMinutes` count as that long, since they're drawn
 * at least that tall.
 */
export function layoutTimed(
  entries: readonly CalendarEntry[],
  days: readonly number[],
  timeZone: string,
  minMinutes: number,
): TimedSegment[][] {
  const dayCount = days.length - 1;
  const columns: TimedSegment[][] = Array.from({ length: dayCount }, () => []);
  for (const entry of entries) {
    if (entry.isLong) {
      continue;
    }
    const [first, last] = daySpan(days, entry.start, entry.end);
    for (let day = first; day <= last; day += 1) {
      const dayStart = days[day] ?? 0;
      const dayEnd = days[day + 1] ?? dayStart;
      const start = Math.max(entry.start, dayStart);
      const end = Math.min(entry.end, dayEnd);
      if (end <= start) {
        continue;
      }
      columns[day]?.push({
        entry,
        day,
        startMinute: minuteOfDay(start, dayStart, dayEnd, timeZone),
        endMinute: minuteOfDay(end, dayStart, dayEnd, timeZone),
        column: 0,
        columns: 1,
        hasMoreBefore: entry.start < dayStart,
        hasMoreAfter: entry.end > dayEnd,
      });
    }
  }
  for (const segments of columns) {
    segments.sort((a, b) => a.startMinute - b.startMinute || b.endMinute - a.endMinute);
    let group: TimedSegment[] = [];
    let columnEnds: number[] = [];
    let groupEnd = -1;
    const closeGroup = () => {
      for (const segment of group) {
        segment.columns = columnEnds.length;
      }
      group = [];
      columnEnds = [];
    };
    for (const segment of segments) {
      if (segment.startMinute >= groupEnd) {
        closeGroup();
      }
      const end = Math.max(segment.endMinute, segment.startMinute + minMinutes);
      let column = columnEnds.findIndex((columnEnd) => columnEnd <= segment.startMinute);
      if (column < 0) {
        column = columnEnds.length;
      }
      columnEnds[column] = end;
      segment.column = column;
      group.push(segment);
      groupEnd = Math.max(groupEnd, end);
    }
    closeGroup();
  }
  return columns;
}
