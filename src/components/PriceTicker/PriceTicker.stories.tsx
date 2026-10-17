import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { PriceTicker } from './PriceTicker';
import { TickerTape } from './TickerTape';

const meta = {
  title: 'Display/PriceTicker',
  component: PriceTicker,
  args: {
    label: 'Solar wind (km/s)',
    value: 512.4,
    reference: 498.1,
    format: { minimumFractionDigits: 1, maximumFractionDigits: 1 },
    sparkline: [471, 480, 476, 489, 495, 498, 503, 497, 506, 512],
  },
} satisfies Meta<typeof PriceTicker>;
export default meta;
type Story = StoryObj<typeof meta>;

const narrow = [
  (Story: () => React.JSX.Element) => (
    <div className="max-w-xs">
      <Story />
    </div>
  ),
];

/** A value with its change against a reference (▲ and tone) and a sparkline. */
export const Default: Story = { decorators: narrow };

/** Up, down, unchanged, "up is bad" (a brighter comet has a lower magnitude), a currency, and text. */
export const States: Story = {
  decorators: [
    (Story) => (
      <div className="max-w-3xl">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-4">
      <PriceTicker label="Viewers" value={12480} reference={12170} />
      <PriceTicker
        label="Solar wind (km/s)"
        value={431.2}
        reference={498.1}
        format={{ minimumFractionDigits: 1 }}
      />
      <PriceTicker label="Sunspot number" value={142} reference={142} />
      <PriceTicker
        label="Comet brightness (mag)"
        value={6.8}
        reference={7.4}
        format={{ minimumFractionDigits: 1 }}
        isUpBad
      />
      <PriceTicker label="Telescope hour" value={1840} reference={1795.5} currency="EUR" />
      <PriceTicker label="Seeing (arcsec)" value="—" />
    </div>
  ),
};

/** Small, medium and large. */
export const Sizes: Story = {
  decorators: narrow,
  render: () => (
    <div className="flex flex-col gap-4">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <PriceTicker
          key={size}
          size={size}
          label="Viewers"
          value={12480}
          reference={12170}
          sparkline={[11800, 11950, 12020, 12170, 12090, 12310, 12480]}
        />
      ))}
    </div>
  ),
};

/** The feed stopped: the value greys out and shows when it last updated. */
export const Stale: Story = {
  decorators: narrow,
  args: {
    updatedAt: '2026-03-14T09:26:53Z',
    staleAfterMs: 30_000,
    timeZone: 'UTC',
  },
};

/** One-line tickers, for a header or a TickerTape. */
export const Inline: Story = {
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <div className="flex flex-col items-start gap-3">
      <PriceTicker variant="inline" label="Viewers" value={12480} reference={12170} />
      <PriceTicker
        variant="inline"
        label="Solar wind (km/s)"
        value={431.2}
        reference={498.1}
        format={{ minimumFractionDigits: 1 }}
        sparkline={[512, 506, 497, 488, 470, 452, 431]}
      />
      <PriceTicker
        variant="inline"
        label="Kp index"
        value={4.33}
        reference={3.67}
        updatedAt="2026-03-14T09:26:53Z"
        staleAfterMs={30_000}
        timeZone="UTC"
      />
    </div>
  ),
};

const tapeItems = [
  { label: 'Viewers', value: 12480, reference: 12170 },
  { label: 'Solar wind (km/s)', value: 431.2, reference: 498.1 },
  { label: 'Kp index', value: 4.33, reference: 3.67 },
  { label: 'Sunspot number', value: 142, reference: 138 },
  { label: 'Comet brightness (mag)', value: 6.8, reference: 7.4, isUpBad: true },
  { label: 'Proton flux (pfu)', value: 2.4, reference: 2.9 },
  { label: 'Dst index (nT)', value: -21, reference: -18 },
];

/**
 * A scrolling row that pauses on hover or focus and has a pause toggle. Under reduced motion (as in the visual
 * tests) it's a static list that wraps.
 */
export const Tape: Story = {
  decorators: [
    (Story) => (
      <div className="max-w-3xl">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <TickerTape label="Space weather">
      {tapeItems.map((item) => (
        <PriceTicker key={item.label} variant="inline" size="sm" {...item} />
      ))}
    </TickerTape>
  ),
};

/** Thirty tickers updating every 500 ms with flashes; the figures are tabular, so nothing shifts. */
export const Live: Story = {
  tags: ['!visual'],
  decorators: [
    (Story) => (
      <div className="max-w-5xl">
        <Story />
      </div>
    ),
  ],
  render: function LiveTickers() {
    const [tick, setTick] = useState(0);
    useEffect(() => {
      const handle = setInterval(() => {
        setTick((value) => value + 1);
      }, 500);
      return () => {
        clearInterval(handle);
      };
    }, []);
    // A deterministic wobble per ticker, so the demo needs no random numbers.
    const valueAt = (index: number, step: number) =>
      100 + index * 7 + Math.round(Math.sin(step * 0.7 + index) * 40) / 10;
    return (
      <div className="flex flex-col gap-4">
        <TickerTape label="Live readings">
          {Array.from({ length: 8 }, (_, index) => (
            <PriceTicker
              key={index}
              variant="inline"
              size="sm"
              label={`Sensor ${String(index + 1)}`}
              value={valueAt(index, tick)}
              reference={100 + index * 7}
              format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
            />
          ))}
        </TickerTape>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3">
          {Array.from({ length: 30 }, (_, index) => (
            <PriceTicker
              key={index}
              size="sm"
              label={`Reading ${String(index + 1)}`}
              value={valueAt(index, tick)}
              reference={100 + index * 7}
              format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
              announceThreshold={index === 0 ? 3 : undefined}
            />
          ))}
        </div>
      </div>
    );
  },
};
