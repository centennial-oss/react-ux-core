import type { Meta, StoryObj } from '@storybook/react-vite';
import { latencyHistogram, networkLatency, siteLatency } from '../../test/plotCharts';
import { LatencyChart } from './LatencyChart';

const meta = {
  title: 'Chart/Latency',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 24 hours of observatory network latency: p50, p95 and p99 lines with the space between them shaded, and a p95
 * objective of 300 ms. The two windows where p95 went over it are shaded, marked on the time axis (Tab to them) and
 * described in the summary; "View as table" lists every percentile.
 */
export const PercentilesOverTime: Story = {
  render: () => (
    <LatencyChart
      title="Observatory network latency"
      description="Oct 14, 2026, every 10 minutes, UTC"
      series={[networkLatency]}
      objective={{ percentile: 'p95', value: 300 }}
      timeZone="UTC"
      exportFileName="network-latency"
    />
  ),
};

/** On a log axis, where the median and the tail are far apart. */
export const LogScale: Story = {
  render: () => (
    <LatencyChart
      title="Observatory network latency"
      description="Log scale"
      series={[networkLatency]}
      scale="log"
      timeZone="UTC"
    />
  ),
};

/** Two sites' p50 and p95, each in its own colour, against a p95 objective of 280 ms. */
export const SeveralSeries: Story = {
  render: () => (
    <LatencyChart
      title="Latency by site"
      series={siteLatency}
      objective={{ percentile: 'p95', value: 280 }}
      timeZone="UTC"
    />
  ),
};

/**
 * A distribution in 30 buckets on a log axis, with p50, p95 and p99 markers. Buckets past the p95 objective are
 * highlighted, and the summary says whether it was met. Hover or tap a bar for its range, count and share.
 */
export const Histogram: Story = {
  render: () => (
    <LatencyChart
      title="Request latency"
      description="Last 24 hours"
      histogram={latencyHistogram}
      scale="log"
      objective={{ percentile: 'p95', value: 300 }}
      exportFileName="request-latency"
    />
  ),
};

/** The same histogram on a linear axis, where the slow tail stretches out and the fast buckets crowd together. */
export const HistogramLinearScale: Story = {
  render: () => (
    <LatencyChart
      title="Request latency"
      description="Linear scale"
      histogram={latencyHistogram}
      objective={{ percentile: 'p99', value: 1000 }}
    />
  ),
};

/** Loading and empty states. */
export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      <LatencyChart title="Loading" series={[]} isLoading height="10rem" />
      <LatencyChart title="No requests" histogram={[]} height="10rem" />
    </div>
  ),
};
