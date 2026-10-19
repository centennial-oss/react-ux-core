// Page settings (EDIT-26): the page's title and grid settings, stored on the page or as the dashboard's defaults, with
// every affected page's widgets rescaled when its column count changes (GRID-03).

import { pageGridSpec, rescalePage } from '../document/document';
import { cssLengthToPx, type GridSpec } from '../layout/metrics';
import type { AnyWidgetType, DashboardDocument } from '../types';

/** The grid settings Page settings edits. */
export type PageGridSettings = Pick<
  GridSpec,
  'columns' | 'rowSizing' | 'rowsPerScreen' | 'rowHeight' | 'density' | 'compaction'
>;

const FIELDS = [
  'columns',
  'rowSizing',
  'rowsPerScreen',
  'rowHeight',
  'density',
  'compaction',
] as const satisfies readonly (keyof PageGridSettings)[];
const EDITED = new Set<string>(FIELDS);

/** What Page settings applies. */
export interface PageSettings {
  title: string;
  grid: PageGridSettings;
  /** Stored on the page, or as the dashboard's defaults for every page that doesn't set its own. */
  scope: 'page' | 'dashboard';
}

/** The column counts offered before Custom (EDIT-26). */
export const DEFAULT_COLUMN_PRESETS: readonly number[] = [6, 12, 16, 24];

/** The smallest row height, in pixels (1.5rem). */
const MIN_ROW_HEIGHT = 24;

/** The edited settings of a grid. */
export function gridSettingsOf(grid: GridSpec): PageGridSettings {
  return {
    columns: grid.columns,
    rowSizing: grid.rowSizing,
    rowsPerScreen: grid.rowsPerScreen,
    rowHeight: grid.rowHeight,
    density: grid.density,
    compaction: grid.compaction,
  };
}

/** Which settings are invalid: a title, a whole column count from 1 to 48, rows from 1 to 48, a row height. */
export function settingsIssues(settings: PageSettings): Set<'title' | keyof PageGridSettings> {
  const issues = new Set<'title' | keyof PageGridSettings>();
  const { columns, rowsPerScreen, rowHeight } = settings.grid;
  if (settings.title.trim() === '') {
    issues.add('title');
  }
  if (!Number.isInteger(columns) || columns < 1 || columns > 48) {
    issues.add('columns');
  }
  if (!Number.isInteger(rowsPerScreen) || rowsPerScreen < 1 || rowsPerScreen > 48) {
    issues.add('rowsPerScreen');
  }
  if ((cssLengthToPx(rowHeight) ?? 0) < MIN_ROW_HEIGHT) {
    issues.add('rowHeight');
  }
  return issues;
}

/**
 * The document with a page's settings applied (EDIT-26). Dashboard defaults clear the page's own values for those
 * settings, so the defaults show on it. Every page whose column count changes has its widgets rescaled (GRID-03).
 */
export function withPageSettings(
  document: DashboardDocument,
  pageId: string,
  settings: PageSettings,
  baseGrid: Partial<GridSpec> | undefined,
  typeOf: (type: string) => AnyWidgetType | undefined,
): DashboardDocument {
  const columnsBefore = new Map(
    document.pages.map((page) => [page.id, pageGridSpec(document, page, baseGrid).columns]),
  );
  const isPageScope = settings.scope === 'page';
  const next: DashboardDocument = {
    ...document,
    grid: isPageScope ? document.grid : { ...document.grid, ...settings.grid },
    pages: document.pages.map((page) => {
      if (page.id !== pageId) {
        return page;
      }
      const { grid, ...rest } = page;
      const own = Object.fromEntries(
        Object.entries(grid ?? {}).filter(([key]) => !EDITED.has(key)),
      ) as Partial<GridSpec>;
      const pageGrid = isPageScope ? { ...own, ...settings.grid } : own;
      return Object.keys(pageGrid).length > 0
        ? { ...rest, title: settings.title, grid: pageGrid }
        : { ...rest, title: settings.title };
    }),
  };
  return {
    ...next,
    pages: next.pages.map((page) => {
      const from = columnsBefore.get(page.id);
      const grid = pageGridSpec(next, page, baseGrid);
      return from === undefined ? page : rescalePage(page, from, grid, typeOf);
    }),
  };
}
