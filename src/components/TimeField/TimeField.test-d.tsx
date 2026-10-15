// Type tests: compiled by `make typecheck`, not run.
import { CalendarDateTime, Time, ZonedDateTime, now } from '@internationalized/date';
import { TimeField } from './TimeField';

export const plainTime = (
  <TimeField
    label="Opens at"
    defaultValue={new Time(9)}
    onChange={(value) => {
      // The value type follows defaultValue.
      const time: Time | null = value;
      return time;
    }}
  />
);

export const zoned = (
  <TimeField
    label="Starts"
    value={now('America/Denver')}
    onChange={(value) => {
      const zonedValue: ZonedDateTime | null = value;
      return zonedValue;
    }}
  />
);

export const wrongCallback = (
  <TimeField
    label="Opens at"
    defaultValue={new Time(9)}
    // @ts-expect-error a Time field doesn't report CalendarDateTime values
    onChange={(value: CalendarDateTime | null) => value}
  />
);

export const wrongGranularity = (
  // @ts-expect-error a time field has no day granularity
  <TimeField label="Opens at" granularity="day" />
);
