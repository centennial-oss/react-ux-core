// Parsers for typed durations, byte sizes and bitrates. Each accepts a plain number (in a default unit) or a number
// with a unit, and durations also accept compound values ("1h30m", "1 hour 30 minutes"). Unit names are the
// standard symbols and English words, plus the locale's own names from Intl.

import { normalizeNumberText } from './number';
import {
  BITRATE_UNITS,
  byteUnits,
  DURATION_UNITS,
  durationUnit,
  IEC_BYTE_UNITS,
  type BitrateUnit,
  type ByteUnit,
  type DurationUnit,
} from './units';

/** Why typed text couldn't be read. `compound` means several units were typed where only one is allowed. */
export type UnitParseError = 'invalid' | 'compound';

export type UnitParseResult =
  { value: number | null; error?: undefined } | { error: UnitParseError };

const ENGLISH_DURATION_NAMES: Record<DurationUnit, readonly string[]> = {
  ms: ['ms', 'msec', 'msecs', 'millisecond', 'milliseconds'],
  s: ['s', 'sec', 'secs', 'second', 'seconds'],
  m: ['m', 'min', 'mins', 'minute', 'minutes'],
  h: ['h', 'hr', 'hrs', 'hour', 'hours'],
  d: ['d', 'day', 'days'],
  w: ['w', 'wk', 'wks', 'week', 'weeks'],
};

const unitNameCache = new Map<string, Map<string, DurationUnit>>();

const cleanName = (name: string) => name.trim().toLocaleLowerCase().replace(/\.$/, '');

/** Every name a duration unit goes by in `locale` (narrow, short and long, singular and plural), plus English. */
function durationNames(locale: string): Map<string, DurationUnit> {
  const cached = unitNameCache.get(locale);
  if (cached) {
    return cached;
  }
  const names = new Map<string, DurationUnit>();
  for (const unit of DURATION_UNITS) {
    if (!unit.intlUnit) {
      continue;
    }
    for (const unitDisplay of ['narrow', 'short', 'long'] as const) {
      const formatter = new Intl.NumberFormat(locale, {
        style: 'unit',
        unit: unit.intlUnit,
        unitDisplay,
      });
      for (const count of [1, 2, 5]) {
        for (const part of formatter.formatToParts(count)) {
          if (part.type === 'unit') {
            names.set(cleanName(part.value), unit.id);
          }
        }
      }
    }
  }
  // The symbols and English words win over a locale name that happens to match one of them.
  for (const [id, aliases] of Object.entries(ENGLISH_DURATION_NAMES) as [
    DurationUnit,
    readonly string[],
  ][]) {
    for (const alias of aliases) {
      if (!names.has(alias) || alias.length <= 2) {
        names.set(alias, id);
      }
    }
  }
  unitNameCache.set(locale, names);
  return names;
}

/** The word a locale joins list items with ("and"), so "1 hour and 30 minutes" parses. */
function conjunction(locale: string): string {
  const joined = new Intl.ListFormat(locale, { type: 'conjunction' }).format(['\u0001', '\u0002']);
  return joined
    .slice(joined.indexOf('\u0001') + 1, joined.indexOf('\u0002'))
    .trim()
    .toLocaleLowerCase();
}

// A number followed by an optional unit name (letters, possibly ending in a dot: "Std.").
const DURATION_TOKEN = /(\d[\d.,]*|[.,]\d+)\s*([\p{L}\u00b5]+\.?)?/gu;

export interface ParseDurationOptions {
  /** The locale for the decimal point and unit names. Defaults to `en`. */
  locale?: string;
  /** The unit of a plain number. Defaults to `ms`. */
  defaultUnit?: DurationUnit;
  /** Accepts several units ("1h30m"). Defaults to true. */
  allowsCompound?: boolean;
}

/** Reads a duration in milliseconds, explaining a failure. Empty text is `{ value: null }`. */
export function parseDurationResult(
  text: string,
  options: ParseDurationOptions = {},
): UnitParseResult {
  const { locale = 'en', defaultUnit = 'ms', allowsCompound = true } = options;
  let source = text.trim().toLocaleLowerCase();
  if (source === '') {
    return { value: null };
  }
  let sign = 1;
  if (/^[-\u2212]/.test(source)) {
    sign = -1;
    source = source.slice(1);
  }
  const plain = normalizeNumberText(source, locale);
  if (plain !== null) {
    return { value: Math.round(sign * Number(plain) * durationUnit(defaultUnit).factor) };
  }
  const names = durationNames(locale);
  const and = conjunction(locale);
  let total = 0;
  let count = 0;
  let consumed = 0;
  const leftovers: string[] = [];
  for (const match of source.matchAll(DURATION_TOKEN)) {
    leftovers.push(source.slice(consumed, match.index));
    consumed = match.index + match[0].length;
    const [, digits = '', name] = match;
    const amount = normalizeNumberText(digits, locale);
    const unit = name === undefined ? undefined : names.get(cleanName(name));
    if (amount === null || unit === undefined) {
      return { error: 'invalid' };
    }
    total += Number(amount) * durationUnit(unit).factor;
    count += 1;
  }
  leftovers.push(source.slice(consumed));
  // Between the parts, only spaces, commas, a plus or the locale's "and" may appear.
  const isClean = leftovers.every((gap) => {
    const rest = gap.replace(/[\s,;+]/g, '');
    return rest === '' || rest === and.replace(/\s/g, '') || rest === 'and';
  });
  if (count === 0 || !isClean) {
    return { error: 'invalid' };
  }
  if (count > 1 && !allowsCompound) {
    return { error: 'compound' };
  }
  return { value: Math.round(sign * total) };
}

/**
 * Parses a typed duration into milliseconds: `parseDuration('1h30m')` is 5,400,000, `parseDuration('90s')` 90,000,
 * `parseDuration('1 hour 30 minutes')` 5,400,000, and a plain number is in `defaultUnit` (milliseconds unless set).
 * Returns null for empty or unreadable text.
 */
export function parseDuration(text: string, options: ParseDurationOptions = {}): number | null {
  const result = parseDurationResult(text, options);
  return result.error === undefined ? result.value : null;
}

/** Splits "512 MiB" into its number (normalised) and unit text, or null when there's no number first. */
function splitAmount(text: string, locale: string): { amount: number; unit: string } | null {
  const match = /^([^\p{L}\u00b5]*?)\s*([\p{L}\u00b5][\p{L}\u00b5/.]*)?$/u.exec(text.trim());
  if (!match) {
    return null;
  }
  const amount = normalizeNumberText(match[1] ?? '', locale);
  return amount === null ? null : { amount: Number(amount), unit: match[2] ?? '' };
}

const PREFIX_POWER: Record<string, number> = { '': 0, k: 1, m: 2, g: 3, t: 4, p: 5 };

/** The size in bytes of a typed byte unit, or null. Decimal-looking symbols follow the field's `system`. */
function byteFactor(unit: string, system: 'iec' | 'si'): number | null {
  const name = unit.toLocaleLowerCase().replace(/\.$/, '');
  if (name === '') {
    return null;
  }
  const iec =
    /^([kmgtp])i(?:b|byte|bytes)?$/.exec(name) ?? /^(kibi|mebi|gibi|tebi|pebi)bytes?$/.exec(name);
  if (iec) {
    const power = PREFIX_POWER[(iec[1] ?? '').charAt(0)] ?? 0;
    return 1024 ** power;
  }
  const decimal =
    /^([kmgtp]?)(?:b|byte|bytes)?$/.exec(name) ?? /^(kilo|mega|giga|tera|peta)bytes?$/.exec(name);
  if (decimal) {
    const power = PREFIX_POWER[(decimal[1] ?? '').charAt(0)] ?? 0;
    return (system === 'iec' ? 1024 : 1000) ** power;
  }
  return null;
}

export interface ParseBytesOptions {
  /** The locale for the decimal point. Defaults to `en`. */
  locale?: string;
  /**
   * How to read decimal-looking symbols ("MB", "M", "megabytes"): `iec` (default) reads them as binary multiples, as
   * people often type "MB" meaning MiB; `si` as powers of 1000. Binary symbols ("MiB") are always binary.
   */
  system?: 'iec' | 'si';
  /** The unit of a plain number. Defaults to `B`. */
  defaultUnit?: ByteUnit;
}

/** Reads a byte size, explaining a failure. Empty text is `{ value: null }`. */
export function parseBytesResult(text: string, options: ParseBytesOptions = {}): UnitParseResult {
  const { locale = 'en', system = 'iec', defaultUnit = 'B' } = options;
  if (text.trim() === '') {
    return { value: null };
  }
  const split = splitAmount(text, locale);
  if (!split) {
    return { error: 'invalid' };
  }
  const factor =
    split.unit === ''
      ? ([...byteUnits(system), ...IEC_BYTE_UNITS].find((unit) => unit.id === defaultUnit)
          ?.factor ?? 1)
      : byteFactor(split.unit, system);
  return factor === null ? { error: 'invalid' } : { value: Math.round(split.amount * factor) };
}

/**
 * Parses a typed byte size into bytes: `parseBytes('512 MiB')` is 536,870,912, `parseBytes('1.5 GB', { system:
 * 'si' })` 1,500,000,000. A plain number is in `defaultUnit` (bytes unless set). Returns null for empty or
 * unreadable text.
 */
export function parseBytes(text: string, options: ParseBytesOptions = {}): number | null {
  const result = parseBytesResult(text, options);
  return result.error === undefined ? result.value : null;
}

/** The size in bits per second of a typed bitrate unit, or null. A capital B means bytes ("MB/s" = 8 Mbps). */
function bitrateFactor(unit: string): number | null {
  const match = /^([kmgt]?)(b|bit|bits)?(ps|\/s|\/sec)?$/.exec(unit.toLocaleLowerCase());
  if (!match) {
    return null;
  }
  const [, prefix = '', base] = match;
  const isBytes = base === 'b' && unit.includes('B');
  return 1000 ** (PREFIX_POWER[prefix] ?? 0) * (isBytes ? 8 : 1);
}

export interface ParseBitrateOptions {
  /** The locale for the decimal point. Defaults to `en`. */
  locale?: string;
  /** The unit of a plain number. Defaults to `bps`. */
  defaultUnit?: BitrateUnit;
}

/** Reads a bitrate, explaining a failure. Empty text is `{ value: null }`. */
export function parseBitrateResult(
  text: string,
  options: ParseBitrateOptions = {},
): UnitParseResult {
  const { locale = 'en', defaultUnit = 'bps' } = options;
  if (text.trim() === '') {
    return { value: null };
  }
  const split = splitAmount(text, locale);
  if (!split) {
    return { error: 'invalid' };
  }
  const factor =
    split.unit === ''
      ? (BITRATE_UNITS.find((unit) => unit.id === defaultUnit)?.factor ?? 1)
      : bitrateFactor(split.unit);
  return factor === null ? { error: 'invalid' } : { value: Math.round(split.amount * factor) };
}

/**
 * Parses a typed bitrate into bits per second: `parseBitrate('4.5 Mbps')` is 4,500,000, as are "4.5M", "4500k" and
 * "4.5 Mbit/s". A plain number is in `defaultUnit` (bps unless set). Returns null for empty or unreadable text.
 */
export function parseBitrate(text: string, options: ParseBitrateOptions = {}): number | null {
  const result = parseBitrateResult(text, options);
  return result.error === undefined ? result.value : null;
}
