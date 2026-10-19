// A month Cycler and a year Cycler, whose arrows step and whose values open a grid to jump straight to any month or
// year. Calendar's header drives React Aria's calendar state with them; EventCalendar moves its visible range.

import {
  DateFormatter,
  endOfMonth,
  startOfMonth,
  today,
  type CalendarDate,
} from '@internationalized/date';
import { useMemo } from 'react';
import { useLocale } from 'react-aria-components';
import { useEntryMessages } from '../../provider/context';
import { calendarStrings } from '../../provider/coreStrings';
import { Cycler, type CyclerOption } from '../Cycler/Cycler';

/** The years a calendar's year Cycler offers, both included. */
export interface CalendarYearRange {
  start: number;
  end: number;
}

/** Years before and after today offered when neither `yearRange` nor `minValue`/`maxValue` sets them. */
const defaultYearsBefore = 100;
const defaultYearsAfter = 50;

export interface MonthYearCyclersProps {
  /** The date whose month and year the Cyclers show. */
  focused: CalendarDate;
  /** The time zone for "this year" and for formatting. */
  timeZone: string;
  minValue?: CalendarDate;
  maxValue?: CalendarDate;
  yearRange?: CalendarYearRange;
  /** Called with `focused` moved to the chosen (or stepped to) month or year. */
  onMove: (date: CalendarDate) => void;
  isDisabled?: boolean;
}

interface CyclerOptions {
  monthOptions: CyclerOption<number>[];
  yearOptions: CyclerOption<number>[];
}

/** The month and year choices around `focused`'s year. */
function cyclerOptions(
  focused: CalendarDate,
  locale: string,
  timeZone: string,
  minValue: CalendarDate | undefined,
  maxValue: CalendarDate | undefined,
  yearRange: CalendarYearRange | undefined,
): CyclerOptions {
  const calendarId = focused.calendar.identifier;
  const monthFormatter = new DateFormatter(locale, {
    month: 'long',
    timeZone,
    calendar: calendarId,
  });
  const monthOptions: CyclerOption<number>[] = Array.from(
    { length: focused.calendar.getMonthsInYear(focused) },
    (_, index) => {
      const month = startOfMonth(focused.set({ month: index + 1 }));
      return {
        id: index + 1,
        label: monthFormatter.format(month.toDate(timeZone)),
        isDisabled:
          (minValue !== undefined && endOfMonth(month).compare(minValue) < 0) ||
          (maxValue !== undefined && month.compare(maxValue) > 0),
      };
    },
  );

  const thisYear = today(timeZone).year;
  const firstYear = Math.min(
    yearRange?.start ?? minValue?.year ?? thisYear - defaultYearsBefore,
    focused.year,
  );
  const lastYear = Math.max(
    yearRange?.end ?? maxValue?.year ?? thisYear + defaultYearsAfter,
    focused.year,
  );
  const yearFormatter = new DateFormatter(locale, {
    year: 'numeric',
    timeZone,
    calendar: calendarId,
  });
  const yearLabel = (value: number) =>
    yearFormatter.format(focused.set({ year: value, month: 1, day: 1 }).toDate(timeZone));
  const yearOptions: CyclerOption<number>[] = [];
  for (let value = firstYear; value <= lastYear; value += 1) {
    // Decades make the picker's pages: "2020 – 2029".
    const decade = value - (((value % 10) + 10) % 10);
    yearOptions.push({
      id: value,
      label: yearLabel(value),
      isDisabled:
        (minValue !== undefined && value < minValue.year) ||
        (maxValue !== undefined && value > maxValue.year),
      group: `${yearLabel(Math.max(decade, firstYear))} – ${yearLabel(Math.min(decade + 9, lastYear))}`,
    });
  }
  return { monthOptions, yearOptions };
}

export function MonthYearCyclers({
  focused,
  timeZone,
  minValue,
  maxValue,
  yearRange,
  onMove: move,
  isDisabled,
}: MonthYearCyclersProps) {
  const messages = useEntryMessages(calendarStrings);
  const { locale } = useLocale();

  // The options depend only on the year shown, and a year Cycler offers some 150 years, so build them once per year
  // (and locale, zone and limits), keyed on values: the dates passed in are often new objects on every render.
  const yearKey = `${focused.calendar.identifier}:${focused.era}:${String(focused.year)}`;
  const limitsKey = `${minValue?.toString() ?? ''}/${maxValue?.toString() ?? ''}/${String(yearRange?.start)}/${String(yearRange?.end)}`;
  const { monthOptions, yearOptions } = useMemo(
    () => cyclerOptions(focused, locale, timeZone, minValue, maxValue, yearRange),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the values the options come from.
    [yearKey, limitsKey, locale, timeZone],
  );

  const monthStart = startOfMonth(focused);

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Cycler
        aria-label={messages.calendarMonth}
        options={monthOptions}
        value={focused.month}
        onChange={(month) => {
          move(focused.set({ month }));
        }}
        // The arrows roll over into the next or previous year, like the calendar's own paging.
        onStep={(direction) => {
          move(direction === 'next' ? focused.add({ months: 1 }) : focused.subtract({ months: 1 }));
        }}
        isPreviousDisabled={
          minValue !== undefined && monthStart.compare(startOfMonth(minValue)) <= 0
        }
        isNextDisabled={maxValue !== undefined && monthStart.compare(startOfMonth(maxValue)) >= 0}
        pickerColumns={3}
        size="sm"
        isDisabled={isDisabled}
      />
      <Cycler
        aria-label={messages.calendarYear}
        options={yearOptions}
        value={focused.year}
        onChange={(value) => {
          move(focused.set({ year: value }));
        }}
        isLooping={false}
        pickerColumns={5}
        size="sm"
        isDisabled={isDisabled}
      />
    </div>
  );
}
