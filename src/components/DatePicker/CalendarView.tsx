// The calendars inside the date pickers' popovers and sheets. They read their value, limits and callbacks from the
// surrounding React Aria DatePicker or DateRangePicker (CalendarContext / RangeCalendarContext), so they take no
// value props here.

import { isToday } from '@internationalized/date';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Button as AriaButton,
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  Heading,
  RangeCalendar,
} from 'react-aria-components';
import { cn } from '../../utils/cn';
import {
  calendarCellClasses,
  calendarNavButtonClasses,
  rangeCellClasses,
  rangeDayClasses,
  todayClasses,
} from './styles';

function CalendarHeader() {
  return (
    <header className="flex items-center gap-1 pb-2">
      <AriaButton slot="previous" className={calendarNavButtonClasses}>
        <ChevronLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
      </AriaButton>
      <Heading className="min-w-0 flex-1 truncate text-center text-sm font-semibold max-sm:text-base" />
      <AriaButton slot="next" className={calendarNavButtonClasses}>
        <ChevronRight aria-hidden="true" className="size-4 rtl:rotate-180" />
      </AriaButton>
    </header>
  );
}

function WeekdayHeader() {
  return (
    <CalendarGridHeader>
      {(day) => (
        <CalendarHeaderCell className="pb-1 text-xs font-medium text-fg-muted">
          {day}
        </CalendarHeaderCell>
      )}
    </CalendarGridHeader>
  );
}

export interface CalendarViewProps {
  /**
   * The zone that decides which day is today. React Aria's calendar has no time-zone prop (its own "today" uses the
   * browser's zone), so the today marker is drawn from this instead.
   */
  timeZone: string;
}

/** A single-date calendar for DatePicker and DateTimePicker. */
export function CalendarView({ timeZone }: CalendarViewProps) {
  return (
    <Calendar className="mx-auto w-fit">
      <CalendarHeader />
      <CalendarGrid className="border-collapse [&_td]:p-px">
        <WeekdayHeader />
        <CalendarGridBody>
          {(date) => (
            <CalendarCell
              date={date}
              className={cn(calendarCellClasses, isToday(date, timeZone) && todayClasses)}
            />
          )}
        </CalendarGridBody>
      </CalendarGrid>
    </Calendar>
  );
}

/** A range calendar for DateRangePicker: the first press picks the start, the second the end. */
export function RangeCalendarView({ timeZone }: CalendarViewProps) {
  return (
    <RangeCalendar className="mx-auto w-fit">
      <CalendarHeader />
      <CalendarGrid className="border-collapse [&_td]:px-0 [&_td]:py-px">
        <WeekdayHeader />
        <CalendarGridBody>
          {(date) => (
            <CalendarCell date={date} className={rangeCellClasses}>
              {({ formattedDate }) => (
                <span className={cn(rangeDayClasses, isToday(date, timeZone) && todayClasses)}>
                  {formattedDate}
                </span>
              )}
            </CalendarCell>
          )}
        </CalendarGridBody>
      </CalendarGrid>
    </RangeCalendar>
  );
}
