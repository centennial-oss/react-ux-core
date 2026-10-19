// EventCalendar's week and day views: day columns with hours down the side, an all-day row under the day headers (both
// sticky), timed events side by side where they overlap, and a line at the current time. Drag a timed event up, down
// or to another day, drag its top or bottom edge, or drag on empty time to add one (a tap on touch); the all-day row
// drags by whole days, as in the month.
import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import { cn } from '../../utils/cn';
import { isRightToLeft } from '../../utils/direction';
import { useNowSelector } from '../../utils/timers';
import { useLatest } from '../../utils/useLatest';
import { usePointerDrag } from '../../utils/usePointerDrag';
import { editTimes, type TimeEditKind } from '../ScheduleTimeline/timeEdit';
import { addDays, fromZoned, MINUTE_MS, snapTime, zonedParts } from '../ScheduleTimeline/zone';
import { columnAt, pressTargetOf, useDayDrag } from './drag';
import { DragPreview, MoreButton, percent, RowEvent, RowPreview, TimedEvent } from './EventChips';
import { dayCellKey, moreKey, type NavModel } from './keyboard';
import { dayIndexOf, minuteOfDay, type DayRowLayout, type TimedSegment } from './layout';
import {
  BAR_STEP,
  HOUR_HEIGHT,
  MIN_DAY_WIDTH,
  MIN_EVENT_MINUTES,
  PX_PER_MINUTE,
  type CalendarViewProps,
} from './viewProps';

interface TimeGridViewProps extends CalendarViewProps {
  allDay: DayRowLayout;
  timed: readonly (readonly TimedSegment[])[];
  nav: NavModel;
  /** Stacked rows the all-day row shows. */
  allDayRows: number;
  scrollRef: RefObject<HTMLDivElement | null>;
  hasNowLine: boolean;
  /** The current time, instead of the shared clock. */
  now: number | undefined;
}

const DAY_HEIGHT = 24 * HOUR_HEIGHT;
const MIN_EVENT_HEIGHT = MIN_EVENT_MINUTES * PX_PER_MINUTE;
/** Where the view scrolls to with nothing better: 8 in the morning. */
const DEFAULT_SCROLL_MINUTE = 8 * 60;

/** A timed drag: moving an event (to other days too), moving its start or end, or drawing out a new one. */
interface TimeDrag {
  kind: TimeEditKind;
  key?: string;
  entryId?: string;
  /** The day column the press began in. */
  day: number;
  start: number;
  end: number;
}

/** The line at the current time, across today's column. Re-renders once a minute, on its own. */
function NowLine({
  now,
  days,
  timeZone,
}: {
  now: number | undefined;
  days: readonly number[];
  timeZone: string;
}) {
  const minute = useNowSelector((clock) => Math.floor((now ?? clock) / MINUTE_MS));
  const ms = minute * MINUTE_MS;
  const count = days.length - 1;
  const day = dayIndexOf(days, ms);
  if (day < 0 || day >= count) {
    return null;
  }
  const top = minuteOfDay(ms, days[day] ?? 0, days[day + 1] ?? 0, timeZone) * PX_PER_MINUTE;
  return (
    <span
      aria-hidden="true"
      data-now-line=""
      // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: now's day and time.
      style={{ top, insetInlineStart: percent(day, count), width: percent(1, count) }}
      className="pointer-events-none absolute z-[2] h-0.5 -translate-y-1/2 bg-danger-solid"
    >
      <span className="absolute -start-1 -top-[3px] size-2 rounded-full bg-danger-solid" />
    </span>
  );
}

export function TimeGridView({
  allDay,
  timed,
  nav,
  allDayRows,
  scrollRef,
  hasNowLine,
  now,
  days,
  dayNames,
  todayIndex,
  entryById,
  texts,
  format,
  messages,
  timeZone,
  snapMinutes,
  isEditable,
  canCreate,
  isNarrow,
  tabKey,
  editHelpId,
  createHelpId,
  gridRef,
  gridLabel,
  onGridKeyDown,
  onGridFocus,
  onCommit,
  onCreate,
  onOpenDetails,
  onOpenDay,
  maxHeight,
}: TimeGridViewProps) {
  const count = days.length - 1;
  const snapMs = Math.max(1, snapMinutes) * MINUTE_MS;
  const gutter = isNarrow ? 44 : 56;
  const allDayRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  let usedRows = 1;
  for (const segment of allDay.segments) {
    usedRows = Math.max(usedRows, segment.row + 1);
  }
  const shownRows = allDay.hidden.some((hidden) => hidden > 0) ? allDayRows : usedRows;
  const allDayHeight = shownRows * BAR_STEP + 6;

  // The hour labels, in the calendar's zone (formatted once per day range).
  const firstDay = days[0] ?? 0;
  const hourLabels = useMemo(() => {
    const { year, month, day } = zonedParts(firstDay, timeZone);
    return Array.from({ length: 23 }, (_, index) =>
      format.tick(fromZoned(timeZone, year, month, day, index + 1)),
    );
  }, [firstDay, timeZone, format]);

  // All-day row: drags by whole days.
  const dayDrag = useDayDrag({
    days,
    timeZone,
    snapMs,
    dayAt: (clientX) => {
      const element = allDayRef.current;
      return element
        ? columnAt(clientX, element.getBoundingClientRect(), count, isRightToLeft(element))
        : 0;
    },
    entryById,
    onCommit,
    onCreate,
    onOpenDetails,
  });

  // Timed events: drags by snaps of time, and across days.
  const columnUnder = (clientX: number) => {
    const element = bodyRef.current;
    return element
      ? columnAt(clientX, element.getBoundingClientRect(), count, isRightToLeft(element))
      : 0;
  };
  const timeAt = (clientY: number, day: number) => {
    const top = bodyRef.current?.getBoundingClientRect().top ?? 0;
    const minute = Math.min(1440, Math.max(0, (clientY - top) / PX_PER_MINUTE));
    const { year, month, day: date } = zonedParts(days[day] ?? 0, timeZone);
    return fromZoned(timeZone, year, month, date, 0, Math.floor(minute));
  };
  const timeDrag = usePointerDrag<TimeDrag, TimeDrag>({
    resolve: ({ state, originY }, clientX, clientY) => {
      const deltaMs = ((clientY - originY) / PX_PER_MINUTE) * MINUTE_MS;
      const bounds = { start: days[state.day] ?? 0, end: days[state.day + 1] ?? 0 };
      const times = editTimes(
        state.kind,
        state.start,
        state.kind === 'create' ? state.start : state.end,
        deltaMs,
        snapMinutes,
        timeZone,
        bounds,
      );
      if (state.kind === 'move') {
        const shift = columnUnder(clientX) - state.day;
        if (shift !== 0) {
          const start = addDays(times.start, shift, timeZone);
          return { ...state, start, end: start + (times.end - times.start) };
        }
      }
      return { ...state, ...times };
    },
    onDrop: ({ state }, result) => {
      if (state.kind === 'create') {
        onCreate(result.start, result.end, false);
        return;
      }
      const entry = state.entryId === undefined ? undefined : entryById.get(state.entryId);
      if (entry) {
        onCommit(entry, result.start, result.end);
      }
    },
    onPress: ({ state, pointerType }) => {
      if (state.key !== undefined) {
        onOpenDetails(state.key);
      } else if (state.kind === 'create' && pointerType === 'touch') {
        // Touch scrolling needs the empty time, so a tap (not a drag) adds an hour there.
        const start = snapTime(state.start, snapMinutes, timeZone, 'floor');
        onCreate(start, start + Math.max(snapMs, 60 * MINUTE_MS), false);
      }
    },
  });
  const preview = timeDrag.preview ?? dayDrag.preview;
  const previewEntry = preview?.entryId === undefined ? undefined : entryById.get(preview.entryId);
  const previewLabel = previewEntry?.item.label ?? messages.eventCalendarNewEvent;

  // Scroll to now (or the first event, or the morning) whenever the days change, not as the clock ticks or events
  // move.
  let firstMinute = Infinity;
  for (const segments of timed) {
    firstMinute = Math.min(firstMinute, segments[0]?.startMinute ?? Infinity);
  }
  const scrollTarget = useLatest({ todayIndex, firstMinute, now });
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }
    const target = scrollTarget.current;
    const minute =
      target.todayIndex >= 0
        ? minuteOfDay(
            target.now ?? Date.now(),
            days[target.todayIndex] ?? 0,
            days[target.todayIndex + 1] ?? 0,
            timeZone,
          )
        : Number.isFinite(target.firstMinute)
          ? target.firstMinute
          : DEFAULT_SCROLL_MINUTE;
    element.scrollTop = Math.max(0, (minute - 60) * PX_PER_MINUTE);
    // Only when the days change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstDay, count, scrollRef, scrollTarget]);

  return (
    <div
      ref={scrollRef}
      // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the app's maximum height.
      style={{ maxHeight: maxHeight ?? '36rem' }}
      className="relative min-h-0 overflow-auto"
    >
      {/* Focus moves through the day headers and events (a roving tabindex), not the grid itself. */}
      {/* eslint-disable-next-line jsx-a11y/interactive-supports-focus -- see above. */}
      <div
        ref={gridRef}
        role="grid"
        aria-label={gridLabel}
        aria-rowcount={3}
        onKeyDown={onGridKeyDown}
        onFocus={onGridFocus}
        // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: day columns scroll sideways below a minimum width.
        style={{ minWidth: gutter + count * MIN_DAY_WIDTH }}
        className="relative text-sm"
      >
        <div className="sticky top-0 z-[4] bg-surface-1">
          <div role="row" aria-rowindex={1} className="flex border-b border-border bg-surface-2">
            <div
              role="columnheader"
              // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the hour column's width.
              style={{ width: gutter }}
              className="sticky start-0 z-[1] shrink-0 border-e border-border bg-surface-2"
            >
              <span className="sr-only">{messages.scheduleTimeAxis}</span>
            </div>
            {days.slice(0, count).map((dayStart, day) => {
              const key = dayCellKey(day);
              const isToday = day === todayIndex;
              return (
                <div
                  key={key}
                  role="columnheader"
                  data-key={key}
                  tabIndex={tabKey === key ? 0 : -1}
                  aria-current={isToday ? 'date' : undefined}
                  aria-describedby={canCreate ? createHelpId : undefined}
                  className="flex min-w-0 flex-1 basis-0 items-center justify-center gap-1.5 border-e border-border px-1 py-1.5 outline-none last:border-e-0 focus-visible:focus-ring focus-visible:-outline-offset-2"
                >
                  <span className="sr-only">{dayNames[day]}</span>
                  <span aria-hidden="true" className="truncate text-xs text-fg-muted">
                    {format.weekday(dayStart)}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-full text-sm tabular-nums',
                      isToday ? 'bg-accent-solid font-semibold text-accent-on-solid' : 'text-fg',
                    )}
                  >
                    {format.dayNumber(dayStart)}
                  </span>
                </div>
              );
            })}
          </div>
          <div role="row" aria-rowindex={2} className="flex border-b border-border">
            <div
              role="rowheader"
              // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the hour column's width.
              style={{ width: gutter }}
              className="sticky start-0 z-[1] flex shrink-0 items-center border-e border-border bg-surface-1 px-1 text-[0.6875rem] leading-tight text-fg-muted"
            >
              {messages.eventCalendarAllDay}
            </div>
            <div
              ref={allDayRef}
              // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: rows of all-day events.
              style={{ height: allDayHeight }}
              className="relative flex-1 bg-surface-2"
              onPointerDown={(event) => {
                dayDrag.onPointerDown(event, { isEditable, canCreate });
              }}
              onPointerMove={dayDrag.move}
              onPointerUp={dayDrag.end}
              onPointerCancel={dayDrag.cancel}
            >
              {days.slice(0, count).map((dayStart, day) => (
                <div
                  key={dayStart}
                  data-day={day}
                  aria-hidden="true"
                  // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the day's column.
                  style={{ insetInlineStart: percent(day, count), width: percent(1, count) }}
                  className={cn(
                    'absolute inset-y-0 border-e border-border last:border-e-0',
                    canCreate && 'cursor-crosshair',
                  )}
                />
              ))}
              {allDay.segments.map((segment) => {
                const key = nav.segmentKeys.get(segment) ?? '';
                const entry = segment.entry;
                const canDrag = isEditable && entry.item.isLocked !== true;
                return (
                  <RowEvent
                    key={key}
                    segment={segment}
                    columns={count}
                    top={3}
                    dataKey={key}
                    isTabStop={tabKey === key}
                    name={texts.get(entry.id)?.name ?? entry.item.label}
                    canDrag={canDrag}
                    isDragged={preview?.entryId === entry.id}
                    describedBy={canDrag ? editHelpId : undefined}
                    startTime={undefined}
                  />
                );
              })}
              {allDay.hidden.map((hidden, day) => {
                if (hidden === 0) {
                  return null;
                }
                const key = moreKey(day);
                return (
                  <MoreButton
                    key={key}
                    dataKey={key}
                    isTabStop={tabKey === key}
                    text={
                      isNarrow
                        ? `+${String(hidden)}`
                        : messages.eventCalendarMore({ count: hidden })
                    }
                    label={messages.eventCalendarMoreLabel({
                      count: hidden,
                      date: dayNames[day] ?? '',
                    })}
                    column={day}
                    columns={count}
                    top={3 + (allDayRows - 1) * BAR_STEP}
                    onPress={(button) => {
                      onOpenDay(day, button);
                    }}
                  />
                );
              })}
              {dayDrag.preview && (
                <RowPreview
                  days={days}
                  rowStart={0}
                  columns={count}
                  top={3}
                  start={dayDrag.preview.start}
                  end={dayDrag.preview.end}
                  label={previewLabel}
                  time={format.eventTime({
                    start: dayDrag.preview.start,
                    end: dayDrag.preview.end,
                    isAllDay: previewEntry?.isAllDay ?? true,
                  })}
                />
              )}
            </div>
          </div>
        </div>

        <div role="row" aria-rowindex={3} className="flex">
          <div
            role="rowheader"
            // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the hour column's width and the day's height.
            style={{ width: gutter, height: DAY_HEIGHT }}
            className="sticky start-0 z-[3] shrink-0 border-e border-border bg-surface-1"
          >
            <span className="sr-only">{messages.scheduleTimeAxis}</span>
            <div aria-hidden="true">
              {hourLabels.map((label, index) => (
                <span
                  key={label}
                  // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the hour's position.
                  style={{ top: (index + 1) * HOUR_HEIGHT }}
                  className="absolute end-1.5 -translate-y-1/2 text-[0.6875rem] whitespace-nowrap text-fg-muted tabular-nums"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div
            ref={bodyRef}
            // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: a day's height.
            style={{ height: DAY_HEIGHT }}
            className="relative flex flex-1"
            onPointerDown={(event) => {
              const target = pressTargetOf(event);
              if (target?.kind === 'event') {
                const entry = entryById.get(target.entryId);
                if (entry) {
                  timeDrag.begin(
                    event,
                    {
                      kind: target.handle ?? 'move',
                      key: target.key,
                      entryId: entry.id,
                      day: columnUnder(event.clientX),
                      start: entry.start,
                      end: entry.end,
                    },
                    !isEditable || entry.item.isLocked === true,
                  );
                }
              } else if (target?.kind === 'day' && canCreate) {
                const start = timeAt(event.clientY, target.day);
                timeDrag.begin(event, { kind: 'create', day: target.day, start, end: start });
              }
            }}
            onPointerMove={timeDrag.move}
            onPointerUp={timeDrag.end}
            onPointerCancel={timeDrag.cancel}
          >
            {timed.map((segments, day) => (
              <div
                key={days[day]}
                data-day={day}
                className={cn(
                  'relative min-w-0 flex-1 basis-0 border-e border-border bg-[repeating-linear-gradient(to_bottom,var(--color-border)_0_1px,transparent_1px_48px)] last:border-e-0',
                  day === todayIndex ? 'bg-accent-bg/40' : 'bg-surface-2',
                  canCreate && 'cursor-crosshair',
                )}
              >
                {segments.map((segment) => {
                  const key = nav.segmentKeys.get(segment) ?? '';
                  const entry = segment.entry;
                  const text = texts.get(entry.id);
                  const canDrag = isEditable && entry.item.isLocked !== true;
                  return (
                    <TimedEvent
                      key={key}
                      segment={segment}
                      time={text?.time ?? ''}
                      minHeight={MIN_EVENT_HEIGHT}
                      dataKey={key}
                      isTabStop={tabKey === key}
                      name={text?.name ?? entry.item.label}
                      canDrag={canDrag}
                      isDragged={preview?.entryId === entry.id}
                      describedBy={canDrag ? editHelpId : undefined}
                    />
                  );
                })}
              </div>
            ))}
            {hasNowLine && <NowLine now={now} days={days} timeZone={timeZone} />}
            {timeDrag.preview && (
              <TimePreview
                days={days}
                timeZone={timeZone}
                start={timeDrag.preview.start}
                end={timeDrag.preview.end}
                label={previewLabel}
                time={format.eventTime({
                  start: timeDrag.preview.start,
                  end: timeDrag.preview.end,
                  isAllDay: false,
                })}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** A drag preview in the time grid, one piece per day it covers. */
function TimePreview({
  days,
  timeZone,
  start,
  end,
  label,
  time,
}: {
  days: readonly number[];
  timeZone: string;
  start: number;
  end: number;
  label: string;
  time: string;
}) {
  const count = days.length - 1;
  const first = Math.max(0, dayIndexOf(days, start));
  const last = Math.min(count - 1, dayIndexOf(days, end - 1));
  const pieces = [];
  for (let day = first; day <= last; day += 1) {
    const dayStart = days[day] ?? 0;
    const dayEnd = days[day + 1] ?? dayStart;
    const top = minuteOfDay(Math.max(start, dayStart), dayStart, dayEnd, timeZone);
    const bottom = minuteOfDay(Math.min(end, dayEnd), dayStart, dayEnd, timeZone);
    pieces.push(
      <DragPreview
        key={day}
        label={label}
        time={time}
        box={{
          insetInlineStart: `calc(${percent(day, count)} + 1px)`,
          width: `calc(${percent(1, count)} - 3px)`,
          top: top * PX_PER_MINUTE,
          height: Math.max(MIN_EVENT_HEIGHT, (bottom - top) * PX_PER_MINUTE),
        }}
      />,
    );
  }
  return pieces;
}
