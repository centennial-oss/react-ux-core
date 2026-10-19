import type { Meta, StoryObj } from '@storybook/react-vite';
import { sites, sitesScatter } from '../../test/moreCharts';
import { ScatterChart } from './ScatterChart';

const meta = {
  title: 'Chart/Scatter',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Candidate telescope sites: altitude against clear nights a year, in two series with their own colours and point
 * shapes. The tooltip names each site; the summary gives each series' ranges and how strongly the two move together;
 * the table lists every point. Drag (with a mouse) or pinch to zoom.
 */
export const Scatter: Story = {
  render: () => (
    <ScatterChart
      title="Candidate sites"
      description="Altitude against clear nights"
      series={sitesScatter}
      xAxis={{ title: 'Altitude', unit: 'm' }}
      yAxis={{ title: 'Clear nights', suggestedMin: 100 }}
      exportFileName="candidate-sites"
    />
  ),
};

/** The same sites as bubbles, each as large as the mirror the site could host. */
export const Bubble: Story = {
  render: () => (
    <ScatterChart
      title="Candidate sites"
      description="Bubble size: largest mirror the site could host"
      series={sites}
      xAxis={{ title: 'Altitude', unit: 'm' }}
      yAxis={{ title: 'Clear nights' }}
      sizeLabel="Mirror"
      sizeUnit="m"
      height="22rem"
    />
  ),
};

/** A logarithmic x-axis, for values that span orders of magnitude. */
export const LogAxis: Story = {
  render: () => (
    <ScatterChart
      title="Survey targets"
      series={[
        {
          id: 'targets',
          label: 'Targets',
          data: [
            { x: 3, y: 12 },
            { x: 18, y: 20 },
            { x: 45, y: 26 },
            { x: 120, y: 31 },
            { x: 600, y: 41 },
            { x: 2_400, y: 47 },
            { x: 9_000, y: 58 },
            { x: 40_000, y: 66 },
          ],
        },
      ]}
      xAxis={{ title: 'Distance', unit: 'pc', scale: 'log' }}
      yAxis={{ title: 'Exposure', unit: 'min' }}
    />
  ),
};
