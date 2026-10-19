import { render, screen, within } from '@testing-library/react';
import { Chart } from 'chart.js';
import { createRef, type ComponentProps } from 'react';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { starAverage, starCandles, starNews } from '../../test/plotCharts';
import { UIProvider } from '../provider/UIProvider';
import {
  applyCandleUpdates,
  CandlestickChart,
  type CandlestickChartHandle,
  type Ohlc,
} from './CandlestickChart';

const isDesktop = window.innerWidth >= 1024;
const isTouch = navigator.maxTouchPoints > 0;
const isPhone = window.matchMedia('(max-width: 639.98px)').matches;

function chartInstance() {
  return Chart.getChart(screen.getByRole<HTMLCanvasElement>('img'));
}

function summary() {
  const canvas = screen.getByRole('img');
  return document.getElementById(canvas.getAttribute('aria-describedby') ?? '')?.textContent ?? '';
}

/** Waits for the chart's first layout and its entry animation, so a pointer lands on settled candles. */
async function settled() {
  await expect.poll(() => chartInstance()?.chartArea.width ?? 0).toBeGreaterThan(0);
  await new Promise((resolve) => setTimeout(resolve, 400));
}

function readout(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-candle-readout]');
}

function candleAt(index: number): Ohlc {
  const candle = starCandles.at(index);
  if (!candle) {
    throw new Error(`No candle ${String(index)}`);
  }
  return candle;
}

const last = candleAt(-1);

function Candles(props: Partial<ComponentProps<typeof CandlestickChart>>) {
  return (
    <CandlestickChart
      title="STAR"
      label="STAR"
      data={starCandles}
      overlays={[starAverage]}
      currency="USD"
      timeZone="UTC"
      {...props}
    />
  );
}

describe('applyCandleUpdates', () => {
  const candles: Ohlc[] = [
    { t: 1, o: 1, h: 2, l: 0, c: 1.5 },
    { t: 2, o: 1.5, h: 3, l: 1, c: 2 },
  ];

  it('replaces the candle at an update’s time and adds later ones', () => {
    const next = applyCandleUpdates(candles, [
      { t: 2, o: 1.5, h: 4, l: 1, c: 3.5 },
      { t: 3, o: 3.5, h: 4, l: 3, c: 3.8 },
    ]);
    expect(next.map((candle) => candle.c)).toEqual([1.5, 3.5, 3.8]);
    expect(candles[1]?.c).toBe(2);
  });

  it('drops an update older than the latest candle with no candle at its time', () => {
    expect(applyCandleUpdates(candles, [{ t: 1.5, o: 1, h: 1, l: 1, c: 1 }])).toEqual(candles);
    expect(applyCandleUpdates(candles, [])).toBe(candles);
  });
});

describe('CandlestickChart', () => {
  it('draws candles as floating bars: a body over a thin wick, hollow when up and filled when down', async () => {
    render(<Candles />);
    await expect.poll(() => chartInstance()?.data.datasets.length).toBe(4);
    const [overlay, body, wick, volume] = chartInstance()?.data.datasets ?? [];
    expect(overlay?.label).toBe('50-day average');
    const first = candleAt(0);
    expect((body?.data[0] as unknown as { y: number[] }).y).toEqual([
      Math.min(first.o, first.c),
      Math.max(first.o, first.c),
    ]);
    expect((wick?.data[0] as unknown as { y: number[] }).y).toEqual([first.l, first.h]);
    expect(volume?.label).toBe('Volume');
    const up = starCandles.findIndex((candle) => candle.c > candle.o);
    const down = starCandles.findIndex((candle) => candle.c < candle.o);
    const fills = body?.backgroundColor as string[];
    expect(fills[up]).not.toBe(fills[down]);
    // Volume sits in its own pane below the prices.
    const scales = chartInstance()?.scales;
    expect(scales?.price?.bottom ?? 0).toBeLessThanOrEqual((scales?.volume?.top ?? 0) + 1);
  });

  it('summarises the range: open, close, change, high and low', () => {
    render(<Candles />);
    expect(summary()).toMatch(
      /^STAR from Oct 16, 2025 to Oct 15, 2026: opened at \$[\d,.]+ and closed at \$179\.46 \([+-][\d.]+%\)\. High \$[\d,.]+ on [A-Z][a-z]{2} \d+, 2026, low \$[\d,.]+ on [A-Z][a-z]{2} \d+, 20\d\d\.$/,
    );
  });

  it('shows the latest candle in the readout until the plot is inspected', () => {
    render(<Candles />);
    const shown = readout();
    expect(shown?.textContent).toEqual(expect.stringContaining('Oct 15, 2026'));
    expect(shown?.textContent).toEqual(expect.stringContaining(`C $${String(last.c)}`));
    expect(shown?.textContent).toEqual(expect.stringContaining('50-day average'));
  });

  it.skipIf(!isDesktop)('moves the crosshair readout to the candle under the pointer', async () => {
    render(<Candles />);
    await settled();
    const before = readout()?.dataset.candleReadout;
    await userEvent.hover(screen.getByRole('img'));
    // Chart.js handles pointer events on animation frames, which run late on a busy test machine.
    await expect.poll(() => readout()?.dataset.candleReadout, { timeout: 10_000 }).not.toBe(before);
    expect(chartInstance()?.tooltip?.getActiveElements().length).toBeGreaterThan(0);
  });

  it.skipIf(!isTouch)('moves the crosshair readout to the candle that was touched', async () => {
    render(<Candles />);
    await settled();
    const before = readout()?.dataset.candleReadout;
    // A touch at the middle of the plot, dispatched on the canvas itself: a real tap goes by page coordinates, which
    // other test files sharing the browser can intercept.
    const canvas = screen.getByRole('img');
    const box = canvas.getBoundingClientRect();
    const touch = new Touch({
      identifier: 1,
      target: canvas,
      clientX: box.left + box.width / 2,
      clientY: box.top + box.height / 2,
    });
    canvas.dispatchEvent(
      new TouchEvent('touchstart', {
        touches: [touch],
        targetTouches: [touch],
        changedTouches: [touch],
        bubbles: true,
        cancelable: true,
      }),
    );
    // Chart.js handles pointer events on animation frames, which run late on a busy test machine.
    await expect.poll(() => readout()?.dataset.candleReadout, { timeout: 10_000 }).not.toBe(before);
  });

  it('updates the last candle through its handle, and adds the next one', async () => {
    const handle = createRef<CandlestickChartHandle>();
    render(<Candles handleRef={handle} />);
    handle.current?.update({ ...last, h: 250, c: 249.5 });
    await expect.poll(() => readout()?.textContent).toEqual(expect.stringContaining('$249.50'));
    expect(chartInstance()?.data.datasets[2]?.data).toHaveLength(starCandles.length);
    handle.current?.update({ t: Number(last.t) + 86_400_000, o: 249.5, h: 251, l: 248, c: 250 });
    await expect
      .poll(() => chartInstance()?.data.datasets[2]?.data.length)
      .toBe(starCandles.length + 1);
  });

  it('draws OHLC bars and a closing line', async () => {
    const { rerender } = render(<Candles style="ohlc" overlays={[]} />);
    await expect
      .poll(() => chartInstance()?.options.plugins?.ohlcTicks?.ticks?.length)
      .toBe(starCandles.length);
    rerender(<Candles style="line" overlays={[]} hasVolume={false} />);
    await expect.poll(() => chartInstance()?.data.datasets.length).toBe(1);
    expect(chartInstance()?.data.datasets[0]?.type).toBe('line');
  });

  it('has no volume pane when the data has no volumes', async () => {
    render(<Candles data={starCandles.map(({ v: _v, ...candle }) => candle)} overlays={[]} />);
    await expect.poll(() => chartInstance()?.data.datasets.length).toBe(2);
    expect(chartInstance()?.scales.volume).toBeUndefined();
  });

  it('marks events on the time axis', async () => {
    render(<Candles events={starNews} />);
    await expect
      .poll(() => document.querySelectorAll('[data-event-marker]').length)
      .toBeGreaterThan(0);
    expect(summary()).toEqual(expect.stringContaining('3 events:'));
  });

  it('lists OHLCV in the table view', async () => {
    render(<Candles data={starCandles.slice(-5)} overlays={[]} />);
    await userEvent.click(screen.getByRole('button', { name: 'View as table' }));
    const table = screen.getByRole(isPhone ? 'list' : 'table', { name: 'STAR' });
    expect(within(table).getAllByText(`$${String(last.c)}`).length).toBeGreaterThan(0);
    if (!isPhone) {
      for (const header of ['Open', 'High', 'Low', 'Close', 'Change', 'Volume']) {
        expect(within(table).getByRole('columnheader', { name: header })).toBeInTheDocument();
      }
      expect(within(table).getAllByRole('row')).toHaveLength(6);
    }
  });

  it('takes the app’s strings from UIProvider', () => {
    render(
      <UIProvider messages={{ candleCloseShort: 'Close' }}>
        <Candles />
      </UIProvider>,
    );
    expect(readout()?.textContent).toEqual(expect.stringContaining('Close $'));
  });

  it('fits a phone without scrolling sideways', async () => {
    render(
      <div className="p-4">
        <Candles events={starNews} />
      </div>,
    );
    await expect.poll(() => chartInstance()?.chartArea.width ?? 0).toBeGreaterThan(0);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Candles events={starNews} />);
    await expectNoAxeViolations(container);
  });
});
