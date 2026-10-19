import { render, screen, within } from '@testing-library/react';
import { Chart } from 'chart.js';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { budgetBridge } from '../../test/plotCharts';
import { UIProvider } from '../provider/UIProvider';
import { CategoryChart } from './CategoryChart';
import { waterfallBars } from './Waterfall';

const isPhone = window.matchMedia('(max-width: 639.98px)').matches;

function chartInstance() {
  return Chart.getChart(screen.getByRole<HTMLCanvasElement>('img'));
}

function Bridge(props: { orientation?: 'auto' | 'vertical' | 'horizontal' }) {
  return (
    <CategoryChart
      type="waterfall"
      title="Observatory budget"
      steps={budgetBridge}
      unit="USD"
      {...props}
    />
  );
}

describe('waterfallBars', () => {
  it('floats deltas from the running total and starts totals at zero', () => {
    expect(
      waterfallBars([
        { label: 'Start', value: 100, kind: 'total' },
        { label: 'Up', value: 30 },
        { label: 'Down', value: -50 },
        { label: 'End', value: 80, kind: 'total' },
      ]),
    ).toEqual([
      { label: 'Start', kind: 'total', start: 0, end: 100, change: 100, total: 100 },
      { label: 'Up', kind: 'increase', start: 100, end: 130, change: 30, total: 130 },
      { label: 'Down', kind: 'decrease', start: 130, end: 80, change: -50, total: 80 },
      { label: 'End', kind: 'total', start: 0, end: 80, change: 80, total: 80 },
    ]);
  });
});

describe('CategoryChart waterfall', () => {
  it('summarises the start, the end and the largest increase and decrease', () => {
    render(<Bridge />);
    expect(screen.getByRole('img', { name: 'Observatory budget' })).toHaveAccessibleDescription(
      'Starts at 48,200 USD and ends at 50,670 USD (+2,470 USD). Largest increase: Instrument repairs, +4,600 USD. Largest decrease: Grant offset, -3,000 USD.',
    );
  });

  it('draws floating bars from the running total, toned by direction, with signed labels', async () => {
    render(<Bridge />);
    await expect.poll(() => chartInstance()?.data.datasets[0]?.data.length).toBe(8);
    const dataset = chartInstance()?.data.datasets[0];
    expect(dataset?.data.slice(0, 3)).toEqual([
      [0, 48_200],
      [48_200, 51_600],
      [51_600, 50_350],
    ]);
    const colors = dataset?.borderColor as string[];
    // Increases, decreases and totals each have their own tone.
    expect(new Set([colors[1], colors[2], colors[0]]).size).toBe(3);
    expect(colors[1]).toBe(colors[3]);
    expect(chartInstance()?.options.plugins?.waterfall?.labels).toEqual([
      '48,200',
      '+3,400',
      '-1,250',
      '+820',
      '-2,100',
      '+4,600',
      '-3,000',
      '50,670',
    ]);
  });

  it('runs the steps down the page on a phone, and across otherwise', async () => {
    render(<Bridge />);
    await expect.poll(() => chartInstance()?.options.indexAxis).toBe(isPhone ? 'y' : 'x');
  });

  it('follows an explicit orientation', async () => {
    render(<Bridge orientation="horizontal" />);
    await expect.poll(() => chartInstance()?.options.indexAxis).toBe('y');
  });

  it('lists each step’s change and the running total in the table view', async () => {
    render(<Bridge />);
    await userEvent.click(screen.getByRole('button', { name: 'View as table' }));
    const table = screen.getByRole(isPhone ? 'list' : 'table', { name: 'Observatory budget' });
    expect(within(table).getByText('51,600')).toBeInTheDocument();
    expect(within(table).getByText('-1,250')).toBeInTheDocument();
    if (!isPhone) {
      expect(
        within(table).getByRole('columnheader', { name: 'Running total (USD)' }),
      ).toBeInTheDocument();
    }
  });

  it('takes the app’s strings from UIProvider', () => {
    render(
      <UIProvider
        messages={{
          waterfallSummary: ({ start, end }: { start: string; end: string }) =>
            `From ${start} to ${end}.`,
        }}
      >
        <Bridge />
      </UIProvider>,
    );
    expect(screen.getByRole('img')).toHaveAccessibleDescription(/^From 48,200 USD to 50,670 USD\./);
  });

  it('fits a phone without scrolling sideways', async () => {
    render(
      <div className="p-4">
        <Bridge />
      </div>,
    );
    await expect.poll(() => chartInstance()?.chartArea.width ?? 0).toBeGreaterThan(0);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Bridge />);
    await expectNoAxeViolations(container);
  });
});
