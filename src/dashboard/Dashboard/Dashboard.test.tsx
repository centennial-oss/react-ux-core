import { act, render, screen, within } from '@testing-library/react';
import { Profiler, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { kpiSource, regionTableSource, sampleLibrary, widget } from '../../../test/dashboard';
import { toast } from '../../components/Toast/toastStore';
import { UIProvider } from '../../provider/UIProvider';
import { tableWidget } from '../table/tableWidget';
import type { DashboardDocument, DashboardLibrary } from '../types';
import type { DashboardSelection } from './selection';
import { legendWidget } from '../widgets/legendWidget';
import { statGroupWidget } from '../widgets/statGroup';
import { Dashboard, type DashboardProps, type SaveDashboardMeta } from './Dashboard';

// Toasts live in a shared store: one left from a test would cover the next test's controls.
afterEach(() => {
  toast.clear();
});

const isDesktop = window.innerWidth >= 1024;
const isPhone = window.innerWidth < 672;
const types = [statGroupWidget, tableWidget, legendWidget];

function Shell(props: Partial<DashboardProps>) {
  return (
    <UIProvider locale="en-US">
      <Dashboard
        library={sampleLibrary()}
        widgetTypes={types}
        dataSources={[kpiSource(), regionTableSource()]}
        height="800px"
        {...props}
      />
    </UIProvider>
  );
}

/** A host that saves by echoing the document back, as a store would. */
function useSaving() {
  const saves: DashboardDocument[] = [];
  const onSaveDashboard = vi.fn<
    (document: DashboardDocument, meta: SaveDashboardMeta) => Promise<DashboardDocument>
  >((document) => {
    saves.push(document);
    return Promise.resolve({ ...document, revision: `r${String(saves.length)}` });
  });
  return { saves, onSaveDashboard };
}

const frame = (name: string) => screen.getByRole('region', { name });
const editPage = async () => {
  if (isPhone) {
    await userEvent.click(screen.getByRole('button', { name: 'More dashboard actions' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Edit this page' }));
  } else {
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Edit this page' }));
  }
  await screen.findByRole('toolbar', { name: 'Editing tools' });
};

describe('Dashboard: view mode', () => {
  it('renders a code-defined dashboard read-only, auto-placing widgets and loading each once (PERS-06, acceptance 1)', async () => {
    const load = vi.fn(() => Promise.resolve({ items: [{ label: 'Uptime', value: 99.9 }] }));
    const code: DashboardLibrary = {
      collections: [
        {
          id: 'c',
          name: 'Code',
          permissions: { canEdit: true },
          dashboards: [
            {
              schemaVersion: 1,
              id: 'd',
              title: 'From code',
              pages: [
                {
                  id: 'p',
                  title: 'Main',
                  widgets: [
                    widget(
                      'a',
                      'ccux.statGroup',
                      { w: 4, h: 3 },
                      { title: 'A', data: { sourceId: 'counter' } },
                    ),
                    widget(
                      'b',
                      'ccux.statGroup',
                      { w: 4, h: 3 },
                      { title: 'B', data: { sourceId: 'counter', params: { n: 2 } } },
                    ),
                    widget(
                      'c',
                      'ccux.statGroup',
                      { w: 4, h: 3 },
                      { title: 'C', data: { sourceId: 'counter', params: { n: 3 } } },
                    ),
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    render(
      <UIProvider locale="en-US">
        <Dashboard
          library={code}
          widgetTypes={types}
          dataSources={[{ id: 'counter', label: 'Counter', produces: 'stats', load }]}
          height="800px"
        />
      </UIProvider>,
    );
    expect(await within(frame('A')).findByText('Uptime')).toBeTruthy();
    await expect.poll(() => load.mock.calls.length).toBe(3);
    // No save target, so nothing to edit.
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    if (isDesktop) {
      const tops = ['A', 'B', 'C'].map((name) =>
        Math.round(frame(name).getBoundingClientRect().top),
      );
      expect(new Set(tops).size).toBe(1);
    }
  });

  it('switches collections, dashboards and pages, and falls back from stale ids (NAV-01 to NAV-04)', async () => {
    const onSelectionChange = vi.fn<(selection: DashboardSelection) => void>();
    render(
      <Shell
        defaultSelection={{ collectionId: 'personal', dashboardId: 'missing' }}
        onSelectionChange={onSelectionChange}
      />,
    );
    await expect
      .poll(() => onSelectionChange.mock.calls[0]?.[0])
      .toEqual({
        collectionId: 'personal',
        dashboardId: 'ops',
        pageId: 'overview',
      });
    if (isPhone) {
      return;
    }
    expect(screen.getByRole('radiogroup', { name: 'Collection' })).toBeTruthy();
    await userEvent.click(screen.getByRole('tab', { name: 'Empty page' }));
    expect(await screen.findByRole('heading', { name: 'This page is empty' })).toBeTruthy();
    expect(onSelectionChange).toHaveBeenLastCalledWith({
      collectionId: 'personal',
      dashboardId: 'ops',
      pageId: 'empty',
    });
    const shared = screen.getByRole('radio', { name: 'Shared' }).closest('label');
    if (shared) {
      await userEvent.click(shared);
    }
    expect(await screen.findByRole('region', { name: 'Team health' })).toBeTruthy();
  });

  it('keeps an unknown widget type, naming it (WID-19)', async () => {
    render(<Shell />);
    expect(await screen.findByText('Unknown widget type “acme.retired”')).toBeTruthy();
  });

  it('hides editing for locked dashboards and without permissions (PERM-01, PERM-02, acceptance 15)', async () => {
    const { onSaveDashboard } = useSaving();
    const { rerender } = render(
      <Shell
        selection={{ collectionId: 'personal', dashboardId: 'locked', pageId: 'locked-page' }}
        onSaveDashboard={onSaveDashboard}
      />,
    );
    await screen.findByRole('region', { name: 'Health' });
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Health' }));
    expect(screen.queryByRole('menuitem', { name: 'Configure' })).toBeNull();
    await userEvent.keyboard('{Escape}');
    const library = sampleLibrary();
    const personal = library.collections[0];
    if (personal) {
      personal.permissions = undefined;
    }
    rerender(
      <UIProvider locale="en-US">
        <Dashboard
          library={library}
          widgetTypes={types}
          dataSources={[kpiSource(), regionTableSource()]}
          height="800px"
          onSaveDashboard={onSaveDashboard}
        />
      </UIProvider>,
    );
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
  });

  it('refreshes every widget, and offers auto-refresh intervals (NAV-08)', async () => {
    const load = vi.fn(() => Promise.resolve({ items: [{ label: 'Uptime', value: 1 }] }));
    const onRefreshIntervalChange = vi.fn();
    render(
      <Shell
        dataSources={[{ id: 'kpis', label: 'KPIs', produces: 'stats', load }, regionTableSource()]}
        onRefreshIntervalChange={onRefreshIntervalChange}
      />,
    );
    await expect.poll(() => load.mock.calls.length).toBe(1);
    await userEvent.click(
      screen.getByRole('button', { name: isPhone ? 'Refresh dashboard' : 'Refresh' }),
    );
    await expect.poll(() => load.mock.calls.length).toBe(2);
    if (!isPhone) {
      await userEvent.click(screen.getByRole('button', { name: 'Auto-refresh' }));
      await userEvent.click(await screen.findByRole('menuitemradio', { name: '5 min' }));
      expect(onRefreshIntervalChange).toHaveBeenCalledWith(300_000);
    }
  });

  it('goes full screen as an overlay, and Escape comes back (NAV-09)', async () => {
    render(<Shell />);
    await userEvent.click(
      screen.getByRole('button', { name: isPhone ? 'More dashboard actions' : 'Full screen' }),
    );
    if (isPhone) {
      await userEvent.click(await screen.findByRole('menuitem', { name: 'Full screen' }));
    }
    const root = document.querySelector('section[aria-labelledby]');
    await expect.poll(() => root?.className).toContain('fixed');
    await expect.poll(() => screen.queryByRole('menu')).toBeNull();
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => root?.className).not.toContain('fixed');
  });

  it('shows the empty states (§11.5)', () => {
    const { rerender } = render(<Shell library={{ collections: [] }} />);
    expect(screen.getByRole('heading', { name: 'There are no dashboards to show' })).toBeTruthy();
    const { onSaveDashboard } = useSaving();
    rerender(
      <UIProvider locale="en-US">
        <Dashboard
          library={{
            collections: [
              { id: 'c', name: 'Mine', dashboards: [], permissions: { canAddDashboard: true } },
            ],
          }}
          widgetTypes={types}
          onSaveDashboard={onSaveDashboard}
          height="600px"
        />
      </UIProvider>,
    );
    expect(screen.getByRole('heading', { name: 'No dashboards yet' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'New dashboard' })).toBeTruthy();
  });

  it('stops rendering once settled, and passes axe', async () => {
    let commits = 0;
    const { container } = render(
      <Profiler
        id="dashboard"
        onRender={() => {
          commits += 1;
        }}
      >
        <Shell />
      </Profiler>,
    );
    await screen.findAllByText('Uptime');
    const settled = async () => {
      const before = commits;
      await new Promise((resolve) => setTimeout(resolve, 250));
      return commits - before;
    };
    await expect.poll(settled, { timeout: 8000 }).toBe(0);
    await expectNoAxeViolations(container);
  });
});

describe('Dashboard: editing', () => {
  it('adds a widget from the picker, configures it, and saves (EDIT-09, EDIT-10, EDIT-22, EDIT-27)', async () => {
    const { saves, onSaveDashboard } = useSaving();
    render(<Shell onSaveDashboard={onSaveDashboard} />);
    await editPage();
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Widget…' }));
    const picker = await screen.findByRole('dialog', { name: 'Add a widget' });
    await userEvent.click(within(picker).getByRole('option', { name: /Stat group/ }));
    const configure = await screen.findByRole('dialog', { name: 'Configure Stat group' });
    const apply = within(configure).getByRole('button', { name: 'Apply' });
    expect(apply.hasAttribute('disabled') || apply.getAttribute('aria-disabled') === 'true').toBe(
      true,
    );
    await userEvent.click(within(configure).getByRole('button', { name: /Data source/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Key figures' }));
    await userEvent.click(within(configure).getByRole('button', { name: 'Apply' }));
    await expect
      .poll(() => screen.queryByRole('dialog', { name: 'Configure Stat group' }))
      .toBeNull();
    expect(screen.getAllByRole('region', { name: 'Stat group' })).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await expect.poll(() => saves.length).toBe(1);
    const saved = saves[0];
    expect(saved?.pages[0]?.widgets).toHaveLength(4);
    // Every saved layout is placed (MOD-07), and unknown properties and types survive (MOD-03, MOD-04).
    expect(
      saved?.pages[0]?.widgets.every(
        (item) => item.layout.x !== undefined && item.layout.y !== undefined,
      ),
    ).toBe(true);
    expect(saved?.meta).toEqual({ owner: 'ops-team', unknown: { kept: true } });
    expect(saved?.pages[0]?.widgets.find((item) => item.id === 'retired')?.options).toEqual({
      keep: 'me',
    });
    expect(onSaveDashboard.mock.calls[0]?.[1]).toEqual({ collectionId: 'personal', isNew: false });
  });

  it('undoes a removal, bringing the widget back as it was (EDIT-20, EDIT-31, acceptance 12)', async () => {
    const { onSaveDashboard } = useSaving();
    render(<Shell onSaveDashboard={onSaveDashboard} />);
    await editPage();
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Health' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Remove' }));
    await expect.poll(() => screen.queryByRole('region', { name: 'Health' })).toBeNull();
    await userEvent.click(
      within(screen.getByRole('toolbar', { name: 'Editing tools' })).getByRole('button', {
        name: 'Undo',
      }),
    );
    expect(await screen.findByRole('region', { name: 'Health' })).toBeTruthy();
    if (isDesktop) {
      await userEvent.click(screen.getByRole('button', { name: 'Actions for Health' }));
      await userEvent.click(await screen.findByRole('menuitem', { name: 'Remove' }));
      await expect.poll(() => screen.queryByRole('region', { name: 'Health' })).toBeNull();
      // The keyboard shortcut, from anywhere in the dashboard but a text field.
      act(() => {
        screen.getByRole('toolbar', { name: 'Editing tools' }).focus();
      });
      await userEvent.keyboard(
        navigator.platform.includes('Mac') ? '{Meta>}z{/Meta}' : '{Control>}z{/Control}',
      );
      expect(await screen.findByRole('region', { name: 'Health' })).toBeTruthy();
    }
  });

  it('asks before leaving with unsaved changes: keep editing, save and exit, or discard (EDIT-28, acceptance 13)', async () => {
    const { saves, onSaveDashboard } = useSaving();
    const onDirtyChange = vi.fn<(isDirty: boolean) => void>();
    render(<Shell onSaveDashboard={onSaveDashboard} onDirtyChange={onDirtyChange} />);
    await editPage();
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Regions' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Remove' }));
    await expect.poll(() => onDirtyChange.mock.calls.at(-1)?.[0]).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    let dialog = await screen.findByRole('alertdialog', { name: 'Save your changes?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByRole('toolbar', { name: 'Editing tools' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    dialog = await screen.findByRole('alertdialog', { name: 'Save your changes?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save and exit' }));
    await expect.poll(() => screen.queryByRole('toolbar', { name: 'Editing tools' })).toBeNull();
    expect(saves).toHaveLength(1);
    expect(screen.queryByRole('region', { name: 'Regions' })).toBeNull();
  });

  it('discards changes on Discard and exit', async () => {
    const { saves, onSaveDashboard } = useSaving();
    render(<Shell onSaveDashboard={onSaveDashboard} />);
    await editPage();
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Regions' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Remove' }));
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Save your changes?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Discard and exit' }));
    expect(await screen.findByRole('region', { name: 'Regions' })).toBeTruthy();
    expect(saves).toHaveLength(0);
  });

  it('keeps a shared collection’s notice in view, and restates it before saving (PERM-03, EDIT-29, acceptance 14)', async () => {
    const { saves, onSaveDashboard } = useSaving();
    render(
      <Shell defaultSelection={{ collectionId: 'shared' }} onSaveDashboard={onSaveDashboard} />,
    );
    await editPage();
    const notice = 'This dashboard is shared with your team. Changes affect everyone.';
    expect(screen.getByRole('alert').textContent).toContain(notice);
    const title = screen.getByRole('textbox', { name: 'Page title' });
    await userEvent.clear(title);
    await userEvent.type(title, 'Renamed{Enter}');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    const confirm = await screen.findByRole('alertdialog', { name: 'Save this shared dashboard?' });
    expect(confirm.textContent).toContain(notice);
    await userEvent.click(within(confirm).getByRole('button', { name: 'Save' }));
    await expect.poll(() => saves[0]?.pages[0]?.title).toBe('Renamed');
  });

  it('saves a page title change, keeping unknown fields and types (acceptance 19)', async () => {
    const { saves, onSaveDashboard } = useSaving();
    render(<Shell onSaveDashboard={onSaveDashboard} />);
    await editPage();
    const title = screen.getByRole('textbox', { name: 'Page title' });
    await userEvent.clear(title);
    await userEvent.type(title, 'Traffic{Enter}');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await expect.poll(() => saves.length).toBe(1);
    const saved = saves[0];
    expect(saved?.pages[0]?.title).toBe('Traffic');
    expect(saved?.meta).toEqual({ owner: 'ops-team', unknown: { kept: true } });
    const retired = saved?.pages[0]?.widgets.find((item) => item.type === 'acme.retired');
    expect(retired).toMatchObject({ id: 'retired', title: 'Old widget', options: { keep: 'me' } });
  });

  it('shows a save failure with Retry, keeping the session (EDIT-27)', async () => {
    let attempts = 0;
    const onSaveDashboard = vi.fn((document: DashboardDocument) => {
      attempts += 1;
      return attempts === 1
        ? Promise.reject(new Error('Server unavailable'))
        : Promise.resolve(document);
    });
    render(<Shell onSaveDashboard={onSaveDashboard} />);
    await editPage();
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Regions' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Remove' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect((await screen.findByText('Server unavailable')).textContent).toBe('Server unavailable');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await expect.poll(() => screen.queryByText('Server unavailable')).toBeNull();
    expect(attempts).toBe(2);
  });

  it('saves a widget configured in view mode at once, and puts it back if that fails (EDIT-25)', async () => {
    let shouldFail = false;
    const onSaveDashboard = vi.fn((document: DashboardDocument) =>
      shouldFail ? Promise.reject(new Error('nope')) : Promise.resolve(document),
    );
    function Host() {
      const [library] = useState(sampleLibrary);
      return (
        <UIProvider locale="en-US">
          <Dashboard
            library={library}
            widgetTypes={types}
            dataSources={[kpiSource(), regionTableSource()]}
            onSaveDashboard={onSaveDashboard}
            height="800px"
          />
        </UIProvider>
      );
    }
    render(<Host />);
    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Health' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Configure' }));
    let dialog = await screen.findByRole('dialog', { name: 'Configure Health' });
    await userEvent.click(within(dialog).getByRole('tab', { name: 'General' }));
    let field = within(dialog).getByRole('textbox', { name: 'Title' });
    await userEvent.clear(field);
    await userEvent.type(field, 'Uptime figures');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Apply' }));
    expect(await screen.findByRole('region', { name: 'Uptime figures' })).toBeTruthy();
    expect(onSaveDashboard).toHaveBeenCalledTimes(1);
    shouldFail = true;
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Uptime figures' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Configure' }));
    dialog = await screen.findByRole('dialog', { name: 'Configure Uptime figures' });
    await userEvent.click(within(dialog).getByRole('tab', { name: 'General' }));
    field = within(dialog).getByRole('textbox', { name: 'Title' });
    await userEvent.clear(field);
    await userEvent.type(field, 'Broken');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Apply' }));
    expect(await screen.findByRole('region', { name: 'Uptime figures' })).toBeTruthy();
  });
});
