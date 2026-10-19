import type { Meta, StoryObj } from '@storybook/react-vite';
import { deploys, latency, maintenance } from '../../test/charts';
import { TimeSeriesChart } from './TimeSeriesChart';

const meta = {
  title: 'Chart/Events',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Five deploys on a 7-day latency chart: a dashed line and a marker chip on the time axis for each. The third and
 * fourth, an hour apart, cluster into one chip ("2 events"). Every chip is a button (Tab to it); pressing one opens
 * its detail. The events are also in the summary and in "View as table".
 */
export const DeployMarkers: Story = {
  render: () => (
    <TimeSeriesChart
      title="Observatory network latency"
      description="Last 7 days, hourly, UTC"
      series={[latency]}
      events={deploys}
      timeZone="UTC"
      thresholds={[{ value: 80, label: 'Objective', tone: 'warning' }]}
      exportFileName="observatory-latency"
    />
  ),
};

/** A maintenance window as a shaded span, and an incident whose label links to its report. */
export const SpansAndLinks: Story = {
  render: () => (
    <TimeSeriesChart
      title="Observatory network latency"
      description="Last 7 days, hourly, UTC"
      series={[latency]}
      events={maintenance}
      timeZone="UTC"
    />
  ),
};
