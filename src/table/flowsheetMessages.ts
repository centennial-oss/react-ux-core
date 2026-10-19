// English defaults of `/table`'s strings for Flowsheet and ReferenceValue (FR-059). They merge into
// `useTableMessages()`, so apps override them through `UIProvider`'s `messages` like any other table string.

/** Strings for Flowsheet and ReferenceValue. */
export interface FlowsheetMessages {
  /** Flags, spelled out for screen readers and tooltips (the letters are shown). */
  referenceHigh: string;
  referenceLow: string;
  referenceCriticallyHigh: string;
  referenceCriticallyLow: string;
  referenceAbnormal: string;
  referenceNormal: string;
  /** A range with only a lower limit ("≥ 95"). */
  referenceAtLeast: (params: { low: string }) => string;
  /** A range with only an upper limit ("≤ 5.0"). */
  referenceAtMost: (params: { high: string }) => string;
  /** The reference range in a tooltip or trend ("Reference range: 60–100 bpm"). */
  referenceRange: (params: { range: string }) => string;
  /** The critical limits in a tooltip or trend ("Critical limits: below 40, above 140"). */
  referenceCriticalLimits: (params: { range: string }) => string;
  /** Critical limits with both ends ("below 40, above 140"). */
  referenceCriticalBoth: (params: { low: string; high: string }) => string;
  /** A critical limit with only a lower end ("below 40"). */
  referenceCriticalBelow: (params: { low: string }) => string;
  /** A critical limit with only an upper end ("above 140"). */
  referenceCriticalAbove: (params: { high: string }) => string;
  /** A note on a value ("Note: repeat sample"). */
  referenceNote: (params: { note: string }) => string;
  /** The flowsheet's first column header. */
  flowsheetObservation: string;
  /** The trend popover's name ("Heart rate trend"). */
  flowsheetShowTrend: (params: { label: string }) => string;
  /** The trend popover's heading with the unit ("Heart rate (bpm)"). */
  flowsheetTrendTitle: (params: { label: string; unit: string }) => string;
  /** The trend chart's summary ("Heart rate: 10 values from 62 to 128 bpm, latest 96 bpm."). */
  flowsheetTrendSummary: (params: {
    label: string;
    count: number;
    min: string;
    max: string;
    latest: string;
  }) => string;
  /** The trend's value count when it has no numeric values. */
  flowsheetNoNumericValues: string;
}

export const defaultFlowsheetMessages: FlowsheetMessages = {
  referenceHigh: 'High',
  referenceLow: 'Low',
  referenceCriticallyHigh: 'Critically high',
  referenceCriticallyLow: 'Critically low',
  referenceAbnormal: 'Abnormal',
  referenceNormal: 'Normal',
  referenceAtLeast: ({ low }) => `≥ ${low}`,
  referenceAtMost: ({ high }) => `≤ ${high}`,
  referenceRange: ({ range }) => `Reference range: ${range}`,
  referenceCriticalLimits: ({ range }) => `Critical limits: ${range}`,
  referenceCriticalBoth: ({ low, high }) => `below ${low}, above ${high}`,
  referenceCriticalBelow: ({ low }) => `below ${low}`,
  referenceCriticalAbove: ({ high }) => `above ${high}`,
  referenceNote: ({ note }) => `Note: ${note}`,
  flowsheetObservation: 'Observation',
  flowsheetShowTrend: ({ label }) => `${label} trend`,
  flowsheetTrendTitle: ({ label, unit }) => `${label} (${unit})`,
  flowsheetTrendSummary: ({ label, count, min, max, latest }) =>
    `${label}: ${String(count)} ${count === 1 ? 'value' : 'values'} from ${min} to ${max}, latest ${latest}.`,
  flowsheetNoNumericValues: 'No numeric values to chart',
};
