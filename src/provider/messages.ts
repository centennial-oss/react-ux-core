/**
 * The library's own UI strings. English defaults ship with the library; apps override any key through
 * `UIProvider`'s `messages` prop, for example by feeding in strings from their own i18n system.
 *
 * The strings are typed here, all together (`Messages`), but each entry point ships only its own defaults: the main
 * entry the core strings below, and `/form`, `/table`, `/chart`, `/shell` and `/map` theirs, merged with the app's
 * overrides when their components render.
 *
 * Messages that need values are functions that take named parameters, so translations control word order and
 * plurals. Components never concatenate translated fragments.
 */
/** Strings the main entry point uses (and the entry points share). */
export interface CoreMessages {
  /** Label for buttons and controls that close a dialog, popover, toast or banner. */
  close: string;
  cancel: string;
  save: string;
  revert: string;
  delete: string;
  clearAll: string;
  loadMore: string;
  /** Announced and shown while something is pending or loading. */
  loading: string;
  /** Progress through a multi-step flow, for example "Step 2 of 4". */
  stepOf: (params: { step: number; total: number }) => string;
  /** Label for buttons that dismiss a banner or toast. */
  dismiss: string;
  /** Label for a chip's or tag's remove button; read together with the chip's own label. */
  remove: string;
  /** Shown when there's no data to display. */
  noData: string;
  /** Text summary of a sparkline's values (numbers already formatted). */
  sparklineSummary: (params: { count: number; min: string; max: string; latest: string }) => string;
  /** Read before a stat's change, for example "Up 12%". */
  deltaUp: (params: { value: string }) => string;
  deltaDown: (params: { value: string }) => string;
  deltaFlat: (params: { value: string }) => string;
  /** Label for the "more actions" (vertical dots) menu button. */
  moreActions: string;
  /** Label for a split button's menu trigger. */
  moreOptions: string;
  /** Retry button in error states. */
  retry: string;
  /** Disclosure label for technical details in error states. */
  details: string;
  /** Accessible name of the breadcrumbs navigation landmark. */
  breadcrumbs: string;
  /** Label for the menu that holds collapsed breadcrumbs. */
  showHiddenBreadcrumbs: string;
  /** Confirm button in confirmation dialogs. */
  confirm: string;
  /** Step navigation in step dialogs. */
  back: string;
  next: string;
  /** Title of a step dialog's generated summary step. */
  summary: string;
  /** Prompt for a confirmation that requires typing a word or name. */
  typeToConfirm: (params: { text: string }) => string;
  /** Label for an info (i) button that explains a term. */
  moreInformation: string;
  /** Accessible name of the notifications (toast) region. */
  notifications: string;
  /** Password field toggle. */
  showPassword: string;
  hidePassword: string;
  /** Clear button in text and search fields. */
  clearValue: string;
  /** Character counter in text areas, for example "42 / 200". */
  characterCount: (params: { count: number; max: number }) => string;
  /** Fallback error when an action fails without its own message. */
  genericError: string;
  /** Copy-to-clipboard button, and its confirmation. */
  copy: string;
  copied: string;
  /** Disclosure for secondary rows. */
  showMore: string;
  showLess: string;
  /** Read for a missing value (shown as an em dash). */
  notSet: string;
  /** Hint for a search field's keyboard shortcut. */
  searchShortcutHint: string;
  /** Select/combo box/multi-select states. */
  selectPlaceholder: string;
  noResults: string;
  loadError: string;
  /** Time range picker. */
  apply: string;
  now: string;
  from: string;
  to: string;
  timeRangePresets: string;
  timeRangeRelative: string;
  timeRangeAbsolute: string;
  timeRangeLastHour: string;
  timeRangeLast24Hours: string;
  timeRangeLast7Days: string;
  timeRangeLast30Days: string;
  timeRangeThisMonth: string;
  /** A relative range like "Last 3 hours" (unit already localised by Intl). */
  timeRangeLast: (params: { amount: string }) => string;
  /** File field / drop zone. */
  dropFiles: string;
  chooseFiles: string;
  fileTooLarge: (params: { name: string; max: string }) => string;
  fileTypeNotAccepted: (params: { name: string }) => string;
  tooManyFiles: (params: { max: number }) => string;
  uploading: (params: { name: string }) => string;
  uploadFailed: (params: { name: string }) => string;
  cancelUpload: string;
  /** Read for a file that finished uploading. */
  uploaded: string;
  /** Shown when a typed date range is longer than allowed. */
  dateRangeTooLong: (params: { max: number }) => string;
  /** Default accessible name of a time range picker without a label. */
  timeRange: string;
  /** Labels for a relative time range's amount and unit. */
  timeRangeAmount: string;
  timeRangeUnit: string;
  // Forms
  yes: string;
  no: string;
  // Tables
  export: string;
  /** Titles the error state of a table or chart that failed to load. */
  loadFailed: string;
  // Colour and icon pickers
  customColor: string;
  hexColor: string;
  searchIcons: string;
  noIcon: string;
  // Schedule and tier editors
  /** A span of time or of numbers ("06:00–09:00", "0–100"). */
  range: (params: { from: string; to: string }) => string;
  /** An open-ended tier ("500 and above"). */
  openRange: (params: { from: string }) => string;
  start: string;
  end: string;
  value: string;
  addPeriod: string;
  addTier: string;
  /** Removes the row covering `range`. */
  removeRow: (params: { range: string }) => string;
  endBeforeStart: string;
  overlaps: (params: { range: string }) => string;
  gapBetween: (params: { range: string }) => string;
  notCovered: (params: { range: string }) => string;
  /** One period in a schedule's text summary. */
  scheduleSegment: (params: { range: string; value: string }) => string;
  /** Names a schedule's 24-hour preview. */
  schedulePreview: (params: { summary: string }) => string;
  noUpperLimit: string;
  tierShouldStartAt: (params: { value: string }) => string;
  tierEndAfterStart: string;
  tierOnlyLastOpen: string;
}

/** Strings for `/form` (ConfigForm and its containers). */
export interface FormMessages {
  /** The submit button of a form that creates a record. */
  create: string;
  /** Switches a form from view mode to editing. */
  edit: string;
  /** A required field is empty. */
  required: string;
  invalidEmail: string;
  invalidUrl: string;
  tooShort: (params: { min: number }) => string;
  tooFewItems: (params: { min: number }) => string;
  tooManyItems: (params: { max: number }) => string;
  /** Announced when a submit fails because fields are invalid. */
  fixFields: (params: { count: number }) => string;
  /** Adds an item to a repeating group. */
  addItem: string;
  /** The default heading of an item in a repeating group. */
  itemNumber: (params: { index: number }) => string;
  removeItem: (params: { index: number }) => string;
  moveItemUp: (params: { index: number }) => string;
  moveItemDown: (params: { index: number }) => string;
  /** Announced after an item moves. */
  itemMoved: (params: { index: number; total: number }) => string;
  unsavedChangesTitle: string;
  unsavedChangesBody: string;
  discardChanges: string;
  keepEditing: string;
  deleteRecordTitle: string;
  cannotBeUndone: string;
  uploadCancelled: string;
  /** Heading of the dialog for a submit the server wants confirmed. */
  confirmSubmitTitle: string;
}

/** Strings for `/table` (DataTable, TableToolbar and filters). */
export interface TableMessages {
  /** Announced after a sort change. */
  sortedBy: (params: { column: string; direction: 'ascending' | 'descending' }) => string;
  /** Announced when no sort applies. */
  notSorted: string;
  selectAllRows: string;
  selectRow: (params: { row: string }) => string;
  selectedCount: (params: { count: number }) => string;
  clearSelection: string;
  /** Turns on selection in the phone card list. */
  select: string;
  /** The default name of a table's search field. */
  search: string;
  showRowDetails: (params: { row: string }) => string;
  rowActions: (params: { row: string }) => string;
  previousPage: string;
  nextPage: string;
  rowsPerPage: string;
  /** "1–25 of 123". */
  rowRange: (params: { start: string; end: string; total: string }) => string;
  /** "About 1,200 rows". */
  approximateRows: (params: { total: string }) => string;
  /** Announced after rows load. */
  rowCount: (params: { count: number }) => string;
  updating: string;
  columns: string;
  exportPage: string;
  exportAll: string;
  filters: string;
  /** The phone toolbar's single sheet for filters, columns and export. */
  filterAndSort: string;
  /** "Customers · 123". */
  resultSummary: (params: { label: string; count: string }) => string;
  any: string;
  minimum: string;
  maximum: string;
  noMatchingRows: string;
}

/** Strings for `/chart` (charts and gauges). */
export interface ChartMessages {
  viewAsTable: string;
  exportPng: string;
  exportCsv: string;
  fullScreen: string;
  exitFullScreen: string;
  resetZoom: string;
  /** Shown in full screen on a phone held upright. */
  rotateForWiderChart: string;
  /** Names the legend. */
  chartSeries: string;
  /** The time column of a chart's table view. */
  time: string;
  /** The category column of a chart's table view. */
  category: string;
  /** Generated summary of a time series chart. */
  timeSeriesSummary: (params: { count: number; start: string; end: string }) => string;
  /** One series in a generated summary. */
  seriesRange: (params: { label: string; min: string; max: string; latest: string }) => string;
  /** Generated summary of a category chart. */
  categorySummary: (params: { count: number }) => string;
  /** One series in a category chart's summary. */
  categoryHighLow: (params: {
    label: string;
    high: string;
    highValue: string;
    low: string;
    lowValue: string;
  }) => string;
  gaugeNormal: string;
  gaugeWarning: string;
  gaugeDanger: string;
  /** A gauge's value with its status ("82 %, Warning"). */
  gaugeValue: (params: { value: string; status: string }) => string;
}

/** Strings for `/shell` (the app shell kit). */
export interface ShellMessages {
  /** The skip link at the top of the app shell. */
  skipToContent: string;
  /** Names the sidebar's navigation landmark. */
  mainNavigation: string;
  /** Names the bottom tab bar's navigation landmark. */
  quickNavigation: string;
  /** Names the footer's links. */
  footerLinks: string;
  /** The header's menu toggle while the navigation is closed or collapsed. */
  openNavigation: string;
  closeNavigation: string;
  collapseSidebar: string;
  expandSidebar: string;
  /** The toggle that shows a navigation item's children. */
  subPages: (params: { label: string }) => string;
  /** The account menu's trigger. */
  accountMenu: (params: { name: string }) => string;
  settings: string;
  theme: string;
  themeSystem: string;
  themeLight: string;
  themeDark: string;
  themeHighContrast: string;
  /** The bottom tab bar's last item, which opens the navigation drawer. */
  more: string;
  /** Joins the levels of a scope path ("Acme / North / Plant 12"). */
  pathSeparator: string;
  /** The scope picker's trigger. */
  currentScope: (params: { path: string }) => string;
  /** Titles the scope picker's panel. */
  chooseScope: string;
  /** The search across every level of the scope picker. */
  searchAll: string;
  /** A level's own search field. */
  searchLevel: (params: { level: string }) => string;
  recent: string;
  /** Goes up to a level of the scope picker on phones. */
  backTo: (params: { label: string }) => string;
  /** Announces how many search results there are. */
  resultCount: (params: { count: number }) => string;
  /** Names the status bar. */
  status: string;
  severityOk: string;
  severityWarning: string;
  severityError: string;
  severityUnknown: string;
  /** A status bar button. */
  statusCategory: (params: { label: string; severity: string; count: number }) => string;
  /** The phone status button: the worst severity. */
  overallStatus: (params: { severity: string }) => string;
  noAlerts: string;
  /** When the alerts were last updated. */
  asOf: (params: { time: string }) => string;
  /** The footer's time-zone note. */
  timeZoneNote: (params: { zone: string }) => string;
  version: (params: { version: string }) => string;
  build: (params: { build: string }) => string;
  /** Names a page header's tab list. */
  pageSections: string;
  /** A Brand's link, read by screen readers, for example "Gridline home". */
  brandHome: (params: { name: string }) => string;
}

/** Strings for `/map`. */
export interface MapMessages {
  mapUnavailable: string;
  mapLoadFailed: string;
  mapTilesFailed: string;
  zoomIn: string;
  zoomOut: string;
  fitToMarkers: string;
  resetView: string;
  /** The markers list's heading. */
  markerCount: (params: { count: number }) => string;
  /** A cluster of markers on the map. */
  markerCluster: (params: { count: number }) => string;
}

// The larger main-entry components below each ship their own defaults (in their component directory), so an app
// carries only the strings of the components it imports.

/** Strings for SecretReveal. */
export interface SecretRevealMessages {
  /** The warning banner's title. */
  secretsTitle: string;
  /** The warning banner's text. */
  secretsWarning: string;
  showSecret: (params: { label: string }) => string;
  hideSecret: (params: { label: string }) => string;
  copyValue: (params: { label: string }) => string;
  /** The toast after a copy. */
  valueCopied: (params: { label: string }) => string;
  copyFailed: string;
  copyFailedHint: string;
}

/** Status of a Checklist step. */
export type ChecklistStatus = 'done' | 'current' | 'todo' | 'blocked';

/** Strings for Checklist. */
export interface ChecklistMessages {
  /** Each status in words, beside the step's title, so status never relies on colour or shape alone. */
  checklistStatus: (params: { status: ChecklistStatus }) => string;
  /** The progress summary, for example "3 of 5 done". */
  checklistProgress: (params: { done: number; total: number }) => string;
}

/** Why a text isn't valid JSON (see `checkJson`). */
export type JsonProblemCode =
  | 'end'
  | 'value'
  | 'propertyName'
  | 'colon'
  | 'objectSeparator'
  | 'arraySeparator'
  | 'trailingComma'
  | 'escape'
  | 'unterminatedString'
  | 'controlCharacter'
  | 'number'
  | 'extraText';

/** Strings for JsonEditor. */
export interface JsonEditorMessages {
  formatJson: string;
  /** Shown while the JSON is valid. */
  validJson: string;
  /**
   * A JSON problem with its position. `found` is the character at the problem, or undefined at the end of the text.
   */
  jsonProblem: (params: {
    code: JsonProblemCode;
    line: number;
    column: number;
    found: string | undefined;
  }) => string;
}

/** Strings for TemplateEditor. */
export interface TemplateEditorMessages {
  /** The example's heading. */
  templateExample: string;
  /** Shown in the example before anything is typed. */
  templateEmptyExample: string;
  /** The keyword list's heading and the suggestions' name. */
  templateKeywords: string;
  /** Under the keyword list's heading. */
  templateKeywordsHint: string;
  /** A keyword's insert button. */
  insertKeyword: string;
  /** The insert button's accessible name. */
  insertKeywordLabel: (params: { keyword: string }) => string;
  /** The keyword's sample value, in the keyword list. */
  keywordExample: (params: { example: string }) => string;
  /** The counter under the message. */
  smsCount: (params: { characters: number; limit: number; parts: number }) => string;
  /** Announced when suggestions appear. */
  keywordSuggestions: (params: { count: number }) => string;
}

/** Every string the library uses, for overriding through `UIProvider`. */
export type Messages = CoreMessages &
  SecretRevealMessages &
  ChecklistMessages &
  JsonEditorMessages &
  TemplateEditorMessages &
  FormMessages &
  TableMessages &
  ChartMessages &
  ShellMessages &
  MapMessages;

/** The English defaults of the core strings (each entry point has its own for the rest). */
export const defaultMessages: CoreMessages = {
  close: 'Close',
  cancel: 'Cancel',
  save: 'Save',
  revert: 'Revert',
  delete: 'Delete',
  clearAll: 'Clear all',
  loadMore: 'Load more',
  loading: 'Loading',
  stepOf: ({ step, total }) => `Step ${step} of ${total}`,
  dismiss: 'Dismiss',
  remove: 'Remove',
  noData: 'No data',
  sparklineSummary: ({ count, min, max, latest }) =>
    `${count} values from ${min} to ${max}, latest ${latest}`,
  deltaUp: ({ value }) => `Up ${value}`,
  deltaDown: ({ value }) => `Down ${value}`,
  deltaFlat: ({ value }) => `Unchanged ${value}`,
  moreActions: 'More actions',
  moreOptions: 'More options',
  retry: 'Retry',
  details: 'Details',
  breadcrumbs: 'Breadcrumbs',
  showHiddenBreadcrumbs: 'Show hidden breadcrumbs',
  confirm: 'Confirm',
  back: 'Back',
  next: 'Next',
  summary: 'Summary',
  typeToConfirm: ({ text }) => `Type ${text} to confirm`,
  moreInformation: 'More information',
  notifications: 'Notifications',
  showPassword: 'Show password',
  hidePassword: 'Hide password',
  clearValue: 'Clear',
  characterCount: ({ count, max }) => `${count} / ${max}`,
  genericError: 'Something went wrong. Please try again.',
  copy: 'Copy',
  copied: 'Copied',
  showMore: 'Show more',
  showLess: 'Show less',
  notSet: 'Not set',
  searchShortcutHint: 'Press / to search',
  selectPlaceholder: 'Select…',
  noResults: 'No results',
  loadError: 'Couldn’t load options',
  apply: 'Apply',
  now: 'Now',
  from: 'From',
  to: 'To',
  timeRangePresets: 'Presets',
  timeRangeRelative: 'Relative',
  timeRangeAbsolute: 'Absolute',
  timeRangeLastHour: 'Last hour',
  timeRangeLast24Hours: 'Last 24 hours',
  timeRangeLast7Days: 'Last 7 days',
  timeRangeLast30Days: 'Last 30 days',
  timeRangeThisMonth: 'This month',
  timeRangeLast: ({ amount }) => `Last ${amount}`,
  dropFiles: 'Drop files here',
  chooseFiles: 'Choose files',
  fileTooLarge: ({ name, max }) => `${name} is larger than ${max}`,
  fileTypeNotAccepted: ({ name }) => `${name} isn’t an accepted file type`,
  tooManyFiles: ({ max }) => `Choose up to ${max} files`,
  uploading: ({ name }) => `Uploading ${name}`,
  uploadFailed: ({ name }) => `${name} couldn’t be uploaded`,
  cancelUpload: 'Cancel upload',
  uploaded: 'Uploaded',
  dateRangeTooLong: ({ max }) => `Choose a range of ${max} days or fewer`,
  timeRange: 'Time range',
  timeRangeAmount: 'Amount',
  timeRangeUnit: 'Unit',
  yes: 'Yes',
  no: 'No',
  export: 'Export',
  loadFailed: 'Couldn’t load the data',
  customColor: 'Custom colour',
  hexColor: 'Hex',
  searchIcons: 'Search icons',
  noIcon: 'No icon',
  range: ({ from, to }) => `${from}–${to}`,
  openRange: ({ from }) => `${from} and above`,
  start: 'Start',
  end: 'End',
  value: 'Value',
  addPeriod: 'Add period',
  addTier: 'Add tier',
  removeRow: ({ range }) => `Remove ${range}`,
  endBeforeStart: 'Ends before it starts',
  overlaps: ({ range }) => `Overlaps ${range}`,
  gapBetween: ({ range }) => `Nothing scheduled ${range}`,
  notCovered: ({ range }) => `Not covered: ${range}`,
  scheduleSegment: ({ range, value }) => `${range}: ${value}`,
  schedulePreview: ({ summary }) => `Schedule over the day: ${summary}`,
  noUpperLimit: 'No limit',
  tierShouldStartAt: ({ value }) => `Should start at ${value}, where the previous tier ends`,
  tierEndAfterStart: 'Must end above where it starts',
  tierOnlyLastOpen: 'Only the last tier can be open-ended',
};
