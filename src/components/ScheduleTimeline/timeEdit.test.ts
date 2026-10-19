import { describe, expect, it } from 'vitest';
import { editTimes, stepSnapped } from './timeEdit';

const at = (hour: number, minute = 0) => Date.UTC(2026, 9, 14, hour, minute);
const day = { start: at(0), end: Date.UTC(2026, 9, 15) };

describe('stepSnapped', () => {
  it('steps one snap from a time on the grid, or to the grid from one off it', () => {
    expect(stepSnapped(at(9, 30), 1, 15, 'UTC')).toBe(at(9, 45));
    expect(stepSnapped(at(9, 30), -1, 15, 'UTC')).toBe(at(9, 15));
    expect(stepSnapped(at(9, 37), 1, 15, 'UTC')).toBe(at(9, 45));
    expect(stepSnapped(at(9, 37), -1, 15, 'UTC')).toBe(at(9, 30));
  });

  it('follows the wall clock in the zone', () => {
    // Kolkata is 5:30 ahead of UTC, so its hours fall on UTC half hours.
    expect(stepSnapped(at(9, 0), 1, 60, 'Asia/Kolkata')).toBe(at(9, 30));
  });
});

describe('editTimes', () => {
  const start = at(9, 30);
  const end = at(11);

  it('moves the whole item, snapping its start', () => {
    expect(editTimes('move', start, end, 52 * 60_000, 15, 'UTC', day)).toEqual({
      start: at(10, 15),
      end: at(11, 45),
    });
  });

  it('moves one end, keeping at least one snap', () => {
    expect(editTimes('start', start, end, -32 * 60_000, 15, 'UTC', day)).toEqual({
      start: at(9),
      end,
    });
    expect(editTimes('end', start, end, -3 * 3_600_000, 15, 'UTC', day)).toEqual({
      start,
      end: at(9, 45),
    });
    expect(editTimes('start', start, end, 3 * 3_600_000, 15, 'UTC', day)).toEqual({
      start: at(10, 45),
      end,
    });
  });

  it('draws out a new item from the pressed time either way, within the bounds', () => {
    expect(editTimes('create', at(17, 5), at(17, 5), 65 * 60_000, 15, 'UTC', day)).toEqual({
      start: at(17),
      end: at(18, 15),
    });
    expect(editTimes('create', at(17, 5), at(17, 5), -2 * 3_600_000, 15, 'UTC', day)).toEqual({
      start: at(15),
      end: at(17),
    });
    expect(editTimes('create', at(23), at(23), 5 * 3_600_000, 15, 'UTC', day)).toEqual({
      start: at(23),
      end: day.end,
    });
    expect(editTimes('create', at(17, 5), at(17, 5), 0, 15, 'UTC', day)).toEqual({
      start: at(17),
      end: at(17, 15),
    });
  });
});
