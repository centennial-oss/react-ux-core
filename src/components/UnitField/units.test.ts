import { describe, expect, it } from 'vitest';
import { durationParts, exactUnit, formatBitrate, formatBytes, formatDuration } from './format';
import { normalizeNumberText } from './number';
import { parseBitrate, parseBytes, parseDuration, parseDurationResult } from './parse';
import { BITRATE_UNITS, IEC_BYTE_UNITS } from './units';

describe('formatDuration', () => {
  it('formats compound, single and long durations', () => {
    expect(formatDuration(5_400_000, { locale: 'en' })).toBe('1h 30m');
    expect(formatDuration(5_400_000, { locale: 'en', style: 'single' })).toBe('90m');
    expect(formatDuration(5_400_000, { locale: 'en', unitDisplay: 'long' })).toBe(
      '1 hour 30 minutes',
    );
    expect(formatDuration(86_400_000, { locale: 'en', unitDisplay: 'short' })).toBe('1 day');
    expect(formatDuration(1500, { locale: 'en' })).toBe('1.5s');
    expect(formatDuration(0, { locale: 'en' })).toBe('0s');
    expect(formatDuration(-90_000, { locale: 'en' })).toBe('-1m 30s');
    expect(formatDuration(250, { locale: 'en', units: ['ms', 's'] })).toBe('250ms');
  });

  it('splits into parts', () => {
    expect(durationParts(90_500, ['s', 'm'])).toEqual([
      { unit: 'm', amount: 1 },
      { unit: 's', amount: 30.5 },
    ]);
    expect(durationParts(7_200_000, ['m', 'h'], 'single')).toEqual([{ unit: 'h', amount: 2 }]);
  });
});

describe('formatBytes and formatBitrate', () => {
  it('formats in the largest unit that fits', () => {
    expect(formatBytes(1536, { locale: 'en' })).toBe('1.5 KiB');
    expect(formatBytes(1_500_000_000, { locale: 'en', system: 'si' })).toBe('1.5 GB');
    expect(formatBytes(512, { locale: 'en' })).toBe('512 B');
    expect(formatBytes(1_572_864, { locale: 'en', unitDisplay: 'long' })).toBe('1.5 mebibytes');
    expect(formatBytes(1_500_000, { locale: 'en', system: 'si', unitDisplay: 'long' })).toBe(
      '1.5 megabytes',
    );
    expect(formatBytes(1536, { locale: 'de' })).toBe('1,5 KiB');
    expect(formatBitrate(4_500_000, { locale: 'en' })).toBe('4.5 Mbps');
    expect(formatBitrate(4_500_000, { locale: 'en', unitDisplay: 'long' })).toBe(
      '4.5 megabits per second',
    );
    expect(formatBitrate(128_000, { locale: 'en', unit: 'Mbps' })).toBe('0.13 Mbps');
  });

  it('picks the largest exact unit for fields', () => {
    expect(exactUnit(4_500_000, BITRATE_UNITS).id).toBe('Mbps');
    expect(exactUnit(1_234_567, BITRATE_UNITS).id).toBe('kbps');
    expect(exactUnit(1536, IEC_BYTE_UNITS).id).toBe('KiB');
    expect(exactUnit(1500, IEC_BYTE_UNITS).id).toBe('B');
    expect(exactUnit(0, IEC_BYTE_UNITS).id).toBe('B');
  });
});

describe('parsers', () => {
  it('parses durations, compound and plain', () => {
    expect(parseDuration('1h30m')).toBe(5_400_000);
    expect(parseDuration('1h 30m')).toBe(5_400_000);
    expect(parseDuration('1 hour 30 minutes')).toBe(5_400_000);
    expect(parseDuration('1 hr, 30 min')).toBe(5_400_000);
    expect(parseDuration('1 hour and 30 minutes')).toBe(5_400_000);
    expect(parseDuration('90s')).toBe(90_000);
    expect(parseDuration('1.5h')).toBe(5_400_000);
    expect(parseDuration('2', { defaultUnit: 'h' })).toBe(7_200_000);
    expect(parseDuration('250ms')).toBe(250);
    expect(parseDuration('-5m')).toBe(-300_000);
    expect(parseDuration('')).toBeNull();
    expect(parseDuration('soon')).toBeNull();
    expect(parseDuration('1h30')).toBeNull();
    expect(parseDurationResult('1h30m', { allowsCompound: false })).toEqual({ error: 'compound' });
    expect(parseDuration('2h', { allowsCompound: false })).toBe(7_200_000);
  });

  it('parses localised durations', () => {
    expect(parseDuration('1,5 Std.', { locale: 'de' })).toBe(5_400_000);
    expect(parseDuration(formatDuration(5_400_000, { locale: 'de' }), { locale: 'de' })).toBe(
      5_400_000,
    );
    expect(parseDuration('2 heures', { locale: 'fr' })).toBe(7_200_000);
  });

  it('parses byte sizes', () => {
    expect(parseBytes('512 MiB')).toBe(536_870_912);
    expect(parseBytes('1.5G')).toBe(1_610_612_736);
    expect(parseBytes('1.5 GB', { system: 'si' })).toBe(1_500_000_000);
    expect(parseBytes('1 GB')).toBe(1_073_741_824);
    expect(parseBytes('2 KiB', { system: 'si' })).toBe(2048);
    expect(parseBytes('100')).toBe(100);
    expect(parseBytes('4', { defaultUnit: 'MiB' })).toBe(4_194_304);
    expect(parseBytes('3 kibibytes')).toBe(3072);
    expect(parseBytes('3 parsecs')).toBeNull();
  });

  it('parses bitrates', () => {
    expect(parseBitrate('4.5 Mbps')).toBe(4_500_000);
    expect(parseBitrate('4.5M')).toBe(4_500_000);
    expect(parseBitrate('4500k')).toBe(4_500_000);
    expect(parseBitrate('4.5 Mbit/s')).toBe(4_500_000);
    expect(parseBitrate('1 MB/s')).toBe(8_000_000);
    expect(parseBitrate('128', { defaultUnit: 'kbps' })).toBe(128_000);
    expect(parseBitrate('fast')).toBeNull();
  });

  it('normalises typed numbers for the locale', () => {
    expect(normalizeNumberText('1,234.5', 'en')).toBe('1234.5');
    expect(normalizeNumberText('1.234,5', 'de')).toBe('1234.5');
    expect(normalizeNumberText('1,5', 'en')).toBe('1.5');
    expect(normalizeNumberText('1.5', 'de')).toBe('1.5');
    expect(normalizeNumberText('1.234', 'de')).toBe('1234');
    expect(normalizeNumberText('1,234,567', 'en')).toBe('1234567');
    expect(normalizeNumberText('1.234.567', 'de')).toBe('1234567');
    expect(normalizeNumberText('1.234.567', 'en')).toBeNull();
    expect(normalizeNumberText('1.2.3', 'en')).toBeNull();
    expect(normalizeNumberText('1 234,5', 'fr')).toBe('1234.5');
    expect(normalizeNumberText('-.5', 'en')).toBe('-.5');
    expect(normalizeNumberText('1.2.3,4.5', 'en')).toBeNull();
    expect(normalizeNumberText('abc', 'en')).toBeNull();
  });
});
