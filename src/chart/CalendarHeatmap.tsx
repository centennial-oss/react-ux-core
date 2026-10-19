// CalendarHeatmap: one cell per day, a column per week and a row per weekday (a study calendar), on HeatmapChart.
// Days in the range without a value count as 0; days outside it have no cell. With no activity at all, the grid
// stays (so the dates still read), every day in the lowest colour, with the empty-state text under it.

import { useMemo } from 'react';
import { useLocale } from 'react-aria-components';
import { DAY_MS } from '../utils/time';
import { dateTimeFormat } from '../utils/intl';
import type { ChartFrameOptions } from './ChartFrame';
import type { HeatScale } from './heat';
import type { HeatCellSize } from './heatLayout';
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
  /**
   * `fit` shrinks cells (down to 10 px, or 24 px on touch screens) so every week fits the width before scrolling;
   * `sm`, `md` and `lg` are fixed sizes. Defaults to `fit`.
   */
  cellSize?: HeatCellSize;
  /** Where a calendar that still scrolls starts. Defaults to `end` (the latest weeks). */
  initialScroll?: 'start' | 'end';
}

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
  emptyState,
  cellSize = 'fit',
  initialScroll = 'end',
  ...frame
}: CalendarHeatmapProps) {
  const messages = useChartMessages();
  const { locale } = useLocale();

  const calendar = useMemo(() => {
    const first = parseDay(start);
    const last = parseDay(end);
    const weekStart = firstDayOfWeek(locale) % 7; // 0 Sunday … 6 Saturday
    const offset = (new Date(first).getUTCDay() - weekStart + 7) % 7;
    const gridStart = first - offset * DAY_MS;
    const weeks = Math.max(1, Math.ceil((last - gridStart + DAY_MS) / (7 * DAY_MS)));
    const weekday = dateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
    const short = dateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
    const rows: HeatmapAxisItem[] = Array.from({ length: 7 }, (_, row) => ({
      id: String(row),
      label: weekday.format(new Date(gridStart + row * DAY_MS)),
    }));
    const monthName = dateTimeFormat(locale, { month: 'short', timeZone: 'UTC' });
    const columns: HeatmapAxisItem[] = Array.from({ length: weeks }, (_, week) => {
      const weekStart = Math.max(first, gridStart + week * 7 * DAY_MS);
      const weekEnd = Math.min(last, gridStart + (week * 7 + 6) * DAY_MS);
      // The week a month starts in (or the first week) is labelled with the month's name.
      let mark: string | undefined;
      for (let day = weekStart; day <= weekEnd; day += DAY_MS) {
        if (new Date(day).getUTCDate() === 1 || (week === 0 && day === weekStart)) {
          mark = monthName.format(new Date(day));
        }
      }
      return {
        id: isoDay(gridStart + week * 7 * DAY_MS),
        label: short.format(new Date(weekStart)),
        mark,
      };
    });
    const grid = rows.map((_, row) =>
      columns.map((__, week) => {
        const time = gridStart + (week * 7 + row) * DAY_MS;
        return time < first || time > last ? undefined : (values[isoDay(time)] ?? 0);
      }),
    );
    const isInactive = grid.every((row) =>
      row.every((value) => value === undefined || value === 0),
    );
    return { rows, columns, grid, gridStart, isInactive };
  }, [start, end, values, locale]);

  const full = dateTimeFormat(locale, { dateStyle: 'full', timeZone: 'UTC' });
  const dateOf = (row: HeatmapAxisItem, column: HeatmapAxisItem) =>
    parseDay(column.id) + Number(row.id) * DAY_MS;

  return (
    <HeatmapChart
      {...frame}
      rows={calendar.rows}
      columns={calendar.columns}
      values={calendar.grid}
      scale={{ min: 0, ...scale }}
      unit={unit}
      cellSize={cellSize}
      initialScroll={initialScroll}
      notice={calendar.isInactive ? (emptyState ?? messages.calendarNoActivity) : undefined}
      cellLabel={(row, column, value) => {
        return messages.calendarDay({ date: full.format(new Date(dateOf(row, column))), value });
      }}
      onCellPress={
        onDayPress
          ? (rowId, columnId) => {
              onDayPress(isoDay(parseDay(columnId) + Number(rowId) * DAY_MS));
            }
          : undefined
      }
    />
  );
}
