import { describe, expect, it } from 'vitest';
import {
  dayBoundaries,
  dayIndexOf,
  layoutDayRows,
  layoutTimed,
  minuteOfDay,
  normalizeEntries,
  periodOf,
  viewRange,
  type CalendarEntry,
  type EventCalendarItem,
} from './layout';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const utc = (month: number, day: number, hour = 0, minute = 0) =>
  Date.UTC(2026, month - 1, day, hour, minute);
const everything = { start: -Infinity, end: Infinity };

function entry(id: string, start: number, end: number, isAllDay = false): CalendarEntry {
  return {
    id,
    start,
    end,
    isAllDay,
    isLong: isAllDay || end - start >= DAY,
    item: { id, label: id, start, end },
  };
}

describe('normalizeEntries', () => {
  it('reads all-day dates as days in the zone, end exclusive, at least one day', () => {
    const items: EventCalendarItem[] = [
      { id: 'a', label: 'A', start: '2026-10-14', end: '2026-10-16', isAllDay: true },
      { id: 'b', label: 'B', start: '2026-10-20', end: '2026-10-20', isAllDay: true },
      // An instant mid-day: the whole day it's on.
      { id: 'c', label: 'C', start: utc(10, 21, 15), end: utc(10, 21, 16), isAllDay: true },
    ];
    const [a, b, c] = normalizeEntries(items, everything, 'America/New_York');
    expect(a).toMatchObject({ id: 'a', start: utc(10, 14, 4), end: utc(10, 16, 4), isLong: true });
    expect(b).toMatchObject({ start: utc(10, 20, 4), end: utc(10, 21, 4) });
    expect(c).toMatchObject({ start: utc(10, 21, 4), end: utc(10, 22, 4) });
  });

  it('leaves out invalid and reversed events and those outside the range, and sorts longer first', () => {
    const items: EventCalendarItem[] = [
      { id: 'short', label: '', start: utc(10, 14, 9), end: utc(10, 14, 10) },
      { id: 'long', label: '', start: utc(10, 14, 9), end: utc(10, 15, 12) },
      { id: 'bad', label: '', start: 'not a date', end: utc(10, 14, 10) },
      { id: 'reversed', label: '', start: utc(10, 14, 10), end: utc(10, 14, 9) },
      { id: 'outside', label: '', start: utc(11, 3), end: utc(11, 4) },
    ];
    const entries = normalizeEntries(items, { start: utc(10, 1), end: utc(11, 1) }, 'UTC');
    expect(entries.map((each) => each.id)).toEqual(['long', 'short']);
    expect(entries.map((each) => each.isLong)).toEqual([true, false]);
  });
});

describe('periodOf and viewRange', () => {
  const wednesday = utc(10, 14, 10, 30);

  it('shows the whole weeks around a month, from the week’s first day', () => {
    expect(viewRange('month', wednesday, 'UTC', 1)).toEqual({ start: utc(9, 28), end: utc(11, 2) });
    expect(viewRange('month', wednesday, 'UTC', 0)).toEqual({ start: utc(9, 27), end: utc(11, 1) });
    expect(periodOf('month', wednesday, 'UTC', 1)).toEqual({ start: utc(10, 1), end: utc(11, 1) });
  });

  it('shows a week, a day, and the month for the agenda', () => {
    expect(viewRange('week', wednesday, 'UTC', 1)).toEqual({
      start: utc(10, 12),
      end: utc(10, 19),
    });
    expect(viewRange('day', wednesday, 'UTC', 1)).toEqual({ start: utc(10, 14), end: utc(10, 15) });
    expect(viewRange('agenda', wednesday, 'UTC', 1)).toEqual({
      start: utc(10, 1),
      end: utc(11, 1),
    });
  });

  it('keeps calendar days across a daylight-saving change', () => {
    // Europe/London leaves summer time on Sunday 25 October 2026.
    const range = viewRange('week', utc(10, 22), 'Europe/London', 1);
    const days = dayBoundaries(range, 'Europe/London');
    expect(days).toHaveLength(8);
    expect((days[7] ?? 0) - (days[6] ?? 0)).toBe(25 * HOUR);
    expect(minuteOfDay(utc(10, 25, 12), days[6] ?? 0, days[7] ?? 0, 'Europe/London')).toBe(12 * 60);
  });
});

describe('dayIndexOf', () => {
  it('finds the day holding an instant', () => {
    const days = dayBoundaries({ start: utc(10, 12), end: utc(10, 19) }, 'UTC');
    expect(dayIndexOf(days, utc(10, 12))).toBe(0);
    expect(dayIndexOf(days, utc(10, 14, 23, 59))).toBe(2);
    expect(dayIndexOf(days, utc(10, 11, 23))).toBe(-1);
    expect(dayIndexOf(days, utc(10, 19, 1))).toBe(7);
  });
});

describe('layoutDayRows', () => {
  const days = dayBoundaries({ start: utc(9, 28), end: utc(11, 9) }, 'UTC');

  it('splits bars at week ends and stacks them, longest first, before timed events', () => {
    const rows = layoutDayRows(
      [
        entry('trip', utc(10, 2, 15), utc(10, 6, 11)),
        entry('offsite', utc(10, 5), utc(10, 8), true),
        entry('call', utc(10, 5, 9), utc(10, 5, 10)),
      ],
      days,
      7,
      4,
    );
    expect(rows).toHaveLength(6);
    const [first, second] = rows;
    expect(first?.segments).toEqual([
      expect.objectContaining({ first: 4, last: 6, row: 0, isBar: true, hasMoreAfter: true }),
    ]);
    expect(
      second?.segments.map(({ entry: { id }, first: from, last, row, hasMoreBefore }) => ({
        id,
        from,
        last,
        row,
        hasMoreBefore,
      })),
    ).toEqual([
      { id: 'offsite', from: 0, last: 2, row: 0, hasMoreBefore: false },
      { id: 'trip', from: 0, last: 1, row: 1, hasMoreBefore: true },
      { id: 'call', from: 0, last: 0, row: 2, hasMoreBefore: false },
    ]);
    expect(second?.counts).toEqual([3, 2, 1, 0, 0, 0, 0]);
  });

  it('keeps maxRows per day and counts the rest, hiding a bar where any of its days overflows', () => {
    const rows = layoutDayRows(
      [
        entry('b1', utc(10, 12), utc(10, 15), true),
        entry('b2', utc(10, 12), utc(10, 14), true),
        entry('b3', utc(10, 13), utc(10, 16), true),
        entry('t', utc(10, 13, 9), utc(10, 13, 10)),
        entry('m', utc(10, 15, 9), utc(10, 15, 10)),
      ],
      days,
      7,
      3,
    );
    const week = rows[2];
    // Tuesday has 4: two shown and "+2 more". B3 can't show there, so Wednesday and Thursday count it too.
    expect(week?.counts).toEqual([2, 4, 2, 2, 0, 0, 0]);
    expect(week?.hidden).toEqual([0, 2, 1, 1, 0, 0, 0]);
    expect(week?.segments.map((segment) => segment.entry.id)).toEqual(['b1', 'b2', 'm']);
  });

  it('shows every row with no limit', () => {
    const busy = Array.from({ length: 6 }, (_, index) =>
      entry(`m${String(index)}`, utc(10, 14, 9 + index), utc(10, 14, 10 + index)),
    );
    const [, , week] = layoutDayRows(busy, days, 7, Infinity);
    expect(week?.segments).toHaveLength(6);
    expect(week?.hidden[2]).toBe(0);
  });
});

describe('layoutTimed', () => {
  const days = dayBoundaries({ start: utc(10, 14), end: utc(10, 16) }, 'UTC');

  it('places overlapping events side by side and splits events across midnight', () => {
    const columns = layoutTimed(
      [
        entry('a', utc(10, 14, 9), utc(10, 14, 11)),
        entry('b', utc(10, 14, 10), utc(10, 14, 12)),
        entry('c', utc(10, 14, 11), utc(10, 14, 13)),
        entry('d', utc(10, 14, 14), utc(10, 14, 15)),
        entry('late', utc(10, 14, 22), utc(10, 15, 2)),
        entry('long', utc(10, 14), utc(10, 15), true),
      ],
      days,
      'UTC',
      25,
    );
    const [wednesday = [], thursday = []] = columns;
    expect(
      wednesday.map(({ entry: { id }, column, columns: of, startMinute, endMinute }) => ({
        id,
        column,
        of,
        startMinute,
        endMinute,
      })),
    ).toEqual([
      { id: 'a', column: 0, of: 2, startMinute: 540, endMinute: 660 },
      { id: 'b', column: 1, of: 2, startMinute: 600, endMinute: 720 },
      { id: 'c', column: 0, of: 2, startMinute: 660, endMinute: 780 },
      { id: 'd', column: 0, of: 1, startMinute: 840, endMinute: 900 },
      { id: 'late', column: 0, of: 1, startMinute: 1320, endMinute: 1440 },
    ]);
    expect(thursday).toEqual([
      expect.objectContaining({ startMinute: 0, endMinute: 120, hasMoreBefore: true }),
    ]);
  });

  it('treats very short events as tall as they are drawn', () => {
    const [column = []] = layoutTimed(
      [
        entry('a', utc(10, 14, 9), utc(10, 14, 9, 5)),
        entry('b', utc(10, 14, 9, 10), utc(10, 14, 10)),
      ],
      days,
      'UTC',
      25,
    );
    expect(column.map((segment) => segment.columns)).toEqual([2, 2]);
  });
});
