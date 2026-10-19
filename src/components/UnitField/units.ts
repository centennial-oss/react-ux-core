// Unit tables for durations, byte sizes and bitrates: each unit's size in the base unit (milliseconds, bytes, bits
// per second), its symbol and, where Intl has one, its sanctioned unit identifier for localised names.

/** Duration units, from milliseconds to weeks. `m` is minutes. */
export type DurationUnit = 'ms' | 's' | 'm' | 'h' | 'd' | 'w';
/** Byte units: binary multiples (`iec`: KiB = 1024 B) and decimal ones (`si`: kB = 1000 B). */
export type IecByteUnit = 'B' | 'KiB' | 'MiB' | 'GiB' | 'TiB' | 'PiB';
export type SiByteUnit = 'B' | 'kB' | 'MB' | 'GB' | 'TB' | 'PB';
export type ByteUnit = IecByteUnit | SiByteUnit;
/** Bitrate units, decimal multiples of bits per second. */
export type BitrateUnit = 'bps' | 'kbps' | 'Mbps' | 'Gbps' | 'Tbps';

export interface UnitDefinition<U extends string> {
  id: U;
  /** The unit's size in the base unit. */
  factor: number;
  /** An Intl sanctioned unit identifier, for localised names. */
  intlUnit?: string;
}

/** Units in order, smallest first. */
export const DURATION_UNITS: readonly UnitDefinition<DurationUnit>[] = [
  { id: 'ms', factor: 1, intlUnit: 'millisecond' },
  { id: 's', factor: 1000, intlUnit: 'second' },
  { id: 'm', factor: 60_000, intlUnit: 'minute' },
  { id: 'h', factor: 3_600_000, intlUnit: 'hour' },
  { id: 'd', factor: 86_400_000, intlUnit: 'day' },
  { id: 'w', factor: 604_800_000, intlUnit: 'week' },
];

export const IEC_BYTE_UNITS: readonly UnitDefinition<IecByteUnit>[] = [
  { id: 'B', factor: 1, intlUnit: 'byte' },
  { id: 'KiB', factor: 1024 },
  { id: 'MiB', factor: 1024 ** 2 },
  { id: 'GiB', factor: 1024 ** 3 },
  { id: 'TiB', factor: 1024 ** 4 },
  { id: 'PiB', factor: 1024 ** 5 },
];

export const SI_BYTE_UNITS: readonly UnitDefinition<SiByteUnit>[] = [
  { id: 'B', factor: 1, intlUnit: 'byte' },
  { id: 'kB', factor: 1000, intlUnit: 'kilobyte' },
  { id: 'MB', factor: 1000 ** 2, intlUnit: 'megabyte' },
  { id: 'GB', factor: 1000 ** 3, intlUnit: 'gigabyte' },
  { id: 'TB', factor: 1000 ** 4, intlUnit: 'terabyte' },
  { id: 'PB', factor: 1000 ** 5, intlUnit: 'petabyte' },
];

export const BITRATE_UNITS: readonly UnitDefinition<BitrateUnit>[] = [
  { id: 'bps', factor: 1, intlUnit: 'bit-per-second' },
  { id: 'kbps', factor: 1000, intlUnit: 'kilobit-per-second' },
  { id: 'Mbps', factor: 1000 ** 2, intlUnit: 'megabit-per-second' },
  { id: 'Gbps', factor: 1000 ** 3, intlUnit: 'gigabit-per-second' },
  { id: 'Tbps', factor: 1000 ** 4, intlUnit: 'terabit-per-second' },
];

/** The default duration units a DurationField offers. */
export const DEFAULT_DURATION_UNITS: readonly DurationUnit[] = ['s', 'm', 'h', 'd'];

export function byteUnits(system: 'iec' | 'si'): readonly UnitDefinition<ByteUnit>[] {
  return system === 'iec' ? IEC_BYTE_UNITS : SI_BYTE_UNITS;
}

export function durationUnit(id: DurationUnit): UnitDefinition<DurationUnit> {
  return DURATION_UNITS.find((unit) => unit.id === id) ?? { id, factor: 1 };
}

/** The given duration units' definitions, sorted smallest first. */
export function durationUnits(ids: readonly DurationUnit[]): UnitDefinition<DurationUnit>[] {
  return DURATION_UNITS.filter((unit) => ids.includes(unit.id));
}
