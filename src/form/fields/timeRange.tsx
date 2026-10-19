import { useId } from 'react';
import { TimeRangePicker } from '../../components/TimeRangePicker/TimeRangePicker';
import { isTimeRange, type TimeRange } from '../../components/TimeRangePicker/resolveTimeRange';
import type { FieldRendererProps, TimeRangeFieldConfig } from '../types';
import { blurWithin, describedBy, FieldHeading, FieldNotes } from './shared';

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
