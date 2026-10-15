import { today, type CalendarDate } from '@internationalized/date';
import { CalendarDays } from 'lucide-react';
import { useMemo, type Ref } from 'react';
import {
  Button as AriaButton,
  DatePicker as AriaDatePicker,
  Group,
  type DatePickerProps as AriaDatePickerProps,
} from 'react-aria-components';
import { useTimeZone } from '../../provider/context';
import { cn } from '../../utils/cn';
import {
  FieldFrame,
  fieldRootClasses,
  inputButtonClasses,
  inputHeightClasses,
  type FieldBaseProps,
} from '../Field/Field';
import { CalendarView } from './CalendarView';
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
  className?: string;
  /** The field's root element. */
  ref?: Ref<HTMLDivElement>;
}

export interface DatePickerProps
  extends
    Omit<
      AriaDatePickerProps<CalendarDate>,
      | 'className'
      | 'style'
      | 'children'
      | 'render'
      | 'granularity'
      | 'hourCycle'
      | 'hideTimeZone'
      | 'value'
      | 'defaultValue'
      | 'onChange'
    >,
    PickerFrameProps {
  /** The selected date, controlled. `null` for no date. */
  value?: CalendarDate | null;
  /** The initially selected date, uncontrolled. */
  defaultValue?: CalendarDate | null;
  /** Called with the new date, or `null` when it's cleared. */
  onChange?: (value: CalendarDate | null) => void;
}

/** The button inside a date group that opens the calendar. React Aria names it ("Calendar") and wires it up. */
export function CalendarButton() {
  return (
    <AriaButton className={inputButtonClasses}>
      <CalendarDays aria-hidden="true" className="size-4" />
    </AriaButton>
  );
}

/**
 * A date input (`CalendarDate`): type into the month, day and year segments, or pick from a calendar that opens in a
 * popover (a full-screen sheet on phones). Supports `minValue`/`maxValue`, `isDateUnavailable` and `firstDayOfWeek`.
 */
export function DatePicker({
  label,
  description,
  errorMessage,
  labelPosition,
  infoTip,
  timeZone: timeZoneProp,
  size = 'md',
  className,
  placeholderValue,
  ...rest
}: DatePickerProps) {
  const defaultTimeZone = useTimeZone();
  const timeZone = timeZoneProp ?? defaultTimeZone;
  const todayInZone = useMemo(() => today(timeZone), [timeZone]);

  return (
    <AriaDatePicker
      {...rest}
      placeholderValue={placeholderValue ?? todayInZone}
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
          <DateSegments />
          <CalendarButton />
        </Group>
      </FieldFrame>
      <PickerOverlay title={label}>
        <CalendarView timeZone={timeZone} />
      </PickerOverlay>
    </AriaDatePicker>
  );
}
