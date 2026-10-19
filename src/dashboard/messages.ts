// English defaults of `/dashboard`'s strings (see `Messages` in provider/messages.ts). Every user-facing string the
// dashboard shows, announces or generates (default titles, confirmations, empty states) is here, overridable through
// `UIProvider`'s `messages` (I18N-01). Strings that take values are functions with named parameters.

import { timeRangeStrings, type CommonMessages } from '../provider/coreStrings';
import { useEntryMessages } from '../provider/context';

/** Strings for the dashboard: the grid, widget frames, built-in widgets and the shell. */
export interface DashboardMessages {
  // The grid
  /** Names a dashboard page's grid region (A11Y-02). */
  dashboardPage: (values: { title: string }) => string;
  /** Names a widget's drag handle: its title, type, position and size (EDIT-32). */
  widgetHandle: (values: {
    title: string;
    /** The widget type's name, when the grid knows it. */
    type?: string;
    column: number;
    row: number;
    width: number;
    height: number;
  }) => string;
  /** Describes the handle: how to start moving with the keyboard. */
  widgetHandleHint: string;
  /** Read when keyboard manipulation starts. */
  widgetManipulating: (values: { title: string }) => string;
  /** Announced after each keyboard or drag step that moves a widget. */
  widgetMovedTo: (values: { title: string; column: number; row: number }) => string;
  /** Announced after each step that resizes a widget. */
  widgetResizedTo: (values: { title: string; width: number; height: number }) => string;
  /** Announced when a move or resize is committed. */
  widgetPlaced: (values: {
    title: string;
    column: number;
    row: number;
    width: number;
    height: number;
  }) => string;
  /** Announced when a move or resize is cancelled. */
  widgetMoveCancelled: (values: { title: string }) => string;
  /** A widget's size in grid units, as on its size badge ("6 × 4"). */
  widgetSize: (values: { width: number; height: number }) => string;
  /** Edit mode at a narrow breakpoint, where widgets can't be moved or resized (RESP-06). */
  arrangeOnWiderScreen: string;
  /** The Move/Resize dialog's title (EDIT-18). */
  moveResizeTitle: (values: { title: string }) => string;
  gridColumn: string;
  gridRow: string;
  gridWidth: string;
  gridHeight: string;
  /** A number field outside its range. */
  numberOutOfRange: (values: { min: number; max: number }) => string;
  apply: string;

  // Widget frames
  /** The action menu's trigger. */
  widgetActions: (values: { title: string }) => string;
  refresh: string;
  configure: string;
  expand: string;
  /** Closes an expanded widget. */
  collapse: string;
  duplicate: string;
  /** Opens the Move/Resize dialog. */
  moveResize: string;
  /** Shown while a widget reloads with its data still in view (WID-09). */
  refreshing: string;
  /** When the data last arrived ("Updated 5 minutes ago"). */
  updatedAt: (values: { time: string }) => string;
  /** Marks a locked widget (EDIT-21). */
  locked: string;
  /** Marks a widget whose options or data are incomplete (WID-10). */
  needsSetup: string;
  /** A widget that isn't set up yet (§7.4). */
  unconfiguredTitle: string;
  unconfiguredEditorHint: string;
  unconfiguredViewerHint: string;
  /** A widget's data failed to load. */
  widgetLoadFailed: string;
  /** A refresh failed and the earlier data is still shown (DATA-09). */
  widgetRefreshFailed: string;
  /** A widget's render failed (WID-13). */
  widgetCrashed: string;
  widgetCrashedHint: string;
  reloadWidget: string;
  /** A widget whose type isn't registered (WID-19). */
  unknownWidgetType: (values: { type: string }) => string;
  unknownWidgetTypeHint: string;
  /** A loader returned data that doesn't match the widget's shape (DATA-14, development only). */
  dataShapeMismatch: (values: { shape: string }) => string;
  /** A widget with its own time range (CTX-06). */
  widgetOwnTimeRange: (values: { range: string }) => string;

  // Built-in widget types
  widgetCategoryCharts: string;
  widgetCategoryFigures: string;
  widgetCategoryTables: string;
  widgetCategoryMaps: string;
  widgetCategoryLayout: string;
  timeSeriesWidget: string;
  timeSeriesWidgetDescription: string;
  statGroupWidget: string;
  statGroupWidgetDescription: string;
  tableWidget: string;
  tableWidgetDescription: string;
  /** Names a table widget's table and scroll area, apart from its frame (landmark names stay unique). */
  tableWidgetData: (values: { title: string }) => string;
  /** The time column of a table made from time series. */
  tableTime: string;
  /** The series column of a table made from time series, one row per series. */
  tableSeries: string;
  /** A stat tile's place among its variants ("2 of 5", BI-04). */
  statVariantPosition: (values: { position: number; total: number }) => string;
  /** Ends a rotating stat tile's name, after what it shows: what pressing it does (BI-04). */
  statShowNext: string;
  /** Shown for a missing figure, unless the widget's options say otherwise. */
  statMissingValue: string;
  /** A tile footer's sources ("From Meter A, Meter B"). */
  statSources: (values: { sources: string }) => string;

  // Options
  optionLegend: string;
  optionLegendAuto: string;
  optionLegendShow: string;
  optionLegendHide: string;
  optionLegendValues: string;
  optionZoomable: string;
  optionZoomBehavior: string;
  optionZoomDashboard: string;
  optionZoomLocal: string;
  optionStack: string;
  optionStackNone: string;
  optionStackNormal: string;
  optionStackPercent: string;
  optionValueScale: string;
  optionScaleLinear: string;
  optionScaleLog: string;
  optionLeftAxis: string;
  optionRightAxis: string;
  optionFractionDigits: string;
  optionPlaceholder: string;
  optionSparkline: string;
  optionRotation: string;
  optionTileColumns: string;
  optionTileColumnsAuto: string;
  optionDensity: string;
  optionDensityRegular: string;
  optionDensityCompact: string;
  optionFromSeries: string;
  optionRowPerTime: string;
  optionRowPerSeries: string;

  // The shell (§11, §12)
  /** Names the dashboard's header. */
  dashboardHeader: string;
  /** Names the collection switcher (NAV-01). */
  collectionSwitcher: string;
  /** Names the dashboard selector (NAV-02). */
  dashboardSelector: string;
  /** Names the page tabs or selector (NAV-03). */
  pageSelector: string;
  /** The phone navigation button: the current dashboard and page (NAV-05). */
  navigationButton: (values: { dashboard: string; page: string }) => string;
  /** The navigation drawer's title. */
  navigationTitle: string;
  /** The phone filters button, with the number of filters set (NAV-05). */
  filtersButton: (values: { count: number }) => string;
  /** The filters sheet's title. */
  filtersTitle: string;
  timeRange: string;
  /** A filter's "no filter" option (CTX-08). */
  allOption: string;
  refreshDashboard: string;
  autoRefresh: string;
  autoRefreshOff: string;
  edit: string;
  editPage: string;
  manageDashboards: string;
  fullScreen: string;
  exitFullScreen: string;
  moreDashboardActions: string;
  /** Marks the dashboard as being edited (EDIT-04). */
  editing: string;
  pageTitle: string;
  pageTitleRequired: string;
  add: string;
  addWidget: string;
  addPage: string;
  addDashboard: string;
  undo: string;
  redo: string;
  clearPage: string;
  done: string;
  moreEditActions: string;
  /** Names the edit toolbar. */
  editToolbar: string;
  /** Page settings (§12.8). */
  pageSettings: string;
  saving: string;
  saveFailed: string;
  revertTitle: string;
  revertBody: string;
  clearPageTitle: (values: { title: string }) => string;
  clearPageBody: string;
  doneTitle: string;
  doneBody: string;
  keepEditing: string;
  saveAndExit: string;
  discardAndExit: string;
  leaveTitle: string;
  saveAndContinue: string;
  discardAndContinue: string;
  saveSharedTitle: string;
  /** A toast after a widget is removed, with Undo (EDIT-20). */
  widgetRemoved: (values: { title: string }) => string;
  /** Announced after undo and redo (A11Y-04). */
  undone: string;
  redone: string;
  /** Announced after a manual refresh finishes (A11Y-04). */
  dashboardRefreshed: string;
  /** Announced once per refresh when widgets fail (A11Y-04). */
  widgetsFailed: (values: { count: number }) => string;
  /** Default titles, made unique with `titleNumbered` (MGMT-08). */
  newDashboard: string;
  newPage: string;
  titleNumbered: (values: { title: string; count: number }) => string;
  titleCopy: (values: { title: string }) => string;
  noCollections: string;
  noDashboards: string;
  noPages: string;
  emptyPage: string;
  addFirstWidget: string;
  openEditor: string;
  newDashboardAction: string;
  addPageAction: string;
  addWidgetAction: string;
  /** The widget picker (EDIT-09). */
  widgetPickerTitle: string;
  searchWidgetTypes: string;
  noWidgetTypes: string;
  otherCategory: string;
  /** The configure dialog (EDIT-22). */
  configureTitle: (values: { title: string }) => string;
  tabData: string;
  tabDisplay: string;
  tabGeneral: string;
  dataSource: string;
  noMatchingSources: string;
  noDisplayOptions: string;
  widgetTitle: string;
  hideTitle: string;
  widgetType: string;
  changeTypeTitle: string;
  changeTypeBody: string;
  timeSetting: string;
  timeInherit: string;
  timeOverride: string;
  lockWidget: string;
  discardChangesTitle: string;
  discardChangesBody: string;
  discardChanges: string;
  preview: string;
  configureSaveFailed: string;
  requiredField: string;
  /** Colour choices for colour options (the chart palette and tones). */
  colorOption: (values: { name: string }) => string;
  colorAuto: string;

  // Legend and map widgets
  legendWidget: string;
  legendWidgetDescription: string;
  legendEmpty: string;
  legendEntries: string;
  optionLegendOrder: string;
  optionOrderLabel: string;
  optionOrderFirstSeen: string;
  mapWidget: string;
  mapWidgetDescription: string;
  /** Names a map widget's map, apart from its frame (landmark names stay unique). */
  mapWidgetLabel: (values: { title: string }) => string;
  optionMapStyle: string;
  optionInitialView: string;
  optionFitData: string;
  optionFixedView: string;
  optionClustering: string;
  optionSelectionFilter: string;
  optionNone: string;

  // Templates (NAV-12, NAV-13)
  pageTemplateTitle: string;
  dashboardTemplateTitle: string;
  searchTemplates: string;
  noTemplates: string;
  /** Add menu and empty-state actions that start from a template. */
  addPageFromTemplate: string;
  addDashboardFromTemplate: string;
  fromTemplateAction: string;
  templateFailed: string;

  // Manage dashboards (§13)
  manageDescription: (values: { collection: string }) => string;
  /** Names the tree of dashboards and pages. */
  manageTree: string;
  manageNoSelection: string;
  /** Headings of the selected item's actions. */
  dashboardNode: (values: { title: string }) => string;
  pageNode: (values: { title: string }) => string;
  itemTitle: string;
  titleRequired: string;
  /** A title another item in the same place already has (MGMT-08). */
  titleTaken: string;
  /** Moves a page to another dashboard. */
  moveTo: string;
  /** Announced after Move to (MGMT-02). */
  pageMovedTo: (values: { title: string; dashboard: string }) => string;
  /** A move the item's place or permissions don't allow. */
  moveNotAllowed: string;
  deleteDashboardTitle: (values: { title: string }) => string;
  deleteDashboardBody: (values: { count: number }) => string;
  deletePageTitle: (values: { title: string }) => string;
  deletePageBody: string;
  /** Marks dashboards whose changes weren't applied (MGMT-06). */
  notApplied: string;
  applyFailed: (values: { count: number }) => string;
  changesApplied: string;
  /** Names the collection's own actions. */
  collectionActions: string;

  // Page settings (EDIT-26, GRID-03)
  settingsColumns: string;
  settingsCustom: string;
  settingsColumnCount: string;
  settingsRowSizing: string;
  rowSizingFitRows: string;
  rowSizingFitPage: string;
  rowSizingFixed: string;
  settingsRowsPerScreen: string;
  settingsRowHeight: string;
  settingsRowHeightInvalid: string;
  settingsDensity: string;
  densityAuto: string;
  densityRegular: string;
  densityCompact: string;
  settingsCompaction: string;
  settingsScope: string;
  scopePage: string;
  scopeDashboard: string;
  /** Describes the layout preview after a column change (GRID-03). */
  rescalePreview: (values: { from: number; to: number }) => string;
  /** Names the layout preview. */
  layoutPreview: string;

  // Conflicts and drafts (PERS-05, PERS-07)
  conflictTitle: string;
  conflictBody: string;
  reloadLatest: string;
  overwrite: string;
  draftRestored: string;

  // Category chart, gauge, text and rotator widgets (§10.6, §10.7)
  categoryChartWidget: string;
  categoryChartWidgetDescription: string;
  optionChartType: string;
  chartTypeBar: string;
  chartTypeHorizontalBar: string;
  chartTypeStackedBar: string;
  chartTypeDonut: string;
  optionUnit: string;
  optionValueAxisTitle: string;
  gaugeWidget: string;
  gaugeWidgetDescription: string;
  optionGaugeVariant: string;
  gaugeArc: string;
  gaugeBar: string;
  optionMinValue: string;
  optionBadWhen: string;
  badWhenHigh: string;
  badWhenLow: string;
  optionShowStatus: string;
  textWidget: string;
  textWidgetDescription: string;
  optionBody: string;
  optionTextSize: string;
  textSizeSmall: string;
  textSizeMedium: string;
  textSizeLarge: string;
  textSizeExtraLarge: string;
  optionAlign: string;
  alignStart: string;
  alignCenter: string;
  /** A text widget without text, in edit mode. */
  textEmpty: string;
  rotatorWidget: string;
  rotatorWidgetDescription: string;
  optionInterval: string;
  optionControls: string;
  /** Names the rotator's controls. */
  rotatorControls: string;
  rotatorPrevious: string;
  rotatorNext: string;
  rotatorPause: string;
  rotatorPlay: string;
  /** Which child the rotator shows ("2 of 3: Revenue"). */
  rotatorPosition: (values: { position: number; count: number; title: string }) => string;
  rotatorEmpty: string;
  /** The rotator's children, in its options editor. */
  rotatorChildren: string;

  // Kiosk mode (Q4)
  /** Names the page rotation control. */
  kioskPause: string;
  kioskResume: string;
  /** Announced when kiosk mode moves to the next page. */
  kioskShowing: (values: { title: string }) => string;
}

export const defaultDashboardMessages: DashboardMessages = {
  dashboardPage: ({ title }) => `Dashboard page: ${title}`,
  widgetHandle: ({ title, type, column, row, width, height }) =>
    `Move ${title}${type === undefined ? '' : ` (${type})`}, column ${String(column)}, row ${String(row)}, ${String(width)} by ${String(height)}`,
  widgetHandleHint: 'Press Enter to move or resize with the arrow keys.',
  widgetManipulating: ({ title }) =>
    `Moving ${title}. Arrow keys move it, Shift and arrow keys resize it, Enter places it, Escape cancels.`,
  widgetMovedTo: ({ title, column, row }) =>
    `${title}, column ${String(column)}, row ${String(row)}`,
  widgetResizedTo: ({ title, width, height }) => `${title}, ${String(width)} by ${String(height)}`,
  widgetPlaced: ({ title, column, row, width, height }) =>
    `${title} placed at column ${String(column)}, row ${String(row)}, ${String(width)} by ${String(height)}.`,
  widgetMoveCancelled: ({ title }) => `${title} is back where it was.`,
  widgetSize: ({ width, height }) => `${String(width)} × ${String(height)}`,
  arrangeOnWiderScreen: 'Arrange widgets on a wider screen',
  moveResizeTitle: ({ title }) => `Move or resize ${title}`,
  gridColumn: 'Column',
  gridRow: 'Row',
  gridWidth: 'Width',
  gridHeight: 'Height',
  numberOutOfRange: ({ min, max }) => `Enter a number from ${String(min)} to ${String(max)}.`,
  apply: 'Apply',

  widgetActions: ({ title }) => `Actions for ${title}`,
  refresh: 'Refresh',
  configure: 'Configure',
  expand: 'Expand',
  collapse: 'Close expanded view',
  duplicate: 'Duplicate',
  moveResize: 'Move/Resize…',
  refreshing: 'Refreshing',
  updatedAt: ({ time }) => `Updated ${time}`,
  locked: 'Locked',
  needsSetup: 'Needs setup',
  unconfiguredTitle: 'This widget isn’t set up yet',
  unconfiguredEditorHint: 'Choose what it shows.',
  unconfiguredViewerHint: 'Someone who can edit this dashboard can set it up.',
  widgetLoadFailed: 'Couldn’t load this widget’s data',
  widgetRefreshFailed: 'Couldn’t refresh. Showing earlier data.',
  widgetCrashed: 'This widget stopped working',
  widgetCrashedHint: 'The rest of the dashboard isn’t affected.',
  reloadWidget: 'Reload widget',
  unknownWidgetType: ({ type }) => `Unknown widget type “${type}”`,
  unknownWidgetTypeHint: 'Its settings are kept, but this app can’t show it.',
  dataShapeMismatch: ({ shape }) => `The data source returned data that isn’t “${shape}” data.`,
  widgetOwnTimeRange: ({ range }) => `Uses its own time range: ${range}`,

  widgetCategoryCharts: 'Charts',
  widgetCategoryFigures: 'Figures',
  widgetCategoryTables: 'Tables',
  widgetCategoryMaps: 'Maps',
  widgetCategoryLayout: 'Layout',
  timeSeriesWidget: 'Time series chart',
  timeSeriesWidgetDescription: 'Values over time as lines, bars or areas.',
  statGroupWidget: 'Stat group',
  statGroupWidgetDescription: 'Key figures in tiles, with trends.',
  tableWidget: 'Table',
  tableWidgetDescription: 'Rows and columns, sortable.',
  tableWidgetData: ({ title }) => `${title} data`,
  tableTime: 'Time',
  tableSeries: 'Series',
  statVariantPosition: ({ position, total }) => `${String(position)} of ${String(total)}`,
  statShowNext: 'Show the next value',
  statMissingValue: '—',
  statSources: ({ sources }) => `From ${sources}`,

  optionLegend: 'Legend',
  optionLegendAuto: 'Automatic',
  optionLegendShow: 'Show',
  optionLegendHide: 'Hide',
  optionLegendValues: 'Show latest values in the legend',
  optionZoomable: 'Allow zooming',
  optionZoomBehavior: 'Zooming changes',
  optionZoomDashboard: 'The dashboard’s time range',
  optionZoomLocal: 'Only this chart',
  optionStack: 'Stacking',
  optionStackNone: 'None',
  optionStackNormal: 'Stacked',
  optionStackPercent: 'Percent',
  optionValueScale: 'Value scale',
  optionScaleLinear: 'Linear',
  optionScaleLog: 'Logarithmic',
  optionLeftAxis: 'Left axis title',
  optionRightAxis: 'Right axis title',
  optionFractionDigits: 'Decimal places',
  optionPlaceholder: 'Shown for missing values',
  optionSparkline: 'Show trends',
  optionRotation: 'Milliseconds between values',
  optionTileColumns: 'Tile columns',
  optionTileColumnsAuto: 'Automatic',
  optionDensity: 'Density',
  optionDensityRegular: 'Regular',
  optionDensityCompact: 'Compact',
  optionFromSeries: 'Rows',
  optionRowPerTime: 'One per time',
  optionRowPerSeries: 'One per series',

  dashboardHeader: 'Dashboard',
  collectionSwitcher: 'Collection',
  dashboardSelector: 'Dashboard',
  pageSelector: 'Page',
  navigationButton: ({ dashboard, page }) => `${dashboard} / ${page}`,
  navigationTitle: 'Dashboards',
  filtersButton: ({ count }) => (count === 0 ? 'Filters' : `Filters (${String(count)})`),
  filtersTitle: 'Time range and filters',
  timeRange: 'Time range',
  allOption: 'All',
  refreshDashboard: 'Refresh dashboard',
  autoRefresh: 'Auto-refresh',
  autoRefreshOff: 'Off',
  edit: 'Edit',
  editPage: 'Edit this page',
  manageDashboards: 'Manage dashboards',
  fullScreen: 'Full screen',
  exitFullScreen: 'Exit full screen',
  moreDashboardActions: 'More dashboard actions',
  editing: 'Editing',
  pageTitle: 'Page title',
  pageTitleRequired: 'A page needs a title.',
  add: 'Add',
  addWidget: 'Widget…',
  addPage: 'Page',
  addDashboard: 'Dashboard',
  undo: 'Undo',
  redo: 'Redo',
  clearPage: 'Clear page',
  done: 'Done',
  moreEditActions: 'More edit actions',
  editToolbar: 'Editing tools',
  pageSettings: 'Page settings',
  saving: 'Saving',
  saveFailed: 'Couldn’t save the dashboard.',
  revertTitle: 'Revert all changes?',
  revertBody: 'Every change since you started editing will be discarded.',
  clearPageTitle: ({ title }) => `Clear “${title}”?`,
  clearPageBody: 'Every widget on this page will be removed. You can undo it.',
  doneTitle: 'Save your changes?',
  doneBody: 'This dashboard has changes that aren’t saved.',
  keepEditing: 'Keep editing',
  saveAndExit: 'Save and exit',
  discardAndExit: 'Discard and exit',
  leaveTitle: 'Save your changes first?',
  saveAndContinue: 'Save and continue',
  discardAndContinue: 'Discard and continue',
  saveSharedTitle: 'Save this shared dashboard?',
  widgetRemoved: ({ title }) => `Removed ${title}`,
  undone: 'Undone',
  redone: 'Redone',
  dashboardRefreshed: 'Dashboard refreshed',
  widgetsFailed: ({ count }) =>
    count === 1 ? '1 widget couldn’t load' : `${String(count)} widgets couldn’t load`,
  newDashboard: 'New dashboard',
  newPage: 'New page',
  titleNumbered: ({ title, count }) => `${title} ${String(count)}`,
  titleCopy: ({ title }) => `${title} copy`,
  noCollections: 'There are no dashboards to show',
  noDashboards: 'No dashboards yet',
  noPages: 'This dashboard has no pages',
  emptyPage: 'This page is empty',
  addFirstWidget: 'Add your first widget',
  openEditor: 'Open editor',
  newDashboardAction: 'New dashboard',
  addPageAction: 'Add page',
  addWidgetAction: 'Add widget',
  widgetPickerTitle: 'Add a widget',
  searchWidgetTypes: 'Search widget types',
  noWidgetTypes: 'No widget types match',
  otherCategory: 'Other',
  configureTitle: ({ title }) => `Configure ${title}`,
  tabData: 'Data',
  tabDisplay: 'Display',
  tabGeneral: 'General',
  dataSource: 'Data source',
  noMatchingSources: 'No data sources provide the data this widget shows.',
  noDisplayOptions: 'This widget has no display options.',
  widgetTitle: 'Title',
  hideTitle: 'Hide the title',
  widgetType: 'Widget type',
  changeTypeTitle: 'Change the widget type?',
  changeTypeBody: 'The new type shows different data, so the widget’s data source will be cleared.',
  timeSetting: 'Time range',
  timeInherit: 'The dashboard’s',
  timeOverride: 'Its own',
  lockWidget: 'Lock in place',
  discardChangesTitle: 'Discard your changes?',
  discardChangesBody: 'The changes you made in this dialog will be lost.',
  discardChanges: 'Discard',
  preview: 'Preview',
  configureSaveFailed: 'Couldn’t save the widget’s settings. They were put back.',
  requiredField: 'This is required.',
  colorOption: ({ name }) => `Colour ${name}`,
  colorAuto: 'Automatic',
  legendWidget: 'Legend',
  legendWidgetDescription: 'One legend for every chart on the page.',
  legendEmpty: 'No charts on this page have a legend yet.',
  legendEntries: 'Series',
  optionLegendOrder: 'Order',
  optionOrderLabel: 'By name',
  optionOrderFirstSeen: 'As they appear',
  mapWidget: 'Map',
  mapWidgetDescription: 'Places on a map; selecting one can filter the dashboard.',
  mapWidgetLabel: ({ title }) => `Map of ${title}`,
  optionMapStyle: 'Map style',
  optionInitialView: 'Starting view',
  optionFitData: 'Fit to the places',
  optionFixedView: 'Fixed centre and zoom',
  optionClustering: 'Group nearby places',
  optionSelectionFilter: 'Selecting a place sets the filter',
  optionNone: 'None',

  pageTemplateTitle: 'Add a page from a template',
  dashboardTemplateTitle: 'New dashboard from a template',
  searchTemplates: 'Search templates',
  noTemplates: 'No templates match',
  addPageFromTemplate: 'Page from template…',
  addDashboardFromTemplate: 'Dashboard from template…',
  fromTemplateAction: 'From template…',
  templateFailed: 'Couldn’t use the template.',

  manageDescription: ({ collection }) =>
    `Dashboards and pages in ${collection}. Changes are applied together when you press Apply.`,
  manageTree: 'Dashboards and pages',
  manageNoSelection: 'Select a dashboard or page to rename, move, copy or delete it.',
  dashboardNode: ({ title }) => `Dashboard: ${title}`,
  pageNode: ({ title }) => `Page: ${title}`,
  itemTitle: 'Title',
  titleRequired: 'Enter a title.',
  titleTaken: 'Another item here already has this title.',
  moveTo: 'Move to',
  pageMovedTo: ({ title, dashboard }) => `${title} moved to ${dashboard}`,
  moveNotAllowed: 'It can’t be moved there.',
  deleteDashboardTitle: ({ title }) => `Delete “${title}”?`,
  deleteDashboardBody: ({ count }) =>
    `Its ${count === 1 ? 'page is' : `${String(count)} pages are`} deleted too. Once you apply, this can’t be undone.`,
  deletePageTitle: ({ title }) => `Delete “${title}”?`,
  deletePageBody: 'Once you apply, this can’t be undone.',
  notApplied: 'Not applied',
  applyFailed: ({ count }) =>
    count === 1
      ? 'One dashboard’s changes weren’t applied.'
      : `${String(count)} dashboards’ changes weren’t applied.`,
  changesApplied: 'Changes applied',
  collectionActions: 'Collection actions',

  settingsColumns: 'Columns',
  settingsCustom: 'Custom',
  settingsColumnCount: 'Number of columns',
  settingsRowSizing: 'Row sizing',
  rowSizingFitRows: 'Fit rows to the screen',
  rowSizingFitPage: 'Fit the whole page to the screen',
  rowSizingFixed: 'Fixed row height',
  settingsRowsPerScreen: 'Rows per screen',
  settingsRowHeight: 'Row height',
  settingsRowHeightInvalid: 'Enter a length of at least 1.5rem, such as 4rem or 64px.',
  settingsDensity: 'Density',
  densityAuto: 'Automatic',
  densityRegular: 'Regular',
  densityCompact: 'Compact',
  settingsCompaction: 'Move widgets up to fill gaps',
  settingsScope: 'Save these settings for',
  scopePage: 'This page',
  scopeDashboard: 'Every page of this dashboard',
  rescalePreview: ({ from, to }) =>
    `Widgets are rescaled from ${String(from)} to ${String(to)} columns, as shown.`,
  layoutPreview: 'Layout preview',

  conflictTitle: 'This dashboard changed since you opened it',
  conflictBody:
    'A newer version was saved meanwhile. Reload it and lose your changes, or overwrite it with yours.',
  reloadLatest: 'Reload latest',
  overwrite: 'Overwrite',
  draftRestored: 'Your unsaved changes were restored.',

  categoryChartWidget: 'Category chart',
  categoryChartWidgetDescription: 'Bars or a donut of values by category',
  optionChartType: 'Chart type',
  chartTypeBar: 'Bars',
  chartTypeHorizontalBar: 'Horizontal bars',
  chartTypeStackedBar: 'Stacked bars',
  chartTypeDonut: 'Donut',
  optionUnit: 'Unit',
  optionValueAxisTitle: 'Value axis title',
  gaugeWidget: 'Gauge',
  gaugeWidgetDescription: 'One value against its range and thresholds',
  optionGaugeVariant: 'Shape',
  gaugeArc: 'Arc',
  gaugeBar: 'Bar',
  optionMinValue: 'Minimum',
  optionBadWhen: 'Thresholds warn when the value is',
  badWhenHigh: 'High',
  badWhenLow: 'Low',
  optionShowStatus: 'Show the status',
  textWidget: 'Text',
  textWidgetDescription: 'A heading, note or annotation',
  optionBody: 'Text',
  optionTextSize: 'Size',
  textSizeSmall: 'Small',
  textSizeMedium: 'Medium',
  textSizeLarge: 'Large',
  textSizeExtraLarge: 'Extra large',
  optionAlign: 'Alignment',
  alignStart: 'Start',
  alignCenter: 'Centre',
  textEmpty: 'Configure this widget to add its text.',
  rotatorWidget: 'Rotator',
  rotatorWidgetDescription: 'Shows its widgets one at a time, in turn',
  optionInterval: 'Seconds per widget',
  optionControls: 'Show controls',
  rotatorControls: 'Rotation',
  rotatorPrevious: 'Previous widget',
  rotatorNext: 'Next widget',
  rotatorPause: 'Pause rotation',
  rotatorPlay: 'Resume rotation',
  rotatorPosition: ({ position, count, title }) =>
    `${String(position)} of ${String(count)}: ${title}`,
  rotatorEmpty: 'This rotator has no widgets yet.',
  rotatorChildren: 'Widgets',

  kioskPause: 'Pause page rotation',
  kioskResume: 'Resume page rotation',
  kioskShowing: ({ title }) => `Showing ${title}`,
};

/**
 * The strings every `/dashboard` component reads: the core strings, the time range group (for range labels) and the
 * dashboard's own.
 */
export type DashboardStrings = CommonMessages & typeof timeRangeStrings & DashboardMessages;

/** The dashboard's defaults with the core groups it uses, made once so the merged strings stay memoised. */
const dashboardDefaults = { ...timeRangeStrings, ...defaultDashboardMessages };

/** `/dashboard`'s strings, with the app's overrides from `UIProvider`. */
export function useDashboardMessages(): DashboardStrings {
  return useEntryMessages(dashboardDefaults);
}

/** Reads localized text: a string as it is, or a message function with the current strings. */
export function readText(
  text: string | ((messages: DashboardStrings) => string),
  messages: DashboardStrings,
): string {
  return typeof text === 'function' ? text(messages) : text;
}
