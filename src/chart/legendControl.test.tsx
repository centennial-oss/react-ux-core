// The legend controls a dashboard's consolidated legend needs (§20): hidden and highlighted series controlled from
// outside, the built-in legend hidden with the summary kept, and the series colours charts use.
import { render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { UIProvider } from '../provider/UIProvider';
import { CategoryChart } from './CategoryChart';
import { readPalette, seriesColor } from './colors';
import { TimeSeriesChart, type TimeSeries } from './TimeSeriesChart';

const T0 = Date.UTC(2026, 9, 12);
const series: TimeSeries[] = [
  {
    id: 'north',
    label: 'North',
    data: [
      { t: T0, v: 1 },
      { t: T0 + 3_600_000, v: 2 },
    ],
  },
  {
    id: 'south',
    label: 'South',
    data: [
      { t: T0, v: 3 },
      { t: T0 + 3_600_000, v: 4 },
    ],
  },
];

describe('controlled legend state (§20)', () => {
  it('follows hidden series given by the app, and reports toggles', async () => {
    const onHiddenSeriesChange = vi.fn();
    function Controlled() {
      const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set(['south']));
      return (
        <TimeSeriesChart
          title="Load"
          series={series}
          timeZone="UTC"
          hiddenSeries={hidden}
          onHiddenSeriesChange={(ids) => {
            onHiddenSeriesChange(ids);
            setHidden(ids);
          }}
        />
      );
    }
    render(
      <UIProvider>
        <Controlled />
      </UIProvider>,
    );
    expect(screen.getByRole('button', { name: 'South' }).getAttribute('aria-pressed')).toBe(
      'false',
    );
    await userEvent.click(screen.getByRole('button', { name: 'North' }));
    expect(onHiddenSeriesChange).toHaveBeenCalledWith(new Set(['south', 'north']));
    expect(screen.getByRole('button', { name: 'North' }).getAttribute('aria-pressed')).toBe(
      'false',
    );
  });

  it('reports highlights, and stays put when the app controls them', async () => {
    const onHighlightedSeriesChange = vi.fn();
    render(
      <UIProvider>
        <CategoryChart
          type="bar"
          title="Sites"
          categories={['A', 'B']}
          series={[
            { id: 'x', label: 'X', data: [1, 2] },
            { id: 'y', label: 'Y', data: [3, 4] },
          ]}
          highlightedSeries="x"
          onHighlightedSeriesChange={onHighlightedSeriesChange}
        />
      </UIProvider>,
    );
    await userEvent.hover(screen.getByRole('button', { name: 'Y' }));
    expect(onHighlightedSeriesChange).toHaveBeenCalledWith('y');
  });

  it('hides the built-in legend and keeps the summary (hasLegend)', () => {
    render(
      <UIProvider>
        <TimeSeriesChart title="Load" series={series} timeZone="UTC" hasLegend={false} />
      </UIProvider>,
    );
    expect(screen.queryByRole('list', { name: 'Series' })).toBeNull();
    const canvas = screen.getByRole('img', { name: 'Load' });
    const summary = document.getElementById(canvas.getAttribute('aria-describedby') ?? '');
    expect(summary?.textContent).toContain('2 series');
  });
});

describe('seriesColor (§20)', () => {
  it('gives the colour charts draw a series with, by position or its own colour', () => {
    const palette = readPalette(document.documentElement);
    expect(seriesColor(undefined, 1)).toBe(palette.series(undefined, 1));
    expect(seriesColor('chart-3', 0)).toBe(palette.series('chart-3', 0));
    expect(seriesColor('danger', 0)).toBe(palette.tone('danger'));
  });
});
