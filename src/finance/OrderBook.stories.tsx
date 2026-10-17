import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { cometBook, starBook, starBookWithOwnOrders } from '../../test/finance';
import { OrderBook } from './OrderBook';

const star = starBookWithOwnOrders(12);

const meta = {
  title: 'Finance/OrderBook',
  component: OrderBook,
  args: { bids: star.bids, asks: star.asks, currency: 'USD', depth: 8 },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof OrderBook>;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A fictional STAR/USD book: asks above, bids below, the spread and mid price between them, size bars behind each
 * row, and dots on the levels holding the user's own orders.
 */
export const StarUsd: Story = {};

/** Price grouping (tick aggregation): bids round down and asks up to the chosen tick, with their sizes summed. */
export const Grouped: Story = {
  render: function Render(args) {
    const [grouping, setGrouping] = useState('0.1');
    return (
      <OrderBook
        {...args}
        grouping={grouping}
        groupingOptions={['0.05', '0.1', '0.5', '1']}
        onGroupingChange={setGrouping}
      />
    );
  },
};

/** Pressing a level reports its side and price, for filling an order ticket. */
export const PressableLevels: Story = {
  render: function Render(args) {
    const [picked, setPicked] = useState<string | null>(null);
    return (
      <div className="flex flex-col gap-2">
        <OrderBook
          {...args}
          onLevelPress={(side, price) => {
            setPicked(`${side} ${price}`);
          }}
        />
        <p className="text-sm text-fg-muted">Picked: {picked ?? '—'}</p>
      </div>
    );
  },
};

/**
 * A prediction market's YES book for "Will the comet be visible to the naked eye by June?", with 0–1 prices shown
 * as percentages.
 */
export const Probability: Story = {
  args: { ...cometBook(6), priceFormat: 'probability', currency: undefined },
};

/** Twenty levels a side, as a busy market shows them. */
export const DeepBook: Story = {
  args: { ...starBook(20), depth: 20 },
};

/** One side empty: the spread can't be worked out. */
export const OneSided: Story = {
  args: { bids: star.bids.slice(0, 4), asks: [] },
};
