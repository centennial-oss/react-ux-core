import { render, screen } from '@testing-library/react';
import { Chart } from 'chart.js';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../test/axe';
import { Gauge, MeterBar } from './Gauge';
import { HourOfDayChart } from './HourOfDayChart';

describe('HourOfDayChart', () => {
  it('draws 24 hourly buckets, from numbers or a schedule', async () => {
    render(
      <HourOfDayChart
        title="Weekday"
        unit="kW"
        series={[
          { id: 'load', label: 'Load', data: Array.from({ length: 24 }, (_, hour) => hour) },
          {
            id: 'limit',
            label: 'Limit',
            schedule: [
              { start: '00:00', end: '12:00', value: 10 },
              { start: '12:00', end: '24:00', value: 30 },
            ],
          },
        ]}
      />,
    );
    const canvas = screen.getByRole('img', { name: 'Weekday' });
    await expect
      .poll(() => Chart.getChart(canvas as HTMLCanvasElement)?.data.labels?.length)
      .toBe(24);
    const chart = Chart.getChart(canvas as HTMLCanvasElement);
    expect(chart?.data.datasets[1]?.data.slice(10, 14)).toEqual([10, 10, 30, 30]);
    expect(canvas).toHaveAccessibleDescription(
      /24 categories\. Load: highest 11\sPM \(23 kW\), lowest 12\sAM \(0 kW\)/,
    );
  });
});

describe('Gauge', () => {
  it('is a meter whose text gives the value and status', () => {
    render(
      <>
        <Gauge
          label="Demand"
          value={200}
          maxValue={250}
          unit="kW"
          thresholds={{ warning: 180, danger: 220 }}
        />
        <MeterBar
          label="Battery"
          value={12}
          maxValue={100}
          unit="%"
          badWhen="low"
          thresholds={{ warning: 30, danger: 15 }}
        />
      </>,
    );
    const demand = screen.getByRole('meter', { name: 'Demand' });
    expect(demand).toHaveAttribute('aria-valuenow', '200');
    expect(demand).toHaveAttribute('aria-valuetext', '200 kW, Warning');
    expect(screen.getByRole('meter', { name: 'Battery' })).toHaveAttribute(
      'aria-valuetext',
      '12 %, Critical',
    );
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <Gauge label="Demand" value={100} maxValue={250} thresholds={{ warning: 180 }} />,
    );
    await expectNoAxeViolations(container);
  });
});
