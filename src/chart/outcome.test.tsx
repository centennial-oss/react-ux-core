import { render, screen, within } from '@testing-library/react';
import { Chart } from 'chart.js';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../test/axe';
import { cometNews, cometOutcomes, DAY, MARKET_START } from '../../test/charts';
import { OutcomeChart } from './OutcomeChart';
import { percentStackValues, type TimeSeries } from './TimeSeriesChart';

function chartInstance() {
  return Chart.getChart(screen.getByRole<HTMLCanvasElement>('img'));
}

function markers(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[data-event-marker]')];
}

function summary() {
  const canvas = screen.getByRole('img');
  return document.getElementById(canvas.getAttribute('aria-describedby') ?? '')?.textContent ?? '';
}

describe('percentStackValues', () => {
  const series = (
    id: string,
    values: (number | null)[],
    stack?: TimeSeries['stack'],
  ): TimeSeries => ({
    id,
    label: id,
    stack,
    data: values.map((v, index) => ({ t: index, v })),
  });
  const percent = { id: 'p', mode: 'percent' as const };

  it('spreads each time’s values to 100% among the shown series of a percent stack', () => {
    const all = [
      series('a', [1, 2, null], percent),
      series('b', [3, 2, 4], percent),
      series('c', [9, 9, 9]),
    ];
    const shares = percentStackValues(all);
    expect(shares.get('a')).toEqual([25, 50, null]);
    expect(shares.get('b')).toEqual([75, 50, 100]);
    expect(shares.has('c')).toBe(false);
    expect(percentStackValues(all, new Set(['a'])).get('b')).toEqual([100, 100, 100]);
  });
});

describe('OutcomeChart', () => {
  it('draws lines on a fixed 0–100% axis, with the latest values in the legend and the news marked', async () => {
    render(
      <OutcomeChart title="Comet" outcomes={cometOutcomes} events={cometNews} timeZone="UTC" />,
    );
    await expect.poll(() => chartInstance()?.data.datasets.length).toBe(4);
    const left = chartInstance()?.options.scales?.left as { min?: number; max?: number };
    expect([left.min, left.max]).toEqual([0, 100]);
    const legend = screen.getByRole('list', { name: 'Series' });
    const entries = within(legend).getAllByRole('button');
    expect(entries).toHaveLength(cometOutcomes.length);
    cometOutcomes.forEach((outcome, index) => {
      expect(entries[index]?.textContent).toMatch(new RegExp(`^${outcome.label}\\d+(\\.\\d)?%$`));
    });
    await expect.poll(() => markers().length).toBe(3);
    expect(summary()).toEqual(
      expect.stringMatching(
        /^Late October leads at [\d.]+%\. Late October is (up|down) [\d.]+ points over the last 7 days\./,
      ),
    );
    expect(summary()).toEqual(
      expect.stringContaining('3 events: Comet discovered to be outbursting at'),
    );
  });

  it('stacks the outcomes to 100%', async () => {
    render(<OutcomeChart title="Comet" outcomes={cometOutcomes} mode="stacked" timeZone="UTC" />);
    await expect.poll(() => chartInstance()?.data.datasets.length).toBe(4);
    const chart = chartInstance();
    const left = chart?.options.scales?.left as { min?: number; max?: number; stacked?: boolean };
    expect([left.min, left.max, left.stacked]).toEqual([0, 100, true]);
    const datasets = chart?.data.datasets ?? [];
    for (const index of [0, 45, 89]) {
      const total = datasets.reduce(
        (sum, dataset) => sum + ((dataset.data[index] as { y: number } | undefined)?.y ?? 0),
        0,
      );
      expect(total).toBeCloseTo(100, 5);
    }
  });

  it('emphasises the winner after resolution and marks it', async () => {
    render(
      <OutcomeChart
        title="Comet"
        outcomes={cometOutcomes}
        resolution={{ outcomeId: 'late-oct', at: MARKET_START + 89 * DAY }}
        timeZone="UTC"
      />,
    );
    await expect.poll(() => chartInstance()?.data.datasets.length).toBe(4);
    const datasets = chartInstance()?.data.datasets as {
      borderWidth?: number;
      borderColor?: string;
    }[];
    expect(datasets.map((dataset) => dataset.borderWidth)).toEqual([2, 2, 3, 2]);
    expect(datasets[0]?.borderColor).toEqual(expect.stringContaining('0.35'));
    await expect.poll(() => markers().length).toBe(1);
    expect(markers()[0]?.getAttribute('aria-label')).toContain('Resolved: Late October');
    expect(summary()).toEqual(
      expect.stringContaining('Resolved: Late October, Sep 28, 2026, 12:00 AM.'),
    );
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <OutcomeChart
        title="Comet"
        outcomes={cometOutcomes}
        events={cometNews}
        mode="stacked"
        timeZone="UTC"
      />,
    );
    await expect.poll(() => markers().length).toBe(3);
    await expectNoAxeViolations(container);
  });
});
