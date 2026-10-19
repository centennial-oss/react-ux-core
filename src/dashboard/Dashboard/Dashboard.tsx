import { LayoutGrid, LayoutTemplate, Plus } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import { useLocale } from 'react-aria-components';
import { Banner } from '../../components/Banner/Banner';
import { Button } from '../../components/Button/Button';
import { ButtonGroup } from '../../components/ButtonGroup/ButtonGroup';
import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog';
import { Dialog } from '../../components/Dialog/Dialog';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { LiveRegion, useAnnouncer } from '../../components/LiveRegion/LiveRegion';
import { Skeleton } from '../../components/Skeleton/Skeleton';
import { Tab, TabList, TabPanel, Tabs } from '../../components/Tabs/Tabs';
import type { TimeRangePreset } from '../../components/TimeRangePicker/labels';
import type { TimeRange } from '../../components/TimeRangePicker/resolveTimeRange';
import { toast } from '../../components/Toast/toastStore';
import { useTimeZone } from '../../provider/context';
import { cn } from '../../utils/cn';
import { warnInDevelopment } from '../../utils/dev';
import { errorMessageOf } from '../../utils/errors';
import { isApplePlatform, isEditableTarget, matchesCommandShortcut } from '../../utils/keyboard';
import { lazyComponent, preloadComponent } from '../../utils/lazyComponent';
import { mergeRefs } from '../../utils/mergeRefs';
import { useControllableState } from '../../utils/useControllableState';
import { useElementWidth } from '../../utils/useElementWidth';
import { useFullScreen } from '../../utils/useFullScreen';
import { useLatest } from '../../utils/useLatest';
import { useIsPageHidden } from '../../utils/usePageVisibility';
import { useRecurringTimer } from '../../utils/useRecurringTimer';
import {
  DashboardContextProvider,
  type WidgetErrorHandler,
  type WidgetLoadReport,
} from '../context/DashboardContexts';
import type { DashboardGridHandle } from '../DashboardGrid/DashboardGrid';
import { useFillHeight } from '../DashboardGrid/useGridViewport';
import {
  createDashboard,
  createPage,
  createWidgetInstance,
  isConflictError as isConflictErrorDefault,
  isSameData,
  pageGridSpec,
  prepareForSave,
} from '../document/document';
import { effectivePermissions } from '../document/permissions';
import { instantiatePage, type InstantiateTemplate } from '../document/templates';
import { uniqueTitle } from '../document/titles';
import { readingOrder, type LayoutEntry } from '../layout/engine';
import type { GridSpec } from '../layout/metrics';
import { readText, useDashboardMessages } from '../messages';
import type { ManageDashboardsDialogProps } from '../ManageDashboardsDialog/ManageDashboardsDialog';
import { withPageSettings } from '../PageSettingsDialog/pageSettings';
import type { PageSettingsDialogProps } from '../PageSettingsDialog/PageSettingsDialog';
import type {
  AnyDataSource,
  AnyWidgetType,
  CollectionChangeResult,
  CollectionChangeSet,
  DashboardCollection,
  DashboardDocument,
  DashboardLibrary,
  DashboardMode,
  DashboardPage,
  DashboardPermissions,
  DataShapeDefinition,
  GridSettingsPolicy,
  JsonObject,
  JsonValue,
  MapStyleOption,
  PageTemplate,
  PermissionTarget,
  WidgetAction,
  WidgetInstance,
} from '../types';
import {
  resolveDataShapes,
  resolveDataSources,
  toWidgetRegistry,
  type WidgetRegistry,
} from '../widgets/define';
import { WidgetView } from '../WidgetFrame/WidgetView';
import { DashboardHeader, type HeaderLayout } from './DashboardHeader';
import { DashboardPageView, type PageWidgetActions } from './DashboardPageView';
import {
  applyEdit,
  draftOf,
  redo as redoStep,
  restoreSession,
  startSession,
  undo as undoStep,
  updatePage,
  withLayout,
  withWidget,
  withWidgetAdded,
  withWidgetDropped,
  withWidgetDuplicated,
  withWidgetRemoved,
  type PlacementContext,
  type DashboardDraft,
  type EditSession,
} from './editSession';
import { EditToolbar } from './EditToolbar';
import { withFilterValue, type DashboardFilterDefinition } from './filters';
import { useTypeDrag } from './typeDrag';
import { useEditMask } from './useEditMask';
import type { WidgetConfigureDialogProps } from './WidgetConfigureDialog';
import { TemplatePicker, WidgetPicker } from './WidgetPicker';
import {
  isSameSelection,
  orderedDashboards,
  resolveSelection,
  type DashboardSelection,
} from './selection';

// The dialogs load the first time they open (and are preloaded once they can be), so a view-only dashboard doesn't
// carry them.
const nothing = () => null;
const WidgetConfigureDialog = lazyComponent<WidgetConfigureDialogProps>(
  () => import('./WidgetConfigureDialog').then((module) => module.WidgetConfigureDialog),
  nothing,
);
const ManageDashboardsDialog = lazyComponent<ManageDashboardsDialogProps>(
  () =>
    import('../ManageDashboardsDialog/ManageDashboardsDialog').then(
      (module) => module.ManageDashboardsDialog,
    ),
  nothing,
);
const PageSettingsDialog = lazyComponent<PageSettingsDialogProps>(
  () =>
    import('../PageSettingsDialog/PageSettingsDialog').then((module) => module.PageSettingsDialog),
  nothing,
);

/** An action the host adds to the header or the edit toolbar (NAV-06). */
export type DashboardAction = WidgetAction;

/** The auto-refresh intervals offered by default (NAV-08): off, 30 s, 1, 5 and 15 minutes. */
export const DEFAULT_REFRESH_INTERVALS: readonly number[] = [0, 30_000, 60_000, 300_000, 900_000];

const HEADER_WIDE = 64 * 16;
const HEADER_MEDIUM = 42 * 16;

/** How the save callback is told about the document. */
export interface SaveDashboardMeta {
  collectionId: string;
  /** The dashboard was made in this session and has never been saved. */
  isNew: boolean;
  /** Saving over a newer stored version, after a conflict (PERS-07). */
  isForced?: boolean;
}

export interface DashboardProps {
  /** Everything the dashboard can show: the host's source of truth (PERS-01). */
  library: DashboardLibrary;
  /** The library is loading: a skeleton in the shape of the header and grid. */
  isLoading?: boolean;
  /** The widget types it can draw: a registry or a list (ARCH-03). */
  widgetTypes: WidgetRegistry | readonly AnyWidgetType[];
  dataSources?: readonly AnyDataSource[];
  /** Extra data shapes, for custom widget types (DATA-19). */
  dataShapes?: readonly DataShapeDefinition[];
  /** An opaque value passed to loaders, filter loaders and parameter editors, never saved (CTX-16). Memoize it. */
  runtimeContext?: unknown;
  /** The shown collection, dashboard and page, controlled (NAV-04). */
  selection?: DashboardSelection;
  defaultSelection?: Partial<DashboardSelection>;
  /** Called on navigation, and when a stale or missing id falls back to the first valid item. */
  onSelectionChange?: (selection: DashboardSelection) => void;
  /** `view` or `edit`, controlled (EDIT-01). */
  mode?: DashboardMode;
  defaultMode?: DashboardMode;
  onModeChange?: (mode: DashboardMode) => void;
  /** Shows a TimeRangePicker in the header (CTX-02). */
  hasTimeRangePicker?: boolean;
  /** The time range, controlled; over the dashboard's default and `defaultTimeRange` (CTX-01). */
  timeRange?: TimeRange;
  defaultTimeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  timeRangePresets?: readonly TimeRangePreset[];
  /** IANA time zone for loaders and labels. Defaults to the provider's. */
  timeZone?: string;
  /** The dashboard's filters (§9.2). */
  filters?: readonly DashboardFilterDefinition[];
  filterValues?: Readonly<Record<string, JsonValue>>;
  defaultFilterValues?: Readonly<Record<string, JsonValue>>;
  onFilterValuesChange?: (values: Record<string, JsonValue>) => void;
  /** Auto-refresh, in milliseconds (0 is off), controlled (NAV-10). */
  refreshIntervalMs?: number;
  defaultRefreshIntervalMs?: number;
  onRefreshIntervalChange?: (ms: number) => void;
  /** The intervals offered (NAV-08). Defaults to off, 30 s, 1, 5 and 15 minutes. */
  refreshIntervals?: readonly number[];
  /** The shortest auto-refresh interval. Defaults to 15 seconds. */
  minRefreshIntervalMs?: number;
  /** Loads at once at most (DATA-11). Defaults to 6. */
  maxConcurrentLoads?: number;
  /** Grid settings under each dashboard's and page's own (GRID-01). */
  grid?: Partial<GridSpec>;
  /** In edit mode, a placeholder instead of each widget (WID-11). Defaults to `live`. */
  editPreview?: 'live' | 'placeholder';
  /** `overlay` (the default, Q6) covers the page; `native` uses the Fullscreen API where it can (NAV-09). */
  fullScreenMode?: 'overlay' | 'native';
  /**
   * Kiosk mode (Q4): shows the dashboard's pages in turn, this many milliseconds each, for wall displays. Any
   * interaction starts the wait over; it stops while editing, while the page is hidden and when paused from the
   * header. Off by default.
   */
  kioskIntervalMs?: number;
  /** Dims the host's UI and makes it inert while editing (EDIT-04). Defaults to true. */
  hasEditMask?: boolean;
  /** Asks before every save (EDIT-29). Shared dashboards always ask. */
  shouldConfirmSave?: boolean;
  /** Warns before the page unloads with unsaved changes (EDIT-03). Defaults to true. */
  shouldWarnOnUnload?: boolean;
  /** Map styles for map widgets (§10.4). */
  mapStyles?: readonly MapStyleOption[];
  /**
   * The legend's hidden keys by page id, for a host that persists them (CTX-14); with it, the legend state is
   * controlled. Without it, each page keeps its own for the session.
   */
  hiddenLegendKeys?: Readonly<Record<string, readonly string[]>>;
  /** Called with a page's hidden legend keys when they change. */
  onHiddenLegendKeysChange?: (pageId: string, keys: string[]) => void;
  /**
   * Widgets' interactive state by widget id (a table's sort), for a host that keeps it per user (Q3); with it, the
   * state is controlled. Without it, it lasts the session.
   */
  widgetState?: Readonly<Record<string, JsonObject>>;
  /** Called with a widget's state when it changes. */
  onWidgetStateChange?: (widgetId: string, state: JsonObject) => void;
  /** Narrows the permissions the library grants; never widens them (PERM-01). */
  getPermissions?: (target: PermissionTarget) => Partial<DashboardPermissions>;
  /** Page templates offered for new dashboards and pages (NAV-12). */
  templates?: readonly PageTemplate[];
  /** Fills a template, such as choosing its sources (NAV-13). Every id is new either way. */
  instantiateTemplate?: InstantiateTemplate;
  /** Hides Page settings or locks some of its fields (EDIT-26). */
  gridSettingsPolicy?: GridSettingsPolicy;
  /** Saves a dashboard and resolves with the stored document (ids, revision). Without it, nothing is editable. */
  onSaveDashboard?: (
    document: DashboardDocument,
    meta: SaveDashboardMeta,
  ) => Promise<DashboardDocument>;
  /** Stores Manage dashboards' changes as one change set (MGMT-04). Without it, Manage isn't offered. */
  onApplyCollectionChanges?: (changes: CollectionChangeSet) => Promise<CollectionChangeResult>;
  /** Recognizes a save that failed because the stored dashboard changed (PERS-07). Defaults to `isConflictError`. */
  isConflictError?: (error: unknown) => boolean;
  /**
   * An unsaved edit session to restore, as `onDraftChange` gave it (PERS-05); it's checked with `parseDashboard`.
   * With a controlled `mode`, pass `edit` along with it.
   */
  draft?: DashboardDraft | null;
  /** Called with the edit session's draft whenever it has unsaved changes, and with null when it has none. */
  onDraftChange?: (draft: DashboardDraft | null) => void;
  /** Called when a dashboard made in an edit session is discarded unsaved (EDIT-30). */
  onDiscardNewDashboard?: (tempId: string) => void;
  /** Called when unsaved changes appear or go (EDIT-03), so the host can guard routing. */
  onDirtyChange?: (isDirty: boolean) => void;
  /** Called on every refresh of the page or a widget (notification only). */
  onRefresh?: (scope: { pageId: string; widgetId?: string }) => void;
  onWidgetError?: WidgetErrorHandler;
  /** Maps a load error to what the widget shows (DATA-13). */
  formatError?: (error: unknown) => ReactNode;
  headerStart?: ReactNode;
  headerEnd?: ReactNode;
  /** More actions in view mode (NAV-06). */
  viewActions?: readonly DashboardAction[];
  /** More actions in edit mode (NAV-06). */
  editActions?: readonly DashboardAction[];
  /** More actions in each widget's menu (WID-08). */
  widgetActions?: (instance: WidgetInstance) => WidgetAction[];
  /** Replaces the empty library state. */
  renderEmptyLibrary?: () => ReactNode;
  /** Replaces the empty collection state, such as with a guided setup. */
  renderEmptyCollection?: (collection: DashboardCollection) => ReactNode;
  /** A notice shown while editing (PERM-03): content, or a function of what's edited. */
  editNotice?: ReactNode | ((target: PermissionTarget) => ReactNode);
  /** The dashboard's height (CSS). Without it, it fills down to the bottom of the visual viewport (GRID-10). */
  height?: string;
  className?: string;
  ref?: Ref<HTMLElement>;
}

const noFilters: readonly DashboardFilterDefinition[] = [];
const noKeys: ReadonlySet<string> = new Set();
const noValues: Readonly<Record<string, JsonValue>> = {};

/** Whether a type needs setting up before it can show anything (EDIT-10). */
function needsSetup(type: AnyWidgetType): boolean {
  return (
    (type.dataShape !== null && type.isDataRequired !== false) ||
    type.validateOptions?.(type.defaultOptions).isValid === false
  );
}

/**
 * The dashboard shell (§11, §12): navigation between collections, dashboards and pages; the time range and filters;
 * refresh, auto-refresh and full screen; and, for users who may, edit sessions with undo, a configure dialog and save.
 * Data, persistence and permissions come from the host.
 */
export function Dashboard({
  library,
  isLoading = false,
  widgetTypes,
  dataSources,
  dataShapes,
  runtimeContext,
  selection: selectionProp,
  defaultSelection,
  onSelectionChange,
  mode: modeProp,
  defaultMode = 'view',
  onModeChange,
  hasTimeRangePicker = false,
  timeRange: timeRangeProp,
  defaultTimeRange,
  onTimeRangeChange,
  timeRangePresets,
  timeZone: timeZoneProp,
  filters = noFilters,
  filterValues: filterValuesProp,
  defaultFilterValues = noValues,
  onFilterValuesChange,
  refreshIntervalMs: refreshIntervalProp,
  defaultRefreshIntervalMs = 0,
  onRefreshIntervalChange,
  refreshIntervals = DEFAULT_REFRESH_INTERVALS,
  minRefreshIntervalMs = 15_000,
  maxConcurrentLoads,
  grid: gridSettings,
  editPreview = 'live',
  fullScreenMode = 'overlay',
  kioskIntervalMs,
  hasEditMask = true,
  shouldConfirmSave = false,
  shouldWarnOnUnload = true,
  mapStyles,
  hiddenLegendKeys: hiddenLegendKeysProp,
  onHiddenLegendKeysChange,
  widgetState,
  onWidgetStateChange,
  getPermissions,
  templates,
  instantiateTemplate,
  gridSettingsPolicy,
  onSaveDashboard,
  onApplyCollectionChanges,
  isConflictError = isConflictErrorDefault,
  draft: draftProp,
  onDraftChange,
  onDiscardNewDashboard,
  onDirtyChange,
  onRefresh,
  onWidgetError,
  formatError,
  headerStart,
  headerEnd,
  viewActions,
  editActions,
  widgetActions,
  renderEmptyLibrary,
  renderEmptyCollection,
  editNotice,
  height,
  className,
  ref,
}: DashboardProps) {
  const messages = useDashboardMessages();
  const { locale } = useLocale();
  const providerZone = useTimeZone();
  const timeZone = timeZoneProp ?? providerZone;
  const registry = useMemo(() => toWidgetRegistry(widgetTypes), [widgetTypes]);
  const sources = useMemo(() => resolveDataSources(dataSources), [dataSources]);
  const shapes = useMemo(() => resolveDataShapes(dataShapes), [dataShapes]);
  const { ref: announcerRef, announce } = useAnnouncer();

  // Saved documents stand in for the library's until the next library arrives (PERS-01).
  // Manage dashboards' applied collections do the same.
  const [saved, setSaved] = useState<{
    library: DashboardLibrary;
    documents: ReadonlyMap<string, DashboardDocument>;
    collections?: ReadonlyMap<string, readonly DashboardDocument[]>;
  }>(() => ({ library, documents: new Map() }));
  const isSavedCurrent = saved.library === library;
  const savedDocuments = isSavedCurrent ? saved.documents : undefined;
  const savedCollections = isSavedCurrent ? saved.collections : undefined;
  const [session, setSession] = useState<EditSession | null>(null);

  // The library as shown: saved documents, and the draft of the dashboard being edited (a new one added).
  const shownLibrary = useMemo((): DashboardLibrary => {
    if (!savedDocuments?.size && !savedCollections?.size && !session) {
      return library;
    }
    return {
      ...library,
      collections: library.collections.map((item) => {
        let dashboards = (savedCollections?.get(item.id) ?? item.dashboards).map(
          (document) => savedDocuments?.get(document.id) ?? document,
        );
        if (session?.collectionId === item.id) {
          const draft = session.draft;
          dashboards = dashboards.some((document) => document.id === draft.id)
            ? dashboards.map((document) => (document.id === draft.id ? draft : document))
            : [...dashboards, draft];
        }
        return { ...item, dashboards };
      }),
    };
  }, [library, savedDocuments, savedCollections, session]);

  // Selection (NAV-04): stale or missing ids fall back to the first valid item, and the correction is reported.
  const [internalSelection, setInternalSelection] = useState<
    Partial<DashboardSelection> | undefined
  >(defaultSelection);
  const requested = selectionProp ?? internalSelection;
  const resolved = useMemo(
    () => resolveSelection(shownLibrary, requested, locale),
    [shownLibrary, requested, locale],
  );
  const { collection, dashboard, page, selection } = resolved;
  const dashboards = useMemo(
    () => (collection ? orderedDashboards(collection, locale) : []),
    [collection, locale],
  );

  // Permissions (PERM-01): nothing is editable without a save target (PERS-06).
  const permissions = useMemo(
    () => ({
      collection: collection
        ? effectivePermissions({ kind: 'collection', collection }, getPermissions)
        : undefined,
      dashboard:
        collection && dashboard
          ? effectivePermissions({ kind: 'dashboard', collection, dashboard }, getPermissions)
          : undefined,
      page:
        collection && dashboard && page
          ? effectivePermissions({ kind: 'page', collection, dashboard, page }, getPermissions)
          : undefined,
    }),
    [collection, dashboard, page, getPermissions],
  );
  const canSave = onSaveDashboard !== undefined;
  const canEditDashboard = canSave && permissions.dashboard?.canEdit === true;
  const canEditPage =
    canSave && (permissions.page?.canEdit ?? permissions.dashboard?.canEdit) === true;

  // Mode and the edit session (EDIT-01): edit mode starts a session with a draft of the whole dashboard (EDIT-02).
  const [internalMode, setInternalMode] = useState<DashboardMode>(defaultMode);
  const mode = modeProp ?? internalMode;
  const setMode = (next: DashboardMode) => {
    if (modeProp === undefined) {
      setInternalMode(next);
    }
    onModeChange?.(next);
  };
  // A draft the host kept is restored once, in edit mode (PERS-05); the host hears of it after the render.
  const [handledDraft, setHandledDraft] = useState<DashboardDraft | null | undefined>(undefined);
  const [restored, setRestored] = useState<{ selection: DashboardSelection | null } | null>(null);
  const isRestoring = draftProp != null && draftProp !== handledDraft && !session;
  if (isRestoring) {
    setHandledDraft(draftProp);
    const next = restoreSession(draftProp, library);
    if (next) {
      const restoredSelection = {
        collectionId: next.collectionId,
        dashboardId: next.draft.id,
        pageId:
          next.draft.pages.find((item) => item.id === draftProp.pageId)?.id ??
          next.draft.pages[0]?.id ??
          '',
      };
      setSession(next);
      setInternalMode('edit');
      if (selectionProp === undefined) {
        setInternalSelection(restoredSelection);
      }
      setRestored({ selection: restoredSelection });
    } else {
      setRestored({ selection: null });
    }
  } else if (mode === 'edit' && !session && dashboard && collection && canEditDashboard) {
    setSession(startSession(collection.id, dashboard));
  } else if (mode === 'view' && session) {
    setSession(null);
  }
  const isEditing = mode === 'edit' && session !== null && session.draft.id === dashboard?.id;
  const isDirty = useMemo(
    () => (session ? !isSameData(session.draft, session.baseline) : false),
    [session],
  );

  // The time range (CTX-01): controlled, else the user's choice for this dashboard, its default, then the prop's.
  const [chosenRange, setChosenRange] = useState<{ dashboardId: string; range: TimeRange } | null>(
    null,
  );
  const dashboardId = dashboard?.id ?? '';
  const timeRange =
    timeRangeProp ??
    (chosenRange?.dashboardId === dashboardId ? chosenRange.range : undefined) ??
    dashboard?.defaultTimeRange ??
    defaultTimeRange;

  // Filter values (CTX-07): controlled, else per dashboard from its defaults; a parent's change clears its children.
  const [chosenFilters, setChosenFilters] = useState<{
    dashboardId: string;
    values: Readonly<Record<string, JsonValue>>;
  } | null>(null);
  const dashboardFilters = dashboard?.defaultFilterValues;
  const baseFilters = useMemo(
    () => ({ ...defaultFilterValues, ...dashboardFilters }),
    [defaultFilterValues, dashboardFilters],
  );
  const filterValues =
    filterValuesProp ??
    (chosenFilters?.dashboardId === dashboardId ? chosenFilters.values : undefined) ??
    baseFilters;

  // Refresh (NAV-08, NAV-10): progress while widgets load; announcements once per refresh (A11Y-04).
  const [refreshIntervalMs, setRefreshIntervalMs] = useControllableState(
    refreshIntervalProp,
    defaultRefreshIntervalMs,
    onRefreshIntervalChange,
  );
  const intervals = useMemo(
    () => refreshIntervals.filter((ms) => ms === 0 || ms >= minRefreshIntervalMs),
    [refreshIntervals, minRefreshIntervalMs],
  );
  const [loadingCount, setLoadingCount] = useState(0);
  const loads = useRef({
    loading: new Set<string>(),
    cycle: null as { reason: string; pending: Set<string>; failed: number } | null,
  });
  const pageId = page?.id ?? '';

  // The legend's hidden keys, per page (CTX-14): the host's, or kept for the session.
  const [legendByPage, setLegendByPage] = useState<ReadonlyMap<string, ReadonlySet<string>>>(
    () => new Map(),
  );
  const hostHidden = hiddenLegendKeysProp?.[pageId];
  const hiddenLegendKeys = useMemo(
    () =>
      hiddenLegendKeysProp === undefined
        ? (legendByPage.get(pageId) ?? noKeys)
        : new Set(hostHidden ?? noKeys),
    [hiddenLegendKeysProp, hostHidden, legendByPage, pageId],
  );

  // The handlers keep their identity; they read the latest props and state when they run.
  const latest = useLatest({
    selectionProp,
    onSelectionChange,
    onModeChange,
    onDraftChange,
    isConflictError,
    onDirtyChange,
    onDiscardNewDashboard,
    onSaveDashboard,
    onRefresh,
    onTimeRangeChange,
    onFilterValuesChange,
    onHiddenLegendKeysChange,
    isLegendControlled: hiddenLegendKeysProp !== undefined,
    filters,
    filterValues,
    dashboardId,
    pageId,
    messages,
    resolvedSelection: selection,
  });
  const [handlers] = useState(() => {
    const setSelection = (next: DashboardSelection) => {
      if (latest.current.selectionProp === undefined) {
        setInternalSelection(next);
      }
      latest.current.onSelectionChange?.(next);
    };
    const edit = (update: (document: DashboardDocument) => DashboardDocument) => {
      const target = latest.current.pageId;
      setSession((current) =>
        current ? applyEdit(current, target, update(current.draft)) : current,
      );
    };
    return {
      setSelection,
      edit,
      onLayoutChange: (entries: LayoutEntry[]) => {
        const target = latest.current.pageId;
        edit((document) => updatePage(document, target, (current) => withLayout(current, entries)));
      },
      setTimeRange: (range: TimeRange) => {
        setChosenRange({ dashboardId: latest.current.dashboardId, range });
        latest.current.onTimeRangeChange?.(range);
      },
      setHiddenLegendKeys: (keys: Set<string>) => {
        const current = latest.current;
        const target = current.pageId;
        if (!current.isLegendControlled) {
          setLegendByPage((map) => new Map(map).set(target, keys));
        }
        current.onHiddenLegendKeysChange?.(target, [...keys]);
      },
      setFilterValue: (filterId: string, value: JsonValue) => {
        const current = latest.current;
        const next = withFilterValue(current.filters, current.filterValues, filterId, value);
        setChosenFilters({ dashboardId: current.dashboardId, values: next });
        current.onFilterValuesChange?.(next);
      },
      onProviderRefresh: (widgetId?: string) => {
        const target = latest.current.pageId;
        latest.current.onRefresh?.(
          widgetId === undefined ? { pageId: target } : { pageId: target, widgetId },
        );
      },
      onLoadReport: ({ widgetId, status, reason }: WidgetLoadReport) => {
        const state = loads.current;
        const isRefresh = reason === 'manualRefresh' || reason === 'autoRefresh';
        if (status === 'loading') {
          state.loading.add(widgetId);
          if (isRefresh) {
            if (state.cycle?.reason !== reason) {
              state.cycle = { reason, pending: new Set(), failed: 0 };
            }
            state.cycle.pending.add(widgetId);
          }
        } else {
          state.loading.delete(widgetId);
          const cycle = state.cycle;
          if (cycle?.pending.delete(widgetId)) {
            cycle.failed += status === 'error' ? 1 : 0;
            if (cycle.pending.size === 0) {
              state.cycle = null;
              const strings = latest.current.messages;
              if (cycle.failed > 0) {
                announce(strings.widgetsFailed({ count: cycle.failed }));
              } else if (cycle.reason === 'manualRefresh') {
                announce(strings.dashboardRefreshed);
              }
            }
          }
        }
        setLoadingCount(state.loading.size);
      },
    };
  });
  const { setSelection, edit } = handlers;

  const selectionKey = `${selection.collectionId}\u001f${selection.dashboardId}\u001f${selection.pageId}`;
  const isCorrection =
    requested !== undefined &&
    !isSameSelection(requested, selection) &&
    selection.collectionId !== '';
  useEffect(() => {
    if (isCorrection) {
      latest.current.onSelectionChange?.(latest.current.resolvedSelection);
    }
  }, [selectionKey, isCorrection, latest]);
  useEffect(() => {
    latest.current.onDirtyChange?.(isDirty);
  }, [isDirty, latest]);
  // The host keeps unsaved sessions through onDraftChange (PERS-05): told of every change, and when none is left.
  const draftReported = useRef(false);
  useEffect(() => {
    const report = latest.current.onDraftChange;
    if (session && isDirty) {
      draftReported.current = true;
      report?.(draftOf(session, pageId));
    } else if (draftReported.current) {
      draftReported.current = false;
      report?.(null);
    }
  }, [session, isDirty, pageId, latest]);
  useEffect(() => {
    if (!restored) {
      return;
    }
    if (restored.selection) {
      latest.current.onModeChange?.('edit');
      latest.current.onSelectionChange?.(restored.selection);
      announce(latest.current.messages.draftRestored);
    } else {
      warnInDevelopment('Dashboard', 'The draft couldn’t be restored: it isn’t a valid dashboard.');
      latest.current.onDraftChange?.(null);
    }
  }, [restored, announce, latest]);
  useEffect(() => {
    if (!isDirty || !shouldWarnOnUnload) {
      return;
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [isDirty, shouldWarnOnUnload]);

  // The root: its width lays out the header (NAV-05); its height fills the viewport unless given (GRID-10).
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const [widthRef, width = HEADER_WIDE] = useElementWidth();
  const rootRef = useMemo(() => mergeRefs<HTMLElement>(setRoot, widthRef, ref), [widthRef, ref]);
  const layout: HeaderLayout =
    width >= HEADER_WIDE ? 'wide' : width >= HEADER_MEDIUM ? 'medium' : 'phone';

  // Full screen (NAV-09): an overlay by default, or the Fullscreen API where it's asked for and available.
  const [isOverlay, setOverlay] = useState(false);
  const native = useFullScreen(root);
  const isFullScreen = isOverlay || native.isFullScreen;
  const toggleFullScreen = () => {
    if (isOverlay) {
      setOverlay(false);
    } else if (fullScreenMode === 'native' && native.canFullScreen) {
      native.toggle();
    } else {
      setOverlay(true);
    }
  };
  useEffect(() => {
    if (!isOverlay) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const isInOverlay = target?.closest(
        '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]',
      );
      if (event.key === 'Escape' && !event.defaultPrevented && !isInOverlay) {
        setOverlay(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOverlay]);
  const fillHeight = useFillHeight(root, height === undefined && !isOverlay);
  useEditMask(root, isEditing && hasEditMask && !isOverlay);

  // Kiosk mode (Q4): the next page every interval, waiting a whole interval again after any interaction.
  const [isKioskPaused, setKioskPaused] = useState(false);
  const isPageHidden = useIsPageHidden();
  const pageCount = dashboard?.pages.length ?? 0;
  const isKiosk = kioskIntervalMs !== undefined && kioskIntervalMs > 0 && pageCount > 1;
  const latestKiosk = useLatest({ dashboard, selection, messages });
  const kioskTimer = useRecurringTimer(
    () => {
      const { dashboard: current, selection: shown, messages: strings } = latestKiosk.current;
      const list = current?.pages ?? [];
      const next = list[(list.findIndex((item) => item.id === shown.pageId) + 1) % list.length];
      if (next) {
        setSelection({ ...shown, pageId: next.id });
        announce(strings.kioskShowing({ title: next.title }));
      }
    },
    kioskIntervalMs,
    { isRunning: isKiosk && !isKioskPaused && !isEditing && !isPageHidden },
  );
  const restartKiosk = kioskTimer.restart;
  useEffect(() => {
    if (!root || !isKiosk) {
      return;
    }
    const onInteraction = () => {
      restartKiosk();
    };
    const events = ['pointerdown', 'keydown', 'wheel'] as const;
    for (const type of events) {
      root.addEventListener(type, onInteraction, { passive: true });
    }
    return () => {
      for (const type of events) {
        root.removeEventListener(type, onInteraction);
      }
    };
  }, [root, isKiosk, restartKiosk]);

  // Edits: each is one undoable step on the page it changes (EDIT-31).
  const gridRef = useRef<DashboardGridHandle | null>(null);
  const addWidgetButton = useRef<HTMLButtonElement | null>(null);
  const pendingFocus = useRef<string | null>(null);
  const [configuringId, setConfiguringId] = useState<string | null>(null);
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [confirming, setConfirming] = useState<'revert' | 'clear' | 'save' | null>(null);
  const [isDoneOpen, setDoneOpen] = useState(false);
  const [leaving, setLeaving] = useState<
    Partial<DashboardSelection> | { newDashboard: DashboardPage | null } | null
  >(null);
  const [isSaving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<unknown>(null);
  const [isConflict, setConflict] = useState(false);
  const [isManageOpen, setManageOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [templatePurpose, setTemplatePurpose] = useState<'page' | 'dashboard' | null>(null);
  const grid = useMemo(
    () => (dashboard ? pageGridSpec(dashboard, page, gridSettings) : undefined),
    [dashboard, page, gridSettings],
  );
  // The widget last focused, which a new widget is placed after (EDIT-10).
  const focusedWidget = useRef<string | null>(null);
  const placement = useMemo(
    () => (grid ? { grid, typeOf: (type: string) => registry.get(type) } : undefined),
    [grid, registry],
  );

  const navigate = (target: Partial<DashboardSelection>) => {
    const next = resolveSelection(shownLibrary, { ...selection, ...target }, locale).selection;
    if (isEditing && next.dashboardId !== selection.dashboardId) {
      // Leaving the dashboard being edited: ask about unsaved changes first (EDIT-05).
      if (isDirty) {
        setLeaving(target);
        return;
      }
      endSession();
    }
    setSelection(next);
  };

  const endSession = () => {
    if (session?.isNew) {
      latest.current.onDiscardNewDashboard?.(session.draft.id);
    }
    setSession(null);
    setMode('view');
    setSaveError(null);
    setConflict(false);
  };

  const performSave = async (isForced = false): Promise<boolean> => {
    const save = latest.current.onSaveDashboard;
    if (!session || !save) {
      return false;
    }
    const draft = session.draft;
    setSaving(true);
    setSaveError(null);
    try {
      const stored = await save(
        prepareForSave(draft, (type) => registry.get(type), gridSettings),
        {
          collectionId: session.collectionId,
          isNew: session.isNew,
          ...(isForced ? { isForced } : {}),
        },
      );
      setSaved((current) => ({
        library,
        documents: new Map([
          ...(current.library === library ? current.documents : []),
          [stored.id, stored],
        ]),
      }));
      setSession((current) =>
        current
          ? {
              ...current,
              isNew: false,
              baseline: stored,
              draft: current.draft === draft ? stored : current.draft,
            }
          : current,
      );
      if (stored.id !== draft.id) {
        // The host gave the new dashboard its permanent ids: follow them (PERS-01).
        const pageIndex = draft.pages.findIndex((item) => item.id === selection.pageId);
        setSelection({
          collectionId: session.collectionId,
          dashboardId: stored.id,
          pageId: stored.pages[pageIndex]?.id ?? stored.pages[0]?.id ?? '',
        });
      }
      setConflict(false);
      return true;
    } catch (error) {
      // A newer stored version: reload it or overwrite it (PERS-07).
      if (latest.current.isConflictError(error)) {
        setConflict(true);
      } else {
        setSaveError(error);
      }
      return false;
    } finally {
      setSaving(false);
    }
  };
  const reloadLatest = () => {
    if (!session) {
      return;
    }
    const stored = library.collections
      .find((item) => item.id === session.collectionId)
      ?.dashboards.find((item) => item.id === session.draft.id);
    setConflict(false);
    setSaved((current) => {
      const documents = new Map(current.library === library ? current.documents : []);
      documents.delete(session.draft.id);
      return { ...current, library, documents };
    });
    if (stored) {
      setSession(startSession(session.collectionId, stored));
    } else {
      endSession();
    }
  };

  const noticeTarget: PermissionTarget | undefined =
    collection && dashboard ? { kind: 'dashboard', collection, dashboard } : undefined;
  const notice: ReactNode =
    collection?.editNotice ??
    (typeof editNotice === 'function'
      ? noticeTarget
        ? editNotice(noticeTarget)
        : null
      : editNotice);
  const hasNotice = notice !== undefined && notice !== null && notice !== false && notice !== '';
  const requestSave = () => {
    // Shared dashboards (and hosts that ask) confirm first, restating the notice (EDIT-29).
    if (hasNotice || shouldConfirmSave) {
      setConfirming('save');
    } else {
      void performSave();
    }
  };

  const titlesOf = (items: readonly { title: string }[]) => items.map((item) => item.title);
  const numbered = messages.titleNumbered;
  const addPage = (fromTemplate?: DashboardPage) => {
    if (!dashboard) {
      return;
    }
    const created = {
      ...(fromTemplate ?? createPage({ title: messages.newPage })),
      title: uniqueTitle(
        fromTemplate?.title ?? messages.newPage,
        titlesOf(dashboard.pages),
        numbered,
      ),
    };
    setSession((current) =>
      current
        ? applyEdit(current, created.id, {
            ...current.draft,
            pages: [...current.draft.pages, created],
          })
        : current,
    );
    setSelection({ ...selection, pageId: created.id });
  };
  const startNewDashboard = (fromTemplate?: DashboardPage) => {
    if (!collection) {
      return;
    }
    const created = createDashboard({
      title: uniqueTitle(
        fromTemplate?.title ?? messages.newDashboard,
        titlesOf(collection.dashboards),
        numbered,
      ),
      pageTitle: messages.newPage,
      pages: fromTemplate ? [fromTemplate] : undefined,
    });
    setSession(startSession(collection.id, created, true));
    setMode('edit');
    setSelection({
      collectionId: collection.id,
      dashboardId: created.id,
      pageId: created.pages[0]?.id ?? '',
    });
  };
  const requestNewDashboard = (fromTemplate?: DashboardPage) => {
    if (isEditing && isDirty) {
      setLeaving({ newDashboard: fromTemplate ?? null });
    } else {
      startNewDashboard(fromTemplate);
    }
  };
  // A template becomes a page with new ids, filled by the host when it can (NAV-13).
  const chooseTemplate = async (template: PageTemplate) => {
    const purpose = templatePurpose;
    setTemplatePurpose(null);
    try {
      const created = await instantiatePage(template, readText(template.name, messages), {
        instantiate: instantiateTemplate,
        context: runtimeContext,
      });
      if (purpose === 'page') {
        addPage(created);
      } else {
        requestNewDashboard(created);
      }
    } catch (error) {
      toast.error({
        title: messages.templateFailed,
        description: errorMessageOf(error, messages.genericError),
      });
    }
  };
  /** Adds a widget of a type, placed by `place`, then focuses it and opens Configure when it needs setting up. */
  const insertWidget = (
    type: AnyWidgetType,
    place: (
      current: DashboardPage,
      instance: WidgetInstance,
      context: PlacementContext,
    ) => DashboardPage,
  ) => {
    if (!placement || !page) {
      return;
    }
    const instance = createWidgetInstance(type);
    edit((document) =>
      updatePage(document, page.id, (current) => place(current, instance, placement)),
    );
    pendingFocus.current = instance.id;
    if (needsSetup(type)) {
      setConfiguringId(instance.id);
    }
  };
  const addWidget = (type: AnyWidgetType) => {
    const focused = page?.widgets.find((widget) => widget.id === focusedWidget.current);
    insertWidget(type, (current, instance, context) =>
      withWidgetAdded(current, instance, context, focused),
    );
  };
  // A type dragged from the picker lands where it's dropped (EDIT-11).
  const typeDrag = useTypeDrag<AnyWidgetType>({
    gridRef,
    onDrop: (type, rect) => {
      insertWidget(type, (current, instance, context) =>
        withWidgetDropped(current, instance, rect, context),
      );
      announce(
        messages.widgetPlaced({
          title: readText(type.displayName, messages),
          column: rect.x + 1,
          row: rect.y + 1,
          width: rect.w,
          height: rect.h,
        }),
      );
    },
  });

  const latestPage = useLatest({ page, placement, edit, messages, registry });
  const [widgetActionsApi] = useState((): PageWidgetActions => ({
    configure: (widgetId) => {
      setConfiguringId(widgetId);
    },
    duplicate: (widgetId) => {
      const { page: current, placement: context, edit: apply } = latestPage.current;
      if (!current || !context) {
        return;
      }
      apply((document) =>
        updatePage(
          document,
          current.id,
          (target) => withWidgetDuplicated(target, widgetId, context).page,
        ),
      );
    },
    remove: (widgetId) => {
      const { page: current, edit: apply, messages: strings, registry: types } = latestPage.current;
      if (!current) {
        return;
      }
      const removed = current.widgets.find((widget) => widget.id === widgetId);
      if (!removed) {
        return;
      }
      // Focus goes to the next widget in reading order, or to Add widget when none is left (A11Y-05).
      const order = readingOrder(
        current.widgets.map((widget) => ({
          id: widget.id,
          x: widget.layout.x ?? 0,
          y: widget.layout.y ?? 0,
          w: widget.layout.w,
          h: widget.layout.h,
        })),
      );
      const index = order.indexOf(widgetId);
      pendingFocus.current = order[index + 1] ?? order[index - 1] ?? '__add__';
      apply((document) =>
        updatePage(document, current.id, (target) => withWidgetRemoved(target, widgetId)),
      );
      const definition = types.get(removed.type);
      const title =
        removed.title ?? (definition ? readText(definition.displayName, strings) : removed.type);
      // Removal is immediate, with Undo in a toast (EDIT-20).
      toast({
        title: strings.widgetRemoved({ title }),
        action: {
          label: strings.undo,
          onPress: () => {
            latestPage.current.edit((document) =>
              updatePage(document, current.id, (target) =>
                target.widgets.some((widget) => widget.id === removed.id)
                  ? target
                  : { ...target, widgets: [...target.widgets, removed] },
              ),
            );
          },
        },
      });
    },
  }));

  // After an edit adds or removes a widget, focus where it should be (EDIT-10, A11Y-05).
  useEffect(() => {
    const id = pendingFocus.current;
    if (id === null) {
      return;
    }
    pendingFocus.current = null;
    if (id === '__add__') {
      addWidgetButton.current?.focus();
      return;
    }
    gridRef.current?.scrollItemIntoView(id);
    gridRef.current?.focusItem(id);
  });

  const undo = () => {
    const result = session ? undoStep(session) : null;
    if (result) {
      setSession(result.session);
      if (
        result.pageId !== pageId &&
        result.session.draft.pages.some((item) => item.id === result.pageId)
      ) {
        setSelection({ ...selection, pageId: result.pageId });
      }
      announce(messages.undone);
    }
  };
  const redo = () => {
    const result = session ? redoStep(session) : null;
    if (result) {
      setSession(result.session);
      if (
        result.pageId !== pageId &&
        result.session.draft.pages.some((item) => item.id === result.pageId)
      ) {
        setSelection({ ...selection, pageId: result.pageId });
      }
      announce(messages.redone);
    }
  };
  // Ctrl or ⌘ with Z undoes; with Shift (or Ctrl+Y off Apple devices) redoes (EDIT-31).
  const latestHistory = useLatest({ undo, redo });
  useEffect(() => {
    if (!isEditing || !root) {
      return;
    }
    const isApple = isApplePlatform();
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }
      if (matchesCommandShortcut(event, { code: 'KeyZ', key: 'Z' }, isApple)) {
        event.preventDefault();
        latestHistory.current.undo();
      } else if (
        matchesCommandShortcut(event, { code: 'KeyZ', key: 'Z', isShift: true }, isApple) ||
        (!isApple && matchesCommandShortcut(event, { code: 'KeyY', key: 'Y' }, isApple))
      ) {
        event.preventDefault();
        latestHistory.current.redo();
      }
    };
    root.addEventListener('keydown', onKeyDown);
    return () => {
      root.removeEventListener('keydown', onKeyDown);
    };
  }, [isEditing, root, latestHistory]);

  // The configure dialog: edits apply to the draft; in view mode they save at once, put back if saving fails (EDIT-25).
  const configuring =
    configuringId === null
      ? undefined
      : page?.widgets.find((widget) => widget.id === configuringId);
  const applyConfiguration = async (instance: WidgetInstance) => {
    if (!page || !dashboard || !collection) {
      return;
    }
    if (isEditing) {
      edit((document) => updatePage(document, page.id, (current) => withWidget(current, instance)));
      return;
    }
    const save = latest.current.onSaveDashboard;
    if (!save) {
      return;
    }
    const previous = savedDocuments;
    const next = updatePage(dashboard, page.id, (current) => withWidget(current, instance));
    setSaved({ library, documents: new Map([...(previous ?? []), [next.id, next]]) });
    try {
      const stored = await save(
        prepareForSave(next, (type) => registry.get(type), gridSettings),
        {
          collectionId: collection.id,
          isNew: false,
        },
      );
      setSaved((current) => ({
        library,
        documents: new Map([...current.documents, [stored.id, stored]]),
      }));
    } catch (error) {
      setSaved({ library, documents: previous ?? new Map() });
      toast.error({
        title: messages.configureSaveFailed,
        description: errorMessageOf(error, messages.genericError),
      });
    }
  };
  const renderPreview = useCallback(
    (instance: WidgetInstance) => (
      <WidgetView
        instance={instance}
        definition={registry.get(instance.type)}
        cell={{ w: instance.layout.w, h: instance.layout.h, width: 560, height: 240, scale: 1 }}
        scope={{ breakpoint: 'full', mode: 'view', scale: 1 }}
        headingLevel={4}
      />
    ),
    [registry],
  );

  const hasLegendWidget =
    page?.widgets.some((widget) => registry.get(widget.type)?.capabilities?.isLegend === true) ??
    false;
  const canConfigure = canEditPage && (isEditing || page?.isLocked !== true);
  const hasTemplates = (templates?.length ?? 0) > 0;
  // Manage is for collections the user can change, never from a locked dashboard (acceptance 15).
  const canManage =
    onApplyCollectionChanges !== undefined &&
    !isLoading &&
    !isEditing &&
    collection !== undefined &&
    dashboard?.isLocked !== true &&
    Object.values(permissions.collection ?? {}).some(Boolean);
  const canChangeGrid =
    permissions.page?.canChangeGridSettings === true && gridSettingsPolicy?.isHidden !== true;
  useEffect(() => {
    if (canConfigure) {
      preloadComponent(WidgetConfigureDialog);
    }
    if (canManage) {
      preloadComponent(ManageDashboardsDialog);
    }
    if (isEditing && canChangeGrid) {
      preloadComponent(PageSettingsDialog);
    }
  }, [canConfigure, canManage, isEditing, canChangeGrid]);
  const canEditLayout = isEditing && canEditPage;
  const pages = dashboard?.pages ?? [];
  const estimatedTabs = pages.reduce(
    (sum, item) => sum + 32 + Math.min(200, item.title.length * 8),
    0,
  );
  const isPageTabs =
    pages.length > 1 && estimatedTabs <= (layout === 'phone' ? width - 16 : width * 0.5);
  const headingId = useId();

  // What the page area shows (§11.5).
  let content: ReactNode;
  if (isLoading) {
    content = (
      <div aria-busy="true" className="flex min-h-0 flex-1 flex-col gap-3 p-3">
        <Skeleton shape="rect" height="2.5rem" />
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
          <Skeleton shape="rect" className="h-full min-h-32" />
          <Skeleton shape="rect" className="h-full min-h-32" />
          <Skeleton shape="rect" className="h-full min-h-32" />
        </div>
      </div>
    );
  } else if (!collection) {
    content = renderEmptyLibrary?.() ?? (
      <EmptyState icon={LayoutGrid} title={messages.noCollections} />
    );
  } else if (!dashboard) {
    content = renderEmptyCollection?.(collection) ?? (
      <EmptyState
        icon={LayoutGrid}
        title={messages.noDashboards}
        action={
          canSave && permissions.collection?.canAddDashboard ? (
            <ButtonGroup>
              <Button
                variant="solid"
                tone="accent"
                icon={Plus}
                onPress={() => {
                  startNewDashboard();
                }}
              >
                {messages.newDashboardAction}
              </Button>
              {hasTemplates && (
                <Button
                  variant="outline"
                  icon={LayoutTemplate}
                  onPress={() => {
                    setTemplatePurpose('dashboard');
                  }}
                >
                  {messages.fromTemplateAction}
                </Button>
              )}
            </ButtonGroup>
          ) : undefined
        }
      />
    );
  } else if (!page || !grid) {
    content = (
      <EmptyState
        icon={LayoutGrid}
        title={messages.noPages}
        action={
          canEditDashboard && permissions.dashboard?.canAddPage ? (
            <Button
              variant="solid"
              tone="accent"
              icon={Plus}
              onPress={() => {
                setMode('edit');
              }}
            >
              {messages.addPageAction}
            </Button>
          ) : undefined
        }
      />
    );
  } else {
    const emptyPage = isEditing ? (
      <EmptyState
        icon={Plus}
        title={messages.addFirstWidget}
        action={
          <Button
            ref={addWidgetButton}
            variant="solid"
            tone="accent"
            icon={Plus}
            onPress={() => {
              setPickerOpen(true);
            }}
          >
            {messages.addWidgetAction}
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={LayoutGrid}
        title={messages.emptyPage}
        action={
          canEditPage ? (
            <Button
              variant="outline"
              onPress={() => {
                setMode('edit');
              }}
            >
              {messages.openEditor}
            </Button>
          ) : undefined
        }
      />
    );
    content = (
      <div
        className="flex min-h-0 flex-1 flex-col"
        onFocus={(event) => {
          const cell = (event.target as Element).closest<HTMLElement>('[data-item-id]');
          if (cell?.dataset.itemId !== undefined) {
            focusedWidget.current = cell.dataset.itemId;
          }
        }}
      >
        <DashboardPageView
          key={page.id}
          page={page}
          grid={grid}
          registry={registry}
          mode={isEditing ? 'edit' : 'view'}
          canConfigure={canConfigure}
          canEditLayout={canEditLayout}
          editPreview={editPreview}
          widgetActions={widgetActions}
          actions={widgetActionsApi}
          onLayoutChange={handlers.onLayoutChange}
          emptyState={emptyPage}
          handleRef={gridRef}
          className="min-h-0 flex-1"
        />
      </div>
    );
  }

  const header = (
    <DashboardHeader
      messages={messages}
      layout={layout}
      library={shownLibrary}
      collection={collection}
      dashboards={dashboards}
      dashboard={dashboard}
      page={page}
      isPageTabs={isPageTabs}
      onNavigate={navigate}
      hasTimeRangePicker={hasTimeRangePicker}
      timeRange={timeRange}
      onTimeRangeChange={handlers.setTimeRange}
      timeRangePresets={timeRangePresets}
      timeZone={timeZone}
      filters={filters}
      filterValues={filterValues}
      onFilterChange={handlers.setFilterValue}
      runtimeContext={runtimeContext}
      isRefreshing={loadingCount > 0}
      refreshIntervalMs={refreshIntervalMs}
      refreshIntervals={intervals}
      onRefreshIntervalChange={setRefreshIntervalMs}
      canEdit={canEditPage && !isLoading}
      canManage={canManage}
      onEditPage={() => {
        setMode('edit');
      }}
      onManage={() => {
        setManageOpen(true);
      }}
      isFullScreen={isFullScreen}
      onFullScreenChange={toggleFullScreen}
      kiosk={isKiosk ? { isPaused: isKioskPaused, onPausedChange: setKioskPaused } : undefined}
      viewActions={viewActions}
      headerStart={headerStart}
      headerEnd={headerEnd}
      isEditing={isEditing}
    />
  );

  const editor = isEditing && page && (
    <>
      <EditToolbar
        messages={messages}
        pageTitle={page.title}
        onPageTitleChange={(title) => {
          edit((document) => updatePage(document, page.id, (current) => ({ ...current, title })));
        }}
        canAddWidget={canEditPage}
        canAddPage={permissions.dashboard?.canAddPage === true}
        canAddDashboard={permissions.collection?.canAddDashboard === true}
        hasTemplates={hasTemplates}
        onAdd={(kind) => {
          if (kind === 'widget') {
            setPickerOpen(true);
          } else if (kind === 'page') {
            addPage();
          } else if (kind === 'pageTemplate') {
            setTemplatePurpose('page');
          } else if (kind === 'dashboardTemplate') {
            setTemplatePurpose('dashboard');
          } else {
            requestNewDashboard();
          }
        }}
        onPageSettings={
          canChangeGrid
            ? () => {
                setSettingsOpen(true);
              }
            : undefined
        }
        canUndo={session.past.length > 0}
        canRedo={session.future.length > 0}
        onUndo={undo}
        onRedo={redo}
        onRevert={() => {
          setConfirming('revert');
        }}
        onClearPage={() => {
          setConfirming('clear');
        }}
        isDirty={isDirty}
        isSaving={isSaving}
        canSave={canSave}
        onSave={requestSave}
        onDone={() => {
          if (isDirty) {
            setDoneOpen(true);
          } else {
            endSession();
          }
        }}
        editActions={editActions}
      />
      {hasNotice && (
        <Banner tone="warning" className="mx-3 mt-2">
          {notice}
        </Banner>
      )}
      {saveError !== null && (
        <Banner
          tone="danger"
          title={messages.saveFailed}
          className="mx-3 mt-2"
          actions={
            <Button
              size="sm"
              variant="outline"
              onPress={() => {
                void performSave();
              }}
            >
              {messages.retry}
            </Button>
          }
        >
          {errorMessageOf(saveError, messages.genericError)}
        </Banner>
      )}
    </>
  );

  // The page tabs sit in their own row, at the same place in every layout, so they never remount (NAV-03).
  const body = (
    <>
      {header}
      {isPageTabs && (
        <TabList aria-label={messages.pageSelector} className="min-w-0 px-3">
          {pages.map((item) => (
            <Tab key={item.id} id={item.id}>
              {item.title}
            </Tab>
          ))}
        </TabList>
      )}
      {editor}
      {isPageTabs && page ? (
        <TabPanel id={page.id} className="flex min-h-0 flex-1 flex-col outline-none">
          {content}
        </TabPanel>
      ) : (
        content
      )}
    </>
  );

  return (
    <section
      ref={rootRef}
      aria-labelledby={headingId}
      data-editing={isEditing || undefined}
      // Dynamic geometry: the height the dashboard fills (GRID-10).
      // eslint-disable-next-line no-restricted-syntax -- see above.
      style={{ height: isOverlay ? undefined : (height ?? fillHeight) }}
      className={cn(
        'flex min-h-0 min-w-0 flex-col bg-surface-1 text-fg',
        // Editing marks the dashboard's area (EDIT-04).
        isEditing && 'outline-2 -outline-offset-2 outline-accent-solid',
        // Full screen covers the page, inside the safe area (RESP-19).
        isOverlay &&
          'fixed inset-0 z-overlay h-dvh pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]',
        className,
      )}
    >
      <h2 id={headingId} className="sr-only">
        {dashboard
          ? `${dashboard.title}${page ? ` / ${page.title}` : ''}`
          : messages.dashboardHeader}
      </h2>
      <DashboardContextProvider
        timeRange={timeRange}
        timeZone={timeZone}
        onTimeRangeChange={handlers.setTimeRange}
        filterValues={filterValues}
        onFilterValueChange={handlers.setFilterValue}
        dataSources={sources}
        dataShapes={shapes}
        context={runtimeContext}
        maxConcurrentLoads={maxConcurrentLoads}
        onWidgetError={onWidgetError}
        formatError={formatError}
        hasLegendWidget={hasLegendWidget}
        hiddenLegendKeys={hiddenLegendKeys}
        onHiddenLegendKeysChange={handlers.setHiddenLegendKeys}
        widgetState={widgetState}
        onWidgetStateChange={onWidgetStateChange}
        refreshIntervalMs={refreshIntervalMs}
        isAutoRefreshPaused={isEditing}
        minRefreshIntervalMs={minRefreshIntervalMs}
        onRefresh={handlers.onProviderRefresh}
        onLoadReport={handlers.onLoadReport}
        mapStyles={mapStyles}
        widgetTypes={registry}
      >
        {isPageTabs && page ? (
          <Tabs
            selectedKey={page.id}
            onSelectionChange={(key) => {
              navigate({ pageId: String(key) });
            }}
            className="min-h-0 flex-1"
          >
            {body}
          </Tabs>
        ) : (
          body
        )}
        {configuring && (
          <WidgetConfigureDialog
            instance={configuring}
            widgetTypes={registry}
            dataSources={sources}
            isOpen
            onOpenChange={(isOpen) => {
              if (!isOpen) {
                setConfiguringId(null);
              }
            }}
            onApply={applyConfiguration}
            canLockWidgets={permissions.page?.canLockWidgets === true}
            runtimeContext={runtimeContext}
            timeZone={timeZone}
            timeRangePresets={timeRangePresets}
            renderPreview={renderPreview}
          />
        )}
      </DashboardContextProvider>
      <WidgetPicker
        types={registry.types}
        isOpen={isPickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={addWidget}
        onTypeDragStart={(type, point) => {
          typeDrag.startDrag(
            {
              value: type,
              label: readText(type.displayName, messages),
              icon: type.icon,
              size: type.defaultSize,
            },
            point,
          );
        }}
      />
      {typeDrag.ghost}
      {hasTemplates && (
        <TemplatePicker
          templates={templates ?? []}
          purpose={templatePurpose ?? 'page'}
          isOpen={templatePurpose !== null}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setTemplatePurpose(null);
            }
          }}
          onSelect={(template) => {
            void chooseTemplate(template);
          }}
        />
      )}
      {collection && onApplyCollectionChanges && isManageOpen && (
        <ManageDashboardsDialog
          collection={collection}
          isOpen={isManageOpen}
          onOpenChange={setManageOpen}
          onApplyCollectionChanges={onApplyCollectionChanges}
          onApplied={(dashboards) => {
            setSaved((current) => ({
              library,
              documents: current.library === library ? current.documents : new Map(),
              collections: new Map([
                ...((current.library === library ? current.collections : undefined) ?? []),
                [collection.id, dashboards],
              ]),
            }));
            announce(messages.changesApplied);
          }}
          getPermissions={getPermissions}
          templates={templates}
          instantiateTemplate={instantiateTemplate}
          runtimeContext={runtimeContext}
          editNotice={hasNotice ? notice : undefined}
        />
      )}
      {isEditing && page && isSettingsOpen && (
        <PageSettingsDialog
          document={session.draft}
          page={page}
          baseGrid={gridSettings}
          typeOf={registry.get}
          policy={gridSettingsPolicy}
          isOpen={isSettingsOpen}
          onOpenChange={setSettingsOpen}
          onApply={(settings) => {
            edit((document) =>
              withPageSettings(document, page.id, settings, gridSettings, registry.get),
            );
          }}
        />
      )}
      <Dialog
        title={messages.conflictTitle}
        description={messages.conflictBody}
        role="alertdialog"
        isOpen={isConflict}
        onOpenChange={setConflict}
        isBusy={isSaving}
        size="sm"
        footer={(close) => (
          <ButtonGroup>
            <Button variant="outline" onPress={close}>
              {messages.keepEditing}
            </Button>
            <Button variant="outline" tone="danger" onPress={reloadLatest}>
              {messages.reloadLatest}
            </Button>
            <Button
              variant="solid"
              tone="accent"
              isPending={isSaving}
              onPress={() => {
                void performSave(true);
              }}
            >
              {messages.overwrite}
            </Button>
          </ButtonGroup>
        )}
      >
        {null}
      </Dialog>
      <ConfirmDialog
        isOpen={confirming === 'revert'}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setConfirming(null);
          }
        }}
        title={messages.revertTitle}
        body={messages.revertBody}
        tone="danger"
        confirmLabel={messages.revert}
        onConfirm={() => {
          setSession((current) =>
            current ? startSession(current.collectionId, current.baseline, current.isNew) : current,
          );
          setConfirming(null);
        }}
      />
      <ConfirmDialog
        isOpen={confirming === 'clear'}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setConfirming(null);
          }
        }}
        title={messages.clearPageTitle({ title: page?.title ?? '' })}
        body={messages.clearPageBody}
        tone="danger"
        confirmLabel={messages.clearPage}
        onConfirm={() => {
          edit((document) =>
            updatePage(document, pageId, (current) => ({ ...current, widgets: [] })),
          );
          setConfirming(null);
        }}
      />
      <ConfirmDialog
        isOpen={confirming === 'save'}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setConfirming(null);
          }
        }}
        title={messages.saveSharedTitle}
        body={hasNotice ? notice : undefined}
        confirmLabel={messages.save}
        onConfirm={async () => {
          setConfirming(null);
          await performSave();
        }}
      />
      <Dialog
        title={messages.doneTitle}
        description={messages.doneBody}
        role="alertdialog"
        isOpen={isDoneOpen}
        onOpenChange={setDoneOpen}
        isBusy={isSaving}
        size="sm"
        footer={(close) => (
          <ButtonGroup>
            <Button variant="outline" onPress={close}>
              {messages.keepEditing}
            </Button>
            <Button
              variant="outline"
              tone="danger"
              onPress={() => {
                close();
                endSession();
              }}
            >
              {messages.discardAndExit}
            </Button>
            <Button
              variant="solid"
              tone="accent"
              isPending={isSaving}
              onPress={() => {
                void performSave().then((isSaved) => {
                  if (isSaved) {
                    close();
                    endSession();
                  }
                });
              }}
            >
              {messages.saveAndExit}
            </Button>
          </ButtonGroup>
        )}
      >
        {hasNotice ? notice : null}
      </Dialog>
      <Dialog
        title={messages.leaveTitle}
        description={messages.doneBody}
        role="alertdialog"
        isOpen={leaving !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setLeaving(null);
          }
        }}
        isBusy={isSaving}
        size="sm"
        footer={(close) => {
          const proceed = () => {
            const target = leaving;
            close();
            setLeaving(null);
            endSession();
            if (target && 'newDashboard' in target) {
              startNewDashboard(target.newDashboard ?? undefined);
            } else if (target) {
              setSelection(
                resolveSelection(library, { ...selection, ...target }, locale).selection,
              );
            }
          };
          return (
            <ButtonGroup>
              <Button variant="outline" onPress={close}>
                {messages.keepEditing}
              </Button>
              <Button variant="outline" tone="danger" onPress={proceed}>
                {messages.discardAndContinue}
              </Button>
              <Button
                variant="solid"
                tone="accent"
                isPending={isSaving}
                onPress={() => {
                  void performSave().then((isSaved) => {
                    if (isSaved) {
                      proceed();
                    }
                  });
                }}
              >
                {messages.saveAndContinue}
              </Button>
            </ButtonGroup>
          );
        }}
      >
        {null}
      </Dialog>
      <LiveRegion ref={announcerRef} />
    </section>
  );
}
