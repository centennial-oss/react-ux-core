import { describe, expect, it } from 'vitest';
import type { DashboardDocument } from '../types';
import {
  applyTreeMove,
  changeSetOf,
  dashboardKey,
  findNode,
  hasChanges,
  insertDashboard,
  insertPage,
  keyOf,
  moveNodeBy,
  movePageTo,
  pageKey,
  rebaseAfterApply,
  removeNode,
  renameNode,
  withOrder,
} from './manage';

function dashboard(id: string, pages: string[], extra: Partial<DashboardDocument> = {}) {
  return {
    schemaVersion: 1,
    id,
    title: id.toUpperCase(),
    pages: pages.map((page) => ({ id: page, title: page, widgets: [] })),
    ...extra,
  } satisfies DashboardDocument;
}

/** The node a tree id names; the test fails if it's gone. */
function nodeAt(dashboards: readonly DashboardDocument[], key: string) {
  const node = findNode(dashboards, key);
  if (!node) {
    throw new Error(`No node ${key}`);
  }
  return node;
}

function pageAt(dashboards: readonly DashboardDocument[], key: string) {
  const node = nodeAt(dashboards, key);
  if (node.kind !== 'page') {
    throw new Error(`${key} is not a page`);
  }
  return node;
}

function changed<T>(value: T | null): T {
  if (value === null) {
    throw new Error('Nothing changed');
  }
  return value;
}

const baseline = [
  dashboard('a', ['a1', 'a2'], { order: 1 }),
  dashboard('b', ['b1'], { order: 2 }),
  dashboard('c', ['c1'], { order: 3 }),
];

describe('manage: nodes', () => {
  it('finds dashboards and pages by tree id, and gives their ids back', () => {
    const page = nodeAt(baseline, pageKey('a', 'a2'));
    expect(page).toMatchObject({ kind: 'page', index: 1, page: { id: 'a2' } });
    expect(keyOf(page)).toBe(pageKey('a', 'a2'));
    expect(findNode(baseline, dashboardKey('c'))).toMatchObject({ kind: 'dashboard', index: 2 });
    expect(findNode(baseline, pageKey('a', 'gone'))).toBeUndefined();
    expect(findNode(baseline, dashboardKey('gone'))).toBeUndefined();
  });

  it('renames, removes and inserts without changing the input', () => {
    const renamed = renameNode(baseline, nodeAt(baseline, pageKey('a', 'a1')), 'First');
    expect(renamed[0]?.pages[0]?.title).toBe('First');
    expect(renamed[1]).toBe(baseline[1]);
    expect(baseline[0]?.pages[0]?.title).toBe('a1');
    expect(removeNode(baseline, nodeAt(baseline, dashboardKey('b'))).map((d) => d.id)).toEqual([
      'a',
      'c',
    ]);
    expect(
      removeNode(baseline, nodeAt(baseline, pageKey('a', 'a1')))[0]?.pages.map((p) => p.id),
    ).toEqual(['a2']);
    expect(insertDashboard(baseline, dashboard('n', []), 'a').map((d) => d.id)).toEqual([
      'a',
      'n',
      'b',
      'c',
    ]);
    expect(insertDashboard(baseline, dashboard('n', [])).at(-1)?.id).toBe('n');
    const page = { id: 'new', title: 'New', widgets: [] };
    expect(insertPage(baseline, 'a', page, 'a1')[0]?.pages.map((p) => p.id)).toEqual([
      'a1',
      'new',
      'a2',
    ]);
  });
});

describe('manage: moves (MGMT-02)', () => {
  it('reorders dashboards and pages, and moves pages between dashboards', () => {
    const swapped = moveNodeBy(baseline, nodeAt(baseline, dashboardKey('a')), 1);
    expect(swapped?.map((d) => d.id)).toEqual(['b', 'a', 'c']);
    expect(moveNodeBy(baseline, nodeAt(baseline, dashboardKey('a')), -1)).toBeNull();
    const pages = moveNodeBy(baseline, nodeAt(baseline, pageKey('a', 'a2')), -1);
    expect(pages?.[0]?.pages.map((p) => p.id)).toEqual(['a2', 'a1']);
    const moved = movePageTo(baseline, pageAt(baseline, pageKey('a', 'a1')), 'b');
    expect(moved?.[0]?.pages.map((p) => p.id)).toEqual(['a2']);
    expect(moved?.[1]?.pages.map((p) => p.id)).toEqual(['b1', 'a1']);
    expect(moved?.[2]).toBe(baseline[2]);
  });

  it('refuses nesting a dashboard, a page at the top level, disallowed moves, and moves that change nothing', () => {
    expect(
      applyTreeMove(baseline, { ids: [dashboardKey('a')], parentId: dashboardKey('b'), index: 0 }),
    ).toBeNull();
    expect(
      applyTreeMove(baseline, { ids: [pageKey('a', 'a1')], parentId: null, index: 0 }),
    ).toBeNull();
    expect(
      applyTreeMove(
        baseline,
        { ids: [pageKey('a', 'a1')], parentId: dashboardKey('b'), index: 0 },
        (from) => from !== 'a',
      ),
    ).toBeNull();
    expect(
      applyTreeMove(baseline, { ids: [dashboardKey('a')], parentId: null, index: 0 }),
    ).toBeNull();
  });

  it('gives a page joining a dashboard a new id when one of its pages has the same id (MOD-01)', () => {
    const clash = [dashboard('a', ['x']), dashboard('b', ['x'])];
    const moved = applyTreeMove(clash, {
      ids: [pageKey('a', 'x')],
      parentId: dashboardKey('b'),
      index: 0,
    });
    const ids = moved?.[1]?.pages.map((p) => p.id) ?? [];
    expect(ids).toHaveLength(2);
    expect(ids[1]).toBe('x');
    expect(ids[0]).not.toBe('x');
  });
});

describe('manage: change set (MGMT-04, MGMT-05, acceptance 18)', () => {
  it('sends exactly a rename, a page moved between dashboards and a deletion, with correct order values', () => {
    let staged = renameNode(baseline, nodeAt(baseline, dashboardKey('a')), 'Renamed');
    staged = changed(movePageTo(staged, pageAt(staged, pageKey('b', 'b1')), 'a'));
    staged = removeNode(staged, nodeAt(staged, dashboardKey('c')));
    const changes = changeSetOf('col', baseline, staged);
    expect(changes.collectionId).toBe('col');
    expect(changes.created).toEqual([]);
    expect(changes.deleted).toEqual(['c']);
    expect(changes.order).toEqual(['a', 'b']);
    expect(changes.updated.map((d) => d.id)).toEqual(['a', 'b']);
    expect(changes.updated[0]).toMatchObject({ title: 'Renamed', order: 1 });
    expect(changes.updated[0]?.pages.map((p) => p.id)).toEqual(['a1', 'a2', 'b1']);
    expect(changes.updated[1]?.pages).toEqual([]);
    expect(hasChanges(changes)).toBe(true);
  });

  it('lists only dashboards that changed, and renumbers from 1 only when the order changed', () => {
    const unordered = [dashboard('x', []), dashboard('y', []), dashboard('z', [])];
    expect(hasChanges(changeSetOf('col', unordered, unordered))).toBe(false);
    const renamed = renameNode(unordered, nodeAt(unordered, dashboardKey('y')), 'Yak');
    const changes = changeSetOf('col', unordered, renamed);
    expect(changes.updated.map((d) => d.id)).toEqual(['y']);
    expect(changes.updated[0]?.order).toBeUndefined();
    const reordered = changed(moveNodeBy(unordered, nodeAt(unordered, dashboardKey('z')), -1));
    expect(withOrder(reordered).map((d) => [d.id, d.order])).toEqual([
      ['x', 1],
      ['z', 2],
      ['y', 3],
    ]);
    // A dashboard added at the end keeps its place without renumbering the others when their order already says so.
    const added = insertDashboard(baseline, dashboard('n', [], { title: 'New' }));
    const created = changeSetOf('col', baseline, added);
    expect(created.created.map((d) => d.id)).toEqual(['n']);
    expect(created.updated).toEqual([]);
  });

  it('keeps only the failed changes to send again after a partial failure (MGMT-06)', () => {
    let staged = renameNode(baseline, nodeAt(baseline, dashboardKey('a')), 'Renamed');
    staged = removeNode(staged, nodeAt(staged, dashboardKey('c')));
    staged = insertDashboard(staged, dashboard('n', []));
    const changes = changeSetOf('col', baseline, staged);
    const rebased = rebaseAfterApply(baseline, changes, new Set(['c', 'n']));
    expect(rebased.map((d) => d.id)).toEqual(['a', 'b', 'c']);
    const again = changeSetOf('col', rebased, withOrder(staged));
    expect(again.updated).toEqual([]);
    expect(again.deleted).toEqual(['c']);
    expect(again.created.map((d) => d.id)).toEqual(['n']);
  });
});
