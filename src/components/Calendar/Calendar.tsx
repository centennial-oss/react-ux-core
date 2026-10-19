// Standalone calendars, which the date pickers also use inside their popovers and sheets. Inside a picker they read
// their value, limits and callbacks from the surrounding React Aria DatePicker or DateRangePicker (CalendarContext /
// RangeCalendarContext), so the pickers pass no value props.

import { isToday, type CalendarDate, type DateValue } from '@internationalized/date';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
  type Ref,
} from 'react';
import {
  Button as AriaButton,
  Calendar as AriaCalendar,
  CalendarCell,
  CalendarContext,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  CalendarHeading,
  Heading,
  RangeCalendar as AriaRangeCalendar,
  RangeCalendarContext,
  Text,
  type CalendarProps as AriaCalendarProps,
  type RangeCalendarProps as AriaRangeCalendarProps,
} from 'react-aria-components';
import { CyclerHeader, type CalendarYearRange } from './CyclerHeader';
import { useZonedToday } from './useZonedToday';
import { cn } from '../../utils/cn';
import { clamp } from '../../utils/math';
import { toneSoftClasses } from '../../utils/toneClasses';
import type { Tone } from '../../utils/types';
import {
  calendarCellClasses,
  calendarCellSizeClasses,
  calendarNavButtonClasses,
  calendarNavSpacerClasses,
  dayContentClasses,
  rangeCellClasses,
  rangeCellSizeClasses,
  rangeDayClasses,
  rangeDaySizeClasses,
  todayClasses,
  todayRingClasses,
} from './styles';

/** A range of dates; both ends are included. */
export interface DateRange {
  start: CalendarDate;
  end: CalendarDate;
}

/** `md` days are compact circles; `lg` days are taller, with a line under the number for a badge or a price. */
export type CalendarSize = 'md' | 'lg';

/** What the app adds to one day. */
export interface CalendarDayInfo {
  /**
   * Drawn on the day: along the bottom of an `md` day (room for dots), or as a line under the number on an `lg` day
   * (a short badge or a price). Hidden from screen readers, so put its meaning in `description`. Use `currentColor`
   * (`bg-current`, `text-current`) so it stays visible on the selected day.
   */
  content?: ReactNode;
  /** Read after the date by screen readers, e.g. "3 events" or "$129". */
  description?: string;
  /** Tints the day to highlight it. Colour alone carries no meaning, so pair it with a `description`. */
  tone?: Tone;
}

/** Props both calendars share. */
export interface CalendarFrameProps {
  /**
   * IANA time zone that decides which day is "today" (the marker, and where a calendar with no value opens). Defaults
   * to `UIProvider`'s `timeZone`, or the browser's zone.
   */
  timeZone?: string;
  /** Months shown side by side (1 to 12), which wrap onto more rows when there isn't room. Defaults to 1. */
  visibleMonths?: number;
  /**
   * `cyclers` (the default): a month Cycler and a year Cycler, whose arrows step and whose values open a grid to jump
   * straight to any month or year. `arrows`: just previous and next buttons around the month's name. Calendars
   * showing several months always use arrows (Cyclers need one month showing, or `view="week"`).
   */
  headerControls?: 'arrows' | 'cyclers';
  /**
   * The years the year Cycler offers, both included. Defaults to the years of `minValue` and `maxValue`, or 100 years
   * back and 50 ahead; the focused year is always included.
   */
  yearRange?: CalendarYearRange;
  /** Defaults to `md`. */
  size?: CalendarSize;
  /** Content, a description and a highlight tone for each day. Called for every visible day, so keep it cheap. */
  getDayInfo?: (date: CalendarDate) => CalendarDayInfo | undefined;
  /** Shown under the calendar while it's invalid (`isInvalid`, or a range that covers an unavailable day). */
  errorMessage?: ReactNode;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

type OmittedAriaProps =
  | 'className'
  | 'style'
  | 'children'
  | 'render'
  | 'value'
  | 'defaultValue'
  | 'onChange'
  | 'visibleDuration'
  | 'createCalendar'
  | 'errorMessage';

interface CalendarBaseProps
  extends
    Omit<AriaCalendarProps<CalendarDate>, OmittedAriaProps | 'selectionMode'>,
    CalendarFrameProps {
  /** `week` shows one week at a time and pages by week; `visibleMonths` is ignored. Defaults to `month`. */
  view?: 'month' | 'week';
}

export interface SingleCalendarProps extends CalendarBaseProps {
  /** Defaults to `single`. */
  selectionMode?: 'single';
  /** The selected date, controlled. `null` for none. */
  value?: CalendarDate | null;
  /** The initially selected date, uncontrolled. */
  defaultValue?: CalendarDate | null;
  onChange?: (value: CalendarDate) => void;
}

export interface MultipleCalendarProps extends CalendarBaseProps {
  /** Each press adds or removes a day. */
  selectionMode: 'multiple';
  /** The selected dates, controlled. */
  value?: readonly CalendarDate[];
  /** The initially selected dates, uncontrolled. */
  defaultValue?: readonly CalendarDate[];
  onChange?: (value: CalendarDate[]) => void;
}

export type CalendarProps = SingleCalendarProps | MultipleCalendarProps;

export interface RangeCalendarProps
  extends Omit<AriaRangeCalendarProps<CalendarDate>, OmittedAriaProps>, CalendarFrameProps {
  /** The selected range, controlled. `null` for none. */
  value?: DateRange | null;
  /** The initially selected range, uncontrolled. */
  defaultValue?: DateRange | null;
  onChange?: (value: DateRange) => void;
  /**
   * The longest range, in days, counting both ends. Once the first end is picked, days further away become
   * unavailable.
   */
  maxRangeDays?: number;
}

/** Number of days from `start` to `end`, counting both. */
export function rangeLength(start: DateValue, end: DateValue): number {
  return Math.abs(end.compare(start)) + 1;
}

function clampMonths(months: number | undefined): number {
  return clamp(Math.floor(months ?? 1), 1, 12);
}

/**
 * Where a standalone calendar opens: the app's `defaultFocusedValue`, or with nothing selected or focused, `today` in
 * the calendar's time zone rather than the browser's zone. Inside a picker React Aria decides.
 */
function defaultFocusOf(
  today: CalendarDate,
  isInPicker: boolean,
  props: {
    value?: unknown;
    defaultValue?: unknown;
    focusedValue?: unknown;
    defaultFocusedValue?: DateValue | null;
  },
): DateValue | null | undefined {
  if (props.defaultFocusedValue !== undefined) {
    return props.defaultFocusedValue;
  }
  const isEmpty =
    !isInPicker && props.value == null && props.defaultValue == null && props.focusedValue == null;
  return isEmpty ? today : undefined;
}

function MonthHeader({
  offset,
  isFirst,
  isLast,
}: {
  offset: number;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div className="flex items-center gap-1 pb-2">
      {isFirst ? (
        <AriaButton slot="previous" className={calendarNavButtonClasses}>
          <ChevronLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
        </AriaButton>
      ) : (
        <span aria-hidden="true" className={calendarNavSpacerClasses} />
      )}
      {offset === 0 && isLast ? (
        // One month: React Aria's heading follows whatever is visible.
        <Heading className="min-w-0 flex-1 truncate text-center text-sm font-semibold max-sm:text-base" />
      ) : (
        <CalendarHeading
          offset={{ months: offset }}
          className="min-w-0 flex-1 truncate text-center text-sm font-semibold max-sm:text-base"
        />
      )}
      {isLast ? (
        <AriaButton slot="next" className={calendarNavButtonClasses}>
          <ChevronRight aria-hidden="true" className="size-4 rtl:rotate-180" />
        </AriaButton>
      ) : (
        <span aria-hidden="true" className={calendarNavSpacerClasses} />
      )}
    </div>
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

/**
 * Adds a day's description to its button. React Aria names the button with `aria-label` and drops any
 * `aria-describedby` passed to CalendarCell, so this points the button at a hidden description inside it.
 */
function DayDescription({ children }: { children: string }) {
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  // No dependency list: React Aria rewrites the attribute when the day turns invalid or valid, so set it after every
  // render of the day.
  useLayoutEffect(() => {
    const button = ref.current?.closest('[role="button"]');
    if (!button) {
      return undefined;
    }
    const otherIds = () =>
      (button.getAttribute('aria-describedby') ?? '')
        .split(' ')
        .filter((token) => token !== '' && token !== id);
    button.setAttribute('aria-describedby', [...otherIds(), id].join(' '));
    return () => {
      const rest = otherIds();
      if (rest.length > 0) {
        button.setAttribute('aria-describedby', rest.join(' '));
      } else {
        button.removeAttribute('aria-describedby');
      }
    };
  });
  return (
    <span ref={ref} id={id} hidden>
      {children}
    </span>
  );
}

interface DayFaceProps {
  formattedDate: string;
  info: CalendarDayInfo | undefined;
  size: CalendarSize;
}

/** The number, the app's content and the hidden description of one day. */
function DayFace({ formattedDate, info, size }: DayFaceProps) {
  return (
    <>
      {formattedDate}
      {info?.content != null && (
        <span aria-hidden="true" className={dayContentClasses[size]}>
          {info.content}
        </span>
      )}
      {info?.description && <DayDescription>{info.description}</DayDescription>}
    </>
  );
}

function todayMarker(date: CalendarDate, timeZone: string, info: CalendarDayInfo | undefined) {
  if (!isToday(date, timeZone)) {
    return undefined;
  }
  return info?.content != null ? todayRingClasses : todayClasses;
}

interface GridsProps {
  months: number;
  headerControls: 'arrows' | 'cyclers';
  yearRange: CalendarYearRange | undefined;
  /** The grid for each month (`offset` in months), or for the one visible week. */
  renderGrid: (offset: number) => ReactNode;
  isWeek?: boolean;
}

function CalendarGrids({ months, headerControls, yearRange, renderGrid, isWeek }: GridsProps) {
  // Cyclers jump the one visible month; React Aria can't pin which month leads a multi-month view.
  if (headerControls === 'cyclers' && (isWeek || months === 1)) {
    return (
      <>
        <CyclerHeader yearRange={yearRange} isWeek={isWeek === true} />
        {renderGrid(0)}
      </>
    );
  }
  if (isWeek) {
    return (
      <>
        <MonthHeader offset={0} isFirst isLast />
        {renderGrid(0)}
      </>
    );
  }
  return (
    <div className="flex flex-wrap justify-center gap-x-6 gap-y-4">
      {Array.from({ length: months }, (_, offset) => (
        <div key={offset} className="flex flex-col">
          <MonthHeader offset={offset} isFirst={offset === 0} isLast={offset === months - 1} />
          {renderGrid(offset)}
        </div>
      ))}
    </div>
  );
}

function CalendarErrorMessage({ children }: { children: ReactNode }) {
  if (children == null || children === false) {
    return null;
  }
  return (
    <Text slot="errorMessage" className="block pt-2 text-xs font-medium text-danger-fg">
      {children}
    </Text>
  );
}

/**
 * A calendar on the page, without a field: pick one date, several (`selectionMode="multiple"`), or browse by week
 * (`view="week"`). Its header has month and year Cyclers to jump straight to any month or year (`headerControls`).
 * Shows several months side by side with `visibleMonths`, and dots, badges, prices and highlights on days with
 * `getDayInfo`. Supports `minValue`/`maxValue`, `isDateUnavailable` and `firstDayOfWeek`. Give it an `aria-label`
 * saying what the date is for.
 */
export function Calendar(props: CalendarProps) {
  const {
    timeZone: timeZoneProp,
    visibleMonths,
    headerControls = 'cyclers',
    yearRange,
    view = 'month',
    size = 'md',
    getDayInfo,
    errorMessage,
    className,
    onChange,
    ...rest
  } = props;
  const { timeZone, today } = useZonedToday(timeZoneProp);
  const isInPicker = useContext(CalendarContext) !== null;
  const defaultFocusedValue = defaultFocusOf(today, isInPicker, rest);
  const months = clampMonths(visibleMonths);
  const isWeek = view === 'week';

  // React Aria hands multiple selection over as a read-only array; the prop promises a plain one.
  const handleChange = useMemo(() => {
    if (!onChange) {
      return undefined;
    }
    return (value: CalendarDate | readonly CalendarDate[] | null) => {
      if (Array.isArray(value)) {
        (onChange as (value: CalendarDate[]) => void)([...(value as readonly CalendarDate[])]);
      } else if (value) {
        (onChange as (value: CalendarDate) => void)(value as CalendarDate);
      }
    };
  }, [onChange]);

  const renderGrid = (offset: number) => (
    <CalendarGrid
      offset={isWeek ? undefined : { months: offset }}
      className="border-collapse [&_td]:p-px"
    >
      <WeekdayHeader />
      <CalendarGridBody>
        {(date) => {
          const info = getDayInfo?.(date);
          return (
            <CalendarCell
              date={date}
              className={cn(
                calendarCellClasses,
                calendarCellSizeClasses[size],
                !isWeek && 'data-outside-month:invisible',
                info?.tone && toneSoftClasses[info.tone],
                todayMarker(date, timeZone, info),
              )}
            >
              {({ formattedDate }) => (
                <DayFace formattedDate={formattedDate} info={info} size={size} />
              )}
            </CalendarCell>
          );
        }}
      </CalendarGridBody>
    </CalendarGrid>
  );

  // Inside a picker these are undefined, and React Aria keeps the picker's own (undefined props don't override
  // context).
  const ariaProps = {
    ...rest,
    defaultFocusedValue,
    onChange: handleChange,
  } as AriaCalendarProps<CalendarDate, 'single' | 'multiple'>;

  return (
    <AriaCalendar<CalendarDate, 'single' | 'multiple'>
      {...ariaProps}
      visibleDuration={isWeek ? { weeks: 1 } : { months }}
      className={cn('mx-auto w-fit max-w-full', className)}
    >
      <CalendarGrids
        months={months}
        headerControls={headerControls}
        yearRange={yearRange}
        renderGrid={renderGrid}
        isWeek={isWeek}
      />
      <CalendarErrorMessage>{errorMessage}</CalendarErrorMessage>
    </AriaCalendar>
  );
}

/**
 * A range calendar on the page, without a field: the first press picks one end and the second the other. Its header
 * has month and year Cyclers (`headerControls`). Shows several months side by side with `visibleMonths`, and dots,
 * badges, prices and highlights on days with `getDayInfo`. Supports `minValue`/`maxValue`, `maxRangeDays`, `isDateUnavailable` and `allowsNonContiguousRanges`.
 * Give it an `aria-label` saying what the range is for.
 */
export function RangeCalendar({
  timeZone: timeZoneProp,
  visibleMonths,
  headerControls = 'cyclers',
  yearRange,
  size = 'md',
  getDayInfo,
  errorMessage,
  className,
  maxRangeDays,
  isDateUnavailable,
  onChange,
  ...rest
}: RangeCalendarProps) {
  const { timeZone, today } = useZonedToday(timeZoneProp);
  const isInPicker = useContext(RangeCalendarContext) !== null;
  const defaultFocusedValue = defaultFocusOf(today, isInPicker, rest);
  const months = clampMonths(visibleMonths);

  // React Aria has no maximum range length. While one end is picked (the anchor), days that would make the range
  // too long are unavailable.
  const isUnavailable = useCallback(
    (date: DateValue, anchor: CalendarDate | null) =>
      (isDateUnavailable?.(date, anchor) ?? false) ||
      (maxRangeDays !== undefined && anchor !== null && rangeLength(anchor, date) > maxRangeDays),
    [isDateUnavailable, maxRangeDays],
  );

  const renderGrid = (offset: number) => (
    <CalendarGrid offset={{ months: offset }} className="border-collapse [&_td]:px-0 [&_td]:py-px">
      <WeekdayHeader />
      <CalendarGridBody>
        {(date) => {
          const info = getDayInfo?.(date);
          return (
            <CalendarCell
              date={date}
              className={cn(
                rangeCellClasses,
                rangeCellSizeClasses[size],
                'data-outside-month:invisible',
              )}
            >
              {({ formattedDate }) => (
                <span
                  className={cn(
                    rangeDayClasses,
                    rangeDaySizeClasses[size],
                    info?.tone && toneSoftClasses[info.tone],
                    todayMarker(date, timeZone, info),
                  )}
                >
                  <DayFace formattedDate={formattedDate} info={info} size={size} />
                </span>
              )}
            </CalendarCell>
          );
        }}
      </CalendarGridBody>
    </CalendarGrid>
  );

  return (
    // Inside a picker these are all undefined, and React Aria keeps the picker's own (undefined props don't override
    // context).
    <AriaRangeCalendar
      {...rest}
      defaultFocusedValue={defaultFocusedValue}
      onChange={onChange}
      isDateUnavailable={maxRangeDays === undefined ? isDateUnavailable : isUnavailable}
      visibleDuration={{ months }}
      className={cn('mx-auto w-fit max-w-full', className)}
    >
      <CalendarGrids
        months={months}
        headerControls={headerControls}
        yearRange={yearRange}
        renderGrid={renderGrid}
      />
      <CalendarErrorMessage>{errorMessage}</CalendarErrorMessage>
    </AriaRangeCalendar>
  );
}
