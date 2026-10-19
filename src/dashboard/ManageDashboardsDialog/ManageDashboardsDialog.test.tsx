import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { UIProvider } from '../../provider/UIProvider';
import type {
  CollectionChangeResult,
  CollectionChangeSet,
  DashboardCollection,
  DashboardDocument,
  PageTemplate,
} from '../types';
import { ManageDashboardsDialog, type ManageDashboardsDialogProps } from './ManageDashboardsDialog';

function dashboard(id: string, title: string, order: number, pages: string[], isLocked = false) {
  const document: DashboardDocument = {
    schemaVersion: 1,
    id,
    title,
    order,
    pages: pages.map((page) => ({ id: page, title: `${title} ${page}`, widgets: [] })),
  };
  if (isLocked) {
    document.isLocked = true;
  }
  return document;
}

function collection(): DashboardCollection {
  return {
    id: 'team',
    name: 'Team',
    permissions: {
      canEdit: true,
      canAddDashboard: true,
      canDeleteDashboard: true,
      canAddPage: true,
      canDeletePage: true,
      canReorder: true,
    },
    dashboards: [
      dashboard('a', 'Alpha', 1, ['one', 'two']),
      dashboard('b', 'Bravo', 2, ['one']),
      dashboard('c', 'Charlie', 3, ['one']),
      dashboard('l', 'Archive', 4, ['one'], true),
    ],
  };
}

type Apply = (changes: CollectionChangeSet) => Promise<CollectionChangeResult>;

function Host(props: Partial<ManageDashboardsDialogProps>) {
  const [isOpen, setOpen] = useState(true);
  return (
    <UIProvider locale="en-US">
      <ManageDashboardsDialog
        collection={collection()}
        isOpen={isOpen}
        onOpenChange={setOpen}
        onApplyCollectionChanges={() => Promise.resolve()}
        {...props}
      />
    </UIProvider>
  );
}

const row = (name: string | RegExp) => screen.getByRole('row', { name });
const dialog = () => screen.getByRole('dialog', { name: 'Manage dashboards' });

describe('ManageDashboardsDialog (§13)', () => {
  it('stages a rename, a page moved to another dashboard and a deletion, then applies one change set (acceptance 18)', async () => {
    const onApply = vi.fn<Apply>(() => Promise.resolve());
    const onApplied = vi.fn<(dashboards: DashboardDocument[]) => void>();
    render(<Host onApplyCollectionChanges={onApply} onApplied={onApplied} />);
    expect(await screen.findByRole('treegrid', { name: 'Dashboards and pages' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Apply' })).toHaveAttribute('data-disabled', 'true');

    await userEvent.click(row('Alpha'));
    await userEvent.click(screen.getByRole('button', { name: 'Edit Title' }));
    const title = screen.getByRole('textbox', { name: 'Title' });
    await userEvent.clear(title);
    await userEvent.type(title, 'Bravo');
    expect(await screen.findByText('Another item here already has this title.')).toBeTruthy();
    const retitle = screen.getByRole('textbox', { name: 'Title' });
    await userEvent.clear(retitle);
    await userEvent.type(retitle, 'Primary{Enter}');
    expect(await screen.findByRole('row', { name: 'Primary' })).toBeTruthy();

    await userEvent.click(row('Bravo one'));
    await userEvent.click(screen.getByRole('button', { name: 'Move to' }));
    // The locked dashboard takes no pages (MGMT-07).
    expect(screen.queryByRole('menuitem', { name: 'Archive' })).toBeNull();
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Primary' }));
    expect(await within(dialog()).findByText('Bravo one moved to Primary')).toBeTruthy();

    await userEvent.click(row('Charlie'));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const confirm = await screen.findByRole('alertdialog', { name: 'Delete “Charlie”?' });
    expect(within(confirm).getByText(/Its page is deleted too/)).toBeTruthy();
    await userEvent.click(within(confirm).getByRole('button', { name: 'Delete' }));
    expect(screen.queryByRole('row', { name: 'Charlie' })).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledTimes(1);
    const changes = onApply.mock.calls[0]?.[0];
    expect(changes?.collectionId).toBe('team');
    expect(changes?.created).toEqual([]);
    expect(changes?.deleted).toEqual(['c']);
    expect(changes?.order).toEqual(['a', 'b', 'l']);
    expect(changes?.updated.map((item) => [item.id, item.title, item.order])).toEqual([
      ['a', 'Primary', 1],
      ['b', 'Bravo', 2],
    ]);
    expect(changes?.updated[0]?.pages.map((page) => page.title)).toEqual([
      'Alpha one',
      'Alpha two',
      'Bravo one',
    ]);
    expect(changes?.updated[1]?.pages).toEqual([]);
    await expect.poll(() => screen.queryByRole('dialog', { name: 'Manage dashboards' })).toBeNull();
    expect(onApplied.mock.calls[0]?.[0].map((item) => item.id)).toEqual(['a', 'b', 'l']);
  });

  it('shows locked items with a lock and offers only reordering for them (MGMT-07)', async () => {
    render(<Host />);
    const locked = await screen.findByRole('row', { name: 'Archive' });
    expect(within(locked).getByText('Locked')).toBeTruthy();
    await userEvent.click(locked);
    const panel = dialog();
    expect(within(panel).queryByRole('button', { name: 'Edit Title' })).toBeNull();
    expect(within(panel).queryByRole('button', { name: 'Delete' })).toBeNull();
    expect(within(panel).queryByRole('button', { name: 'Add page' })).toBeNull();
    expect(within(panel).getByRole('button', { name: 'Move Archive up' })).toBeTruthy();
    // Its page can't be moved out or deleted either.
    await userEvent.click(row('Archive one'));
    expect(within(panel).queryByRole('button', { name: 'Move to' })).toBeNull();
    expect(within(panel).queryByRole('button', { name: 'Delete' })).toBeNull();
  });

  it('moves with buttons and announces the new position (MGMT-02), and adds and duplicates with unique titles (MGMT-08)', async () => {
    const onApply = vi.fn<Apply>(() => Promise.resolve());
    render(<Host onApplyCollectionChanges={onApply} />);
    await userEvent.click(await screen.findByRole('row', { name: 'Bravo' }));
    await userEvent.click(screen.getByRole('button', { name: 'Move Bravo up' }));
    expect(await within(dialog()).findByText('Bravo, moved to position 1 of 4')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
    expect(row('Bravo copy')).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'New dashboard' }));
    await userEvent.click(screen.getByRole('button', { name: 'New dashboard' }));
    expect(row('New dashboard 2')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Add page' }));
    expect(row('New page 2')).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    const changes = onApply.mock.calls[0]?.[0];
    expect(changes?.created.map((item) => item.title)).toEqual([
      'Bravo copy',
      'New dashboard',
      'New dashboard 2',
    ]);
    expect(changes?.order.slice(0, 3)).toEqual(['b', expect.any(String), 'a']);
  });

  it('keeps the dialog open after a partial failure, marks what failed and sends only that again (MGMT-06)', async () => {
    const onApply = vi
      .fn<Apply>()
      .mockResolvedValueOnce({ failed: [{ id: 'c', error: new Error('Forbidden') }] })
      .mockResolvedValueOnce(undefined);
    render(<Host onApplyCollectionChanges={onApply} />);
    await userEvent.click(await screen.findByRole('row', { name: 'Alpha' }));
    await userEvent.click(screen.getByRole('button', { name: 'Edit Title' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Title' }), ' A{Enter}');
    await userEvent.click(row('Charlie'));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(await within(dialog()).findByText('Charlie: Forbidden')).toBeTruthy();
    expect(dialog()).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    const retry = onApply.mock.calls[1]?.[0];
    expect(retry?.updated).toEqual([]);
    expect(retry?.deleted).toEqual(['c']);
  });

  it('adds dashboards and pages from templates through the host’s instantiateTemplate (NAV-13)', async () => {
    const template: PageTemplate = {
      id: 'service',
      name: 'Service health',
      description: 'Uptime, errors and latency',
      widgets: [{ id: 'w', type: 'ccux.statGroup', layout: { w: 4, h: 3 } }],
    };
    const instantiateTemplate = vi.fn((chosen: PageTemplate) =>
      Promise.resolve({ id: 'host-page', title: '', widgets: chosen.widgets }),
    );
    const onApply = vi.fn<Apply>(() => Promise.resolve());
    render(
      <Host
        templates={[template]}
        instantiateTemplate={instantiateTemplate}
        onApplyCollectionChanges={onApply}
      />,
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Dashboard from template…' }));
    await userEvent.click(await screen.findByRole('option', { name: /Service health/ }));
    // The dashboard and its page are both named after the template.
    expect(await screen.findAllByRole('row', { name: 'Service health' })).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    const created = onApply.mock.calls[0]?.[0].created[0];
    expect(created?.title).toBe('Service health');
    // New ids for the page and its widgets (MOD-02).
    expect(created?.pages[0]?.id).not.toBe('host-page');
    expect(created?.pages[0]?.widgets[0]?.id).not.toBe('w');
    expect(created?.pages[0]?.title).toBe('Service health');
  });

  it('restates the shared notice and passes axe', async () => {
    render(<Host editNotice="This collection is shared with your team." />);
    await screen.findByRole('treegrid');
    expect(within(dialog()).getByText('This collection is shared with your team.')).toBeTruthy();
    await userEvent.click(row('Alpha'));
    // The dialog itself: React Aria's global announcer keeps entries from earlier tests for a few seconds.
    await expectNoAxeViolations(dialog());
  });
});
