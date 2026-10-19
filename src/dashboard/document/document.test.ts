import { describe, expect, it, vi } from 'vitest';
import type { AnyWidgetType, DashboardCollection, DashboardDocument } from '../types';
import { statGroupWidget } from '../widgets/statGroup';
import {
  createDashboard,
  createPage,
  createWidgetInstance,
  duplicateDashboard,
  duplicatePage,
  isConflictError,
  isSameData,
  migrateDashboard,
  newId,
  parseDashboard,
  prepareForSave,
} from './document';
import { effectivePermissions, READ_ONLY } from './permissions';
import { uniqueTitle } from './titles';

const document: DashboardDocument = {
  schemaVersion: 1,
  id: 'd1',
  title: 'Traffic',
  revision: 'r7',
  meta: { owner: 'ops', nested: { keep: [1, 2] } },
  pages: [
    {
      id: 'p1',
      title: 'Overview',
      widgets: [
        {
          id: 'w1',
          type: 'ccux.statGroup',
          layout: { x: 5, y: 9, w: 3, h: 4 },
          options: { custom: true },
        },
        {
          id: 'w2',
          type: 'acme.retired',
          layout: { w: 4, h: 2 },
          options: { anything: 'goes' },
          extra: 1,
        } as never,
      ],
    },
  ],
};

const typeOf = (type: string): AnyWidgetType | undefined =>
  type === statGroupWidget.type ? statGroupWidget : undefined;

describe('newId (MOD-01)', () => {
  it('makes unique UUIDs', () => {
    const ids = new Set(Array.from({ length: 100 }, newId));
    expect(ids.size).toBe(100);
    expect([...ids][0]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});

describe('parseDashboard (MOD-05)', () => {
  it('accepts a valid document as it is, unknown properties included (MOD-03)', () => {
    const result = parseDashboard(JSON.parse(JSON.stringify(document)));
    expect(result.isValid).toBe(true);
    expect(result.isValid && result.document).toEqual(document);
    expect(result.issues).toEqual([]);
  });

  it('fixes recoverable problems and reports them, without throwing', () => {
    const result = parseDashboard({
      id: 'd2',
      pages: [{ widgets: [{ type: 'ccux.table', layout: { w: 'wide' } }, { id: 'x' }, 'junk'] }, 7],
    });
    expect(result.isValid).toBe(true);
    if (!result.isValid) {
      return;
    }
    expect(result.document.title).toBe('');
    expect(result.document.pages).toHaveLength(1);
    expect(result.document.pages[0]?.widgets).toHaveLength(1);
    expect(result.document.pages[0]?.widgets[0]?.layout).toEqual({ w: 2, h: 2 });
    expect(result.issues.map((issue) => issue.path)).toEqual([
      'schemaVersion',
      'title',
      'pages.0.id',
      'pages.0.widgets.0.id',
      'pages.0.widgets.0.layout',
      'pages.0.widgets.1',
      'pages.0.widgets.2',
      'pages.1',
    ]);
    expect(result.issues.every((issue) => !issue.isFatal)).toBe(true);
  });

  it('fails documents it can’t use', () => {
    expect(parseDashboard('nope').isValid).toBe(false);
    expect(parseDashboard({ schemaVersion: 1, title: 'No id', pages: [] }).isValid).toBe(false);
    const future = parseDashboard({ schemaVersion: 99, id: 'd', title: 'Future', pages: [] });
    expect(future.isValid).toBe(false);
    expect(future.issues[0]?.isFatal).toBe(true);
  });

  it('migrates current documents to themselves', () => {
    expect(migrateDashboard(document as unknown as Record<string, unknown>)).toBe(document);
  });
});

describe('creating and duplicating (MOD-02)', () => {
  it('creates entities with fresh ids and the type’s defaults', () => {
    const widget = createWidgetInstance(statGroupWidget);
    expect(widget).toMatchObject({
      type: 'ccux.statGroup',
      layout: { w: 3, h: 4 },
      options: statGroupWidget.defaultOptions,
    });
    expect(widget.options).not.toBe(statGroupWidget.defaultOptions);
    const dashboard = createDashboard({ title: 'New dashboard', pageTitle: 'New page' });
    expect(dashboard.pages[0]?.title).toBe('New page');
    expect(createPage({ title: 'P', widgets: [widget] }).widgets[0]?.id).not.toBe(widget.id);
  });

  it('deep-copies with new ids for every nested entity, leaving the original alone', () => {
    const copy = duplicateDashboard(document, 'Traffic copy');
    expect(copy.id).not.toBe(document.id);
    expect(copy.title).toBe('Traffic copy');
    expect(copy.revision).toBeUndefined();
    expect(copy.meta).toEqual(document.meta);
    expect(copy.meta).not.toBe(document.meta);
    expect(copy.pages[0]?.id).not.toBe('p1');
    expect(copy.pages[0]?.widgets.map((widget) => widget.id)).not.toContain('w1');
    expect((copy.pages[0]?.widgets[1] as unknown as { extra: number }).extra).toBe(1);
    const page = duplicatePage(
      document.pages[0] ?? { id: '', title: '', widgets: [] },
      'Overview copy',
    );
    expect(page.title).toBe('Overview copy');
    expect(document.pages[0]?.widgets[0]?.id).toBe('w1');
  });
});

describe('prepareForSave (PERS-03)', () => {
  it('normalizes layouts, keeps unknown types and fields, and leaves inline loaders out with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const withLoader: DashboardDocument = {
      ...document,
      pages: [
        {
          ...(document.pages[0] ?? { id: 'p', title: '', widgets: [] }),
          widgets: [
            ...(document.pages[0]?.widgets ?? []),
            {
              id: 'w3',
              type: 'ccux.statGroup',
              layout: { w: 3, h: 4 },
              load: () => Promise.resolve({ items: [] }),
            },
          ],
        },
      ],
    };
    const saved = prepareForSave(withLoader, typeOf);
    const widgets = saved.pages[0]?.widgets ?? [];
    // Placed widgets keep their column and float up; unplaced ones fill the first free spots (MOD-07).
    expect(widgets[0]?.layout).toEqual({ x: 5, y: 4, w: 3, h: 4 });
    expect(widgets[1]).toMatchObject({
      type: 'acme.retired',
      options: { anything: 'goes' },
      extra: 1,
    });
    expect(widgets[1]?.layout).toEqual({ x: 0, y: 0, w: 4, h: 2 });
    expect(widgets[2]?.layout).toEqual({ x: 4, y: 0, w: 3, h: 4 });
    expect(widgets[2]?.load).toBeUndefined();
    expect(saved.meta).toEqual(document.meta);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('inline loaders'));
    warn.mockRestore();
  });
});

describe('isConflictError (PERS-07)', () => {
  it('recognizes common conflict shapes', () => {
    expect(isConflictError(Object.assign(new Error('x'), { name: 'ConflictError' }))).toBe(true);
    expect(isConflictError({ status: 409 })).toBe(true);
    expect(isConflictError({ response: { status: 409 } })).toBe(true);
    expect(isConflictError({ code: 'conflict' })).toBe(true);
    expect(isConflictError(new Error('Network'))).toBe(false);
    expect(isConflictError('409')).toBe(false);
  });
});

describe('isSameData (PERF-04)', () => {
  it('compares structurally, short-cutting shared references', () => {
    expect(isSameData(document, JSON.parse(JSON.stringify(document)))).toBe(true);
    expect(isSameData({ a: 1, b: undefined }, { a: 1 })).toBe(true);
    expect(isSameData({ a: [1, 2] }, { a: [1, 3] })).toBe(false);
  });
});

describe('effectivePermissions (PERM-01)', () => {
  const collection: DashboardCollection = {
    id: 'c',
    name: 'Shared',
    dashboards: [document],
    permissions: { canEdit: true, canAddPage: true, canReorder: true, canAddDashboard: true },
  };

  it('is read-only without permission data', () => {
    expect(
      effectivePermissions({
        kind: 'collection',
        collection: { ...collection, permissions: undefined },
      }),
    ).toEqual(READ_ONLY);
  });

  it('takes the collection’s, turned off by locks, and narrowed (never widened) by the host', () => {
    expect(
      effectivePermissions({ kind: 'dashboard', collection, dashboard: document }),
    ).toMatchObject({
      canEdit: true,
      canAddPage: true,
      canDeletePage: false,
    });
    const locked = effectivePermissions({
      kind: 'dashboard',
      collection,
      dashboard: { ...document, isLocked: true },
    });
    expect(locked).toMatchObject({ canEdit: false, canAddPage: false, canReorder: true });
    const page = document.pages[0] ?? { id: '', title: '', widgets: [] };
    expect(
      effectivePermissions({
        kind: 'page',
        collection,
        dashboard: document,
        page: { ...page, isLocked: true },
      }).canEdit,
    ).toBe(false);
    const narrowed = effectivePermissions(
      { kind: 'dashboard', collection, dashboard: document },
      () => ({
        canEdit: false,
        canDeleteDashboard: true,
      }),
    );
    expect(narrowed).toMatchObject({ canEdit: false, canDeleteDashboard: false });
  });
});

describe('uniqueTitle (MGMT-08)', () => {
  const numbered = ({ title, count }: { title: string; count: number }) =>
    `${title} ${String(count)}`;
  it('adds the first free counter', () => {
    expect(uniqueTitle('New page', ['Overview'], numbered)).toBe('New page');
    expect(uniqueTitle('New page', ['New page', 'new page 2'], numbered)).toBe('New page 3');
  });
});
