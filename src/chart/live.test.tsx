import { render, screen } from '@testing-library/react';
import { Chart } from 'chart.js';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { domes, LIVE_START, trackingHistory } from '../../test/charts';
import { LiveTimeSeries, liveTrend, type LiveTimeSeriesHandle } from './LiveTimeSeries';

const isDesktop = window.innerWidth >= 1024;
const isTouch = navigator.maxTouchPoints > 0;

function chartInstance() {
  return Chart.getChart(screen.getByRole<HTMLCanvasElement>('img'));
}

function lengths() {
  return chartInstance()?.data.datasets.map((dataset) => dataset.data.length);
}

function summary() {
  const canvas = screen.getByRole('img');
  return document.getElementById(canvas.getAttribute('aria-describedby') ?? '')?.textContent ?? '';
}

function Live(props: Partial<React.ComponentProps<typeof LiveTimeSeries>>) {
  return (
    <LiveTimeSeries
      title="Tracking error"
      series={domes}
      windowMs={60_000}
      defaultData={trackingHistory(60)}
      timeZone="UTC"
      {...props}
    />
  );
}

describe('liveTrend', () => {
  it('reads rising, falling and steady over the window', () => {
    const points = (values: number[]) => values.map((y, x) => ({ x, y }));
    expect(liveTrend(points([1, 2, 3, 4]), 0)).toBe('rising');
    expect(liveTrend(points([4, 3, 2, 1]), 0)).toBe('falling');
    expect(liveTrend(points([2, 2.05, 1.98, 2.01]), 0)).toBe('steady');
    // Only the window counts.
    expect(liveTrend(points([9, 1, 1, 1]), 1)).toBe('steady');
  });
});

describe('LiveTimeSeries', () => {
  it('starts from its history, with a summary of each series', async () => {
    render(<Live />);
    await expect.poll(() => lengths()).toEqual([600, 600, 600]);
    expect(summary()).toEqual(
      expect.stringMatching(/^North dome [\d.]+ ″, (steady|rising|falling)\./),
    );
    expect(summary()).toEqual(expect.stringContaining('West dome'));
  });

  it('appends through its handle on the next frame and drops points past retainMs', async () => {
    const handle = createRef<LiveTimeSeriesHandle>();
    render(<Live handleRef={handle} windowMs={1000} retainMs={2000} defaultData={{}} />);
    for (let step = 0; step < 50; step++) {
      handle.current?.append('north', [{ t: LIVE_START + step * 100, v: step }]);
    }
    // 2 s of points at 10 a second (both ends included).
    await expect.poll(() => lengths()?.[0]).toBe(21);
    const scale = chartInstance()?.scales.x;
    expect(scale?.max).toBe(LIVE_START + 4900);
    expect(scale?.min).toBe(LIVE_START + 3900);
    handle.current?.clear();
    await expect.poll(() => lengths()?.[0]).toBe(0);
  });

  it('refreshes its summary at most every 10 seconds', async () => {
    const handle = createRef<LiveTimeSeriesHandle>();
    // A pointer left over the chart by an earlier test would pause it; this test is about the summary.
    render(<Live handleRef={handle} shouldPauseOnInspect={false} />);
    await expect.poll(() => lengths()?.[0]).toBe(600);
    // Let the first frames run, so the next points arrive after the chart has settled.
    for (let frame = 0; frame < 3; frame++) {
      await new Promise(requestAnimationFrame);
    }
    const before = summary();
    handle.current?.append('north', [{ t: LIVE_START + 60_000, v: 99 }]);
    // Wait for the point itself (not a count, which pruning can hold steady); frames run late on a busy machine.
    await expect
      .poll(
        () => (chartInstance()?.data.datasets[0]?.data.at(-1) as { x: number } | undefined)?.x,
        {
          timeout: 5000,
        },
      )
      .toBe(LIVE_START + 60_000);
    expect(summary()).toBe(before);
  });

  it('pauses with its button, counts new points, and catches up on Resume', async () => {
    const handle = createRef<LiveTimeSeriesHandle>();
    const onPausedChange = vi.fn();
    render(
      <Live handleRef={handle} shouldPauseOnInspect={false} onPausedChange={onPausedChange} />,
    );
    await expect.poll(() => lengths()?.[0]).toBe(600);
    await userEvent.click(screen.getByRole('button', { name: 'Pause updates' }));
    expect(onPausedChange).toHaveBeenLastCalledWith(true);
    for (let step = 0; step < 5; step++) {
      handle.current?.append('north', [{ t: LIVE_START + 60_000 + step * 100, v: 1 }]);
    }
    await expect.poll(() => screen.queryByText('Paused, 5 new points')).not.toBeNull();
    expect(lengths()?.[0]).toBe(600);
    await userEvent.click(screen.getByRole('button', { name: 'Resume' }));
    expect(onPausedChange).toHaveBeenLastCalledWith(false);
    await expect.poll(() => lengths()?.[0]).toBe(605);
    expect(screen.getByRole('button', { name: 'Pause updates' })).toBeInTheDocument();
  });

  it.skipIf(!isDesktop)('pauses while the plot is hovered', async () => {
    render(<Live />);
    await expect.poll(() => lengths()?.[0]).toBe(600);
    await userEvent.hover(screen.getByRole('img'));
    await expect.poll(() => screen.queryByText('Paused')).not.toBeNull();
    await userEvent.unhover(screen.getByRole('img'));
    await expect.poll(() => screen.queryByText('Paused')).toBeNull();
  });

  it.skipIf(!isTouch)('pauses when the plot is touched, until Resume', async () => {
    render(<Live />);
    await expect.poll(() => lengths()?.[0]).toBe(600);
    await commands.tap('canvas');
    await expect.poll(() => screen.queryByText('Paused')).not.toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Resume' }));
    await expect.poll(() => screen.queryByText('Paused')).toBeNull();
  });

  it('has no accessibility violations, running or paused', async () => {
    const { container, rerender } = render(<Live />);
    await expect.poll(() => lengths()?.[0]).toBe(600);
    await expectNoAxeViolations(container);
    rerender(<Live isPaused />);
    await expectNoAxeViolations(container);
  });
});
