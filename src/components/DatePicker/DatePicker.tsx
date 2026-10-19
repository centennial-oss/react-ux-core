import type { CalendarDate } from '@internationalized/date';
import {
  DatePicker as AriaDatePicker,
  type DatePickerProps as AriaDatePickerProps,
} from 'react-aria-components';
import { Calendar } from '../Calendar/Calendar';
import { PickerShell, type PickerFrameProps } from './PickerShell';

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

/**
 * A date input (`CalendarDate`): type into the month, day and year segments, or pick from a calendar that opens in a
 * popover (a full-screen sheet on phones). Supports `minValue`/`maxValue`, `isDateUnavailable` and `firstDayOfWeek`.
 */
export function DatePicker(props: DatePickerProps) {
  return <PickerShell {...props} root={AriaDatePicker} calendar={Calendar} />;
}
