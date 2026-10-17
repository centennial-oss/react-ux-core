// Value-axis ranges and titles, shared by TimeSeriesChart and CategoryChart.

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
  return {
    ...(min !== undefined ? { min } : {}),
    ...(max !== undefined ? { max } : {}),
    ...(lows.length > 0 ? { suggestedMin: Math.min(...lows) } : {}),
    ...(highs.length > 0 ? { suggestedMax: Math.max(...highs) } : {}),
  };
}

/** A Chart.js scale title for `title`, in the muted text colour; hidden without one. */
export function valueAxisTitle(title: string | undefined, color: string) {
  return title === undefined ? { display: false } : { display: true, text: title, color };
}
