import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { HierarchyPicker } from './hierarchy/HierarchyPicker';
import type { HierarchyNode, HierarchyPath } from './types';

const isPhone = window.innerWidth < 640;

const plant12: HierarchyNode = { id: 'plant-12', label: 'Plant 12' };
const plant14: HierarchyNode = { id: 'plant-14', label: 'Plant 14' };
const depot3: HierarchyNode = { id: 'depot-3', label: 'Depot 3' };
const north: HierarchyNode = { id: 'north', label: 'North', children: [plant12, plant14] };
const south: HierarchyNode = { id: 'south', label: 'South', children: [depot3] };
const acme: HierarchyNode = { id: 'acme', label: 'Acme', children: [north, south] };
const levels = [
  { id: 'org', label: 'Organisation' },
  { id: 'region', label: 'Region' },
  { id: 'location', label: 'Location' },
];

function ids(path: HierarchyPath) {
  return path.map((node) => node.id);
}

async function open(name: RegExp | string) {
  await userEvent.click(screen.getByRole('button', { name }));
  return screen.findByRole('dialog', { name: 'Choose a scope' });
}

describe('HierarchyPicker', () => {
  it('shows the current path without levels that have one choice', () => {
    render(
      <HierarchyPicker
        tree={[acme]}
        levels={levels}
        value={[acme, north, plant12]}
        onSelect={vi.fn()}
      />,
    );
    const trigger = screen.getByRole('button', { name: 'Scope: North / Plant 12' });
    expect(trigger).toHaveTextContent(isPhone ? 'Plant 12' : 'North / Plant 12');
  });

  it('renders nothing when every level has one choice', () => {
    const only: HierarchyNode = { id: 'only', label: 'Only', children: [plant12] };
    const { container } = render(
      <HierarchyPicker tree={[only]} value={[only, plant12]} onSelect={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('chooses a scope level by level, finishing through single-choice levels', async () => {
    const onSelect = vi.fn();
    render(
      <HierarchyPicker
        tree={[acme]}
        levels={levels}
        value={[acme, north, plant12]}
        onSelect={onSelect}
      />,
    );
    const panel = await open(/^Scope/);
    // Organisation has one choice, so it isn't offered.
    expect(within(panel).queryByRole('listbox', { name: 'Organisation' })).toBeNull();
    if (isPhone) {
      // Phones show the innermost level, with Back to the one above.
      await userEvent.click(within(panel).getByRole('button', { name: 'Back to Region' }));
    }
    await userEvent.click(within(panel).getByRole('option', { name: 'South' }));
    // South has one location, chosen for the user.
    expect(onSelect).toHaveBeenCalledOnce();
    expect(ids(onSelect.mock.calls[0]?.[0] as HierarchyPath)).toEqual(['acme', 'south', 'depot-3']);
    await expect.poll(() => screen.queryByRole('dialog', { name: 'Choose a scope' })).toBeNull();
  });

  it('loads levels on demand', async () => {
    const loadChildren = vi.fn((levelId: string, parentId: string | null) => {
      const options: Record<string, HierarchyNode[]> = {
        org: [acme],
        'region:acme': [north, south],
        'location:north': [plant12, plant14],
        'location:south': [depot3],
      };
      return Promise.resolve(options[parentId === null ? levelId : `${levelId}:${parentId}`] ?? []);
    });
    const onSelect = vi.fn();
    render(
      <HierarchyPicker
        levels={levels}
        loadChildren={loadChildren}
        value={[]}
        onSelect={onSelect}
        defaultOpen
      />,
    );
    const panel = await screen.findByRole('dialog', { name: 'Choose a scope' });
    await userEvent.click(await within(panel).findByRole('option', { name: 'North' }));
    await userEvent.click(await within(panel).findByRole('option', { name: 'Plant 14' }));
    expect(ids(onSelect.mock.calls[0]?.[0] as HierarchyPath)).toEqual([
      'acme',
      'north',
      'plant-14',
    ]);
    // The organisation was loaded once and chosen automatically.
    expect(loadChildren.mock.calls.filter(([level]) => level === 'org')).toHaveLength(1);
  });

  it('chooses a scope once single-choice levels below it load', async () => {
    const onSelect = vi.fn();
    const loadChildren = (levelId: string, parentId: string | null) =>
      Promise.resolve(
        levelId === 'org'
          ? [acme]
          : levelId === 'region'
            ? [north, south]
            : parentId === 'south'
              ? [depot3]
              : [plant12, plant14],
      );
    render(
      <HierarchyPicker
        levels={levels}
        loadChildren={loadChildren}
        value={[]}
        onSelect={onSelect}
        defaultOpen
      />,
    );
    const panel = await screen.findByRole('dialog', { name: 'Choose a scope' });
    await userEvent.click(await within(panel).findByRole('option', { name: 'South' }));
    await expect.poll(() => onSelect.mock.calls.length).toBe(1);
    expect(ids(onSelect.mock.calls[0]?.[0] as HierarchyPath)).toEqual(['acme', 'south', 'depot-3']);
  });

  it('offers a retry when a level fails to load', async () => {
    let fails = true;
    const loadChildren = (levelId: string) =>
      levelId === 'org' && fails
        ? Promise.reject(new Error('offline'))
        : Promise.resolve([acme, { id: 'globex', label: 'Globex' }]);
    render(
      <HierarchyPicker
        levels={levels.slice(0, 1)}
        loadChildren={loadChildren}
        value={[]}
        onSelect={vi.fn()}
        defaultOpen
      />,
    );
    const panel = await screen.findByRole('dialog', { name: 'Choose a scope' });
    fails = false;
    await userEvent.click(await within(panel).findByRole('button', { name: 'Retry' }));
    expect(await within(panel).findByRole('option', { name: 'Acme' })).toBeInTheDocument();
  });

  it('searches every leaf and offers recent scopes', async () => {
    const onSelect = vi.fn();
    const searchLeaves = vi.fn((query: string) =>
      Promise.resolve(query === 'depot' ? [[acme, south, depot3]] : []),
    );
    render(
      <HierarchyPicker
        tree={[acme]}
        levels={levels}
        value={[acme, north, plant12]}
        onSelect={onSelect}
        searchLeaves={searchLeaves}
        recent={[[acme, north, plant14]]}
      />,
    );
    const panel = await open(/^Scope/);
    const recent = within(panel).getByRole('listbox', { name: 'Recent' });
    expect(within(recent).getByRole('option', { name: 'North / Plant 14' })).toBeInTheDocument();
    await userEvent.type(
      within(panel).getByRole('searchbox', { name: 'Search all' }),
      'depot{Enter}',
    );
    const results = await within(panel).findByRole('listbox', { name: '1 result' });
    await userEvent.click(within(results).getByRole('option', { name: 'South / Depot 3' }));
    expect(ids(onSelect.mock.calls[0]?.[0] as HierarchyPath)).toEqual(['acme', 'south', 'depot-3']);
  });

  it('has no accessibility violations', async () => {
    render(
      <HierarchyPicker
        tree={[acme]}
        levels={levels}
        value={[acme, north, plant12]}
        onSelect={vi.fn()}
        recent={[[acme, south, depot3]]}
        searchLeaves={() => Promise.resolve([])}
        defaultOpen
      />,
    );
    await expectNoAxeViolations(await screen.findByRole('dialog', { name: 'Choose a scope' }));
  });
});
