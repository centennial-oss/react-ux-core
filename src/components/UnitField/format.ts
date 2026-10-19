// Locale-aware formatters for durations, byte sizes and bitrates. Numbers and, where Intl has them, unit names come
// from Intl; byte and bitrate symbols (KiB, MB, Mbps) are the standard technical symbols.

import { listFormat, numberFormat, unitName } from '../../utils/intl';
import {
  BITRATE_UNITS,
  byteUnits,
  DEFAULT_DURATION_UNITS,
  durationUnits,
  type BitrateUnit,
  type ByteUnit,
  type DurationUnit,
  type IecByteUnit,
  type UnitDefinition,
} from './units';

// The shared formatters for `locale`; without one, Intl's default (the browser's locale), built each time.
function numberFormatFor(
  locale: string | undefined,
  options: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  return locale === undefined
    ? new Intl.NumberFormat(undefined, options)
    : numberFormat(locale, options);
}

function listFormatFor(
  locale: string | undefined,
  options: Intl.ListFormatOptions,
): Intl.ListFormat {
  return locale === undefined
    ? new Intl.ListFormat(undefined, options)
    : listFormat(locale, options);
}

/** One part of a duration ("1 h" of "1h 30m"). */
export interface DurationPart {
  unit: DurationUnit;
  amount: number;
}

/**
 * Splits a duration into parts over `units`. `compound` uses as many units as needed, largest first, with any
 * remainder as a decimal of the smallest ("1h 30m", "1m 30.5s"); `single` uses the largest unit that keeps the amount
 * whole ("90m"), or a decimal of the smallest when none does ("0.5s").
 */
export function durationParts(
  ms: number,
  units: readonly DurationUnit[] = DEFAULT_DURATION_UNITS,
  style: 'compound' | 'single' = 'compound',
): DurationPart[] {
  const defs = durationUnits(units.length > 0 ? units : DEFAULT_DURATION_UNITS);
  const smallest = defs[0];
  if (!smallest) {
    return [];
  }
  const magnitude = Math.abs(ms);
  let parts: DurationPart[];
  if (style === 'single') {
    const whole = [...defs]
      .reverse()
      .find((unit) => magnitude >= unit.factor && magnitude % unit.factor === 0);
    parts = [
      whole
        ? { unit: whole.id, amount: magnitude / whole.factor }
        : { unit: smallest.id, amount: magnitude / smallest.factor },
    ];
  } else {
    parts = [];
    let rest = magnitude;
    for (const unit of [...defs].reverse()) {
      const amount = unit === smallest ? rest / unit.factor : Math.floor(rest / unit.factor);
      if (amount !== 0) {
        parts.push({ unit: unit.id, amount });
        rest -= amount * unit.factor;
      }
    }
    if (parts.length === 0) {
      parts.push({ unit: smallest.id, amount: 0 });
    }
  }
  const [first] = parts;
  if (ms < 0 && first) {
    first.amount = -first.amount;
  }
  return parts;
}

export interface FormatDurationOptions {
  /** A BCP 47 locale. Defaults to the browser's. */
  locale?: string;
  /** `compound` (default) gives "1h 30m"; `single` the largest unit that keeps it whole, "90m". */
  style?: 'compound' | 'single';
  /** `narrow` (default) "1h 30m", `short` "1 hr, 30 min", `long` "1 hour 30 minutes". */
  unitDisplay?: 'narrow' | 'short' | 'long';
  /** The units to use. Defaults to seconds, minutes, hours and days. */
  units?: readonly DurationUnit[];
  /** Fraction digits for an amount of the smallest unit. Defaults to 3. */
  maximumFractionDigits?: number;
}

const DURATION_INTL: Record<DurationUnit, string> = {
  ms: 'millisecond',
  s: 'second',
  m: 'minute',
  h: 'hour',
  d: 'day',
  w: 'week',
};

/**
 * Formats milliseconds as a duration for the locale: `formatDuration(5_400_000)` is "1h 30m", with `{ unitDisplay:
 * 'long' }` "1 hour 30 minutes", and with `{ style: 'single' }` "90m".
 */
export function formatDuration(ms: number, options: FormatDurationOptions = {}): string {
  const { locale, style, unitDisplay = 'narrow', units, maximumFractionDigits = 3 } = options;
  const parts = durationParts(ms, units, style).map((part) =>
    numberFormatFor(locale, {
      style: 'unit',
      unit: DURATION_INTL[part.unit],
      unitDisplay,
      maximumFractionDigits,
    }).format(part.amount),
  );
  // A narrow unit list joins with spaces in English ("1 hour 30 minutes"); a short one with commas.
  return listFormatFor(locale, {
    type: 'unit',
    style: unitDisplay === 'short' ? 'short' : 'narrow',
  }).format(parts);
}

function smallestOf<U extends string>(units: readonly UnitDefinition<U>[]): UnitDefinition<U> {
  const [smallest] = units;
  if (!smallest) {
    throw new RangeError('At least one unit is needed');
  }
  return smallest;
}

/**
 * The largest unit in which an integer `value` is at least 1 and exact to `maximumFractionDigits` (4,500,000 bps is
 * 4.5 Mbps; 1,500 bytes stays 1,500 B in binary units, since 1.46484375 KiB isn't exact), or the smallest unit.
 */
export function exactUnit<U extends string>(
  value: number,
  units: readonly UnitDefinition<U>[],
  maximumFractionDigits = 3,
): UnitDefinition<U> {
  const magnitude = BigInt(Math.round(Math.abs(value)));
  const scale = 10n ** BigInt(maximumFractionDigits);
  const found = [...units]
    .reverse()
    .find(
      (unit) =>
        magnitude >= BigInt(unit.factor) && (magnitude * scale) % BigInt(unit.factor) === 0n,
    );
  return found ?? smallestOf(units);
}

/** The largest unit in which `value` is at least 1, or the smallest unit. */
function largestUnit<U extends string>(
  value: number,
  units: readonly UnitDefinition<U>[],
): UnitDefinition<U> {
  const magnitude = Math.abs(value);
  return [...units].reverse().find((unit) => magnitude >= unit.factor) ?? smallestOf(units);
}

const IEC_NAMES: Record<Exclude<IecByteUnit, 'B'>, string> = {
  KiB: 'kibibyte',
  MiB: 'mebibyte',
  GiB: 'gibibyte',
  TiB: 'tebibyte',
  PiB: 'pebibyte',
};

/** Words for a binary byte amount, which Intl has no names for ("1.5 mebibytes"). */
export type IecValueFormatter = (params: {
  /** The formatted number. */
  value: string;
  unit: Exclude<IecByteUnit, 'B'>;
  /** The amount, for plurals. */
  count: number;
}) => string;

/** English names for binary byte amounts; components pass the `unitFieldIecValue` message instead. */
export const formatIecValueInEnglish: IecValueFormatter = ({ value, unit, count }) =>
  `${value} ${IEC_NAMES[unit]}${count === 1 ? '' : 's'}`;

export interface FormatBytesOptions {
  /** A BCP 47 locale. Defaults to the browser's. */
  locale?: string;
  /** `iec` (default) for binary units (KiB = 1024 B), `si` for decimal ones (kB = 1000 B). */
  system?: 'iec' | 'si';
  /** `short` (default) "1.5 MiB", or `long` "1.5 mebibytes". */
  unitDisplay?: 'short' | 'long';
  /** Fraction digits. Defaults to 2. */
  maximumFractionDigits?: number;
  /** A fixed unit instead of the largest that fits. */
  unit?: ByteUnit;
  /** Words for binary amounts in `long` display. Defaults to English. */
  formatIecValue?: IecValueFormatter;
}

/** Formats bytes for the locale in the largest unit that fits: `formatBytes(1536)` is "1.5 KiB". */
export function formatBytes(bytes: number, options: FormatBytesOptions = {}): string {
  const { locale, system = 'iec', unitDisplay = 'short', maximumFractionDigits = 2 } = options;
  const units = byteUnits(system);
  const unit =
    units.find((candidate) => candidate.id === options.unit) ?? largestUnit(bytes, units);
  const amount = bytes / unit.factor;
  if (unitDisplay === 'long') {
    if (unit.intlUnit) {
      return numberFormatFor(locale, {
        style: 'unit',
        unit: unit.intlUnit,
        unitDisplay: 'long',
        maximumFractionDigits,
      }).format(amount);
    }
    const value = numberFormatFor(locale, { maximumFractionDigits }).format(amount);
    return (options.formatIecValue ?? formatIecValueInEnglish)({
      value,
      unit: unit.id as Exclude<IecByteUnit, 'B'>,
      count: amount,
    });
  }
  return `${numberFormatFor(locale, { maximumFractionDigits }).format(amount)} ${unit.id}`;
}

export interface FormatBitrateOptions {
  /** A BCP 47 locale. Defaults to the browser's. */
  locale?: string;
  /** `short` (default) "4.5 Mbps", or `long` "4.5 megabits per second". */
  unitDisplay?: 'short' | 'long';
  /** Fraction digits. Defaults to 2. */
  maximumFractionDigits?: number;
  /** A fixed unit instead of the largest that fits. */
  unit?: BitrateUnit;
}

/** Formats bits per second for the locale in the largest unit that fits: `formatBitrate(4_500_000)` is "4.5 Mbps". */
export function formatBitrate(bps: number, options: FormatBitrateOptions = {}): string {
  const { locale, unitDisplay = 'short', maximumFractionDigits = 2 } = options;
  const unit =
    BITRATE_UNITS.find((candidate) => candidate.id === options.unit) ??
    largestUnit(bps, BITRATE_UNITS);
  const amount = bps / unit.factor;
  if (unitDisplay === 'long' && unit.intlUnit) {
    return numberFormatFor(locale, {
      style: 'unit',
      unit: unit.intlUnit,
      unitDisplay: 'long',
      maximumFractionDigits,
    }).format(amount);
  }
  return `${numberFormatFor(locale, { maximumFractionDigits }).format(amount)} ${unit.id}`;
}

/** The unit's name as Intl writes it for an amount of 2, at the given width ("h", "hours"). */
export function intlUnitName(
  locale: string,
  unit: string,
  unitDisplay: 'narrow' | 'short' | 'long',
): string {
  return unitName(locale, unit, unitDisplay);
}
