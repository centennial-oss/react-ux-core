import type { Meta, StoryObj } from '@storybook/react-vite';
import { cometBook, cometQuestion, starBook } from '../../test/finance';
import { DepthChart } from './DepthChart';

const star = starBook(20);

const meta = {
  title: 'Finance/DepthChart',
  component: DepthChart,
  args: { title: 'STAR/USD depth', bids: star.bids, asks: star.asks },
} satisfies Meta<typeof DepthChart>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Cumulative size for each side of a fictional STAR/USD book, with the mid price marked. */
export const StarUsd: Story = {};

/** The same book grouped to 0.25. */
export const Grouped: Story = {
  args: { grouping: '0.25', description: 'Grouped to 0.25' },
};

/** A prediction market's YES book, with prices as percentages. */
export const Probability: Story = {
  args: { title: cometQuestion, ...cometBook(8), priceFormat: 'probability' },
};

export const Loading: Story = { args: { isLoading: true } };

export const Empty: Story = { args: { bids: [], asks: [] } };

export const LoadError: Story = {
  args: { error: 'The market data feed is offline.', onRetry: () => undefined },
};
