// The category chart widget (§10.6): CategoryChart fed `categorical` data, as bars or a donut, publishing its series
// (a donut's categories) to the page's consolidated legend (CTX-11 to CTX-13).

import { ChartBar } from 'lucide-react';
import { useMemo } from 'react';
import { CategoryChart, type CategoryBarChartProps } from '../../chart/CategoryChart';
import { useChartLook } from '../../chart/useChart';
import { categoricalShape, type CategoricalData } from '../data/shapes';
import type { DashboardContextApi, JsonObject, WidgetRenderProps } from '../types';
import { widgetFromComponent } from '../widgets/define';
import { ScaledContent } from '../widgets/ScaledContent';
import { chartFrameProps } from './chartFrame';
import { useChartLegend, type LegendItem } from './legend';

/** The category chart widget's options. */
export interface CategoryChartWidgetOptions extends JsonObject {
  chartType: 'bar' | 'horizontalBar' | 'stackedBar' | 'donut';
  /** The chart's own legend: `auto` hides it when the page has a consolidated legend (CTX-13). */
  legend: 'auto' | 'show' | 'hide';
  unit: string;
  valueAxisTitle: string;
}

/** What the widget's component gets: the chart's props, and what it needs for the page's legend. */
export interface CategoryChartWidgetViewProps {
  chart: CategoryBarChartProps;
  scale: number;
  legend: CategoryChartWidgetOptions['legend'];
  dashboard: DashboardContextApi;
  setLegendEntries: WidgetRenderProps<unknown, unknown>['setLegendEntries'];
}

const noCategories: readonly string[] = [];
const noSeries: CategoricalData['series'] = [];

/** The chart, in step with the page's consolidated legend. */
function CategoryChartWidgetView({
  chart,
  scale,
  legend,
  dashboard,
  setLegendEntries,
}: CategoryChartWidgetViewProps) {
  const { palette } = useChartLook();
  const isDonut = chart.type === 'donut';
  // A donut's legend is its categories (as CategoryChart draws it); bars' is their series.
  const items = useMemo(
    (): LegendItem[] =>
      isDonut
        ? chart.categories.map((category, index) => ({
            id: category,
            label: category,
            color: palette.series(undefined, index),
            kind: 'bar',
          }))
        : chart.series.map((entry, index) => ({
            id: entry.id,
            label: entry.label,
            color: palette.series(entry.color, index),
            kind: 'bar',
          })),
    [isDonut, chart.categories, chart.series, palette],
  );
  const legendProps = useChartLegend({ items, dashboard, setLegendEntries, legend });
  const content = <CategoryChart {...chart} {...legendProps} />;
  return scale === 1 ? content : <ScaledContent scale={scale}>{content}</ScaledContent>;
}

/** The category chart widget type (P1). */
export const categoryChartWidget = widgetFromComponent<
  CategoryChartWidgetOptions,
  CategoricalData,
  CategoryChartWidgetViewProps
>({
  type: 'ccux.categoryChart',
  displayName: (messages) => messages.categoryChartWidget,
  description: (messages) => messages.categoryChartWidgetDescription,
  icon: ChartBar,
  category: (messages) => messages.widgetCategoryCharts,
  dataShape: categoricalShape,
  defaultSize: { w: 4, h: 4 },
  minSize: { w: 3, h: 3 },
  minPixelSize: { width: 240, height: 160 },
  stackedHeight: 6,
  hasOwnStates: true,
  capabilities: { canPublishLegend: true },
  defaultOptions: { chartType: 'bar', legend: 'auto', unit: '', valueAxisTitle: '' },
  optionsSchema: [
    {
      type: 'select',
      name: 'chartType',
      label: (m) => m.optionChartType,
      items: [
        { id: 'bar', label: (m) => m.chartTypeBar },
        { id: 'horizontalBar', label: (m) => m.chartTypeHorizontalBar },
        { id: 'stackedBar', label: (m) => m.chartTypeStackedBar },
        { id: 'donut', label: (m) => m.chartTypeDonut },
      ],
    },
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
    { type: 'text', name: 'unit', label: (m) => m.optionUnit },
    { type: 'text', name: 'valueAxisTitle', label: (m) => m.optionValueAxisTitle },
  ],
  toProps: (data, options, env) => {
    const chart: CategoryBarChartProps = {
      ...chartFrameProps(env),
      type: options.chartType,
      categories: data?.categories ?? noCategories,
      series: data?.series ?? noSeries,
    };
    if (options.unit !== '') {
      chart.unit = options.unit;
    }
    if (options.valueAxisTitle !== '' && env.frameSize.sizeClass !== 'compact') {
      chart.valueAxis = { title: options.valueAxisTitle };
    }
    return {
      chart,
      scale: env.frameSize.scale,
      legend: options.legend,
      dashboard: env.dashboard,
      setLegendEntries: env.setLegendEntries,
    };
  },
  component: CategoryChartWidgetView,
});
