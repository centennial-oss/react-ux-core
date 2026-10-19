import type { Meta, StoryObj } from '@storybook/react-vite';
import { proposalFunnel } from '../../test/moreCharts';
import { CategoryChart } from './CategoryChart';

const meta = {
  title: 'Chart/Funnel',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Observing proposals from submission to observation: each step's bar is as wide as its count, labelled with its
 * share of the first step. The summary gives the overall share and the largest drop; the table adds each step's
 * share of the one before.
 */
export const Proposals: Story = {
  render: () => (
    <CategoryChart
      type="funnel"
      title="Observing proposals"
      description="This year"
      steps={proposalFunnel}
      unit="proposals"
      exportFileName="observing-proposals"
    />
  ),
};

/** In another palette colour. */
export const Colored: Story = {
  render: () => (
    <CategoryChart
      type="funnel"
      title="Observing proposals"
      steps={proposalFunnel.slice(0, 4)}
      color="chart-3"
      height="14rem"
    />
  ),
};
