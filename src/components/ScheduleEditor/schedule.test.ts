import { describe, expect, it } from 'vitest';
import { appendTier, validateTiers } from '../TierEditor/tiers';
import {
  fromMinutes,
  scheduleToHourly,
  sortSchedule,
  toMinutes,
  uncoveredSpans,
  validateSchedule,
} from './schedule';

describe('schedule', () => {
  it('converts times, with 24:00 as the end of the day', () => {
    expect(toMinutes('06:30')).toBe(390);
    expect(toMinutes('24:00')).toBe(1440);
    expect(toMinutes('25:00')).toBeNaN();
    expect(fromMinutes(1440)).toBe('24:00');
    expect(fromMinutes(65)).toBe('01:05');
  });

  it('sorts by start and finds uncovered time', () => {
    const rows = [
      { start: '12:00', end: '18:00', value: 2 },
      { start: '00:00', end: '06:00', value: 1 },
    ];
    expect(sortSchedule(rows).map((row) => row.start)).toEqual(['00:00', '12:00']);
    expect(uncoveredSpans(rows)).toEqual([
      [360, 720],
      [1080, 1440],
    ]);
  });

  it('flags inverted and overlapping periods, gaps and uncovered time', () => {
    const rows = [
      { start: '00:00', end: '05:00', value: 1 },
      { start: '04:00', end: '07:00', value: 2 },
      { start: '13:00', end: '12:00', value: 3 },
      { start: '09:00', end: '10:00', value: 4 },
    ];
    const result = validateSchedule(rows, { allowsGaps: false });
    expect(result.rows.get(0)).toEqual([{ kind: 'overlap', with: [240, 420] }]);
    expect(result.rows.get(2)).toEqual([{ kind: 'endBeforeStart' }]);
    expect(result.schedule).toEqual([{ kind: 'gap', span: [420, 540] }]);
    expect(validateSchedule(rows, { isFullDayRequired: true }).schedule).toContainEqual({
      kind: 'uncovered',
      span: [600, 1440],
    });
    expect(
      validateSchedule([{ start: '00:00', end: '24:00', value: 1 }], { isFullDayRequired: true })
        .isValid,
    ).toBe(true);
  });

  it('averages each hour by time', () => {
    const hourly = scheduleToHourly(
      [
        { start: '00:00', end: '00:30', value: 10 },
        { start: '00:30', end: '01:00', value: 20 },
        { start: '02:00', end: '24:00', value: 5 },
      ],
      (value) => value,
    );
    expect(hourly[0]).toBe(15);
    expect(hourly[1]).toBeNull();
    expect(hourly[23]).toBe(5);
  });
});

describe('tiers', () => {
  it('requires contiguous tiers with only the last open-ended', () => {
    const result = validateTiers([
      { from: 0, to: 100, value: 1 },
      { from: 150, to: null, value: 2 },
      { from: 300, to: 300, value: 3 },
    ]);
    expect(result.rows.get(1)).toEqual([
      { kind: 'openNotLast' },
      { kind: 'notContiguous', expectedFrom: 100 },
    ]);
    expect(result.rows.get(2)).toEqual([{ kind: 'endNotAfterStart' }]);
    expect(validateTiers([{ from: 0, to: null, value: 1 }], { allowsOpenEnd: false }).isValid).toBe(
      false,
    );
  });

  it('adds a tier from the last tier’s upper bound', () => {
    expect(appendTier([], 5)).toEqual([{ from: 0, to: null, value: 5 }]);
    expect(appendTier([{ from: 0, to: 100, value: 1 }], 2)).toEqual([
      { from: 0, to: 100, value: 1 },
      { from: 100, to: null, value: 2 },
    ]);
    // An open last tier is closed at its start, for the user to set its end.
    expect(appendTier([{ from: 0, to: null, value: 1 }], 2)).toEqual([
      { from: 0, to: 0, value: 1 },
      { from: 0, to: null, value: 2 },
    ]);
  });
});
