import { render, screen, within } from '@testing-library/react';
import { Chart } from 'chart.js';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { CategoryChart } from './CategoryChart';
import { TimeSeriesChart, type TimeSeries } from './TimeSeriesChart';

const START = Date.UTC(2026, 2, 1, 7);
const HOUR = 3_600_000;

const usage: TimeSeries = {
  id: 'usage',
  label: 'Usage',
  unit: 'kW',
  data: [10, 30, 20, 40].map((v, index) => ({ t: START + index * HOUR, v })),
};
const temperature: TimeSeries = {
  id: 'temperature',
  label: 'Temperature',
  unit: '°C',
  axis: 'right',
  data: [5, 6, 7, 8].map((v, index) => ({ t: START + index * HOUR, v })),
};

function chartInstance() {
  const canvas = screen.getByRole('img');
  return Chart.getChart(canvas as HTMLCanvasElement);
}

describe('TimeSeriesChart', () => {
  it('draws on a canvas named by the title and described by a generated summary', async () => {
    render(<TimeSeriesChart title="Load" series={[usage, temperature]} timeZone="UTC" />);
    const canvas = screen.getByRole('img', { name: 'Load' });
    await expect.poll(() => chartInstance()?.data.datasets.length).toBe(2);
    expect(canvas).toHaveAccessibleDescription(
      '2 series from Mar 1, 2026, 7:00 AM to Mar 1, 2026, 10:00 AM. Usage: from 10 kW to 40 kW, latest 40 kW. Temperature: from 5 °C to 8 °C, latest 8 °C.',
    );
    expect(chartInstance()?.options.scales?.right?.display).toBe(true);
  });

  it('hides series from the legend', async () => {
    render(<TimeSeriesChart title="Load" series={[usage, temperature]} />);
    const legend = screen.getByRole('list', { name: 'Series' });
    const toggle = within(legend).getByRole('button', { name: 'Temperature' });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(() => chartInstance()?.isDatasetVisible(1)).toBe(false);
  });

  it('shows the data as a table and exports CSV', async () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    render(<TimeSeriesChart title="Load" series={[usage]} timeZone="UTC" exportFileName="load" />);
    await userEvent.click(screen.getByRole('button', { name: 'View as table' }));
    // Phones show the rows as cards.
    const isPhone = window.matchMedia('(max-width: 639.98px)').matches;
    const table = screen.getByRole(isPhone ? 'list' : 'table', { name: 'Load' });
    expect(within(table).getAllByRole(isPhone ? 'listitem' : 'row')).toHaveLength(isPhone ? 4 : 5);
    expect(within(table).getByText('Mar 1, 2026, 7:00 AM')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Export' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Data (CSV)' }));
    expect(click).toHaveBeenCalled();
    const link = click.mock.contexts.at(-1) as HTMLAnchorElement;
    expect(link.download).toBe('load.csv');
    click.mockRestore();
  });

  it('shows loading, empty and error states', async () => {
    const onRetry = vi.fn();
    const { rerender } = render(<TimeSeriesChart title="Load" series={[]} isLoading />);
    expect(screen.queryByRole('button', { name: 'View as table' })).toBeNull();
    rerender(<TimeSeriesChart title="Load" series={[{ ...usage, data: [] }]} />);
    expect(screen.getByRole('heading', { name: 'No data' })).toBeInTheDocument();
    rerender(<TimeSeriesChart title="Load" series={[]} error="Offline" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <TimeSeriesChart title="Load" series={[usage, temperature]} exportFileName="load" />,
    );
    await expectNoAxeViolations(container);
  });
});

describe('CategoryChart', () => {
  it('summarises the highest and lowest category', () => {
    render(
      <CategoryChart
        title="Energy"
        type="bar"
        unit="MWh"
        categories={['Jan', 'Feb', 'Mar']}
        series={[{ id: 'grid', label: 'Grid', data: [42, 38, 50] }]}
      />,
    );
    expect(screen.getByRole('img', { name: 'Energy' })).toHaveAccessibleDescription(
      '3 categories. Grid: highest Mar (50 MWh), lowest Feb (38 MWh).',
    );
  });

  it('draws horizontal and stacked bars', async () => {
    const { unmount } = render(
      <CategoryChart
        title="Sites"
        type="horizontalBar"
        categories={['A', 'B']}
        series={[{ id: 'n', label: 'Count', data: [1, 2] }]}
      />,
    );
    await expect.poll(() => chartInstance()?.options.indexAxis).toBe('y');
    unmount();
    render(
      <CategoryChart
        title="Mix"
        type="stackedBar"
        categories={['A', 'B']}
        series={[
          { id: 'x', label: 'X', data: [1, 2] },
          { id: 'y', label: 'Y', data: [3, 4] },
        ]}
      />,
    );
    await expect
      .poll(
        () => (chartInstance()?.options.scales?.y as { stacked?: boolean } | undefined)?.stacked,
      )
      .toBe(true);
  });

  it('toggles a donut’s categories from the legend', async () => {
    render(
      <CategoryChart
        title="Tariffs"
        type="donut"
        categories={['Flat', 'Time of use']}
        series={[{ id: 'sites', label: 'Sites', data: [120, 64] }]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Flat' }));
    await expect.poll(() => chartInstance()?.data.datasets[0]?.data).toEqual([0, 64]);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <CategoryChart
        title="Tariffs"
        type="donut"
        categories={['Flat', 'Time of use']}
        series={[{ id: 'sites', label: 'Sites', data: [120, 64] }]}
      />,
    );
    await expectNoAxeViolations(container);
  });
});
