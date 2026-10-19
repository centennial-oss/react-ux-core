// A widget's data (§8.4, §8.5): loads through the dashboard's runtime whenever the request or a refresh signal
// changes, aborts superseded loads (DATA-08), keeps earlier data on screen while reloading (DATA-09), checks the data
// against its shape (DATA-14), and follows push updates (DATA-12). The status is derived from what was asked and what
// settled, so starting a load never needs a render of its own.

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  resolveTimeRange,
  type ResolvedTimeRange,
} from '../../components/TimeRangePicker/resolveTimeRange';
import { isDevelopment } from '../../utils/dev';
import { isAbortError } from '../../utils/errors';
import { useLatest } from '../../utils/useLatest';
import { useRecurringTimer } from '../../utils/useRecurringTimer';
import {
  clampRefreshInterval,
  DashboardActionsContext,
  DashboardFiltersContext,
  DashboardRefreshContext,
  DashboardRuntimeContext,
  DashboardTimeContext,
} from '../context/DashboardContexts';
import { useDashboardMessages } from '../messages';
import type {
  AnyDataSource,
  DataRequest,
  DataRequestReason,
  JsonObject,
  JsonValue,
  ValidationResult,
  WidgetDataState,
  WidgetInstance,
} from '../types';
import { requestKey } from './runtime';

export interface UseWidgetDataOptions {
  instance: Readonly<WidgetInstance>;
  /** The widget type's data shape, or null for types without data. */
  dataShape: string | null;
  /** Other shapes the type converts and shows (`alsoAccepts`). */
  alsoAccepts?: readonly string[];
  /** The widget's options (migrated, with defaults), passed to loaders. */
  options: Readonly<JsonObject>;
  /** False until the widget comes near the viewport (WID-16). Defaults to true. */
  isEnabled?: boolean;
  /** The load's priority when it starts: higher for widgets in view (DATA-11). */
  getPriority?: () => number;
}

export interface WidgetData<TData> {
  state: WidgetDataState<TData>;
  /** The data source the widget is bound to, if it's registered (or its inline loader). */
  source: AnyDataSource | undefined;
  /** The widget needs data but has no usable binding: no source, a source of another shape, or invalid params. */
  isUnconfigured: boolean;
  /** Why the parameters are invalid, when they are. */
  validation: ValidationResult | undefined;
  retry: () => void;
}

type Settled<TData> =
  | {
      id: string;
      key: string;
      data: TData;
      updatedAt: Date;
      isInvalid?: boolean;
      /** The time range the data was loaded for. */
      timeRange?: ResolvedTimeRange;
    }
  | { id: string; key: string; error: unknown };

/** A success state with the time range its data was loaded for, when there was one (BI-01). */
function withTimeRange<TData>(
  state: Extract<WidgetDataState<TData>, { status: 'success' }>,
  timeRange: ResolvedTimeRange | undefined,
): WidgetDataState<TData> {
  return timeRange ? { ...state, timeRange } : state;
}

const inlineSources = new WeakMap<object, AnyDataSource>();

/** A data source wrapping a code-defined widget's inline loader (DATA-06), one per loader. */
function inlineSource(
  instance: Readonly<WidgetInstance>,
  shape: string,
): AnyDataSource | undefined {
  const { load } = instance;
  if (!load) {
    return undefined;
  }
  let source = inlineSources.get(load);
  if (!source) {
    source = { id: `inline:${instance.id}`, label: instance.id, produces: shape, load };
    inlineSources.set(load, source);
  }
  return source;
}

/** The filter values a source reads (§8.2). */
function relevantFilters(
  values: Readonly<Record<string, JsonValue>>,
  dependsOn: readonly string[] | 'all' | 'none' | undefined,
): Record<string, JsonValue> {
  if (dependsOn === 'none') {
    return {};
  }
  if (dependsOn === undefined || dependsOn === 'all') {
    return { ...values };
  }
  const picked: Record<string, JsonValue> = {};
  for (const id of dependsOn) {
    picked[id] = values[id] ?? null;
  }
  return picked;
}

/** Runs a source's loader: `load`, or `fetch` then the pure `transform` (DATA-02). */
async function runSource(
  source: AnyDataSource,
  request: DataRequest<JsonObject>,
): Promise<unknown> {
  // Checked at run time too: apps written in JavaScript can register anything.
  const { load, fetch, transform } = source as {
    load?: (request: DataRequest<JsonObject>) => Promise<unknown>;
    fetch?: (request: DataRequest<JsonObject>) => Promise<unknown>;
    transform?: (raw: unknown, request: DataRequest<JsonObject>) => unknown;
  };
  if (load) {
    return load(request);
  }
  if (fetch && transform) {
    const raw = await fetch(request);
    // A superseded request's raw data isn't worth transforming.
    if (request.signal.aborted) {
      throw new DOMException('The load was superseded.', 'AbortError');
    }
    return transform(raw, request);
  }
  throw new Error(`The data source "${source.id}" has neither load nor fetch and transform.`);
}

/**
 * Loads a widget's data through the dashboard (for custom frames; WidgetFrame uses it for every widget). Must be used
 * inside a dashboard, `DashboardWidget` or `DashboardContextProvider`.
 */
export function useWidgetData<TData = unknown>({
  instance,
  dataShape,
  alsoAccepts,
  options,
  isEnabled = true,
  getPriority,
}: UseWidgetDataOptions): WidgetData<TData> {
  const dashboard = use(DashboardRuntimeContext);
  if (!dashboard) {
    throw new Error('useWidgetData must be used inside a dashboard.');
  }
  const time = use(DashboardTimeContext);
  const filters = use(DashboardFiltersContext);
  const refresh = use(DashboardRefreshContext);
  const actions = use(DashboardActionsContext);
  const messages = useDashboardMessages();

  const source =
    dataShape === null
      ? undefined
      : (inlineSource(instance, dataShape) ??
        (instance.data ? dashboard.dataSources.get(instance.data.sourceId) : undefined));
  // A source of an accepted shape is checked against its own shape; the widget converts it.
  const isAccepted =
    source !== undefined &&
    (source.produces === dataShape || (alsoAccepts?.includes(source.produces) ?? false));
  const shape = source && isAccepted ? dashboard.dataShapes.get(source.produces) : undefined;
  const bindingParams = instance.data?.params;
  const params = useMemo(
    (): JsonObject => ({ ...(source?.defaultParams as JsonObject | undefined), ...bindingParams }),
    [source, bindingParams],
  );
  const validation = useMemo(() => source?.validateParams?.(params), [source, params]);
  const isBound = isAccepted && validation?.isValid !== false;
  const isActive = isBound && isEnabled;

  // Widgets of a source with its own interval refresh on their own clock (NAV-10), paused like the dashboard's.
  const ownInterval = clampRefreshInterval(source?.refreshIntervalMs, refresh.minIntervalMs);
  const [ownTick, setOwnTick] = useState({ token: 0, now: 0 });
  useRecurringTimer(
    () => {
      setOwnTick((current) => ({ token: current.token + 1, now: Date.now() }));
    },
    ownInterval,
    { isRunning: isActive && !refresh.isAutoPaused, shouldCatchUp: true },
  );

  // The effective time range (CTX-03), resolved against the dashboard's latest refresh, or this widget's own tick.
  const dependsOnTime = source?.dependsOn?.hasTimeRange !== false;
  const range = !dependsOnTime
    ? undefined
    : instance.time?.mode === 'override'
      ? instance.time.range
      : time.range;
  const now = Math.max(time.now, ownTick.now);
  const resolved = useMemo((): ResolvedTimeRange | undefined => {
    if (!range) {
      return undefined;
    }
    if (range === time.range && now === time.now) {
      return time.resolved;
    }
    try {
      return resolveTimeRange(range, now, time.timeZone);
    } catch {
      return undefined;
    }
  }, [range, now, time]);

  const relevant = relevantFilters(filters, source?.dependsOn?.filters);
  const paramsKey = requestKey({ source: source?.id, params });
  const key = requestKey({
    source: source?.id,
    params,
    time: resolved ? [resolved.start.getTime(), resolved.end.getTime()] : null,
    filters: relevant,
    context: dashboard.contextVersion,
  });

  const [retryToken, setRetryToken] = useState(0);
  const tokens = {
    manual: refresh.manual,
    auto: ownInterval === undefined ? refresh.auto : ownTick.token,
    widget: refresh.widgets.get(instance.id) ?? 0,
    retry: retryToken,
  };
  // What's being asked for now: the request, and every refresh signal that asks for it again.
  const pendingId = `${key}#${String(tokens.manual)}.${String(tokens.auto)}.${String(tokens.widget)}.${String(tokens.retry)}`;

  const [settled, setSettled] = useState<Settled<TData> | null>(null);
  const [lastData, setLastData] = useState<{
    sourceId: string;
    data: TData;
    updatedAt: Date;
    isInvalid?: boolean;
    timeRange?: ResolvedTimeRange;
  } | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const latest = useLatest({
    source,
    shape,
    params,
    range,
    resolved,
    relevant,
    instance,
    options,
    tokens,
    paramsKey,
    getPriority,
    messages,
    dashboard,
    actions,
    timeZone: time.timeZone,
  });
  const previous = useRef<{ tokens: typeof tokens; paramsKey: string } | null>(null);

  /** The request a loader receives, without its signal and reason. */
  const requestFor = useCallback(
    (reason: DataRequestReason, signal: AbortSignal): DataRequest<JsonObject> => {
      const current = latest.current;
      return {
        params: current.params,
        widget: { id: current.instance.id, type: current.instance.type, options: current.options },
        timeRange:
          current.range && current.resolved
            ? { range: current.range, resolved: current.resolved, timeZone: current.timeZone }
            : undefined,
        filters: current.relevant,
        signal,
        reason,
        context: current.dashboard.context,
      };
    },
    [latest],
  );

  /** The data checked against its shape: an error in development, empty in production (DATA-14). */
  const check = useCallback(
    (data: unknown): { data: TData; isInvalid?: boolean } | { error: Error } => {
      const { shape: dataShapeDefinition, messages: strings } = latest.current;
      if (!dataShapeDefinition || dataShapeDefinition.guard(data)) {
        return { data: data as TData };
      }
      return isDevelopment()
        ? { error: new Error(strings.dataShapeMismatch({ shape: dataShapeDefinition.id })) }
        : { data: data, isInvalid: true };
    },
    [latest],
  );

  useEffect(() => {
    const current = latest.current;
    const loadSource = current.source;
    if (!isActive || !loadSource) {
      return;
    }
    const before = previous.current;
    const reason: DataRequestReason =
      before === null
        ? 'initial'
        : current.tokens.retry !== before.tokens.retry
          ? 'retry'
          : current.tokens.manual !== before.tokens.manual ||
              current.tokens.widget !== before.tokens.widget
            ? 'manualRefresh'
            : current.tokens.auto !== before.tokens.auto
              ? 'autoRefresh'
              : current.paramsKey !== before.paramsKey
                ? 'paramsChanged'
                : 'contextChanged';
    previous.current = { tokens: current.tokens, paramsKey: current.paramsKey };
    const widgetId = current.instance.id;
    const timeRange = current.resolved;
    const controller = new AbortController();
    current.actions.reportLoad({ widgetId, status: 'loading', reason });
    current.dashboard.runtime
      .request(key, (signal) => runSource(loadSource, requestFor(reason, signal)), {
        signal: controller.signal,
        priority: current.getPriority?.() ?? 0,
      })
      .then((value) => {
        if (controller.signal.aborted) {
          return;
        }
        const result = check(value);
        if ('error' in result) {
          throw result.error;
        }
        const updatedAt = new Date();
        setSettled({
          id: pendingId,
          key,
          data: result.data,
          updatedAt,
          isInvalid: result.isInvalid,
          timeRange,
        });
        setLastData({
          sourceId: loadSource.id,
          data: result.data,
          updatedAt,
          isInvalid: result.isInvalid,
          timeRange,
        });
        setLoadedKey(key);
        latest.current.actions.reportLoad({ widgetId, status: 'success', reason });
      })
      .catch((error: unknown) => {
        // A superseded load's result is ignored, even when its loader didn't honour the signal (DATA-08).
        if (controller.signal.aborted || isAbortError(error)) {
          return;
        }
        setSettled({ id: pendingId, key, error });
        const { dashboard: runtime, instance: widget } = latest.current;
        runtime.onWidgetError?.(error, {
          widgetId: widget.id,
          type: widget.type,
          sourceId: loadSource.id,
          phase: 'load',
        });
        latest.current.actions.reportLoad({ widgetId, status: 'error', reason });
      });
    return () => {
      controller.abort();
    };
  }, [isActive, pendingId, key, latest, requestFor, check]);

  // Push updates start after the first successful load of a request, and stop when it changes (DATA-12).
  const isLoaded = loadedKey === key;
  useEffect(() => {
    const subscribe = latest.current.source?.subscribe;
    if (!isActive || !isLoaded || !subscribe) {
      return;
    }
    const controller = new AbortController();
    const stop = subscribe(requestFor('initial', controller.signal), (value) => {
      if (controller.signal.aborted) {
        return;
      }
      const result = check(value);
      if ('data' in result) {
        const updatedAt = new Date();
        const { isInvalid } = result;
        setSettled((current) =>
          current?.key === key && 'data' in current
            ? { ...current, data: result.data, updatedAt, isInvalid }
            : current,
        );
        setLastData((current) =>
          current ? { ...current, data: result.data, updatedAt, isInvalid } : current,
        );
      }
    });
    return () => {
      controller.abort();
      stop();
    };
  }, [isActive, isLoaded, key, latest, requestFor, check]);

  const retry = useCallback(() => {
    setRetryToken((count) => count + 1);
  }, []);

  // The status, derived: what settled for the current request, or a load in flight (with earlier data, if any).
  const shown = lastData?.sourceId === source?.id ? lastData : null;
  const state = useMemo((): WidgetDataState<TData> => {
    // Data that fails its shape's guard shows as empty in production (DATA-14), and a throwing test counts as empty.
    const isEmpty = (data: TData, isInvalid = false) => {
      try {
        return isInvalid || (shape?.isEmpty(data) ?? false);
      } catch {
        return true;
      }
    };
    if (!isBound || (!isEnabled && !shown)) {
      return { status: 'idle' };
    }
    if (settled?.id === pendingId) {
      if ('error' in settled) {
        return shown
          ? { status: 'error', error: settled.error, staleData: shown.data, retry }
          : { status: 'error', error: settled.error, retry };
      }
      return withTimeRange(
        {
          status: 'success',
          data: settled.data,
          updatedAt: settled.updatedAt,
          isRefreshing: false,
          isEmpty: isEmpty(settled.data, settled.isInvalid),
        },
        settled.timeRange,
      );
    }
    if (shown) {
      return withTimeRange(
        {
          status: 'success',
          data: shown.data,
          updatedAt: shown.updatedAt,
          isRefreshing: true,
          isEmpty: isEmpty(shown.data, shown.isInvalid),
        },
        shown.timeRange,
      );
    }
    return { status: 'loading' };
  }, [isBound, isEnabled, shown, settled, pendingId, shape, retry]);

  const isDataRequired = dataShape !== null;
  return {
    state,
    source,
    isUnconfigured: isDataRequired && !isBound,
    validation,
    retry,
  };
}
