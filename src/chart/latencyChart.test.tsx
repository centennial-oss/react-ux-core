import { render, screen, within } from '@testing-library/react';
import { Chart } from 'chart.js';
import type { ComponentProps } from 'react';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { latencyHistogram, networkLatency } from '../../test/plotCharts';
import { UIProvider } from '../provider/UIProvider';
import { bucketMode, type HistogramOptions } from './histogram';
import { LatencyChart } from './LatencyChart';

const isPhone = window.matchMedia('(max-width: 639.98px)').matches;

function chartInstance() {
  return Chart.getChart(screen.getByRole<HTMLCanvasElement>('img'));
}

function summary() {
  const canvas = screen.getByRole('img');
  return document.getElementById(canvas.getAttribute('aria-describedby') ?? '')?.textContent ?? '';
}

function markers(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[data-event-marker]')];
}

function OverTime(props: Partial<ComponentProps<typeof LatencyChart>>) {
  return (
    <LatencyChart
      title="Network latency"
      series={[networkLatency]}
      objective={{ percentile: 'p95', value: 300 }}
      timeZone="UTC"
      {...props}
    />
  );
}

function Histogram(props: Partial<ComponentProps<typeof LatencyChart>>) {
  return (
    <LatencyChart
      title="Request latency"
      histogram={latencyHistogram}
      scale="log"
      objective={{ percentile: 'p95', value: 300 }}
      {...props}
    />
  );
}

describe('LatencyChart over time', () => {
  it('draws each percentile as a line, shading each band down to the percentile below', async () => {
    render(<OverTime />);
    await expect.poll(() => chartInstance()?.data.datasets.length).toBe(3);
    const datasets = chartInstance()?.data.datasets ?? [];
    expect(datasets.map((dataset) => dataset.label)).toEqual(['p50', 'p95', 'p99']);
    expect(datasets.map((dataset) => (dataset as { fill?: unknown }).fill)).toEqual([false, 0, 1]);
  });

  it('marks the two windows where p95 breached its objective, and says so in the summary', async () => {
    render(<OverTime />);
    await expect.poll(() => markers().length).toBe(2);
    expect(markers().map((marker) => marker.getAttribute('aria-label'))).toEqual([
      'p95 over 300 ms, Oct 14, 2026, 9:00 AM to Oct 14, 2026, 10:40 AM',
      'p95 over 300 ms, Oct 14, 2026, 6:00 PM to Oct 14, 2026, 6:50 PM',
    ]);
    expect(summary()).toEqual(
      expect.stringContaining(
        'Latency percentiles from Oct 14, 2026, 12:00 AM to Oct 15, 2026, 12:00 AM. p50: from',
      ),
    );
    expect(summary()).toEqual(
      expect.stringContaining('Objective: p95 at most 300 ms, breached 2 times.'),
    );
    expect(summary()).toEqual(
      expect.stringContaining(
        'p95 over 300 ms from Oct 14, 2026, 9:00 AM to Oct 14, 2026, 10:40 AM.',
      ),
    );
    const threshold = chartInstance()?.options.plugins?.reference?.thresholds?.[0];
    expect(threshold?.value).toBe(300);
    expect(threshold?.label).toBe('p95 objective 300 ms');
  });

  it('says the objective was met when nothing breached it', () => {
    render(<OverTime objective={{ percentile: 'p95', value: 1000 }} />);
    expect(summary()).toEqual(
      expect.stringContaining('Objective: p95 at most 1,000 ms, met throughout.'),
    );
    expect(markers()).toHaveLength(0);
  });

  it('uses a log value axis with scale="log"', async () => {
    render(<OverTime scale="log" />);
    await expect.poll(() => chartInstance()?.scales.left?.type).toBe('logarithmic');
  });

  it('lists each percentile and the breaches in the table view', async () => {
    render(<OverTime />);
    await userEvent.click(screen.getByRole('button', { name: 'View as table' }));
    const table = screen.getByRole(isPhone ? 'list' : 'table', { name: 'Network latency' });
    expect(within(table).getAllByText('p95 over 300 ms').length).toBeGreaterThan(0);
    if (!isPhone) {
      for (const header of ['p50 (ms)', 'p95 (ms)', 'p99 (ms)', 'Events']) {
        expect(within(table).getByRole('columnheader', { name: header })).toBeInTheDocument();
      }
    }
  });

  it('labels percentiles by series when there are several', async () => {
    render(
      <OverTime
        series={[
          { ...networkLatency, id: 'north', label: 'North' },
          { ...networkLatency, id: 'south', label: 'South' },
        ]}
      />,
    );
    await expect.poll(() => chartInstance()?.data.datasets.length).toBe(6);
    expect(chartInstance()?.data.datasets[3]?.label).toBe('South p50');
    expect(screen.getByRole('button', { name: 'North p95' })).toBeInTheDocument();
  });

  it('takes the app’s strings from UIProvider', async () => {
    render(
      <UIProvider
        messages={{
          latencyBreach: ({ percentile }: { percentile: string }) => `${percentile} too slow`,
        }}
      >
        <OverTime />
      </UIProvider>,
    );
    await expect.poll(() => markers().length).toBe(2);
    expect(markers()[0]?.getAttribute('aria-label')).toEqual(
      expect.stringContaining('p95 too slow'),
    );
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<OverTime />);
    await expect.poll(() => markers().length).toBe(2);
    await expectNoAxeViolations(container);
  });
});

describe('LatencyChart histogram', () => {
  it('summarises the distribution, its percentiles and the objective', () => {
    render(<Histogram />);
    expect(summary()).toBe(
      '15,387 observations in 30 buckets. Percentiles: p50 109.83 ms, p95 315.79 ms, and p99 725.63 ms. Objective: p95 at most 300 ms, missed: p95 is 315.79 ms.',
    );
  });

  it('draws 30 buckets on a log axis, with p50, p95, p99 and objective markers', async () => {
    render(<Histogram />);
    await expect.poll(() => chartInstance()?.scales.x?.type).toBe('logarithmic');
    const options = chartInstance()?.options.plugins?.histogram as HistogramOptions | undefined;
    expect(options?.buckets).toHaveLength(30);
    expect(options?.markers.map((marker) => marker.label)).toEqual([
      'p50',
      'p95',
      'p99',
      'p95 objective 300 ms',
    ]);
    // The buckets past the objective are drawn in the danger tone.
    const colors = options?.colors ?? [];
    const slow = options?.buckets.findIndex((bucket) => bucket.from >= 300) ?? -1;
    expect(slow).toBeGreaterThan(0);
    expect(colors[slow]).not.toBe(colors[0]);
  });

  it('picks the bucket under the pointer for the tooltip', async () => {
    render(<Histogram />);
    await expect.poll(() => chartInstance()?.chartArea.width ?? 0).toBeGreaterThan(0);
    const chart = chartInstance();
    const scale = chart?.scales.x;
    const bucket = (chart?.options.plugins?.histogram as HistogramOptions | undefined)?.buckets[12];
    if (!chart || !scale || !bucket) {
      throw new Error('No chart');
    }
    const x = (scale.getPixelForValue(bucket.from) + scale.getPixelForValue(bucket.to)) / 2;
    expect(bucketMode(chart, { x }).map((item) => item.index)).toEqual([12]);
    expect(bucketMode(chart, { x: null })).toEqual([]);
  });

  it('lists every bucket with its count, share, cumulative share and percentiles', async () => {
    render(<Histogram />);
    await userEvent.click(screen.getByRole('button', { name: 'View as table' }));
    const table = screen.getByRole(isPhone ? 'list' : 'table', { name: 'Request latency' });
    expect(within(table).getByText('Over 5,170 ms')).toBeInTheDocument();
    expect(within(table).getByText('p50')).toBeInTheDocument();
    if (!isPhone) {
      expect(within(table).getAllByRole('row')).toHaveLength(31);
      expect(within(table).getByRole('columnheader', { name: 'Cumulative' })).toBeInTheDocument();
    }
  });

  it('shows an empty state without observations', () => {
    render(<Histogram histogram={[]} />);
    expect(screen.getByRole('heading', { name: 'No data' })).toBeInTheDocument();
  });

  it('fits a phone without scrolling sideways', async () => {
    // Padded, as a page would be: small buttons' touch areas reach a few pixels past them.
    render(
      <div className="p-4">
        <Histogram />
      </div>,
    );
    await expect.poll(() => chartInstance()?.chartArea.width ?? 0).toBeGreaterThan(0);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Histogram />);
    await expectNoAxeViolations(container);
  });
});
