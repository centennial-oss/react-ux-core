import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Card } from '../components/Card';
import { decimalAdd, decimalMultiply, roundHalfEven } from '../components/MoneyField/decimal';
import { cometQuestion, cometYesEstimate, starBook } from '../../test/finance';
import { OrderBook } from './OrderBook';
import { ProbabilityBar } from './ProbabilityBar';
import { TradeTicket, type OrderType, type TradeDraft, type TradeEstimate } from './TradeTicket';

const meta = {
  title: 'Finance/TradeTicket',
  component: TradeTicket,
  args: {
    kind: 'binary',
    quote: { bid: '0.61', ask: '0.62', last: '0.62' },
    currency: 'USD',
    defaultDraft: { amount: '50.00' },
    estimate: cometYesEstimate,
    balance: '1250.00',
    onSubmit: () => Promise.resolve(),
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TradeTicket>;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * $50 of YES at 0.62 in "Will the comet be visible to the naked eye by June?": the app's estimate shows the cost,
 * the payout if right and the return.
 */
export const BinaryYes: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-fg">{cometQuestion}</p>
        <ProbabilityBar yes={0.62} />
      </div>
      <TradeTicket {...args} />
    </div>
  ),
};

/** A STAR/USD limit order with a quantity, a fee, slippage and the app's warnings. */
export const ExchangeLimit: Story = {
  args: {
    kind: 'exchange',
    quote: { bid: '101.20', ask: '101.25', last: '101.25' },
    defaultOrderType: 'limit',
    defaultInputMode: 'quantity',
    defaultDraft: { price: '101.30', quantity: '12.5000' },
    quantityUnit: 'STAR',
    estimate: {
      averagePrice: '101.27',
      quantity: '12.5',
      cost: '1267.14',
      fees: '1.27',
      slippagePct: '0.02',
    },
    balance: '1000.00',
    warnings: ['The cost is more than your available balance.'],
    confirmThreshold: '1000',
  },
};

/** Selling, which shows proceeds instead of cost. */
export const ExchangeSell: Story = {
  args: {
    kind: 'exchange',
    quote: { bid: '101.20', ask: '101.25' },
    defaultSide: 'sell',
    defaultDraft: { amount: '250.00' },
    quantityUnit: 'STAR',
    estimate: { averagePrice: '101.20', quantity: '2.4703', cost: '249.75', fees: '0.25' },
    balance: undefined,
  },
};

export const Disabled: Story = { args: { isDisabled: true } };

const book = starBook(10);

/** The app works out the estimate from the book; here, quantity × price plus a 0.1% fee (quantity mode only). */
function estimateFor(draft: TradeDraft, orderType: OrderType): TradeEstimate | undefined {
  const price = orderType === 'limit' && draft.price !== undefined ? draft.price : '101.25';
  if (draft.quantity !== undefined) {
    const value = decimalMultiply(draft.quantity, price);
    const fees = roundHalfEven(decimalMultiply(value, '0.001'), 2);
    return {
      averagePrice: price,
      quantity: draft.quantity,
      cost: roundHalfEven(decimalAdd(value, fees), 2),
      fees,
    };
  }
  return undefined;
}

/** Pressing a level in the book switches the ticket to a limit order at that price. */
export const FilledFromOrderBook: Story = {
  args: {
    kind: 'exchange',
    quote: { bid: '101.20', ask: '101.25' },
    quantityUnit: 'STAR',
    defaultInputMode: 'quantity',
  },
  render: function Render(args) {
    const [orderType, setOrderType] = useState<OrderType>('market');
    const [draft, setDraft] = useState<TradeDraft>({});
    return (
      <div className="flex flex-col gap-4">
        <Card title="STAR/USD">
          <OrderBook
            bids={book.bids}
            asks={book.asks}
            depth={5}
            currency="USD"
            onLevelPress={(_side, price) => {
              setOrderType('limit');
              setDraft({ ...draft, price });
            }}
          />
        </Card>
        <TradeTicket
          {...args}
          defaultDraft={undefined}
          estimate={estimateFor(draft, orderType)}
          orderType={orderType}
          onOrderTypeChange={setOrderType}
          draft={draft}
          onDraftChange={setDraft}
        />
      </div>
    );
  },
};
