// The shell's shared page state (§9): filters cascading and reloading widgets, the consolidated legend driving
// several charts, a map selection setting a filter, and the phone header's sheets.
import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { offlineStyle } from '../../../test/maplibre';
import { trafficSource, widget } from '../../../test/dashboard';
import { toast } from '../../components/Toast/toastStore';
import { UIProvider } from '../../provider/UIProvider';
import { timeSeriesChartWidget } from '../chart/timeSeriesWidget';
import { mapWidget } from '../map/mapWidget';
import type { DashboardLibrary, DataRequest, JsonObject } from '../types';
import { legendWidget } from '../widgets/legendWidget';
import { statGroupWidget } from '../widgets/statGroup';
import { Dashboard } from './Dashboard';
import type { DashboardFilterDefinition } from './filters';

afterEach(() => {
  toast.clear();
});

const isPhone = window.innerWidth < 672;

function library(widgets: ReturnType<typeof widget>[]): DashboardLibrary {
  return {
    collections: [
      {
        id: 'c',
        name: 'Main',
        dashboards: [
          {
            schemaVersion: 1,
            id: 'd',
            title: 'Sites',
            pages: [{ id: 'p', title: 'Page', widgets }],
          },
        ],
      },
    ],
  };
}

const regions: DashboardFilterDefinition = {
  id: 'region',
  label: 'Region',
  allowsAll: true,
  options: [
    { value: 'eu', label: 'Europe' },
    { value: 'na', label: 'North America' },
  ],
};
const sites: DashboardFilterDefinition = {
  id: 'site',
  label: 'Site',
  parentId: 'region',
  allowsAll: true,
  loadOptions: ({ parentValues }) =>
    Promise.resolve(
      parentValues.region === 'eu'
        ? [
            { value: 'lis', label: 'Lisbon' },
            { value: 'ber', label: 'Berlin' },
          ]
        : [{ value: 'nyc', label: 'New York' }],
    ),
};

describe.runIf(!isPhone)('Dashboard: filters (§9.2)', () => {
  it('cascades: a child shows once its parent has a value, loads for it, and resets when it changes (CTX-08)', async () => {
    const load = vi.fn<(request: DataRequest<JsonObject>) => Promise<unknown>>((request) =>
      Promise.resolve({ items: [{ label: 'Site', value: JSON.stringify(request.filters) }] }),
    );
    const onFilterValuesChange = vi.fn<(values: Record<string, unknown>) => void>();
    render(
      <UIProvider locale="en-US">
        <Dashboard
          library={library([
            widget(
              'w',
              'ccux.statGroup',
              { w: 6, h: 3 },
              { title: 'Figures', data: { sourceId: 's' } },
            ),
          ])}
          widgetTypes={[statGroupWidget]}
          dataSources={[
            {
              id: 's',
              label: 'S',
              produces: 'stats',
              dependsOn: { filters: ['region', 'site'] },
              load,
            },
          ]}
          filters={[regions, sites]}
          onFilterValuesChange={onFilterValuesChange}
          height="700px"
        />
      </UIProvider>,
    );
    expect(screen.queryByRole('button', { name: /Site/ })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /Region/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Europe' }));
    expect(onFilterValuesChange).toHaveBeenLastCalledWith({ region: 'eu', site: null });
    await userEvent.click(await screen.findByRole('button', { name: /Site/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Berlin' }));
    expect(onFilterValuesChange).toHaveBeenLastCalledWith({ region: 'eu', site: 'ber' });
    // The widget reloaded with the filters it depends on (CTX-10's "exactly as header changes do").
    await expect
      .poll(() => load.mock.calls.at(-1)?.[0].filters)
      .toEqual({ region: 'eu', site: 'ber' });
    await userEvent.click(screen.getByRole('button', { name: /Region/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'North America' }));
    // The child reset, then picked its only choice, shown as text (CTX-09).
    await expect
      .poll(() => onFilterValuesChange.mock.calls.at(-1)?.[0])
      .toEqual({ region: 'na', site: 'nyc' });
    expect(await screen.findByText('New York')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Site/ })).toBeNull();
  });
});

describe('Dashboard: consolidated legend (§9.3, acceptance 17)', () => {
  it('hides a series in every chart and highlights every frame that shows it', async () => {
    render(
      <UIProvider locale="en-US">
        <Dashboard
          library={library([
            widget(
              'a',
              'ccux.timeSeriesChart',
              { x: 0, y: 0, w: 6, h: 4 },
              {
                title: 'Chart A',
                data: { sourceId: 'traffic' },
                options: { legend: 'show' },
              },
            ),
            widget(
              'b',
              'ccux.timeSeriesChart',
              { x: 6, y: 0, w: 6, h: 4 },
              {
                title: 'Chart B',
                data: { sourceId: 'traffic', params: { other: true } },
                options: { legend: 'show' },
              },
            ),
            widget('l', 'ccux.legend', { x: 0, y: 4, w: 12, h: 2 }, { title: 'Legend' }),
          ])}
          widgetTypes={[timeSeriesChartWidget, legendWidget]}
          dataSources={[trafficSource()]}
          defaultTimeRange={{ kind: 'relative', from: '-24h', to: 'now' }}
          height="900px"
        />
      </UIProvider>,
    );
    const legend = screen.getByRole('region', { name: 'Legend' });
    const entry = await within(legend).findByRole('button', { name: /Requests\/s/ });
    expect(
      within(within(legend).getByRole('list', { name: 'Series' })).getAllByRole('button'),
    ).toHaveLength(2);
    await userEvent.click(entry);
    expect(entry.getAttribute('aria-pressed')).toBe('false');
    for (const name of ['Chart A', 'Chart B']) {
      const own = within(screen.getByRole('region', { name })).getByRole('button', {
        name: /Requests\/s/,
      });
      await expect.poll(() => own.getAttribute('aria-pressed')).toBe('false');
    }
    if (!isPhone) {
      await userEvent.hover(within(legend).getByRole('button', { name: /Errors\/s/ }));
      for (const name of ['Chart A', 'Chart B']) {
        await expect
          .poll(() => screen.getByRole('region', { name }).dataset.highlighted)
          .toBe('true');
      }
    }
  });
});

describe('Dashboard: map selection sets a filter (BI-07, acceptance 16)', () => {
  it('sets the filter from the selected place, and the dependent widget reloads with it', async () => {
    const load = vi.fn((request: DataRequest<JsonObject>) =>
      Promise.resolve({
        items: [{ label: 'Location', value: JSON.stringify(request.filters.location ?? 'all') }],
      }),
    );
    render(
      <UIProvider locale="en-US">
        <Dashboard
          library={library([
            widget(
              'm',
              'ccux.map',
              { x: 0, y: 0, w: 6, h: 6 },
              {
                title: 'Sites map',
                data: { sourceId: 'places' },
                options: { selectionFilter: 'location' },
              },
            ),
            widget(
              's',
              'ccux.statGroup',
              { x: 6, y: 0, w: 6, h: 3 },
              { title: 'Site figures', data: { sourceId: 'figures' } },
            ),
          ])}
          widgetTypes={[mapWidget, statGroupWidget]}
          dataSources={[
            {
              id: 'places',
              label: 'Places',
              produces: 'geo',
              load: () =>
                Promise.resolve({
                  markers: [
                    { id: 'lis', label: 'Lisbon', position: [-9.14, 38.72], filterValue: 'lisbon' },
                    { id: 'ber', label: 'Berlin', position: [13.4, 52.52] },
                  ],
                }),
            },
            {
              id: 'figures',
              label: 'Figures',
              produces: 'stats',
              dependsOn: { filters: ['location'] },
              load,
            },
          ]}
          filters={[
            {
              id: 'location',
              label: 'Location',
              allowsAll: true,
              options: [
                { value: 'lisbon', label: 'Lisbon' },
                { value: 'ber', label: 'Berlin' },
              ],
            },
          ]}
          mapStyles={[{ id: 'offline', label: 'Offline', styleUrl: offlineStyle }]}
          height="900px"
        />
      </UIProvider>,
    );
    const map = screen.getByRole('region', { name: 'Sites map' });
    await userEvent.click(await within(map).findByRole('button', { name: /Places \(2\)/ }));
    await userEvent.click(await within(map).findByRole('option', { name: 'Lisbon' }));
    await expect.poll(() => load.mock.calls.at(-1)?.[0].filters).toEqual({ location: 'lisbon' });
    if (!isPhone) {
      expect(screen.getByRole('button', { name: /Location/ }).textContent).toContain('Lisbon');
    }
  });
});

describe.runIf(isPhone)('Dashboard: phone header (NAV-05)', () => {
  it('opens navigation in a drawer and the filters in a sheet', async () => {
    render(
      <UIProvider locale="en-US">
        <Dashboard
          library={{
            collections: [
              {
                id: 'c',
                name: 'Main',
                dashboards: [
                  {
                    schemaVersion: 1,
                    id: 'd',
                    title: 'Sites',
                    pages: [
                      { id: 'p1', title: 'First', widgets: [] },
                      { id: 'p2', title: 'Second', widgets: [] },
                    ],
                  },
                ],
              },
            ],
          }}
          widgetTypes={[statGroupWidget]}
          filters={[regions]}
          hasTimeRangePicker
          height="700px"
        />
      </UIProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Sites / First' }));
    const drawer = await screen.findByRole('dialog', { name: 'Dashboards' });
    await userEvent.click(within(drawer).getByRole('option', { name: 'Second' }));
    expect(await screen.findByRole('button', { name: 'Sites / Second' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Filters' }));
    const sheet = await screen.findByRole('dialog', { name: 'Time range and filters' });
    expect(within(sheet).getByRole('button', { name: /Region/ })).toBeTruthy();
  });
});
