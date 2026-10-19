import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { offlineStyle } from '../../../test/maplibre';
import {
  energySource,
  kpiSource,
  loadSource,
  regionTableSource,
  SAMPLE_DAY,
  sampleLibrary,
  trafficSource,
  widget,
} from '../../../test/dashboard';
import { categoryChartWidget } from '../chart/categoryChartWidget';
import { gaugeWidget } from '../chart/gaugeWidget';
import { timeSeriesChartWidget } from '../chart/timeSeriesWidget';
import { mapWidget } from '../map/mapWidget';
import { tableWidget } from '../table/tableWidget';
import type {
  CollectionChangeSet,
  DashboardDocument,
  DashboardLibrary,
  DataSourceDefinition,
  JsonValue,
  PageTemplate,
} from '../types';
import { legendWidget } from '../widgets/legendWidget';
import { rotatorWidget } from '../widgets/rotatorWidget';
import { statGroupWidget } from '../widgets/statGroup';
import { textWidget } from '../widgets/textWidget';
import { Dashboard, type DashboardProps } from './Dashboard';

const meta = {
  title: 'Dashboard/Dashboard',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const allTypes = [
  timeSeriesChartWidget,
  categoryChartWidget,
  statGroupWidget,
  gaugeWidget,
  tableWidget,
  mapWidget,
  legendWidget,
  textWidget,
  rotatorWidget,
];
const mapStyles = [{ id: 'offline', label: 'Offline', styleUrl: offlineStyle }];

const places: DataSourceDefinition = {
  id: 'places',
  label: 'Regions on a map',
  produces: 'geo',
  load: () =>
    Promise.resolve({
      markers: [
        { id: 'eu', label: 'Europe', position: [10, 50], tone: 'success' },
        { id: 'na', label: 'North America', position: [-100, 40], tone: 'warning' },
        { id: 'sa', label: 'South America', position: [-60, -15] },
        { id: 'ap', label: 'Asia Pacific', position: [120, 10], tone: 'danger' },
      ],
    }),
};

const sources = [
  trafficSource(),
  kpiSource(),
  regionTableSource(),
  places,
  energySource(),
  loadSource(),
];

/** Page templates for new dashboards and pages (NAV-12). */
const templates: PageTemplate[] = [
  {
    id: 'service',
    name: 'Service health',
    description: 'Headline figures and requests over time',
    widgets: [
      widget(
        'figures',
        'ccux.statGroup',
        { w: 12, h: 3 },
        { title: 'Figures', data: { sourceId: 'kpis' } },
      ),
      widget(
        'requests',
        'ccux.timeSeriesChart',
        { w: 12, h: 5 },
        { title: 'Requests', data: { sourceId: 'traffic' } },
      ),
    ],
  },
  {
    id: 'regions',
    name: 'Regions',
    description: 'A table and a map of regions',
    widgets: [
      widget(
        'table',
        'ccux.table',
        { w: 6, h: 5 },
        { title: 'Regions', data: { sourceId: 'regions' } },
      ),
      widget(
        'map',
        'ccux.map',
        { w: 6, h: 5 },
        { title: 'Regions map', data: { sourceId: 'places' } },
      ),
    ],
  },
];

/** A dashboard with every P0 widget: chart, figures, table, map and the consolidated legend. */
function operations(): DashboardLibrary {
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
            pages: [
              {
                id: 'traffic',
                title: 'Traffic',
                widgets: [
                  widget(
                    'requests',
                    'ccux.timeSeriesChart',
                    { x: 0, y: 0, w: 8, h: 6 },
                    { title: 'Requests', data: { sourceId: 'traffic' } },
                  ),
                  widget('legend', 'ccux.legend', { x: 8, y: 0, w: 4, h: 2 }, { title: 'Legend' }),
                  widget(
                    'health',
                    'ccux.statGroup',
                    { x: 8, y: 2, w: 4, h: 4 },
                    { title: 'Health', data: { sourceId: 'kpis' } },
                  ),
                  widget(
                    'regions',
                    'ccux.table',
                    { x: 0, y: 6, w: 6, h: 5 },
                    { title: 'Regions', data: { sourceId: 'regions' } },
                  ),
                  widget(
                    'map',
                    'ccux.map',
                    { x: 6, y: 6, w: 6, h: 5 },
                    { title: 'Regions map', data: { sourceId: 'places' } },
                  ),
                ],
              },
              { id: 'notes', title: 'Notes', widgets: [] },
            ],
          },
        ],
      },
    ],
  };
}

/** A host that keeps saved dashboards in memory, as a store would. */
function MemoryHost(props: Partial<DashboardProps> & { initialLibrary: DashboardLibrary }) {
  const { initialLibrary, ...rest } = props;
  const [library, setLibrary] = useState(initialLibrary);
  const onSaveDashboard = (
    document: DashboardDocument,
    { collectionId }: { collectionId: string },
  ) => {
    setLibrary((current) => ({
      collections: current.collections.map((collection) =>
        collection.id === collectionId
          ? {
              ...collection,
              dashboards: collection.dashboards.some((item) => item.id === document.id)
                ? collection.dashboards.map((item) => (item.id === document.id ? document : item))
                : [...collection.dashboards, document],
            }
          : collection,
      ),
    }));
    return Promise.resolve(document);
  };
  const onApplyCollectionChanges = (changes: CollectionChangeSet) => {
    setLibrary((current) => ({
      collections: current.collections.map((collection) => {
        if (collection.id !== changes.collectionId) {
          return collection;
        }
        const byId = new Map(collection.dashboards.map((item) => [item.id, item]));
        for (const item of [...changes.created, ...changes.updated]) {
          byId.set(item.id, item);
        }
        return {
          ...collection,
          dashboards: changes.order.flatMap((id) => byId.get(id) ?? []),
        };
      }),
    }));
    return Promise.resolve();
  };
  return (
    <Dashboard
      library={library}
      widgetTypes={allTypes}
      dataSources={sources}
      mapStyles={mapStyles}
      onSaveDashboard={onSaveDashboard}
      onApplyCollectionChanges={onApplyCollectionChanges}
      templates={templates}
      defaultTimeRange={SAMPLE_DAY}
      hasTimeRangePicker
      {...rest}
    />
  );
}

/** The least a host writes: a dashboard from a literal, widgets with only a type, a size and a source (PERS-06). */
export const CodeDefined: Story = {
  render: () => (
    <Dashboard
      library={{
        collections: [
          {
            id: 'code',
            name: 'Code',
            dashboards: [
              {
                schemaVersion: 1,
                id: 'service',
                title: 'Service',
                pages: [
                  {
                    id: 'main',
                    title: 'Main',
                    widgets: [
                      widget(
                        'health',
                        'ccux.statGroup',
                        { w: 12, h: 3 },
                        { title: 'Health', data: { sourceId: 'kpis' } },
                      ),
                      widget(
                        'requests',
                        'ccux.timeSeriesChart',
                        { w: 8, h: 5 },
                        { title: 'Requests', data: { sourceId: 'traffic' } },
                      ),
                      widget(
                        'regions',
                        'ccux.table',
                        { w: 4, h: 5 },
                        { title: 'Regions', data: { sourceId: 'regions' } },
                      ),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }}
      widgetTypes={allTypes}
      dataSources={sources}
      defaultTimeRange={SAMPLE_DAY}
    />
  ),
};

/**
 * Every P0 widget, editable: Edit → Edit this page, then drag, resize, add (widgets, pages and dashboards, from
 * templates too), configure, change page settings, undo and save; or Edit → Manage dashboards.
 */
export const Editable: Story = {
  render: () => <MemoryHost initialLibrary={operations()} />,
};

/** Already in edit mode. */
export const EditMode: Story = {
  render: () => <MemoryHost initialLibrary={operations()} defaultMode="edit" />,
};

/** Two collections with several dashboards and pages, an unknown widget type, and a locked dashboard. */
export const MultiCollection: Story = {
  render: () => <MemoryHost initialLibrary={sampleLibrary()} />,
};

/** Editing a shared dashboard: the notice stays in view, and saving restates it (PERM-03, EDIT-29). */
export const SharedNotice: Story = {
  render: () => (
    <MemoryHost
      initialLibrary={sampleLibrary()}
      defaultSelection={{ collectionId: 'shared' }}
      defaultMode="edit"
    />
  ),
};

/** A locked dashboard offers no editing (§15). */
export const Locked: Story = {
  render: () => (
    <MemoryHost
      initialLibrary={sampleLibrary()}
      defaultSelection={{ collectionId: 'personal', dashboardId: 'locked' }}
    />
  ),
};

/** The phone layout, by container width: a compact header whose navigation and filters open in sheets (NAV-05). */
export const PhoneWidth: Story = {
  render: () => (
    <div className="mx-auto max-w-[360px] border-x border-border">
      <MemoryHost initialLibrary={operations()} />
    </div>
  ),
};

/** Scaled up as on a wall display (RESP-07): gaps, padding, figures and the legend grow with it. */
export const LargeDisplay: Story = {
  render: () => (
    <MemoryHost initialLibrary={operations()} grid={{ contentScale: 1.5, rowSizing: 'fitPage' }} />
  ),
};

/** Loading, and the empty states (§11.5). */
export const Loading: Story = {
  render: () => <Dashboard library={{ collections: [] }} widgetTypes={allTypes} isLoading />,
};

export const EmptyLibrary: Story = {
  render: () => <Dashboard library={{ collections: [] }} widgetTypes={allTypes} />,
};

export const EmptyCollection: Story = {
  render: () => (
    <MemoryHost
      initialLibrary={{
        collections: [
          { id: 'mine', name: 'Mine', dashboards: [], permissions: { canAddDashboard: true } },
        ],
      }}
    />
  ),
};

/** Widgets whose data failed, came back empty, or can't be drawn (an unknown type). */
export const ErrorsAndEmpty: Story = {
  render: () => (
    <Dashboard
      library={{
        collections: [
          {
            id: 'c',
            name: 'States',
            dashboards: [
              {
                schemaVersion: 1,
                id: 'd',
                title: 'States',
                pages: [
                  {
                    id: 'p',
                    title: 'States',
                    widgets: [
                      widget(
                        'failed',
                        'ccux.statGroup',
                        { w: 4, h: 4 },
                        { title: 'Failed', data: { sourceId: 'broken' } },
                      ),
                      widget(
                        'empty',
                        'ccux.statGroup',
                        { w: 4, h: 4 },
                        { title: 'Empty', data: { sourceId: 'empty' } },
                      ),
                      widget('unknown', 'acme.retired', { w: 4, h: 4 }, { title: 'Retired' }),
                      widget('unbound', 'ccux.statGroup', { w: 4, h: 4 }, { title: 'Not set up' }),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }}
      widgetTypes={allTypes}
      dataSources={[
        kpiSource({ failWith: 'HTTP 503 from metrics-api' }, 'broken'),
        kpiSource({ isEmpty: true }, 'empty'),
      ]}
    />
  ),
};

/** The P1 and P2 widgets: a heading, a category chart, a gauge, and a rotator showing a table and a donut in turn. */
function extensions(): DashboardLibrary {
  return {
    collections: [
      {
        id: 'wall',
        name: 'Wall',
        dashboards: [
          {
            schemaVersion: 1,
            id: 'energy',
            title: 'Energy',
            pages: [
              {
                id: 'today',
                title: 'Today',
                widgets: [
                  widget(
                    'heading',
                    'ccux.text',
                    { x: 0, y: 0, w: 12, h: 2 },
                    {
                      title: 'Notice',
                      options: { body: 'Planned maintenance tonight from 22:00 UTC', size: 'lg' },
                    },
                  ),
                  widget(
                    'mix',
                    'ccux.categoryChart',
                    { x: 0, y: 2, w: 6, h: 5 },
                    {
                      title: 'Output by source',
                      data: { sourceId: 'energy' },
                      options: { unit: 'GWh' },
                    },
                  ),
                  widget(
                    'load',
                    'ccux.gauge',
                    { x: 6, y: 2, w: 3, h: 5 },
                    { title: 'Cluster load', data: { sourceId: 'load' } },
                  ),
                  widget(
                    'turns',
                    'ccux.rotator',
                    { x: 9, y: 2, w: 3, h: 5 },
                    {
                      title: 'Highlights',
                      options: {
                        intervalMs: 8000,
                        hasControls: true,
                        children: [
                          widget(
                            'share',
                            'ccux.categoryChart',
                            { w: 1, h: 1 },
                            {
                              title: 'Share',
                              data: { sourceId: 'energy' },
                              options: { chartType: 'donut' },
                            },
                          ),
                          widget(
                            'figures',
                            'ccux.statGroup',
                            { w: 1, h: 1 },
                            {
                              title: 'Figures',
                              data: { sourceId: 'kpis' },
                            },
                          ),
                        ] as unknown as JsonValue[],
                      },
                    },
                  ),
                ],
              },
              {
                id: 'regions',
                title: 'Regions',
                widgets: [
                  widget(
                    'regions',
                    'ccux.table',
                    { x: 0, y: 0, w: 12, h: 6 },
                    { title: 'Regions', data: { sourceId: 'regions' } },
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

/** Category chart, gauge, text and rotator widgets (§10.6, §10.7). */
export const MoreWidgets: Story = {
  tags: ['!visual'],
  render: () => <MemoryHost initialLibrary={extensions()} />,
};

/** Kiosk mode (Q4): the pages in turn, every 10 seconds; any interaction waits again, and the header pauses it. */
export const Kiosk: Story = {
  tags: ['!visual'],
  render: () => (
    <MemoryHost
      initialLibrary={extensions()}
      kioskIntervalMs={10_000}
      grid={{ rowSizing: 'fitPage' }}
    />
  ),
};
