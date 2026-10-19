// The Manage dashboards dialog's staged changes (§13): the collection's dashboards as the user rearranges them, moves
// applied through the Tree's own `moveTreeNodes`, and the one change set Apply sends (MGMT-04, MGMT-05).

import { moveTreeNodes, type TreeMove } from '../../components/Tree/move';
import type { TreeNode } from '../../components/Tree/types';
import { orderedDashboards } from '../Dashboard/selection';
import { isSameData, newId } from '../document/document';
import type { CollectionChangeSet, DashboardDocument, DashboardPage } from '../types';

/** A node of the manage tree: a dashboard, or one of its pages. */
export type ManageNode =
  | { kind: 'dashboard'; dashboard: DashboardDocument; index: number }
  | { kind: 'page'; dashboard: DashboardDocument; page: DashboardPage; index: number };

const SEPARATOR = '\u001f';

/** A dashboard's tree id. Page ids are unique only within their dashboard, so tree ids say whose they are. */
export const dashboardKey = (dashboardId: string) => `d${SEPARATOR}${dashboardId}`;
export const pageKey = (dashboardId: string, pageId: string) =>
  `p${SEPARATOR}${dashboardId}${SEPARATOR}${pageId}`;

/** The node a tree id names, if it's still there. */
export function findNode(
  dashboards: readonly DashboardDocument[],
  key: string,
): ManageNode | undefined {
  const [kind, dashboardId, pageId] = key.split(SEPARATOR);
  const index = dashboards.findIndex((item) => item.id === dashboardId);
  const dashboard = dashboards[index];
  if (!dashboard) {
    return undefined;
  }
  if (kind === 'd') {
    return { kind: 'dashboard', dashboard, index };
  }
  const pageIndex = dashboard.pages.findIndex((item) => item.id === pageId);
  const page = dashboard.pages[pageIndex];
  return page ? { kind: 'page', dashboard, page, index: pageIndex } : undefined;
}

/** The node's tree id. */
export function keyOf(node: ManageNode): string {
  return node.kind === 'dashboard'
    ? dashboardKey(node.dashboard.id)
    : pageKey(node.dashboard.id, node.page.id);
}

/** The dashboards with one replaced by `update`'s result. */
export function updateDashboard(
  dashboards: readonly DashboardDocument[],
  dashboardId: string,
  update: (dashboard: DashboardDocument) => DashboardDocument,
): DashboardDocument[] {
  return dashboards.map((item) => (item.id === dashboardId ? update(item) : item));
}

/** The dashboards with the node renamed. */
export function renameNode(
  dashboards: readonly DashboardDocument[],
  node: ManageNode,
  title: string,
): DashboardDocument[] {
  return updateDashboard(dashboards, node.dashboard.id, (dashboard) =>
    node.kind === 'dashboard'
      ? { ...dashboard, title }
      : {
          ...dashboard,
          pages: dashboard.pages.map((page) =>
            page.id === node.page.id ? { ...page, title } : page,
          ),
        },
  );
}

/** The dashboards without the node (a dashboard goes with its pages). */
export function removeNode(
  dashboards: readonly DashboardDocument[],
  node: ManageNode,
): DashboardDocument[] {
  if (node.kind === 'dashboard') {
    return dashboards.filter((item) => item.id !== node.dashboard.id);
  }
  return updateDashboard(dashboards, node.dashboard.id, (dashboard) => ({
    ...dashboard,
    pages: dashboard.pages.filter((page) => page.id !== node.page.id),
  }));
}

/** The dashboards with `document` inserted after `afterId`, or at the end. */
export function insertDashboard(
  dashboards: readonly DashboardDocument[],
  document: DashboardDocument,
  afterId?: string,
): DashboardDocument[] {
  const at = dashboards.findIndex((item) => item.id === afterId);
  return at < 0
    ? [...dashboards, document]
    : [...dashboards.slice(0, at + 1), document, ...dashboards.slice(at + 1)];
}

/** The dashboards with `page` inserted into a dashboard after `afterPageId`, or at its end. */
export function insertPage(
  dashboards: readonly DashboardDocument[],
  dashboardId: string,
  page: DashboardPage,
  afterPageId?: string,
): DashboardDocument[] {
  return updateDashboard(dashboards, dashboardId, (dashboard) => {
    const at = dashboard.pages.findIndex((item) => item.id === afterPageId);
    const pages =
      at < 0
        ? [...dashboard.pages, page]
        : [...dashboard.pages.slice(0, at + 1), page, ...dashboard.pages.slice(at + 1)];
    return { ...dashboard, pages };
  });
}

type Entry =
  { kind: 'dashboard'; dashboard: DashboardDocument } | { kind: 'page'; page: DashboardPage };

/** The dashboards as a plain tree, for `moveTreeNodes`. */
function toTree(dashboards: readonly DashboardDocument[]): TreeNode<Entry>[] {
  return dashboards.map((dashboard) => ({
    id: dashboardKey(dashboard.id),
    label: dashboard.title,
    data: { kind: 'dashboard', dashboard },
    children: dashboard.pages.map((page) => ({
      id: pageKey(dashboard.id, page.id),
      label: page.title,
      data: { kind: 'page', page },
    })),
  }));
}

/**
 * The dashboards after a tree move (MGMT-02): dashboards reorder at the top level and pages within or between
 * dashboards. A move that would nest a dashboard or put a page at the top level, or that `isPageMoveAllowed` refuses,
 * returns null; so does a move that changes nothing. A page moved next to one with its id gets a new id.
 */
export function applyTreeMove(
  dashboards: readonly DashboardDocument[],
  move: TreeMove,
  isPageMoveAllowed: (fromDashboardId: string, toDashboardId: string) => boolean = () => true,
): DashboardDocument[] | null {
  const moved = moveTreeNodes(toTree(dashboards), move);
  const result: DashboardDocument[] = [];
  let isChanged = moved.length !== dashboards.length;
  for (const [index, node] of moved.entries()) {
    if (node.data?.kind !== 'dashboard') {
      return null;
    }
    const dashboard = node.data.dashboard;
    const pages: DashboardPage[] = [];
    const ids = new Set(dashboard.pages.map((page) => page.id));
    for (const child of node.children ?? []) {
      if (child.data?.kind !== 'page') {
        return null;
      }
      const page = child.data.page;
      const fromDashboardId = child.id.split(SEPARATOR)[1] ?? '';
      if (fromDashboardId === dashboard.id) {
        pages.push(page);
      } else if (!isPageMoveAllowed(fromDashboardId, dashboard.id)) {
        return null;
      } else {
        // A page joining another dashboard keeps its id unless one of that dashboard's pages has it (MOD-01).
        const joined = ids.has(page.id) ? { ...page, id: newId() } : page;
        ids.add(joined.id);
        pages.push(joined);
      }
    }
    const isSamePages =
      pages.length === dashboard.pages.length &&
      pages.every((page, pageIndex) => page === dashboard.pages[pageIndex]);
    result.push(isSamePages ? dashboard : { ...dashboard, pages });
    isChanged ||= !isSamePages || dashboards[index] !== dashboard;
  }
  return isChanged ? result : null;
}

/** The node moved one place up (-1) or down (1) among its siblings, or null at the end of the line. */
export function moveNodeBy(
  dashboards: readonly DashboardDocument[],
  node: ManageNode,
  delta: -1 | 1,
): DashboardDocument[] | null {
  const siblings = node.kind === 'dashboard' ? dashboards.length : node.dashboard.pages.length;
  const index = node.index + delta;
  if (index < 0 || index >= siblings) {
    return null;
  }
  return applyTreeMove(dashboards, {
    ids: [keyOf(node)],
    parentId: node.kind === 'dashboard' ? null : dashboardKey(node.dashboard.id),
    index,
  });
}

/** A page moved to the end of another dashboard (Move to…). */
export function movePageTo(
  dashboards: readonly DashboardDocument[],
  node: Extract<ManageNode, { kind: 'page' }>,
  toDashboardId: string,
): DashboardDocument[] | null {
  const target = dashboards.find((item) => item.id === toDashboardId);
  return target
    ? applyTreeMove(dashboards, {
        ids: [keyOf(node)],
        parentId: dashboardKey(toDashboardId),
        index: target.pages.length,
      })
    : null;
}

/**
 * The dashboards with `order` values that sort them as listed (MGMT-05): unchanged when their stored order already
 * does, else consecutive integers from 1.
 */
export function withOrder(
  dashboards: readonly DashboardDocument[],
  locale?: string,
): DashboardDocument[] {
  const sorted = orderedDashboards({ id: '', name: '', dashboards: [...dashboards] }, locale);
  if (sorted.every((item, index) => item === dashboards[index])) {
    return [...dashboards];
  }
  return dashboards.map((item, index) =>
    item.order === index + 1 ? item : { ...item, order: index + 1 },
  );
}

/** The change set that turns `baseline` into `staged` (MGMT-04): only dashboards that changed are `updated`. */
export function changeSetOf(
  collectionId: string,
  baseline: readonly DashboardDocument[],
  staged: readonly DashboardDocument[],
  locale?: string,
): CollectionChangeSet {
  const ordered = withOrder(staged, locale);
  const before = new Map(baseline.map((item) => [item.id, item]));
  const after = new Set(ordered.map((item) => item.id));
  return {
    collectionId,
    created: ordered.filter((item) => !before.has(item.id)),
    updated: ordered.filter((item) => {
      const stored = before.get(item.id);
      return stored !== undefined && !isSameData(stored, item);
    }),
    deleted: baseline.filter((item) => !after.has(item.id)).map((item) => item.id),
    order: ordered.map((item) => item.id),
  };
}

/** Whether a change set changes anything. */
export function hasChanges(changes: CollectionChangeSet): boolean {
  return changes.created.length + changes.updated.length + changes.deleted.length > 0;
}

/**
 * The baseline after a partly failed apply (MGMT-06): what was sent and didn't fail is now stored, so only the failed
 * changes are left to send again.
 */
export function rebaseAfterApply(
  baseline: readonly DashboardDocument[],
  changes: CollectionChangeSet,
  failed: ReadonlySet<string>,
): DashboardDocument[] {
  const next = new Map(baseline.map((item) => [item.id, item]));
  for (const id of changes.deleted) {
    if (!failed.has(id)) {
      next.delete(id);
    }
  }
  for (const item of [...changes.created, ...changes.updated]) {
    if (!failed.has(item.id)) {
      next.set(item.id, item);
    }
  }
  const position = new Map(changes.order.map((id, index) => [id, index]));
  const last = changes.order.length;
  return [...next.values()].sort(
    (a, b) => (position.get(a.id) ?? last) - (position.get(b.id) ?? last),
  );
}
