import { toTimeZone, toZoned, type ZonedDateTime } from '@internationalized/date';
import { useContext, useId, useMemo, useState } from 'react';
import {
  DatePicker as AriaDatePicker,
  DatePickerStateContext,
  TimeField as AriaTimeField,
  type DatePickerProps as AriaDatePickerProps,
} from 'react-aria-components';
import { cn } from '../../utils/cn';
import { timeInputClasses } from '../TimeField/TimeField';
import { Calendar } from '../Calendar/Calendar';
import { useZonedToday } from '../Calendar/useZonedToday';
import { DateSegments } from './DateSegments';
import { PickerShell, type PickerFrameProps } from './PickerShell';

export interface DateTimePickerProps
  extends
    Omit<
      AriaDatePickerProps<ZonedDateTime>,
      | 'className'
      | 'style'
      | 'children'
      | 'render'
      | 'granularity'
      | 'value'
      | 'defaultValue'
      | 'onChange'
    >,
    Omit<PickerFrameProps, 'timeZone'> {
  /** The selected date and time, controlled. `null` for none. It's shown in `timeZone` (the same instant). */
  value?: ZonedDateTime | null;
  /** The initially selected date and time, uncontrolled. */
  defaultValue?: ZonedDateTime | null;
  /** Called with the new date and time in `timeZone`, or `null` when cleared. */
  onChange?: (value: ZonedDateTime | null) => void;
  /**
   * IANA time zone the date and time are shown, entered and reported in. Defaults to `UIProvider`'s `timeZone`, or the
   * browser's zone. The zone's abbreviation shows after the time unless `hideTimeZone` is set.
   */
  timeZone?: string;
  /** The smallest unit shown. Defaults to `minute`. */
  granularity?: 'hour' | 'minute' | 'second';
}

/** Time entry inside the popover or sheet, bound to the picker's pending date and time. */
function PickerTimeField({
  placeholderValue,
  ...props
}: Pick<
  DateTimePickerProps,
  | 'granularity'
  | 'hourCycle'
  | 'hideTimeZone'
  | 'shouldForceLeadingZeros'
  | 'isDisabled'
  | 'isReadOnly'
  | 'aria-label'
  | 'aria-labelledby'
> & { placeholderValue: ZonedDateTime }) {
  const state = useContext(DatePickerStateContext);
  if (!state) {
    return null;
  }
  return (
    <AriaTimeField
      {...props}
      value={state.timeValue}
      onChange={(time) => {
        if (time) {
          state.setTimeValue(time);
        }
      }}
      placeholderValue={placeholderValue}
      className="flex"
    >
      <DateSegments isLarge className={cn(timeInputClasses, 'h-10 justify-center')} />
    </AriaTimeField>
  );
}

/**
 * A date and time input (`ZonedDateTime`) in a time zone (`timeZone`, or the provider's default). Type into the
 * segments, or pick a day from the calendar and set the time below it, in a popover (a full-screen sheet with large
 * time entry on phones). 12- or 24-hour display comes from the locale unless `hourCycle` is set.
 */
export function DateTimePicker({
  label,
  value: valueProp,
  defaultValue: defaultValueProp,
  placeholderValue: placeholderValueProp,
  granularity = 'minute',
  shouldCloseOnSelect = false,
  ...rest
}: DateTimePickerProps) {
  const { timeZone, today } = useZonedToday(rest.timeZone);
  const labelId = useId();

  // React Aria has no time-zone prop: the zone comes from the value, or from the placeholder while there's none.
  // Conversions are memoised because React Aria compares values by identity.
  const value = useMemo(
    () => (valueProp == null ? valueProp : toTimeZone(valueProp, timeZone)),
    [valueProp, timeZone],
  );
  const [defaultValue] = useState(() =>
    defaultValueProp == null ? defaultValueProp : toTimeZone(defaultValueProp, timeZone),
  );
  // Midnight today in the zone (React Aria's own default placeholder, but zoned), so a day picked without a time
  // gets 00:00 rather than the current time with its seconds.
  const placeholderValue = useMemo(
    () =>
      placeholderValueProp ? toTimeZone(placeholderValueProp, timeZone) : toZoned(today, timeZone),
    [placeholderValueProp, timeZone, today],
  );

  return (
    <PickerShell
      {...rest}
      root={AriaDatePicker}
      calendar={Calendar}
      label={label !== undefined ? <span id={labelId}>{label}</span> : undefined}
      title={label}
      value={value}
      defaultValue={defaultValue}
      placeholderValue={placeholderValue}
      granularity={granularity}
      shouldCloseOnSelect={shouldCloseOnSelect}
    >
      <PickerTimeField
        aria-labelledby={label !== undefined ? labelId : rest['aria-labelledby']}
        aria-label={label !== undefined ? undefined : rest['aria-label']}
        placeholderValue={placeholderValue}
        granularity={granularity}
        hourCycle={rest.hourCycle}
        hideTimeZone={rest.hideTimeZone}
        shouldForceLeadingZeros={rest.shouldForceLeadingZeros}
        isDisabled={rest.isDisabled}
        isReadOnly={rest.isReadOnly}
      />
    </PickerShell>
  );
}
