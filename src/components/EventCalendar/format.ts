// EventCalendar's date and time formatting: ScheduleTimeline's formats, plus weekday and day-number labels, the month,
// and an event's times ("All day", "14 – 16 Oct", "14:00 to 15:30", "Wed 22:00 to Thu 02:00").
import { useMemo } from 'react';
import { dateTimeFormat } from '../../utils/intl';
import { useTimelineFormat, type TimelineFormat } from '../ScheduleTimeline/format';
import type { ScheduleTimelineMessages } from '../ScheduleTimeline/messages';
import type { CalendarEntry } from './layout';

export interface EventCalendarFormat extends TimelineFormat {
  /** A short weekday, such as "Wed". */
  weekday: (ms: number) => string;
  /** The day of the month, such as "14". */
  dayNumber: (ms: number) => string;
  /** The month and year, such as "October 2026". */
  monthYear: (ms: number) => string;
  /** An event's times. */
  eventTime: (entry: Pick<CalendarEntry, 'start' | 'end' | 'isAllDay'>) => string;
}

export function useEventCalendarFormat(
  locale: string,
  timeZone: string,
  messages: Pick<ScheduleTimelineMessages, 'scheduleTimeRange'> & { eventCalendarAllDay: string },
): EventCalendarFormat {
  // Multi-day: an event's times name their days when it spans more than one.
  const timeline = useTimelineFormat(locale, timeZone, true, messages);
  return useMemo(() => {
    const weekday = dateTimeFormat(locale, { weekday: 'short', timeZone });
    const dayNumber = dateTimeFormat(locale, { day: 'numeric', timeZone });
    const monthYear = dateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone });
    const shortDate = dateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone });
    return {
      ...timeline,
      weekday: (ms) => weekday.format(ms),
      dayNumber: (ms) => dayNumber.format(ms),
      monthYear: (ms) => monthYear.format(ms),
      eventTime: ({ start, end, isAllDay }) => {
        const isOneDay = timeline.dayKey(start) === timeline.dayKey(end - 1);
        if (isAllDay) {
          return isOneDay ? messages.eventCalendarAllDay : shortDate.formatRange(start, end - 1);
        }
        return isOneDay
          ? messages.scheduleTimeRange({ start: timeline.time(start), end: timeline.time(end) })
          : timeline.itemTime(start, end);
      },
    };
  }, [timeline, locale, timeZone, messages]);
}
