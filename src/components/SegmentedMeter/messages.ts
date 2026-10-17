/** SegmentedMeter's strings. Quantities arrive already formatted (with their unit). */
export interface SegmentedMeterMessages {
  /** A number with the meter's unit, such as "62 GiB". */
  segmentedMeterQuantity: (params: { value: string; unit: string }) => string;
  /** The total beside the label, such as "72 of 100 GiB". `max` includes the unit. */
  segmentedMeterTotal: (params: { value: string; max: string }) => string;
  /** One segment in the summary, such as "Used 62 GiB". */
  segmentedMeterPart: (params: { label: string; value: string }) => string;
  /** The meter's accessible value: the segments (already joined as a list) and the maximum. */
  segmentedMeterSummary: (params: { parts: string; max: string }) => string;
  /** The legend entry for what's left. */
  segmentedMeterFree: string;
  /** Names the legend list, such as "Storage quota, breakdown". */
  segmentedMeterLegend: (params: { label: string }) => string;
  /** Shown (and added to the summary) when the total passes a marker, such as "Over Soft limit (80 GiB)". */
  segmentedMeterOverMarker: (params: { label: string; value: string }) => string;
  /** Shown (and added to the summary) when the total passes the maximum. `amount` includes the unit. */
  segmentedMeterOverCapacity: (params: { amount: string }) => string;
}

export const defaultSegmentedMeterMessages: SegmentedMeterMessages = {
  segmentedMeterQuantity: ({ value, unit }) => `${value} ${unit}`,
  segmentedMeterTotal: ({ value, max }) => `${value} of ${max}`,
  segmentedMeterPart: ({ label, value }) => `${label} ${value}`,
  segmentedMeterSummary: ({ parts, max }) => (parts === '' ? `of ${max}` : `${parts}, of ${max}`),
  segmentedMeterFree: 'Free',
  segmentedMeterLegend: ({ label }) => `${label}, breakdown`,
  segmentedMeterOverMarker: ({ label, value }) => `Over ${label} (${value})`,
  segmentedMeterOverCapacity: ({ amount }) => `Over capacity by ${amount}`,
};
