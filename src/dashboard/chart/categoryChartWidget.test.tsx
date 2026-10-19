import { render, screen, within } from '@testing-library/react';
import { Chart } from 'chart.js';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { widget } from '../../../test/dashboard';
import { UIProvider } from '../../provider/UIProvider';
import { Dashboard } from '../Dashboard/Dashboard';
import { DashboardWidget } from '../DashboardWidget/DashboardWidget';
import type { CategoricalData } from '../data/shapes';
import { legendWidget } from '../widgets/legendWidget';
import { categoryChartWidget } from './categoryChartWidget';

const energy: CategoricalData = {
  categories: ['Solar', 'Wind', 'Hydro'],
  series: [
    { id: 'y2025', label: '2025', data: [12, 30, 8] },
    { id: 'y2026', label: '2026', data: [18, 28, 9] },
  ],
};
const load = () => Promise.resolve(energy);

describe('category chart widget (§10.6)', () => {
  it('draws bars in the frame, with the chart’s actions in the frame’s menu', async () => {
    render(
      <UIProvider locale="en-US">
        <DashboardWidget
          type={categoryChartWidget}
          title="Output"
          load={load}
          displayOptions={{ chartType: 'horizontalBar', unit: 'GWh' }}
          height="22rem"
        />
      </UIProvider>,
    );
    const region = screen.getByRole('region', { name: 'Output' });
    const canvas = await within(region).findByRole<HTMLCanvasElement>('img', { name: 'Output' });
    await expect.poll(() => Chart.getChart(canvas)?.data.labels).toEqual(energy.categories);
    expect(Chart.getChart(canvas)?.options.indexAxis).toBe('y');
    await userEvent.click(within(region).getByRole('button', { name: 'Actions for Output' }));
    expect(await screen.findByRole('menuitem', { name: 'View as table' })).toBeTruthy();
  });

  it('publishes a donut’s categories to the consolidated legend, which hides them (CTX-11, CTX-12)', async () => {
    render(
      <UIProvider locale="en-US">
        <Dashboard
          library={{
            collections: [
              {
                id: 'c',
                name: 'C',
                dashboards: [
                  {
                    schemaVersion: 1,
                    id: 'd',
                    title: 'Energy',
                    pages: [
                      {
                        id: 'p',
                        title: 'Mix',
                        widgets: [
                          {
                            ...widget(
                              'mix',
                              'ccux.categoryChart',
                              { x: 0, y: 0, w: 8, h: 5 },
                              {
                                title: 'Mix',
                                options: { chartType: 'donut' },
                              },
                            ),
                            load,
                          },
                          widget(
                            'legend',
                            'ccux.legend',
                            { x: 8, y: 0, w: 4, h: 5 },
                            { title: 'Legend' },
                          ),
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          }}
          widgetTypes={[categoryChartWidget, legendWidget]}
          height="800px"
        />
      </UIProvider>,
    );
    const legend = screen.getByRole('region', { name: 'Legend' });
    const wind = await within(legend).findByRole('button', { name: /Wind/ });
    expect(
      within(within(legend).getByRole('list', { name: 'Series' })).getAllByRole('button'),
    ).toHaveLength(3);
    await userEvent.click(wind);
    const canvas = within(screen.getByRole('region', { name: 'Mix' })).getByRole<HTMLCanvasElement>(
      'img',
      { name: 'Mix' },
    );
    // A hidden category draws as zero.
    await expect.poll(() => Chart.getChart(canvas)?.data.datasets[0]?.data[1]).toBe(0);
  });
});
