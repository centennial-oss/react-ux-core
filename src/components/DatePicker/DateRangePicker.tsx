import { today, type CalendarDate, type DateValue } from '@internationalized/date';
import { useCallback, useMemo, useState } from 'react';
import {
  DateRangePicker as AriaDateRangePicker,
  Group,
  type DateRangePickerProps as AriaDateRangePickerProps,
} from 'react-aria-components';
import { useMessages, useTimeZone } from '../../provider/context';
import { cn } from '../../utils/cn';
import { FieldFrame, fieldRootClasses, inputHeightClasses } from '../Field/Field';
import { RangeCalendarView } from './CalendarView';
import { CalendarButton, type PickerFrameProps } from './DatePicker';
import { DateSegments } from './DateSegments';
import { PickerOverlay } from './PickerOverlay';
import { dateGroupClasses } from './styles';

/** A range of dates; both ends are included. */
export interface DateRange {
  start: CalendarDate;
  end: CalendarDate;
}

export interface DateRangePickerProps
  extends
    Omit<
      AriaDateRangePickerProps<CalendarDate>,
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
  /** The selected range, controlled. `null` for no range. */
  value?: DateRange | null;
  /** The initially selected range, uncontrolled. */
  defaultValue?: DateRange | null;
  /** Called with the new range, or `null` when it's cleared. */
  onChange?: (value: DateRange | null) => void;
  /**
   * The longest range, in days, counting both ends. Once the first end is picked, the calendar makes days further
   * away unavailable; a typed range that's longer marks the field invalid and shows `messages.dateRangeTooLong`
   * unless `errorMessage` is set.
   */
  maxRangeDays?: number;
}

/** Number of days from `start` to `end`, counting both. */
function rangeLength(start: DateValue, end: DateValue): number {
  return Math.abs(end.compare(start)) + 1;
}

/**
 * A date range input: start and end segments, or a range calendar in a popover (a full-screen sheet on phones) where
 * the first press picks one end and the second press the other. Supports `minValue`/`maxValue`, `maxRangeDays` and
 * `isDateUnavailable`.
 */
export function DateRangePicker({
  label,
  description,
  errorMessage,
  labelPosition,
  infoTip,
  timeZone: timeZoneProp,
  size = 'md',
  className,
  placeholderValue,
  maxRangeDays,
  isDateUnavailable,
  value,
  defaultValue,
  onChange,
  isInvalid,
  ...rest
}: DateRangePickerProps) {
  const messages = useMessages();
  const defaultTimeZone = useTimeZone();
  const timeZone = timeZoneProp ?? defaultTimeZone;
  const todayInZone = useMemo(() => today(timeZone), [timeZone]);

  // React Aria has no maximum range length. While one end is picked (the anchor), days that would make the range
  // too long are unavailable.
  const isUnavailable = useCallback(
    (date: DateValue, anchor: CalendarDate | null) =>
      (isDateUnavailable?.(date, anchor) ?? false) ||
      (maxRangeDays !== undefined && anchor !== null && rangeLength(anchor, date) > maxRangeDays),
    [isDateUnavailable, maxRangeDays],
  );

  // A typed range can still be too long. React Aria's `validate` can't flag a value without a message (returning
  // `true` counts as valid), so track the value and mark the field invalid; `errorMessage` explains.
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? null);
  const current = value !== undefined ? value : uncontrolledValue;
  const isTooLong =
    maxRangeDays !== undefined &&
    current !== null &&
    rangeLength(current.start, current.end) > maxRangeDays;

  return (
    <AriaDateRangePicker
      {...rest}
      placeholderValue={placeholderValue ?? todayInZone}
      value={value}
      defaultValue={defaultValue}
      onChange={(next) => {
        setUncontrolledValue(next);
        onChange?.(next);
      }}
      // Undefined unless forced: an explicit `false` would hide React Aria's own checks (minValue and the like).
      isInvalid={isInvalid === true || isTooLong ? true : undefined}
      isDateUnavailable={maxRangeDays === undefined ? isDateUnavailable : isUnavailable}
      className={fieldRootClasses(className)}
    >
      <FieldFrame
        label={label}
        description={description}
        errorMessage={
          errorMessage ?? (isTooLong ? messages.dateRangeTooLong({ max: maxRangeDays }) : undefined)
        }
        labelPosition={labelPosition}
        infoTip={infoTip}
        isRequired={rest.isRequired}
      >
        <Group className={cn(dateGroupClasses, inputHeightClasses[size])}>
          <div className="flex min-w-0 flex-1 flex-wrap items-center">
            <DateSegments slot="start" className="flex-none pe-1" />
            <span aria-hidden="true" className="text-fg-muted">
              –
            </span>
            <DateSegments slot="end" className="flex-none ps-1" />
          </div>
          <CalendarButton />
        </Group>
      </FieldFrame>
      <PickerOverlay title={label}>
        <RangeCalendarView timeZone={timeZone} />
      </PickerOverlay>
    </AriaDateRangePicker>
  );
}
