import type { CalendarDate, DateValue } from '@internationalized/date';
import { useCallback, useState } from 'react';
import {
  DateRangePicker as AriaDateRangePicker,
  type DateRangePickerProps as AriaDateRangePickerProps,
} from 'react-aria-components';
import { useEntryMessages } from '../../provider/context';
import { calendarStrings } from '../../provider/coreStrings';
import { RangeCalendar, rangeLength, type DateRange } from '../Calendar/Calendar';
import { DateSegments } from './DateSegments';
import { PickerShell, type PickerFrameProps } from './PickerShell';

export type { DateRange };

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

/**
 * A date range input: start and end segments, or a range calendar in a popover (a full-screen sheet on phones) where
 * the first press picks one end and the second press the other. Supports `minValue`/`maxValue`, `maxRangeDays` and
 * `isDateUnavailable`.
 */
export function DateRangePicker({
  errorMessage,
  maxRangeDays,
  isDateUnavailable,
  value,
  defaultValue,
  onChange,
  isInvalid,
  ...rest
}: DateRangePickerProps) {
  const messages = useEntryMessages(calendarStrings);

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
    <PickerShell
      {...rest}
      root={AriaDateRangePicker}
      calendar={RangeCalendar}
      value={value}
      defaultValue={defaultValue}
      onChange={(next: DateRange | null) => {
        setUncontrolledValue(next);
        onChange?.(next);
      }}
      // Undefined unless forced: an explicit `false` would hide React Aria's own checks (minValue and the like).
      isInvalid={isInvalid === true || isTooLong ? true : undefined}
      isDateUnavailable={maxRangeDays === undefined ? isDateUnavailable : isUnavailable}
      errorMessage={
        errorMessage ?? (isTooLong ? messages.dateRangeTooLong({ max: maxRangeDays }) : undefined)
      }
      segments={
        <div className="flex min-w-0 flex-1 flex-wrap items-center">
          <DateSegments slot="start" className="flex-none pe-1" />
          <span aria-hidden="true" className="text-fg-muted">
            –
          </span>
          <DateSegments slot="end" className="flex-none ps-1" />
        </div>
      }
    />
  );
}
