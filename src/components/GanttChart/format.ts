// GanttChart's formatting in the chart's time zone: grid dates, task spans and lengths, percents and the time
// scale's header labels. The Intl formatters are the shared cached ones.
import { useMemo } from 'react';
import type { CoreMessages } from '../../provider/messages';
import { dateTimeFormat, numberFormat } from '../../utils/intl';
import { roundTo } from '../../utils/math';
import { DAY_MS } from '../../utils/time';
import { wholeDays, zonedParts } from '../ScheduleTimeline/zone';
import { HOUR_MS, type TimeUnit } from './scale';

export interface GanttFormat {
  /** A grid date: "12 Oct", with the time when it isn't midnight. */
  date: (ms: number) => string;
  /** The grid's end date: the last day a task covers when it ends at midnight, else its end. */
  endDate: (start: number, end: number) => string;
  /** A task's dates for its name and details: "12–16 Oct 2026", or one date for a milestone. */
  span: (start: number, end: number) => string;
  /** A task's length: "5 days", or hours when shorter than a day. */
  duration: (start: number, end: number) => string;
  /** A percent from 0–100: "40%". */
  percent: (value: number) => string;
  /** A time scale label for the unit starting at `ms`; `isMajor` for the header's top row. */
  tick: (ms: number, unit: TimeUnit, isMajor: boolean) => string;
}

export function useGanttFormat(
  locale: string,
  timeZone: string,
  messages: Pick<CoreMessages, 'ganttQuarter'>,
): GanttFormat {
  return useMemo(() => {
    const zoned = (options: Intl.DateTimeFormatOptions) =>
      dateTimeFormat(locale, { ...options, timeZone });
    const day = zoned({ day: 'numeric', month: 'short' });
    const dayTime = zoned({ day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
    const days = zoned({ dateStyle: 'medium' });
    const times = zoned({ dateStyle: 'medium', timeStyle: 'short' });
    const percent = numberFormat(locale, { style: 'percent', maximumFractionDigits: 0 });
    const dayCount = numberFormat(locale, { style: 'unit', unit: 'day', unitDisplay: 'short' });
    const hourCount = numberFormat(locale, { style: 'unit', unit: 'hour', unitDisplay: 'short' });
    const ticks: Record<TimeUnit, [Intl.DateTimeFormat, Intl.DateTimeFormat]> = {
      hour: [zoned({ hour: 'numeric' }), zoned({ hour: 'numeric' })],
      day: [zoned({ day: 'numeric' }), zoned({ weekday: 'short', day: 'numeric', month: 'short' })],
      week: [day, day],
      month: [zoned({ month: 'short' }), zoned({ month: 'long', year: 'numeric' })],
      quarter: [zoned({ month: 'short' }), zoned({ year: 'numeric' })],
      year: [zoned({ year: 'numeric' }), zoned({ year: 'numeric' })],
    };
    const isMidnight = (ms: number) => {
      const { hour, minute } = zonedParts(ms, timeZone);
      return hour === 0 && minute === 0;
    };
    const date = (ms: number) => (isMidnight(ms) ? day : dayTime).format(ms);
    return {
      date,
      endDate: (start, end) => (end > start && isMidnight(end) ? day.format(end - 1) : date(end)),
      span: (start, end) => {
        const isWholeDays = isMidnight(start) && isMidnight(end);
        if (end <= start) {
          return (isWholeDays ? days : times).format(start);
        }
        return isWholeDays ? days.formatRange(start, end - 1) : times.formatRange(start, end);
      },
      duration: (start, end) => {
        const length = Math.max(0, end - start);
        if (length > 0 && length < DAY_MS - HOUR_MS) {
          return hourCount.format(roundTo(length / HOUR_MS, 1));
        }
        return dayCount.format(wholeDays(start, end, timeZone) ?? roundTo(length / DAY_MS, 1));
      },
      percent: (value) => percent.format(value / 100),
      tick: (ms, unit, isMajor) => {
        if (unit === 'quarter' && !isMajor) {
          return messages.ganttQuarter({
            quarter: Math.floor((zonedParts(ms, timeZone).month - 1) / 3) + 1,
          });
        }
        return ticks[unit][isMajor ? 1 : 0].format(ms);
      },
    };
  }, [locale, timeZone, messages]);
}
