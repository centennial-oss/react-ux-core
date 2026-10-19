import type { Meta, StoryObj } from '@storybook/react-vite';
import { Activity } from 'lucide-react';
import {
  kpis,
  kpiSource,
  regionTableSource,
  SAMPLE_DAY,
  trafficSeries,
  trafficSource,
} from '../../../test/dashboard';
import { Sparkline } from '../../components/Sparkline/Sparkline';
import { timeSeriesChartWidget } from '../chart/timeSeriesWidget';
import { timeSeriesShape } from '../data/shapes';
import { tableWidget } from '../table/tableWidget';
import { widgetFromComponent } from '../widgets/define';
import { statGroupWidget } from '../widgets/statGroup';
import { DashboardWidget } from './DashboardWidget';

const meta = {
  title: 'Dashboard/DashboardWidget',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** A widget on its own (DATA-18), fed by a bare `load` function: the same frame, states and data loading. */
export const BareLoad: Story = {
  render: () => (
    <div className="max-w-3xl">
      <DashboardWidget
        type={statGroupWidget}
        title="Service health"
        load={() => Promise.resolve(kpis)}
      />
    </div>
  ),
};

/** The time series chart widget with a data source and a time range. */
export const TimeSeries: Story = {
  render: () => (
    <div className="max-w-3xl">
      <DashboardWidget
        type={timeSeriesChartWidget}
        title="Requests"
        dataSource={trafficSource()}
        timeRange={SAMPLE_DAY}
        height="22rem"
      />
    </div>
  ),
};

/** The table widget, from table data, scrolling inside its frame. */
export const Table: Story = {
  render: () => (
    <div className="max-w-3xl">
      <DashboardWidget
        type={tableWidget}
        title="Regions"
        dataSource={regionTableSource()}
        height="18rem"
      />
    </div>
  ),
};

/** The table widget from time series: one row per time, newest first. */
export const TableFromSeries: Story = {
  render: () => (
    <div className="max-w-3xl">
      <DashboardWidget
        type={tableWidget}
        title="Traffic by hour"
        dataSource={trafficSource()}
        height="18rem"
      />
    </div>
  ),
};

/** A loader that failed: the message, Retry and the technical details (DATA-13). */
export const LoadFailed: Story = {
  render: () => (
    <div className="max-w-xl">
      <DashboardWidget
        type={statGroupWidget}
        title="Service health"
        dataSource={kpiSource({ failWith: 'HTTP 503 from metrics-api' })}
      />
    </div>
  ),
};

/** A load that came back empty. */
export const Empty: Story = {
  render: () => (
    <div className="max-w-xl">
      <DashboardWidget
        type={statGroupWidget}
        title="Service health"
        dataSource={kpiSource({ isEmpty: true })}
      />
    </div>
  ),
};

/** A slow source: the placeholder holds the widget's shape until the data arrives. */
export const SlowSource: Story = {
  tags: ['!visual'],
  render: () => (
    <div className="max-w-3xl">
      <DashboardWidget
        type={timeSeriesChartWidget}
        title="Requests"
        dataSource={trafficSource({ latencyMs: 2500 }, 'slow')}
        timeRange={SAMPLE_DAY}
        refreshIntervalMs={15_000}
        height="22rem"
      />
    </div>
  ),
};

/** The latest reading of each series as a sparkline: a custom widget type made with `widgetFromComponent` (WID-04). */
const trendWidget = widgetFromComponent({
  type: 'acme.trend',
  displayName: 'Trend',
  icon: Activity,
  dataShape: timeSeriesShape,
  defaultSize: { w: 3, h: 2 },
  defaultOptions: { seriesIndex: 0 },
  component: Sparkline,
  toProps: (data, options, env) => ({
    data: (data?.series[options.seriesIndex]?.data ?? []).flatMap((point) =>
      point.v === null ? [] : [point.v],
    ),
    height: Math.max(32, env.frameSize.height - 24),
    className: 'm-3',
  }),
});

export const CustomWidgetType: Story = {
  render: () => (
    <div className="max-w-md">
      <DashboardWidget
        type={trendWidget}
        title="Requests trend"
        load={() => Promise.resolve(trafficSeries())}
        height="10rem"
      />
    </div>
  ),
};

/** Stat items reuse StatTile's data props, so a source of `stats` data is a few lines (WID-06). */
export const StatsFromCode: Story = {
  tags: ['!visual'],
  render: () => (
    <div className="max-w-3xl">
      <DashboardWidget
        type={statGroupWidget}
        title="Figures"
        displayOptions={{ tileColumns: 2 }}
        load={() => Promise.resolve({ items: kpis.items.slice(0, 2) })}
      />
    </div>
  ),
};
