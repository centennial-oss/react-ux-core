import { render, screen, within } from '@testing-library/react';
import { Chart } from 'chart.js';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { proposalFunnel } from '../../test/moreCharts';
import { CategoryChart } from './CategoryChart';
import { funnelRows } from './Funnel';

const isPhone = window.matchMedia('(max-width: 639.98px)').matches;

function chartInstance() {
  return Chart.getChart(screen.getByRole<HTMLCanvasElement>('img'));
}

function Proposals() {
  return (
    <CategoryChart
      type="funnel"
      title="Observing proposals"
      steps={proposalFunnel}
      unit="proposals"
    />
  );
}

describe('funnelRows', () => {
  it('gives each step’s share of the first and of the previous step', () => {
    expect(
      funnelRows([
        { label: 'A', value: 200 },
        { label: 'B', value: 100 },
        { label: 'C', value: 25 },
        { label: 'D', value: 0 },
        { label: 'E', value: 0 },
      ]),
    ).toEqual([
      { label: 'A', value: 200, ofFirst: 100, ofPrevious: 100 },
      { label: 'B', value: 100, ofFirst: 50, ofPrevious: 50 },
      { label: 'C', value: 25, ofFirst: 12.5, ofPrevious: 25 },
      { label: 'D', value: 0, ofFirst: 0, ofPrevious: 0 },
      { label: 'E', value: 0, ofFirst: 0, ofPrevious: 0 },
    ]);
  });
});

describe('CategoryChart funnel', () => {
  it('summarises the overall share and the largest drop', () => {
    render(<Proposals />);
    expect(screen.getByRole('img', { name: 'Observing proposals' })).toHaveAccessibleDescription(
      '6 steps, from 1,240 proposals to 164 proposals (13.2% of the first step). Largest drop: from Reviewed to Shortlisted, where 40.8% continue.',
    );
  });

  it('centres each step’s bar, as wide as its value, and labels it', async () => {
    render(<Proposals />);
    await expect.poll(() => chartInstance()?.data.datasets[0]?.data.length).toBe(6);
    const chart = chartInstance();
    expect(chart?.options.indexAxis).toBe('y');
    expect(chart?.data.datasets[0]?.data.slice(0, 2)).toEqual([
      [-620, 620],
      [-490, 490],
    ]);
    expect(chart?.options.plugins?.funnel?.labels?.slice(0, 3)).toEqual(
      isPhone ? ['1,240', '980', '760'] : ['1,240', '980 (79%)', '760 (61.3%)'],
    );
  });

  it('lists each step’s shares in the table view', async () => {
    render(<Proposals />);
    await userEvent.click(screen.getByRole('button', { name: 'View as table' }));
    const table = screen.getByRole(isPhone ? 'list' : 'table', { name: 'Observing proposals' });
    expect(within(table).getByText('Shortlisted')).toBeInTheDocument();
    expect(within(table).getByText('25%')).toBeInTheDocument();
    if (!isPhone) {
      expect(within(table).getByText('40.8%')).toBeInTheDocument();
      expect(
        within(table).getByRole('columnheader', { name: 'Value (proposals)' }),
      ).toBeInTheDocument();
    }
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Proposals />);
    await expectNoAxeViolations(container);
  });
});
