import { render, screen, within } from '@testing-library/react';
import { Chart } from 'chart.js';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { START, trafficSeries, trafficSource, widget } from '../../../test/dashboard';
import { UIProvider } from '../../provider/UIProvider';
import { Dashboard } from '../Dashboard/Dashboard';
import { DashboardWidget } from '../DashboardWidget/DashboardWidget';
import { displaySeries, timeSeriesChartWidget } from './timeSeriesWidget';

describe('time series chart widget (§10.1)', () => {
  it('draws the series in a frame with one title (WID-08)', async () => {
    render(
      <UIProvider locale="en-US">
        <DashboardWidget
          type={timeSeriesChartWidget}
          title="Requests"
          dataSource={trafficSource()}
          timeRange={{ kind: 'relative', from: '-24h', to: 'now' }}
          height="22rem"
        />
      </UIProvider>,
    );
    const region = screen.getByRole('region', { name: 'Requests' });
    const canvas = await within(region).findByRole('img', { name: 'Requests' });
    expect(canvas.tagName).toBe('CANVAS');
    // The chart's own heading stays for screen readers only; the frame shows the title.
    const headings = within(region).getAllByRole('heading', { name: 'Requests' });
    expect(headings.filter((heading) => !heading.closest('.sr-only'))).toHaveLength(1);
  });

  it('zooms with the dashboard on large displays, drawing at the zoomed pixel ratio (RESP-08, RESP-10, acceptance 4)', async () => {
    render(
      <UIProvider locale="en-US">
        <Dashboard
          library={{
            collections: [
              {
                id: 'c',
                name: 'Wall',
                dashboards: [
                  {
                    schemaVersion: 1,
                    id: 'd',
                    title: 'Wall',
                    pages: [
                      {
                        id: 'p',
                        title: 'Traffic',
                        widgets: [
                          widget(
                            'requests',
                            'ccux.timeSeriesChart',
                            { w: 12, h: 6 },
                            { title: 'Requests', data: { sourceId: 'traffic' } },
                          ),
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          }}
          widgetTypes={[timeSeriesChartWidget]}
          dataSources={[trafficSource()]}
          defaultTimeRange={{ kind: 'relative', from: '-24h', to: 'now' }}
          grid={{ contentScale: 2 }}
          height="900px"
        />
      </UIProvider>,
    );
    const region = screen.getByRole('region', { name: 'Requests' });
    const canvas = await within(region).findByRole<HTMLCanvasElement>('img', { name: 'Requests' });
    expect(canvas.currentCSSZoom).toBe(2);
    // The backing store follows the zoom, so labels are drawn at twice their size, crisply.
    await expect
      .poll(() => Math.abs(canvas.width - canvas.clientWidth * window.devicePixelRatio * 2))
      .toBeLessThanOrEqual(2);
  });

  it('shows the whole time range, and offers the chart’s table view and exports in the frame’s menu (BI-01, BI-02)', async () => {
    const day = 24 * 3_600_000;
    render(
      <UIProvider locale="en-US">
        <DashboardWidget
          type={timeSeriesChartWidget}
          title="Requests"
          dataSource={trafficSource()}
          timeRange={{
            kind: 'absolute',
            start: new Date(START - day).toISOString(),
            end: new Date(START + 2 * day).toISOString(),
          }}
          height="22rem"
        />
      </UIProvider>,
    );
    const region = screen.getByRole('region', { name: 'Requests' });
    const canvas = await within(region).findByRole<HTMLCanvasElement>('img', { name: 'Requests' });
    // The data covers one day; the window is the three days asked for.
    await expect.poll(() => Chart.getChart(canvas)?.scales.x?.min).toBe(START - day);
    expect(Chart.getChart(canvas)?.scales.x?.max).toBe(START + 2 * day);
    // One action area: the chart's own toolbar is folded into the frame's menu (WID-08).
    expect(within(region).queryByRole('button', { name: 'View as table' })).toBeNull();
    await userEvent.click(within(region).getByRole('button', { name: 'Actions for Requests' }));
    expect(await screen.findByRole('menuitem', { name: 'Export: Data (CSV)' })).toBeTruthy();
    await userEvent.click(screen.getByRole('menuitem', { name: 'View as table' }));
    await expect.poll(() => canvas.parentElement?.classList.contains('hidden')).toBe(true);
  });

  it('never captures the page’s scrolling on touch screens (RESP-16, acceptance 5)', async () => {
    render(
      <UIProvider locale="en-US">
        <DashboardWidget
          type={timeSeriesChartWidget}
          title="Requests"
          dataSource={trafficSource()}
          timeRange={{ kind: 'relative', from: '-24h', to: 'now' }}
          height="22rem"
        />
      </UIProvider>,
    );
    const region = screen.getByRole('region', { name: 'Requests' });
    const canvas = await within(region).findByRole<HTMLCanvasElement>('img', { name: 'Requests' });
    await expect.poll(() => Chart.getChart(canvas)).toBeTruthy();
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    expect(getComputedStyle(canvas).touchAction === 'none').toBe(!isCoarse);
  });

  it('applies per-series overrides and stacking', () => {
    const series = displaySeries(trafficSeries().series, {
      stack: 'percent',
      seriesOverrides: { rps: { type: 'area', axis: 'right', lineStyle: 'dashed' } },
    });
    expect(series[0]).toMatchObject({
      type: 'area',
      axis: 'right',
      dash: [6, 4],
      stack: { id: 'stack', mode: 'percent' },
    });
    expect(series[1]).toMatchObject({ type: 'bar', stack: { id: 'stack', mode: 'percent' } });
  });
});
