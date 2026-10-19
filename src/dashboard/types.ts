// The dashboard's public types: the stored document (§4), widget types (§7), data sources and shapes (§8), the
// dashboard context (§9) and permissions (§15). Everything a document holds is plain JSON; functions live only on
// definitions the host registers in code.

import type { ComponentType, ReactNode } from 'react';
import type { ResolvedTimeRange, TimeRange } from '../components/TimeRangePicker/resolveTimeRange';
import type { IconComponent } from '../utils/icon';
import type { GridSpec } from './layout/metrics';
import type { DashboardStrings } from './messages';

/** An id: unique within its parent collection (MOD-01). */
export type Id = string;

/** Any JSON value. */
export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/** A JSON object. */
export type JsonObject = Record<string, JsonValue>;

/** A widget's place and size, in grid units (`x` and `y` from zero). */
export interface LayoutItem {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A widget's stored layout: without `x` and `y`, it's auto-placed (GRID-06). */
export type WidgetLayout = Partial<Pick<LayoutItem, 'x' | 'y'>> & Pick<LayoutItem, 'w' | 'h'>;

/** A breakpoint id: `stack`, `half` and `full` by default (§6.1). */
export type BreakpointId = string;

/** Text a host may give as a string or read from the dashboard's messages (for localized built-ins). */
export type MessageRef = (messages: DashboardStrings) => string;

/** A string, or a message to read. */
export type LocalizedText = string | MessageRef;

/** Everything the dashboard can show: one or more collections. */
export interface DashboardLibrary {
  collections: DashboardCollection[];
}

/** A named group of dashboards with shared permissions, such as "Personal" or "Shared". */
export interface DashboardCollection {
  id: Id;
  name: string;
  dashboards: DashboardDocument[];
  /** Supplied by the host at run time and never saved (MOD-08). Without any, the collection is read-only. */
  permissions?: Partial<DashboardPermissions>;
  /** Shown while editing anything in this collection (PERM-03). Never saved. */
  editNotice?: string;
}

/** A titled, ordered set of pages: the unit of persistence. */
export interface DashboardDocument {
  schemaVersion: 1;
  /** Stable; the host may replace a client-made id on first save. */
  id: Id;
  title: string;
  /** Sort key within the collection. */
  order?: number;
  pages: DashboardPage[];
  /** Overrides the component's grid settings (§5.1). */
  grid?: Partial<GridSpec>;
  defaultTimeRange?: TimeRange;
  defaultFilterValues?: Record<string, JsonValue>;
  /** Locked dashboards can't be edited (§15). */
  isLocked?: boolean;
  /** An opaque concurrency token, round-tripped to the host (§14.5). */
  revision?: string;
  /** Owned by the host and round-tripped untouched. */
  meta?: JsonObject;
}

/** One screen of widgets on a grid. */
export interface DashboardPage {
  id: Id;
  title: string;
  isLocked?: boolean;
  /** Overrides the dashboard's grid settings for this page. */
  grid?: Partial<GridSpec>;
  widgets: WidgetInstance[];
  /** Reserved for per-breakpoint layouts (Q2); round-tripped, not used. */
  layoutOverrides?: Partial<Record<BreakpointId, LayoutItem[]>>;
  meta?: JsonObject;
}

/** Which data source a widget shows, and its serializable parameters. */
export interface DataBinding {
  sourceId: string;
  params?: JsonObject;
}

/** A widget's time range: the dashboard's (`inherit`, the default) or its own fixed range (CTX-03). */
export type WidgetTimeSetting = { mode: 'inherit' } | { mode: 'override'; range: TimeRange };

/** One placed widget: serializable, apart from a code-defined inline `load`. */
export interface WidgetInstance {
  id: Id;
  /** The widget type id, such as `ccux.timeSeriesChart`. */
  type: string;
  title?: string;
  isTitleHidden?: boolean;
  layout: WidgetLayout;
  /** Can't be moved, resized or removed in edit mode. */
  isLocked?: boolean;
  /** Defaults to true. */
  isResizable?: boolean;
  /** Display options for the widget type. */
  options?: JsonObject;
  /** For option migrations (MOD-06). */
  optionsVersion?: number;
  data?: DataBinding;
  time?: WidgetTimeSetting;
  meta?: JsonObject;
  /**
   * An inline loader for code-defined dashboards that are never saved, in place of `data` (DATA-06). A widget with
   * one can't be saved: saving warns in development.
   */
  load?: (request: DataRequest<JsonObject>) => Promise<unknown>;
}

/** The result of checking options or parameters. */
export interface ValidationResult {
  isValid: boolean;
  issues?: { path?: string; message: string }[];
}

/** A field of a generated options form (WID-05), named like ConfigForm's fields. */
export type OptionsField<T> = {
  /** The option it edits. */
  name: Extract<keyof T, string>;
  label: LocalizedText;
  description?: LocalizedText;
  isRequired?: boolean;
} & (
  | { type: 'text'; placeholder?: string }
  | { type: 'textarea'; placeholder?: string; minRows?: number; maxRows?: number }
  | { type: 'number'; minValue?: number; maxValue?: number; step?: number }
  | { type: 'switch' }
  | { type: 'select' | 'pillbox'; items: readonly { id: string | number; label: LocalizedText }[] }
  | { type: 'color' }
  | { type: 'timeRange' }
);

/** A declarative options form: enough for simple widget types to need no hand-written editor (WID-05). */
export type OptionsSchema<T> = readonly OptionsField<T>[];

/** What a widget type's options editor (the configure dialog's Display tab) receives. */
export interface WidgetOptionsEditorProps<TOptions extends JsonObject> {
  /** The options being edited. */
  value: TOptions;
  onChange: (value: TOptions) => void;
  /** Reports whether the options are complete and valid; Apply waits for valid ones (EDIT-24). */
  onValidityChange: (isValid: boolean) => void;
  /** The widget being configured, as stored. */
  instance: Readonly<WidgetInstance>;
  messages: DashboardStrings;
}

/** What a data source's parameters editor (the configure dialog's Data tab) receives (DATA-15). */
export interface DataParamsEditorProps<TParams extends JsonObject> {
  /** The parameters being edited. */
  value: TParams;
  /** Editors write nothing but the parameters (DATA-17). */
  onChange: (value: TParams) => void;
  /** Reports whether the parameters are complete and valid; Apply waits for valid ones (EDIT-24). */
  onValidityChange: (isValid: boolean) => void;
  /** The host's runtime context (CTX-16). */
  runtimeContext: unknown;
  /** The widget type the parameters are for. */
  widgetType: string;
}

/** An item in a widget's action menu (WID-08). */
export interface WidgetAction {
  id: string;
  label: string;
  icon?: IconComponent;
  onAction: () => void;
  isDisabled?: boolean;
  tone?: 'neutral' | 'danger';
}

/** A widget's size (§7.5): grid units at the active breakpoint, content pixels, a size class and the scale. */
export interface WidgetSize {
  w: number;
  h: number;
  width: number;
  height: number;
  /** `compact` below the type's `minPixelSize` (RESP-13), `large` for big frames, else `regular`. */
  sizeClass: 'compact' | 'regular' | 'large';
  /** The dashboard's content scale (RESP-08). */
  scale: number;
}

/** What a widget's data is doing (§8.5). */
export type WidgetDataState<TData> =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'success';
      data: TData;
      updatedAt: Date;
      isRefreshing: boolean;
      isEmpty: boolean;
      /** The time range the data was loaded for, for widgets that show it (BI-01). */
      timeRange?: ResolvedTimeRange;
    }
  | { status: 'error'; error: unknown; staleData?: TData; retry: () => void };

/** A dashboard's mode. */
export type DashboardMode = 'view' | 'edit';

/** A consolidated legend entry, published by a chart (CTX-11). */
export interface DashboardLegendEntry {
  /** Merges entries across widgets. Defaults to label, colour, kind and line style. */
  key: string;
  label: string;
  /** A resolved CSS colour. */
  color: string;
  kind: 'line' | 'bar' | 'area' | 'point';
  lineStyle?: 'solid' | 'dashed' | 'dotted' | 'dashDot';
  widgetId: string;
}

/** Shared page state for widgets (CTX-15). */
export interface DashboardContextApi {
  /** The effective dashboard time range, and its instants as last resolved. */
  timeRange: TimeRange | undefined;
  resolvedTimeRange: ResolvedTimeRange | undefined;
  timeZone: string;
  filterValues: Readonly<Record<string, JsonValue>>;
  hiddenLegendKeys: ReadonlySet<string>;
  highlightedLegendKey: string | null;
  /** The legend entries published on the page, de-duplicated by key. */
  legendEntries: readonly DashboardLegendEntry[];
  /** Whether the page has a consolidated legend widget (CTX-13). */
  hasLegendWidget: boolean;
  breakpoint: BreakpointId;
  mode: DashboardMode;
  scale: number;
  setTimeRange: (range: TimeRange) => void;
  setFilterValue: (filterId: string, value: JsonValue) => void;
  toggleLegendKey: (key: string) => void;
  setHighlightedLegendKey: (key: string | null) => void;
  requestRefresh: (widgetId?: string) => void;
}

/**
 * What a widget type's component receives (§7.5). Named apart from props other components use for other things:
 * `displayOptions` (not a list of choices), `dataState` (not plotted data), `frameSize` (not a size token) and
 * `dashboard` (the context API).
 */
export interface WidgetRenderProps<TOptions, TData> {
  /** The widget as stored. */
  instance: Readonly<WidgetInstance>;
  /** The widget's options: migrated, with the type's defaults applied. */
  displayOptions: TOptions;
  /** The widget's data and what loading it is doing (§8.5). */
  dataState: WidgetDataState<TData>;
  /** The widget's size, kept current without the widget measuring itself (WID-14). */
  frameSize: WidgetSize;
  mode: DashboardMode;
  /** The dashboard context: time range, filters, legend and the actions widgets may take (CTX-15). */
  dashboard: DashboardContextApi;
  /** Contributes items to the widget's single action menu (WID-08). Pass a stable list. */
  setActions: (actions: readonly WidgetAction[]) => void;
  /** Publishes the widget's legend entries to the page (CTX-11); only for types that `canPublishLegend`. */
  setLegendEntries: (entries: readonly Omit<DashboardLegendEntry, 'widgetId'>[]) => void;
  /** The widget's interactive state (a table's sort): session-only unless the host keeps it (Q3). */
  widgetState: JsonObject | undefined;
  setWidgetState: (state: JsonObject) => void;
  messages: DashboardStrings;
  /** With `hasOwnStates`, the states to draw (WID-12); the frame draws none of its own. */
  isLoading?: boolean;
  isRefreshing?: boolean;
  error?: ReactNode;
  onRetry?: () => void;
  emptyState?: ReactNode;
}

/** Where a widget type can sit in the picker, and what it can do. */
export interface WidgetCapabilities {
  /** Shows the time setting in the configure dialog (CTX-03). */
  canUseTimeRange?: boolean;
  /** Publishes legend entries to the consolidated legend (CTX-11). */
  canPublishLegend?: boolean;
  /** Is a consolidated legend (§10.5). */
  isLegend?: boolean;
  /** May set dashboard filters (CTX-10). */
  canSetFilters?: boolean;
  /** Hosts child widgets (§10.7). */
  isContainer?: boolean;
}

/** A registered widget type (§7.1). */
export interface WidgetTypeDefinition<TOptions extends JsonObject = JsonObject, TData = unknown> {
  /** Globally unique and namespaced: `ccux.statGroup`, `acme.ticketList`. */
  type: string;
  /** Shown in the picker. */
  displayName: LocalizedText;
  description?: LocalizedText;
  icon?: IconComponent;
  /** Groups types in the picker. */
  category?: LocalizedText;
  /** The data shape it shows, or null for types without data (legend, text). */
  dataShape: string | null;
  /** Other data shapes it can show by converting them, such as a table from time series (§10.3). */
  alsoAccepts?: readonly string[];
  /** Defaults to true when `dataShape` isn't null. */
  isDataRequired?: boolean;
  defaultSize: { w: number; h: number };
  minSize?: { w: number; h: number };
  maxSize?: { w: number; h: number };
  /** Below this the component should draw its compact variant (RESP-13). */
  minPixelSize?: { width: number; height: number };
  /** Rows when stacked on phones, or `content` for its natural height (RESP-14). */
  stackedHeight?: number | 'content';
  defaultOptions: TOptions;
  optionsVersion?: number;
  /** Migrates options stored at an older `optionsVersion` (MOD-06). */
  migrateOptions?: (stored: JsonObject, fromVersion: number) => TOptions;
  validateOptions?: (options: TOptions) => ValidationResult;
  /** Generates the Display tab when there's no `optionsEditor` (WID-05). */
  optionsSchema?: OptionsSchema<TOptions>;
  component: ComponentType<WidgetRenderProps<TOptions, TData>>;
  optionsEditor?: ComponentType<WidgetOptionsEditorProps<TOptions>>;
  /** The component draws its own loading, error and empty states (WID-12). */
  hasOwnStates?: boolean;
  capabilities?: WidgetCapabilities;
}

/** A data shape: a named contract with a runtime guard and an emptiness test (§8.8). */
export interface DataShapeDefinition<TData = unknown> {
  id: string;
  guard: (value: unknown) => value is TData;
  isEmpty: (data: TData) => boolean;
}

/** Why a load runs. */
export type DataRequestReason =
  'initial' | 'paramsChanged' | 'contextChanged' | 'manualRefresh' | 'autoRefresh' | 'retry';

/** What a loader receives (§8.3). */
export interface DataRequest<TParams> {
  params: TParams;
  widget: { id: string; type: string; options: Readonly<JsonObject> };
  /** The effective range, resolved at request time in the dashboard's time zone (CTX-03). */
  timeRange?: { range: TimeRange; resolved: ResolvedTimeRange; timeZone: string };
  /** Only the filters the source depends on. */
  filters: Readonly<Record<string, JsonValue>>;
  signal: AbortSignal;
  reason: DataRequestReason;
  /** The host's runtime context (CTX-16), passed through untouched. */
  context: unknown;
}

/** What a data source's loads depend on (§8.2). */
export interface DataDependencies {
  /** Reloads when the effective time range changes. Defaults to true. */
  hasTimeRange?: boolean;
  /** The filters it reads. Defaults to `all`. */
  filters?: readonly string[] | 'all' | 'none';
}

interface DataSourceBase<TParams extends JsonObject, TData> {
  /** Referenced by `DataBinding.sourceId`. */
  id: string;
  /** Shown in the configure dialog. */
  label: LocalizedText;
  description?: LocalizedText;
  /** The data shape it produces: only widget types of that shape can use it. */
  produces: string;
  defaultParams?: TParams;
  validateParams?: (params: TParams) => ValidationResult;
  /** A host-built parameters editor (DATA-15). */
  paramsEditor?: ComponentType<DataParamsEditorProps<TParams>>;
  /** Generates the parameters form when there's no `paramsEditor` (DATA-16). */
  paramsSchema?: OptionsSchema<TParams>;
  dependsOn?: DataDependencies;
  /** Overrides the dashboard's auto-refresh for widgets of this source (never below the minimum). */
  refreshIntervalMs?: number;
  /** Push updates: started after the first successful load, stopped when the request changes (DATA-12). */
  subscribe?: (request: DataRequest<TParams>, emit: (data: TData) => void) => () => void;
}

/** Either one `load`, or `fetch` plus a pure `transform` (DATA-02, DATA-04). */
export type DataSourceLoader<TParams, TData, TRaw> =
  | { load: (request: DataRequest<TParams>) => Promise<TData>; fetch?: never; transform?: never }
  | {
      load?: never;
      fetch: (request: DataRequest<TParams>) => Promise<TRaw>;
      transform: (raw: TRaw, request: DataRequest<TParams>) => TData;
    };

/** A host-registered data source (§8.2). */
export type DataSourceDefinition<
  TParams extends JsonObject = JsonObject,
  TData = unknown,
  TRaw = TData,
> = DataSourceBase<TParams, TData> & DataSourceLoader<TParams, TData, TRaw>;

/** Any data source, for lists of them. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- lists hold sources of every parameter and data type.
export type AnyDataSource = DataSourceDefinition<any, any, any>;

/** Any widget type, for lists of them. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- lists hold types of every options and data type.
export type AnyWidgetType = WidgetTypeDefinition<any, any>;

/** A map style the host offers (§10.4): style URLs and keys are the host's business. */
export interface MapStyleOption {
  id: string;
  label: string;
  /** A MapLibre style URL, or the style object. */
  styleUrl: string | object;
}

/** What the user may do (§15). */
export interface DashboardPermissions {
  /** Enter edit mode and configure widgets. */
  canEdit: boolean;
  canAddDashboard: boolean;
  canDeleteDashboard: boolean;
  canAddPage: boolean;
  canDeletePage: boolean;
  canReorder: boolean;
  canChangeGridSettings: boolean;
  canLockWidgets: boolean;
}

/** What a permission check is about. */
export type PermissionTarget =
  | { kind: 'collection'; collection: DashboardCollection }
  | { kind: 'dashboard'; collection: DashboardCollection; dashboard: DashboardDocument }
  | {
      kind: 'page';
      collection: DashboardCollection;
      dashboard: DashboardDocument;
      page: DashboardPage;
    };

/** A ready-made page the host offers when a dashboard is created or a page added (NAV-12). */
export interface PageTemplate {
  id: string;
  name: LocalizedText;
  description?: LocalizedText;
  icon?: IconComponent;
  /** The page's widgets. Positions may be left out (auto-placed) and data bindings empty or partial. */
  widgets: WidgetInstance[];
  /** Grid settings for the page. */
  grid?: Partial<GridSpec>;
}

/** What Manage dashboards' Apply sends: one change set for the collection (MGMT-04). */
export interface CollectionChangeSet {
  collectionId: string;
  /** New dashboards, with client-made ids. */
  created: DashboardDocument[];
  /** Full documents whose title, pages or order changed, and only those (MGMT-05). */
  updated: DashboardDocument[];
  /** Deleted dashboards' ids. */
  deleted: string[];
  /** The final order of the collection's dashboard ids. */
  order: string[];
}

/** What applying a change set resolved with: nothing on success, or the dashboards that failed (MGMT-06). */
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- the host's callback may resolve with nothing.
export type CollectionChangeResult = void | { failed: { id: string; error: unknown }[] };

/** The page settings fields a host can lock (EDIT-26); `scope` is where the settings are stored. */
export type GridSettingsField =
  'columns' | 'rowSizing' | 'rowsPerScreen' | 'rowHeight' | 'density' | 'compaction' | 'scope';

/** How the host limits Page settings (EDIT-26). */
export interface GridSettingsPolicy {
  /** Hides Page settings altogether. */
  isHidden?: boolean;
  /** Fields shown but not editable. */
  lockedFields?: readonly GridSettingsField[];
  /** The column counts offered before Custom. Defaults to 6, 12, 16 and 24. */
  columnPresets?: readonly number[];
}
