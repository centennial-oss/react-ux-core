// ScheduleTimeline: lanes as rows and time as columns, with a sticky lane column and time axis, a now line, conflict
// hatching, drag (and keyboard) moving, resizing and creating, and an agenda list in narrow containers.

import { Lock, TriangleAlert } from 'lucide-react';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type Ref,
} from 'react';
import { useLocale } from 'react-aria-components';
import { useEntryMessages, useTimeZone } from '../../provider/context';
import { cn } from '../../utils/cn';
import { mergeRefs } from '../../utils/mergeRefs';
import { useNow } from '../../utils/timers';
import type { HeadingLevel, Tone } from '../../utils/types';
import { useControllableState } from '../../utils/useControllableState';
import { useElementWidth } from '../../utils/useElementWidth';
import { Popover } from '../Popover/Popover';
import { useTimelineFormat } from './format';
import {
  chooseTickStep,
  findConflicts,
  normalizeItems,
  packRows,
  timeTicks,
  type PlacedItem,
  type TimelineItem,
  type TimelineLane,
  type TimelineRange,
} from './layout';
import { defaultScheduleTimelineMessages } from './messages';
import { TimelineAgenda } from './TimelineAgenda';
import { TimelineToolbar, type TimelineView } from './TimelineToolbar';
import {
  addDays,
  DAY_MS,
  localeFirstDay,
  MINUTE_MS,
  snapTime,
  startOfDay,
  startOfWeek,
  wholeDays,
} from './zone';

export interface ScheduleTimelineProps {
  lanes: readonly TimelineLane[];
  items: readonly TimelineItem[];
  /** The visible range (end exclusive). Controlled; the toolbar's day, week and custom views change it. */
  range?: TimelineRange;
  /** The range at first, uncontrolled. Defaults to today. */
  defaultRange?: TimelineRange;
  onRangeChange?: (range: TimelineRange) => void;
  /** Moving, resizing and creating items by drag, with keyboard alternatives. Defaults to false. */
  isEditable?: boolean;
  /** Called with the item at its new lane and times after a move or resize. */
  onItemChange?: (item: TimelineItem) => void;
  /** Called with a new item's lane and times after dragging on empty space (or Enter on a lane's header). */
  onCreate?: (draft: { laneId: string; start: Date; end: Date }) => void;
  /** Moves, resizes and new items snap to this many minutes. Defaults to 15. */
  snapMinutes?: number;
  /** Highlights overlapping items in a lane with hatching and a warning icon. Defaults to true. */
  shouldShowConflicts?: boolean;
  /** IANA time zone for the axis and times. Defaults to UIProvider's `timeZone`. */
  timeZone?: string;
  /** Draws a line at the current time. Defaults to true. */
  hasNowLine?: boolean;
  /** The current time, instead of the shared clock (for tests, stories and replays). */
  now?: Date | number;
  /** The week's first day for the week view (0 = Sunday). Defaults to the locale's. */
  firstDayOfWeek?: number;
  /** The scroll area's maximum height, such as `32rem`. */
  maxHeight?: string;
  /** The agenda's lane heading level (days are one level below). Defaults to 3. */
  headingLevel?: HeadingLevel;
  /** Names the grid. Defaults to the `scheduleLabel` message. */
  'aria-label'?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

const toneClasses: Record<Tone, string> = {
  neutral: 'border-neutral-border bg-neutral-bg text-neutral-fg',
  accent: 'border-accent-border bg-accent-bg text-accent-fg',
  success: 'border-success-border bg-success-bg text-success-fg',
  warning: 'border-warning-border bg-warning-bg text-warning-fg',
  danger: 'border-danger-border bg-danger-bg text-danger-fg',
};

/** Containers narrower than this show the agenda list. */
const AGENDA_BELOW = 640;
const ITEM_HEIGHT = 30;
const ITEM_GAP = 4;
const LANE_PADDING = 6;
const MIN_LANE_HEIGHT = 44;
/** Pixels a pointer must travel before a press becomes a drag. */
const DRAG_THRESHOLD = 4;

type DragKind = 'move' | 'start' | 'end' | 'create' | 'press';

interface DragState {
  kind: DragKind;
  itemId?: string;
  laneId: string;
  originX: number;
  originY: number;
  /** The item's (or the pressed point's) times when the drag began. */
  start: number;
  end: number;
  pointerType: string;
  hasMoved: boolean;
}

interface Preview {
  kind: DragKind;
  itemId?: string;
  laneId: string;
  start: number;
  end: number;
}

function toMs(value: Date | number): number {
  return value instanceof Date ? value.getTime() : value;
}

/**
 * A schedule of items on lanes (instruments, rooms, channels) over a day, a week or a custom number of days. Lanes
 * are rows and time runs across, with a sticky lane column and time axis and a line at the current time. Items that
 * overlap in a lane are stacked, hatched and marked. With `isEditable`, items move and resize by drag or with Alt
 * and the arrow keys, snapping to `snapMinutes`, and dragging on empty space creates one. The lanes and items form a
 * keyboard-navigable grid; narrow containers (phones) show an agenda grouped by lane and day instead.
 */
export function ScheduleTimeline({
  lanes,
  items,
  range: rangeProp,
  defaultRange,
  onRangeChange,
  isEditable = false,
  onItemChange,
  onCreate,
  snapMinutes = 15,
  shouldShowConflicts = true,
  timeZone,
  hasNowLine = true,
  now: nowProp,
  firstDayOfWeek,
  maxHeight,
  headingLevel = 3,
  'aria-label': ariaLabel,
  className,
  ref,
}: ScheduleTimelineProps) {
  const messages = useEntryMessages(defaultScheduleTimelineMessages);
  const { locale } = useLocale();
  const defaultTimeZone = useTimeZone();
  const zone = timeZone ?? defaultTimeZone;
  const clockNow = useNow();
  const nowMs = nowProp === undefined ? clockNow : toMs(nowProp);
  const firstDay = firstDayOfWeek ?? localeFirstDay(locale);
  const snap = Math.max(1, snapMinutes);
  const snapMs = snap * MINUTE_MS;

  const [range, setRange] = useControllableState<TimelineRange>(
    rangeProp,
    defaultRange ?? {
      start: new Date(startOfDay(nowMs, zone)),
      end: new Date(addDays(startOfDay(nowMs, zone), 1, zone)),
    },
    onRangeChange,
  );
  const rangeStart = range.start.getTime();
  const rangeEnd = Math.max(range.end.getTime(), rangeStart + MINUTE_MS);
  const rangeMinutes = (rangeEnd - rangeStart) / MINUTE_MS;
  const isMultiDay = rangeEnd - rangeStart > DAY_MS + 2 * 3_600_000;
  const format = useTimelineFormat(locale, zone, isMultiDay, messages);

  // The view the toolbar shows: day and week when the range is exactly one, custom otherwise (or when chosen).
  const days = wholeDays(rangeStart, rangeEnd, zone);
  const [isCustomChosen, setCustomChosen] = useState(false);
  const detectedView: TimelineView =
    days === 1 && rangeStart === startOfDay(rangeStart, zone)
      ? 'day'
      : days === 7 && rangeStart === startOfWeek(rangeStart, zone, firstDay)
        ? 'week'
        : 'custom';
  const view = isCustomChosen ? 'custom' : detectedView;
  const customDays = days ?? Math.max(1, Math.round((rangeEnd - rangeStart) / DAY_MS));
  const anchor = nowMs >= rangeStart && nowMs < rangeEnd ? nowMs : rangeStart;
  const changeRange = (start: number, end: number) => {
    setRange({ start: new Date(start), end: new Date(end) });
  };
  const onViewChange = (next: TimelineView) => {
    setCustomChosen(next === 'custom');
    if (next === 'day') {
      const start = startOfDay(anchor, zone);
      changeRange(start, addDays(start, 1, zone));
    } else if (next === 'week') {
      const start = startOfWeek(anchor, zone, firstDay);
      changeRange(start, addDays(start, 7, zone));
    } else {
      const start = startOfDay(rangeStart, zone);
      changeRange(start, addDays(start, customDays === 1 ? 3 : customDays, zone));
    }
  };
  const onStep = (direction: -1 | 1) => {
    if (days === null) {
      const length = rangeEnd - rangeStart;
      changeRange(rangeStart + direction * length, rangeEnd + direction * length);
    } else {
      changeRange(
        addDays(rangeStart, direction * days, zone),
        addDays(rangeEnd, direction * days, zone),
      );
    }
  };
  const onToday = () => {
    const start = view === 'week' ? startOfWeek(nowMs, zone, firstDay) : startOfDay(nowMs, zone);
    changeRange(start, addDays(start, view === 'day' ? 1 : view === 'week' ? 7 : customDays, zone));
  };

  // Items in the range, conflicts, and stacked rows per lane.
  const placed = useMemo(() => {
    const list = normalizeItems(items, rangeStart, rangeEnd);
    const rowCounts = packRows(list);
    return { list, rowCounts };
  }, [items, rangeStart, rangeEnd]);
  const conflicts = useMemo(
    () => (shouldShowConflicts ? findConflicts(placed.list) : new Map<string, string[]>()),
    [placed, shouldShowConflicts],
  );
  const laneItems = useMemo(() => {
    const map = new Map<string, PlacedItem[]>();
    for (const item of placed.list) {
      const list = map.get(item.laneId) ?? [];
      list.push(item);
      map.set(item.laneId, list);
    }
    return map;
  }, [placed]);
  const itemById = useMemo(() => new Map(placed.list.map((item) => [item.id, item])), [placed]);
  const laneById = useMemo(() => new Map(lanes.map((lane) => [lane.id, lane])), [lanes]);
  const listFormat = useMemo(
    () => new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }),
    [locale],
  );
  const conflictText = (id: string) => {
    const others = conflicts.get(id);
    return others
      ? listFormat.format(others.map((other) => itemById.get(other)?.item.label ?? other))
      : '';
  };
  const itemName = (item: PlacedItem) =>
    messages.scheduleItem({
      lane: laneById.get(item.laneId)?.label ?? item.laneId,
      label: item.item.label,
      time: format.itemTime(item.start, item.end),
      conflicts: conflictText(item.id),
      isLocked: item.item.isLocked === true,
    });

  // Geometry: fit the range to the width, down to a readable minimum, then scroll sideways.
  const [widthRef, width] = useElementWidth();
  const isAgenda = width !== undefined && width < AGENDA_BELOW;
  const laneHeaderWidth = (width ?? 1024) < 900 ? 128 : 176;
  const minPxPerHour = rangeMinutes <= 1500 ? 48 : rangeMinutes <= 4 * 1440 ? 24 : 18;
  const pxPerMinute = Math.max(
    minPxPerHour / 60,
    ((width ?? 1024) - laneHeaderWidth - 2) / rangeMinutes,
  );
  const trackWidth = Math.round(rangeMinutes * pxPerMinute);
  const xOf = (ms: number) => ((ms - rangeStart) / MINUTE_MS) * pxPerMinute;

  const laneLayouts = useMemo(() => {
    const heights = lanes.map((lane) => {
      const rows = placed.rowCounts.get(lane.id) ?? 1;
      return Math.max(
        MIN_LANE_HEIGHT,
        LANE_PADDING * 2 + rows * ITEM_HEIGHT + (rows - 1) * ITEM_GAP,
      );
    });
    return lanes.map((lane, index) => ({
      lane,
      top: heights.slice(0, index).reduce((total, height) => total + height, 0),
      height: heights[index] ?? MIN_LANE_HEIGHT,
    }));
  }, [lanes, placed]);
  const bodyHeight = laneLayouts.reduce((total, layout) => total + layout.height, 0);

  // Axis ticks: labelled ticks, finer gridlines, and day boundaries for multi-day ranges.
  const labelStep = chooseTickStep(pxPerMinute, isMultiDay ? 44 : 56);
  const ticks = useMemo(
    () => timeTicks(rangeStart, rangeEnd, labelStep, zone),
    [rangeStart, rangeEnd, labelStep, zone],
  );
  const dayStarts = useMemo(
    () => (isMultiDay ? timeTicks(rangeStart, rangeEnd, 1440, zone) : []),
    [isMultiDay, rangeStart, rangeEnd, zone],
  );
  const showsHourLabels = !isMultiDay || labelStep < 1440;
  const headerHeight = isMultiDay && showsHourLabels ? 48 : 28;

  // Roving focus across lane headers and items.
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const firstItem = placed.list.find((item) => laneById.has(item.laneId));
  const firstKey = firstItem ? `item:${firstItem.id}` : lanes[0] ? `lane:${lanes[0].id}` : null;
  const isKeyPresent = (key: string | null) =>
    key !== null &&
    (key.startsWith('item:') ? itemById.has(key.slice(5)) : laneById.has(key.slice(5)));
  const tabKey = isKeyPresent(activeKey) ? activeKey : firstKey;

  const gridRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<string | null>(null);
  const focusKey = (key: string) => {
    setActiveKey(key);
    gridRef.current?.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`)?.focus();
  };
  // After a keyboard move to another lane the item re-renders in a new row; put focus back on it.
  useEffect(() => {
    const key = restoreFocusTo.current;
    if (key === null) {
      return;
    }
    const element = gridRef.current?.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`);
    if (element) {
      restoreFocusTo.current = null;
      if (document.activeElement !== element) {
        element.focus();
      }
    }
  });

  const [announcement, setAnnouncement] = useState('');
  const commit = (item: PlacedItem, laneId: string, start: number, end: number) => {
    if (laneId === item.laneId && start === item.start && end === item.end) {
      return;
    }
    onItemChange?.({ ...item.item, laneId, start: new Date(start), end: new Date(end) });
    setAnnouncement(
      messages.scheduleItemChanged({
        label: item.item.label,
        lane: laneById.get(laneId)?.label ?? laneId,
        time: format.itemTime(start, end),
      }),
    );
  };
  const create = (laneId: string, start: number, end: number) => {
    onCreate?.({ laneId, start: new Date(start), end: new Date(end) });
  };
  const canCreate = isEditable && onCreate !== undefined;

  // Details popover for an item (click, tap, Enter or Space).
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const popoverAnchor = useRef<HTMLElement | null>(null);
  const openDetails = (id: string) => {
    popoverAnchor.current =
      gridRef.current?.querySelector<HTMLElement>(`[data-key="${CSS.escape(`item:${id}`)}"]`) ??
      null;
    setOpenItemId(id);
  };
  const openItem = openItemId === null ? undefined : itemById.get(openItemId);

  // Keyboard: arrows move between cells; Alt+arrows move an item, Alt+Shift+Left/Right resize it.
  const laneIndex = (laneId: string) => lanes.findIndex((lane) => lane.id === laneId);
  const nearestIn = (laneId: string, time: number) => {
    const list = laneItems.get(laneId) ?? [];
    let best: PlacedItem | undefined;
    for (const item of list) {
      if (!best || Math.abs(item.start - time) < Math.abs(best.start - time)) {
        best = item;
      }
    }
    return best;
  };
  const onGridKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const key = target.dataset.key;
    if (key === undefined) {
      return;
    }
    const isItem = key.startsWith('item:');
    const id = key.slice(5);
    const item = isItem ? itemById.get(id) : undefined;
    const laneId = item ? item.laneId : id;
    const index = laneIndex(laneId);
    const list = laneItems.get(laneId) ?? [];
    const position = item ? list.indexOf(item) : -1;
    const isRtl = getComputedStyle(target).direction === 'rtl';
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
    let handled = true;

    if (event.altKey && item) {
      if (!isEditable) {
        handled = false;
      } else if (item.item.isLocked) {
        setAnnouncement(messages.scheduleItemLocked({ label: item.item.label }));
      } else if (event.shiftKey && arrow !== 0) {
        const end =
          arrow > 0
            ? snapTime(item.end, snap, zone, 'floor') + snapMs
            : Math.max(item.start + snapMs, snapTime(item.end, snap, zone, 'ceil') - snapMs);
        restoreFocusTo.current = key;
        commit(item, item.laneId, item.start, end);
      } else if (arrow !== 0) {
        const start =
          arrow > 0
            ? snapTime(item.start, snap, zone, 'floor') + snapMs
            : snapTime(item.start, snap, zone, 'ceil') - snapMs;
        restoreFocusTo.current = key;
        commit(item, item.laneId, start, start + (item.end - item.start));
      } else if (vertical !== 0) {
        const lane = lanes[index + vertical];
        if (lane) {
          restoreFocusTo.current = key;
          commit(item, lane.id, item.start, item.end);
        }
      } else {
        handled = false;
      }
    } else if (event.altKey) {
      handled = false;
    } else if (arrow !== 0) {
      if (item) {
        const next = list[position + arrow];
        if (next) {
          focusKey(`item:${next.id}`);
        } else if (arrow < 0) {
          focusKey(`lane:${laneId}`);
        }
      } else if (arrow > 0 && list[0]) {
        focusKey(`item:${list[0].id}`);
      }
    } else if (vertical !== 0) {
      const lane = lanes[index + vertical];
      if (lane) {
        const target = item ? nearestIn(lane.id, item.start) : undefined;
        focusKey(target ? `item:${target.id}` : `lane:${lane.id}`);
      }
    } else if (event.key === 'Home') {
      const lane = event.ctrlKey ? lanes[0] : laneById.get(laneId);
      if (lane) {
        focusKey(`lane:${lane.id}`);
      }
    } else if (event.key === 'End') {
      const lane = event.ctrlKey ? lanes.at(-1) : laneById.get(laneId);
      const last = lane ? (laneItems.get(lane.id) ?? []).at(-1) : undefined;
      if (last) {
        focusKey(`item:${last.id}`);
      } else if (lane) {
        focusKey(`lane:${lane.id}`);
      }
    } else if ((event.key === 'Enter' || event.key === ' ') && item) {
      openDetails(item.id);
    } else if (event.key === 'Enter' && !item && canCreate) {
      const from = nowMs >= rangeStart && nowMs < rangeEnd ? nowMs : rangeStart;
      const start = snapTime(from, snap, zone, 'ceil');
      create(laneId, start, start + Math.max(snapMs, 60 * MINUTE_MS));
    } else {
      handled = false;
    }
    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  // Pointer dragging: move, resize from either edge, or create on empty space.
  const dragRef = useRef<DragState | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const timeAt = (clientX: number) => {
    const rect = rowsRef.current?.getBoundingClientRect();
    const x = clientX - (rect?.left ?? 0) - laneHeaderWidth;
    return rangeStart + (x / pxPerMinute) * MINUTE_MS;
  };
  const laneAt = (clientY: number) => {
    const rect = rowsRef.current?.getBoundingClientRect();
    const y = clientY - (rect?.top ?? 0);
    const layout =
      laneLayouts.find((candidate) => y < candidate.top + candidate.height) ?? laneLayouts.at(-1);
    return layout?.lane.id;
  };
  const dragResult = (drag: DragState, clientX: number, clientY: number): Preview => {
    const deltaMs = ((clientX - drag.originX) / pxPerMinute) * MINUTE_MS;
    const isRtl = rowsRef.current ? getComputedStyle(rowsRef.current).direction === 'rtl' : false;
    const delta = isRtl ? -deltaMs : deltaMs;
    const duration = drag.end - drag.start;
    switch (drag.kind) {
      case 'move': {
        const start = snapTime(drag.start + delta, snap, zone);
        return {
          kind: drag.kind,
          itemId: drag.itemId,
          laneId: laneAt(clientY) ?? drag.laneId,
          start,
          end: start + duration,
        };
      }
      case 'start': {
        const start = Math.min(drag.end - snapMs, snapTime(drag.start + delta, snap, zone));
        return { ...drag, start, end: drag.end };
      }
      case 'end': {
        const end = Math.max(drag.start + snapMs, snapTime(drag.end + delta, snap, zone));
        return { ...drag, start: drag.start, end };
      }
      default: {
        const anchorTime = snapTime(drag.start, snap, zone, 'floor');
        const current = Math.min(
          rangeEnd,
          Math.max(rangeStart, snapTime(drag.start + delta, snap, zone)),
        );
        const start = Math.min(anchorTime, current);
        const end = Math.max(anchorTime, current);
        return { ...drag, start, end: end === start ? start + snapMs : end };
      }
    }
  };
  const beginDrag = (event: PointerEvent<HTMLElement>, state: Omit<DragState, 'hasMoved'>) => {
    if (event.button !== 0) {
      return;
    }
    dragRef.current = { ...state, hasMoved: false };
    if (state.kind !== 'press') {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // The pointer is already gone (or synthetic); the drag still follows events on this element.
      }
    }
  };
  const onDragMove = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.kind === 'press') {
      return;
    }
    if (
      !drag.hasMoved &&
      Math.hypot(event.clientX - drag.originX, event.clientY - drag.originY) < DRAG_THRESHOLD
    ) {
      return;
    }
    drag.hasMoved = true;
    setPreview(dragResult(drag, event.clientX, event.clientY));
  };
  const onDragEnd = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    setPreview(null);
    if (!drag) {
      return;
    }
    if (drag.hasMoved && drag.kind !== 'press') {
      const result = dragResult(drag, event.clientX, event.clientY);
      const item = drag.itemId === undefined ? undefined : itemById.get(drag.itemId);
      if (drag.kind === 'create') {
        create(result.laneId, result.start, result.end);
      } else if (item) {
        commit(item, result.laneId, result.start, result.end);
      }
    } else if (drag.itemId !== undefined) {
      openDetails(drag.itemId);
    } else if (drag.kind === 'create' && drag.pointerType === 'touch') {
      // Touch panning needs the track, so a tap (not a drag) creates an hour-long item there.
      const start = snapTime(drag.start, snap, zone, 'floor');
      create(drag.laneId, start, start + Math.max(snapMs, 60 * MINUTE_MS));
    }
  };
  const onDragCancel = () => {
    dragRef.current = null;
    setPreview(null);
  };

  // Start scrolled to now (or the first item) whenever the range changes.
  const hasWidth = width !== undefined;
  const scrollTarget =
    nowMs >= rangeStart && nowMs < rangeEnd ? nowMs : (placed.list[0]?.start ?? rangeStart);
  const scrollTargetRef = useRef(scrollTarget);
  useLayoutEffect(() => {
    scrollTargetRef.current = scrollTarget;
  });
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element || !hasWidth || isAgenda) {
      return;
    }
    const visible = element.clientWidth - laneHeaderWidth;
    const x = ((scrollTargetRef.current - rangeStart) / MINUTE_MS) * pxPerMinute;
    element.scrollLeft = Math.max(0, x - visible / 4);
    // Only when the range (or layout mode) changes, not as the clock ticks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeStart, rangeEnd, hasWidth, isAgenda]);

  const gridId = useId();
  const editHelpId = `${gridId}-edit`;
  const createHelpId = `${gridId}-create`;
  const nowX = hasNowLine && nowMs >= rangeStart && nowMs < rangeEnd ? xOf(nowMs) : null;
  const previewLayout = preview
    ? laneLayouts.find((layout) => layout.lane.id === preview.laneId)
    : undefined;

  const toolbar = (
    <TimelineToolbar
      view={view}
      onViewChange={onViewChange}
      days={customDays}
      onDaysChange={(count) => {
        changeRange(rangeStart, addDays(rangeStart, count, zone));
      }}
      onStep={onStep}
      onToday={onToday}
      rangeLabel={format.range(rangeStart, rangeEnd)}
      messages={messages}
    />
  );

  return (
    <div
      ref={mergeRefs(ref, widthRef)}
      className={cn(
        'flex min-w-0 max-w-full flex-col overflow-hidden rounded-card border border-border bg-surface-1',
        className,
      )}
    >
      {toolbar}
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
      {isAgenda ? (
        <TimelineAgenda
          lanes={lanes}
          laneItems={laneItems}
          conflictText={conflictText}
          format={format}
          rangeStart={rangeStart}
          headingLevel={headingLevel}
          messages={messages}
        />
      ) : hasWidth ? (
        <div
          ref={scrollRef}
          // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the app's maximum height.
          style={maxHeight === undefined ? undefined : { maxHeight }}
          className="relative min-h-0 overflow-auto"
        >
          <span id={editHelpId} className="sr-only">
            {messages.scheduleEditHelp}
          </span>
          <span id={createHelpId} className="sr-only">
            {messages.scheduleCreateHelp}
          </span>
          {/* Focus moves through the lane headers and items (a roving tabindex), not the grid itself. */}
          {/* eslint-disable-next-line jsx-a11y/interactive-supports-focus -- see above. */}
          <div
            ref={gridRef}
            role="grid"
            aria-label={ariaLabel ?? messages.scheduleLabel}
            aria-rowcount={lanes.length + 1}
            onKeyDown={onGridKeyDown}
            onFocus={(event) => {
              const key = (event.target as HTMLElement).dataset.key;
              if (key !== undefined) {
                setActiveKey(key);
              }
            }}
            // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the lane column plus the time track.
            style={{ width: laneHeaderWidth + trackWidth }}
            className="relative text-sm"
          >
            {/* Time axis */}
            <div
              role="row"
              aria-rowindex={1}
              className="sticky top-0 z-[3] flex border-b border-border bg-surface-2"
            >
              <div
                role="columnheader"
                // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the lane column's width.
                style={{ width: laneHeaderWidth, height: headerHeight }}
                className="sticky start-0 z-[4] flex shrink-0 items-end border-e border-border bg-surface-2 px-3 pb-1 text-xs font-semibold text-fg-muted"
              >
                {messages.scheduleLanes}
              </div>
              <div
                role="columnheader"
                // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the time track's width.
                style={{ width: trackWidth, height: headerHeight }}
                className="relative shrink-0 text-xs text-fg-muted"
              >
                <span className="sr-only">{messages.scheduleTimeAxis}</span>
                <div aria-hidden="true">
                  {dayStarts.map((tick) => (
                    <span
                      key={`day-${String(tick)}`}
                      // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the day's position.
                      style={{ insetInlineStart: xOf(tick) }}
                      className="absolute top-1 border-s border-border-strong ps-1 font-semibold whitespace-nowrap text-fg"
                    >
                      {format.shortDay(tick)}
                    </span>
                  ))}
                  {showsHourLabels &&
                    ticks.map((tick) => (
                      <span
                        key={tick}
                        // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the tick's position.
                        style={{ insetInlineStart: xOf(tick) }}
                        className="absolute bottom-1 ps-1 whitespace-nowrap tabular-nums"
                      >
                        {format.tick(tick)}
                      </span>
                    ))}
                  {nowX !== null && (
                    <span
                      // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: now's position.
                      style={{ insetInlineStart: nowX }}
                      className="absolute bottom-0 h-2 w-0.5 -translate-x-1/2 bg-danger-solid rtl:translate-x-1/2"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Lanes */}
            <div
              ref={rowsRef}
              // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the stacked lanes' height.
              style={{ height: bodyHeight }}
              className="relative"
            >
              {/* Gridlines and the now line, behind the items */}
              <div
                aria-hidden="true"
                // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: starts after the lane column.
                style={{ insetInlineStart: laneHeaderWidth, width: trackWidth }}
                className="pointer-events-none absolute inset-y-0"
              >
                {ticks.map((tick) => (
                  <span
                    key={tick}
                    // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the gridline's position.
                    style={{ insetInlineStart: xOf(tick) }}
                    className="absolute inset-y-0 border-s border-border"
                  />
                ))}
                {dayStarts.map((tick) => (
                  <span
                    key={`day-${String(tick)}`}
                    // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the day boundary's position.
                    style={{ insetInlineStart: xOf(tick) }}
                    className="absolute inset-y-0 border-s border-border-strong"
                  />
                ))}
              </div>

              {laneLayouts.map(({ lane, top, height }, laneIndexValue) => {
                const laneKey = `lane:${lane.id}`;
                const itemsInLane = laneItems.get(lane.id) ?? [];
                return (
                  <div
                    key={lane.id}
                    role="row"
                    aria-rowindex={laneIndexValue + 2}
                    data-lane-id={lane.id}
                    // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the lane's position and height.
                    style={{ top, height }}
                    className="absolute inset-x-0 flex border-b border-border"
                  >
                    <div
                      role="rowheader"
                      data-key={laneKey}
                      tabIndex={tabKey === laneKey ? 0 : -1}
                      aria-describedby={canCreate ? createHelpId : undefined}
                      // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the lane column's width.
                      style={{ width: laneHeaderWidth }}
                      className="sticky start-0 z-[2] flex shrink-0 scroll-ms-0 flex-col justify-center border-e border-border bg-surface-1 px-3 outline-none focus-visible:focus-ring focus-visible:-outline-offset-2"
                    >
                      <span className="truncate font-medium text-fg">{lane.label}</span>
                      {lane.description !== undefined && (
                        <span className="truncate text-xs text-fg-muted">{lane.description}</span>
                      )}
                    </div>
                    <div
                      // Dragging on empty space creates an item (mouse and pen; a tap on touch).
                      onPointerDown={
                        canCreate
                          ? (event) => {
                              if (event.target !== event.currentTarget) {
                                return;
                              }
                              beginDrag(event, {
                                kind: 'create',
                                laneId: lane.id,
                                originX: event.clientX,
                                originY: event.clientY,
                                start: timeAt(event.clientX),
                                end: timeAt(event.clientX),
                                pointerType: event.pointerType,
                              });
                            }
                          : undefined
                      }
                      onPointerMove={canCreate ? onDragMove : undefined}
                      onPointerUp={canCreate ? onDragEnd : undefined}
                      onPointerCancel={canCreate ? onDragCancel : undefined}
                      // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the time track's width.
                      style={{ width: trackWidth }}
                      className={cn('relative shrink-0', canCreate && 'cursor-crosshair')}
                    >
                      {itemsInLane.map((item) => {
                        const key = `item:${item.id}`;
                        const left = Math.max(0, xOf(item.start));
                        const right = Math.min(trackWidth, xOf(item.end));
                        const itemWidth = Math.max(6, right - left);
                        const hasConflict = conflicts.has(item.id);
                        const isLocked = item.item.isLocked === true;
                        const canDrag = isEditable && !isLocked;
                        const isDragged = preview?.itemId === item.id;
                        return (
                          <div
                            key={item.id}
                            role="gridcell"
                            data-key={key}
                            data-conflict={hasConflict || undefined}
                            tabIndex={tabKey === key ? 0 : -1}
                            aria-label={itemName(item)}
                            aria-describedby={canDrag ? editHelpId : undefined}
                            aria-readonly={!canDrag || undefined}
                            aria-haspopup="dialog"
                            onPointerDown={(event) => {
                              const handle = (event.target as HTMLElement).closest<HTMLElement>(
                                '[data-handle]',
                              )?.dataset.handle;
                              beginDrag(event, {
                                kind: !canDrag
                                  ? 'press'
                                  : handle === 'start'
                                    ? 'start'
                                    : handle === 'end'
                                      ? 'end'
                                      : 'move',
                                itemId: item.id,
                                laneId: item.laneId,
                                originX: event.clientX,
                                originY: event.clientY,
                                start: item.start,
                                end: item.end,
                                pointerType: event.pointerType,
                              });
                            }}
                            onPointerMove={onDragMove}
                            onPointerUp={onDragEnd}
                            onPointerCancel={onDragCancel}
                            // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the item's place in the lane.
                            style={{
                              insetInlineStart: left,
                              width: itemWidth,
                              top: LANE_PADDING + item.row * (ITEM_HEIGHT + ITEM_GAP),
                              height: ITEM_HEIGHT,
                            }}
                            className={cn(
                              'absolute flex scroll-ms-48 scroll-mt-14 items-center gap-1 overflow-hidden rounded-control border px-1.5 text-xs select-none outline-none',
                              'focus-visible:z-[1] focus-visible:focus-ring',
                              toneClasses[item.item.tone ?? 'accent'],
                              hasConflict && 'border-2 border-warning-border',
                              canDrag ? 'cursor-grab touch-none' : 'cursor-pointer',
                              isDragged && 'opacity-50',
                            )}
                          >
                            {hasConflict && (
                              <span
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(135deg,var(--color-warning-border)_0_2px,transparent_2px_8px)] opacity-60"
                              />
                            )}
                            {hasConflict && (
                              <TriangleAlert
                                aria-hidden="true"
                                className="relative size-3.5 shrink-0 text-warning-fg"
                              />
                            )}
                            {isLocked && (
                              <Lock aria-hidden="true" className="relative size-3 shrink-0" />
                            )}
                            <span className="relative truncate font-medium">{item.item.label}</span>
                            {itemWidth >= 150 && (
                              <span className="relative ms-auto shrink-0 truncate opacity-80 tabular-nums">
                                {format.time(item.start)}
                              </span>
                            )}
                            {canDrag && (
                              <>
                                <span
                                  aria-hidden="true"
                                  data-handle="start"
                                  className="absolute inset-y-0 start-0 w-2 cursor-ew-resize"
                                />
                                <span
                                  aria-hidden="true"
                                  data-handle="end"
                                  className="absolute inset-y-0 end-0 w-2 cursor-ew-resize"
                                />
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Drag preview and the now line, above the lanes */}
              <div
                aria-hidden="true"
                // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: starts after the lane column.
                style={{ insetInlineStart: laneHeaderWidth, width: trackWidth }}
                className="pointer-events-none absolute inset-y-0"
              >
                {nowX !== null && (
                  <span
                    data-now-line=""
                    // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: now's position.
                    style={{ insetInlineStart: nowX }}
                    className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-danger-solid rtl:translate-x-1/2"
                  />
                )}
                {preview && previewLayout && (
                  <span
                    data-preview=""
                    // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: where the drag would land.
                    style={{
                      insetInlineStart: Math.max(0, xOf(preview.start)),
                      width: Math.max(
                        6,
                        Math.min(trackWidth, xOf(preview.end)) - Math.max(0, xOf(preview.start)),
                      ),
                      top: previewLayout.top + LANE_PADDING,
                      height: ITEM_HEIGHT,
                    }}
                    className="absolute flex items-center gap-1 overflow-hidden rounded-control border-2 border-dashed border-accent-border bg-accent-bg px-1.5 text-xs whitespace-nowrap text-accent-fg"
                  >
                    <span className="truncate font-medium">
                      {preview.kind === 'create'
                        ? messages.scheduleNewItem
                        : (itemById.get(preview.itemId ?? '')?.item.label ?? '')}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {format.itemTime(preview.start, preview.end)}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {openItem && (
        <Popover
          triggerRef={popoverAnchor}
          isOpen
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setOpenItemId(null);
            }
          }}
          aria-label={openItem.item.label}
          placement="bottom start"
        >
          <div className="flex max-w-xs flex-col gap-1 p-1 text-sm">
            <p className="m-0 font-semibold text-fg">{openItem.item.label}</p>
            <p className="m-0 text-fg-muted">
              {laneById.get(openItem.laneId)?.label ?? openItem.laneId}
            </p>
            <p className="m-0 text-fg-muted tabular-nums">
              {format.itemTime(openItem.start, openItem.end)}
            </p>
            {conflicts.has(openItem.id) && (
              <p className="m-0 flex items-center gap-1 text-warning-fg">
                <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
                {messages.scheduleConflictsWith({ items: conflictText(openItem.id) })}
              </p>
            )}
            {openItem.item.isLocked && (
              <p className="m-0 flex items-center gap-1 text-fg-muted">
                <Lock aria-hidden="true" className="size-4 shrink-0" />
                {messages.scheduleLocked}
              </p>
            )}
            {openItem.item.detail !== undefined && (
              <div className="text-fg">{openItem.item.detail}</div>
            )}
          </div>
        </Popover>
      )}
    </div>
  );
}
