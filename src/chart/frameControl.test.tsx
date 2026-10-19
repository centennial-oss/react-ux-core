// What a dashboard widget needs of a chart's frame and time axis (§20): the toolbar's actions offered through a host's
// own menu, a plot that fills its container, and a visible time window independent of the data.
import { act, render, screen } from '@testing-library/react';
import { Chart } from 'chart.js';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { UIProvider } from '../provider/UIProvider';
import type { ChartFrameAction } from './ChartFrame';
import { TimeSeriesChart, type TimeSeries } from './TimeSeriesChart';

const T0 = Date.UTC(2026, 9, 12);
const HOUR = 3_600_000;
const series: TimeSeries[] = [
  {
    id: 'load',
    label: 'Load',
    data: [
      { t: T0 + 2 * HOUR, v: 1 },
      { t: T0 + 3 * HOUR, v: 2 },
    ],
  },
];

const canvasOf = async () => screen.findByRole<HTMLCanvasElement>('img', { name: 'Load' });

describe('ChartFrame: actions in a host’s menu (WID-08)', () => {
  it('hides the toolbar and reports its actions, which work from outside', async () => {
    const onActionsChange = vi.fn<(actions: readonly ChartFrameAction[]) => void>();
    const { unmount } = render(
      <UIProvider locale="en-US">
        <TimeSeriesChart
          title="Load"
          series={series}
          timeZone="UTC"
          exportFileName="load"
          hasToolbar={false}
          onActionsChange={onActionsChange}
        />
      </UIProvider>,
    );
    const canvas = await canvasOf();
    expect(screen.queryByRole('button', { name: 'View as table' })).toBeNull();
    const labels = () => onActionsChange.mock.calls.at(-1)?.[0].map((action) => action.label);
    expect(labels()).toEqual(['View as table', 'Export: Image (PNG)', 'Export: Data (CSV)']);
    act(() => {
      onActionsChange.mock.calls.at(-1)?.[0][0]?.onAction();
    });
    // The table view replaces the plot (as rows or, on phones, cards).
    await expect.poll(() => canvas.parentElement?.classList.contains('hidden')).toBe(true);
    expect(labels()).toEqual(['View as chart', 'Export: Image (PNG)', 'Export: Data (CSV)']);
    unmount();
    expect(onActionsChange).toHaveBeenLastCalledWith([]);
  });

  it('fills its container’s height with `100%`', async () => {
    render(
      <UIProvider locale="en-US">
        <div className="flex h-[300px] flex-col">
          <TimeSeriesChart title="Load" series={series} timeZone="UTC" height="100%" />
        </div>
      </UIProvider>,
    );
    const canvas = await canvasOf();
    const box = canvas.parentElement;
    expect(box?.getBoundingClientRect().height).toBeGreaterThan(150);
    // The plot, its toolbar and legend stay inside the container.
    const frame = box?.parentElement;
    expect(frame?.getBoundingClientRect().height).toBeLessThanOrEqual(300);
  });
});

describe('TimeSeriesChart: visible time window (BI-01)', () => {
  it('shows the window it’s given, even where the data doesn’t reach, and follows a new one', async () => {
    function Windowed() {
      const [range, setRange] = useState<readonly [number, number]>([T0, T0 + 6 * HOUR]);
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setRange([T0, T0 + 12 * HOUR]);
            }}
          >
            Wider
          </button>
          <TimeSeriesChart title="Load" series={series} timeZone="UTC" xRange={range} />
        </>
      );
    }
    render(
      <UIProvider locale="en-US">
        <Windowed />
      </UIProvider>,
    );
    const canvas = await canvasOf();
    await expect.poll(() => Chart.getChart(canvas)?.scales.x?.min).toBe(T0);
    expect(Chart.getChart(canvas)?.scales.x?.max).toBe(T0 + 6 * HOUR);
    act(() => {
      screen.getByRole('button', { name: 'Wider' }).click();
    });
    await expect.poll(() => Chart.getChart(canvas)?.scales.x?.max).toBe(T0 + 12 * HOUR);
  });
});
