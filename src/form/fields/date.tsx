import { useId } from 'react';
import { DatePicker } from '../../components/DatePicker/DatePicker';
import { DateRangePicker } from '../../components/DatePicker/DateRangePicker';
import { DateTimePicker } from '../../components/DatePicker/DateTimePicker';
import { TimeField } from '../../components/TimeField/TimeField';
import { TimeRangePicker } from '../../components/TimeRangePicker/TimeRangePicker';
import { isTimeRange, type TimeRange } from '../../components/TimeRangePicker/resolveTimeRange';
import { useTimeZone } from '../../provider/context';
import type {
  DateFieldConfig,
  DateRangeFieldConfig,
  DateTimeFieldConfig,
  FieldRendererProps,
  TimeFieldConfig,
  TimeRangeFieldConfig,
} from '../types';
import {
  fromCalendarDate,
  fromDateRange,
  fromTime,
  fromZonedDateTime,
  toCalendarDate,
  toDateRange,
  toTime,
  toZonedDateTime,
} from './convert';
import { blurWithin, describedBy, FieldHeading, FieldNotes, frameProps } from './shared';

/** `date` fields: a `CalendarDate` or an ISO date string. */
export function DateRenderer({ field, config }: FieldRendererProps<DateFieldConfig<unknown>>) {
  return (
    <DatePicker
      {...frameProps(field, config)}
      value={toCalendarDate(field.value)}
      onChange={(date) => {
        field.onChange(fromCalendarDate(date, config.valueFormat));
      }}
      minValue={config.minValue}
      maxValue={config.maxValue}
    />
  );
}

/** `dateRange` fields: `{ start, end }` as `CalendarDate`s or ISO date strings. */
export function DateRangeRenderer({
  field,
  config,
}: FieldRendererProps<DateRangeFieldConfig<unknown>>) {
  return (
    <DateRangePicker
      {...frameProps(field, config)}
      value={toDateRange(field.value)}
      onChange={(range) => {
        field.onChange(fromDateRange(range, config.valueFormat));
      }}
      minValue={config.minValue}
      maxValue={config.maxValue}
      maxRangeDays={config.maxRangeDays}
    />
  );
}

/** `time` fields: a `Time` or an ISO time string. */
export function TimeRenderer({ field, config }: FieldRendererProps<TimeFieldConfig<unknown>>) {
  return (
    <TimeField
      {...frameProps(field, config)}
      value={toTime(field.value)}
      onChange={(time) => {
        field.onChange(fromTime(time, config.valueFormat));
      }}
      granularity={config.granularity}
    />
  );
}

/** `dateTime` fields: a `ZonedDateTime` or an ISO instant, edited in the field's or the app's time zone. */
export function DateTimeRenderer({
  field,
  config,
}: FieldRendererProps<DateTimeFieldConfig<unknown>>) {
  const providerTimeZone = useTimeZone();
  const timeZone = config.timeZone ?? providerTimeZone;
  return (
    <DateTimePicker
      {...frameProps(field, config)}
      timeZone={timeZone}
      value={toZonedDateTime(field.value, timeZone)}
      onChange={(date) => {
        field.onChange(fromZonedDateTime(date, config.valueFormat));
      }}
    />
  );
}

/** `timeRange` fields: a relative or absolute `TimeRange`. */
export function TimeRangeRenderer({
  field,
  config,
}: FieldRendererProps<TimeRangeFieldConfig<unknown>, TimeRange | null>) {
  const labelId = useId();
  const descriptionId = useId();
  const errorId = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1.5 text-sm" onBlur={blurWithin(field.onBlur)}>
      <FieldHeading
        id={labelId}
        label={config.label}
        infoTip={config.infoTip}
        isRequired={field.isRequired}
      />
      <TimeRangePicker
        aria-labelledby={labelId}
        aria-describedby={describedBy([
          config.description !== undefined && descriptionId,
          field.errorMessage !== undefined && errorId,
        ])}
        value={isTimeRange(field.value) ? field.value : null}
        onChange={field.onChange}
        timeZone={config.timeZone}
        isDisabled={field.isDisabled || field.isReadOnly}
      />
      <FieldNotes
        description={config.description}
        descriptionId={descriptionId}
        errorMessage={field.errorMessage}
        errorId={errorId}
      />
    </div>
  );
}
