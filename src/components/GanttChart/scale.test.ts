import { describe, expect, it } from 'vitest';
import {
  addUnits,
  defaultRange,
  nonWorkingSpans,
  stepTime,
  unitStart,
  unitTicks,
  ZOOM_SCALES,
} from './scale';

const HOUR = 3_600_000;
const utc = (month: number, date: number, hour = 0) => Date.UTC(2026, month - 1, date, hour);

describe('unitStart and addUnits', () => {
  // Wednesday 14 October 2026, 10:30 UTC.
  const at = utc(10, 14, 10) + 30 * 60_000;

  it('finds the start of each unit', () => {
    expect(unitStart(at, 'hour', 'UTC', 1)).toBe(utc(10, 14, 10));
    expect(unitStart(at, 'day', 'UTC', 1)).toBe(utc(10, 14));
    expect(unitStart(at, 'week', 'UTC', 1)).toBe(utc(10, 12));
    expect(unitStart(at, 'week', 'UTC', 0)).toBe(utc(10, 11));
    expect(unitStart(at, 'month', 'UTC', 1)).toBe(utc(10, 1));
    expect(unitStart(at, 'quarter', 'UTC', 1)).toBe(utc(10, 1));
    expect(unitStart(utc(8, 20), 'quarter', 'UTC', 1)).toBe(utc(7, 1));
    expect(unitStart(at, 'year', 'UTC', 1)).toBe(Date.UTC(2026, 0, 1));
  });

  it('adds calendar units, rolling into the next year', () => {
    expect(addUnits(utc(10, 1), 'month', 3, 'UTC')).toBe(Date.UTC(2027, 0, 1));
    expect(addUnits(utc(10, 1), 'quarter', -1, 'UTC')).toBe(utc(7, 1));
    expect(addUnits(utc(10, 12), 'week', 1, 'UTC')).toBe(utc(10, 19));
    expect(addUnits(utc(10, 12, 9), 'hour', 2, 'UTC')).toBe(utc(10, 12, 11));
  });

  it('keeps wall-clock days across a daylight-saving change', () => {
    // Clocks go back in London on Sunday 25 October 2026.
    const saturday = Date.UTC(2026, 9, 23, 23); // Midnight on the 24th in London (BST).
    const monday = addUnits(saturday, 'day', 2, 'Europe/London');
    expect(monday).toBe(Date.UTC(2026, 9, 26)); // Midnight on the 26th (GMT).
    expect(unitStart(monday + 5 * HOUR, 'day', 'Europe/London', 1)).toBe(monday);
  });
});

describe('unitTicks', () => {
  it('lists the units overlapping a range, the first at or before its start', () => {
    expect(unitTicks(utc(10, 14, 12), utc(10, 17), 'day', 'UTC', 1)).toEqual([
      utc(10, 14),
      utc(10, 15),
      utc(10, 16),
    ]);
    expect(unitTicks(utc(10, 20), utc(12, 2), 'month', 'UTC', 1)).toEqual([
      utc(10, 1),
      utc(11, 1),
      utc(12, 1),
    ]);
    expect(unitTicks(utc(10, 14), utc(10, 29), 'week', 'UTC', 1)).toEqual([
      utc(10, 12),
      utc(10, 19),
      utc(10, 26),
    ]);
    expect(unitTicks(utc(10, 14, 9), utc(10, 14, 12), 'hour', 'UTC', 1)).toHaveLength(3);
  });
});

describe('defaultRange', () => {
  it('pads the tasks by a column before and two after, on column boundaries', () => {
    const extent: [number, number] = [utc(10, 5, 9), utc(11, 25)];
    expect(defaultRange(extent, 'day', 'UTC', 1, 0)).toEqual({
      start: utc(10, 4),
      end: utc(11, 27),
    });
    expect(defaultRange(extent, 'month', 'UTC', 1, 0)).toEqual({
      start: utc(9, 1),
      end: Date.UTC(2027, 0, 1),
    });
  });

  it('starts from now without tasks', () => {
    const { start, end } = defaultRange(undefined, 'day', 'UTC', 1, utc(10, 14, 10));
    expect(start).toBe(utc(10, 13));
    expect(end).toBe(utc(10, 28));
  });
});

describe('stepTime', () => {
  it('steps to the next snapped time either way', () => {
    expect(stepTime(utc(10, 14), 1, 1440, 'UTC')).toBe(utc(10, 15));
    expect(stepTime(utc(10, 14, 10), 1, 1440, 'UTC')).toBe(utc(10, 15));
    expect(stepTime(utc(10, 14, 10), -1, 1440, 'UTC')).toBe(utc(10, 14));
    expect(stepTime(utc(10, 14, 10), 1, 15, 'UTC')).toBe(utc(10, 14, 10) + 15 * 60_000);
  });

  it('lands on midnight across a daylight-saving change', () => {
    const saturday = Date.UTC(2026, 9, 24, 23); // Midnight on the 25th in London (BST).
    expect(stepTime(saturday, 1, 1440, 'Europe/London')).toBe(Date.UTC(2026, 9, 26));
  });
});

describe('nonWorkingSpans', () => {
  const weekdays = new Set([1, 2, 3, 4, 5]);

  it('merges a weekend into one stretch', () => {
    expect(nonWorkingSpans(utc(10, 12), utc(10, 26), 'UTC', weekdays)).toEqual([
      [utc(10, 17), utc(10, 19)],
      [utc(10, 24), utc(10, 26)],
    ]);
  });

  it('adds the hours outside the working day', () => {
    const spans = nonWorkingSpans(utc(10, 15), utc(10, 17), 'UTC', weekdays, {
      start: 9,
      end: 17,
    });
    expect(spans).toEqual([
      [utc(10, 15), utc(10, 15, 9)],
      [utc(10, 15, 17), utc(10, 16, 9)],
      [utc(10, 16, 17), utc(10, 17)],
    ]);
  });

  it('shades nothing when every day is a working day', () => {
    expect(
      nonWorkingSpans(utc(10, 12), utc(10, 26), 'UTC', new Set([0, 1, 2, 3, 4, 5, 6])),
    ).toEqual([]);
  });
});

describe('ZOOM_SCALES', () => {
  it('zooms from hours to quarters, closest first', () => {
    const widths = Object.values(ZOOM_SCALES).map((scale) => scale.pxPerDay);
    expect([...widths].sort((a, b) => b - a)).toEqual(widths);
    expect(ZOOM_SCALES.hour.pxPerDay / 24).toBeGreaterThanOrEqual(40);
    expect(ZOOM_SCALES.quarter.pxPerDay * 91).toBeGreaterThan(100);
  });
});
