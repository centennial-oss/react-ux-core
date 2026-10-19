import { describe, expect, it } from 'vitest';
import { observatoryItems, WEEK_START } from '../../../test/schedule';
import {
  chooseTickStep,
  findConflicts,
  normalizeItems,
  packRows,
  timeTicks,
  type TimelineItem,
} from './layout';
import {
  addDays,
  fromZoned,
  snapTime,
  startOfDay,
  startOfWeek,
  wholeDays,
  zonedParts,
  zoneOffset,
} from './zone';

const HOUR = 3_600_000;

describe('zone arithmetic', () => {
  it('reads wall-clock parts and offsets in a time zone', () => {
    const instant = Date.UTC(2026, 9, 14, 21, 30);
    expect(zonedParts(instant, 'Asia/Tokyo')).toEqual({
      year: 2026,
      month: 10,
      day: 15,
      hour: 6,
      minute: 30,
      weekday: 4,
    });
    expect(zoneOffset(instant, 'Asia/Kathmandu')).toBe(5.75 * HOUR);
    expect(zoneOffset(instant, 'America/New_York')).toBe(-4 * HOUR);
  });

  it('finds the instant of a wall-clock time, rolling over and skipping DST gaps', () => {
    expect(fromZoned('Europe/Berlin', 2026, 10, 14, 9, 0)).toBe(Date.UTC(2026, 9, 14, 7, 0));
    expect(fromZoned('UTC', 2026, 10, 32)).toBe(Date.UTC(2026, 10, 1));
    // 02:30 doesn't exist on 8 March 2026 in New York; it resolves to 03:30 EDT.
    expect(fromZoned('America/New_York', 2026, 3, 8, 2, 30)).toBe(Date.UTC(2026, 2, 8, 7, 30));
  });

  it('finds day and week starts and adds calendar days across a DST change', () => {
    const instant = Date.UTC(2026, 9, 14, 21, 30);
    expect(startOfDay(instant, 'UTC')).toBe(Date.UTC(2026, 9, 14));
    expect(startOfDay(instant, 'Asia/Tokyo')).toBe(Date.UTC(2026, 9, 14, 15));
    expect(startOfWeek(instant, 'UTC', 1)).toBe(WEEK_START);
    expect(startOfWeek(instant, 'UTC', 0)).toBe(WEEK_START - 24 * HOUR);
    // Berlin leaves summer time on 25 October 2026: that day has 25 hours.
    const saturday = fromZoned('Europe/Berlin', 2026, 10, 24);
    expect(addDays(saturday, 1, 'Europe/Berlin') - saturday).toBe(24 * HOUR);
    expect(addDays(saturday, 2, 'Europe/Berlin') - saturday).toBe(49 * HOUR);
    expect(wholeDays(saturday, addDays(saturday, 2, 'Europe/Berlin'), 'Europe/Berlin')).toBe(2);
    expect(wholeDays(saturday, saturday + 6 * HOUR, 'Europe/Berlin')).toBeNull();
  });

  it('snaps to a wall-clock minute grid, even with a 45-minute offset', () => {
    const instant = Date.UTC(2026, 9, 14, 14, 7);
    expect(snapTime(instant, 15, 'UTC')).toBe(Date.UTC(2026, 9, 14, 14, 0));
    expect(snapTime(instant, 15, 'UTC', 'ceil')).toBe(Date.UTC(2026, 9, 14, 14, 15));
    expect(snapTime(Date.UTC(2026, 9, 14, 14, 8), 15, 'UTC')).toBe(Date.UTC(2026, 9, 14, 14, 15));
    // Kathmandu is UTC+5:45, so its local hours fall at :15 UTC.
    expect(snapTime(Date.UTC(2026, 9, 14, 14, 20), 60, 'Asia/Kathmandu')).toBe(
      Date.UTC(2026, 9, 14, 14, 15),
    );
  });
});

describe('timeline layout', () => {
  const items: TimelineItem[] = [
    { id: 'a', laneId: 'x', start: 0, end: 2 * HOUR, label: 'A' },
    { id: 'b', laneId: 'x', start: HOUR, end: 3 * HOUR, label: 'B' },
    { id: 'c', laneId: 'x', start: 2 * HOUR, end: 4 * HOUR, label: 'C' },
    { id: 'd', laneId: 'y', start: 0, end: HOUR, label: 'D' },
    { id: 'bad', laneId: 'y', start: 'not a date', end: HOUR, label: 'Bad' },
    { id: 'backwards', laneId: 'y', start: HOUR, end: 0, label: 'Backwards' },
    { id: 'outside', laneId: 'y', start: 10 * HOUR, end: 11 * HOUR, label: 'Outside' },
  ];

  it('keeps valid items in the range, sorted by start', () => {
    expect(normalizeItems(items, 0, 5 * HOUR).map((item) => item.id)).toEqual(['d', 'a', 'b', 'c']);
  });

  it('finds overlaps within a lane only (touching items don’t conflict)', () => {
    const conflicts = findConflicts(normalizeItems(items, 0, 5 * HOUR));
    expect(Object.fromEntries(conflicts)).toEqual({ a: ['b'], b: ['a', 'c'], c: ['b'] });
  });

  it('stacks overlapping items into rows', () => {
    const placed = normalizeItems(items, 0, 5 * HOUR);
    const rows = packRows(placed);
    expect(Object.fromEntries(rows)).toEqual({ x: 2, y: 1 });
    expect(Object.fromEntries(placed.map((item) => [item.id, item.row]))).toEqual({
      a: 0,
      b: 1,
      c: 0,
      d: 0,
    });
  });

  it('has 80 bookings and exactly 2 conflicts in the observatory week', () => {
    const placed = normalizeItems(observatoryItems, WEEK_START, WEEK_START + 7 * 24 * HOUR);
    expect(placed).toHaveLength(80);
    const conflicts = findConflicts(placed);
    expect([...conflicts.keys()].sort()).toEqual([
      'pier-2-2',
      'pier-2-7',
      'spectro-4',
      'spectro-7',
    ]);
  });

  it('chooses tick steps that leave room for labels and aligns ticks to the zone', () => {
    expect(chooseTickStep(1, 56)).toBe(60);
    expect(chooseTickStep(0.1, 44)).toBe(720);
    expect(chooseTickStep(0.01, 44)).toBe(1440);
    const start = Date.UTC(2026, 9, 14, 0, 10);
    expect(timeTicks(start, start + 3 * HOUR, 60, 'UTC')).toEqual([
      Date.UTC(2026, 9, 14, 1),
      Date.UTC(2026, 9, 14, 2),
      Date.UTC(2026, 9, 14, 3),
    ]);
    expect(timeTicks(WEEK_START, WEEK_START + 3 * 24 * HOUR, 1440, 'Asia/Tokyo')).toEqual([
      Date.UTC(2026, 9, 12, 15),
      Date.UTC(2026, 9, 13, 15),
      Date.UTC(2026, 9, 14, 15),
    ]);
  });
});
