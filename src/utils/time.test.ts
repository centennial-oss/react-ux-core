import { describe, expect, it } from 'vitest';
import { DAY_MS, isValidDate, toEpochMs, toEpochMsOrUndefined, utcDay } from './time';

describe('toEpochMs', () => {
  it('reads dates, numbers and ISO strings', () => {
    const time = Date.UTC(2026, 9, 17, 12);
    expect(toEpochMs(new Date(time))).toBe(time);
    expect(toEpochMs(time)).toBe(time);
    expect(toEpochMs('2026-10-17T12:00:00Z')).toBe(time);
    expect(toEpochMs('not a date')).toBeNaN();
  });
});

describe('toEpochMsOrUndefined', () => {
  it('is undefined for missing or invalid values', () => {
    expect(toEpochMsOrUndefined(undefined)).toBeUndefined();
    expect(toEpochMsOrUndefined(null)).toBeUndefined();
    expect(toEpochMsOrUndefined('soon')).toBeUndefined();
    expect(toEpochMsOrUndefined(new Date(Number.NaN))).toBeUndefined();
    expect(toEpochMsOrUndefined(0)).toBe(0);
  });
});

describe('isValidDate', () => {
  it('rejects Invalid Date', () => {
    expect(isValidDate(new Date(0))).toBe(true);
    expect(isValidDate(new Date('x'))).toBe(false);
  });
});

it('DAY_MS is 24 hours', () => {
  expect(DAY_MS).toBe(24 * 60 * 60 * 1000);
});

describe('utcDay', () => {
  it('reads an ISO day as midnight UTC', () => {
    expect(utcDay('2026-10-17').toISOString()).toBe('2026-10-17T00:00:00.000Z');
    expect(isValidDate(utcDay('2026-13-40'))).toBe(false);
  });
});
