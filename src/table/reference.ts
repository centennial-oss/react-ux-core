// Observation types and flag logic shared by ReferenceValue, Flowsheet and ObservationTrend. CCUX only displays the
// flags: validating units, ranges and flags is the app's (and its data source's) job.

import { numberFormat } from '../utils/intl';
import type { TableEntryStrings } from './messages';

/** An HL7-style abnormal flag: high, low, critically high or low, abnormal (non-numeric), or normal. */
export type ObservationFlag = 'H' | 'L' | 'HH' | 'LL' | 'A' | 'N';

/** A normal range; values outside it are flagged. Either end may be open. */
export interface ReferenceRange {
  low?: number;
  high?: number;
  /** The range as the source writes it ("<200", "Negative"), shown instead of the numbers. */
  text?: string;
}

/** Critical limits (panic values), flagged more strongly. */
export interface CriticalRange {
  low?: number;
  high?: number;
}

/** A measure tracked over time: a vital sign, a lab test, a sensor reading. */
export interface Observation {
  id: string;
  /** "Heart rate", "Potassium". */
  label: string;
  unit?: string;
  referenceRange?: ReferenceRange;
  criticalRange?: CriticalRange;
  /** Rows group under this heading ("Vitals", "Chemistry"), in order of first appearance. */
  group?: string;
  /** How numeric values are written, such as `{ maximumFractionDigits: 1 }`. */
  formatOptions?: Intl.NumberFormatOptions;
}

/** One value of an observation at a time. */
export interface ObservationValue {
  observationId: string;
  /** When it was observed: a Date, epoch milliseconds or an ISO 8601 string. */
  at: Date | number | string;
  value: number | string;
  /** An explicit flag from the source system; it takes priority over the reference ranges. */
  flag?: ObservationFlag;
  note?: string;
}

/** How strongly a flag stands out. */
export type FlagSeverity = 'normal' | 'abnormal' | 'critical';

/** A value as a number, when it is one (numbers, and strings such as "5.2"). */
export function numericValue(value: number | string | null | undefined): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/**
 * The flag to show for a value: the source's `flag` when there is one (it takes priority), otherwise from the
 * ranges: `LL`/`HH` beyond the critical limits, `L`/`H` outside the reference range (the limits themselves are
 * normal), `N` inside it. Non-numeric values without a source flag, and values with no ranges, get no flag.
 */
export function resolveFlag({
  value,
  referenceRange,
  criticalRange,
  flag,
}: {
  value: number | string | null | undefined;
  referenceRange?: ReferenceRange;
  criticalRange?: CriticalRange;
  flag?: ObservationFlag;
}): ObservationFlag | undefined {
  if (flag !== undefined) {
    return flag;
  }
  const number = numericValue(value);
  if (number === null) {
    return undefined;
  }
  if (criticalRange?.low !== undefined && number < criticalRange.low) {
    return 'LL';
  }
  if (criticalRange?.high !== undefined && number > criticalRange.high) {
    return 'HH';
  }
  if (referenceRange?.low !== undefined && number < referenceRange.low) {
    return 'L';
  }
  if (referenceRange?.high !== undefined && number > referenceRange.high) {
    return 'H';
  }
  const hasLimits =
    referenceRange?.low !== undefined ||
    referenceRange?.high !== undefined ||
    criticalRange?.low !== undefined ||
    criticalRange?.high !== undefined;
  return hasLimits ? 'N' : undefined;
}

/** A flag's severity: critical for `HH`/`LL`, abnormal for `H`/`L`/`A`, normal otherwise. */
export function flagSeverity(flag: ObservationFlag | undefined): FlagSeverity {
  return flag === 'HH' || flag === 'LL'
    ? 'critical'
    : flag === 'H' || flag === 'L' || flag === 'A'
      ? 'abnormal'
      : 'normal';
}

/** A flag spelled out ("Critically low"). */
export function flagName(flag: ObservationFlag, messages: TableEntryStrings): string {
  switch (flag) {
    case 'H':
      return messages.referenceHigh;
    case 'L':
      return messages.referenceLow;
    case 'HH':
      return messages.referenceCriticallyHigh;
    case 'LL':
      return messages.referenceCriticallyLow;
    case 'A':
      return messages.referenceAbnormal;
    case 'N':
      return messages.referenceNormal;
  }
}

/** Formats numbers of an observation with its unit ("72 bpm"). */
export function valueFormatter(
  locale: string,
  unit: string | undefined,
  formatOptions?: Intl.NumberFormatOptions,
) {
  const format = numberFormat(locale, formatOptions);
  return {
    number: (value: number) => format.format(value),
    withUnit: (value: number) =>
      unit === undefined ? format.format(value) : `${format.format(value)} ${unit}`,
  };
}

/** The reference range as text ("60 bpm–100 bpm", "≥ 95 %"), or `undefined` without one. */
export function rangeText(
  range: ReferenceRange | undefined,
  withUnit: (value: number) => string,
  messages: TableEntryStrings,
): string | undefined {
  if (!range) {
    return undefined;
  }
  if (range.text !== undefined) {
    return range.text;
  }
  if (range.low !== undefined && range.high !== undefined) {
    return messages.range({ from: withUnit(range.low), to: withUnit(range.high) });
  }
  if (range.low !== undefined) {
    return messages.referenceAtLeast({ low: withUnit(range.low) });
  }
  if (range.high !== undefined) {
    return messages.referenceAtMost({ high: withUnit(range.high) });
  }
  return undefined;
}

/** The critical limits as text ("below 40 bpm, above 140 bpm"), or `undefined` without them. */
export function criticalText(
  range: CriticalRange | undefined,
  withUnit: (value: number) => string,
  messages: TableEntryStrings,
): string | undefined {
  if (range?.low !== undefined && range.high !== undefined) {
    return messages.referenceCriticalBoth({ low: withUnit(range.low), high: withUnit(range.high) });
  }
  if (range?.low !== undefined) {
    return messages.referenceCriticalBelow({ low: withUnit(range.low) });
  }
  if (range?.high !== undefined) {
    return messages.referenceCriticalAbove({ high: withUnit(range.high) });
  }
  return undefined;
}

/** A time as epoch milliseconds (NaN when it can't be read). */
export function timeOf(at: Date | number | string): number {
  return at instanceof Date ? at.getTime() : new Date(at).getTime();
}
