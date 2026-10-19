import type { ScaleOptions } from 'chart.js';
import { axisLook } from './chartOptions';
import type { ChartPalette } from './colors';
import { extent } from './format';

/**
 * Half the smallest gap between bar times, so the first and last bars fit inside the axis. Chart.js's own bar
 * offset is half a *tick* gap, which on a narrow chart with day ticks leaves half a day of empty plot at each end.
 */
function barPadding(barTimes: readonly number[]): number {
  const times = [...new Set(barTimes)].sort((a, b) => a - b);
  let gap = Number.POSITIVE_INFINITY;
  for (let index = 1; index < times.length; index += 1) {
    gap = Math.min(gap, (times[index] ?? 0) - (times[index - 1] ?? 0));
  }
  return Number.isFinite(gap) ? gap / 2 : 0;
}

/**
 * The time (x) axis: ticks and labels in the chart's time zone and locale, the start of each day (or month, …)
 * labelled with its date, and room for bars at the ends.
 */
export function timeAxis({
  timeZone,
  locale,
  palette,
  isNarrow,
  times,
  barTimes,
}: {
  timeZone: string;
  locale: string;
  palette: ChartPalette;
  isNarrow: boolean;
  /** Every time in the chart. */
  times: readonly number[];
  /** The times of bar series. */
  barTimes: readonly number[];
}): ScaleOptions<'time'> {
  const padding = barPadding(barTimes);
  const span = padding > 0 ? extent(times) : undefined;
  return {
    type: 'time',
    adapters: { date: { zone: timeZone, locale } },
    offset: false,
    min: span ? span[0] - padding : undefined,
    max: span ? span[1] + padding : undefined,
    ...axisLook(palette, {
      maxTicksLimit: isNarrow ? 4 : 8,
      // The start of each larger unit (a day among hours) is labelled with its date.
      major: { enabled: true },
    }),
  };
}
