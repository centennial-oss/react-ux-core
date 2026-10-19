// EventCalendar's month: a grid of weeks, each day a cell with its number, its events as bars (across days) and chips
// (timed, within a day), and "+N more" where they don't fit. Drag events to other days or drag a bar's end; drag
// across empty days (or tap one, on touch) to add an all-day event.
import { useRef } from 'react';
import { cn } from '../../utils/cn';
import { isRightToLeft } from '../../utils/direction';
import { columnAt, useDayDrag } from './drag';
import { MoreButton, RowEvent, RowPreview } from './EventChips';
import { dayCellKey, moreKey, type NavModel } from './keyboard';
import type { DayRowLayout, MsRange } from './layout';
import { BAR_STEP, DAY_NUMBER_HEIGHT, type CalendarViewProps } from './viewProps';

interface MonthViewProps extends CalendarViewProps {
  rows: readonly DayRowLayout[];
  nav: NavModel;
  /** The month itself; days before and after it are muted. */
  period: MsRange;
  /** Stacked rows each week shows. */
  maxRows: number;
}

const COLUMNS = 7;

export function MonthView({
  rows,
  nav,
  period,
  maxRows,
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
}: MonthViewProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const weekHeight = DAY_NUMBER_HEIGHT + maxRows * BAR_STEP + 4;
  const drag = useDayDrag({
    days,
    timeZone,
    snapMs: snapMinutes * 60_000,
    dayAt: (clientX, clientY) => {
      const element = bodyRef.current;
      if (!element) {
        return 0;
      }
      const rect = element.getBoundingClientRect();
      const row = Math.min(
        rows.length - 1,
        Math.max(0, Math.floor((clientY - rect.top) / weekHeight)),
      );
      return row * COLUMNS + columnAt(clientX, rect, COLUMNS, isRightToLeft(element));
    },
    entryById,
    onCommit,
    onCreate,
    onOpenDetails,
  });
  const { preview } = drag;
  const previewEntry = preview?.entryId === undefined ? undefined : entryById.get(preview.entryId);

  return (
    <div
      // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the app's maximum height.
      style={maxHeight === undefined ? undefined : { maxHeight }}
      className="min-h-0 overflow-auto"
    >
      {/* Focus moves through the days and events (a roving tabindex), not the grid itself. */}
      {/* eslint-disable-next-line jsx-a11y/interactive-supports-focus -- see above. */}
      <div
        ref={gridRef}
        role="grid"
        aria-label={gridLabel}
        aria-rowcount={rows.length + 1}
        aria-colcount={COLUMNS}
        onKeyDown={onGridKeyDown}
        onFocus={onGridFocus}
        className="relative text-sm"
      >
        <div
          role="row"
          aria-rowindex={1}
          className="grid grid-cols-7 border-b border-border bg-surface-2"
        >
          {days.slice(0, COLUMNS).map((day) => (
            <div
              key={day}
              role="columnheader"
              className="truncate px-1 py-1.5 text-center text-xs font-medium text-fg-muted"
            >
              {format.weekday(day)}
            </div>
          ))}
        </div>
        <div
          ref={bodyRef}
          onPointerDown={(event) => {
            drag.onPointerDown(event, { isEditable, canCreate });
          }}
          onPointerMove={drag.move}
          onPointerUp={drag.end}
          onPointerCancel={drag.cancel}
        >
          {rows.map((row, rowIndex) => {
            const firstDay = rowIndex * COLUMNS;
            return (
              <div
                key={days[firstDay]}
                role="row"
                aria-rowindex={rowIndex + 2}
                // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: a week's height for its rows of events.
                style={{ height: weekHeight }}
                className="relative grid grid-cols-7 border-b border-border last:border-b-0"
              >
                {row.counts.map((count, column) => {
                  const day = firstDay + column;
                  const dayStart = days[day] ?? 0;
                  const key = dayCellKey(day);
                  const isToday = day === todayIndex;
                  const isOutside = dayStart < period.start || dayStart >= period.end;
                  return (
                    <div
                      key={key}
                      role="gridcell"
                      data-key={key}
                      data-day={day}
                      tabIndex={tabKey === key ? 0 : -1}
                      aria-label={messages.eventCalendarDay({
                        date: format.longDay(dayStart),
                        count,
                      })}
                      aria-current={isToday ? 'date' : undefined}
                      aria-describedby={canCreate ? createHelpId : undefined}
                      className={cn(
                        'relative min-w-0 border-e border-border outline-none last:border-e-0 focus-visible:focus-ring focus-visible:-outline-offset-2',
                        !isOutside && 'bg-surface-2',
                        canCreate && 'cursor-crosshair',
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          'm-1 flex size-6 items-center justify-center rounded-full text-xs tabular-nums',
                          isToday
                            ? 'bg-accent-solid font-semibold text-accent-on-solid'
                            : isOutside
                              ? 'text-fg-muted'
                              : 'text-fg',
                        )}
                      >
                        {format.dayNumber(dayStart)}
                      </span>
                    </div>
                  );
                })}
                {row.segments.map((segment) => {
                  const key = nav.segmentKeys.get(segment) ?? '';
                  const entry = segment.entry;
                  const text = texts.get(entry.id);
                  const canDrag = isEditable && entry.item.isLocked !== true;
                  return (
                    <RowEvent
                      key={key}
                      segment={segment}
                      columns={COLUMNS}
                      top={DAY_NUMBER_HEIGHT}
                      dataKey={key}
                      isTabStop={tabKey === key}
                      name={text?.name ?? entry.item.label}
                      canDrag={canDrag}
                      isDragged={preview?.entryId === entry.id}
                      describedBy={canDrag ? editHelpId : undefined}
                      startTime={isNarrow ? undefined : text?.startTime}
                    />
                  );
                })}
                {row.hidden.map((hidden, column) => {
                  if (hidden === 0) {
                    return null;
                  }
                  const day = firstDay + column;
                  const key = moreKey(day);
                  return (
                    <MoreButton
                      key={key}
                      dataKey={key}
                      isTabStop={tabKey === key}
                      // Narrow days have room for the count alone; the name still says it in full.
                      text={
                        isNarrow
                          ? `+${String(hidden)}`
                          : messages.eventCalendarMore({ count: hidden })
                      }
                      label={messages.eventCalendarMoreLabel({
                        count: hidden,
                        date: dayNames[day] ?? '',
                      })}
                      column={column}
                      columns={COLUMNS}
                      top={DAY_NUMBER_HEIGHT + (maxRows - 1) * BAR_STEP}
                      onPress={(button) => {
                        onOpenDay(day, button);
                      }}
                    />
                  );
                })}
                {preview && (
                  <RowPreview
                    days={days}
                    rowStart={firstDay}
                    columns={COLUMNS}
                    top={DAY_NUMBER_HEIGHT}
                    start={preview.start}
                    end={preview.end}
                    label={previewEntry?.item.label ?? messages.eventCalendarNewEvent}
                    time={format.eventTime({
                      start: preview.start,
                      end: preview.end,
                      isAllDay: previewEntry?.isAllDay ?? true,
                    })}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
