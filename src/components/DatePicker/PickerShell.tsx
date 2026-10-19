import type { DateValue } from '@internationalized/date';
import { CalendarDays } from 'lucide-react';
import type { ComponentType, ReactNode, Ref } from 'react';
import { Button as AriaButton, Group } from 'react-aria-components';
import { cn } from '../../utils/cn';
import {
  FieldFrame,
  fieldRootClasses,
  inputButtonClasses,
  inputHeightClasses,
  type FieldBaseProps,
} from '../Field/Field';
import type { CalendarFrameProps } from '../Calendar/Calendar';
import type { CalendarYearRange } from '../Calendar/CyclerHeader';
import { useZonedToday } from '../Calendar/useZonedToday';
import { DateSegments } from './DateSegments';
import { PickerOverlay } from './PickerOverlay';
import { dateGroupClasses } from './styles';

/** Props every date picker shares: the field frame, the time zone, the size, the root class and ref. */
export interface PickerFrameProps extends FieldBaseProps {
  /**
   * IANA time zone that decides which day is "today" (the calendar's marker and where an empty calendar opens).
   * Defaults to `UIProvider`'s `timeZone`, or the browser's zone.
   */
  timeZone?: string;
  /** Defaults to `md`. On touch screens the height grows to the minimum touch target. */
  size?: 'sm' | 'md';
  /**
   * Months the calendar shows side by side (1 to 12). They wrap onto more rows when the popover runs out of room, and
   * stack in the phone sheet. Defaults to 1.
   */
  visibleMonths?: number;
  /**
   * The calendar's header: `cyclers` (the default), month and year Cyclers that jump straight to any month or year;
   * or `arrows`, just previous and next buttons. With several months showing, the header always uses arrows.
   */
  headerControls?: 'arrows' | 'cyclers';
  /** The years the calendar's year Cycler offers. Defaults to the years of `minValue` and `maxValue`. */
  yearRange?: CalendarYearRange;
  className?: string;
  /** The field's root element. */
  ref?: Ref<HTMLDivElement>;
}

/** The button inside a date group that opens the calendar. React Aria names it ("Calendar") and wires it up. */
export function CalendarButton() {
  return (
    <AriaButton className={inputButtonClasses}>
      <CalendarDays aria-hidden="true" className="size-4" />
    </AriaButton>
  );
}

/** What PickerShell gives the React Aria picker, on top of the picker's own props. */
interface PickerRootProps {
  className: string;
  placeholderValue: DateValue;
  isRequired?: boolean;
  children: ReactNode;
}

type ShellCalendarProps = Pick<
  CalendarFrameProps,
  'timeZone' | 'visibleMonths' | 'headerControls' | 'yearRange'
> & { selectionAlignment: 'start' };

export interface PickerShellProps extends PickerFrameProps {
  /** The React Aria picker. Its props are the picker's own, less the ones the shell draws. */
  root: ComponentType<PickerRootProps>;
  /** The calendar the overlay opens, `Calendar` or `RangeCalendar`. Passed in so each picker bundles only its own. */
  calendar: ComponentType<ShellCalendarProps>;
  isRequired?: boolean;
  /** Defaults to today in the time zone. */
  placeholderValue?: DateValue | null;
  /** The phone sheet's heading. Defaults to `label`. */
  title?: ReactNode;
  /** What the date group shows before the calendar button. Defaults to one set of date segments. */
  segments?: ReactNode;
  /** Shown in the overlay under the calendar. */
  children?: ReactNode;
  /** The picker's own props (value, limits, callbacks), passed on to `root`. */
  [prop: string]: unknown;
}

/**
 * A React Aria date picker (`root`) with everything inside it: the field frame around a date group (segments and the
 * calendar button), and the overlay with the calendar. DatePicker, DateRangePicker and DateTimePicker render it; the
 * picker's other props go to `root`.
 */
export function PickerShell({
  root: Root,
  calendar: PickerCalendar,
  label,
  description,
  errorMessage,
  labelPosition,
  infoTip,
  timeZone: timeZoneProp,
  size = 'md',
  visibleMonths,
  headerControls,
  yearRange,
  className,
  placeholderValue,
  title = label,
  segments,
  children,
  ...rest
}: PickerShellProps) {
  const { timeZone, today } = useZonedToday(timeZoneProp);

  return (
    <Root
      {...rest}
      placeholderValue={placeholderValue ?? today}
      className={fieldRootClasses(className)}
    >
      <FieldFrame
        label={label}
        description={description}
        errorMessage={errorMessage}
        labelPosition={labelPosition}
        infoTip={infoTip}
        isRequired={rest.isRequired}
      >
        <Group className={cn(dateGroupClasses, inputHeightClasses[size])}>
          {segments ?? <DateSegments />}
          <CalendarButton />
        </Group>
      </FieldFrame>
      <PickerOverlay title={title}>
        <PickerCalendar
          timeZone={timeZone}
          visibleMonths={visibleMonths}
          headerControls={headerControls}
          yearRange={yearRange}
          // With several months, open on the selected (or current) month first rather than centred on it.
          selectionAlignment="start"
        />
        {children}
      </PickerOverlay>
    </Root>
  );
}
