import { act, render, screen } from '@testing-library/react';
import { use, useEffect, useState, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { wait } from '../../../test/dashboard';
import type { TimeRange } from '../../components/TimeRangePicker/resolveTimeRange';
import {
  DashboardActionsContext,
  DashboardContextProvider,
  type DashboardActions,
  type DashboardContextProviderProps,
} from '../context/DashboardContexts';
import type {
  AnyDataSource,
  DataRequest,
  JsonObject,
  JsonValue,
  WidgetDataState,
  WidgetInstance,
} from '../types';
import { resolveDataShapes, resolveDataSources } from '../widgets/define';
import { useWidgetData } from './useWidgetData';

const shapes = resolveDataShapes();

type Loader = (request: DataRequest<JsonObject>) => Promise<unknown>;
const lastDay: TimeRange = { kind: 'relative', from: '-24h', to: 'now' };
const lastHour: TimeRange = { kind: 'relative', from: '-1h', to: 'now' };

interface Stats {
  items: { label: string; value: number | string | null }[];
}
const stats = (value: number | string): Stats => ({ items: [{ label: 'n', value }] });

/** A stats source whose `load` the test controls. */
function source(
  load: (request: DataRequest<JsonObject>) => Promise<unknown>,
  extra: Partial<AnyDataSource> = {},
) {
  return { id: 'src', label: 'Source', produces: 'stats', load, ...extra } as AnyDataSource;
}

function Probe({
  instance,
  isEnabled,
  onState,
}: {
  instance: WidgetInstance;
  isEnabled?: boolean;
  onState?: (state: WidgetDataState<Stats>) => void;
}) {
  const { state } = useWidgetData<Stats>({ instance, dataShape: 'stats', options: {}, isEnabled });
  useEffect(() => {
    onState?.(state);
  });
  const value = state.status === 'success' ? state.data.items[0]?.value : state.status;
  const stale = state.status === 'error' ? state.staleData?.items[0]?.value : undefined;
  return (
    <p data-testid={`probe-${instance.id}`}>
      {`${String(value)}${state.status === 'success' && state.isRefreshing ? ' refreshing' : ''}${stale === undefined ? '' : ` stale ${String(stale)}`}`}
    </p>
  );
}

let actions: DashboardActions | undefined;
function CaptureActions() {
  actions = use(DashboardActionsContext);
  return null;
}

function Harness({
  sources,
  children,
  ...props
}: Partial<DashboardContextProviderProps> & { sources: AnyDataSource[]; children: ReactNode }) {
  return (
    <DashboardContextProvider
      timeZone="UTC"
      dataSources={resolveDataSources(sources)}
      dataShapes={shapes}
      {...props}
    >
      <CaptureActions />
      {children}
    </DashboardContextProvider>
  );
}

const instance = (extra: Partial<WidgetInstance> = {}): WidgetInstance => ({
  id: 'w1',
  type: 'test',
  layout: { w: 2, h: 2 },
  data: { sourceId: 'src' },
  ...extra,
});

const text = (id = 'w1') => screen.getByTestId(`probe-${id}`).textContent;

describe('useWidgetData (TEST-03)', () => {
  it('loads once on first view, with params, the resolved time range, relevant filters and the context', async () => {
    const load = vi.fn((request: DataRequest<JsonObject>) =>
      Promise.resolve(stats(request.widget.id === 'w1' ? 1 : 0)),
    );
    const runtimeContext = { tenant: 'acme' };
    render(
      <Harness
        sources={[
          source(load, {
            defaultParams: { site: 'north', unit: 'kW' },
            dependsOn: { filters: ['region'] },
          }),
        ]}
        timeRange={lastDay}
        filterValues={{ region: 'eu', other: 'x' }}
        context={runtimeContext}
      >
        <Probe instance={instance({ data: { sourceId: 'src', params: { unit: 'MW' } } })} />
      </Harness>,
    );
    await expect.poll(() => text()).toBe('1');
    expect(load).toHaveBeenCalledTimes(1);
    const request = load.mock.calls[0]?.[0];
    expect(request?.params).toEqual({ site: 'north', unit: 'MW' });
    expect(request?.filters).toEqual({ region: 'eu' });
    expect(request?.reason).toBe('initial');
    expect(request?.context).toBe(runtimeContext);
    expect(request?.signal).toBeInstanceOf(AbortSignal);
    expect(request?.widget).toEqual({ id: 'w1', type: 'test', options: {} });
    const resolved = request?.timeRange?.resolved;
    expect((resolved?.end.getTime() ?? 0) - (resolved?.start.getTime() ?? 0)).toBe(24 * 3_600_000);
    expect(request?.timeRange?.timeZone).toBe('UTC');
  });

  it('waits until the widget is near the viewport (WID-16)', async () => {
    const load = vi.fn<Loader>(() => Promise.resolve(stats(1)));
    const { rerender } = render(
      <Harness sources={[source(load)]}>
        <Probe instance={instance()} isEnabled={false} />
      </Harness>,
    );
    await wait(20);
    expect(load).not.toHaveBeenCalled();
    expect(text()).toBe('idle');
    rerender(
      <Harness sources={[source(load)]}>
        <Probe instance={instance()} isEnabled />
      </Harness>,
    );
    await expect.poll(() => text()).toBe('1');
  });

  it('runs fetch then transform, aborting the superseded request when the range changes (acceptance 6)', async () => {
    const signals: AbortSignal[] = [];
    const fetch = vi.fn(async ({ timeRange, signal }: DataRequest<JsonObject>) => {
      signals.push(signal);
      const hours =
        ((timeRange?.resolved.end.getTime() ?? 0) - (timeRange?.resolved.start.getTime() ?? 0)) /
        3_600_000;
      await wait(hours === 24 ? 80 : 5);
      return { hours };
    });
    const transform = vi.fn((raw: unknown) => stats((raw as { hours: number }).hours));
    const fetched = {
      id: 'src',
      label: 'Fetched',
      produces: 'stats',
      fetch,
      transform,
    } as AnyDataSource;
    const { rerender } = render(
      <Harness sources={[fetched]} timeRange={lastDay}>
        <Probe instance={instance()} />
      </Harness>,
    );
    await expect.poll(() => fetch.mock.calls.length).toBe(1);
    rerender(
      <Harness sources={[fetched]} timeRange={lastHour}>
        <Probe instance={instance()} />
      </Harness>,
    );
    await expect.poll(() => text()).toBe('1');
    expect(signals[0]?.aborted).toBe(true);
    expect(fetch.mock.calls[1]?.[0].reason).toBe('contextChanged');
    // The slow first answer never shows, even though its fetch ignored the signal.
    await wait(120);
    expect(text()).toBe('1');
    expect(transform).toHaveBeenCalledTimes(1);
  });

  it('reloads when params, a relevant filter or the runtime context change, and not for other filters (DATA-07)', async () => {
    const load = vi.fn((request: DataRequest<JsonObject>) =>
      Promise.resolve(stats(Number(request.params.n))),
    );
    const dependent = source(load, { dependsOn: { hasTimeRange: false, filters: ['region'] } });
    const view = (n: number, filters: Record<string, JsonValue>, context: object) => (
      <Harness sources={[dependent]} filterValues={filters} context={context}>
        <Probe instance={instance({ data: { sourceId: 'src', params: { n } } })} />
      </Harness>
    );
    const context = { tenant: 'a' };
    const { rerender } = render(view(1, { region: 'eu' }, context));
    await expect.poll(() => text()).toBe('1');
    rerender(view(2, { region: 'eu' }, context));
    await expect.poll(() => text()).toBe('2');
    expect(load.mock.calls[1]?.[0].reason).toBe('paramsChanged');
    rerender(view(2, { region: 'eu', site: 'x' }, context));
    await wait(30);
    expect(load).toHaveBeenCalledTimes(2);
    rerender(view(2, { region: 'na', site: 'x' }, context));
    await expect.poll(() => load.mock.calls.length).toBe(3);
    expect(load.mock.calls[2]?.[0].reason).toBe('contextChanged');
    rerender(view(2, { region: 'na', site: 'x' }, { tenant: 'b' }));
    await expect.poll(() => load.mock.calls.length).toBe(4);
  });

  it('keeps the data in view while refreshing, then shows the new data (DATA-09, acceptance 8)', async () => {
    let answer = 1;
    let release: (() => void) | undefined;
    const load = vi.fn<Loader>(async () => {
      const value = answer;
      if (value > 1) {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      }
      return stats(value);
    });
    render(
      <Harness sources={[source(load, { dependsOn: { hasTimeRange: false } })]}>
        <Probe instance={instance()} />
      </Harness>,
    );
    await expect.poll(() => text()).toBe('1');
    answer = 2;
    act(() => {
      actions?.requestRefresh();
    });
    await expect.poll(() => text()).toBe('1 refreshing');
    expect(load.mock.calls[1]?.[0]).toMatchObject({ reason: 'manualRefresh' });
    act(() => {
      release?.();
    });
    await expect.poll(() => text()).toBe('2');
  });

  it('refreshes one widget from its own Refresh action', async () => {
    const load = vi.fn<Loader>(() => Promise.resolve(stats(1)));
    render(
      <Harness sources={[source(load, { dependsOn: { hasTimeRange: false } })]}>
        <Probe instance={instance()} />
        <Probe
          instance={instance({ id: 'w2', data: { sourceId: 'src', params: { other: true } } })}
        />
      </Harness>,
    );
    await expect.poll(() => load.mock.calls.length).toBe(2);
    act(() => {
      actions?.requestRefresh('w2');
    });
    await expect.poll(() => load.mock.calls.length).toBe(3);
    expect(load.mock.calls[2]?.[0]).toMatchObject({
      reason: 'manualRefresh',
      widget: { id: 'w2' },
    });
  });

  it('auto-refreshes no faster than the minimum, and pauses (NAV-10)', async () => {
    const load = vi.fn<Loader>(() => Promise.resolve(stats(1)));
    const view = (isPaused: boolean) => (
      <Harness
        sources={[source(load, { dependsOn: { hasTimeRange: false } })]}
        refreshIntervalMs={5}
        minRefreshIntervalMs={60}
        isAutoRefreshPaused={isPaused}
      >
        <Probe instance={instance()} />
      </Harness>
    );
    const { rerender } = render(view(false));
    await expect.poll(() => load.mock.calls.length).toBe(1);
    await wait(40);
    // 5 ms is held to the 60 ms minimum.
    expect(load).toHaveBeenCalledTimes(1);
    await expect.poll(() => load.mock.calls.length, { timeout: 2000 }).toBeGreaterThanOrEqual(2);
    expect(load.mock.calls[1]?.[0]).toMatchObject({ reason: 'autoRefresh' });
    rerender(view(true));
    const paused = load.mock.calls.length;
    await wait(200);
    expect(load).toHaveBeenCalledTimes(paused);
    // A tick missed while paused runs as soon as it resumes.
    rerender(view(false));
    await expect.poll(() => load.mock.calls.length).toBe(paused + 1);
  });

  it('honours a source’s own refresh interval', async () => {
    const load = vi.fn<Loader>(() => Promise.resolve(stats(1)));
    render(
      <Harness
        sources={[source(load, { dependsOn: { hasTimeRange: false }, refreshIntervalMs: 50 })]}
        minRefreshIntervalMs={50}
      >
        <Probe instance={instance()} />
      </Harness>,
    );
    await expect.poll(() => load.mock.calls.length, { timeout: 2000 }).toBeGreaterThanOrEqual(3);
    expect(load.mock.calls.at(-1)?.[0]).toMatchObject({ reason: 'autoRefresh' });
  });

  it('aborts its load when it unmounts (DATA-08)', async () => {
    const signals: AbortSignal[] = [];
    const load = vi.fn(({ signal }: DataRequest<JsonObject>) => {
      signals.push(signal);
      return new Promise<unknown>(() => undefined);
    });
    const { unmount } = render(
      <Harness sources={[source(load)]}>
        <Probe instance={instance()} />
      </Harness>,
    );
    await expect.poll(() => signals.length).toBe(1);
    unmount();
    expect(signals[0]?.aborted).toBe(true);
  });

  it('shares one load between widgets asking for the same data (DATA-10, acceptance 7)', async () => {
    const load = vi.fn<Loader>(() => wait(10).then(() => stats(7)));
    render(
      <Harness sources={[source(load)]} timeRange={lastDay}>
        <Probe
          instance={instance({ id: 'a', data: { sourceId: 'src', params: { x: 1, y: 2 } } })}
        />
        <Probe
          instance={instance({ id: 'b', data: { sourceId: 'src', params: { y: 2, x: 1 } } })}
        />
      </Harness>,
    );
    await expect.poll(() => [text('a'), text('b')]).toEqual(['7', '7']);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('caps concurrent loads (DATA-11)', async () => {
    let running = 0;
    let most = 0;
    const load = vi.fn<Loader>(async () => {
      running += 1;
      most = Math.max(most, running);
      await wait(20);
      running -= 1;
      return stats(1);
    });
    render(
      <Harness sources={[source(load)]} maxConcurrentLoads={2}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Probe
            key={n}
            instance={instance({ id: `w${String(n)}`, data: { sourceId: 'src', params: { n } } })}
          />
        ))}
      </Harness>,
    );
    await expect.poll(() => load.mock.calls.length, { timeout: 3000 }).toBe(5);
    await expect.poll(() => text('w5')).toBe('1');
    expect(most).toBe(2);
  });

  it('shows an error with Retry, and keeps earlier data when a refresh fails (DATA-09, DATA-13)', async () => {
    let shouldFail = true;
    const onWidgetError = vi.fn();
    let latest: WidgetDataState<Stats> | undefined;
    const load = vi.fn<Loader>(() =>
      shouldFail ? Promise.reject(new Error('down')) : Promise.resolve(stats(3)),
    );
    render(
      <Harness
        sources={[source(load, { dependsOn: { hasTimeRange: false } })]}
        onWidgetError={onWidgetError}
      >
        <Probe
          instance={instance()}
          onState={(state) => {
            latest = state;
          }}
        />
      </Harness>,
    );
    await expect.poll(() => text()).toBe('error');
    expect(onWidgetError).toHaveBeenCalledWith(expect.objectContaining({ message: 'down' }), {
      widgetId: 'w1',
      type: 'test',
      sourceId: 'src',
      phase: 'load',
    });
    shouldFail = false;
    act(() => {
      if (latest?.status === 'error') {
        latest.retry();
      }
    });
    await expect.poll(() => text()).toBe('3');
    expect(load.mock.calls[1]?.[0]).toMatchObject({ reason: 'retry' });
    shouldFail = true;
    act(() => {
      actions?.requestRefresh();
    });
    await expect.poll(() => text()).toBe('error stale 3');
  });

  it('subscribes after the first load and stops when the request changes or it unmounts (DATA-12)', async () => {
    const stops: string[] = [];
    let emit: ((data: unknown) => void) | undefined;
    const subscribe = vi.fn((request: DataRequest<JsonObject>, onData: (data: unknown) => void) => {
      emit = onData;
      return () => {
        stops.push(JSON.stringify(request.params.n));
      };
    });
    const load = vi.fn((request: DataRequest<JsonObject>) =>
      Promise.resolve(stats(Number(request.params.n))),
    );
    const live = source(load, {
      subscribe,
      dependsOn: { hasTimeRange: false },
    } as Partial<AnyDataSource>);
    const view = (n: number) => (
      <Harness sources={[live]}>
        <Probe instance={instance({ data: { sourceId: 'src', params: { n } } })} />
      </Harness>
    );
    const { rerender, unmount } = render(view(1));
    await expect.poll(() => subscribe.mock.calls.length).toBe(1);
    act(() => {
      emit?.(stats(99));
    });
    await expect.poll(() => text()).toBe('99');
    rerender(view(2));
    await expect.poll(() => subscribe.mock.calls.length).toBe(2);
    expect(stops).toEqual(['1']);
    unmount();
    expect(stops).toEqual(['1', '2']);
  });

  it('treats data that fails its shape’s guard as an error in development (DATA-14)', async () => {
    render(
      <Harness sources={[source(() => Promise.resolve({ wrong: true }))]}>
        <Probe instance={instance()} />
      </Harness>,
    );
    await expect.poll(() => text()).toBe('error');
  });

  it('is idle without a usable binding', () => {
    function Unbound({ binding }: { binding: WidgetInstance['data'] }) {
      const [result] = useState(() => binding);
      const { state, isUnconfigured } = useWidgetData({
        instance: instance({ data: result }),
        dataShape: 'stats',
        options: {},
      });
      return <p>{`${state.status} ${String(isUnconfigured)}`}</p>;
    }
    const tableSource = {
      id: 'table',
      label: 'T',
      produces: 'table',
      load: () => Promise.resolve({}),
    } as AnyDataSource;
    const strict = source(() => Promise.resolve(stats(1)), {
      id: 'strict',
      validateParams: (params: JsonObject) => ({ isValid: params.site !== undefined }),
    });
    render(
      <Harness sources={[tableSource, strict]}>
        <Unbound binding={undefined} />
        <Unbound binding={{ sourceId: 'missing' }} />
        <Unbound binding={{ sourceId: 'table' }} />
        <Unbound binding={{ sourceId: 'strict' }} />
      </Harness>,
    );
    expect(screen.getAllByText('idle true')).toHaveLength(4);
  });
});
