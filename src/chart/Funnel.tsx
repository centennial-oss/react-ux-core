// CategoryChart's funnel: how many make it through each step of a process (visits, sign-ups, purchases). Each step is
// a bar centred on the middle line, its width in proportion to its value, with shaded joins between steps and a
// label giving the value and its share of the first step. The summary gives the overall conversion and the largest
// drop; the table gives each step's share of the first and of the previous step.

import type { Chart, ChartConfiguration, ChartType, Plugin } from 'chart.js';
import { useMemo } from 'react';
import { useLocale } from 'react-aria-components';
import { useIsPhone } from '../utils/useMediaQuery';
import { ChartFrame, type ChartFrameOptions, type ChartTable } from './ChartFrame';
import { baseOptions, categoryScale, tooltipOptions } from './chartOptions';
import { withAlpha, type ChartColor } from './colors';
import { extent, formatPercent, formatValue } from './format';
import { contrast } from './heat';
import { useChartMessages } from './messages';
import { funnelStrings } from './plotStrings';
import { numberColumn, withUnit } from './tableColumns';
import { useChart, useChartLook } from './useChart';

/** One step of a funnel. */
export interface FunnelStep {
  label: string;
  value: number;
}

/** CategoryChart's props for `type: 'funnel'`. */
export interface CategoryFunnelProps extends ChartFrameOptions {
  type: 'funnel';
  /** The steps, from the first (widest) down. */
  steps: readonly FunnelStep[];
  /** The values' unit ("visitors"). */
  unit?: string;
  /** Defaults to `chart-1`. */
  color?: ChartColor;
}

/** A step with its shares (from 0 to 100) of the first and the previous step. */
export interface FunnelRow {
  label: string;
  value: number;
  ofFirst: number;
  ofPrevious: number;
}

/** Each step's share of the first step and of the step before it (100 for the first, 0 after a zero). */
export function funnelRows(steps: readonly FunnelStep[]): FunnelRow[] {
  const first = steps[0]?.value ?? 0;
  return steps.map((step, index) => {
    const previous = index === 0 ? step.value : (steps[index - 1]?.value ?? 0);
    return {
      label: step.label,
      value: step.value,
      ofFirst: first > 0 ? (step.value / first) * 100 : 0,
      ofPrevious: previous > 0 ? (step.value / previous) * 100 : 0,
    };
  });
}

/** Options for the funnel plugin, keyed under `plugins.funnel`. */
interface FunnelOptions {
  labels: readonly string[];
  joinColor: string;
  labelColor: string;
  insideColor: string;
  font: string;
}

declare module 'chart.js' {
  // The type parameter must match Chart.js's declaration to merge with it.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface PluginOptionsByType<TType extends ChartType> {
    funnel?: FunnelOptions;
  }
}

interface BarGeometry {
  x: number;
  y: number;
  base: number;
  height: number;
}

function barsOf(chart: Chart): BarGeometry[] {
  const meta = chart.getDatasetMeta(0);
  return meta.data.map(
    (element) => element.getProps(['x', 'y', 'base', 'height'], true) as BarGeometry,
  );
}

/** Shades the joins between steps (behind the bars) and labels each bar (inside it, or beside it when it's narrow). */
const funnelPlugin: Plugin<ChartType, FunnelOptions> = {
  id: 'funnel',
  beforeDatasetsDraw(chart, _args, options: FunnelOptions | undefined) {
    if (!Array.isArray(options?.labels)) {
      return;
    }
    const bars = barsOf(chart);
    const { ctx } = chart;
    ctx.save();
    ctx.fillStyle = options.joinColor;
    bars.forEach((bar, index) => {
      const next = bars[index + 1];
      if (!next) {
        return;
      }
      const top = bar.y + bar.height / 2;
      const bottom = next.y - next.height / 2;
      ctx.beginPath();
      ctx.moveTo(Math.min(bar.x, bar.base), top);
      ctx.lineTo(Math.max(bar.x, bar.base), top);
      ctx.lineTo(Math.max(next.x, next.base), bottom);
      ctx.lineTo(Math.min(next.x, next.base), bottom);
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();
  },
  afterDatasetsDraw(chart, _args, options: FunnelOptions | undefined) {
    if (!Array.isArray(options?.labels)) {
      return;
    }
    const bars = barsOf(chart);
    const { ctx, chartArea } = chart;
    ctx.save();
    ctx.font = options.font;
    ctx.textBaseline = 'middle';
    bars.forEach((bar, index) => {
      const label = options.labels[index];
      if (label === undefined) {
        return;
      }
      const width = Math.abs(bar.x - bar.base);
      const textWidth = ctx.measureText(label).width;
      const centre = (bar.x + bar.base) / 2;
      if (textWidth + 12 <= width) {
        ctx.textAlign = 'center';
        ctx.fillStyle = options.insideColor;
        ctx.fillText(label, centre, bar.y);
      } else {
        // Beside the bar's right end, kept inside the plot.
        const right = Math.max(bar.x, bar.base);
        ctx.textAlign = 'left';
        ctx.fillStyle = options.labelColor;
        ctx.fillText(label, Math.min(right + 6, chartArea.right - textWidth), bar.y);
      }
    });
    ctx.restore();
  },
};

/** A funnel chart: CategoryChart with `type: 'funnel'`. */
export function FunnelPlot({
  type: _type,
  steps,
  unit,
  color = 'chart-1',
  ...frame
}: CategoryFunnelProps) {
  const messages = useChartMessages(funnelStrings);
  const { locale } = useLocale();
  const { palette, isReducedMotion } = useChartLook();
  const isNarrow = useIsPhone();
  const rows = useMemo(() => funnelRows(steps), [steps]);

  const config = useMemo((): ChartConfiguration<'bar'> => {
    const fill = palette.series(color, 0);
    const largest = Math.max(0, extent(rows.map((row) => row.value))?.[1] ?? 0);
    return {
      type: 'bar',
      plugins: [funnelPlugin],
      data: {
        labels: rows.map((row) => row.label),
        datasets: [
          {
            label: frame.title,
            data: rows.map((row) => [-row.value / 2, row.value / 2] as [number, number]),
            backgroundColor: fill,
            borderColor: fill,
            borderWidth: 1,
            borderSkipped: false,
            borderRadius: 2,
            minBarLength: 2,
            categoryPercentage: 1,
            barPercentage: 0.72,
          },
        ],
      },
      options: {
        ...baseOptions(isReducedMotion, {
          funnel: {
            labels: rows.map((row, index) =>
              index === 0 || isNarrow
                ? formatValue(row.value, locale)
                : `${formatValue(row.value, locale)} (${formatPercent(row.ofFirst, locale)})`,
            ),
            joinColor: withAlpha(fill, 0.18),
            labelColor: palette.text,
            // The theme's text or surface colour, whichever reads better on the bar.
            insideColor:
              contrast(palette.text, fill) >= contrast(palette.surface, fill)
                ? palette.text
                : palette.surface,
            font: palette.font,
          },
          tooltip: tooltipOptions<'bar'>(palette, {
            label: (item) => {
              const row = rows[item.dataIndex];
              return row ? formatValue(row.value, locale, unit) : '';
            },
            afterLabel: (item) => {
              const row = rows[item.dataIndex];
              return row && item.dataIndex > 0
                ? messages.funnelShares({
                    ofFirst: formatPercent(row.ofFirst, locale),
                    ofPrevious: formatPercent(row.ofPrevious, locale),
                  })
                : '';
            },
          }),
        }),
        indexAxis: 'y',
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { display: false, min: -largest / 2, max: largest / 2 },
          y: {
            ...categoryScale(palette, { font: { size: isNarrow ? 11 : 12 } }),
            border: { display: false },
          },
        },
      },
    };
  }, [rows, palette, color, isNarrow, isReducedMotion, locale, unit, messages, frame.title]);

  const { canvasRef, chart } = useChart(config);

  const summary = useMemo(() => {
    const first = rows[0];
    const last = rows.at(-1);
    if (!first || !last) {
      return messages.noData;
    }
    const parts = [
      messages.funnelSummary({
        count: rows.length,
        first: formatValue(first.value, locale, unit),
        last: formatValue(last.value, locale, unit),
        share: formatPercent(last.ofFirst, locale),
      }),
    ];
    let drop: FunnelRow | undefined;
    let dropFrom: FunnelRow | undefined;
    rows.forEach((row, index) => {
      const previous = rows[index - 1];
      if (previous && (!drop || row.ofPrevious < drop.ofPrevious)) {
        drop = row;
        dropFrom = previous;
      }
    });
    if (drop && dropFrom) {
      parts.push(
        messages.funnelLargestDrop({
          from: dropFrom.label,
          to: drop.label,
          share: formatPercent(drop.ofPrevious, locale),
        }),
      );
    }
    return parts.join(' ');
  }, [rows, messages, locale, unit]);

  const table = (): ChartTable => {
    const percent = (value: number) => formatPercent(value, locale);
    const columns = [
      {
        id: 'step',
        header: messages.funnelStep,
        isRowHeader: true,
        value: (row: Record<string, unknown>) => row.step,
      },
      numberColumn(
        'value',
        withUnit(messages.funnelValue, unit),
        (value) => formatValue(value, locale),
        { mobile: true },
      ),
      numberColumn('ofFirst', messages.funnelOfFirst, percent, { mobile: true }),
      numberColumn('ofPrevious', messages.funnelOfPrevious, percent),
    ];
    return {
      columns,
      rows: rows.map((row, index) => ({
        __key: index,
        step: row.label,
        value: row.value,
        ofFirst: row.ofFirst,
        ofPrevious: index === 0 ? null : row.ofPrevious,
      })),
    };
  };

  return (
    <ChartFrame
      {...frame}
      summary={summary}
      isEmpty={rows.length === 0}
      table={table}
      chart={chart}
      canvasRef={canvasRef}
    />
  );
}
