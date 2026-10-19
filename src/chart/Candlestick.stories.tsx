import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef } from 'react';
import { starAverage, starCandles, starNews } from '../../test/plotCharts';
import { CandlestickChart, type CandlestickChartHandle } from './CandlestickChart';

const meta = {
  title: 'Chart/Candlestick',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A year of daily candles for the fictional STAR index, with volume in a pane below and a 50-day average. Up candles
 * are hollow, down candles filled. Hover or touch the plot for the crosshair: the readout above shows that day's
 * open, high, low, close, change and volume. Pinch, Ctrl+wheel or drag to zoom; Reset zoom returns.
 */
export const DailyCandles: Story = {
  render: () => (
    <CandlestickChart
      title="STAR"
      description="Daily, last 12 months, UTC"
      label="STAR"
      data={starCandles}
      overlays={[starAverage]}
      events={starNews}
      currency="USD"
      timeZone="UTC"
      onRangeSelect={() => undefined}
      exportFileName="star-daily"
      height="22rem"
    />
  ),
};

/** OHLC bars: the open ticks left, the close right. The last three months. */
export const OhlcBars: Story = {
  render: () => (
    <CandlestickChart
      title="STAR"
      description="Daily, last 3 months"
      label="STAR"
      data={starCandles.slice(-65)}
      style="ohlc"
      timeZone="UTC"
    />
  ),
};

/** A line of closes, without volume. */
export const CloseLine: Story = {
  render: () => (
    <CandlestickChart
      title="STAR"
      label="STAR"
      data={starCandles}
      style="line"
      hasVolume={false}
      overlays={[starAverage]}
      timeZone="UTC"
    />
  ),
};

/** A month of candles, close enough to see each body and wick, without volume. */
export const OneMonth: Story = {
  render: () => (
    <CandlestickChart
      title="STAR"
      label="STAR"
      data={starCandles.slice(-22)}
      hasVolume={false}
      timeZone="UTC"
    />
  ),
};

function Streaming() {
  const handle = useRef<CandlestickChartHandle>(null);
  useEffect(() => {
    // The last candle ticks on animation frames (the story's clock, not the chart's).
    const last = starCandles.at(-1);
    if (!last) {
      return;
    }
    let frame = requestAnimationFrame(function step(now) {
      const close = last.c * (1 + Math.sin(now / 900) * 0.01);
      handle.current?.update({
        ...last,
        c: Math.round(close * 100) / 100,
        h: Math.max(last.h, close),
        l: Math.min(last.l, close),
      });
      frame = requestAnimationFrame(step);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <CandlestickChart
      title="STAR"
      description="Today's candle updates live"
      label="STAR"
      data={starCandles.slice(-30)}
      handleRef={handle}
      currency="USD"
      timeZone="UTC"
    />
  );
}

/** Live: the last candle updates through the handle. */
export const Live: Story = {
  tags: ['!visual'],
  render: () => <Streaming />,
};
