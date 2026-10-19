// The shell's phase 4 extensions: kiosk mode (Q4), persisted legend state (CTX-14) and widget state (Q3).
import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { regionTableSource, trafficSource, widget } from '../../../test/dashboard';
import { toast } from '../../components/Toast/toastStore';
import { UIProvider } from '../../provider/UIProvider';
import { timeSeriesChartWidget } from '../chart/timeSeriesWidget';
import { tableWidget } from '../table/tableWidget';
import type { DashboardLibrary, JsonObject } from '../types';
import { legendWidget } from '../widgets/legendWidget';
import { textWidget } from '../widgets/textWidget';
import { Dashboard, type DashboardProps } from './Dashboard';
import type { DashboardSelection } from './selection';

afterEach(() => {
  toast.clear();
});

const isPhone = window.innerWidth < 672;

function pages(): DashboardLibrary {
  return {
    collections: [
      {
        id: 'c',
        name: 'Wall',
        dashboards: [
          {
            schemaVersion: 1,
            id: 'd',
            title: 'Wall',
            pages: ['One', 'Two', 'Three'].map((title) => ({
              id: title.toLowerCase(),
              title,
              widgets: [
                {
                  id: `${title}-note`,
                  type: 'ccux.text',
                  title: `${title} note`,
                  layout: { w: 6, h: 2 },
                  options: { body: `Page ${title}` },
                },
              ],
            })),
          },
        ],
      },
    ],
  };
}

function Shell(props: Partial<DashboardProps>) {
  return (
    <UIProvider locale="en-US">
      <Dashboard library={pages()} widgetTypes={[textWidget]} height="600px" {...props} />
    </UIProvider>
  );
}

describe('Dashboard: kiosk mode (Q4)', () => {
  it('shows the pages in turn, and stops when paused', async () => {
    const onSelectionChange = vi.fn<(selection: DashboardSelection) => void>();
    render(<Shell kioskIntervalMs={300} onSelectionChange={onSelectionChange} />);
    expect(await screen.findByText('Page One')).toBeTruthy();
    expect(await screen.findByText('Page Two', {}, { timeout: 3000 })).toBeTruthy();
    expect(onSelectionChange).toHaveBeenLastCalledWith({
      collectionId: 'c',
      dashboardId: 'd',
      pageId: 'two',
    });
    expect(await screen.findByText('Showing Two')).toBeTruthy();
    if (isPhone) {
      await userEvent.click(screen.getByRole('button', { name: 'More dashboard actions' }));
      await userEvent.click(await screen.findByRole('menuitem', { name: 'Pause page rotation' }));
    } else {
      await userEvent.click(screen.getByRole('button', { name: 'Pause page rotation' }));
      expect(screen.getByRole('button', { name: 'Resume page rotation' })).toBeTruthy();
    }
    const calls = onSelectionChange.mock.calls.length;
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 900)));
    expect(onSelectionChange.mock.calls.length).toBe(calls);
  });

  it('is off with a single page or without an interval', async () => {
    render(<Shell />);
    await screen.findByText('Page One');
    expect(screen.queryByRole('button', { name: 'Pause page rotation' })).toBeNull();
  });
});

/** Two pages, each with a chart of the same series and a legend. */
function charts(): DashboardLibrary {
  const page = (id: string) => ({
    id,
    title: id.toUpperCase(),
    widgets: [
      widget(
        `${id}-chart`,
        'ccux.timeSeriesChart',
        { x: 0, y: 0, w: 8, h: 4 },
        {
          title: `Chart ${id}`,
          data: { sourceId: 'traffic' },
        },
      ),
      widget(`${id}-legend`, 'ccux.legend', { x: 8, y: 0, w: 4, h: 4 }, { title: `Legend ${id}` }),
    ],
  });
  return {
    collections: [
      {
        id: 'c',
        name: 'C',
        dashboards: [
          { schemaVersion: 1, id: 'd', title: 'Traffic', pages: [page('a'), page('b')] },
        ],
      },
    ],
  };
}

describe('Dashboard: legend state per page (CTX-14)', () => {
  it('keeps each page’s hidden series, and hands them to a host that persists them', async () => {
    const onHiddenLegendKeysChange = vi.fn<(pageId: string, keys: string[]) => void>();
    function Host() {
      const [kept, setKept] = useState<Record<string, readonly string[]>>({});
      return (
        <UIProvider locale="en-US">
          <Dashboard
            library={charts()}
            widgetTypes={[timeSeriesChartWidget, legendWidget]}
            dataSources={[trafficSource()]}
            defaultTimeRange={{ kind: 'relative', from: '-24h', to: 'now' }}
            hiddenLegendKeys={kept}
            onHiddenLegendKeysChange={(pageId, keys) => {
              onHiddenLegendKeysChange(pageId, keys);
              setKept((current) => ({ ...current, [pageId]: keys }));
            }}
            height="700px"
          />
        </UIProvider>
      );
    }
    render(<Host />);
    const entry = async (page: string) =>
      within(screen.getByRole('region', { name: `Legend ${page}` })).findByRole('button', {
        name: /Requests\/s/,
      });
    await userEvent.click(await entry('a'));
    expect(onHiddenLegendKeysChange).toHaveBeenLastCalledWith('a', [expect.any(String)]);
    await expect.poll(async () => (await entry('a')).getAttribute('aria-pressed')).toBe('false');
    // The other page has its own state.
    await userEvent.click(await screen.findByRole('tab', { name: 'B' }));
    expect((await entry('b')).getAttribute('aria-pressed')).toBe('true');
    await userEvent.click(screen.getByRole('tab', { name: 'A' }));
    expect((await entry('a')).getAttribute('aria-pressed')).toBe('false');
  });
});

describe.runIf(window.innerWidth >= 1024)('Dashboard: widget state (Q3)', () => {
  it('keeps a table’s sort as widget state, for a host that persists it', async () => {
    const library: DashboardLibrary = {
      collections: [
        {
          id: 'c',
          name: 'C',
          dashboards: [
            {
              schemaVersion: 1,
              id: 'd',
              title: 'Regions',
              pages: [
                {
                  id: 'p',
                  title: 'P',
                  widgets: [
                    widget(
                      't',
                      'ccux.table',
                      { w: 12, h: 6 },
                      {
                        title: 'Regions',
                        data: { sourceId: 'regions' },
                      },
                    ),
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    const onWidgetStateChange = vi.fn<(widgetId: string, state: JsonObject) => void>();
    const { unmount } = render(
      <UIProvider locale="en-US">
        <Dashboard
          library={library}
          widgetTypes={[tableWidget]}
          dataSources={[regionTableSource()]}
          onWidgetStateChange={onWidgetStateChange}
          height="700px"
        />
      </UIProvider>,
    );
    const header = await screen.findByRole('columnheader', { name: /Requests/ });
    await userEvent.click(within(header).getByRole('button'));
    expect(onWidgetStateChange).toHaveBeenLastCalledWith('t', {
      sort: { column: 'requests', direction: 'ascending' },
    });
    const kept = onWidgetStateChange.mock.calls.at(-1)?.[1] ?? {};
    unmount();
    render(
      <UIProvider locale="en-US">
        <Dashboard
          library={library}
          widgetTypes={[tableWidget]}
          dataSources={[regionTableSource()]}
          widgetState={{ t: kept }}
          height="700px"
        />
      </UIProvider>,
    );
    await expect
      .poll(() =>
        screen.queryByRole('columnheader', { name: /Requests/ })?.getAttribute('aria-sort'),
      )
      .toBe('ascending');
  });
});
