import { render, screen, within } from '@testing-library/react';
import { Chart } from 'chart.js';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { seeingSeries, seeingSites } from '../../test/moreCharts';
import { boxPlotStats, histogramBoxStats, quantile } from './boxPlot';
import { BoxPlotChart } from './BoxPlotChart';

const isPhone = window.matchMedia('(max-width: 639.98px)').matches;

function chartInstance() {
  return Chart.getChart(screen.getByRole<HTMLCanvasElement>('img'));
}

const skewed = [5, 1, 9, 2, 8, 3, 7, 4, 6, 100];

function Times() {
  return (
    <BoxPlotChart
      title="Response times"
      categories={['Archive', 'Pipeline']}
      series={[{ id: 'times', label: 'Times', data: [skewed, [10, 20, 30]] }]}
      unit="ms"
    />
  );
}

describe('boxPlotStats', () => {
  it('interpolates quartiles, ends the whiskers within 1.5 IQR and keeps the rest as outliers', () => {
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(boxPlotStats(skewed)).toEqual({
      min: 1,
      q1: 3.25,
      median: 5.5,
      q3: 7.75,
      max: 9,
      mean: 14.5,
      outliers: [100],
      count: 10,
    });
    expect(boxPlotStats([Number.NaN])).toBeUndefined();
  });

  it('estimates a summary from histogram buckets', () => {
    expect(
      histogramBoxStats([
        { le: 10, count: 2 },
        { le: 20, count: 2 },
      ]),
    ).toEqual({ min: 0, q1: 5, median: 10, q3: 15, max: 20, count: 4 });
    expect(histogramBoxStats([{ le: 10, count: 0 }])).toBeUndefined();
  });
});

describe('BoxPlotChart', () => {
  it('summarises each series’ highest and lowest median', () => {
    render(<Times />);
    expect(screen.getByRole('img', { name: 'Response times' })).toHaveAccessibleDescription(
      '2 categories. Times: highest median Pipeline (20 ms), lowest median Archive (5.5 ms).',
    );
  });

  it('draws boxes from quartile to quartile, with the axis stretched to the outliers', async () => {
    render(<Times />);
    await expect.poll(() => chartInstance()?.data.datasets[0]?.data.length).toBe(2);
    const chart = chartInstance();
    expect(chart?.data.datasets[0]?.data).toEqual([
      [3.25, 7.75],
      [15, 25],
    ]);
    expect(chart?.options.plugins?.boxPlot?.stats?.[0]?.[0]?.outliers).toEqual([100]);
    expect(chart?.scales.y?.max).toBeGreaterThanOrEqual(100);
  });

  it('puts series side by side and hides one from the legend', async () => {
    render(<BoxPlotChart title="Seeing" categories={seeingSites} series={seeingSeries} />);
    await expect.poll(() => chartInstance()?.data.datasets.length).toBe(2);
    const legend = screen.getByRole('list', { name: 'Series' });
    await userEvent.click(within(legend).getByRole('button', { name: 'Winter' }));
    await expect.poll(() => chartInstance()?.data.datasets[1]?.hidden).toBe(true);
  });

  it('runs horizontally on request', async () => {
    render(
      <BoxPlotChart
        title="Seeing"
        categories={seeingSites}
        series={seeingSeries}
        orientation="horizontal"
      />,
    );
    await expect.poll(() => chartInstance()?.options.indexAxis).toBe('y');
  });

  it('lists the five numbers in the table view', async () => {
    render(<Times />);
    await userEvent.click(screen.getByRole('button', { name: 'View as table' }));
    const table = screen.getByRole(isPhone ? 'list' : 'table', { name: 'Response times' });
    expect(within(table).getByText('5.5')).toBeInTheDocument();
    if (!isPhone) {
      expect(within(table).getByRole('columnheader', { name: 'Median (ms)' })).toBeInTheDocument();
      expect(within(table).getByRole('columnheader', { name: 'Outliers' })).toBeInTheDocument();
    }
  });

  it('shows the empty state without any groups', () => {
    render(
      <BoxPlotChart
        title="Nothing"
        categories={['A']}
        series={[{ id: 'a', label: 'A', data: [null] }]}
      />,
    );
    expect(screen.getByRole('heading', { name: 'No data' })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <BoxPlotChart title="Seeing" categories={seeingSites} series={seeingSeries} />,
    );
    await expectNoAxeViolations(container);
  });
});
