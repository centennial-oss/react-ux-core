import { describe, expect, it } from 'vitest';
import { defaultMessages } from '../../provider/messages';
import { formatTimeRange, getDefaultTimeRangePresets } from './labels';
import {
  isRelativeTimeExpression,
  isTimeRange,
  resolveTimeRange,
  type TimeRange,
} from './resolveTimeRange';

const relative = (from: string, to = 'now'): TimeRange => ({ kind: 'relative', from, to });

/** Resolves `from` → `to` and returns both ends as ISO strings. */
function resolve(from: string, now: string, timeZone = 'UTC', to = 'now') {
  const { start, end } = resolveTimeRange(relative(from, to), new Date(now), timeZone);
  return [start.toISOString(), end.toISOString()];
}

// Wednesday 14 October 2026.
const NOW = '2026-10-14T15:37:42.123Z';

describe('resolveTimeRange: relative units', () => {
  it.each([
    ['-30s', '2026-10-14T15:37:12.123Z'],
    ['-15m', '2026-10-14T15:22:42.123Z'],
    ['-24h', '2026-10-13T15:37:42.123Z'],
    ['-7d', '2026-10-07T15:37:42.123Z'],
    ['-1w', '2026-10-07T15:37:42.123Z'],
    ['-3M', '2026-07-14T15:37:42.123Z'],
    ['-1y', '2025-10-14T15:37:42.123Z'],
    ['now-15m', '2026-10-14T15:22:42.123Z'],
    ['now+2h', '2026-10-14T17:37:42.123Z'],
    ['now', NOW],
  ])('%s', (from, expected) => {
    expect(resolve(from, NOW)).toEqual([expected, NOW]);
  });

  it.each([
    ['now/s', '2026-10-14T15:37:42.000Z'],
    ['now/m', '2026-10-14T15:37:00.000Z'],
    ['now/h', '2026-10-14T15:00:00.000Z'],
    ['now/d', '2026-10-14T00:00:00.000Z'],
    ['now/w', '2026-10-12T00:00:00.000Z'],
    ['now/M', '2026-10-01T00:00:00.000Z'],
    ['now/y', '2026-01-01T00:00:00.000Z'],
    ['now-1d/d', '2026-10-13T00:00:00.000Z'],
    ['now-1M/M', '2026-09-01T00:00:00.000Z'],
    ['now/d+9h', '2026-10-14T09:00:00.000Z'],
    ['/d', '2026-10-14T00:00:00.000Z'],
  ])('snaps %s to the start of the unit', (from, expected) => {
    expect(resolve(from, NOW)[0]).toBe(expected);
  });

  it('resolves both ends, so "yesterday" is now-1d/d → now/d', () => {
    expect(resolve('now-1d/d', NOW, 'UTC', 'now/d')).toEqual([
      '2026-10-13T00:00:00.000Z',
      '2026-10-14T00:00:00.000Z',
    ]);
  });

  it('starts weeks on Monday unless told otherwise', () => {
    const range = relative('now/w');
    const sunday = resolveTimeRange(range, new Date(NOW), 'UTC', { firstDayOfWeek: 'sun' });
    expect(sunday.start.toISOString()).toBe('2026-10-11T00:00:00.000Z');
  });

  it('clamps month steps to the end of shorter months', () => {
    expect(resolve('-1M', '2026-03-31T12:00:00Z')[0]).toBe('2026-02-28T12:00:00.000Z');
  });

  it('accepts now as a Date or a number of milliseconds', () => {
    const fromNumber = resolveTimeRange(relative('-1h'), Date.parse(NOW), 'UTC');
    const fromDate = resolveTimeRange(relative('-1h'), new Date(NOW), 'UTC');
    expect(fromNumber).toEqual(fromDate);
  });
});

describe('resolveTimeRange: time zones and daylight saving (America/Denver)', () => {
  const denver = 'America/Denver';

  it('starts "this month" at local midnight on the 1st, in standard time, after the spring change', () => {
    // 20 March 2026 is in daylight time (UTC−6); 1 March was still standard time (UTC−7).
    expect(resolve('now/M', '2026-03-20T18:00:00Z', denver)[0]).toBe('2026-03-01T07:00:00.000Z');
  });

  it('starts "this month" at local midnight on the 1st, in daylight time, after the autumn change', () => {
    // 15 November 2026 is standard time (UTC−7); midnight on 1 November was still daylight time (UTC−6).
    expect(resolve('now/M', '2026-11-15T19:00:00Z', denver)[0]).toBe('2026-11-01T06:00:00.000Z');
  });

  it('starts last month at its local midnight', () => {
    expect(resolve('now-1M/M', '2026-04-10T18:00:00Z', denver)[0]).toBe('2026-03-01T07:00:00.000Z');
  });

  it('treats a day as a calendar day and 24h as elapsed time across the change', () => {
    // Noon MDT on 8 March 2026, the day clocks went forward.
    const now = '2026-03-08T18:00:00Z';
    expect(resolve('-1d', now, denver)[0]).toBe('2026-03-07T19:00:00.000Z');
    expect(resolve('-24h', now, denver)[0]).toBe('2026-03-07T18:00:00.000Z');
    expect(resolve('now/d', now, denver)[0]).toBe('2026-03-08T07:00:00.000Z');
  });

  it('snaps the repeated hour within the right occurrence when clocks go back', () => {
    // 01:30 MST, the second 01:30 of 1 November 2026.
    expect(resolve('now/h', '2026-11-01T08:30:00Z', denver)[0]).toBe('2026-11-01T08:00:00.000Z');
    // 01:30 MDT, the first.
    expect(resolve('now/h', '2026-11-01T07:30:00Z', denver)[0]).toBe('2026-11-01T07:00:00.000Z');
  });

  it('snaps hours in zones with a half-hour offset', () => {
    expect(resolve('now/h', '2026-10-14T15:37:00Z', 'Asia/Kolkata')[0]).toBe(
      '2026-10-14T15:30:00.000Z',
    );
  });
});

describe('resolveTimeRange: absolute ranges', () => {
  it('passes instants with an offset or Z through', () => {
    const { start, end } = resolveTimeRange(
      { kind: 'absolute', start: '2026-10-01T00:00:00-06:00', end: '2026-10-02T06:00:00.000Z' },
      new Date(NOW),
      'Asia/Tokyo',
    );
    expect([start.toISOString(), end.toISOString()]).toEqual([
      '2026-10-01T06:00:00.000Z',
      '2026-10-02T06:00:00.000Z',
    ]);
  });

  it('reads dates and wall times without an offset in the time zone', () => {
    const { start, end } = resolveTimeRange(
      { kind: 'absolute', start: '2026-10-01', end: '2026-10-01T09:30' },
      new Date(NOW),
      'America/Denver',
    );
    expect([start.toISOString(), end.toISOString()]).toEqual([
      '2026-10-01T06:00:00.000Z',
      '2026-10-01T15:30:00.000Z',
    ]);
  });

  it('round-trips through JSON (it is a plain serialisable object)', () => {
    const range: TimeRange = { kind: 'relative', from: 'now-7d/d', to: 'now/d' };
    const restored: unknown = JSON.parse(JSON.stringify(range));
    expect(isTimeRange(restored)).toBe(true);
    expect(restored).toEqual(range);
  });
});

describe('resolveTimeRange: invalid input', () => {
  it.each(['', '24h', '-24', 'now-', '-1x', 'now+-1h', 'now/q', '-1234567h', 'yesterday', ' -1h'])(
    'rejects the expression %j',
    (expression) => {
      expect(isRelativeTimeExpression(expression)).toBe(false);
      expect(() => resolveTimeRange(relative(expression), new Date(NOW), 'UTC')).toThrow(
        RangeError,
      );
    },
  );

  it.each([
    null,
    'last 24 hours',
    {},
    { kind: 'relative', from: '-1h' },
    { kind: 'relative', from: 1, to: 'now' },
    { kind: 'absolute', start: 'not a date', end: '2026-10-01' },
    { kind: 'absolute', start: '2026-13-01', end: '2026-10-01' },
    { kind: 'calendar', start: '2026-10-01', end: '2026-10-02' },
  ])('rejects the range %j', (value) => {
    expect(isTimeRange(value)).toBe(false);
    expect(() => resolveTimeRange(value as TimeRange, new Date(NOW), 'UTC')).toThrow(RangeError);
  });

  it('rejects an invalid now or time zone', () => {
    expect(() => resolveTimeRange(relative('-1h'), new Date('nope'), 'UTC')).toThrow(RangeError);
    expect(() => resolveTimeRange(relative('-1h'), Number.NaN, 'UTC')).toThrow(RangeError);
    expect(() => resolveTimeRange(relative('-1h'), new Date(NOW), 'Mars/Olympus_Mons')).toThrow(
      RangeError,
    );
  });

  it('resolves a range written backwards as written', () => {
    expect(resolve('now', NOW, 'UTC', '-1h')).toEqual([NOW, '2026-10-14T14:37:42.123Z']);
  });
});

describe('formatTimeRange', () => {
  const options = {
    messages: defaultMessages,
    locale: 'en-US',
    timeZone: 'America/Denver',
    presets: getDefaultTimeRangePresets(defaultMessages),
    now: new Date(NOW),
  };

  it('uses a matching preset’s label', () => {
    expect(formatTimeRange(relative('-24h'), options)).toBe('Last 24 hours');
    expect(formatTimeRange(relative('now/M'), options)).toBe('This month');
  });

  it('describes "last N units" with an Intl-formatted amount', () => {
    expect(formatTimeRange(relative('-3h'), options)).toBe('Last 3 hours');
    expect(formatTimeRange(relative('now-2w'), options)).toBe('Last 2 weeks');
    expect(formatTimeRange(relative('-1M'), { ...options, presets: [] })).toBe('Last 1 month');
    expect(formatTimeRange(relative('-90m'), { ...options, locale: 'de-DE' })).toBe(
      'Last 90 Minuten',
    );
  });

  it('shows other ranges as dates in the time zone', () => {
    const label = formatTimeRange(
      { kind: 'absolute', start: '2026-10-01T06:00:00Z', end: '2026-10-02T18:30:00Z' },
      options,
    );
    expect(label).toContain('Oct 1');
    expect(label).toContain('12:30');
    expect(formatTimeRange(relative('now-1d/d', 'now/d'), options)).toContain('Oct 13');
  });

  it('returns an empty string for a malformed range', () => {
    expect(formatTimeRange(relative('soon'), options)).toBe('');
  });
});
