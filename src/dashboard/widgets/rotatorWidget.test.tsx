import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { toast } from '../../components/Toast/toastStore';
import { UIProvider } from '../../provider/UIProvider';
import { Dashboard } from '../Dashboard/Dashboard';
import type { DashboardLibrary, JsonValue } from '../types';
import { rotatorWidget } from './rotatorWidget';
import { statGroupWidget } from './statGroup';
import { textWidget } from './textWidget';

afterEach(() => {
  toast.clear();
});

function library(children: JsonValue[], intervalMs = 1000): DashboardLibrary {
  return {
    collections: [
      {
        id: 'c',
        name: 'C',
        permissions: { canEdit: true },
        dashboards: [
          {
            schemaVersion: 1,
            id: 'd',
            title: 'Wall',
            pages: [
              {
                id: 'p',
                title: 'P',
                widgets: [
                  {
                    id: 'r',
                    type: 'ccux.rotator',
                    title: 'Highlights',
                    layout: { w: 12, h: 6 },
                    options: { intervalMs, hasControls: true, children },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

const note = (id: string, body: string): JsonValue => ({
  id,
  type: 'ccux.text',
  title: id,
  layout: { w: 1, h: 1 },
  options: { body },
});

describe('rotator widget (§10.7)', () => {
  it('shows its widgets in turn, and moves on from its controls with an announcement', async () => {
    render(
      <UIProvider locale="en-US">
        <Dashboard
          library={library([note('First', 'One'), note('Second', 'Two'), note('Third', 'Three')])}
          widgetTypes={[rotatorWidget, textWidget]}
          height="700px"
        />
      </UIProvider>,
    );
    const rotator = screen.getByRole('region', { name: 'Highlights' });
    expect(await within(rotator).findByRole('region', { name: 'First' })).toBeTruthy();
    // Hovering pauses rotation: the pointer may still be where an earlier test left it.
    await userEvent.unhover(rotator);
    // The next widget is mounted ahead of its turn, but hidden.
    expect(within(rotator).queryByRole('region', { name: 'Second' })).toBeNull();
    expect(
      await within(rotator).findByRole('region', { name: 'Second' }, { timeout: 3000 }),
    ).toBeTruthy();
    const controls = within(rotator).getByRole('group', { name: 'Rotation' });
    await userEvent.click(within(controls).getByRole('button', { name: 'Next widget' }));
    expect(await within(rotator).findByRole('region', { name: 'Third' })).toBeTruthy();
    expect(within(rotator).getByText('3 of 3: Third')).toBeTruthy();
    await userEvent.click(within(controls).getByRole('button', { name: 'Previous widget' }));
    expect(await within(rotator).findByRole('region', { name: 'Second' })).toBeTruthy();
  });

  it('loads only the shown widget, and the next one shortly before its turn (BI-13)', async () => {
    const first = vi.fn(() => Promise.resolve({ items: [{ label: 'A', value: 1 }] }));
    const second = vi.fn(() => Promise.resolve({ items: [{ label: 'B', value: 2 }] }));
    const stats = (id: string): JsonValue => ({
      id,
      type: 'ccux.statGroup',
      title: id,
      layout: { w: 1, h: 1 },
      data: { sourceId: id },
    });
    render(
      <UIProvider locale="en-US">
        <Dashboard
          library={library([stats('one'), stats('two')], 1600)}
          widgetTypes={[rotatorWidget, statGroupWidget]}
          dataSources={[
            { id: 'one', label: 'One', produces: 'stats', load: first },
            { id: 'two', label: 'Two', produces: 'stats', load: second },
          ]}
          height="700px"
        />
      </UIProvider>,
    );
    await expect.poll(() => first.mock.calls.length).toBe(1);
    expect(second).not.toHaveBeenCalled();
    // Hovering pauses rotation: the pointer may still be where an earlier test left it.
    await userEvent.unhover(screen.getByRole('region', { name: 'Highlights' }));
    await expect.poll(() => second.mock.calls.length, { timeout: 3000 }).toBe(1);
    // It loaded before its turn: the first is still shown.
    expect(screen.getByRole('region', { name: 'one' })).toBeTruthy();
  });

  it('pauses from its controls and in edit mode', async () => {
    render(
      <UIProvider locale="en-US">
        <Dashboard
          library={library([note('First', 'One'), note('Second', 'Two')])}
          widgetTypes={[rotatorWidget, textWidget]}
          onSaveDashboard={(document) => Promise.resolve(document)}
          defaultMode="edit"
          height="700px"
        />
      </UIProvider>,
    );
    const rotator = await screen.findByRole('region', { name: 'Highlights' });
    expect(await within(rotator).findByRole('region', { name: 'First' })).toBeTruthy();
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 1500)));
    expect(within(rotator).getByRole('region', { name: 'First' })).toBeTruthy();
  });

  it('arranges its widgets in the configure dialog', async () => {
    render(
      <UIProvider locale="en-US">
        <Dashboard
          library={library([note('First', 'One'), note('Second', 'Two')])}
          widgetTypes={[rotatorWidget, textWidget]}
          onSaveDashboard={(document) => Promise.resolve(document)}
          defaultMode="edit"
          height="700px"
        />
      </UIProvider>,
    );
    const rotator = await screen.findByRole('region', { name: 'Highlights' });
    await userEvent.click(within(rotator).getByRole('button', { name: 'Actions for Highlights' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Configure' }));
    const dialog = await screen.findByRole('dialog', { name: 'Configure Highlights' });
    await userEvent.click(within(dialog).getByRole('tab', { name: 'Display' }));
    const list = within(dialog).getByRole('list', { name: 'Widgets' });
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['First', 'Second']);
    await userEvent.click(within(list).getByRole('button', { name: 'Move Second up' }));
    await userEvent.click(within(list).getByRole('button', { name: 'Remove: First' }));
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Apply' }));
    expect(await within(rotator).findByRole('region', { name: 'Second' })).toBeTruthy();
  });

  it('says when it has no widgets', async () => {
    render(
      <UIProvider locale="en-US">
        <Dashboard library={library([])} widgetTypes={[rotatorWidget]} height="500px" />
      </UIProvider>,
    );
    expect(await screen.findByText('This rotator has no widgets yet.')).toBeTruthy();
  });
});
