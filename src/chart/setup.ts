// Chart.js registration and the small plugins the charts share. Registration is an explicit call (not an import
// side effect), because the package is marked side-effect free for bundlers.

import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Filler,
  Interaction,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  ScatterController,
  TimeScale,
  Tooltip,
  type ChartType,
  type InteractionItem,
  type Plugin,
} from 'chart.js';
import 'chartjs-adapter-luxon';
import zoomPlugin from 'chartjs-plugin-zoom';

/** A horizontal line across the plot at a value, such as a contract limit. */
export interface ChartThreshold {
  value: number;
  label?: string;
  /** Which value axis it belongs to. Defaults to `left`. */
  axis?: 'left' | 'right';
  /** Defaults to `danger`. */
  tone?: 'neutral' | 'warning' | 'danger' | 'success';
}

/** A shaded range of values, such as a normal operating band. */
export interface ChartBand {
  from: number;
  to: number;
  label?: string;
  axis?: 'left' | 'right';
  /** Defaults to `neutral`. */
  tone?: 'neutral' | 'warning' | 'danger' | 'success';
}

interface ResolvedThreshold {
  value: number;
  label?: string;
  scaleId: string;
  color: string;
}

interface ResolvedBand {
  from: number;
  to: number;
  label?: string;
  scaleId: string;
  color: string;
}

/** Options for the reference plugin, keyed under `plugins.reference`. */
export interface ReferenceOptions {
  thresholds: ResolvedThreshold[];
  bands: ResolvedBand[];
  labelColor: string;
  font: string;
}

declare module 'chart.js' {
  // The type parameter must match Chart.js's declaration to merge with it.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface PluginOptionsByType<TType extends ChartType> {
    reference?: ReferenceOptions;
    crosshair?: { color: string };
  }
  interface InteractionModeMap {
    timeAll: (chart: Chart, event: { x: number | null }) => InteractionItem[];
  }
}

/** Draws threshold lines and value bands behind (bands) and over (lines) the data. */
const referencePlugin: Plugin<ChartType, ReferenceOptions> = {
  id: 'reference',
  beforeDatasetsDraw(chart, _args, options: ReferenceOptions | undefined) {
    // Registered for every chart; charts that don't configure it get empty options.
    if (!Array.isArray(options?.bands) || !Array.isArray(options.thresholds)) {
      return;
    }
    const { ctx, chartArea } = chart;
    ctx.save();
    for (const band of options.bands) {
      const scale = chart.scales[band.scaleId];
      if (!scale) {
        continue;
      }
      const top = scale.getPixelForValue(Math.max(band.from, band.to));
      const bottom = scale.getPixelForValue(Math.min(band.from, band.to));
      ctx.fillStyle = band.color;
      ctx.fillRect(chartArea.left, top, chartArea.right - chartArea.left, bottom - top);
    }
    ctx.restore();
  },
  afterDatasetsDraw(chart, _args, options: ReferenceOptions | undefined) {
    // Registered for every chart; charts that don't configure it get empty options.
    if (!Array.isArray(options?.bands) || !Array.isArray(options.thresholds)) {
      return;
    }
    const { ctx, chartArea } = chart;
    ctx.save();
    ctx.font = options.font;
    for (const line of options.thresholds) {
      const scale = chart.scales[line.scaleId];
      if (!scale) {
        continue;
      }
      const y = scale.getPixelForValue(line.value);
      if (y < chartArea.top || y > chartArea.bottom) {
        continue;
      }
      ctx.strokeStyle = line.color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(chartArea.left, y);
      ctx.lineTo(chartArea.right, y);
      ctx.stroke();
      if (line.label) {
        ctx.fillStyle = options.labelColor;
        ctx.textAlign = 'end';
        ctx.textBaseline = 'bottom';
        ctx.fillText(line.label, chartArea.right - 4, y - 3);
      }
    }
    ctx.restore();
  },
};

/** A vertical line at the hovered time, for time series. */
const crosshairPlugin: Plugin<ChartType, { color: string }> = {
  id: 'crosshair',
  afterDatasetsDraw(chart, _args, options: { color: string } | undefined) {
    const active = chart.tooltip?.getActiveElements() ?? [];
    const first = active[0];
    if (typeof options?.color !== 'string' || !first) {
      return;
    }
    const { ctx, chartArea } = chart;
    ctx.save();
    ctx.strokeStyle = options.color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(first.element.x, chartArea.top);
    ctx.lineTo(first.element.x, chartArea.bottom);
    ctx.stroke();
    ctx.restore();
  },
};

/**
 * An interaction mode for time series: the point nearest the pointer's time in every visible series, so the
 * tooltip lists every series at that time even when their timestamps differ.
 */
function timeAll(chart: Chart, event: { x: number | null }): InteractionItem[] {
  if (event.x === null) {
    return [];
  }
  const x = event.x;
  const items: InteractionItem[] = [];
  chart.data.datasets.forEach((_dataset, datasetIndex) => {
    if (!chart.isDatasetVisible(datasetIndex)) {
      return;
    }
    const meta = chart.getDatasetMeta(datasetIndex);
    let best: InteractionItem | undefined;
    let bestDistance = Number.POSITIVE_INFINITY;
    meta.data.forEach((element, index) => {
      const distance = Math.abs(element.x - x);
      if (distance < bestDistance && !Number.isNaN(element.y)) {
        bestDistance = distance;
        best = { element, datasetIndex, index };
      }
    });
    if (best) {
      items.push(best);
    }
  });
  return items;
}

let isRegistered = false;

/** Registers the Chart.js pieces the charts use (once). */
export function ensureChartsRegistered() {
  if (isRegistered) {
    return;
  }
  isRegistered = true;
  Chart.register(
    LineController,
    BarController,
    ScatterController,
    DoughnutController,
    LineElement,
    BarElement,
    PointElement,
    ArcElement,
    LinearScale,
    CategoryScale,
    TimeScale,
    Filler,
    Tooltip,
    zoomPlugin,
    referencePlugin,
    crosshairPlugin,
  );
  Interaction.modes.timeAll = timeAll;
}
