import { toEpochMs } from '../utils/time';
import type { ChartStrings } from './messages';
import { extent, formatSeriesValue, formatTime } from './format';
import type { TimeSeries } from './TimeSeriesChart';

/** A plain-language summary of time series for screen readers: the time span, and each series' range and latest value. */
export function describeTimeSeries(
  series: readonly Pick<TimeSeries, 'label' | 'unit' | 'format' | 'data'>[],
  messages: ChartStrings,
  locale: string,
  timeZone: string,
): string {
  const span = extent(series.flatMap((entry) => entry.data.map((point) => toEpochMs(point.t))));
  if (!span) {
    return messages.noData;
  }
  const parts = [
    messages.timeSeriesSummary({
      count: series.length,
      start: formatTime(span[0], locale, timeZone),
      end: formatTime(span[1], locale, timeZone),
    }),
    ...series.flatMap((entry) => {
      const values = entry.data.flatMap((point) => (point.v === null ? [] : [point.v]));
      const latest = values.at(-1);
      const range = extent(values);
      return latest === undefined || !range
        ? []
        : [
            messages.seriesRange({
              label: entry.label,
              min: formatSeriesValue(range[0], locale, entry),
              max: formatSeriesValue(range[1], locale, entry),
              latest: formatSeriesValue(latest, locale, entry),
            }),
          ];
    }),
  ];
  return parts.join(' ');
}
