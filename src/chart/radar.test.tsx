import { render, screen, within } from '@testing-library/react';
import { Chart } from 'chart.js';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { instrumentAxes, instrumentScores } from '../../test/moreCharts';
import { CategoryChart } from './CategoryChart';

const isPhone = window.matchMedia('(max-width: 639.98px)').matches;

function chartInstance() {
  return Chart.getChart(screen.getByRole<HTMLCanvasElement>('img'));
}

function chartType() {
  return (chartInstance()?.config as { type?: string } | undefined)?.type;
}

function pointStyleOf(index: number) {
  return (chartInstance()?.data.datasets[index] as { pointStyle?: unknown } | undefined)
    ?.pointStyle;
}

function Instruments({ type = 'radar' }: { type?: 'radar' | 'polarArea' }) {
  return (
    <CategoryChart
      type={type}
      title="Instrument comparison"
      categories={instrumentAxes}
      series={instrumentScores}
      valueAxis={{ min: 0, max: 5, title: 'Score' }}
    />
  );
}

describe('CategoryChart radar', () => {
  it('summarises each series’ best and worst category', () => {
    render(<Instruments />);
    expect(screen.getByRole('img', { name: 'Instrument comparison' })).toHaveAccessibleDescription(
      '6 categories. Echelle spectrograph: highest Resolution (4.6), lowest Field of view (1.4). Wide-field imager: highest Field of view (4.8), lowest Resolution (2.4). Axis: Score.',
    );
  });

  it('draws every series over one spoke per category, on the given range', async () => {
    render(<Instruments />);
    await expect.poll(() => chartType()).toBe('radar');
    const chart = chartInstance();
    expect(chart?.data.labels).toEqual(instrumentAxes);
    expect(chart?.data.datasets).toHaveLength(2);
    expect(chart?.scales.r?.min).toBe(0);
    expect(chart?.scales.r?.max).toBe(5);
    expect(pointStyleOf(0)).not.toBe(pointStyleOf(1));
  });

  it('hides a series from the legend', async () => {
    render(<Instruments />);
    const legend = screen.getByRole('list', { name: 'Series' });
    await userEvent.click(within(legend).getByRole('button', { name: 'Wide-field imager' }));
    await expect.poll(() => chartInstance()?.data.datasets[1]?.hidden).toBe(true);
  });

  it('lists the scores in the table view', async () => {
    render(<Instruments />);
    await userEvent.click(screen.getByRole('button', { name: 'View as table' }));
    const table = screen.getByRole(isPhone ? 'list' : 'table', { name: 'Instrument comparison' });
    expect(within(table).getByText('Cadence')).toBeInTheDocument();
    expect(within(table).getByText('4.8')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Instruments />);
    await expectNoAxeViolations(container);
  });
});

describe('CategoryChart polar area', () => {
  it('shows the first series as one wedge per category, with the categories as its legend', async () => {
    render(<Instruments type="polarArea" />);
    await expect.poll(() => chartType()).toBe('polarArea');
    expect(chartInstance()?.data.datasets).toHaveLength(1);
    expect(chartInstance()?.data.datasets[0]?.data).toEqual([4.6, 3.8, 1.4, 2.2, 4.1, 2.0]);
    const legend = screen.getByRole('list', { name: 'Series' });
    expect(within(legend).getAllByRole('button')).toHaveLength(6);
    await userEvent.click(within(legend).getByRole('button', { name: 'Uptime' }));
    await expect.poll(() => chartInstance()?.data.datasets[0]?.data[4]).toBe(0);
  });

  it('summarises only the series it shows', () => {
    render(<Instruments type="polarArea" />);
    expect(screen.getByRole('img')).toHaveAccessibleDescription(
      '6 categories. Echelle spectrograph: highest Resolution (4.6), lowest Field of view (1.4). Axis: Score.',
    );
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Instruments type="polarArea" />);
    await expectNoAxeViolations(container);
  });
});
