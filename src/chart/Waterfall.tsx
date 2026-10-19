// CategoryChart's waterfall (FR-055): a bridge from one total to another, such as last month's bill to this
// month's. Each step is a floating bar from the running total: increases in the success tone, decreases in the
// danger tone (each labelled with its sign, so colour isn't the only signal), and totals in neutral from zero, with
// dashed connector lines between bars. On narrow screens the steps run down the page, one row each, so their labels
// read. The summary covers the start, the end and the largest increase and decrease; the table lists running totals.

import type { Chart, ChartConfiguration, ChartType, Plugin } from 'chart.js';
import { useMemo } from 'react';
import { useLocale } from 'react-aria-components';
import { useIsPhone } from '../utils/useMediaQuery';
import { numberFormat } from '../utils/intl';
import { ChartFrame, type ChartFrameOptions, type ChartTable } from './ChartFrame';
import { baseOptions, categoryScale, tooltipOptions, valueScale } from './chartOptions';
import { withAlpha } from './colors';
import { formatSigned, formatValue } from './format';
import { useChartMessages } from './messages';
import { waterfallStrings } from './plotStrings';
import { numberColumn, withUnit } from './tableColumns';
import type { ValueAxisOptions } from './valueAxis';
import { useChart, useChartLook } from './useChart';

/** One step of a waterfall. */
export interface WaterfallStep {
  label: string;
  /** A change (`delta`), or the total to show (`total`), which the running total continues from. */
  value: number;
  /** `total` bars start at zero (the starting total, subtotals and the final total). Defaults to `delta`. */
  kind?: 'delta' | 'total';
}

/** CategoryChart's props for `type: 'waterfall'`. */
export interface CategoryWaterfallProps extends ChartFrameOptions {
  type: 'waterfall';
  steps: readonly WaterfallStep[];
  /** The values' unit ("USD"). */
  unit?: string;
  /** The value axis's range and title. */
  valueAxis?: ValueAxisOptions;
  /** `auto` runs the steps down the page (one row each) on narrow screens. Defaults to `auto`. */
  orientation?: 'auto' | 'vertical' | 'horizontal';
}

/** A step as drawn: where its bar starts and ends, and the running total after it. */
export interface WaterfallBar {
  label: string;
  kind: 'increase' | 'decrease' | 'total';
  start: number;
  end: number;
  /** The step's change (a total's own value). */
  change: number;
  /** The running total after the step. */
  total: number;
}

/** The bars for the steps: deltas float from the running total, totals start at zero and reset it. */
export function waterfallBars(steps: readonly WaterfallStep[]): WaterfallBar[] {
  let running = 0;
  return steps.map((step): WaterfallBar => {
    if (step.kind === 'total') {
      running = step.value;
      return {
        label: step.label,
        kind: 'total',
        start: 0,
        end: step.value,
        change: step.value,
        total: step.value,
      };
    }
    const start = running;
    running += step.value;
    return {
      label: step.label,
      kind: step.value < 0 ? 'decrease' : 'increase',
      start,
      end: running,
      change: step.value,
      total: running,
    };
  });
}

/** Options for the waterfall plugin, keyed under `plugins.waterfall`. */
interface WaterfallOptions {
  totals: readonly number[];
  labels: readonly string[];
  isHorizontal: boolean;
  connectorColor: string;
  labelColor: string;
  font: string;
}

declare module 'chart.js' {
  // The type parameter must match Chart.js's declaration to merge with it.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface PluginOptionsByType<TType extends ChartType> {
    waterfall?: WaterfallOptions;
  }
}

interface BarGeometry {
  x: number;
  y: number;
  base: number;
  width: number;
  height: number;
}

function barsOf(chart: Chart): BarGeometry[] {
  const meta = chart.getDatasetMeta(0);
  return meta.hidden
    ? []
    : meta.data.map(
        (element) => element.getProps(['x', 'y', 'base', 'width', 'height'], true) as BarGeometry,
      );
}

/** Draws dashed connectors between bars at the running total, and each bar's signed label past its end. */
const waterfallPlugin: Plugin<ChartType, WaterfallOptions> = {
  id: 'waterfall',
  afterDatasetsDraw(chart, _args, options: WaterfallOptions | undefined) {
    if (!Array.isArray(options?.totals)) {
      return;
    }
    const valueScale = chart.scales[options.isHorizontal ? 'x' : 'y'];
    if (!valueScale) {
      return;
    }
    const bars = barsOf(chart);
    const { ctx } = chart;
    ctx.save();
    ctx.strokeStyle = options.connectorColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    bars.forEach((bar, index) => {
      const next = bars[index + 1];
      const total = options.totals[index];
      if (!next || total === undefined) {
        return;
      }
      const level = valueScale.getPixelForValue(total);
      ctx.beginPath();
      if (options.isHorizontal) {
        ctx.moveTo(level, bar.y + bar.height / 2);
        ctx.lineTo(level, next.y - next.height / 2);
      } else {
        ctx.moveTo(bar.x + bar.width / 2, level);
        ctx.lineTo(next.x - next.width / 2, level);
      }
      ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.font = options.font;
    ctx.fillStyle = options.labelColor;
    bars.forEach((bar, index) => {
      const label = options.labels[index];
      if (label === undefined) {
        return;
      }
      if (options.isHorizontal) {
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, Math.max(bar.x, bar.base) + 4, bar.y);
      } else {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(label, bar.x, Math.min(bar.y, bar.base) - 3);
      }
    });
    ctx.restore();
  },
};

/** A waterfall chart: CategoryChart with `type: 'waterfall'`. */
export function WaterfallPlot({
  type: _type,
  steps,
  unit,
  valueAxis: valueAxisOptions,
  orientation = 'auto',
  ...frame
}: CategoryWaterfallProps) {
  const messages = useChartMessages(waterfallStrings);
  const { locale } = useLocale();
  const { palette, isReducedMotion } = useChartLook();
  const isNarrow = useIsPhone();
  const isHorizontal = orientation === 'horizontal' || (orientation === 'auto' && isNarrow);
  const bars = useMemo(() => waterfallBars(steps), [steps]);

  const config = useMemo((): ChartConfiguration<'bar'> => {
    const tones = {
      increase: palette.tone('success'),
      decrease: palette.tone('danger'),
      total: palette.tone('neutral'),
    };
    const compact = numberFormat(locale, {
      notation: 'compact',
      maximumFractionDigits: 1,
    });
    const valueAxis = {
      ...valueScale(palette, {
        maxTicksLimit: isNarrow ? 4 : 7,
        // Compact figures ("20K USD") on narrow screens, so a horizontal axis's labels don't collide.
        format: (value) =>
          isNarrow
            ? `${compact.format(value)}${unit === undefined ? '' : ` ${unit}`}`
            : formatValue(value, locale, unit),
        axis: valueAxisOptions,
      }),
      // Room past the longest bar for its label.
      grace: '12%',
    };
    const categoryAxis = categoryScale(palette, { maxRotation: isHorizontal ? 0 : 45 });
    return {
      type: 'bar',
      plugins: [waterfallPlugin],
      data: {
        labels: bars.map((bar) => bar.label),
        datasets: [
          {
            label: frame.title,
            data: bars.map((bar) => [bar.start, bar.end] as [number, number]),
            backgroundColor: bars.map((bar) => withAlpha(tones[bar.kind], 0.85)),
            borderColor: bars.map((bar) => tones[bar.kind]),
            borderWidth: 1,
            borderSkipped: false,
            borderRadius: 2,
            minBarLength: 2,
            categoryPercentage: 0.8,
            barPercentage: 0.9,
          },
        ],
      },
      options: {
        ...baseOptions(isReducedMotion, {
          waterfall: {
            totals: bars.map((bar) => bar.total),
            labels: bars.map((bar) =>
              bar.kind === 'total'
                ? formatValue(bar.total, locale)
                : formatSigned(bar.change, locale),
            ),
            isHorizontal,
            connectorColor: palette.border,
            labelColor: palette.text,
            font: palette.font,
          },
          tooltip: tooltipOptions<'bar'>(palette, {
            label: (item) => {
              const bar = bars[item.dataIndex];
              if (!bar) {
                return '';
              }
              return bar.kind === 'total'
                ? formatValue(bar.total, locale, unit)
                : formatSigned(bar.change, locale, unit);
            },
            afterLabel: (item) => {
              const bar = bars[item.dataIndex];
              return bar && bar.kind !== 'total'
                ? messages.waterfallTotalAfter({ total: formatValue(bar.total, locale, unit) })
                : '';
            },
          }),
        }),
        indexAxis: isHorizontal ? 'y' : 'x',
        interaction: { mode: 'index', intersect: false },
        scales: isHorizontal
          ? { x: valueAxis, y: categoryAxis }
          : { x: categoryAxis, y: valueAxis },
      },
    };
  }, [
    bars,
    palette,
    isHorizontal,
    isNarrow,
    isReducedMotion,
    locale,
    unit,
    valueAxisOptions,
    messages,
    frame.title,
  ]);

  const { canvasRef, chart } = useChart(config);

  const summary = useMemo(() => {
    const first = bars[0];
    const last = bars.at(-1);
    if (!first || !last) {
      return messages.noData;
    }
    const start = first.kind === 'total' ? first.end : first.start;
    const parts = [
      messages.waterfallSummary({
        start: formatValue(start, locale, unit),
        end: formatValue(last.total, locale, unit),
        change: formatSigned(last.total - start, locale, unit),
      }),
    ];
    const deltas = bars.filter((bar) => bar.kind !== 'total');
    const increase = deltas.reduce<WaterfallBar | undefined>(
      (best, bar) => (bar.change > 0 && (!best || bar.change > best.change) ? bar : best),
      undefined,
    );
    const decrease = deltas.reduce<WaterfallBar | undefined>(
      (best, bar) => (bar.change < 0 && (!best || bar.change < best.change) ? bar : best),
      undefined,
    );
    if (increase) {
      parts.push(
        messages.waterfallLargestIncrease({
          label: increase.label,
          value: formatSigned(increase.change, locale, unit),
        }),
      );
    }
    if (decrease) {
      parts.push(
        messages.waterfallLargestDecrease({
          label: decrease.label,
          value: formatSigned(decrease.change, locale, unit),
        }),
      );
    }
    if (valueAxisOptions?.title !== undefined) {
      parts.push(messages.valueAxisTitle({ title: valueAxisOptions.title }));
    }
    return parts.join(' ');
  }, [bars, messages, locale, unit, valueAxisOptions]);

  const table = (): ChartTable => {
    const columns = [
      {
        id: 'step',
        header: messages.waterfallStep,
        isRowHeader: true,
        value: (row: Record<string, unknown>) => row.step,
      },
      numberColumn(
        'change',
        withUnit(messages.waterfallChange, unit),
        (value) => formatSigned(value, locale),
        { mobile: true },
      ),
      numberColumn(
        'total',
        withUnit(messages.waterfallRunningTotal, unit),
        (value) => formatValue(value, locale),
        { mobile: true },
      ),
    ];
    return {
      columns,
      rows: bars.map((bar, index) => ({
        __key: index,
        step: bar.label,
        change: bar.kind === 'total' ? null : bar.change,
        total: bar.total,
      })),
    };
  };

  return (
    <ChartFrame
      {...frame}
      summary={summary}
      isEmpty={bars.length === 0}
      table={table}
      chart={chart}
      canvasRef={canvasRef}
    />
  );
}
