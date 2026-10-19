import { Time } from '@internationalized/date';
import { useId, type FocusEvent, type ReactNode, type Ref } from 'react';
import { useEntryMessages } from '../../provider/context';
import { rangeEditorStrings, type CommonMessages } from '../../provider/coreStrings';
import { cn } from '../../utils/cn';
import { mergeRefs } from '../../utils/mergeRefs';
import { useControllableState } from '../../utils/useControllableState';
import type { FieldBaseProps } from '../Field/Field';
import { shownError } from '../Field/PlainField';
import { useRowLayout } from '../RowEditor/rowLayout';
import {
  AddRowButton,
  RemoveRowButton,
  RowCard,
  RowHeadings,
  RowIssues,
  RowShell,
} from '../RowEditor/RowShell';
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
  messages: CommonMessages & typeof rangeEditorStrings,
  range: (span: [number, number]) => string,
) {
  return issue.kind === 'endBeforeStart'
    ? messages.endBeforeStart
    : messages.overlaps({ range: range(issue.with) });
}

function scheduleIssueText(
  issue: ScheduleIssue,
  messages: CommonMessages & typeof rangeEditorStrings,
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
  const messages = useEntryMessages(rangeEditorStrings);
  const formatMinutes = useFormatMinutes();
  const issuesId = useId();
  const [rows, setRows] = useControllableState<Schedule<V>>(value, defaultValue, onChange);
  // A table when the editor is wide enough, a card per period when it isn't (phones, narrow columns).
  const { ref: widthRef, isWide, fieldLabel } = useRowLayout();
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

  const appError = shownError(isInvalid, errorMessage);
  const issues: ReactNode[] = validation.schedule.map((issue) =>
    scheduleIssueText(issue, messages, range),
  );
  if (appError !== undefined) {
    issues.push(appError);
  }
  const columns = 'grid-cols-[8rem_8rem_minmax(0,1fr)_2.75rem]';
  return (
    <RowShell
      ref={mergeRefs(ref, widthRef)}
      label={label}
      description={description}
      aria-describedby={issues.length > 0 ? issuesId : undefined}
      className={className}
    >
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
          <RowHeadings columns={columns} headings={[messages.start, messages.end, columnLabel]} />
        )}
        <ul className="flex flex-col gap-2">
          {rows.map((row, index) => {
            const rowIssues = validation.rows.get(index) ?? [];
            const span = spanOf(row);
            const rowRange = range(span);
            const issueId = `${issuesId}-${String(index)}`;
            return (
              <li key={index}>
                <RowCard
                  isWide={isWide}
                  columns={columns}
                  cardColumns="grid-cols-2"
                  aria-label={rowRange}
                  issueId={issueId}
                  issues={rowIssues.map((issue) => rowIssueText(issue, messages, range))}
                  onBlur={sortOnLeave}
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
                    isInvalid={rowIssues.length > 0}
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
                    isInvalid={rowIssues.length > 0}
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
                  <RemoveRowButton
                    isWide={isWide}
                    aria-label={messages.removeRow({ range: rowRange })}
                    onPress={() => {
                      setRows(rows.filter((_, at) => at !== index));
                    }}
                    isDisabled={isDisabled}
                  />
                </RowCard>
              </li>
            );
          })}
        </ul>
      </div>
      <AddRowButton onPress={add} isDisabled={isDisabled} className="self-start">
        {messages.addPeriod}
      </AddRowButton>
      {issues.length > 0 && <RowIssues id={issuesId} issues={issues} className="gap-0.5" />}
    </RowShell>
  );
}
