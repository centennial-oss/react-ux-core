import type { Meta, StoryObj } from '@storybook/react-vite';
import { instrumentAxes, instrumentScores } from '../../test/moreCharts';
import { CategoryChart } from './CategoryChart';

const meta = {
  title: 'Chart/Radar',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Two instruments scored from 0 to 5 on six measures: each series is a filled shape with its own colour and point
 * shape. The legend shows, hides and highlights series; the summary names each one's best and worst measure.
 */
export const Radar: Story = {
  render: () => (
    <CategoryChart
      type="radar"
      title="Instrument comparison"
      description="Scores from 0 to 5"
      categories={instrumentAxes}
      series={instrumentScores}
      valueAxis={{ min: 0, max: 5 }}
      exportFileName="instrument-comparison"
      height="22rem"
    />
  ),
};

/** A polar area: the first series as wedges of equal angle, each as long as its value. */
export const PolarArea: Story = {
  render: () => (
    <CategoryChart
      type="polarArea"
      title="Echelle spectrograph"
      categories={instrumentAxes}
      series={instrumentScores.slice(0, 1)}
      valueAxis={{ min: 0, max: 5 }}
      height="22rem"
    />
  ),
};
