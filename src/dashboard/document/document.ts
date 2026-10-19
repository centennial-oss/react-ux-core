// The stored document (§4): parsing and migration (MOD-05), new entities with fresh ids (MOD-01), deep copies with new
// ids throughout (MOD-02), and the form a document is saved in: options migrated (MOD-06), layouts normalized (MOD-07),
// runtime-only values left out (MOD-08), unknown properties kept as they are (MOD-03).

import { warnInDevelopment } from '../../utils/dev';
import {
  normalizeLayout,
  placeItem,
  rescaleLayout,
  type GridRect,
  type LayoutEntry,
  type LayoutOptions,
} from '../layout/engine';
import { mergeGridSpec, type GridSpec } from '../layout/metrics';
import type {
  AnyWidgetType,
  DashboardDocument,
  DashboardPage,
  JsonObject,
  WidgetInstance,
  WidgetLayout,
} from '../types';
import { migrateInstanceOptions } from '../widgets/options';

/** The schema version this library writes. */
export const DASHBOARD_SCHEMA_VERSION = 1;

/**
 * A new id from the browser's cryptographic generator (MOD-01): `crypto.randomUUID`, or random bytes where it's
 * missing (non-secure contexts). Never `Math.random`.
 */
export function newId(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** A problem found while parsing a document. */
export interface DashboardParseIssue {
  /** Where, as a dotted path such as `pages.1.widgets.0.layout`. */
  path: string;
  message: string;
  /** The document can't be used at all. */
  isFatal: boolean;
}

/** What `parseDashboard` returns: the document (when usable) and every problem it found or fixed. */
export type DashboardParseResult =
  | { isValid: true; document: DashboardDocument; issues: DashboardParseIssue[] }
  | { isValid: false; issues: DashboardParseIssue[] };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isSize = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value > 0;

/**
 * Parses and checks a stored document (MOD-05), from older schema versions too. Recoverable problems (a missing title,
 * a page or widget without an id, a widget without a usable size) are fixed and reported; only a document that can't
 * be used (not an object, no id, a schema version from the future) fails. Never throws. Unknown properties are kept.
 */
export function parseDashboard(json: unknown): DashboardParseResult {
  const issues: DashboardParseIssue[] = [];
  const report = (path: string, message: string, isFatal = false) => {
    issues.push({ path, message, isFatal });
  };
  if (!isObject(json)) {
    report('', 'A dashboard must be an object.', true);
    return { isValid: false, issues };
  }
  const version = json.schemaVersion ?? DASHBOARD_SCHEMA_VERSION;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    report('schemaVersion', `${JSON.stringify(version)} isn't a schema version.`, true);
  } else if (version > DASHBOARD_SCHEMA_VERSION) {
    report('schemaVersion', `Version ${String(version)} is newer than this library reads.`, true);
  } else if (json.schemaVersion === undefined) {
    report('schemaVersion', 'No schema version; read as version 1.');
  }
  if (typeof json.id !== 'string' || json.id === '') {
    report('id', 'A dashboard needs an id.', true);
  }
  if (issues.some((issue) => issue.isFatal)) {
    return { isValid: false, issues };
  }
  const migrated = migrateDashboard(json);
  const title = typeof migrated.title === 'string' ? migrated.title : '';
  if (typeof migrated.title !== 'string') {
    report('title', 'No title; using an empty one.');
  }
  const rawPages: unknown[] = Array.isArray(migrated.pages) ? migrated.pages : [];
  if (!Array.isArray(migrated.pages)) {
    report('pages', 'No pages; the dashboard is empty.');
  }
  const pages = rawPages.flatMap((page, pageIndex): DashboardPage[] => {
    const path = `pages.${String(pageIndex)}`;
    if (!isObject(page)) {
      report(path, 'A page must be an object; it was left out.');
      return [];
    }
    const id = typeof page.id === 'string' && page.id !== '' ? page.id : newId();
    if (id !== page.id) {
      report(`${path}.id`, 'A page had no id; it was given one.');
    }
    const rawWidgets: unknown[] = Array.isArray(page.widgets) ? page.widgets : [];
    const widgets = rawWidgets.flatMap((widget, widgetIndex): WidgetInstance[] => {
      const widgetPath = `${path}.widgets.${String(widgetIndex)}`;
      if (!isObject(widget) || typeof widget.type !== 'string') {
        report(widgetPath, 'A widget needs a type; it was left out.');
        return [];
      }
      const widgetId = typeof widget.id === 'string' && widget.id !== '' ? widget.id : newId();
      if (widgetId !== widget.id) {
        report(`${widgetPath}.id`, 'A widget had no id; it was given one.');
      }
      const layout = isObject(widget.layout) ? widget.layout : {};
      let fixedLayout = layout as unknown as WidgetLayout;
      if (!isSize(layout.w) || !isSize(layout.h)) {
        report(
          `${widgetPath}.layout`,
          'A widget had no usable size; it was given the smallest one.',
        );
        fixedLayout = {
          ...layout,
          w: isSize(layout.w) ? (layout.w as number) : 2,
          h: isSize(layout.h) ? (layout.h as number) : 2,
        };
      }
      return [{ ...(widget as unknown as WidgetInstance), id: widgetId, layout: fixedLayout }];
    });
    return [
      {
        ...(page as unknown as DashboardPage),
        id,
        title: typeof page.title === 'string' ? page.title : '',
        widgets,
      },
    ];
  });
  return {
    isValid: true,
    document: { ...migrated, schemaVersion: DASHBOARD_SCHEMA_VERSION, title, pages },
    issues,
  };
}

/** One migration per schema version, from that version to the next. None yet: version 1 is the first. */
const migrations: Record<number, (document: Record<string, unknown>) => Record<string, unknown>> =
  {};

/**
 * A document migrated to the current schema version (MOD-05): each migration from its version up runs in turn.
 * Documents already current are returned as they are.
 */
export function migrateDashboard(document: Record<string, unknown>): DashboardDocument {
  let current = document;
  let version =
    typeof current.schemaVersion === 'number' ? current.schemaVersion : DASHBOARD_SCHEMA_VERSION;
  while (version < DASHBOARD_SCHEMA_VERSION) {
    const migrate = migrations[version];
    current = migrate ? migrate(current) : current;
    version += 1;
  }
  return (current.schemaVersion === DASHBOARD_SCHEMA_VERSION
    ? current
    : { ...current, schemaVersion: DASHBOARD_SCHEMA_VERSION }) as unknown as DashboardDocument;
}

/** A new, empty dashboard with a fresh id and one page. */
export function createDashboard({
  title,
  pageTitle,
  pages,
}: {
  title: string;
  /** The first page's title, when `pages` isn't given. */
  pageTitle?: string;
  pages?: DashboardPage[];
}): DashboardDocument {
  return {
    schemaVersion: DASHBOARD_SCHEMA_VERSION,
    id: newId(),
    title,
    pages: pages ?? [createPage({ title: pageTitle ?? title })],
  };
}

/** A new page with a fresh id; its widgets get fresh ids too (MOD-02). */
export function createPage({
  title,
  widgets = [],
}: {
  title: string;
  widgets?: WidgetInstance[];
}): DashboardPage {
  return { id: newId(), title, widgets: widgets.map(duplicateWidget) };
}

/** A new widget of a type: a fresh id, the type's default size and options, and auto-placement unless placed. */
export function createWidgetInstance(
  definition: Pick<AnyWidgetType, 'type' | 'defaultSize' | 'defaultOptions' | 'optionsVersion'>,
  extra: Partial<WidgetInstance> = {},
): WidgetInstance {
  const instance: WidgetInstance = {
    id: newId(),
    type: definition.type,
    layout: { w: definition.defaultSize.w, h: definition.defaultSize.h },
    options: structuredClone(definition.defaultOptions as JsonObject),
    ...extra,
  };
  if (definition.optionsVersion !== undefined && instance.optionsVersion === undefined) {
    instance.optionsVersion = definition.optionsVersion;
  }
  return instance;
}

/** A deep copy of plain data, keeping functions (a code-defined widget's inline loader) as they are. */
function copy<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(copy) as T;
  }
  if (isObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, copy(child)])) as T;
  }
  return value;
}

/** A deep copy of a widget with a new id (MOD-02). */
export function duplicateWidget(widget: WidgetInstance): WidgetInstance {
  return { ...copy(widget), id: newId() };
}

/** A deep copy of a page with new ids for it and its widgets (MOD-02). */
export function duplicatePage(page: DashboardPage, title = page.title): DashboardPage {
  return { ...copy(page), id: newId(), title, widgets: page.widgets.map(duplicateWidget) };
}

/** A deep copy of a dashboard with new ids for it, its pages and their widgets (MOD-02); its revision is left out. */
export function duplicateDashboard(
  document: DashboardDocument,
  title = document.title,
): DashboardDocument {
  const { revision, ...rest } = copy(document);
  return { ...rest, id: newId(), title, pages: document.pages.map((page) => duplicatePage(page)) };
}

/**
 * Whether a save failed because the stored document changed meanwhile (PERS-07): an error named `ConflictError`, or
 * with HTTP status 409 (`status`, or `response.status`), or with code `conflict`.
 */
export function isConflictError(error: unknown): boolean {
  if (!isObject(error) && !(error instanceof Error)) {
    return false;
  }
  const value = error as Record<string, unknown>;
  const response = isObject(value.response) ? value.response : undefined;
  return (
    value.name === 'ConflictError' ||
    value.status === 409 ||
    response?.status === 409 ||
    value.code === 'conflict'
  );
}

/** The grid settings of a page: the component's, then the dashboard's, then the page's (GRID-01). */
export function pageGridSpec(
  document: Pick<DashboardDocument, 'grid'>,
  page: Pick<DashboardPage, 'grid'> | undefined,
  base?: Partial<GridSpec>,
): GridSpec {
  return mergeGridSpec(base, document.grid, page?.grid).spec;
}

/** The size limits of a widget type, for the layout engine. */
export function widgetLimits(definition: AnyWidgetType | undefined) {
  return definition
    ? {
        minW: definition.minSize?.w,
        minH: definition.minSize?.h,
        maxW: definition.maxSize?.w,
        maxH: definition.maxSize?.h,
      }
    : undefined;
}

/** The page with the layout's positions and sizes applied to its widgets; unchanged widgets (and pages) kept. */
export function withLayout(page: DashboardPage, layout: readonly LayoutEntry[]): DashboardPage {
  const byId = new Map(layout.map((entry) => [entry.id, entry]));
  const widgets = page.widgets.map((widget) => {
    const entry = byId.get(widget.id);
    if (!entry) {
      return widget;
    }
    const { x, y, w, h } = widget.layout;
    return x === entry.x && y === entry.y && w === entry.w && h === entry.h
      ? widget
      : { ...widget, layout: { ...widget.layout, x: entry.x, y: entry.y, w: entry.w, h: entry.h } };
  });
  return widgets.some((widget, index) => widget !== page.widgets[index])
    ? { ...page, widgets }
    : page;
}

/** The layout engine's options for a page's grid and widget types. */
function layoutOptions(
  page: DashboardPage,
  grid: GridSpec,
  typeOf: (type: string) => AnyWidgetType | undefined,
): LayoutOptions {
  const byId = new Map(page.widgets.map((widget) => [widget.id, widget]));
  return {
    columns: grid.columns,
    compaction: grid.compaction,
    limits: (id) => widgetLimits(typeOf(byId.get(id)?.type ?? '')),
  };
}

/** A page's widgets with their layouts normalized for its grid (MOD-07), in their original order. */
export function normalizePageLayout(
  page: DashboardPage,
  grid: GridSpec,
  typeOf: (type: string) => AnyWidgetType | undefined,
): DashboardPage {
  const normalized = normalizeLayout(
    page.widgets.map((widget) => ({
      id: widget.id,
      ...widget.layout,
      isLocked: widget.isLocked === true,
    })),
    layoutOptions(page, grid, typeOf),
  );
  return withLayout(page, normalized);
}

/**
 * A page with one of its widgets put at `rect` (a widget dropped onto the grid, EDIT-11): the others make room as for
 * a move, and every widget ends up placed.
 */
export function placePageWidget(
  page: DashboardPage,
  widgetId: string,
  rect: GridRect,
  grid: GridSpec,
  typeOf: (type: string) => AnyWidgetType | undefined,
): DashboardPage {
  const normalized = normalizePageLayout(page, grid, typeOf);
  const entries = normalized.widgets.flatMap((widget): LayoutEntry[] => {
    const { x, y, w, h } = widget.layout;
    return x === undefined || y === undefined
      ? []
      : [{ id: widget.id, x, y, w, h, isLocked: widget.isLocked === true }];
  });
  return withLayout(
    normalized,
    placeItem(entries, widgetId, rect, layoutOptions(page, grid, typeOf)),
  );
}

/**
 * A page's widgets rescaled for a new column count (GRID-03): placed widgets through `rescaleLayout`, unplaced ones'
 * widths in proportion. `grid` is the page's grid with the new column count.
 */
export function rescalePage(
  page: DashboardPage,
  fromColumns: number,
  grid: GridSpec,
  typeOf: (type: string) => AnyWidgetType | undefined,
): DashboardPage {
  if (fromColumns === grid.columns) {
    return page;
  }
  const placed: LayoutEntry[] = [];
  for (const widget of page.widgets) {
    const { x, y, w, h } = widget.layout;
    if (x !== undefined && y !== undefined) {
      placed.push({ id: widget.id, x, y, w, h, isLocked: widget.isLocked === true });
    }
  }
  const { columns, ...options } = layoutOptions(page, grid, typeOf);
  const rescaled = withLayout(page, rescaleLayout(placed, fromColumns, columns, options));
  const ratio = columns / fromColumns;
  const widgets = rescaled.widgets.map((widget) =>
    widget.layout.x === undefined || widget.layout.y === undefined
      ? {
          ...widget,
          layout: {
            ...widget.layout,
            w: Math.min(columns, Math.max(1, Math.round(widget.layout.w * ratio))),
          },
        }
      : widget,
  );
  return { ...rescaled, widgets };
}

/**
 * The document as it's saved (PERS-03): widget options migrated (MOD-06), every page's layout normalized (MOD-07),
 * and inline loaders left out with a development warning (DATA-06). Unknown properties are kept (MOD-03); nothing
 * runtime-only lives on the document itself (MOD-08).
 */
export function prepareForSave(
  document: DashboardDocument,
  typeOf: (type: string) => AnyWidgetType | undefined,
  baseGrid?: Partial<GridSpec>,
): DashboardDocument {
  const hasInlineLoader = document.pages.some((page) =>
    page.widgets.some((widget) => widget.load !== undefined),
  );
  const pages = document.pages.map((page) => {
    const migrated: DashboardPage = {
      ...page,
      widgets: page.widgets.map((widget) => {
        const next = migrateInstanceOptions(typeOf(widget.type), widget);
        if (next.load === undefined) {
          return next;
        }
        const { load, ...rest } = next;
        return rest;
      }),
    };
    return normalizePageLayout(migrated, pageGridSpec(document, page, baseGrid), typeOf);
  });
  if (hasInlineLoader) {
    warnInDevelopment(
      'Dashboard',
      `"${document.title}" has widgets with inline loaders, which can't be saved; they were saved without them.`,
    );
  }
  return { ...document, schemaVersion: DASHBOARD_SCHEMA_VERSION, pages };
}

/** Whether two values are the same JSON-like data, comparing shared references first (cheap for edited drafts). */
export function isSameData(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) {
    return true;
  }
  if (Array.isArray(a)) {
    return (
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((item, index) => isSameData(item, b[index]))
    );
  }
  if (isObject(a) && isObject(b)) {
    const keys = Object.keys(a).filter((key) => a[key] !== undefined);
    const otherKeys = Object.keys(b).filter((key) => b[key] !== undefined);
    return keys.length === otherKeys.length && keys.every((key) => isSameData(a[key], b[key]));
  }
  return false;
}
