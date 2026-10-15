import { Time } from '@internationalized/date';
import { Plus, Trash2 } from 'lucide-react';
import { useId, type FocusEvent, type Ref } from 'react';
import { useMessages } from '../../provider/context';
import type { CoreMessages } from '../../provider/messages';
import { cn } from '../../utils/cn';
import { mergeRefs } from '../../utils/mergeRefs';
import { useControllableState } from '../../utils/useControllableState';
import { useElementWidth } from '../../utils/useElementWidth';
import { Button } from '../Button/Button';
import type { FieldBaseProps } from '../Field/Field';
import { IconButton } from '../IconButton/IconButton';
import { useRowValue, type RowValueProps } from '../RowEditor/rowValue';
import { TimeField } from '../TimeField/TimeField';
import {
  fromMinutes,
  isSorted,
  MINUTES_PER_DAY,
  sortSchedule,
  spanOf,
  uncoveredSpans,
  validateSchedule,
  type RowIssue,
  type Schedule,
  type ScheduleIssue,
  type ScheduleRow,
} from './schedule';
import { SchedulePreview, useFormatMinutes } from './SchedulePreview';

interface ScheduleEditorBaseProps<V> extends Omit<FieldBaseProps, 'labelPosition' | 'infoTip'> {
  value?: Schedule<V>;
  defaultValue?: Schedule<V>;
  onChange?: (value: Schedule<V>) => void;
  /** Allows time between periods that no period covers. Defaults to true. */
  allowsGaps?: boolean;
  /** Requires the periods to cover the whole day. Defaults to false. */
  isFullDayRequired?: boolean;
  /** The value column's heading. Defaults to the `value` message. */
  valueLabel?: string;
  /** Shows the app's own error (with `errorMessage`) as well as the editor's checks. */
  isInvalid?: boolean;
  isDisabled?: boolean;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

export type ScheduleEditorProps<V = number> = ScheduleEditorBaseProps<V> & RowValueProps<V>;

function rowIssueText(
  issue: RowIssue,
  messages: CoreMessages,
  range: (span: [number, number]) => string,
) {
  return issue.kind === 'endBeforeStart'
    ? messages.endBeforeStart
    : messages.overlaps({ range: range(issue.with) });
}

function scheduleIssueText(
  issue: ScheduleIssue,
  messages: CoreMessages,
  range: (span: [number, number]) => string,
) {
  return issue.kind === 'gap'
    ? messages.gapBetween({ range: range(issue.span) })
    : messages.notCovered({ range: range(issue.span) });
}

function toTime(time: string): Time {
  const minutes = spanOf({ start: time, end: time })[0];
  return Number.isFinite(minutes)
    ? new Time(Math.floor(minutes / 60) % 24, minutes % 60)
    : new Time(0, 0);
}

/**
 * An editor for a daily schedule: periods of `start → end → value`, kept in order by start, with a 24-hour preview.
 * It flags periods that end before they start or overlap, and gaps or uncovered time when `allowsGaps` is false or
 * `isFullDayRequired` is set. Wide containers show a table; narrow ones (phones) show a card per period, with the
 * preview kept in view.
 */
export function ScheduleEditor<V = number>(props: ScheduleEditorProps<V>) {
  const {
    label,
    description,
    errorMessage,
    value,
    defaultValue = [],
    onChange,
    allowsGaps = true,
    isFullDayRequired = false,
    valueLabel,
    isInvalid = false,
    isDisabled = false,
    className,
    ref,
  } = props;
  const messages = useMessages();
  const formatMinutes = useFormatMinutes();
  const labelId = useId();
  const issuesId = useId();
  const [rows, setRows] = useControllableState<Schedule<V>>(value, defaultValue, onChange);
  // A table when the editor is wide enough, a card per period when it isn't (phones, narrow columns).
  const [widthRef, width] = useElementWidth();
  const isWide = (width ?? 0) >= 640;
  const fieldLabel = (text: string) => (isWide ? { 'aria-label': text } : { label: text });
  const range = ([from, to]: [number, number]) =>
    messages.range({ from: formatMinutes(from), to: formatMinutes(to) });

  const { formatValue, toNumber, newRowValue, renderField } = useRowValue<V>(props);

  const validation = validateSchedule(rows, { allowsGaps, isFullDayRequired });
  const columnLabel = valueLabel ?? messages.value;

  const update = (index: number, patch: Partial<ScheduleRow<V>>) => {
    setRows(rows.map((row, at) => (at === index ? { ...row, ...patch } : row)));
  };
  const add = () => {
    // The first time nothing covers, or an hour at midnight when the day is full.
    const [from, to] = uncoveredSpans(rows)[0] ?? [0, 60];
    setRows(
      sortSchedule([
        ...rows,
        {
          start: fromMinutes(from),
          end: fromMinutes(Math.min(to, MINUTES_PER_DAY)),
          value: newRowValue,
        },
      ]),
    );
  };
  // Re-sort when focus leaves a row, so rows don't move while their times are being typed.
  const sortOnLeave = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget) && !isSorted(rows)) {
      setRows(sortSchedule(rows));
    }
  };

  const hasIssues = validation.schedule.length > 0 || (isInvalid && errorMessage !== undefined);
  return (
    <div
      ref={mergeRefs(ref, widthRef)}
      role="group"
      aria-labelledby={label !== undefined ? labelId : undefined}
      aria-describedby={hasIssues ? issuesId : undefined}
      className={cn('flex min-w-0 flex-col gap-3 text-sm text-fg', className)}
    >
      {label !== undefined && (
        <span id={labelId} className="font-medium">
          {label}
        </span>
      )}
      {description !== undefined && (
        <span className="-mt-2 text-xs text-fg-muted">{description}</span>
      )}
      <SchedulePreview
        rows={rows}
        formatValue={formatValue}
        toNumber={toNumber}
        // Kept in view while scrolling through the periods on narrow screens (below a sticky app header).
        className={cn(
          !isWide && 'sticky top-[var(--rux-sticky-top,0px)] z-sticky bg-surface-1 py-1',
        )}
      />
      <div className="flex flex-col gap-2">
        {isWide && (
          <div
            aria-hidden="true"
            className="grid grid-cols-[8rem_8rem_minmax(0,1fr)_2.75rem] gap-3 px-1 text-xs font-medium text-fg-muted"
          >
            <span>{messages.start}</span>
            <span>{messages.end}</span>
            <span>{columnLabel}</span>
          </div>
        )}
        <ul className="flex flex-col gap-2">
          {rows.map((row, index) => {
            const issues = validation.rows.get(index) ?? [];
            const span = spanOf(row);
            const rowRange = range(span);
            const issueId = `${issuesId}-${String(index)}`;
            return (
              <li key={index}>
                <div
                  role="group"
                  aria-label={rowRange}
                  aria-describedby={issues.length > 0 ? issueId : undefined}
                  onBlur={sortOnLeave}
                  className={cn(
                    'grid',
                    isWide
                      ? 'grid-cols-[8rem_8rem_minmax(0,1fr)_2.75rem] items-start gap-3 p-1'
                      : 'grid-cols-2 gap-2 rounded-card border border-border p-3',
                    !isWide && issues.length > 0 && 'border-danger-border',
                  )}
                >
                  <TimeField
                    {...fieldLabel(messages.start)}
                    value={toTime(row.start)}
                    onChange={(time) => {
                      if (time) {
                        update(index, { start: fromMinutes(time.hour * 60 + time.minute) });
                      }
                    }}
                    granularity="minute"
                    isDisabled={isDisabled}
                    isInvalid={issues.length > 0}
                  />
                  <TimeField
                    {...fieldLabel(messages.end)}
                    value={toTime(row.end)}
                    onChange={(time) => {
                      if (time) {
                        // Midnight as an end is the end of the day.
                        const minutes = time.hour * 60 + time.minute;
                        update(index, {
                          end: fromMinutes(minutes === 0 ? MINUTES_PER_DAY : minutes),
                        });
                      }
                    }}
                    granularity="minute"
                    isDisabled={isDisabled}
                    isInvalid={issues.length > 0}
                  />
                  <div className={isWide ? undefined : 'col-span-2'}>
                    {renderField({
                      ...fieldLabel(columnLabel),
                      value: row.value,
                      onChange: (next) => {
                        update(index, { value: next });
                      },
                      isDisabled,
                    })}
                  </div>
                  <IconButton
                    icon={Trash2}
                    aria-label={messages.removeRow({ range: rowRange })}
                    onPress={() => {
                      setRows(rows.filter((_, at) => at !== index));
                    }}
                    isDisabled={isDisabled}
                    className={isWide ? 'mt-0.5' : 'col-span-2 justify-self-end'}
                  />
                  {issues.length > 0 && (
                    <ul
                      id={issueId}
                      className="col-span-full flex flex-col text-xs font-medium text-danger-fg"
                    >
                      {issues.map((issue, at) => (
                        <li key={at}>{rowIssueText(issue, messages, range)}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <Button
        variant="outline"
        size="sm"
        icon={Plus}
        onPress={add}
        isDisabled={isDisabled}
        className="self-start"
      >
        {messages.addPeriod}
      </Button>
      {hasIssues && (
        <ul id={issuesId} className="flex flex-col gap-0.5 text-xs font-medium text-danger-fg">
          {validation.schedule.map((issue, at) => (
            <li key={at}>{scheduleIssueText(issue, messages, range)}</li>
          ))}
          {isInvalid && errorMessage !== undefined && typeof errorMessage !== 'function' && (
            <li>{errorMessage}</li>
          )}
        </ul>
      )}
    </div>
  );
}
