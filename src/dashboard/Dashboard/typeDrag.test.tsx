// Dragging a widget type from the picker onto the grid (EDIT-11). Pointer events are dispatched directly: the drag
// starts in a modal dialog that closes under the pointer, which a real-pointer drag-and-drop helper can't follow.
import { act, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { kpiSource, regionTableSource, sampleLibrary } from '../../../test/dashboard';
import { toast } from '../../components/Toast/toastStore';
import { UIProvider } from '../../provider/UIProvider';
import { tableWidget } from '../table/tableWidget';
import type { DashboardDocument } from '../types';
import { statGroupWidget } from '../widgets/statGroup';
import { Dashboard } from './Dashboard';

afterEach(() => {
  toast.clear();
});

const isDesktop = window.innerWidth >= 1024;

function pointer(type: string, target: EventTarget, x: number, y: number, pointerType = 'mouse') {
  act(() => {
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        pointerId: 7,
        pointerType,
        button: 0,
        isPrimary: true,
      }),
    );
  });
}

function renderEditing() {
  const saves: DashboardDocument[] = [];
  render(
    <UIProvider locale="en-US">
      <Dashboard
        library={sampleLibrary()}
        widgetTypes={[statGroupWidget, tableWidget]}
        dataSources={[kpiSource(), regionTableSource()]}
        onSaveDashboard={(document) => {
          saves.push(document);
          return Promise.resolve(document);
        }}
        defaultMode="edit"
        height="800px"
      />
    </UIProvider>,
  );
  return saves;
}

/** Opens the picker and presses on the stat group, returning the option's middle. */
async function pressStatGroup() {
  await userEvent.click(await screen.findByRole('button', { name: 'Add' }));
  await userEvent.click(await screen.findByRole('menuitem', { name: 'Widget…' }));
  const option = await screen.findByRole('option', { name: /Stat group/ });
  const box = option.getBoundingClientRect();
  const start = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  pointer('pointerdown', option, start.x, start.y);
  return start;
}

/** A point in the grid's right half, below the widgets there. */
function gridPoint() {
  const box = screen
    .getByRole('region', { name: 'Dashboard page: Overview' })
    .getBoundingClientRect();
  return { x: box.right - 60, y: box.top + box.height * 0.7 };
}

describe.runIf(isDesktop)('Dashboard: dragging a type from the picker (EDIT-11)', () => {
  it('previews where the widget would land, inserts it there on drop, and undo takes it out', async () => {
    const saves = renderEditing();
    const start = await pressStatGroup();
    // Moving past the tap slop starts the drag, and the picker gets out of the way.
    pointer('pointermove', window, start.x + 20, start.y);
    await expect.poll(() => screen.queryByRole('dialog', { name: 'Add a widget' })).toBeNull();
    const target = gridPoint();
    pointer('pointermove', window, target.x, target.y);
    const grid = screen.getByRole('region', { name: 'Dashboard page: Overview' });
    // The placeholder shows the type's default size.
    expect(await within(grid).findByText('3 × 4')).toBeTruthy();
    pointer('pointerup', window, target.x, target.y);
    expect(await screen.findByRole('region', { name: 'Stat group' })).toBeTruthy();
    expect(within(grid).queryByText('3 × 4')).toBeNull();
    expect(await screen.findByText('Stat group placed at column 10, row 5, 3 by 4.')).toBeTruthy();
    // It needs a data source, so Configure opens, as when it's picked (EDIT-10).
    const configure = await screen.findByRole('dialog', { name: 'Configure Stat group' });
    await userEvent.click(within(configure).getByRole('button', { name: 'Cancel' }));
    await expect.poll(() => screen.queryByRole('dialog')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await expect.poll(() => saves.length).toBe(1);
    const widget = saves[0]?.pages[0]?.widgets.find(
      (item) => item.type === 'ccux.statGroup' && item.id !== 'health',
    );
    expect(widget?.layout).toMatchObject({ x: 9, y: 4, w: 3, h: 4 });
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await expect.poll(() => screen.queryByRole('region', { name: 'Stat group' })).toBeNull();
  });

  it('cancels with Escape, or when let go outside the grid', async () => {
    renderEditing();
    let start = await pressStatGroup();
    pointer('pointermove', window, start.x + 20, start.y);
    await expect.poll(() => screen.queryByRole('dialog', { name: 'Add a widget' })).toBeNull();
    const target = gridPoint();
    pointer('pointermove', window, target.x, target.y);
    const grid = screen.getByRole('region', { name: 'Dashboard page: Overview' });
    expect(await within(grid).findByText('3 × 4')).toBeTruthy();
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => within(grid).queryByText('3 × 4')).toBeNull();
    pointer('pointerup', window, target.x, target.y);
    expect(screen.queryByRole('region', { name: 'Stat group' })).toBeNull();
    // Still editing: Escape went to the drag, not to anything else.
    expect(screen.getByRole('toolbar', { name: 'Editing tools' })).toBeTruthy();

    start = await pressStatGroup();
    pointer('pointermove', window, start.x + 20, start.y);
    await expect.poll(() => screen.queryByRole('dialog', { name: 'Add a widget' })).toBeNull();
    pointer('pointermove', window, 5, 5);
    pointer('pointerup', window, 5, 5);
    expect(screen.queryByRole('region', { name: 'Stat group' })).toBeNull();
  });

  it('needs a long press to start dragging on a touch screen; a quicker move scrolls', async () => {
    renderEditing();
    await userEvent.click(await screen.findByRole('button', { name: 'Add' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Widget…' }));
    const option = await screen.findByRole('option', { name: /Stat group/ });
    const box = option.getBoundingClientRect();
    pointer('pointerdown', option, box.left + 10, box.top + 10, 'touch');
    pointer('pointermove', window, box.left + 10, box.top + 40, 'touch');
    expect(screen.getByRole('dialog', { name: 'Add a widget' })).toBeTruthy();
    pointer('pointercancel', window, box.left + 10, box.top + 40, 'touch');

    pointer('pointerdown', option, box.left + 10, box.top + 10, 'touch');
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 600)));
    pointer('pointermove', window, box.left + 10, box.top + 40, 'touch');
    await expect.poll(() => screen.queryByRole('dialog', { name: 'Add a widget' })).toBeNull();
    pointer('pointercancel', window, box.left + 10, box.top + 40, 'touch');
  });
});

describe.runIf(!isDesktop)('Dashboard: dragging a type where the grid can’t be arranged', () => {
  it('adds nothing on drop; picking it still adds it', async () => {
    renderEditing();
    const start = await pressStatGroup();
    pointer('pointermove', window, start.x + 20, start.y);
    await expect.poll(() => screen.queryByRole('dialog', { name: 'Add a widget' })).toBeNull();
    pointer('pointermove', window, start.x + 20, start.y + 100);
    pointer('pointerup', window, start.x + 20, start.y + 100);
    expect(screen.queryByRole('region', { name: 'Stat group' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Widget…' }));
    await userEvent.click(await screen.findByRole('option', { name: /Stat group/ }));
    expect(await screen.findByRole('region', { name: 'Stat group' })).toBeTruthy();
  });
});
