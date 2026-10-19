// An edit session (§12.1, §12.10): a draft of the whole dashboard, the baseline it's compared with, and undo and redo
// history. Every edit is a pure function from one draft to the next, so a continuous drag (committed once by the grid)
// is one step, and drafts share every unchanged page and widget with the ones before them.

import {
  duplicateWidget,
  normalizePageLayout,
  parseDashboard,
  placePageWidget,
  widgetLimits,
  withLayout,
} from '../document/document';
import { autoPlace, type GridRect } from '../layout/engine';
import type { GridSpec } from '../layout/metrics';
import type {
  AnyWidgetType,
  DashboardDocument,
  DashboardLibrary,
  DashboardPage,
  WidgetInstance,
} from '../types';

/** A step in the history: the draft before an edit, and the page it changed (undo goes back to that page). */
export interface HistoryStep {
  draft: DashboardDocument;
  pageId: string;
}

export interface EditSession {
  collectionId: string;
  /** The dashboard was made in this session and has never been saved (EDIT-30). */
  isNew: boolean;
  /** What the draft is compared with for `isDirty`: the live document, or the last saved one (EDIT-27). */
  baseline: DashboardDocument;
  draft: DashboardDocument;
  past: readonly HistoryStep[];
  future: readonly HistoryStep[];
}

/** At least 100 steps (EDIT-31). */
export const HISTORY_LIMIT = 200;

/** A new session editing `document`. */
export function startSession(
  collectionId: string,
  document: DashboardDocument,
  isNew = false,
): EditSession {
  return { collectionId, isNew, baseline: document, draft: document, past: [], future: [] };
}

/** An unsaved edit session as the host keeps it, to restore later (PERS-05). */
export interface DashboardDraft {
  collectionId: string;
  /** The draft. Restoring checks it with `parseDashboard`, since it comes back from storage. */
  document: DashboardDocument;
  /** The dashboard was made in the session and has never been saved. */
  isNew: boolean;
  /** The page being edited. */
  pageId?: string;
}

/** The draft of a session, for `onDraftChange`. */
export function draftOf(session: EditSession, pageId?: string): DashboardDraft {
  const draft: DashboardDraft = {
    collectionId: session.collectionId,
    document: session.draft,
    isNew: session.isNew,
  };
  if (pageId !== undefined) {
    draft.pageId = pageId;
  }
  return draft;
}

/**
 * A session restored from a stored draft (PERS-05), or null when the draft isn't a valid document, its collection is
 * gone, or the dashboard it edits was deleted meanwhile. Its baseline is the library's current document.
 */
export function restoreSession(
  draft: DashboardDraft,
  library: DashboardLibrary,
): EditSession | null {
  const parsed = parseDashboard(draft.document);
  const collection = library.collections.find((item) => item.id === draft.collectionId);
  if (!parsed.isValid || !collection) {
    return null;
  }
  const stored = collection.dashboards.find((item) => item.id === parsed.document.id);
  if (!stored && !draft.isNew) {
    return null;
  }
  return {
    ...startSession(collection.id, stored ?? parsed.document, !stored),
    draft: parsed.document,
  };
}

/** The session after an edit of page `pageId` that made `next`: one undoable step. */
export function applyEdit(
  session: EditSession,
  pageId: string,
  next: DashboardDocument,
): EditSession {
  if (next === session.draft) {
    return session;
  }
  const past = [...session.past, { draft: session.draft, pageId }];
  return {
    ...session,
    draft: next,
    past: past.length > HISTORY_LIMIT ? past.slice(past.length - HISTORY_LIMIT) : past,
    future: [],
  };
}

/** The session one step back, and the page that step changed; null when there's nothing to undo. */
export function undo(session: EditSession): { session: EditSession; pageId: string } | null {
  const step = session.past.at(-1);
  if (!step) {
    return null;
  }
  return {
    session: {
      ...session,
      draft: step.draft,
      past: session.past.slice(0, -1),
      future: [{ draft: session.draft, pageId: step.pageId }, ...session.future],
    },
    pageId: step.pageId,
  };
}

/** The session one step forward again, and the page it changes; null when there's nothing to redo. */
export function redo(session: EditSession): { session: EditSession; pageId: string } | null {
  const [step, ...future] = session.future;
  if (!step) {
    return null;
  }
  return {
    session: {
      ...session,
      draft: step.draft,
      past: [...session.past, { draft: session.draft, pageId: step.pageId }],
      future,
    },
    pageId: step.pageId,
  };
}

/** The document with page `pageId` replaced by `update(page)`; the same document when nothing changed. */
export function updatePage(
  document: DashboardDocument,
  pageId: string,
  update: (page: DashboardPage) => DashboardPage,
): DashboardDocument {
  const pages = document.pages.map((page) => (page.id === pageId ? update(page) : page));
  return pages.some((page, index) => page !== document.pages[index])
    ? { ...document, pages }
    : document;
}

export { withLayout };

/** What placing new widgets needs: the page's grid and each type's definition. */
export interface PlacementContext {
  grid: GridSpec;
  typeOf: (type: string) => AnyWidgetType | undefined;
}

/**
 * The page with `widget` added at the first free spot after `after` (the focused widget, or the original of a
 * duplicate), or at the end (EDIT-10, EDIT-19), then normalized.
 */
export function withWidgetAdded(
  page: DashboardPage,
  widget: WidgetInstance,
  { grid, typeOf }: PlacementContext,
  after?: WidgetInstance,
): DashboardPage {
  const placed = normalizePageLayout(page, grid, typeOf);
  const definition = typeOf(widget.type);
  const limits = widgetLimits(definition);
  const size = {
    w: Math.min(grid.columns, Math.max(widget.layout.w, limits?.minW ?? 1)),
    h: Math.max(widget.layout.h, limits?.minH ?? 1),
  };
  const rects = placed.widgets.map((item) => ({
    x: item.layout.x ?? 0,
    y: item.layout.y ?? 0,
    w: item.layout.w,
    h: item.layout.h,
  }));
  const from =
    after?.layout.x === undefined || after.layout.y === undefined
      ? undefined
      : { x: after.layout.x + after.layout.w, y: after.layout.y };
  const position = autoPlace(rects, size, grid.columns, from);
  return normalizePageLayout(
    {
      ...placed,
      widgets: [
        ...placed.widgets,
        { ...widget, layout: { ...widget.layout, ...size, ...position } },
      ],
    },
    grid,
    typeOf,
  );
}

/** The page with `widget` added at `rect`, the others making room (EDIT-11). */
export function withWidgetDropped(
  page: DashboardPage,
  widget: WidgetInstance,
  rect: GridRect,
  { grid, typeOf }: PlacementContext,
): DashboardPage {
  const placed = { ...widget, layout: { ...widget.layout, ...rect } };
  return placePageWidget(
    { ...page, widgets: [...page.widgets, placed] },
    widget.id,
    rect,
    grid,
    typeOf,
  );
}

/** The page with a deep copy of widget `widgetId` (new id) beside it, or in the next free spot (EDIT-19). */
export function withWidgetDuplicated(
  page: DashboardPage,
  widgetId: string,
  context: PlacementContext,
): { page: DashboardPage; copy: WidgetInstance | undefined } {
  const original = page.widgets.find((widget) => widget.id === widgetId);
  if (!original) {
    return { page, copy: undefined };
  }
  const copy = duplicateWidget(original);
  delete copy.layout.x;
  delete copy.layout.y;
  return { page: withWidgetAdded(page, copy, context, original), copy };
}

/** The page without widget `widgetId`. */
export function withWidgetRemoved(page: DashboardPage, widgetId: string): DashboardPage {
  const widgets = page.widgets.filter((widget) => widget.id !== widgetId);
  return widgets.length === page.widgets.length ? page : { ...page, widgets };
}

/** The page with widget `widgetId` replaced. */
export function withWidget(page: DashboardPage, widget: WidgetInstance): DashboardPage {
  return { ...page, widgets: page.widgets.map((item) => (item.id === widget.id ? widget : item)) };
}
