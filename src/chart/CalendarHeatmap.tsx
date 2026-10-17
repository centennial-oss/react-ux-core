// CalendarHeatmap: one cell per day, a column per week and a row per weekday (a study calendar), on HeatmapChart.
// Days in the range without a value count as 0; days outside it have no cell.

import { useMemo } from 'react';
import { useLocale } from 'react-aria-components';
import type { ChartFrameOptions } from './ChartFrame';
import type { HeatScale } from './heat';
import { HeatmapChart, type HeatmapAxisItem } from './HeatmapChart';
import { useChartMessages } from './messages';

export interface CalendarHeatmapProps extends Omit<ChartFrameOptions, 'height'> {
  /** Values by ISO date (`YYYY-MM-DD`). */
  values: Readonly<Record<string, number>>;
  /** The first day, as an ISO date. */
  start: string;
  /** The last day, as an ISO date. */
  end: string;
  /** Defaults to a sequential scale from 0 to the highest value. */
  scale?: HeatScale;
  /** The values' unit ("sessions"). */
  unit?: string;
  /** Called with a day's ISO date when it's pressed. */
  onDayPress?: (date: string) => void;
}

const DAY = 86_400_000;

function parseDay(iso: string): number {
  const [year = 0, month = 1, day = 1] = iso.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function isoDay(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

/** The locale's first day of the week (1 Monday … 7 Sunday), or Sunday when the browser can't say. */
function firstDayOfWeek(locale: string): number {
  const info = new Intl.Locale(locale) as Intl.Locale & {
    getWeekInfo?: () => { firstDay: number };
    weekInfo?: { firstDay: number };
  };
  return info.getWeekInfo?.().firstDay ?? info.weekInfo?.firstDay ?? 7;
}

/** Days as a calendar of weeks: shaded by value, named by date, navigable by keyboard. */
export function CalendarHeatmap({
  values,
  start,
  end,
  scale,
  unit,
  onDayPress,
  ...frame
}: CalendarHeatmapProps) {
  const messages = useChartMessages();
  const { locale } = useLocale();

  const calendar = useMemo(() => {
    const first = parseDay(start);
    const last = parseDay(end);
    const weekStart = firstDayOfWeek(locale) % 7; // 0 Sunday … 6 Saturday
    const offset = (new Date(first).getUTCDay() - weekStart + 7) % 7;
    const gridStart = first - offset * DAY;
    const weeks = Math.max(1, Math.ceil((last - gridStart + DAY) / (7 * DAY)));
    const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
    const short = new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
    const rows: HeatmapAxisItem[] = Array.from({ length: 7 }, (_, row) => ({
      id: String(row),
      label: weekday.format(new Date(gridStart + row * DAY)),
    }));
    const columns: HeatmapAxisItem[] = Array.from({ length: weeks }, (_, week) => ({
      id: isoDay(gridStart + week * 7 * DAY),
      label: short.format(new Date(Math.max(first, gridStart + week * 7 * DAY))),
    }));
    const grid = rows.map((_, row) =>
      columns.map((__, week) => {
        const time = gridStart + (week * 7 + row) * DAY;
        return time < first || time > last ? undefined : (values[isoDay(time)] ?? 0);
      }),
    );
    return { rows, columns, grid, gridStart };
  }, [start, end, values, locale]);

  const full = new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: 'UTC' });
  const dateOf = (row: HeatmapAxisItem, column: HeatmapAxisItem) =>
    parseDay(column.id) + Number(row.id) * DAY;

  return (
    <HeatmapChart
      {...frame}
      rows={calendar.rows}
      columns={calendar.columns}
      values={calendar.grid}
      scale={{ min: 0, ...scale }}
      unit={unit}
      cellLabel={(row, column, value) => {
        return messages.calendarDay({ date: full.format(new Date(dateOf(row, column))), value });
      }}
      onCellPress={
        onDayPress
          ? (rowId, columnId) => {
              onDayPress(isoDay(parseDay(columnId) + Number(rowId) * DAY));
            }
          : undefined
      }
    />
  );
}
