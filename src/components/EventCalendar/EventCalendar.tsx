// EventCalendar: events in a month grid, week and day time grids, or an agenda list, with a view switch, date
// navigation (previous / today / next and Calendar's month and year Cyclers), and editing by drag or keyboard.

import { CalendarDate } from '@internationalized/date';
import {
  useId,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type Ref,
} from 'react';
import { useLocale } from 'react-aria-components';
import { useEntryMessages, useTimeZone } from '../../provider/context';
import { eventCalendarStrings } from '../../provider/coreStrings';
import { cn } from '../../utils/cn';
import { isRightToLeft } from '../../utils/direction';
import { clamp } from '../../utils/math';
import { mergeRefs } from '../../utils/mergeRefs';
import { toEpochMs } from '../../utils/time';
import { useNowSelector } from '../../utils/timers';
import type { HeadingLevel } from '../../utils/types';
import { useControllableState } from '../../utils/useControllableState';
import { useElementWidth } from '../../utils/useElementWidth';
import { useRovingKey } from '../../utils/useRovingKey';
import { MonthYearCyclers } from '../Calendar/MonthYearCyclers';
import { LiveRegion, useAnnouncer } from '../LiveRegion/LiveRegion';
import { Popover } from '../Popover/Popover';
import { AgendaDays } from '../ScheduleTimeline/AgendaDays';
import { ItemDetails } from '../ScheduleTimeline/ItemDetails';
import type { TimelineRange } from '../ScheduleTimeline/layout';
import { defaultScheduleTimelineMessages } from '../ScheduleTimeline/messages';
import { PeriodNav, ViewSwitch } from '../ScheduleTimeline/PeriodControls';
import { stepSnapped } from '../ScheduleTimeline/timeEdit';
import {
  addDays,
  fromZoned,
  localeFirstDay,
  MINUTE_MS,
  snapTime,
  startOfDay,
  zonedParts,
} from '../ScheduleTimeline/zone';
import { ToolbarFrame } from '../Toolbar/ToolbarFrame';
import { minimumEnd } from './drag';
import { useEventCalendarFormat } from './format';
import {
  buildMonthNav,
  buildTimeGridNav,
  dayCellKey,
  eventKey,
  type KeyTarget,
  type NavModel,
  type NavPosition,
} from './keyboard';
import {
  dayBoundaries,
  dayIndexOf,
  layoutDayRows,
  layoutTimed,
  normalizeEntries,
  periodOf,
  viewRange,
  type CalendarEntry,
  type DayRowLayout,
  type EventCalendarDraft,
  type EventCalendarItem,
  type EventCalendarView,
  type MsRange,
  type TimedSegment,
} from './layout';
import { MonthView } from './MonthView';
import { TimeGridView } from './TimeGridView';
import {
  MIN_EVENT_MINUTES,
  PX_PER_MINUTE,
  type CalendarViewProps,
  type EntryText,
  type EventCalendarMessages,
} from './viewProps';

export interface EventCalendarProps {
  /** The events. Recurring events are expanded by the app (one item per occurrence). */
  items: readonly EventCalendarItem[];
  /** The view shown, controlled. */
  view?: EventCalendarView;
  /** The view at first, uncontrolled. Defaults to the first of `views`. */
  defaultView?: EventCalendarView;
  onViewChange?: (view: EventCalendarView) => void;
  /** The views the view switch offers, in order. Defaults to month, week, day and agenda. */
  views?: readonly EventCalendarView[];
  /**
   * The visible range (end exclusive), controlled. The calendar shows the month, week or day around the range's
   * middle, so the range it reports through `onRangeChange` (the whole weeks a month shows) can be passed straight
   * back.
   */
  range?: TimelineRange;
  /** The range at first, uncontrolled. Defaults to the view around today. */
  defaultRange?: TimelineRange;
  /**
   * Called with the newly visible range (for the month, every day shown, including the neighbouring months' days)
   * when the user navigates or switches views, so the app can fetch the events in it.
   */
  onRangeChange?: (range: TimelineRange) => void;
  /** Moving and resizing events by drag, with keyboard alternatives. Defaults to false. */
  isEditable?: boolean;
  /** Called with the event at its new times (as Dates; all-day events at midnight) after a move or resize. */
  onItemChange?: (item: EventCalendarItem) => void;
  /**
   * Called with a new event's times after dragging on empty time or days (or Enter on a day). Drawn out in the
   * month or the all-day row, it's all day.
   */
  onCreate?: (draft: EventCalendarDraft) => void;
  /** Timed moves, resizes and new events snap to this many minutes. Defaults to 15. */
  snapMinutes?: number;
  /** IANA time zone for the days and times. Defaults to UIProvider's `timeZone`. */
  timeZone?: string;
  /** Draws a line at the current time in the week and day views. Defaults to true. */
  hasNowLine?: boolean;
  /** The current time, instead of the shared clock (for tests, stories and replays). */
  now?: Date | number;
  /** The week's first day (0 = Sunday). Defaults to the locale's. */
  firstDayOfWeek?: number;
  /** The views' maximum height before they scroll inside, such as `40rem`. Defaults to 36rem for the week and day. */
  maxHeight?: string;
  /** The level of the agenda's day headings. Defaults to 3. */
  headingLevel?: HeadingLevel;
  /** Names the grid. Defaults to the `eventCalendarLabel` message. */
  'aria-label'?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

const ALL_VIEWS: readonly EventCalendarView[] = ['month', 'week', 'day', 'agenda'];
/** Containers narrower than this get fewer rows of events per day, and a narrower hour column. */
const NARROW_BELOW = 640;

const eventCalendarMessages = { ...defaultScheduleTimelineMessages, ...eventCalendarStrings };

interface CalendarLayout {
  view: EventCalendarView;
  nav: NavModel | null;
  rows: readonly DayRowLayout[];
  allDay: DayRowLayout;
  timed: readonly (readonly TimedSegment[])[];
}

const NO_ROW: DayRowLayout = { segments: [], counts: [], hidden: [] };

function toRange({ start, end }: MsRange): TimelineRange {
  return { start: new Date(start), end: new Date(end) };
}

/**
 * Events on a calendar: a month grid (events in day cells, bars across days, "+N more" for the rest), week and day
 * time grids (hours down the side, overlapping events side by side, an all-day row and a line at the current time),
 * and an agenda list. A view switch, previous / today / next and month and year Cyclers move around, reporting the
 * visible range so the app can fetch its events. With `isEditable`, events move and resize by drag or with Alt and the
 * arrow keys, snapping to `snapMinutes`, and dragging on empty time or days adds one; locked events stay put. Takes
 * ScheduleTimeline's items and time zones, so the same events can show in both.
 */
export function EventCalendar({
  items,
  view: viewProp,
  defaultView,
  onViewChange,
  views = ALL_VIEWS,
  range: rangeProp,
  defaultRange,
  onRangeChange,
  isEditable = false,
  onItemChange,
  onCreate,
  snapMinutes = 15,
  timeZone,
  hasNowLine = true,
  now: nowProp,
  firstDayOfWeek,
  maxHeight,
  headingLevel = 3,
  'aria-label': ariaLabel,
  className,
  ref,
}: EventCalendarProps) {
  const messages: EventCalendarMessages = useEntryMessages(eventCalendarMessages);
  const { locale } = useLocale();
  const defaultTimeZone = useTimeZone();
  const zone = timeZone ?? defaultTimeZone;
  const firstDay = useMemo(
    () => firstDayOfWeek ?? localeFirstDay(locale),
    [firstDayOfWeek, locale],
  );
  const snap = Math.max(1, snapMinutes);
  const snapMs = snap * MINUTE_MS;
  const now = nowProp === undefined ? undefined : toEpochMs(nowProp);
  // Re-renders when the day changes, not on every tick of the clock.
  const todayStart = useNowSelector((clock) => startOfDay(now ?? clock, zone));

  // The view, and the range around whose middle it's drawn.
  const [view, setView] = useControllableState<EventCalendarView>(
    viewProp,
    defaultView ?? views[0] ?? 'month',
    onViewChange,
  );
  const [initialRange] = useState(
    () =>
      defaultRange ??
      toRange(
        viewRange(viewProp ?? defaultView ?? views[0] ?? 'month', todayStart, zone, firstDay),
      ),
  );
  const [range, setRange] = useControllableState<TimelineRange>(
    rangeProp,
    initialRange,
    onRangeChange,
  );
  const anchor = (range.start.getTime() + range.end.getTime()) / 2;
  const period = useMemo(
    () => periodOf(view, anchor, zone, firstDay),
    [view, anchor, zone, firstDay],
  );
  const visible = useMemo(
    () => viewRange(view, anchor, zone, firstDay),
    [view, anchor, zone, firstDay],
  );
  const days = useMemo(() => dayBoundaries(visible, zone), [visible, zone]);
  const format = useEventCalendarFormat(locale, zone, messages);
  const dayNames = useMemo(() => days.slice(0, -1).map(format.longDay), [days, format]);
  const todayIndex = (() => {
    const index = dayIndexOf(days, todayStart);
    return index >= 0 && index < days.length - 1 ? index : -1;
  })();
  // The day the views pivot on: today when it's in the period, else the period's first day.
  const focusDay =
    todayStart >= period.start && todayStart < period.end ? todayStart : period.start;

  const goTo = (nextView: EventCalendarView, at: number) => {
    setRange(toRange(viewRange(nextView, at, zone, firstDay)));
  };
  const onStep = (direction: -1 | 1) => {
    if (view === 'week' || view === 'day') {
      goTo(view, addDays(period.start, direction * (view === 'week' ? 7 : 1), zone));
    } else {
      const { year, month } = zonedParts(period.start, zone);
      goTo(view, fromZoned(zone, year, month + direction, 1));
    }
  };
  const changeView = (next: EventCalendarView) => {
    setView(next);
    goTo(next, focusDay);
  };
  const focusedDate = useMemo(() => {
    const { year, month, day } = zonedParts(focusDay, zone);
    return new CalendarDate(year, month, day);
  }, [focusDay, zone]);

  // Events, their text, and the current view's layout.
  const entries = useMemo(() => normalizeEntries(items, visible, zone), [items, visible, zone]);
  const entryById = useMemo(() => new Map(entries.map((entry) => [entry.id, entry])), [entries]);
  const texts = useMemo(
    () =>
      new Map<string, EntryText>(
        entries.map((entry) => {
          const time = format.eventTime(entry);
          return [
            entry.id,
            {
              time,
              startTime: format.time(entry.start),
              name: messages.eventCalendarEvent({
                label: entry.item.label,
                time,
                isLocked: entry.item.isLocked === true,
              }),
            },
          ];
        }),
      ),
    [entries, format, messages],
  );
  const [widthRef, width] = useElementWidth();
  const isNarrow = width !== undefined && width < NARROW_BELOW;
  const monthRows = isNarrow ? 2 : 4;
  const allDayRows = isNarrow ? 2 : 3;
  const layout = useMemo<CalendarLayout>(() => {
    if (view === 'month') {
      const rows = layoutDayRows(entries, days, 7, monthRows);
      return { view, nav: buildMonthNav(rows, 7), rows, allDay: NO_ROW, timed: [] };
    }
    if (view === 'agenda') {
      return { view, nav: null, rows: [], allDay: NO_ROW, timed: [] };
    }
    const count = days.length - 1;
    const [allDay = NO_ROW] = layoutDayRows(
      entries.filter((entry) => entry.isLong),
      days,
      count,
      allDayRows,
    );
    const timed = layoutTimed(entries, days, zone, MIN_EVENT_MINUTES);
    return { view, nav: buildTimeGridNav(allDay, timed), rows: [], allDay, timed };
  }, [view, entries, days, monthRows, allDayRows, zone]);
  const { nav } = layout;

  // Editing.
  const { ref: announcerRef, announce } = useAnnouncer();
  const canCreate = isEditable && onCreate !== undefined;
  const commit = (entry: CalendarEntry, start: number, end: number) => {
    if (start === entry.start && end === entry.end) {
      return;
    }
    onItemChange?.({ ...entry.item, start: new Date(start), end: new Date(end) });
    announce(
      messages.eventCalendarEventChanged({
        label: entry.item.label,
        time: format.eventTime({ start, end, isAllDay: entry.isAllDay }),
      }),
    );
  };
  const create = (start: number, end: number, isAllDay: boolean) => {
    onCreate?.({ start: new Date(start), end: new Date(end), isAllDay });
  };

  // Roving focus over days and events, and the details and day popovers.
  const gridRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const roving = useRovingKey(gridRef);
  const defaultKey = dayCellKey(Math.max(0, dayIndexOf(days, focusDay)));
  const tabKey =
    roving.activeKey !== null && nav?.targets.has(roving.activeKey) === true
      ? roving.activeKey
      : defaultKey;
  const navRef = useRef<(NavPosition & { key: string }) | null>(null);
  const popoverAnchor = useRef<HTMLElement | null>(null);
  const [openEventId, setOpenEventId] = useState<string | null>(null);
  const [openDay, setOpenDay] = useState<number | null>(null);
  const openDetails = (key: string) => {
    const target = nav?.targets.get(key);
    if (target?.entry) {
      popoverAnchor.current = roving.elementFor(key);
      setOpenEventId(target.entry.id);
    }
  };
  const openDayList = (day: number, button: HTMLElement) => {
    popoverAnchor.current = button;
    setOpenDay(day);
  };
  const openEvent = openEventId === null ? undefined : entryById.get(openEventId);

  // Keyboard: arrows move through days and their events; Alt and the arrows edit the focused event.
  const moveFocus = (row: number, column: number, index: number) => {
    const cell = nav?.cells[row]?.[column];
    if (!cell || cell.length === 0) {
      return;
    }
    const at = clamp(index, 0, cell.length - 1);
    const key = cell[at] ?? '';
    navRef.current = { key, row, column, index: at };
    roving.focusKey(key);
  };
  const editedTimes = (
    target: KeyTarget & { entry: CalendarEntry },
    arrow: number,
    vertical: number,
    isShift: boolean,
  ): MsRange | null => {
    const { entry } = target;
    const length = entry.end - entry.start;
    if (target.mode === 'time') {
      if (isShift) {
        if (vertical === 0) {
          return null;
        }
        const end = stepSnapped(entry.end, vertical > 0 ? 1 : -1, snap, zone);
        return { start: entry.start, end: Math.max(entry.start + snapMs, end) };
      }
      if (vertical !== 0) {
        const start = stepSnapped(entry.start, vertical > 0 ? 1 : -1, snap, zone);
        return { start, end: start + length };
      }
      return arrow === 0
        ? null
        : { start: addDays(entry.start, arrow, zone), end: addDays(entry.end, arrow, zone) };
    }
    if (isShift) {
      return arrow === 0
        ? null
        : {
            start: entry.start,
            end: Math.max(addDays(entry.end, arrow, zone), minimumEnd(entry, zone, snapMs)),
          };
    }
    // In the month, Up and Down move a week.
    const step = arrow !== 0 ? arrow : view === 'month' ? vertical * 7 : 0;
    return step === 0
      ? null
      : { start: addDays(entry.start, step, zone), end: addDays(entry.end, step, zone) };
  };
  const createFromDay = (day: number) => {
    const dayStart = days[day] ?? 0;
    const dayEnd = days[day + 1] ?? dayStart;
    if (view === 'month') {
      create(dayStart, dayEnd, true);
      return;
    }
    // An hour from now today, else from the top of the scrolled view, on the snap grid.
    const topMinute = (scrollRef.current?.scrollTop ?? 0) / PX_PER_MINUTE;
    const { year, month, day: date } = zonedParts(dayStart, zone);
    const from =
      day === todayIndex
        ? snapTime(now ?? Date.now(), snap, zone, 'ceil')
        : snapTime(fromZoned(zone, year, month, date, 0, Math.ceil(topMinute)), snap, zone, 'ceil');
    const start = Math.min(Math.max(from, dayStart), dayEnd - snapMs);
    create(start, start + Math.max(snapMs, 60 * MINUTE_MS), false);
  };
  const onGridFocus = (event: FocusEvent<HTMLDivElement>) => {
    const key = (event.target as HTMLElement).dataset.key;
    if (key === undefined) {
      return;
    }
    roving.setActiveKey(key);
    if (navRef.current?.key !== key) {
      const position = nav?.positions.get(key);
      navRef.current = position ? { key, ...position } : null;
    }
  };
  const onGridKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const key = (event.target as HTMLElement).dataset.key;
    const target = key === undefined ? undefined : nav?.targets.get(key);
    const position =
      key === undefined
        ? undefined
        : navRef.current?.key === key
          ? navRef.current
          : nav?.positions.get(key);
    if (!nav || key === undefined || !target || !position) {
      return;
    }
    const isRtl = isRightToLeft(event.currentTarget);
    const arrow =
      event.key === 'ArrowLeft'
        ? isRtl
          ? 1
          : -1
        : event.key === 'ArrowRight'
          ? isRtl
            ? -1
            : 1
          : 0;
    const vertical = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
    const row = nav.cells[position.row] ?? [];
    let handled = true;
    if (event.altKey) {
      const { entry } = target;
      if (target.kind !== 'event' || !entry || !isEditable) {
        handled = false;
      } else if (entry.item.isLocked === true) {
        announce(messages.scheduleItemLocked({ label: entry.item.label }));
      } else {
        const next = editedTimes({ ...target, entry }, arrow, vertical, event.shiftKey);
        if (next) {
          roving.restoreFocusTo(eventKey(entry.id));
          commit(entry, next.start, next.end);
        } else {
          handled = false;
        }
      }
    } else if (arrow !== 0) {
      // To the same place in the neighbouring day, on into the next or previous week.
      let column = position.column + arrow;
      let rowIndex = position.row;
      if (column < 0) {
        rowIndex -= 1;
        column = (nav.cells[rowIndex]?.length ?? 0) - 1;
      } else if (column >= row.length) {
        rowIndex += 1;
        column = 0;
      }
      moveFocus(rowIndex, column, position.index);
    } else if (vertical !== 0) {
      const cell = row[position.column] ?? [];
      const index = position.index + vertical;
      if (index >= 0 && index < cell.length) {
        moveFocus(position.row, position.column, index);
      } else if (vertical > 0) {
        moveFocus(position.row + 1, position.column, 0);
      } else {
        moveFocus(position.row - 1, position.column, Infinity);
      }
    } else if (event.key === 'Home' || event.key === 'End') {
      moveFocus(position.row, event.key === 'Home' ? 0 : row.length - 1, position.index);
    } else if (event.key === 'Escape' && target.kind === 'event') {
      moveFocus(position.row, position.column, 0);
    } else if ((event.key === 'Enter' || event.key === ' ') && target.kind === 'event') {
      openDetails(key);
    } else if (event.key === 'Enter' && target.kind === 'day' && canCreate) {
      createFromDay(target.day);
    } else {
      handled = false;
    }
    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const rootRef = useMemo(() => mergeRefs(ref, widthRef), [ref, widthRef]);
  const helpId = useId();
  const editHelpId = `${helpId}-edit`;
  const createHelpId = `${helpId}-create`;
  const gridLabel = ariaLabel ?? messages.eventCalendarLabel;
  const viewLabels: Record<EventCalendarView, string> = {
    month: messages.eventCalendarViewMonth,
    week: messages.scheduleViewWeek,
    day: messages.scheduleViewDay,
    agenda: messages.eventCalendarViewAgenda,
  };
  const isTimeGrid = view === 'week' || view === 'day';
  const viewProps: CalendarViewProps = {
    days,
    dayNames,
    todayIndex,
    entryById,
    texts,
    format,
    messages,
    timeZone: zone,
    snapMinutes: snap,
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
    onCommit: commit,
    onCreate: create,
    onOpenDetails: openDetails,
    onOpenDay: openDayList,
    maxHeight,
  };
  const dayListEntries = useMemo(() => {
    if (openDay === null) {
      return [];
    }
    const dayStart = days[openDay] ?? 0;
    const dayEnd = days[openDay + 1] ?? dayStart;
    return entries.filter((entry) => entry.start < dayEnd && entry.end > dayStart);
  }, [openDay, days, entries]);

  return (
    <div
      ref={rootRef}
      className={cn(
        'flex min-w-0 max-w-full flex-col overflow-hidden rounded-card border border-border bg-surface-1',
        className,
      )}
    >
      <ToolbarFrame className="flex-wrap gap-x-3 gap-y-2 border-b border-border p-2">
        {views.length > 1 && (
          <ViewSwitch
            aria-label={messages.scheduleView}
            views={views}
            labels={viewLabels}
            value={view}
            onChange={changeView}
          />
        )}
        <PeriodNav
          onStep={onStep}
          onToday={() => {
            goTo(view, todayStart);
          }}
          messages={messages}
        />
        <MonthYearCyclers
          focused={focusedDate}
          timeZone={zone}
          onMove={(date) => {
            goTo(view, fromZoned(zone, date.year, date.month, date.day));
          }}
        />
        <p
          className={cn('m-0 min-w-0 text-sm font-medium text-fg', !isTimeGrid && 'sr-only')}
          aria-live="polite"
        >
          {isTimeGrid ? format.range(visible.start, visible.end) : format.monthYear(period.start)}
        </p>
      </ToolbarFrame>
      <LiveRegion ref={announcerRef} />
      {isEditable && (
        <span id={editHelpId} className="sr-only">
          {messages.eventCalendarEditHelp}
        </span>
      )}
      {canCreate && (
        <span id={createHelpId} className="sr-only">
          {messages.eventCalendarCreateHelp}
        </span>
      )}
      {layout.view === 'agenda' ? (
        <div
          // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the app's maximum height.
          style={maxHeight === undefined ? undefined : { maxHeight }}
          className="flex min-h-0 flex-col gap-4 overflow-auto p-3"
        >
          {entries.length === 0 ? (
            <p className="m-0 text-sm text-fg-muted">{messages.scheduleLaneEmpty}</p>
          ) : (
            <AgendaDays
              items={entries}
              format={format}
              itemTime={(entry) => texts.get(entry.id)?.time ?? ''}
              rangeStart={visible.start}
              headingLevel={headingLevel}
              messages={messages}
            />
          )}
        </div>
      ) : layout.nav && layout.view === 'month' ? (
        <MonthView
          {...viewProps}
          rows={layout.rows}
          nav={layout.nav}
          period={period}
          maxRows={monthRows}
        />
      ) : layout.nav ? (
        <TimeGridView
          {...viewProps}
          allDay={layout.allDay}
          timed={layout.timed}
          nav={layout.nav}
          allDayRows={allDayRows}
          scrollRef={scrollRef}
          hasNowLine={hasNowLine}
          now={now}
        />
      ) : null}
      {openEvent && (
        <ItemDetails
          triggerRef={popoverAnchor}
          label={openEvent.item.label}
          time={texts.get(openEvent.id)?.time ?? ''}
          isLocked={openEvent.item.isLocked}
          detail={openEvent.item.detail}
          onClose={() => {
            setOpenEventId(null);
          }}
          messages={messages}
        />
      )}
      {openDay !== null && (
        <Popover
          triggerRef={popoverAnchor}
          isOpen
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setOpenDay(null);
            }
          }}
          aria-label={dayNames[openDay] ?? ''}
          placement="bottom start"
        >
          <div className="flex max-h-80 w-72 max-w-full flex-col gap-1 overflow-auto p-1">
            <AgendaDays
              items={dayListEntries}
              format={format}
              itemTime={(entry) => texts.get(entry.id)?.time ?? ''}
              rangeStart={days[openDay] ?? 0}
              headingLevel={headingLevel}
              messages={messages}
            />
          </div>
        </Popover>
      )}
    </div>
  );
}
