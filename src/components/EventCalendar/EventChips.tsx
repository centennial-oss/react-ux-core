// EventCalendar's drawn events: bars and chips in rows of days, blocks in the time grid, "+N more" buttons, and the
// dashed preview of a drag. Events are memoised and carry no handlers (their region handles the pointer and the grid
// the keyboard), so a drag or a focus change re-renders only the events it touches.
import { Lock } from 'lucide-react';
import { memo } from 'react';
import { cn } from '../../utils/cn';
import { toneFillClasses, toneSoftBorderedClasses } from '../../utils/toneClasses';
import { dayIndexOf, type BarSegment, type TimedSegment } from './layout';
import { BAR_HEIGHT, BAR_STEP, PX_PER_MINUTE } from './viewProps';

/** Classes every focusable event shares. */
const eventClasses =
  'absolute flex overflow-hidden text-xs select-none outline-none focus-visible:z-[2] focus-visible:focus-ring';

interface EventProps {
  /** Its roving key. */
  dataKey: string;
  isTabStop: boolean;
  /** Its accessible name. */
  name: string;
  canDrag: boolean;
  isDragged: boolean;
  /** The keyboard-editing help, for events that can be edited. */
  describedBy: string | undefined;
}

/** A percentage of a row's width, as a CSS length. */
const percent = (part: number, whole: number) => `${String((part * 100) / whole)}%`;

interface RowEventProps extends EventProps {
  segment: BarSegment;
  /** Days in the row. */
  columns: number;
  /** The top of the first stacked row, in pixels. */
  top: number;
  /** A timed event's start ("14:00"), shown after its label when there's room. */
  startTime: string | undefined;
}

/** An event in a row of days: a bar across its days, or a chip (a dot, a time and a label) within one day. */
export const RowEvent = memo(function RowEvent({
  segment,
  columns,
  top,
  dataKey,
  isTabStop,
  name,
  canDrag,
  isDragged,
  describedBy,
  startTime,
}: RowEventProps) {
  const { entry, first, last, row, isBar } = segment;
  const tone = entry.item.tone ?? 'accent';
  return (
    <div
      role="gridcell"
      data-key={dataKey}
      data-entry={entry.id}
      tabIndex={isTabStop ? 0 : -1}
      aria-label={name}
      aria-describedby={describedBy}
      aria-readonly={!canDrag || undefined}
      aria-haspopup="dialog"
      // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the event's days and stacked row.
      style={{
        insetInlineStart: `calc(${percent(first, columns)} + 2px)`,
        width: `calc(${percent(last - first + 1, columns)} - 4px)`,
        top: top + row * BAR_STEP,
        height: BAR_HEIGHT,
      }}
      className={cn(
        eventClasses,
        'items-center gap-1 rounded-control px-1.5',
        isBar
          ? cn(
              'border',
              toneSoftBorderedClasses[tone],
              segment.hasMoreBefore && 'rounded-s-none',
              segment.hasMoreAfter && 'rounded-e-none',
            )
          : 'text-fg hover:bg-surface-3',
        canDrag ? 'cursor-grab touch-none' : 'cursor-pointer',
        isDragged && 'opacity-50',
      )}
    >
      {!isBar && (
        <span
          aria-hidden="true"
          className={cn('size-2 shrink-0 rounded-full', toneFillClasses[tone])}
        />
      )}
      {entry.item.isLocked === true && <Lock aria-hidden="true" className="size-3 shrink-0" />}
      {/* The label, then the start: the order the accessible name has them in. */}
      <span className="truncate font-medium">{entry.item.label}</span>{' '}
      {!isBar && startTime !== undefined && (
        <span className="shrink-0 text-fg-muted tabular-nums">{startTime}</span>
      )}
      {canDrag && isBar && !segment.hasMoreAfter && (
        <span
          aria-hidden="true"
          data-handle="end"
          className="absolute inset-y-0 end-0 w-2 cursor-ew-resize"
        />
      )}
    </div>
  );
});

interface TimedEventProps extends EventProps {
  segment: TimedSegment;
  /** Its times ("14:00 to 15:30"), shown under the label when it's tall enough. */
  time: string;
  minHeight: number;
}

/** An event in a day column of the time grid, beside the events it overlaps. */
export const TimedEvent = memo(function TimedEvent({
  segment,
  time,
  minHeight,
  dataKey,
  isTabStop,
  name,
  canDrag,
  isDragged,
  describedBy,
}: TimedEventProps) {
  const { entry, startMinute, endMinute, column, columns } = segment;
  const height = Math.max(minHeight, (endMinute - startMinute) * PX_PER_MINUTE);
  return (
    <div
      role="gridcell"
      data-key={dataKey}
      data-entry={entry.id}
      tabIndex={isTabStop ? 0 : -1}
      aria-label={name}
      aria-describedby={describedBy}
      aria-readonly={!canDrag || undefined}
      aria-haspopup="dialog"
      // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the event's times and its column among overlaps.
      style={{
        top: startMinute * PX_PER_MINUTE,
        height,
        insetInlineStart: `calc(${percent(column, columns)} + 1px)`,
        width: `calc(${percent(1, columns)} - 3px)`,
      }}
      className={cn(
        eventClasses,
        'flex-col rounded-control border px-1.5 py-0.5 leading-tight',
        toneSoftBorderedClasses[entry.item.tone ?? 'accent'],
        segment.hasMoreBefore && 'rounded-t-none',
        segment.hasMoreAfter && 'rounded-b-none',
        canDrag ? 'cursor-grab touch-none' : 'cursor-pointer',
        isDragged && 'opacity-50',
      )}
    >
      <span className="flex min-w-0 items-center gap-1 font-medium">
        {entry.item.isLocked === true && <Lock aria-hidden="true" className="size-3 shrink-0" />}
        <span className="truncate">{entry.item.label}</span>
      </span>{' '}
      {height >= 34 && <span className="truncate tabular-nums">{time}</span>}
      {canDrag && !segment.hasMoreBefore && (
        <span
          aria-hidden="true"
          data-handle="start"
          className="absolute inset-x-0 top-0 h-1.5 cursor-ns-resize"
        />
      )}
      {canDrag && !segment.hasMoreAfter && (
        <span
          aria-hidden="true"
          data-handle="end"
          className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize"
        />
      )}
    </div>
  );
});

interface MoreButtonProps {
  dataKey: string;
  isTabStop: boolean;
  /** The visible text ("+3 more") and the accessible name ("3 more on Wednesday 14 October"). */
  text: string;
  label: string;
  /** Where it sits: its day's column, in the last stacked row's place. */
  column: number;
  columns: number;
  top: number;
  onPress: (button: HTMLButtonElement) => void;
}

/** The button on a day with more events than fit, which opens the day's full list. In a cell, as rows need. */
export function MoreButton({
  dataKey,
  isTabStop,
  text,
  label,
  column,
  columns,
  top,
  onPress,
}: MoreButtonProps) {
  return (
    <div
      role="gridcell"
      // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: its day's column and the last row's place.
      style={{
        insetInlineStart: `calc(${percent(column, columns)} + 2px)`,
        width: `calc(${percent(1, columns)} - 4px)`,
        top,
        height: BAR_HEIGHT,
      }}
      className="absolute z-[1] flex"
    >
      <button
        type="button"
        data-key={dataKey}
        tabIndex={isTabStop ? 0 : -1}
        aria-label={label}
        aria-haspopup="dialog"
        onClick={(event) => {
          onPress(event.currentTarget);
        }}
        className="min-w-0 flex-1 cursor-pointer truncate rounded-control px-1.5 text-start text-xs font-medium text-fg-muted outline-none hover:bg-surface-3 hover:text-fg focus-visible:focus-ring"
      >
        {text}
      </button>
    </div>
  );
}

/** Where a drag would land: a dashed outline with the event's label and new times. */
export function DragPreview({
  label,
  time,
  box,
}: {
  label: string;
  time: string;
  /** Where it's drawn. */
  box: { insetInlineStart: string; width: string; top: number; height: number };
}) {
  return (
    <span
      aria-hidden="true"
      data-preview=""
      // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: where the drag would land.
      style={box}
      className="pointer-events-none absolute z-[3] flex flex-wrap content-start items-center gap-x-1 overflow-hidden rounded-control border-2 border-dashed border-accent-border bg-accent-bg px-1.5 text-xs text-accent-fg"
    >
      <span className="truncate font-medium">{label}</span>
      <span className="shrink-0 tabular-nums">{time}</span>
    </span>
  );
}

/** The part of a drag preview by whole days that falls in one row of days (a month week, or the all-day row). */
export function RowPreview({
  days,
  rowStart,
  columns,
  top,
  start,
  end,
  label,
  time,
}: {
  /** All the visible days' boundaries. */
  days: readonly number[];
  /** The row's first day and its number of days. */
  rowStart: number;
  columns: number;
  top: number;
  start: number;
  end: number;
  label: string;
  time: string;
}) {
  const first = Math.max(rowStart, dayIndexOf(days, start));
  const last = Math.min(rowStart + columns - 1, dayIndexOf(days, end - 1));
  if (last < first) {
    return null;
  }
  return (
    <DragPreview
      label={label}
      time={time}
      box={{
        insetInlineStart: `calc(${percent(first - rowStart, columns)} + 2px)`,
        width: `calc(${percent(last - first + 1, columns)} - 4px)`,
        top,
        height: BAR_HEIGHT,
      }}
    />
  );
}

export { percent };
