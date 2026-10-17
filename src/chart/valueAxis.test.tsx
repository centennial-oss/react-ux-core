import { render, screen } from '@testing-library/react';
import { Chart } from 'chart.js';
import { describe, expect, it } from 'vitest';
import { CategoryChart } from './CategoryChart';
import { TimeSeriesChart, type TimeSeries } from './TimeSeriesChart';
import { valueAxisBounds } from './valueAxis';

const START = Date.UTC(2026, 2, 1, 7);
const DAY = 86_400_000;

const scores: TimeSeries = {
  id: 'score',
  label: 'Quiz score',
  unit: '%',
  data: [48, 55, 52, 62].map((v, index) => ({ t: START + index * DAY, v })),
};
const hours: TimeSeries = {
  id: 'hours',
  label: 'Study hours',
  axis: 'right',
  data: [2, 3, 1, 4].map((v, index) => ({ t: START + index * DAY, v })),
};
const gate = { value: 80, label: 'A grade' };

function chart() {
  return Chart.getChart(screen.getByRole<HTMLCanvasElement>('img'));
}

function axisTitle(id: string) {
  return (chart()?.options.scales?.[id] as { title?: unknown } | undefined)?.title;
}

async function scale(id: string) {
  await expect.poll(() => chart()?.scales[id]).toBeDefined();
  const found = chart()?.scales[id];
  if (!found) {
    throw new Error(`No ${id} scale`);
  }
  return found;
}

describe('valueAxisBounds', () => {
  it('passes hard bounds through and stretches soft bounds to the references', () => {
    expect(valueAxisBounds(undefined, [80])).toEqual({ suggestedMin: 80, suggestedMax: 80 });
    expect(valueAxisBounds({ min: 0, max: 100 }, [80])).toEqual({
      min: 0,
      max: 100,
      suggestedMin: 80,
      suggestedMax: 80,
    });
    expect(valueAxisBounds({ suggestedMin: 10, suggestedMax: 50 }, [5, 70])).toEqual({
      suggestedMin: 5,
      suggestedMax: 70,
    });
    expect(valueAxisBounds({ shouldIncludeReferences: false }, [80])).toEqual({});
  });
});

describe('TimeSeriesChart value axes', () => {
  it('stretches the axis to show a threshold above the data', async () => {
    render(<TimeSeriesChart title="Scores" series={[scores]} thresholds={[gate]} timeZone="UTC" />);
    const left = await scale('left');
    expect(left.max).toBeGreaterThanOrEqual(80);
    // The summary still describes the data, not the axis.
    expect(screen.getByRole('img', { name: 'Scores' })).toHaveAccessibleDescription(
      /from 48 % to 62 %/,
    );
  });

  it('can leave references out, fitting the data only', async () => {
    render(
      <TimeSeriesChart
        title="Scores"
        series={[scores]}
        thresholds={[gate]}
        axes={{ left: { shouldIncludeReferences: false } }}
        timeZone="UTC"
      />,
    );
    expect((await scale('left')).max).toBeLessThan(80);
  });

  it('pins a percent axis to 0–100, titled, and keeps it there through zoom and reset', async () => {
    render(
      <TimeSeriesChart
        title="Scores"
        series={[scores]}
        thresholds={[gate]}
        axes={{ left: { min: 0, max: 100, title: 'Score' } }}
        timeZone="UTC"
      />,
    );
    const left = await scale('left');
    expect([left.min, left.max]).toEqual([0, 100]);
    expect(axisTitle('left')).toMatchObject({ display: true, text: 'Score' });
    expect(chart()?.options.plugins?.zoom?.limits?.left).toEqual({ min: 0, max: 100 });
    expect(screen.getByRole('img', { name: 'Scores' })).toHaveAccessibleDescription(
      /Axis: Score\.$/,
    );
    chart()?.zoom(2);
    chart()?.resetZoom();
    const reset = await scale('left');
    expect([reset.min, reset.max]).toEqual([0, 100]);
  });

  it('gives the left and right axes their own ranges', async () => {
    render(
      <TimeSeriesChart
        title="Study"
        series={[scores, hours]}
        axes={{ left: { min: 0, max: 100 }, right: { min: 0, suggestedMax: 10 } }}
        timeZone="UTC"
      />,
    );
    const left = await scale('left');
    const right = await scale('right');
    expect([left.min, left.max]).toEqual([0, 100]);
    expect(right.min).toBe(0);
    expect(right.max).toBeGreaterThanOrEqual(10);
  });
});

describe('CategoryChart value axis', () => {
  it('pins a horizontal bar chart’s value axis (x) and titles it', async () => {
    render(
      <CategoryChart
        title="Topics"
        type="horizontalBar"
        categories={['Mechanics', 'Optics', 'Astronomy']}
        series={[{ id: 'score', label: 'Score', data: [71, 58, 64] }]}
        unit="%"
        valueAxis={{ min: 0, max: 100, title: 'Score' }}
      />,
    );
    const x = await scale('x');
    expect([x.min, x.max]).toEqual([0, 100]);
    expect(axisTitle('x')).toMatchObject({ display: true, text: 'Score' });
    expect(screen.getByRole('img', { name: 'Topics' })).toHaveAccessibleDescription(
      /Axis: Score\.$/,
    );
  });
});
