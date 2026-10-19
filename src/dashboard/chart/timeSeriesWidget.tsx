// The time series chart widget (§10.1): TimeSeriesChart fed `timeSeries` data, with per-series display overrides, the
// dashboard's time zone, and zoom that either sets the dashboard's time range or stays local (CTX-05).

import { ChartLine } from 'lucide-react';
import { useMemo } from 'react';
import { TimeSeriesPlot, type TimeSeries } from '../../chart/TimeSeriesChart';
import { useChartLook } from '../../chart/useChart';
import { useMediaQuery } from '../../utils/useMediaQuery';
import type { TimeRange } from '../../components/TimeRangePicker/resolveTimeRange';
import { timeSeriesShape, type TimeSeriesData } from '../data/shapes';
import type { DashboardContextApi, JsonObject, JsonValue, WidgetRenderProps } from '../types';
import { useChartLegend, type LegendItem } from './legend';
import { widgetFromComponent, type WidgetPropsEnv } from '../widgets/define';
import { ScaledContent } from '../widgets/ScaledContent';
import { chartFrameProps } from './chartFrame';

/** A series' display, overridden per series id. */
export interface SeriesDisplayOverride {
  type?: 'line' | 'bar' | 'area' | 'scatter';
  axis?: 'left' | 'right';
  lineStyle?: 'solid' | 'dashed' | 'dotted' | 'dashDot';
}

/** The time series widget's options. */
export interface TimeSeriesWidgetOptions extends JsonObject {
  /** The chart's own legend: `auto` hides it when the page has a consolidated legend (CTX-13). */
  legend: 'auto' | 'show' | 'hide';
  hasLegendValues: boolean;
  isZoomable: boolean;
  /** `dashboard`: a zoom sets the dashboard's time range; `local`: only this chart zooms (CTX-05). */
  zoomBehavior: 'dashboard' | 'local';
  stack: 'none' | 'normal' | 'percent';
  valueScale: 'linear' | 'logarithmic';
  leftAxisTitle: string;
  rightAxisTitle: string;
  /** Display overrides by series id. */
  seriesOverrides: Record<string, JsonValue>;
}

/** Dash patterns for the line styles, the same ones the legend swatches draw. */
export const LINE_DASHES: Readonly<
  Record<NonNullable<SeriesDisplayOverride['lineStyle']>, readonly number[] | undefined>
> = {
  solid: undefined,
  dashed: [6, 4],
  dotted: [2, 3],
  dashDot: [8, 3, 2, 3],
};

const isOverride = (value: JsonValue | undefined): value is JsonValue & SeriesDisplayOverride =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The series with the widget's overrides and stacking applied. */
export function displaySeries(
  series: readonly TimeSeries[],
  options: Pick<TimeSeriesWidgetOptions, 'stack' | 'seriesOverrides'>,
): TimeSeries[] {
  return series.map((entry) => {
    const override = options.seriesOverrides[entry.id];
    const next: TimeSeries = { ...entry };
    if (isOverride(override)) {
      if (override.type) {
        next.type = override.type;
      }
      if (override.axis) {
        next.axis = override.axis;
      }
      if (override.lineStyle) {
        const dash = LINE_DASHES[override.lineStyle];
        if (dash) {
          next.dash = dash;
        } else {
          delete next.dash;
        }
      }
    }
    if (options.stack !== 'none') {
      next.stack = { id: 'stack', mode: options.stack };
    }
    return next;
  });
}

/** A local zoom stays in the chart: dragging zooms it, and Reset zoom (in the widget's menu) comes back (CTX-05). */
const zoomInPlace = () => undefined;

type PlotProps = Parameters<typeof TimeSeriesPlot>[0];

/** What the widget's component gets: the chart's props, and what it needs for the page's legend. */
export interface TimeSeriesWidgetViewProps {
  plot: PlotProps;
  /** The content scale (RESP-08): the chart is drawn at its base size and zoomed. */
  scale: number;
  legend: TimeSeriesWidgetOptions['legend'];
  dashboard: DashboardContextApi;
  setLegendEntries: WidgetRenderProps<unknown, unknown>['setLegendEntries'];
}

const kinds: Record<NonNullable<TimeSeries['type']>, LegendItem['kind']> = {
  line: 'line',
  area: 'area',
  bar: 'bar',
  scatter: 'point',
};

/** The line style a dash pattern draws, for the legend swatch. */
function lineStyleOf(dash: readonly number[] | undefined): LegendItem['lineStyle'] {
  const key = JSON.stringify(dash ?? null);
  const styles = Object.entries(LINE_DASHES) as [
    NonNullable<LegendItem['lineStyle']>,
    readonly number[] | undefined,
  ][];
  return styles.find(([, pattern]) => JSON.stringify(pattern ?? null) === key)?.[0] ?? 'dashed';
}

/** The chart, in step with the page's consolidated legend (CTX-11 to CTX-13). */
function TimeSeriesWidgetView({
  plot,
  scale,
  legend,
  dashboard,
  setLegendEntries,
}: TimeSeriesWidgetViewProps) {
  const { palette } = useChartLook();
  const items = useMemo(
    () =>
      plot.series.map((entry, index): LegendItem => {
        const item: LegendItem = {
          id: entry.id,
          label: entry.label,
          color: palette.series(entry.color, index),
          kind: kinds[entry.type ?? 'line'],
          lineStyle: lineStyleOf(entry.dash),
        };
        const legendKey = (entry as { legendKey?: unknown }).legendKey;
        if (typeof legendKey === 'string') {
          item.legendKey = legendKey;
        }
        return item;
      }),
    [plot.series, palette],
  );
  const legendProps = useChartLegend({ items, dashboard, setLegendEntries, legend });
  // On touch screens the dashboard scrolls: pinch and pan zooming would capture the page's scrolling, so the chart
  // doesn't zoom there (RESP-16); taps still inspect it, and the header's time range zooms.
  const isCoarse = useMediaQuery('(pointer: coarse)');
  const chart = (
    <TimeSeriesPlot {...plot} isZoomable={plot.isZoomable && !isCoarse} {...legendProps} />
  );
  // Large displays zoom the chart as a whole, so its labels, ticks and lines grow with the dashboard (RESP-08).
  return scale === 1 ? chart : <ScaledContent scale={scale}>{chart}</ScaledContent>;
}

function toViewProps(
  data: TimeSeriesData | undefined,
  options: TimeSeriesWidgetOptions,
  env: WidgetPropsEnv,
): TimeSeriesWidgetViewProps {
  return {
    plot: toPlotProps(data, options, env),
    scale: env.frameSize.scale,
    legend: options.legend,
    dashboard: env.dashboard,
    setLegendEntries: env.setLegendEntries,
  };
}

function toPlotProps(
  data: TimeSeriesData | undefined,
  options: TimeSeriesWidgetOptions,
  env: WidgetPropsEnv,
): PlotProps {
  const series = displaySeries(data?.series ?? [], options);
  const isCompact = env.frameSize.sizeClass === 'compact';
  const isLocal = options.zoomBehavior === 'local' || env.instance.time?.mode === 'override';
  const axes: PlotProps['axes'] = {};
  if (!isCompact && options.leftAxisTitle !== '') {
    axes.left = { title: options.leftAxisTitle };
  }
  if (!isCompact && options.rightAxisTitle !== '') {
    axes.right = { title: options.rightAxisTitle };
  }
  const window = env.timeRange;
  return {
    ...chartFrameProps(env),
    series,
    thresholds: data?.thresholds,
    bands: data?.bands,
    events: data?.events,
    timeZone: env.dashboard.timeZone,
    axes,
    valueScale: options.valueScale,
    isZoomable: options.isZoomable,
    hasLegendValues: options.hasLegendValues && !isCompact,
    // The visible window is the range the data was loaded for, even where the data is sparse (BI-01).
    xRange: window ? [window.start.getTime(), window.end.getTime()] : undefined,
    onRangeSelect: isLocal
      ? zoomInPlace
      : (start: Date, end: Date) => {
          const range: TimeRange = {
            kind: 'absolute',
            start: start.toISOString(),
            end: end.toISOString(),
          };
          env.dashboard.setTimeRange(range);
        },
  };
}

/** The time series chart widget type (P0). */
export const timeSeriesChartWidget = widgetFromComponent<
  TimeSeriesWidgetOptions,
  TimeSeriesData,
  TimeSeriesWidgetViewProps
>({
  type: 'ccux.timeSeriesChart',
  displayName: (messages) => messages.timeSeriesWidget,
  description: (messages) => messages.timeSeriesWidgetDescription,
  icon: ChartLine,
  category: (messages) => messages.widgetCategoryCharts,
  dataShape: timeSeriesShape,
  defaultSize: { w: 6, h: 4 },
  minSize: { w: 3, h: 3 },
  minPixelSize: { width: 280, height: 160 },
  stackedHeight: 6,
  hasOwnStates: true,
  capabilities: { canUseTimeRange: true, canPublishLegend: true },
  defaultOptions: {
    legend: 'auto',
    hasLegendValues: false,
    isZoomable: true,
    zoomBehavior: 'dashboard',
    stack: 'none',
    valueScale: 'linear',
    leftAxisTitle: '',
    rightAxisTitle: '',
    seriesOverrides: {},
  },
  optionsSchema: [
    {
      type: 'pillbox',
      name: 'legend',
      label: (m) => m.optionLegend,
      items: [
        { id: 'auto', label: (m) => m.optionLegendAuto },
        { id: 'show', label: (m) => m.optionLegendShow },
        { id: 'hide', label: (m) => m.optionLegendHide },
      ],
    },
    { type: 'switch', name: 'hasLegendValues', label: (m) => m.optionLegendValues },
    { type: 'switch', name: 'isZoomable', label: (m) => m.optionZoomable },
    {
      type: 'select',
      name: 'zoomBehavior',
      label: (m) => m.optionZoomBehavior,
      items: [
        { id: 'dashboard', label: (m) => m.optionZoomDashboard },
        { id: 'local', label: (m) => m.optionZoomLocal },
      ],
    },
    {
      type: 'pillbox',
      name: 'stack',
      label: (m) => m.optionStack,
      items: [
        { id: 'none', label: (m) => m.optionStackNone },
        { id: 'normal', label: (m) => m.optionStackNormal },
        { id: 'percent', label: (m) => m.optionStackPercent },
      ],
    },
    {
      type: 'pillbox',
      name: 'valueScale',
      label: (m) => m.optionValueScale,
      items: [
        { id: 'linear', label: (m) => m.optionScaleLinear },
        { id: 'logarithmic', label: (m) => m.optionScaleLog },
      ],
    },
    { type: 'text', name: 'leftAxisTitle', label: (m) => m.optionLeftAxis },
    { type: 'text', name: 'rightAxisTitle', label: (m) => m.optionRightAxis },
  ],
  component: TimeSeriesWidgetView,
  toProps: toViewProps,
});
