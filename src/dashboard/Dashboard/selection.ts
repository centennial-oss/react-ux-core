// Which collection, dashboard and page are shown (NAV-04): selection by id, with stale or missing ids falling back to
// the first valid item, and dashboards in their stored order (NAV-02).

import type {
  DashboardCollection,
  DashboardDocument,
  DashboardLibrary,
  DashboardPage,
} from '../types';

/** The shown collection, dashboard and page, by id. Empty strings where there's nothing to show. */
export interface DashboardSelection {
  collectionId: string;
  dashboardId: string;
  pageId: string;
}

/** A collection's dashboards ordered by `order`, then title (NAV-02). */
export function orderedDashboards(
  collection: DashboardCollection,
  locale?: string,
): DashboardDocument[] {
  const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true });
  return [...collection.dashboards].sort(
    (a, b) =>
      (a.order ?? Number.POSITIVE_INFINITY) - (b.order ?? Number.POSITIVE_INFINITY) ||
      collator.compare(a.title, b.title),
  );
}

/** What a selection resolves to: the items found, and the selection with stale ids replaced. */
export interface ResolvedSelection {
  selection: DashboardSelection;
  collection: DashboardCollection | undefined;
  dashboard: DashboardDocument | undefined;
  page: DashboardPage | undefined;
}

/**
 * The items a selection names, each falling back to the first valid one when its id is missing or stale (NAV-04).
 * `requested` may be partial (a host deep-linking to a dashboard only).
 */
export function resolveSelection(
  library: DashboardLibrary,
  requested: Partial<DashboardSelection> | undefined,
  locale?: string,
): ResolvedSelection {
  const collection =
    library.collections.find((candidate) => candidate.id === requested?.collectionId) ??
    library.collections[0];
  const dashboards = collection ? orderedDashboards(collection, locale) : [];
  const dashboard =
    dashboards.find((candidate) => candidate.id === requested?.dashboardId) ?? dashboards[0];
  const page =
    dashboard?.pages.find((candidate) => candidate.id === requested?.pageId) ?? dashboard?.pages[0];
  return {
    selection: {
      collectionId: collection?.id ?? '',
      dashboardId: dashboard?.id ?? '',
      pageId: page?.id ?? '',
    },
    collection,
    dashboard,
    page,
  };
}

/** Whether two selections name the same items. */
export function isSameSelection(
  a: Partial<DashboardSelection> | undefined,
  b: DashboardSelection,
): boolean {
  return (
    a?.collectionId === b.collectionId && a.dashboardId === b.dashboardId && a.pageId === b.pageId
  );
}
