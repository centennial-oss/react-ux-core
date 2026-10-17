// ScheduleTimeline's date and time formatting: Intl formatters in the timeline's time zone, created once per locale
// and zone.
import { useMemo } from 'react';
import type { ScheduleTimelineMessages } from './messages';
import { zonedParts } from './zone';

export interface TimelineFormat {
  /** A time of day, such as "14:00". */
  time: (ms: number) => string;
  /** A tick label: hours, with minutes when they aren't zero. */
  tick: (ms: number) => string;
  /** A short day, such as "Wed 14". */
  shortDay: (ms: number) => string;
  /** A long day for the agenda, such as "Wednesday 14 October". */
  longDay: (ms: number) => string;
  /** The visible range, such as "12 Oct 2026 – 18 Oct 2026". */
  range: (start: number, end: number) => string;
  /** An item's times, such as "14:00 to 15:30" (with weekdays when the range spans days). */
  itemTime: (start: number, end: number) => string;
  /** A `YYYY-MM-DD` key for the instant's day. */
  dayKey: (ms: number) => string;
}

export function useTimelineFormat(
  locale: string,
  timeZone: string,
  isMultiDay: boolean,
  messages: Pick<ScheduleTimelineMessages, 'scheduleTimeRange'>,
): TimelineFormat {
  return useMemo(() => {
    const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone });
    const hour = new Intl.DateTimeFormat(locale, { hour: 'numeric', timeZone });
    const dayTime = new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
      timeZone,
    });
    const shortDay = new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      day: 'numeric',
      timeZone,
    });
    const longDay = new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      timeZone,
    });
    const dateRange = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone });
    const dateTimeRange = new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone,
    });
    const dayKey = (ms: number) => {
      const { year, month, day } = zonedParts(ms, timeZone);
      return `${String(year)}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    };
    return {
      time: (ms) => time.format(ms),
      tick: (ms) => (zonedParts(ms, timeZone).minute === 0 ? hour : time).format(ms),
      shortDay: (ms) => shortDay.format(ms),
      longDay: (ms) => longDay.format(ms),
      range: (start, end) => {
        const startsAtMidnight = zonedParts(start, timeZone);
        const endsAtMidnight = zonedParts(end, timeZone);
        const isWholeDays =
          startsAtMidnight.hour === 0 &&
          startsAtMidnight.minute === 0 &&
          endsAtMidnight.hour === 0 &&
          endsAtMidnight.minute === 0;
        if (isWholeDays) {
          // The end is exclusive (midnight after the last day).
          const last = end - 1;
          return dayKey(start) === dayKey(last)
            ? longDay.format(start)
            : dateRange.formatRange(start, last);
        }
        return dateTimeRange.formatRange(start, end);
      },
      itemTime: (start, end) =>
        messages.scheduleTimeRange({
          start: (isMultiDay ? dayTime : time).format(start),
          end: (isMultiDay && dayKey(start) !== dayKey(end) ? dayTime : time).format(end),
        }),
      dayKey,
    };
  }, [locale, timeZone, isMultiDay, messages]);
}
