// The shell's management features (phase 3): Manage dashboards from the header, templates, page settings with a
// rescaled preview, save conflicts, and restoring a draft the host kept.
import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { kpiSource, regionTableSource, sampleLibrary } from '../../../test/dashboard';
import { toast } from '../../components/Toast/toastStore';
import { UIProvider } from '../../provider/UIProvider';
import { tableWidget } from '../table/tableWidget';
import type {
  CollectionChangeResult,
  CollectionChangeSet,
  DashboardDocument,
  PageTemplate,
} from '../types';
import { statGroupWidget } from '../widgets/statGroup';
import { Dashboard, type DashboardProps, type SaveDashboardMeta } from './Dashboard';
import type { DashboardDraft } from './editSession';

afterEach(() => {
  toast.clear();
});

const isPhone = window.innerWidth < 672;
const isDesktop = window.innerWidth >= 1024;
const types = [statGroupWidget, tableWidget];

function Shell(props: Partial<DashboardProps>) {
  return (
    <UIProvider locale="en-US">
      <Dashboard
        library={sampleLibrary()}
        widgetTypes={types}
        dataSources={[kpiSource(), regionTableSource()]}
        height="800px"
        onSaveDashboard={(document) => Promise.resolve(document)}
        {...props}
      />
    </UIProvider>
  );
}

/** Opens an item of the Edit menu (the overflow menu on phones). */
async function editMenu(item: 'Edit this page' | 'Manage dashboards') {
  await userEvent.click(
    screen.getByRole('button', { name: isPhone ? 'More dashboard actions' : 'Edit' }),
  );
  await userEvent.click(await screen.findByRole('menuitem', { name: item }));
}

type Save = (document: DashboardDocument, meta: SaveDashboardMeta) => Promise<DashboardDocument>;

describe('Dashboard: Manage dashboards (§13)', () => {
  it('opens from the Edit menu and shows the applied changes until the host’s library catches up (PERS-01)', async () => {
    const onApply = vi.fn<(changes: CollectionChangeSet) => Promise<CollectionChangeResult>>(() =>
      Promise.resolve(),
    );
    render(<Shell onApplyCollectionChanges={onApply} />);
    await screen.findByRole('region', { name: 'Health' });
    await editMenu('Manage dashboards');
    const dialog = await screen.findByRole('dialog', { name: 'Manage dashboards' });
    await userEvent.click(within(dialog).getByRole('row', { name: 'Operations' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Edit Title' }));
    const title = within(dialog).getByRole('textbox', { name: 'Title' });
    await userEvent.clear(title);
    await userEvent.type(title, 'Production{Enter}');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Apply' }));
    await expect.poll(() => onApply.mock.calls.length).toBe(1);
    expect(onApply.mock.calls[0]?.[0].updated.map((item) => item.title)).toEqual(['Production']);
    await expect.poll(() => screen.queryByRole('dialog', { name: 'Manage dashboards' })).toBeNull();
    expect(await screen.findByText('Changes applied')).toBeTruthy();
    expect(await screen.findByRole('heading', { name: 'Production / Overview' })).toBeTruthy();
  });

  it('isn’t offered without a host callback, or from a locked dashboard (acceptance 15)', async () => {
    const { rerender } = render(<Shell />);
    await screen.findByRole('region', { name: 'Health' });
    await userEvent.click(
      screen.getByRole('button', { name: isPhone ? 'More dashboard actions' : 'Edit' }),
    );
    expect(await screen.findByRole('menuitem', { name: 'Edit this page' })).toBeTruthy();
    expect(screen.queryByRole('menuitem', { name: 'Manage dashboards' })).toBeNull();
    await userEvent.keyboard('{Escape}');
    rerender(
      <Shell
        onApplyCollectionChanges={() => Promise.resolve()}
        selection={{ collectionId: 'personal', dashboardId: 'locked', pageId: 'locked-page' }}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    if (isPhone) {
      await userEvent.click(screen.getByRole('button', { name: 'More dashboard actions' }));
      expect(screen.queryByRole('menuitem', { name: 'Manage dashboards' })).toBeNull();
    }
  });
});

describe('Dashboard: templates (NAV-12, NAV-13)', () => {
  const template: PageTemplate = {
    id: 'kpis',
    name: 'Key figures',
    description: 'The service’s headline numbers',
    widgets: [
      {
        id: 'figures',
        type: 'ccux.statGroup',
        title: 'Figures',
        layout: { w: 6, h: 3 },
        data: { sourceId: 'kpis' },
      },
    ],
  };

  it('adds a page from a template, with new ids, and shows it', async () => {
    const saves: DashboardDocument[] = [];
    const onSaveDashboard = vi.fn<Save>((document) => {
      saves.push(document);
      return Promise.resolve(document);
    });
    render(<Shell templates={[template]} onSaveDashboard={onSaveDashboard} />);
    await screen.findByRole('region', { name: 'Health' });
    await editMenu('Edit this page');
    await userEvent.click(await screen.findByRole('button', { name: 'Add' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Page from template…' }));
    const picker = await screen.findByRole('dialog', { name: 'Add a page from a template' });
    await userEvent.click(within(picker).getByRole('option', { name: /Key figures/ }));
    expect(await screen.findByRole('region', { name: 'Figures' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await expect.poll(() => saves.length).toBe(1);
    const added = saves[0]?.pages.at(-1);
    expect(added?.title).toBe('Key figures');
    expect(added?.widgets[0]?.id).not.toBe('figures');
    expect(added?.widgets[0]?.layout).toMatchObject({ x: 0, y: 0, w: 6, h: 3 });
  });

  it('offers a template in an empty collection', async () => {
    render(
      <Shell
        templates={[template]}
        library={{
          collections: [
            { id: 'mine', name: 'Mine', dashboards: [], permissions: { canAddDashboard: true } },
          ],
        }}
      />,
    );
    await userEvent.click(await screen.findByRole('button', { name: 'From template…' }));
    await userEvent.click(await screen.findByRole('option', { name: /Key figures/ }));
    expect(await screen.findByRole('toolbar', { name: 'Editing tools' })).toBeTruthy();
    expect(await screen.findByRole('region', { name: 'Figures' })).toBeTruthy();
  });
});

describe.runIf(isDesktop)('Dashboard: page settings (EDIT-26, acceptance 20)', () => {
  it('previews the layout rescaled to 24 columns and stores the rescaled positions', async () => {
    const saves: DashboardDocument[] = [];
    const onSaveDashboard = vi.fn<Save>((document) => {
      saves.push(document);
      return Promise.resolve(document);
    });
    render(<Shell onSaveDashboard={onSaveDashboard} />);
    await screen.findByRole('region', { name: 'Health' });
    await editMenu('Edit this page');
    await userEvent.click(screen.getByRole('button', { name: 'Page settings' }));
    const dialog = await screen.findByRole('dialog', { name: 'Page settings' });
    await userEvent.click(within(dialog).getByRole('button', { name: /Columns/ }));
    await userEvent.click(await screen.findByRole('option', { name: '24' }));
    expect(
      within(dialog).getByRole('img', {
        name: 'Layout preview. Widgets are rescaled from 12 to 24 columns, as shown.',
      }),
    ).toBeTruthy();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Apply' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await expect.poll(() => saves.length).toBe(1);
    const page = saves[0]?.pages[0];
    expect(page?.grid?.columns).toBe(24);
    expect(page?.widgets.find((item) => item.id === 'regions')?.layout).toMatchObject({
      x: 12,
      w: 12,
    });
  });

  it('is hidden by the host’s policy, and locks fields it names', async () => {
    const { rerender } = render(
      <Shell gridSettingsPolicy={{ isHidden: true }} defaultMode="edit" />,
    );
    await screen.findByRole('toolbar', { name: 'Editing tools' });
    expect(screen.queryByRole('button', { name: 'Page settings' })).toBeNull();
    rerender(<Shell gridSettingsPolicy={{ lockedFields: ['columns'] }} defaultMode="edit" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Page settings' }));
    const dialog = await screen.findByRole('dialog', { name: 'Page settings' });
    expect(within(dialog).getByRole('button', { name: /Columns/ })).toBeDisabled();
  });
});

describe('Dashboard: save conflicts (PERS-07)', () => {
  it('offers Overwrite, which saves again with isForced', async () => {
    const onSaveDashboard = vi
      .fn<Save>()
      .mockRejectedValueOnce(Object.assign(new Error('Changed meanwhile'), { status: 409 }))
      .mockImplementation((document) => Promise.resolve(document));
    render(<Shell onSaveDashboard={onSaveDashboard} defaultMode="edit" />);
    const title = await screen.findByRole('textbox', { name: 'Page title' });
    await userEvent.type(title, ' 2{Enter}');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    const dialog = await screen.findByRole('alertdialog', {
      name: 'This dashboard changed since you opened it',
    });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Overwrite' }));
    await expect.poll(() => onSaveDashboard.mock.calls.length).toBe(2);
    expect(onSaveDashboard.mock.calls[1]?.[1]).toMatchObject({ isForced: true });
    await expect.poll(() => screen.queryByRole('alertdialog')).toBeNull();
  });

  it('reloads the latest version, dropping the draft, with a host predicate', async () => {
    const onSaveDashboard = vi.fn<Save>(() => Promise.reject(new Error('stale')));
    render(
      <Shell
        onSaveDashboard={onSaveDashboard}
        isConflictError={(error) => error instanceof Error && error.message === 'stale'}
        defaultMode="edit"
      />,
    );
    const title = await screen.findByRole('textbox', { name: 'Page title' });
    await userEvent.clear(title);
    await userEvent.type(title, 'Mine{Enter}');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reload latest' }));
    await expect
      .poll(() => screen.getByRole<HTMLInputElement>('textbox', { name: 'Page title' }).value)
      .toBe('Overview');
    expect(screen.getByRole('toolbar', { name: 'Editing tools' })).toBeTruthy();
  });
});

describe('Dashboard: drafts (PERS-05)', () => {
  it('reports the draft as it changes, and restores it into edit mode later', async () => {
    const onDraftChange = vi.fn<(draft: DashboardDraft | null) => void>();
    const { unmount } = render(<Shell onDraftChange={onDraftChange} defaultMode="edit" />);
    const title = await screen.findByRole('textbox', { name: 'Page title' });
    await userEvent.clear(title);
    await userEvent.type(title, 'Drafted{Enter}');
    await expect
      .poll(() => onDraftChange.mock.calls.at(-1)?.[0]?.document.pages[0]?.title)
      .toBe('Drafted');
    const kept = JSON.parse(JSON.stringify(onDraftChange.mock.calls.at(-1)?.[0])) as DashboardDraft;
    unmount();

    const onModeChange = vi.fn();
    render(<Shell draft={kept} onModeChange={onModeChange} />);
    expect(await screen.findByRole('toolbar', { name: 'Editing tools' })).toBeTruthy();
    expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Page title' }).value).toBe(
      'Drafted',
    );
    expect(await screen.findByText('Your unsaved changes were restored.')).toBeTruthy();
    expect(onModeChange).toHaveBeenCalledWith('edit');
    // Unsaved, so Save is enabled.
    expect(screen.getByRole('button', { name: 'Save' })).not.toHaveAttribute('data-disabled');
  });

  it('drops a draft that isn’t a valid dashboard, telling the host', async () => {
    const onDraftChange = vi.fn<(draft: DashboardDraft | null) => void>();
    render(
      <Shell
        draft={{
          collectionId: 'personal',
          isNew: false,
          document: { title: 42 } as unknown as DashboardDocument,
        }}
        onDraftChange={onDraftChange}
      />,
    );
    await screen.findByRole('region', { name: 'Health' });
    await expect.poll(() => onDraftChange.mock.calls.at(-1)).toEqual([null]);
    expect(screen.queryByRole('toolbar', { name: 'Editing tools' })).toBeNull();
  });
});
