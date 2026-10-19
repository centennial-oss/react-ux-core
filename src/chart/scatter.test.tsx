import { render, screen, within } from '@testing-library/react';
import { Chart } from 'chart.js';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { sites, sitesScatter } from '../../test/moreCharts';
import { bubbleRadius, correlation, ScatterChart } from './ScatterChart';

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

function Sites({ isBubble = false }: { isBubble?: boolean }) {
  return (
    <ScatterChart
      title="Candidate sites"
      series={isBubble ? sites : sitesScatter}
      xAxis={{ title: 'Altitude', unit: 'm' }}
      yAxis={{ title: 'Clear nights' }}
      sizeLabel="Mirror"
      sizeUnit="m"
    />
  );
}

describe('correlation', () => {
  it('is 1 or -1 for points on a line, and undefined for too few points or no spread', () => {
    expect(
      correlation([
        { x: 1, y: 2 },
        { x: 2, y: 4 },
        { x: 3, y: 6 },
      ]),
    ).toBeCloseTo(1);
    expect(
      correlation([
        { x: 1, y: 3 },
        { x: 2, y: 2 },
        { x: 3, y: 1 },
      ]),
    ).toBeCloseTo(-1);
    expect(
      correlation([
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ]),
    ).toBeUndefined();
    expect(
      correlation([
        { x: 1, y: 5 },
        { x: 2, y: 5 },
        { x: 3, y: 5 },
      ]),
    ).toBeUndefined();
  });
});

describe('bubbleRadius', () => {
  it('makes areas proportional to size, between the smallest and largest radius', () => {
    expect(bubbleRadius(100, 100, 3, 23)).toBe(23);
    expect(bubbleRadius(25, 100, 3, 23)).toBe(13);
    expect(bubbleRadius(0, 100, 3, 23)).toBe(3);
    expect(bubbleRadius(5, 0, 3, 23)).toBe(3);
  });
});

describe('ScatterChart', () => {
  it('summarises each series’ ranges and correlation, named by the axis titles', () => {
    render(<Sites />);
    const description = screen.getByRole('img', { name: 'Candidate sites' });
    expect(description).toHaveAccessibleDescription(
      /^11 points in 2 series\. Northern sites: Altitude from 1,200 m to 3,300 m, Clear nights from 168 to 296\. Strong positive correlation \(r = 0\.\d+\)\. Southern sites: Altitude from 950 m to 4,100 m/,
    );
  });

  it('is a scatter chart without sizes and a bubble chart with them', async () => {
    const { unmount } = render(<Sites />);
    await expect.poll(() => chartType()).toBe('scatter');
    unmount();
    render(<Sites isBubble />);
    await expect.poll(() => chartType()).toBe('bubble');
    const radii = (chartInstance()?.data.datasets[1]?.data ?? []) as { r: number }[];
    // Altiplano Sur has the largest mirror, Valle Hondo the smallest.
    expect(Math.max(...radii.map((point) => point.r))).toBe(radii[0]?.r);
    expect(Math.min(...radii.map((point) => point.r))).toBe(radii[2]?.r);
  });

  it('gives each series its own point shape as well as colour', async () => {
    render(<Sites />);
    await expect.poll(() => chartInstance()?.data.datasets.length).toBe(2);
    const [first, second] = chartInstance()?.data.datasets ?? [];
    expect(pointStyleOf(0)).not.toBe(pointStyleOf(1));
    expect(first?.borderColor).not.toBe(second?.borderColor);
  });

  it('hides a series from the legend', async () => {
    render(<Sites />);
    const legend = screen.getByRole('list', { name: 'Series' });
    await userEvent.click(within(legend).getByRole('button', { name: 'Southern sites' }));
    await expect.poll(() => chartInstance()?.data.datasets[1]?.hidden).toBe(true);
  });

  it('lists every point in the table view, with sizes for bubbles', async () => {
    render(<Sites isBubble />);
    await userEvent.click(screen.getByRole('button', { name: 'View as table' }));
    const table = screen.getByRole(isPhone ? 'list' : 'table', { name: 'Candidate sites' });
    expect(within(table).getByText('Sierra Clara')).toBeInTheDocument();
    expect(within(table).getByText('4,100')).toBeInTheDocument();
    if (!isPhone) {
      expect(within(table).getByRole('columnheader', { name: 'Altitude (m)' })).toBeInTheDocument();
      expect(within(table).getByRole('columnheader', { name: 'Mirror (m)' })).toBeInTheDocument();
    }
  });

  it('uses a logarithmic axis on request', async () => {
    render(
      <ScatterChart
        title="Targets"
        series={[
          {
            id: 'a',
            label: 'A',
            data: [
              { x: 1, y: 1 },
              { x: 1_000, y: 2 },
            ],
          },
        ]}
        xAxis={{ scale: 'log' }}
      />,
    );
    await expect.poll(() => chartInstance()?.scales.x?.type).toBe('logarithmic');
  });

  it('fits a phone without scrolling sideways', async () => {
    render(
      <div className="p-4">
        <Sites isBubble />
      </div>,
    );
    await expect.poll(() => chartInstance()?.chartArea.width ?? 0).toBeGreaterThan(0);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Sites isBubble />);
    await expectNoAxeViolations(container);
  });
});
