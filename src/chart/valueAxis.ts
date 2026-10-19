// Value-axis ranges and titles, shared by TimeSeriesChart and CategoryChart.

import { extent } from '../utils/math';
/** A value axis's range and title. */
export interface ValueAxisOptions {
  /** Hard bounds: the axis never goes beyond them (zooming included). */
  min?: number;
  max?: number;
  /** Soft bounds: the axis reaches at least this far, and further if the data needs it. */
  suggestedMin?: number;
  suggestedMax?: number;
  /** Stretches the axis to include its thresholds and bands, so they always show. Defaults to true. */
  shouldIncludeReferences?: boolean;
  /** A visible title for the axis, such as "Score". It's also read in the chart's summary. */
  title?: string;
}

export interface ValueAxisBounds {
  min?: number;
  max?: number;
  suggestedMin?: number;
  suggestedMax?: number;
}

/**
 * Chart.js bounds for an axis: the hard bounds as they are, and the soft bounds stretched to `references` (threshold
 * values, band edges) unless `shouldIncludeReferences` is false. Hard bounds still win.
 */
export function valueAxisBounds(
  options: ValueAxisOptions | undefined,
  references: readonly number[] = [],
): ValueAxisBounds {
  const { min, max, suggestedMin, suggestedMax, shouldIncludeReferences = true } = options ?? {};
  const shown = shouldIncludeReferences ? references.filter((value) => Number.isFinite(value)) : [];
  const lows = [...(suggestedMin === undefined ? [] : [suggestedMin]), ...shown];
  const highs = [...(suggestedMax === undefined ? [] : [suggestedMax]), ...shown];
  const low = extent(lows)?.[0];
  const high = extent(highs)?.[1];
  return {
    ...(min !== undefined ? { min } : {}),
    ...(max !== undefined ? { max } : {}),
    ...(low === undefined ? {} : { suggestedMin: low }),
    ...(high === undefined ? {} : { suggestedMax: high }),
  };
}

/** A Chart.js scale title for `title`, in the muted text colour; hidden without one. */
export function valueAxisTitle(title: string | undefined, color: string) {
  return title === undefined ? { display: false } : { display: true, text: title, color };
}

/** A tick label: `format`, but on a logarithmic axis only the ticks `isLogTickShown` picks. */
export function logTickLabel(isLog: boolean, format: (value: number) => string) {
  return (value: number, index: number, count: number) =>
    isLog && !isLogTickShown(value, index, count) ? '' : format(value);
}

/**
 * Whether a logarithmic axis labels a tick: 1, 2 and 5 times a power of ten, and the first and last ticks, as
 * Chart.js's own log labels do, so the axis doesn't crowd with 3, 4, 6, 7, 8 and 9.
 */
export function isLogTickShown(value: number, index: number, count: number): boolean {
  if (index === 0 || index === count - 1 || value <= 0) {
    return true;
  }
  const mantissa = Math.round((value / 10 ** Math.floor(Math.log10(value))) * 1000) / 1000;
  return mantissa === 1 || mantissa === 2 || mantissa === 5;
}
