// The dashboard context (§9): the page's time range, filter values, legend state and refresh signals, plus the data
// runtime the widgets load through. Each concern is its own React context, so a change re-renders only the widgets
// that read it: hovering a legend entry re-renders the charts, not the tables and maps.

import { createContext, use, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  resolveTimeRange,
  type ResolvedTimeRange,
  type TimeRange,
} from '../../components/TimeRangePicker/resolveTimeRange';
import { toggleInSet } from '../../utils/collections';
import { useNow } from '../../utils/timers';
import { useLatest } from '../../utils/useLatest';
import { useIsPageHidden } from '../../utils/usePageVisibility';
import { useRecurringTimer } from '../../utils/useRecurringTimer';
import { createDataRuntime, type DataRuntime } from '../data/runtime';
import { createWidgetStateStore, type WidgetStateStore } from '../data/widgetState';
import type { WidgetRegistry } from '../widgets/define';
import type {
  AnyDataSource,
  BreakpointId,
  DashboardContextApi,
  DashboardLegendEntry,
  DashboardMode,
  DataShapeDefinition,
  JsonObject,
  JsonValue,
  MapStyleOption,
} from '../types';

/** The page's time range and its instants, resolved once per refresh so identical requests share a call. */
export interface DashboardTime {
  range: TimeRange | undefined;
  resolved: ResolvedTimeRange | undefined;
  timeZone: string;
  /** The instant relative ranges were resolved at: re-taken on every refresh (CTX-04). */
  now: number;
}

/** Legend state for the page (§9.3). */
export interface DashboardLegend {
  /** Every published entry, de-duplicated by key, in first-seen order. */
  entries: readonly DashboardLegendEntry[];
  /** The keys each widget publishes, for accenting frames (CTX-12). */
  keysByWidget: ReadonlyMap<string, ReadonlySet<string>>;
  hidden: ReadonlySet<string>;
  highlighted: string | null;
  /** A consolidated legend widget is on the page (CTX-13). */
  hasLegendWidget: boolean;
}

/** Refresh signals: each change asks the widgets that read it to reload. */
export interface DashboardRefresh {
  /** Bumped by a manual refresh of the whole page. */
  manual: number;
  /** Bumped by each auto-refresh tick. */
  auto: number;
  /** Bumped per widget by its own Refresh action. */
  widgets: ReadonlyMap<string, number>;
  /** Auto-refresh is paused (edit mode, hidden page): widgets with their own interval pause too (NAV-10). */
  isAutoPaused: boolean;
  /** The shortest auto-refresh interval allowed. */
  minIntervalMs: number;
}

/** How a widget's load ended, for the shell's announcements and progress (A11Y-04, NAV-08). */
export interface WidgetLoadReport {
  widgetId: string;
  status: 'loading' | 'success' | 'error' | 'idle';
  reason?: string;
}

/** What widgets report errors with (WID-13, DATA-13). */
export type WidgetErrorHandler = (
  error: unknown,
  info: { widgetId: string; type: string; sourceId?: string; phase: 'load' | 'render' },
) => void;

/** The data runtime and what loads need: sources, shapes and the host's runtime context. */
export interface DashboardRuntime {
  runtime: DataRuntime;
  dataSources: ReadonlyMap<string, AnyDataSource>;
  dataShapes: ReadonlyMap<string, DataShapeDefinition>;
  /** The host's runtime context (CTX-16). */
  context: unknown;
  /** Changes whenever `context` changes identity, so loads keyed on it reload. */
  contextVersion: number;
  onWidgetError?: WidgetErrorHandler;
  formatError?: (error: unknown) => ReactNode;
  /** The map styles the host offers, for map widgets (§10.4). */
  mapStyles: readonly MapStyleOption[];
  /** The registered widget types, for containers drawing their children (§10.7). */
  widgetTypes?: WidgetRegistry;
}

/** What widgets can ask of the dashboard (CTX-15). Its identity never changes. */
export interface DashboardActions {
  setTimeRange: (range: TimeRange) => void;
  setFilterValue: (filterId: string, value: JsonValue) => void;
  toggleLegendKey: (key: string) => void;
  setHighlightedLegendKey: (key: string | null) => void;
  requestRefresh: (widgetId?: string) => void;
  /** A widget's legend entries, or null when it has none (any more). */
  publishLegend: (widgetId: string, entries: readonly DashboardLegendEntry[] | null) => void;
  reportLoad: (report: WidgetLoadReport) => void;
}

/** The part of a widget's surroundings the grid knows: where it is drawn. */
export interface WidgetScope {
  widgetId: string;
  breakpoint: BreakpointId;
  mode: DashboardMode;
  scale: number;
}

const noop = () => undefined;

export const DashboardTimeContext = createContext<DashboardTime>({
  range: undefined,
  resolved: undefined,
  timeZone: 'UTC',
  now: 0,
});
export const DashboardFiltersContext = createContext<Readonly<Record<string, JsonValue>>>({});
export const DashboardLegendContext = createContext<DashboardLegend>({
  entries: [],
  keysByWidget: new Map(),
  hidden: new Set(),
  highlighted: null,
  hasLegendWidget: false,
});
export const DashboardRefreshContext = createContext<DashboardRefresh>({
  manual: 0,
  auto: 0,
  widgets: new Map(),
  isAutoPaused: false,
  minIntervalMs: 15_000,
});
export const DashboardActionsContext = createContext<DashboardActions>({
  setTimeRange: noop,
  setFilterValue: noop,
  toggleLegendKey: noop,
  setHighlightedLegendKey: noop,
  requestRefresh: noop,
  publishLegend: noop,
  reportLoad: noop,
});
export const DashboardRuntimeContext = createContext<DashboardRuntime | null>(null);
/** Widgets' interactive state (Q3); null outside a dashboard, where each widget keeps its own. */
export const DashboardWidgetStateContext = createContext<WidgetStateStore | null>(null);
export const WidgetScopeContext = createContext<WidgetScope>({
  widgetId: '',
  breakpoint: 'full',
  mode: 'view',
  scale: 1,
});

/** Whether two legend lists hold the same entries in the same order. */
function sameEntries(
  a: readonly DashboardLegendEntry[],
  b: readonly DashboardLegendEntry[],
): boolean {
  return (
    a.length === b.length &&
    a.every((entry, index) => {
      const other = b[index];
      return (
        other?.key === entry.key &&
        entry.label === other.label &&
        entry.color === other.color &&
        entry.kind === other.kind &&
        entry.lineStyle === other.lineStyle
      );
    })
  );
}

export interface DashboardContextProviderProps {
  /** The page's effective time range (CTX-01); widgets may override it (CTX-03). */
  timeRange?: TimeRange;
  timeZone: string;
  onTimeRangeChange?: (range: TimeRange) => void;
  filterValues?: Readonly<Record<string, JsonValue>>;
  onFilterValueChange?: (filterId: string, value: JsonValue) => void;
  dataSources: ReadonlyMap<string, AnyDataSource>;
  dataShapes: ReadonlyMap<string, DataShapeDefinition>;
  /** The host's runtime context (CTX-16). */
  context?: unknown;
  maxConcurrentLoads?: number;
  onWidgetError?: WidgetErrorHandler;
  formatError?: (error: unknown) => ReactNode;
  /** A consolidated legend widget is on the page (CTX-13). */
  hasLegendWidget?: boolean;
  /** The hidden legend keys, controlled (CTX-14). Without them the provider keeps its own, for the session. */
  hiddenLegendKeys?: ReadonlySet<string>;
  onHiddenLegendKeysChange?: (keys: Set<string>) => void;
  /** Widgets' interactive state by widget id, controlled by a host that keeps it (Q3). Session-only without it. */
  widgetState?: Readonly<Record<string, JsonObject>>;
  onWidgetStateChange?: (widgetId: string, state: JsonObject) => void;
  /** Reloads every widget this often, held to `minRefreshIntervalMs` (NAV-10). Off when undefined or 0. */
  refreshIntervalMs?: number;
  /** Pauses auto-refresh, such as in edit mode (EDIT-06). It also pauses while the page is hidden. */
  isAutoRefreshPaused?: boolean;
  /** The shortest auto-refresh interval. Defaults to 15 seconds. */
  minRefreshIntervalMs?: number;
  /** Called with every page or widget refresh request (notification only). */
  onRefresh?: (widgetId?: string) => void;
  onLoadReport?: (report: WidgetLoadReport) => void;
  mapStyles?: readonly MapStyleOption[];
  /** The registered widget types, for containers drawing their children (§10.7). */
  widgetTypes?: WidgetRegistry;
  children: ReactNode;
}

const noMapStyles: readonly MapStyleOption[] = [];

const emptyFilters: Readonly<Record<string, JsonValue>> = {};

/** An auto-refresh interval held to the minimum, or undefined when off. */
export function clampRefreshInterval(
  intervalMs: number | undefined,
  minMs: number,
): number | undefined {
  return intervalMs === undefined || !Number.isFinite(intervalMs) || intervalMs <= 0
    ? undefined
    : Math.max(intervalMs, minMs);
}

/** Provides the dashboard context to the widgets under it. */
export function DashboardContextProvider({
  timeRange,
  timeZone,
  onTimeRangeChange,
  filterValues = emptyFilters,
  onFilterValueChange,
  dataSources,
  dataShapes,
  context,
  maxConcurrentLoads = 6,
  onWidgetError,
  formatError,
  hasLegendWidget = false,
  hiddenLegendKeys,
  onHiddenLegendKeysChange,
  widgetState,
  onWidgetStateChange,
  refreshIntervalMs,
  isAutoRefreshPaused = false,
  minRefreshIntervalMs = 15_000,
  onRefresh,
  onLoadReport,
  mapStyles = noMapStyles,
  widgetTypes,
  children,
}: DashboardContextProviderProps) {
  // One scheduler for the dashboard's lifetime.
  const [runtime] = useState(() => createDataRuntime(maxConcurrentLoads));
  const [appliedMax, setAppliedMax] = useState(maxConcurrentLoads);
  if (appliedMax !== maxConcurrentLoads) {
    setAppliedMax(maxConcurrentLoads);
    runtime.setMaxConcurrent(maxConcurrentLoads);
  }

  // Refresh signals, and the instant relative ranges resolve against: re-taken on every refresh (CTX-04), and from
  // the shared clock when the range itself changes.
  const clock = useNow();
  const [refreshState, setRefreshState] = useState(() => ({
    manual: 0,
    auto: 0,
    range: timeRange,
    timeZone,
    now: clock,
  }));
  if (refreshState.range !== timeRange || refreshState.timeZone !== timeZone) {
    setRefreshState({
      ...refreshState,
      range: timeRange,
      timeZone,
      now: Math.max(clock, refreshState.now),
    });
  }
  const { now, manual, auto } = refreshState;
  const [widgetTokens, setWidgetTokens] = useState<ReadonlyMap<string, number>>(() => new Map());

  const isPageHidden = useIsPageHidden();
  useRecurringTimer(
    () => {
      setRefreshState((current) => ({ ...current, auto: current.auto + 1, now: Date.now() }));
    },
    clampRefreshInterval(refreshIntervalMs, minRefreshIntervalMs),
    { isRunning: !isAutoRefreshPaused && !isPageHidden, shouldCatchUp: true },
  );

  const time = useMemo((): DashboardTime => {
    let resolved: ResolvedTimeRange | undefined;
    try {
      resolved = timeRange ? resolveTimeRange(timeRange, now, timeZone) : undefined;
    } catch {
      resolved = undefined;
    }
    return { range: timeRange, resolved, timeZone, now };
  }, [timeRange, timeZone, now]);

  // The host's runtime context: a new identity is a context change that reloads (CTX-16).
  const [contextState, setContextState] = useState({ context, version: 0 });
  if (contextState.context !== context) {
    setContextState({ context, version: contextState.version + 1 });
  }
  const runtimeValue = useMemo(
    (): DashboardRuntime => ({
      runtime,
      dataSources,
      dataShapes,
      context,
      contextVersion: contextState.version,
      onWidgetError,
      formatError,
      mapStyles,
      widgetTypes,
    }),
    [
      runtime,
      dataSources,
      dataShapes,
      context,
      contextState.version,
      onWidgetError,
      formatError,
      mapStyles,
      widgetTypes,
    ],
  );

  const [published, setPublished] = useState<ReadonlyMap<string, readonly DashboardLegendEntry[]>>(
    () => new Map(),
  );
  const [ownHidden, setOwnHidden] = useState<ReadonlySet<string>>(() => new Set());
  const hidden = hiddenLegendKeys ?? ownHidden;
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const legend = useMemo((): DashboardLegend => {
    const byKey = new Map<string, DashboardLegendEntry>();
    const keysByWidget = new Map<string, Set<string>>();
    for (const [widgetId, entries] of published) {
      const keys = new Set<string>();
      for (const entry of entries) {
        keys.add(entry.key);
        if (!byKey.has(entry.key)) {
          byKey.set(entry.key, entry);
        }
      }
      keysByWidget.set(widgetId, keys);
    }
    return { entries: [...byKey.values()], keysByWidget, hidden, highlighted, hasLegendWidget };
  }, [published, hidden, highlighted, hasLegendWidget]);

  const refresh = useMemo(
    (): DashboardRefresh => ({
      manual,
      auto,
      widgets: widgetTokens,
      isAutoPaused: isAutoRefreshPaused || isPageHidden,
      minIntervalMs: minRefreshIntervalMs,
    }),
    [manual, auto, widgetTokens, isAutoRefreshPaused, isPageHidden, minRefreshIntervalMs],
  );

  // The actions keep their identity; they read the latest props when called.
  const latest = useLatest({
    onTimeRangeChange,
    onFilterValueChange,
    onRefresh,
    onLoadReport,
    hidden,
    isHiddenControlled: hiddenLegendKeys !== undefined,
    onHiddenLegendKeysChange,
    onWidgetStateChange,
  });
  const [widgetStates] = useState(() =>
    createWidgetStateStore((widgetId, state) => {
      latest.current.onWidgetStateChange?.(widgetId, state);
    }),
  );
  useEffect(() => {
    if (widgetState) {
      widgetStates.replace(widgetState);
    }
  }, [widgetState, widgetStates]);
  const [actions] = useState((): DashboardActions => ({
    setTimeRange: (range) => latest.current.onTimeRangeChange?.(range),
    setFilterValue: (filterId, value) => latest.current.onFilterValueChange?.(filterId, value),
    toggleLegendKey: (key) => {
      const current = latest.current;
      const next = toggleInSet(current.hidden, key);
      if (!current.isHiddenControlled) {
        setOwnHidden(next);
      }
      current.onHiddenLegendKeysChange?.(next);
    },
    setHighlightedLegendKey: setHighlighted,
    requestRefresh: (widgetId) => {
      if (widgetId === undefined) {
        setRefreshState((current) => ({ ...current, manual: current.manual + 1, now: Date.now() }));
      } else {
        setWidgetTokens((current) =>
          new Map(current).set(widgetId, (current.get(widgetId) ?? 0) + 1),
        );
      }
      latest.current.onRefresh?.(widgetId);
    },
    publishLegend: (widgetId, entries) => {
      setPublished((current) => {
        const previous = current.get(widgetId);
        if (entries === null || entries.length === 0) {
          if (previous === undefined) {
            return current;
          }
          const next = new Map(current);
          next.delete(widgetId);
          return next;
        }
        return previous !== undefined && sameEntries(previous, entries)
          ? current
          : new Map(current).set(widgetId, entries);
      });
    },
    reportLoad: (report) => latest.current.onLoadReport?.(report),
  }));

  return (
    <DashboardRuntimeContext value={runtimeValue}>
      <DashboardWidgetStateContext value={widgetStates}>
        <DashboardActionsContext value={actions}>
          <DashboardTimeContext value={time}>
            <DashboardFiltersContext value={filterValues}>
              <DashboardRefreshContext value={refresh}>
                <DashboardLegendContext value={legend}>{children}</DashboardLegendContext>
              </DashboardRefreshContext>
            </DashboardFiltersContext>
          </DashboardTimeContext>
        </DashboardActionsContext>
      </DashboardWidgetStateContext>
    </DashboardRuntimeContext>
  );
}

/**
 * The dashboard context for custom widget types (CTX-15): the time range, filter values, legend state, breakpoint,
 * mode and scale, and the actions widgets may take. It re-renders on any change; built-in widgets read only the parts
 * they need.
 */
export function useDashboardContext(): DashboardContextApi {
  const time = use(DashboardTimeContext);
  const filterValues = use(DashboardFiltersContext);
  const legend = use(DashboardLegendContext);
  const actions = use(DashboardActionsContext);
  const scope = use(WidgetScopeContext);
  return useMemo(
    () => contextApi(scope, actions, time, filterValues, legend),
    [scope, actions, time, filterValues, legend],
  );
}

/** A widget's context API from the parts it reads (the others left empty). */
export function contextApi(
  scope: WidgetScope,
  actions: DashboardActions,
  time: DashboardTime | undefined,
  filterValues: Readonly<Record<string, JsonValue>> | undefined,
  legend: DashboardLegend | undefined,
): DashboardContextApi {
  return {
    timeRange: time?.range,
    resolvedTimeRange: time?.resolved,
    timeZone: time?.timeZone ?? 'UTC',
    filterValues: filterValues ?? emptyFilters,
    hiddenLegendKeys: legend?.hidden ?? emptyKeys,
    highlightedLegendKey: legend?.highlighted ?? null,
    legendEntries: legend?.entries ?? noEntries,
    hasLegendWidget: legend?.hasLegendWidget ?? false,
    breakpoint: scope.breakpoint,
    mode: scope.mode,
    scale: scope.scale,
    setTimeRange: actions.setTimeRange,
    setFilterValue: actions.setFilterValue,
    toggleLegendKey: actions.toggleLegendKey,
    setHighlightedLegendKey: actions.setHighlightedLegendKey,
    requestRefresh: actions.requestRefresh,
  };
}

const emptyKeys: ReadonlySet<string> = new Set();
const noEntries: readonly DashboardLegendEntry[] = [];
