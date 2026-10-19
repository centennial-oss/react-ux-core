// Deterministic data and mock data sources for the dashboard's stories and tests: configurable latency, failures and
// empty results (DOC-01), and no randomness, so snapshots stay stable.

import type { StatsData, TableData, TimeSeriesData } from '../src/dashboard/data/shapes';
import { defineDataSource } from '../src/dashboard/widgets/define';
import type { DataRequest, JsonObject, LayoutItem, WidgetInstance } from '../src/dashboard/types';

export const HOUR = 3_600_000;
/** The start of the sample data: Oct 12, 2026, 00:00 UTC. */
export const START = Date.UTC(2026, 9, 12);
/**
 * The sample data's day, as a time range, so charts show it whatever today is. A relative range ("the last 24 hours")
 * would move with the clock: empty, with different axis labels on every run, so visual snapshots couldn't match.
 */
export const SAMPLE_DAY = {
  kind: 'absolute',
  start: new Date(START).toISOString(),
  end: new Date(START + 24 * HOUR).toISOString(),
} as const;

/** How a mock source behaves. */
export interface MockBehaviour {
  /** Milliseconds before it answers. Defaults to 0. */
  latencyMs?: number;
  /** Rejects with this message instead of answering. */
  failWith?: string;
  /** Answers with empty data. */
  isEmpty?: boolean;
}

/** Waits `ms` milliseconds, or rejects when `signal` aborts first. */
export function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (ms <= 0) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

/** A smooth, deterministic daily wave: `points` hourly readings around `base`. */
export function wave(points: number, base: number, amplitude: number, phase = 0, from = START) {
  return Array.from({ length: points }, (_, hour) => ({
    t: from + hour * HOUR,
    v:
      Math.round(
        (base + amplitude * Math.sin(((hour + phase) % 24) * (Math.PI / 12)) + ((hour * 7) % 5)) *
          10,
      ) / 10,
  }));
}

/** Request rate and error rate over a day, per region filter (`all` or a region id shifts the numbers). */
export function trafficSeries(region: string | null = null, points = 25): TimeSeriesData {
  const shift = region === null ? 0 : region.length * 3;
  return {
    series: [
      { id: 'rps', label: 'Requests/s', unit: 'req/s', data: wave(points, 120 + shift, 40) },
      {
        id: 'errors',
        label: 'Errors/s',
        unit: 'req/s',
        type: 'bar',
        data: wave(points, 6 + shift / 10, 3, 6),
      },
    ],
    thresholds: [{ value: 170, label: 'Capacity' }],
  };
}

/** A data source of `timeSeries` traffic that honours its filters and time range. */
export function trafficSource(behaviour: MockBehaviour = {}, id = 'traffic') {
  return defineDataSource({
    id,
    label: 'Traffic',
    produces: 'timeSeries',
    dependsOn: { hasTimeRange: true, filters: ['region'] },
    load: async ({ filters, signal }: DataRequest<JsonObject>) => {
      await wait(behaviour.latencyMs ?? 0, signal);
      if (behaviour.failWith !== undefined) {
        throw new Error(behaviour.failWith);
      }
      if (behaviour.isEmpty) {
        return { series: [] } satisfies TimeSeriesData;
      }
      return trafficSeries(typeof filters.region === 'string' ? filters.region : null);
    },
  });
}

/** Key figures, one with three variants that rotate (BI-04). */
export const kpis: StatsData = {
  items: [
    {
      id: 'uptime',
      label: 'Uptime',
      value: 99.982,
      unit: '%',
      sparkline: [99.9, 99.95, 99.97, 99.98],
      timestamp: START,
    },
    {
      id: 'latency',
      label: 'p95 latency',
      value: 182,
      unit: 'ms',
      delta: { value: '12%', direction: 'down', tone: 'success' },
      sparkline: [210, 205, 199, 190, 182],
    },
    {
      id: 'temperature',
      label: 'Hall temperature',
      value: 21.4,
      unit: '°C',
      variants: [
        {
          label: 'Hall temperature',
          value: 21.4,
          unit: '°C',
          caption: 'Sensor A',
          sources: ['Sensor A'],
        },
        {
          label: 'Hall temperature',
          value: 21.9,
          unit: '°C',
          caption: 'Sensor B',
          sources: ['Sensor B'],
        },
        {
          label: 'Hall temperature',
          value: null,
          unit: '°C',
          caption: 'Sensor C',
          sources: ['Sensor C'],
        },
      ],
    },
    { id: 'requests', label: 'Requests today', value: 1_284_312.4567 },
  ],
};

/** A `stats` data source. */
export function kpiSource(behaviour: MockBehaviour = {}, id = 'kpis') {
  return defineDataSource({
    id,
    label: 'Key figures',
    produces: 'stats',
    dependsOn: { hasTimeRange: false, filters: 'none' },
    load: async ({ signal }: DataRequest<JsonObject>) => {
      await wait(behaviour.latencyMs ?? 0, signal);
      if (behaviour.failWith !== undefined) {
        throw new Error(behaviour.failWith);
      }
      return behaviour.isEmpty ? { items: [] } : kpis;
    },
  });
}

/** Energy output by source and year, as `categorical` data. */
export const energyMix = {
  categories: ['Solar', 'Wind', 'Hydro', 'Gas'],
  series: [
    { id: 'y2025', label: '2025', data: [12, 30, 8, 40] },
    { id: 'y2026', label: '2026', data: [18, 34, 9, 31] },
  ],
};

/** A `categorical` data source. */
export function energySource(id = 'energy') {
  return defineDataSource({
    id,
    label: 'Energy mix',
    produces: 'categorical',
    dependsOn: { hasTimeRange: false, filters: 'none' },
    load: async ({ signal }: DataRequest<JsonObject>) => {
      await wait(0, signal);
      return energyMix;
    },
  });
}

/** A `gauge` data source: the cluster's load, in percent. */
export function loadSource(value = 78, id = 'load') {
  return defineDataSource({
    id,
    label: 'Cluster load',
    produces: 'gauge',
    dependsOn: { hasTimeRange: false, filters: 'none' },
    load: async ({ signal }: DataRequest<JsonObject>) => {
      await wait(0, signal);
      return { value, maxValue: 100, unit: '%', thresholds: { warning: 70, danger: 90 } };
    },
  });
}

interface RegionRow {
  id: string;
  region: string;
  requests: number;
  errors: number;
}

/** Requests and errors per region. */
export const regionRows: RegionRow[] = [
  { id: 'eu', region: 'Europe', requests: 48_210, errors: 112 },
  { id: 'na', region: 'North America', requests: 61_904, errors: 87 },
  { id: 'sa', region: 'South America', requests: 9_320, errors: 41 },
  { id: 'ap', region: 'Asia Pacific', requests: 37_611, errors: 64 },
  { id: 'af', region: 'Africa', requests: 4_102, errors: 9 },
];

/** The regions as `table` data. */
export const regionTable: TableData<RegionRow> = {
  columns: [
    {
      id: 'region',
      header: 'Region',
      isRowHeader: true,
      value: (row) => row.region,
      isSortable: true,
    },
    {
      id: 'requests',
      header: 'Requests',
      align: 'end',
      value: (row) => row.requests,
      isSortable: true,
      mobile: true,
    },
    {
      id: 'errors',
      header: 'Errors',
      align: 'end',
      value: (row) => row.errors,
      isSortable: true,
      mobile: true,
    },
  ],
  rows: regionRows,
  getRowId: (row) => row.id,
};

/** A `table` data source. */
export function regionTableSource(behaviour: MockBehaviour = {}, id = 'regions') {
  return defineDataSource({
    id,
    label: 'Regions',
    produces: 'table',
    dependsOn: { hasTimeRange: false, filters: 'none' },
    load: async ({ signal }: DataRequest<JsonObject>) => {
      await wait(behaviour.latencyMs ?? 0, signal);
      if (behaviour.failWith !== undefined) {
        throw new Error(behaviour.failWith);
      }
      return (behaviour.isEmpty
        ? { ...regionTable, rows: [] }
        : regionTable) as unknown as TableData;
    },
  });
}

/** A widget instance with only what a code-defined dashboard needs (acceptance 1). */
export function widget(
  id: string,
  type: string,
  layout: Partial<LayoutItem> & Pick<LayoutItem, 'w' | 'h'>,
  extra: Partial<WidgetInstance> = {},
): WidgetInstance {
  return { id, type, layout, ...extra };
}

/** A library with an editable personal collection and a shared one with an edit notice. */
export function sampleLibrary(): import('../src/dashboard/types').DashboardLibrary {
  return {
    collections: [
      {
        id: 'personal',
        name: 'Personal',
        permissions: {
          canEdit: true,
          canAddDashboard: true,
          canAddPage: true,
          canDeletePage: true,
          canDeleteDashboard: true,
          canReorder: true,
          canChangeGridSettings: true,
          canLockWidgets: true,
        },
        dashboards: [
          {
            schemaVersion: 1,
            id: 'ops',
            title: 'Operations',
            order: 1,
            meta: { owner: 'ops-team', unknown: { kept: true } },
            pages: [
              {
                id: 'overview',
                title: 'Overview',
                widgets: [
                  widget(
                    'health',
                    'ccux.statGroup',
                    { x: 0, y: 0, w: 6, h: 4 },
                    { title: 'Health', data: { sourceId: 'kpis' } },
                  ),
                  widget(
                    'regions',
                    'ccux.table',
                    { x: 6, y: 0, w: 6, h: 4 },
                    { title: 'Regions', data: { sourceId: 'regions' } },
                  ),
                  widget(
                    'retired',
                    'acme.retired',
                    { x: 0, y: 4, w: 4, h: 2 },
                    { title: 'Old widget', options: { keep: 'me' } },
                  ),
                ],
              },
              { id: 'empty', title: 'Empty page', widgets: [] },
            ],
          },
          {
            schemaVersion: 1,
            id: 'locked',
            title: 'Locked board',
            order: 2,
            isLocked: true,
            pages: [
              {
                id: 'locked-page',
                title: 'Only page',
                widgets: [
                  widget(
                    'locked-health',
                    'ccux.statGroup',
                    { w: 6, h: 4 },
                    { title: 'Health', data: { sourceId: 'kpis' } },
                  ),
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'shared',
        name: 'Shared',
        editNotice: 'This dashboard is shared with your team. Changes affect everyone.',
        permissions: { canEdit: true, canAddPage: true },
        dashboards: [
          {
            schemaVersion: 1,
            id: 'team',
            title: 'Team',
            pages: [
              {
                id: 'team-page',
                title: 'Team page',
                widgets: [
                  widget(
                    'team-health',
                    'ccux.statGroup',
                    { w: 6, h: 4 },
                    { title: 'Team health', data: { sourceId: 'kpis' } },
                  ),
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}
