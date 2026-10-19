// A calendar header with month and year Cyclers instead of previous/next buttons, so a far-off month or year is one
// pick away. It drives the calendar through its state (React Aria's CalendarStateContext or
// RangeCalendarStateContext): picking a month or year moves the focused date, and the visible month follows it.

import { toCalendarDate } from '@internationalized/date';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useContext } from 'react';
import {
  Button as AriaButton,
  CalendarStateContext,
  Heading,
  RangeCalendarStateContext,
} from 'react-aria-components';
import { MonthYearCyclers, type CalendarYearRange } from './MonthYearCyclers';
import { calendarNavButtonClasses } from './styles';

export type { CalendarYearRange } from './MonthYearCyclers';

interface CyclerHeaderProps {
  yearRange: CalendarYearRange | undefined;
  /**
   * Week view: the week's range, with previous and next week arrows, goes under the Cyclers, since the month alone
   * doesn't say which week.
   */
  isWeek: boolean;
}

export function CyclerHeader({ yearRange, isWeek }: CyclerHeaderProps) {
  const calendarState = useContext(CalendarStateContext);
  const rangeState = useContext(RangeCalendarStateContext);
  const state = calendarState ?? rangeState;

  const focused = state?.focusedDate;
  const timeZone = state?.timeZone ?? 'UTC';
  const minValue = state?.minValue ? toCalendarDate(state.minValue) : undefined;
  const maxValue = state?.maxValue ? toCalendarDate(state.maxValue) : undefined;

  if (!state || !focused) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-1 pb-2">
      <MonthYearCyclers
        focused={focused}
        timeZone={timeZone}
        minValue={minValue}
        maxValue={maxValue}
        yearRange={yearRange}
        onMove={(date) => {
          state.setFocusedDate(date);
        }}
        isDisabled={state.isDisabled}
      />
      {isWeek && (
        // The Cyclers step by month, so the week keeps its own arrows around its range.
        <div className="flex w-full items-center gap-1">
          <AriaButton slot="previous" className={calendarNavButtonClasses}>
            <ChevronLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
          </AriaButton>
          <Heading className="min-w-0 flex-1 truncate text-center text-sm text-fg-muted max-sm:text-base" />
          <AriaButton slot="next" className={calendarNavButtonClasses}>
            <ChevronRight aria-hidden="true" className="size-4 rtl:rotate-180" />
          </AriaButton>
        </div>
      )}
    </div>
  );
}
