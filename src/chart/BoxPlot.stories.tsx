import type { Meta, StoryObj } from '@storybook/react-vite';
import { seeingSeries, seeingSites } from '../../test/moreCharts';
import { histogramBoxStats } from './boxPlot';
import { BoxPlotChart } from './BoxPlotChart';

const meta = {
  title: 'Chart/Box Plot',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Nightly seeing at four sites in summer and winter, from raw values: boxes from the lower to the upper quartile with
 * the median across, whiskers to the furthest nights within 1.5 times the box, the mean as a diamond, and bad nights
 * as hollow dots. The table gives the five numbers.
 */
export const Seeing: Story = {
  render: () => (
    <BoxPlotChart
      title="Seeing by site"
      description="Thirty nights a season; lower is sharper"
      categories={seeingSites}
      series={seeingSeries}
      unit="″"
      valueAxis={{ title: 'Arcseconds', suggestedMin: 0 }}
      exportFileName="seeing-by-site"
    />
  ),
};

/** Horizontal, with one series. */
export const Horizontal: Story = {
  render: () => (
    <BoxPlotChart
      title="Summer seeing"
      categories={seeingSites}
      series={seeingSeries.slice(0, 1)}
      unit="″"
      orientation="horizontal"
    />
  ),
};

/** Summaries from histogram buckets (as LatencyChart takes them), with `histogramBoxStats`. */
export const FromHistograms: Story = {
  render: () => (
    <BoxPlotChart
      title="Archive request latency"
      categories={['Europe', 'Americas', 'Asia']}
      series={[
        {
          id: 'latency',
          label: 'Latency',
          data: [
            histogramBoxStats([
              { le: 50, count: 120 },
              { le: 100, count: 340 },
              { le: 200, count: 260 },
              { le: 400, count: 80 },
              { le: 800, count: 12 },
            ]),
            histogramBoxStats([
              { le: 50, count: 40 },
              { le: 100, count: 210 },
              { le: 200, count: 380 },
              { le: 400, count: 190 },
              { le: 800, count: 40 },
            ]),
            histogramBoxStats([
              { le: 100, count: 60 },
              { le: 200, count: 240 },
              { le: 400, count: 310 },
              { le: 800, count: 120 },
              { le: 1600, count: 20 },
            ]),
          ].map((stats) => stats ?? null),
        },
      ]}
      unit="ms"
    />
  ),
};
