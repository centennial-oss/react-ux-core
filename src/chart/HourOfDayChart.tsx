import { useMemo } from 'react';
import { useLocale } from 'react-aria-components';
import { scheduleToHourly, type Schedule } from '../components/ScheduleEditor/schedule';
import { dateTimeFormat } from '../utils/intl';
import { CategoryChart } from './CategoryChart';
import type { ChartFrameOptions } from './ChartFrame';
import type { ChartColor } from './colors';

/** A series of 24 hourly values (index 0 is midnight to 1 am; `null` for none). */
export interface HourlySeries {
  id: string;
  label: string;
  color?: ChartColor;
  data: readonly (number | null)[];
}

/** A daily schedule (a ScheduleEditor value) shown by hour: each hour's time-weighted value. */
export interface ScheduleSeries<V = number> {
  id: string;
  label: string;
  color?: ChartColor;
  schedule: Schedule<V>;
  /** Needed when the schedule's values aren't numbers. */
  toNumber?: (value: V) => number;
}

export interface HourOfDayChartProps<V = number> extends ChartFrameOptions {
  series: readonly (HourlySeries | ScheduleSeries<V>)[];
  /** The values' unit ("kW"). */
  unit?: string;
  /** Stacks the series instead of grouping them. */
  isStacked?: boolean;
}

function isSchedule<V>(entry: HourlySeries | ScheduleSeries<V>): entry is ScheduleSeries<V> {
  return 'schedule' in entry;
}

// Without `toNumber`, a schedule's values are numbers (ScheduleEditor's default).
function asNumber(value: unknown): number {
  return Number(value);
}

/**
 * Values by hour of the day (24 buckets, 0–23), for daily profiles and schedules. A series can be 24 numbers or a
 * ScheduleEditor value, which is shown as each hour's time-weighted value.
 */
export function HourOfDayChart<V = number>({
  series,
  unit,
  isStacked = false,
  ...frame
}: HourOfDayChartProps<V>) {
  const { locale } = useLocale();
  const hours = useMemo(() => {
    const format = dateTimeFormat(locale, { hour: 'numeric', timeZone: 'UTC' });
    return Array.from({ length: 24 }, (_, hour) => format.format(Date.UTC(2000, 0, 1, hour)));
  }, [locale]);
  const categorySeries = useMemo(
    () =>
      series.map((entry) => ({
        id: entry.id,
        label: entry.label,
        color: entry.color,
        data: isSchedule(entry)
          ? scheduleToHourly(entry.schedule, entry.toNumber ?? asNumber)
          : Array.from({ length: 24 }, (_, hour) => entry.data[hour] ?? null),
      })),
    [series],
  );
  return (
    <CategoryChart
      {...frame}
      categories={hours}
      series={categorySeries}
      type={isStacked ? 'stackedBar' : 'bar'}
      unit={unit}
    />
  );
}
