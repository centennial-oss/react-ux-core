// Public API for @centennial-oss/react-ux-core/dashboard: the dashboard grid, widget frames and runtime, the widget
// and data source definitions, the layout engine and the built-in widget types that need no optional peers. Widget
// types for charts, tables and maps live in /dashboard/chart, /dashboard/table and /dashboard/map, so their peers stay
// optional (ARCH-04).

export * from './Dashboard';
export * from './DashboardGrid';
export * from './WidgetFrame';
export * from './DashboardWidget';
export * from './ManageDashboardsDialog';
export * from './PageSettingsDialog';
export {
  createWidgetRegistry,
  defineDataSource,
  defineWidget,
  widgetFromComponent,
  type ComponentWidgetConfig,
  type WidgetPropsEnv,
  type WidgetRegistry,
} from './widgets/define';
export { statGroupWidget, type StatGroupOptions } from './widgets/statGroup';
export { legendWidget, type LegendWidgetOptions } from './widgets/legendWidget';
export {
  createTextWidget,
  textWidget,
  type TextBodyRenderer,
  type TextWidgetOptions,
} from './widgets/textWidget';
export { rotatorChildren, rotatorWidget, type RotatorWidgetOptions } from './widgets/rotatorWidget';
export {
  createDashboard,
  createPage,
  createWidgetInstance,
  DASHBOARD_SCHEMA_VERSION,
  duplicateDashboard,
  duplicatePage,
  duplicateWidget,
  isConflictError,
  migrateDashboard,
  newId,
  parseDashboard,
  prepareForSave,
  type DashboardParseIssue,
  type DashboardParseResult,
} from './document/document';
export { effectivePermissions, READ_ONLY as READ_ONLY_PERMISSIONS } from './document/permissions';
export { instantiatePage, pageFromTemplate, type InstantiateTemplate } from './document/templates';
export { useDashboardContext } from './context/DashboardContexts';
export { useWidgetData, type UseWidgetDataOptions, type WidgetData } from './data/useWidgetData';
export {
  builtInDataShapes,
  categoricalShape,
  defineDataShape,
  gaugeShape,
  geoShape,
  latestStats,
  statsShape,
  tableShape,
  timeSeriesShape,
  timeSeriesToTable,
  type CategoricalData,
  type GaugeData,
  type GeoData,
  type GeoMarker,
  type StatItem,
  type StatsData,
  type StatTileData,
  type TableData,
  type TimeSeriesData,
  type TimeSeriesToTableOptions,
} from './data/shapes';
export {
  autoPlace,
  compactLayout,
  deriveLayout,
  moveItem,
  normalizeLayout,
  placeItem,
  readingOrder,
  rescaleLayout,
  resizeItem,
  type Compaction,
  type GridRect,
  type LayoutDraft,
  type LayoutEntry,
  type LayoutOptions,
  type ResizeAnchor,
  type SizeLimits,
} from './layout/engine';
export {
  DEFAULT_BREAKPOINTS,
  DEFAULT_GRID_SPEC,
  mergeGridSpec,
  resolveGridMetrics,
  type GridBreakpoint,
  type GridDensity,
  type GridMetrics,
  type GridSpec,
  type GridSpecIssue,
  type GridViewport,
  type RowSizing,
} from './layout/metrics';
export {
  defaultDashboardMessages,
  type DashboardMessages,
  type DashboardStrings,
} from './messages';
export type * from './types';
