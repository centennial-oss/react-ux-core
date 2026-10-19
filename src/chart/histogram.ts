// A histogram on a numeric (linear or logarithmic) x-axis, for LatencyChart: each bucket is a bar from its lower to
// its upper bound, so uneven buckets keep their true widths, with labelled vertical markers (percentiles, an
// objective). Chart.js bars can't span a range on a numeric axis, so a plugin draws them over an invisible point per
// bucket, and the `bucket` interaction mode picks the bucket under the pointer for the tooltip.

import type { Chart, ChartType, InteractionItem, Plugin } from 'chart.js';

/** A vertical marker line with a label at the top of the plot. */
export interface HistogramMarker {
  value: number;
  label: string;
  color: string;
  isDashed: boolean;
}

/** Options for the histogram plugin, keyed under `plugins.histogram`. */
export interface HistogramOptions {
  buckets: readonly { from: number; to: number; count: number }[];
  /** Each bucket's fill. */
  colors: readonly string[];
  /** Each bucket's fill while it's hovered or tapped. */
  activeColors: readonly string[];
  markers: readonly HistogramMarker[];
  /** The label chips' background. */
  surface: string;
  font: string;
}

declare module 'chart.js' {
  // The type parameter must match Chart.js's declaration to merge with it.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface PluginOptionsByType<TType extends ChartType> {
    histogram?: HistogramOptions;
  }
  interface InteractionModeMap {
    bucket: (chart: Chart, event: { x: number | null }) => InteractionItem[];
  }
}

function optionsOf(chart: Chart): HistogramOptions | undefined {
  // Chart.js types resolved options as deep partials; the chart's own config sets every field.
  const options = chart.options.plugins?.histogram as HistogramOptions | undefined;
  return Array.isArray(options?.buckets) ? options : undefined;
}

/** The interaction mode for histograms: the bucket whose range is under the pointer. */
export function bucketMode(chart: Chart, event: { x: number | null }): InteractionItem[] {
  const options = optionsOf(chart);
  const scale = chart.scales.x;
  if (!options || !scale || event.x === null) {
    return [];
  }
  const x = event.x;
  const index = options.buckets.findIndex((bucket) => {
    const start = scale.getPixelForValue(bucket.from);
    const end = scale.getPixelForValue(bucket.to);
    return x >= Math.min(start, end) && x < Math.max(start, end);
  });
  const element = index < 0 ? undefined : chart.getDatasetMeta(0).data[index];
  return element ? [{ element, datasetIndex: 0, index }] : [];
}

/** Draws the buckets (behind the invisible points) and the markers (over them). */
export const histogramPlugin: Plugin = {
  id: 'histogram',
  beforeDatasetsDraw(chart) {
    const options = optionsOf(chart);
    const x = chart.scales.x;
    const y = chart.scales.y;
    if (!options || !x || !y) {
      return;
    }
    const { ctx, chartArea } = chart;
    const active = new Set(chart.tooltip?.getActiveElements().map((item) => item.index) ?? []);
    const base = Math.min(chartArea.bottom, y.getPixelForValue(0));
    ctx.save();
    ctx.beginPath();
    ctx.rect(
      chartArea.left,
      chartArea.top,
      chartArea.right - chartArea.left,
      chartArea.bottom - chartArea.top,
    );
    ctx.clip();
    options.buckets.forEach((bucket, index) => {
      if (bucket.count <= 0) {
        return;
      }
      const start = x.getPixelForValue(bucket.from);
      const end = x.getPixelForValue(bucket.to);
      const left = Math.min(start, end);
      const width = Math.abs(end - start);
      // A pixel's gap between bars that are wide enough to spare it.
      const gap = width > 3 ? 1 : 0;
      const top = y.getPixelForValue(bucket.count);
      ctx.fillStyle =
        (active.has(index) ? options.activeColors[index] : options.colors[index]) ?? '#888888';
      ctx.fillRect(left + gap / 2, top, Math.max(0.5, width - gap), base - top);
    });
    ctx.restore();
  },
  afterDatasetsDraw(chart) {
    const options = optionsOf(chart);
    const x = chart.scales.x;
    if (!options || !x || options.markers.length === 0) {
      return;
    }
    const { ctx, chartArea } = chart;
    ctx.save();
    ctx.font = options.font;
    ctx.textBaseline = 'top';
    const rowHeight = 16;
    // Labels go in rows at the top, each in the first row where it doesn't overlap the one before.
    const rowEnds: number[] = [];
    const sorted = [...options.markers]
      .map((marker) => ({ marker, px: x.getPixelForValue(marker.value) }))
      .filter(
        ({ px }) =>
          Number.isFinite(px) && px >= chartArea.left - 0.5 && px <= chartArea.right + 0.5,
      )
      .sort((a, b) => a.px - b.px);
    // Every line first, so no line crosses another marker's label.
    ctx.lineWidth = 1.5;
    for (const { marker, px } of sorted) {
      ctx.strokeStyle = marker.color;
      ctx.setLineDash(marker.isDashed ? [5, 3] : []);
      ctx.beginPath();
      ctx.moveTo(px, chartArea.top);
      ctx.lineTo(px, chartArea.bottom);
      ctx.stroke();
    }
    for (const { marker, px } of sorted) {
      const width = ctx.measureText(marker.label).width + 6;
      // Right of the line, or left of it near the plot's end.
      const left = px + width + 2 > chartArea.right ? px - width - 2 : px + 2;
      let row = rowEnds.findIndex((end) => end < left);
      if (row < 0) {
        row = rowEnds.length;
      }
      rowEnds[row] = left + width;
      const top = chartArea.top + 2 + row * rowHeight;
      ctx.fillStyle = options.surface;
      ctx.fillRect(left, top, width, rowHeight - 2);
      ctx.fillStyle = marker.color;
      ctx.fillText(marker.label, left + 3, top + 1);
    }
    ctx.restore();
  },
};
