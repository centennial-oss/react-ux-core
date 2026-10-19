// GanttChart: a task grid (a tree of tasks) beside a timeline of their bars, in a resizable SplitView, sharing rows
// and vertical scroll. Both are virtualized (only the rows in view render), so thousands of tasks stay quick. Bars
// move, resize and set progress by drag or keyboard, snapping to the scale; dependencies are drawn as arrows, made by
// dragging from a bar's end (or from a task's details), and broken ones are highlighted. The app applies changes.
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
  type UIEvent,
} from 'react';
import { useLocale } from 'react-aria-components';
import { ganttStrings } from '../../provider/coreStrings';
import { useEntryMessages, useTimeZone } from '../../provider/context';
import { cn } from '../../utils/cn';
import { toggleInSet } from '../../utils/collections';
import { isRightToLeft } from '../../utils/direction';
import { useListFormat } from '../../utils/intl';
import { clamp } from '../../utils/math';
import { scrollSpanIntoView } from '../../utils/scroll';
import { toEpochMs } from '../../utils/time';
import { useNow } from '../../utils/timers';
import { useControllableState } from '../../utils/useControllableState';
import { useElementWidth } from '../../utils/useElementWidth';
import { useLatest } from '../../utils/useLatest';
import { useIsPhone, useMediaQuery } from '../../utils/useMediaQuery';
import { usePointerDrag, type PointerDrag } from '../../utils/usePointerDrag';
import { useResizeMeasure } from '../../utils/useResizeMeasure';
import { useStableCallback } from '../../utils/useStableCallback';
import { fixedSizeWindow } from '../../utils/virtualWindow';
import { EmptyState } from '../EmptyState/EmptyState';
import { LiveRegion, useAnnouncer } from '../LiveRegion/LiveRegion';
import { Popover } from '../Popover/Popover';
import type { TimelineRange } from '../ScheduleTimeline/layout';
import { editTimes } from '../ScheduleTimeline/timeEdit';
import { localeFirstDay, MINUTE_MS, startOfDay } from '../ScheduleTimeline/zone';
import { SplitView } from '../SplitView/SplitView';
import { useGanttFormat } from './format';
import { GanttDetails } from './GanttDetails';
import { COLUMN_WIDTHS, GanttGrid, NAME_MIN_WIDTH, TIMED_COLUMN_WIDTH } from './GanttGrid';
import { GanttTimeline, type BarHandlers, type DragPreview, type TimeScale } from './GanttTimeline';
import { GanttToolbar } from './GanttToolbar';
import { barBox, dependencyTypeFor, type BarEnd } from './geometry';
import {
  addUnits,
  defaultRange,
  nonWorkingSpans,
  pxPerMsAt,
  stepTime,
  unitTicks,
  ZOOM_SCALES,
  type GanttWorkingHours,
} from './scale';
import {
  buildModel,
  criticalPath,
  isDated,
  placeDependencies,
  visibleRows,
  type PlacedDependency,
  type TaskNode,
} from './schedule';
import type {
  GanttColumn,
  GanttDependency,
  GanttDependencyDraft,
  GanttDependencyType,
  GanttTask,
  GanttZoom,
} from './types';

export interface GanttChartProps {
  /** The tasks, as a flat list: `parentId` nests a task under a summary task. */
  tasks: readonly GanttTask[];
  /** The dependencies between tasks, drawn as arrows. */
  dependencies?: readonly GanttDependency[];
  /** What a column of the time scale is, from hours to quarters. Controlled; the toolbar changes it. */
  zoom?: GanttZoom;
  /** The zoom at first, uncontrolled. Defaults to `day`. */
  defaultZoom?: GanttZoom;
  onZoomChange?: (zoom: GanttZoom) => void;
  /** The span the timeline covers (end exclusive). Defaults to the tasks' dates with some room either side. */
  range?: TimelineRange;
  /**
   * Moving, resizing and setting progress by drag, with keyboard alternatives, and making dependencies by dragging
   * from a bar's end or from a task's details. Defaults to false.
   */
  isEditable?: boolean;
  /** Called with the task at its new dates and progress after a move, resize or progress change. */
  onTaskChange?: (task: GanttTask) => void;
  /** Called with a dependency the user drew. Without it, dependencies can't be made. */
  onDependencyCreate?: (draft: GanttDependencyDraft) => void;
  /** Called with the id of a dependency removed from a task's details. Without it, they can't be removed. */
  onDependencyDelete?: (id: string) => void;
  /** Moves and resizes snap to this many minutes. Defaults to 15 at the hour zoom and a day otherwise. */
  snapMinutes?: number;
  /** Highlights the critical path: the tasks that can't slip without delaying the end. Defaults to false. */
  hasCriticalPath?: boolean;
  /** The task grid's columns after the names, in order; they show while they fit. Defaults to all four. */
  columns?: readonly GanttColumn[];
  /** The expanded summary tasks' ids. Controlled; see `defaultExpandedIds`. */
  expandedIds?: Iterable<string>;
  /** Defaults to every summary task. */
  defaultExpandedIds?: Iterable<string>;
  onExpandedChange?: (ids: Set<string>) => void;
  /** The task grid's and the timeline's widths in percent (SplitView's). Controlled; see `defaultSizes`. */
  sizes?: readonly number[];
  /** Defaults to 35 and 65 (45 and 55 on phones). */
  defaultSizes?: readonly number[];
  onSizesChange?: (sizes: number[]) => void;
  /** The working days of the week (0 = Sunday); the others are shaded. Defaults to Monday to Friday. */
  workingDays?: readonly number[];
  /** The working hours, shaded outside at the hour zoom. Defaults to 9 to 17. */
  workingHours?: GanttWorkingHours;
  /** IANA time zone for the scale and dates. Defaults to UIProvider's `timeZone`. */
  timeZone?: string;
  /** Draws a line at the current time (the today line). Defaults to true. */
  hasNowLine?: boolean;
  /** The current time, instead of the shared clock (for tests, stories and replays). */
  now?: Date | number;
  /** The week's first day for the week columns (0 = Sunday). Defaults to the locale's. */
  firstDayOfWeek?: number;
  /** The scroll area's maximum height, such as `32rem`. Defaults to `32rem`. */
  maxHeight?: string;
  /** Shown instead of the chart when there are no tasks. */
  emptyState?: ReactNode;
  /** Names the chart. Defaults to the `ganttLabel` message. */
  'aria-label'?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

const HEADER_HEIGHT = 48;
const ROW_HEIGHT = 36;
/** Rows tall enough to touch. */
const COARSE_ROW_HEIGHT = 44;
/** Rows rendered beyond the view on each side, and how many rows of scrolling change what renders. */
const OVERSCAN = 8;
const ROW_STEP = 4;
/** Pixels of sideways scrolling that change the part of the scale drawn. */
const X_STEP = 256;
/** How far past a bar's ends a dependency drag still lands on it. */
const LINK_SLOP = 12;
/** Progress steps for Alt and Up or Down. */
const PROGRESS_STEP = 10;

const ALL_COLUMNS: readonly GanttColumn[] = ['start', 'end', 'duration', 'progress'];
const NO_DEPENDENCIES: readonly GanttDependency[] = [];
const WEEKDAYS: readonly number[] = [1, 2, 3, 4, 5];
const OFFICE_HOURS: GanttWorkingHours = { start: 9, end: 17 };
const DEFAULT_SIZES = [35, 65];
const PHONE_SIZES = [45, 55];
const MIN_SIZES = ['6rem', '10rem'];
const COLLAPSIBLE = [0];
const NO_CRITICAL_PATH = { taskIds: new Set<string>(), dependencyIds: new Set<string>() };
const NAVIGATION_KEYS = new Set(['ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']);

type Pane = 'grid' | 'timeline';

/** What a press on a bar would drag, and the task as it was. */
interface DragStart {
  kind: 'move' | 'start' | 'end' | 'progress' | 'link';
  taskId: string;
  start: number;
  end: number;
  progress: number;
  /** The end a link starts from. */
  fromEnd: BarEnd;
  /** Whether the task was already the active one (a first tap on touch only makes it active). */
  isAlreadyActive: boolean;
}

interface Viewport {
  width: number;
  height: number;
  /** The horizontal scrollbar's height. */
  scrollbar: number;
}

const measureViewport = (element: HTMLElement): Viewport => ({
  width: element.clientWidth,
  height: element.clientHeight,
  scrollbar: element.offsetHeight - element.clientHeight,
});
const sameViewport = (a: Viewport, b: Viewport) =>
  a.width === b.width && a.height === b.height && a.scrollbar === b.scrollbar;

const taskIdOf = (target: EventTarget | null) =>
  target instanceof Element
    ? target.closest<HTMLElement>('[data-task-id]')?.dataset.taskId
    : undefined;

/**
 * A Gantt chart: a task grid (a tree of summary tasks and tasks with their start, end, duration and progress) beside
 * a timeline of bars, milestones and summary bars spanning their children, in a resizable split that shares rows and
 * vertical scrolling. Dependencies of all four types are drawn as arrows; those the dates break are highlighted, and
 * the critical path can be. The time scale zooms from hours to quarters, with a today line and shaded non-working
 * time. With `isEditable`, bars move, resize and set progress by drag or with Alt and the arrow keys, snapping to
 * `snapMinutes`, and dependencies are made by dragging from a bar's end or from a task's details. Rows are
 * virtualized for thousands of tasks.
 */
export function GanttChart({
  tasks,
  dependencies = NO_DEPENDENCIES,
  zoom: zoomProp,
  defaultZoom = 'day',
  onZoomChange,
  range: rangeProp,
  isEditable = false,
  onTaskChange,
  onDependencyCreate,
  onDependencyDelete,
  snapMinutes,
  hasCriticalPath = false,
  columns = ALL_COLUMNS,
  expandedIds,
  defaultExpandedIds,
  onExpandedChange,
  sizes,
  defaultSizes,
  onSizesChange,
  workingDays = WEEKDAYS,
  workingHours = OFFICE_HOURS,
  timeZone,
  hasNowLine = true,
  now: nowProp,
  firstDayOfWeek,
  maxHeight = '32rem',
  emptyState,
  'aria-label': ariaLabel,
  className,
  ref,
}: GanttChartProps) {
  const messages = useEntryMessages(ganttStrings);
  const { locale } = useLocale();
  const defaultTimeZone = useTimeZone();
  const zone = timeZone ?? defaultTimeZone;
  const clockNow = useNow();
  const nowMs = nowProp === undefined ? clockNow : toEpochMs(nowProp);
  const firstDay = firstDayOfWeek ?? localeFirstDay(locale);
  const format = useGanttFormat(locale, zone, messages);
  const listFormat = useListFormat();
  const isPhone = useIsPhone();
  const isCoarse = useMediaQuery('(pointer: coarse)');
  const rowHeight = isCoarse ? COARSE_ROW_HEIGHT : ROW_HEIGHT;
  const { ref: liveRef, announce } = useAnnouncer();

  const [zoom, setZoom] = useControllableState(zoomProp, defaultZoom, onZoomChange);
  const scale = ZOOM_SCALES[zoom];
  const pxPerMs = pxPerMsAt(zoom);
  const snap = Math.max(1, snapMinutes ?? scale.snapMinutes);
  const snapMs = snap * MINUTE_MS;

  // The tasks, their dependencies and the critical path: linear in their number, once per change.
  const model = useMemo(() => buildModel(tasks), [tasks]);
  const links = useMemo(() => placeDependencies(dependencies, model), [dependencies, model]);
  const critical = useMemo(
    () => (hasCriticalPath ? criticalPath(model, links) : NO_CRITICAL_PATH),
    [hasCriticalPath, model, links],
  );
  const linksByTask = useMemo(() => {
    const into = new Map<string, PlacedDependency[]>();
    const out = new Map<string, PlacedDependency[]>();
    const violated = new Set<string>();
    const add = (map: Map<string, PlacedDependency[]>, id: string, link: PlacedDependency) => {
      const list = map.get(id);
      if (list) {
        list.push(link);
      } else {
        map.set(id, [link]);
      }
    };
    for (const link of links) {
      add(into, link.to.id, link);
      add(out, link.from.id, link);
      if (link.isViolated) {
        violated.add(link.to.id);
      }
    }
    return { into, out, violated };
  }, [links]);

  // Expanded summaries. Uncontrolled without `defaultExpandedIds`, it remembers the collapsed ones instead, so
  // summaries that arrive later (tasks loaded after the first render) start expanded.
  const controlledExpanded = useMemo(
    () => (expandedIds === undefined ? undefined : new Set(expandedIds)),
    [expandedIds],
  );
  const [ownExpansion, setOwnExpansion] = useState<{
    expanded?: ReadonlySet<string>;
    collapsed: ReadonlySet<string>;
  }>(() => ({
    expanded: defaultExpandedIds === undefined ? undefined : new Set(defaultExpandedIds),
    collapsed: new Set(),
  }));
  const expanded = useMemo(
    () =>
      controlledExpanded ??
      ownExpansion.expanded ??
      new Set(model.parentIds.filter((id) => !ownExpansion.collapsed.has(id))),
    [controlledExpanded, ownExpansion, model],
  );
  const setExpanded = (id: string, isExpanded: boolean) => {
    if (expanded.has(id) === isExpanded) {
      return;
    }
    const next = toggleInSet(expanded, id, isExpanded);
    if (!controlledExpanded) {
      setOwnExpansion((current) =>
        current.expanded
          ? { ...current, expanded: next }
          : { collapsed: toggleInSet(current.collapsed, id, !isExpanded) },
      );
    }
    onExpandedChange?.(next);
  };

  const rows = useMemo(() => visibleRows(model, expanded), [model, expanded]);
  const rowIndex = useMemo(() => new Map(rows.map((node, index) => [node.id, index])), [rows]);

  // The time range: the app's, or the tasks' (and today's once the Today button asks for it).
  const [isTodayShown, setTodayShown] = useState(false);
  const today = startOfDay(nowMs, zone);
  const extent = useMemo((): [number, number] | undefined => {
    const own = model.extent;
    if (!isTodayShown || !own) {
      return own;
    }
    return [Math.min(own[0], today), Math.max(own[1], today)];
  }, [model.extent, isTodayShown, today]);
  const autoRange = useMemo(
    () => defaultRange(extent, zoom, zone, firstDay, today),
    [extent, zoom, zone, firstDay, today],
  );
  const rangeStart = rangeProp ? rangeProp.start.getTime() : autoRange.start;
  const baseEnd = Math.max(rangeStart, rangeProp ? rangeProp.end.getTime() : autoRange.end);

  // The timeline's scroll area; the range stretches to fill it, without making it scroll.
  const [measureTimeline, viewport] = useResizeMeasure(measureViewport, sameViewport);
  const viewportWidth = viewport?.width ?? 0;
  const rangeEnd = Math.max(baseEnd, rangeStart + Math.floor(viewportWidth / pxPerMs));
  const trackWidth = Math.max(1, Math.floor((rangeEnd - rangeStart) * pxPerMs));
  const xOf = (ms: number) => (ms - rangeStart) * pxPerMs;

  // The rows in view (and the active one, so focus is never lost to scrolling).
  const [scrollRows, setScrollRows] = useState(0);
  const bodyHeight = Math.max(0, (viewport?.height ?? 0) - HEADER_HEIGHT);
  const rowWindow = fixedSizeWindow(
    scrollRows * ROW_STEP * rowHeight,
    bodyHeight,
    rowHeight,
    rows.length,
    OVERSCAN,
    ROW_STEP,
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const tabStopId = useMemo(() => {
    let id = activeId;
    // A collapsed task hands the tab stop to its nearest shown ancestor.
    while (id !== null && !rowIndex.has(id)) {
      id = model.nodes.get(id)?.parentId ?? null;
    }
    return id ?? rows[0]?.id ?? null;
  }, [activeId, rowIndex, model, rows]);
  const tabStopIndex = tabStopId === null ? -1 : (rowIndex.get(tabStopId) ?? -1);
  const indexes = useMemo(() => {
    const list: number[] = [];
    for (let index = rowWindow.start; index < rowWindow.end; index += 1) {
      list.push(index);
    }
    if (tabStopIndex >= 0 && (tabStopIndex < rowWindow.start || tabStopIndex >= rowWindow.end)) {
      list.push(tabStopIndex);
    }
    return list;
  }, [rowWindow.start, rowWindow.end, tabStopIndex]);

  // The part of the time scale near the view: columns, header periods and non-working time.
  const [scrollColumn, setScrollColumn] = useState(0);
  const viewStart = rangeStart + Math.max(0, scrollColumn * X_STEP - viewportWidth) / pxPerMs;
  const viewEnd = Math.min(
    rangeEnd,
    rangeStart + (scrollColumn * X_STEP + 2 * viewportWidth + X_STEP) / pxPerMs,
  );
  const workingDayKey = workingDays.join();
  const workingDaySet = useMemo(
    () => new Set(workingDayKey === '' ? [] : workingDayKey.split(',').map(Number)),
    [workingDayKey],
  );
  const { start: workStart, end: workEnd } = workingHours;
  const timeScale = useMemo((): TimeScale => {
    const withNext = (ticks: number[], unit: typeof scale.unit) => {
      ticks.push(addUnits(ticks.at(-1) ?? viewStart, unit, 1, zone));
      return ticks;
    };
    return {
      unit: scale.unit,
      majorUnit: scale.major,
      minor: withNext(unitTicks(viewStart, viewEnd, scale.unit, zone, firstDay), scale.unit),
      major: withNext(unitTicks(viewStart, viewEnd, scale.major, zone, firstDay), scale.major),
      shading: scale.isShaded
        ? nonWorkingSpans(
            viewStart,
            viewEnd,
            zone,
            workingDaySet,
            scale.unit === 'hour' ? { start: workStart, end: workEnd } : undefined,
          )
        : [],
    };
  }, [viewStart, viewEnd, scale, zone, firstDay, workingDaySet, workStart, workEnd]);
  const nowX = hasNowLine && nowMs >= rangeStart && nowMs < rangeEnd ? xOf(nowMs) : null;

  // Dependencies with an end near the rows in view (an arrow from far above still crosses them).
  const shownLinks = useMemo(
    () =>
      links.filter((link) => {
        const from = rowIndex.get(link.from.id);
        const to = rowIndex.get(link.to.id);
        return (
          from !== undefined &&
          to !== undefined &&
          Math.min(from, to) < rowWindow.end &&
          Math.max(from, to) >= rowWindow.start
        );
      }),
    [links, rowIndex, rowWindow.start, rowWindow.end],
  );

  const nameOf = useCallback(
    (node: TaskNode) =>
      messages.ganttTaskName({
        label: node.task.label,
        kind: node.kind,
        time: isDated(node) ? format.span(node.start, node.end) : messages.ganttNoDates,
        progress: messages.ganttDone({ percent: format.percent(node.progress) }),
        issues: listFormat.format(
          (linksByTask.into.get(node.id) ?? [])
            .filter((link) => link.isViolated)
            .map((link) =>
              messages.ganttViolation({ task: link.from.task.label, type: link.type }),
            ),
        ),
        isCritical: critical.taskIds.has(node.id),
        isLocked: node.isLocked,
      }),
    [messages, format, listFormat, linksByTask, critical],
  );
  const canEditTask = useCallback(
    (node: TaskNode) => isEditable && !node.isLocked && node.kind !== 'summary' && isDated(node),
    [isEditable],
  );

  // The task grid's columns: those that fit beside the names.
  const [measureGrid, gridWidth] = useElementWidth();
  const dateWidth = zoom === 'hour' ? TIMED_COLUMN_WIDTH : COLUMN_WIDTHS.start;
  const columnKey = columns.join();
  const shownColumns = useMemo(() => {
    const shown: GanttColumn[] = [];
    let used = NAME_MIN_WIDTH;
    for (const column of columnKey === '' ? [] : (columnKey.split(',') as GanttColumn[])) {
      const width = column === 'start' || column === 'end' ? dateWidth : COLUMN_WIDTHS[column];
      if (used + width > (gridWidth ?? 0)) {
        break;
      }
      used += width;
      shown.push(column);
    }
    return shown;
  }, [columnKey, gridWidth, dateWidth]);

  // Scrolling: the two panes scroll together, and what renders follows the view.
  const gridBodyRef = useRef<HTMLDivElement>(null);
  const timelineBodyRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<HTMLDivElement>(null);
  const gridBody = useCallback(
    (element: HTMLDivElement | null) => {
      gridBodyRef.current = element;
      measureGrid(element);
    },
    [measureGrid],
  );
  const timelineBody = useCallback(
    (element: HTMLDivElement | null) => {
      timelineBodyRef.current = element;
      measureTimeline(element);
    },
    [measureTimeline],
  );
  /** The time in the middle of the view, kept as it scrolls, to hold it still while zooming. */
  const centerTime = useRef<number | null>(null);
  /** A sideways scroll to make once the track is laid out: a time, and where in the view to put it (0–1). */
  const scrollRequest = useRef<{ time: number | null; at: number } | null>({
    time: null,
    at: 0.25,
  });
  const followScroll = (top: number, other: HTMLElement | null) => {
    if (other && Math.abs(other.scrollTop - top) >= 1) {
      other.scrollTop = top;
    }
    setScrollRows(Math.floor(top / (rowHeight * ROW_STEP)));
  };
  const onTimelineScroll = (event: UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    followScroll(element.scrollTop, gridBodyRef.current);
    const left = Math.abs(element.scrollLeft);
    setScrollColumn(Math.floor(left / X_STEP));
    centerTime.current = rangeStart + (left + element.clientWidth / 2) / pxPerMs;
  };
  const onGridScroll = (event: UIEvent<HTMLDivElement>) => {
    followScroll(event.currentTarget.scrollTop, timelineBodyRef.current);
  };
  // A pane that was collapsed (hidden) missed the scrolling; line it up again when it shows.
  useLayoutEffect(() => {
    const grid = gridBodyRef.current;
    const timeline = timelineBodyRef.current;
    if (grid && timeline && gridWidth) {
      grid.scrollTop = timeline.scrollTop;
    }
  }, [gridWidth]);

  const scrollTarget = useLatest(
    nowMs >= rangeStart && nowMs < rangeEnd ? nowMs : (model.extent?.[0] ?? rangeStart),
  );
  // When the scale changes (zoom, or the range starting elsewhere), keep the middle of the view where it was.
  useLayoutEffect(() => {
    if (centerTime.current !== null && scrollRequest.current === null) {
      scrollRequest.current = { time: centerTime.current, at: 0.5 };
    }
  }, [rangeStart, pxPerMs]);
  const applyScrollRequest = () => {
    const element = timelineBodyRef.current;
    const request = scrollRequest.current;
    // Until the panes are laid out, there's no view to scroll.
    if (!element || !request || viewportWidth <= 0) {
      return;
    }
    scrollRequest.current = null;
    const x = xOf(request.time ?? scrollTarget.current) - element.clientWidth * request.at;
    element.scrollLeft = (isRightToLeft(element) ? -1 : 1) * Math.max(0, x);
  };
  // After every commit; cheap when nothing is asked.
  useLayoutEffect(() => {
    applyScrollRequest();
  });
  const onToday = () => {
    scrollRequest.current = { time: nowMs, at: 0.25 };
    if (nowMs >= rangeStart && nowMs < rangeEnd) {
      applyScrollRequest();
    } else {
      // The range grows to take today in; the scroll follows once it has.
      setTodayShown(true);
    }
  };

  // Focus: one tab stop per pane, on the active task's row or bar.
  const focusRequest = useRef<{ pane: Pane; id: string } | null>(null);
  const applyFocusRequest = () => {
    const request = focusRequest.current;
    const root = request?.pane === 'grid' ? gridBodyRef.current : timelineBodyRef.current;
    const element = request
      ? root?.querySelector<HTMLElement>(`[data-task-id="${CSS.escape(request.id)}"]`)
      : undefined;
    if (!request || !element) {
      return;
    }
    focusRequest.current = null;
    if (document.activeElement !== element) {
      element.focus({ preventScroll: true });
    }
    const node = model.nodes.get(request.id);
    const box = node ? barBox(node, rangeStart, pxPerMs) : null;
    if (request.pane === 'timeline' && box && timelineBodyRef.current) {
      scrollSpanIntoView(timelineBodyRef.current, Math.max(0, box.x - 24), box.width + 48);
    }
  };
  // After every commit; cheap when nothing is asked.
  useLayoutEffect(() => {
    applyFocusRequest();
  });
  const revealRow = (index: number) => {
    const body = timelineBodyRef.current;
    if (!body) {
      return;
    }
    const top = index * rowHeight;
    const visible = body.clientHeight - HEADER_HEIGHT;
    let next = body.scrollTop;
    if (top < next) {
      next = top;
    } else if (top + rowHeight > next + visible) {
      next = top + rowHeight - visible;
    }
    if (next !== body.scrollTop) {
      body.scrollTop = next;
      followScroll(body.scrollTop, gridBodyRef.current);
    }
  };
  const focusRow = (pane: Pane, index: number) => {
    const target = clamp(index, 0, rows.length - 1);
    const node = rows[target];
    if (!node) {
      return;
    }
    revealRow(target);
    setActiveId(node.id);
    focusRequest.current = { pane, id: node.id };
    applyFocusRequest();
  };
  const onPaneFocus = (event: { target: EventTarget }) => {
    const id = taskIdOf(event.target);
    if (id !== undefined) {
      setActiveId(id);
    }
  };

  // Changes: the app applies them; announced for screen readers.
  const commitTask = (node: TaskNode, start: number, end: number, progress: number) => {
    if (start === node.start && end === node.end && progress === node.progress) {
      return;
    }
    onTaskChange?.({
      ...node.task,
      start: new Date(start),
      end: new Date(end),
      progress: progress === node.progress ? node.task.progress : progress,
    });
    announce(
      messages.ganttTaskChanged({
        label: node.task.label,
        time: format.span(start, end),
        progress: messages.ganttDone({ percent: format.percent(progress) }),
      }),
    );
  };

  // Linking: from a bar's end by drag, or from a task's details and then choosing the other task.
  const canLink = isEditable && onDependencyCreate !== undefined;
  const [linking, setLinking] = useState<{ fromId: string; type: GanttDependencyType } | null>(
    null,
  );
  const createLink = (fromId: string, toId: string, type: GanttDependencyType) => {
    const from = model.nodes.get(fromId);
    const to = model.nodes.get(toId);
    const exists = links.some(
      (link) => link.from.id === fromId && link.to.id === toId && link.type === type,
    );
    if (!from || !to || from === to || exists) {
      return;
    }
    onDependencyCreate?.({ from: fromId, to: toId, type });
    announce(messages.ganttLinked({ from: from.task.label, to: to.task.label, type }));
  };
  const completeLink = (node: TaskNode) => {
    if (linking && linking.fromId !== node.id) {
      createLink(linking.fromId, node.id, linking.type);
      setLinking(null);
    }
  };
  const linkFrom = linking ? model.nodes.get(linking.fromId) : undefined;
  const linkPrompt =
    linking && linkFrom
      ? messages.ganttLinkPrompt({ task: linkFrom.task.label, type: linking.type })
      : null;

  // Details popover (a press, Enter or Space).
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const detailsAnchor = useRef<HTMLElement | null>(null);
  const openDetails = (id: string, anchor: HTMLElement) => {
    detailsAnchor.current = anchor;
    setActiveId(id);
    setDetailsId(id);
  };
  const detailsNode = detailsId === null ? undefined : model.nodes.get(detailsId);

  // Keyboard: arrows, Home, End and Page keys move between rows; in the grid, Left and Right close and open
  // summaries; on the timeline, Alt and the arrows edit. Enter or Space opens the details (or finishes a link).
  const editByKey = (node: TaskNode, event: KeyboardEvent<HTMLElement>): boolean => {
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
    const vertical = event.key === 'ArrowUp' ? 1 : event.key === 'ArrowDown' ? -1 : 0;
    if (!event.altKey || (arrow === 0 && vertical === 0) || !isEditable || !isDated(node)) {
      return false;
    }
    if (node.kind === 'summary') {
      return true;
    }
    if (node.isLocked) {
      announce(messages.ganttTaskLocked({ label: node.task.label }));
      return true;
    }
    if (node.kind === 'milestone' && (vertical !== 0 || event.shiftKey)) {
      return true;
    }
    if (vertical !== 0) {
      const progress =
        vertical > 0
          ? Math.floor(node.progress / PROGRESS_STEP) * PROGRESS_STEP + PROGRESS_STEP
          : Math.ceil(node.progress / PROGRESS_STEP) * PROGRESS_STEP - PROGRESS_STEP;
      commitTask(node, node.start, node.end, clamp(progress, 0, 100));
    } else if (event.shiftKey) {
      const end =
        arrow > 0
          ? stepTime(node.end, 1, snap, zone)
          : Math.max(node.start + snapMs, stepTime(node.end, -1, snap, zone));
      commitTask(node, node.start, end, node.progress);
    } else {
      const start = stepTime(node.start, arrow > 0 ? 1 : -1, snap, zone);
      commitTask(node, start, start + (node.end - node.start), node.progress);
    }
    return true;
  };
  const onPaneKeyDown = (pane: Pane, event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    const id = taskIdOf(target);
    const index = id === undefined ? -1 : (rowIndex.get(id) ?? -1);
    const node = rows[index];
    if (!node || !target) {
      return;
    }
    const pageRows = Math.max(1, Math.floor(bodyHeight / rowHeight) - 1);
    let isHandled = true;
    if (event.key === 'Escape' && linking) {
      setLinking(null);
    } else if (pane === 'timeline' && editByKey(node, event)) {
      // Edited.
    } else if (event.altKey) {
      isHandled = false;
    } else if (NAVIGATION_KEYS.has(event.key)) {
      const next =
        event.key === 'ArrowUp'
          ? index - 1
          : event.key === 'ArrowDown'
            ? index + 1
            : event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? rows.length - 1
                : event.key === 'PageUp'
                  ? index - pageRows
                  : index + pageRows;
      focusRow(pane, next);
    } else if (pane === 'grid' && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
      const isInward = (event.key === 'ArrowRight') !== isRightToLeft(target);
      const isOpen = expanded.has(node.id);
      if (node.kind === 'summary' && isInward !== isOpen) {
        setExpanded(node.id, isInward);
      } else if (node.kind === 'summary' && isInward) {
        focusRow(pane, index + 1);
      } else if (!isInward && node.parentId !== null) {
        focusRow(pane, rowIndex.get(node.parentId) ?? index);
      }
    } else if ((event.key === 'Enter' || event.key === ' ') && target.dataset.taskId === id) {
      // On the row or bar itself (a clicked expand button keeps its own Enter and Space).
      if (linking) {
        completeLink(node);
      } else {
        openDetails(node.id, target);
      }
    } else {
      isHandled = false;
    }
    if (isHandled) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  // Pointer: drag a bar to move it, its edges to resize it, its progress handle, or an end dot to link it.
  const trackPoint = (clientX: number, clientY: number) => {
    const rect = rowsRef.current?.getBoundingClientRect();
    if (!rect) {
      return { x: 0, y: 0 };
    }
    const isRtl = isRightToLeft(rowsRef.current);
    return { x: isRtl ? rect.right - clientX : clientX - rect.left, y: clientY - rect.top };
  };
  const linkTargetAt = (point: { x: number; y: number }) => {
    const node = rows[Math.floor(point.y / rowHeight)];
    const box = node ? barBox(node, rangeStart, pxPerMs) : null;
    if (!node || !box || point.x < box.x - LINK_SLOP || point.x > box.x + box.width + LINK_SLOP) {
      return undefined;
    }
    const end: BarEnd = point.x < box.x + box.width / 2 ? 'start' : 'finish';
    return { id: node.id, end };
  };
  const resolveDrag = (
    { state, originX }: PointerDrag<DragStart>,
    clientX: number,
    clientY: number,
  ): DragPreview => {
    const dx = (clientX - originX) * (isRightToLeft(rowsRef.current) ? -1 : 1);
    const { kind, taskId, start, end, progress } = state;
    if (kind === 'progress') {
      const width = Math.max(1, (end - start) * pxPerMs);
      const next = clamp(Math.round(progress + (dx / width) * 100), 0, 100);
      return { kind, taskId, start, end, progress: next };
    }
    if (kind === 'link') {
      const point = trackPoint(clientX, clientY);
      const target = linkTargetAt(point);
      const isOther = target !== undefined && target.id !== taskId;
      return {
        kind,
        taskId,
        fromEnd: state.fromEnd,
        x: point.x,
        y: point.y,
        targetId: isOther ? target.id : undefined,
        toEnd: isOther ? target.end : undefined,
      };
    }
    const bounds = { start: rangeStart, end: rangeEnd };
    return {
      kind,
      taskId,
      progress,
      ...editTimes(kind, start, end, dx / pxPerMs, snap, zone, bounds),
    };
  };
  const barDrag = usePointerDrag<DragStart, DragPreview>({
    resolve: resolveDrag,
    onDrop: ({ state }, result) => {
      const node = model.nodes.get(state.taskId);
      if (!node) {
        return;
      }
      if (result.kind !== 'link') {
        commitTask(node, result.start, result.end, result.progress);
      } else if (result.targetId !== undefined && result.toEnd) {
        createLink(node.id, result.targetId, dependencyTypeFor(result.fromEnd, result.toEnd));
      }
    },
    onPress: ({ state, pointerType }) => {
      const node = model.nodes.get(state.taskId);
      const element = timelineBodyRef.current?.querySelector<HTMLElement>(
        `[data-task-id="${CSS.escape(state.taskId)}"]`,
      );
      if (!node || !element) {
        return;
      }
      if (linking) {
        completeLink(node);
      } else if (pointerType !== 'touch' || state.isAlreadyActive) {
        // A first tap on a touch screen only picks the task (showing its handles); the next opens its details.
        openDetails(node.id, element);
      }
    },
  });
  const preview = barDrag.preview;
  const onBarPointerDown = (event: PointerEvent<HTMLElement>) => {
    const id = event.currentTarget.dataset.taskId;
    const node = id === undefined ? undefined : model.nodes.get(id);
    if (!node) {
      return;
    }
    const handle =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-handle]')?.dataset.handle
        : undefined;
    const isLinkHandle = handle === 'link-start' || handle === 'link-finish';
    const kind: DragStart['kind'] = isLinkHandle
      ? 'link'
      : handle === 'start' || handle === 'end' || handle === 'progress'
        ? handle
        : 'move';
    const isPressOnly = !canEditTask(node) || linking !== null || (isLinkHandle && !canLink);
    barDrag.begin(
      event,
      {
        kind,
        taskId: node.id,
        start: node.start,
        end: node.end,
        progress: node.progress,
        fromEnd: handle === 'link-start' ? 'start' : 'finish',
        isAlreadyActive: node.id === tabStopId,
      },
      isPressOnly,
    );
    setActiveId(node.id);
  };
  // A click on a row (rows take focus themselves) finishes a link.
  const onGridClick = (event: MouseEvent<HTMLDivElement>) => {
    const id = taskIdOf(event.target);
    const node = id === undefined ? undefined : model.nodes.get(id);
    if (node && linking) {
      completeLink(node);
    }
  };

  // Stable handlers for the memoized rows, calling this render's versions.
  const onPointerDown = useStableCallback(onBarPointerDown);
  const onPointerMove = useStableCallback(barDrag.move);
  const onPointerUp = useStableCallback(barDrag.end);
  const onPointerCancel = useStableCallback(barDrag.cancel);
  const barHandlers = useMemo<BarHandlers>(
    () => ({ onPointerDown, onPointerMove, onPointerUp, onPointerCancel }),
    [onPointerDown, onPointerMove, onPointerUp, onPointerCancel],
  );
  const onToggle = useStableCallback((id: string) => {
    setExpanded(id, !expanded.has(id));
  });

  const splitHeight = HEADER_HEIGHT + rows.length * rowHeight + (viewport?.scrollbar ?? 0);

  return (
    <div
      ref={ref}
      role="group"
      aria-label={ariaLabel ?? messages.ganttLabel}
      className={cn(
        'flex min-w-0 max-w-full flex-col overflow-hidden rounded-card border border-border bg-surface-1',
        className,
      )}
    >
      <GanttToolbar
        zoom={zoom}
        onZoomChange={setZoom}
        onToday={onToday}
        linkPrompt={linkPrompt}
        onCancelLink={() => {
          setLinking(null);
        }}
        messages={messages}
      />
      <LiveRegion ref={liveRef} />
      {rows.length === 0 ? (
        (emptyState ?? <EmptyState title={messages.ganttEmpty} />)
      ) : (
        <div
          // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the rows' height, up to the app's maximum.
          style={{ height: splitHeight, maxHeight }}
          className="min-h-0"
        >
          <SplitView
            sizes={sizes}
            defaultSizes={defaultSizes ?? (isPhone ? PHONE_SIZES : DEFAULT_SIZES)}
            onSizesChange={onSizesChange}
            minSizes={MIN_SIZES}
            collapsibleIndexes={COLLAPSIBLE}
            stackBelow="0px"
            paneLabels={[messages.ganttTasks, messages.ganttTimeline]}
          >
            <GanttGrid
              rows={rows}
              indexes={indexes}
              tabStopId={tabStopId}
              expandedIds={expanded}
              columns={shownColumns}
              dateWidth={dateWidth}
              rowHeight={rowHeight}
              headerHeight={HEADER_HEIGHT}
              bottomSpace={viewport?.scrollbar ?? 0}
              format={format}
              messages={messages}
              onToggle={onToggle}
              onClick={onGridClick}
              onKeyDown={(event) => {
                onPaneKeyDown('grid', event);
              }}
              onFocus={onPaneFocus}
              onScroll={onGridScroll}
              bodyRef={gridBody}
            />
            <GanttTimeline
              rows={rows}
              indexes={indexes}
              tabStopId={tabStopId}
              rangeStart={rangeStart}
              pxPerMs={pxPerMs}
              trackWidth={trackWidth}
              rowHeight={rowHeight}
              headerHeight={HEADER_HEIGHT}
              scale={timeScale}
              nowX={nowX}
              links={shownLinks}
              rowIndex={rowIndex}
              criticalTaskIds={critical.taskIds}
              criticalLinkIds={critical.dependencyIds}
              violatedTaskIds={linksByTask.violated}
              nameOf={nameOf}
              canEditTask={canEditTask}
              preview={preview}
              format={format}
              messages={messages}
              handlers={barHandlers}
              onKeyDown={(event) => {
                onPaneKeyDown('timeline', event);
              }}
              onFocus={onPaneFocus}
              onScroll={onTimelineScroll}
              bodyRef={timelineBody}
              rowsRef={rowsRef}
            />
          </SplitView>
        </div>
      )}
      {detailsNode && (
        <Popover
          triggerRef={detailsAnchor}
          isOpen
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setDetailsId(null);
            }
          }}
          aria-label={detailsNode.task.label}
          placement="bottom start"
        >
          <GanttDetails
            node={detailsNode}
            predecessors={linksByTask.into.get(detailsNode.id) ?? []}
            successors={linksByTask.out.get(detailsNode.id) ?? []}
            isCritical={critical.taskIds.has(detailsNode.id)}
            format={format}
            messages={messages}
            onDelete={
              isEditable && onDependencyDelete
                ? (link) => {
                    onDependencyDelete(link.id);
                  }
                : undefined
            }
            onLink={
              canLink
                ? (type) => {
                    setDetailsId(null);
                    setLinking({ fromId: detailsNode.id, type });
                    announce(messages.ganttLinkPrompt({ task: detailsNode.task.label, type }));
                  }
                : undefined
            }
          />
        </Popover>
      )}
    </div>
  );
}
