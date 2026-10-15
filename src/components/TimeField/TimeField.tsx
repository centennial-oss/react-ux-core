import {
  toTimeZone,
  type CalendarDateTime,
  type Time,
  type ZonedDateTime,
} from '@internationalized/date';
import { useMemo, useState, type Ref } from 'react';
import {
  TimeField as AriaTimeField,
  type TimeFieldProps as AriaTimeFieldProps,
} from 'react-aria-components';
import { useTimeZone } from '../../provider/context';
import { cn } from '../../utils/cn';
import {
  FieldFrame,
  fieldRootClasses,
  inputHeightClasses,
  type FieldBaseProps,
} from '../Field/Field';
import { DateSegments } from '../DatePicker/DateSegments';
import { dateGroupClasses } from '../DatePicker/styles';

/** A time of day (`Time`), or a date and time whose time part is edited (`CalendarDateTime`, `ZonedDateTime`). */
export type TimeValue = Time | CalendarDateTime | ZonedDateTime;

export interface TimeFieldProps<T extends TimeValue = TimeValue>
  extends
    Omit<AriaTimeFieldProps<T>, 'className' | 'style' | 'children' | 'render'>,
    FieldBaseProps {
  /**
   * IANA time zone that `ZonedDateTime` values are shown and edited in (the same instant, converted). Defaults to
   * `UIProvider`'s `timeZone`, or the browser's zone. Plain `Time` and `CalendarDateTime` values have no zone and are
   * shown as they are.
   */
  timeZone?: string;
  /** Defaults to `md`. On phones the field is taller with touch-sized segments; on touch screens at least 44 px. */
  size?: 'sm' | 'md';
  className?: string;
  /** The field's root element. */
  ref?: Ref<HTMLDivElement>;
}

/** The same instant in `timeZone` when `value` is a `ZonedDateTime`; anything else unchanged. */
export function inTimeZone<V extends TimeValue | null | undefined>(value: V, timeZone: string): V {
  return value != null && 'timeZone' in value
    ? (toTimeZone(value, timeZone) as unknown as V)
    : value;
}

/**
 * Classes for a time entry box: the segments row is the bordered box itself (`flex-none` so its height applies in
 * the field's column), with large segmented entry on phones (spec phone behaviour for time pickers).
 */
export const timeInputClasses = cn(dateGroupClasses, 'flex-none max-sm:h-12 max-sm:text-xl');

/**
 * A time input: hour, minute (and optionally second) segments, typed or stepped with the arrow keys. The value type
 * follows `value`, `defaultValue` or `placeholderValue` (`Time`, `CalendarDateTime` or `ZonedDateTime`). 12- or
 * 24-hour display comes from the locale unless `hourCycle` is set; `granularity` picks the smallest unit and
 * `hideTimeZone` hides a zoned value's zone.
 */
export function TimeField<T extends TimeValue = TimeValue>({
  label,
  description,
  errorMessage,
  labelPosition,
  infoTip,
  timeZone: timeZoneProp,
  size = 'md',
  className,
  value: valueProp,
  defaultValue: defaultValueProp,
  placeholderValue: placeholderValueProp,
  ...rest
}: TimeFieldProps<T>) {
  const defaultTimeZone = useTimeZone();
  const timeZone = timeZoneProp ?? defaultTimeZone;
  // Memoised: React Aria compares values by identity, so a fresh conversion every render would loop.
  const value = useMemo(() => inTimeZone(valueProp, timeZone), [valueProp, timeZone]);
  // Only the first render's default matters (uncontrolled).
  const [defaultValue] = useState(() => inTimeZone(defaultValueProp, timeZone));
  const placeholderValue = useMemo(
    () => inTimeZone(placeholderValueProp, timeZone),
    [placeholderValueProp, timeZone],
  );

  return (
    <AriaTimeField
      {...rest}
      value={value}
      defaultValue={defaultValue}
      placeholderValue={placeholderValue}
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
        <DateSegments isLarge className={cn(timeInputClasses, inputHeightClasses[size])} />
      </FieldFrame>
    </AriaTimeField>
  );
}
