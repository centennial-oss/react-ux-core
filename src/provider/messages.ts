/**
 * The library's own UI strings. English defaults ship with the library; apps override any key through
 * `UIProvider`'s `messages` prop, for example by feeding in strings from their own i18n system.
 *
 * The strings are typed here, all together (`Messages`), but each entry point ships only its own defaults: the main
 * entry the core strings below (and its larger components their own), and every other entry point its own, merged
 * with the app's overrides when their components render.
 *
 * Messages that need values are functions that take named parameters, so translations control word order and
 * plurals. Components never concatenate translated fragments.
 */

import type { ModelViewerMessages } from '../3d/messages';
import type { CanvasMessages } from '../canvas/messages';
import type { ChatMessages } from '../chat/messages';
import type { ChartAnnotationMessages } from '../chart/annotationMessages';
import type { ChartPlotMessages } from '../chart/plotMessages';
import type { CodesMessages } from '../codes/messages';
import type { ActivityTimelineMessages } from '../components/ActivityTimeline/messages';
import type { AvatarMessages } from '../components/Avatar/messages';
import type { CidrFieldMessages } from '../components/CidrField/messages';
import type { CommandPaletteMessages } from '../components/CommandPalette/messages';
import type { CopyFieldMessages } from '../components/CopyField/messages';
import type { GanttDependencyType, GanttTaskKind, GanttZoom } from '../components/GanttChart/types';
import type { KeyValueEditorMessages } from '../components/KeyValueEditor/messages';
import type { KnobMessages } from '../components/Knob/messages';
import type { MoneyFieldMessages } from '../components/MoneyField/messages';
import type { PaginationMessages } from '../components/Pagination/messages';
import type { PriceTickerMessages } from '../components/PriceTicker/messages';
import type { PropertyInspectorMessages } from '../components/PropertyInspector/messages';
import type { RolloutProgressMessages } from '../components/RolloutProgress/messages';
import type { RuleBuilderMessages } from '../components/RuleBuilder/messages';
import type { ScheduleTimelineMessages } from '../components/ScheduleTimeline/messages';
import type { SegmentedMeterMessages } from '../components/SegmentedMeter/messages';
import type { SlugFieldMessages } from '../components/SlugField/messages';
import type { SplitViewMessages } from '../components/SplitView/messages';
import type { TextFieldMessages } from '../components/TextField/messages';
import type { TreeMessages } from '../components/Tree/messages';
import type { UnitFieldMessages } from '../components/UnitField/messages';
import type { UptimeBarMessages } from '../components/UptimeBar/messages';
import type { WorldClockMessages } from '../components/WorldClock/messages';
import type { DashboardMessages } from '../dashboard/messages';
import type { DicomMessages } from '../dicom/messages';
import type { DiffMessages } from '../diff/messages';
import type { EditorMessages } from '../editor/messages';
import type { FinanceMessages } from '../finance/messages';
import type { GraphMessages } from '../graph/messages';
import type { OrgChartMessages } from '../graph/OrgChart/messages';
import type { LogViewerMessages } from '../logs/messages';
import type { ChoroplethMessages } from '../map/choroplethMessages';
import type { MarkdownEditorMessages } from '../markdown/editorMessages';
import type { MathMessages } from '../math/messages';
import type { MediaFilesMessages } from '../media/files/messages';
import type { MediaImageMessages } from '../media/image/messages';
import type { MediaPlayerMessages } from '../media/player/messages';
import type { MusicMessages } from '../music/messages';
import type { NotificationMessages } from '../shell/notificationMessages';
import type { EditableTableMessages } from '../table/editableMessages';
import type { FlowsheetMessages } from '../table/flowsheetMessages';
import type { SpreadsheetMessages } from '../table/spreadsheet/messages';
import type { TerminalMessages } from '../terminal/messages';
import {
  anchorNavStrings,
  breadcrumbStrings,
  calendarStrings,
  carouselStrings,
  commonStrings,
  confirmStrings,
  eventCalendarStrings,
  feedbackStrings,
  fileStrings,
  ganttStrings,
  inlineEditStrings,
  kanbanStrings,
  listViewStrings,
  maskedFieldStrings,
  modifierKeyStrings,
  oneTimeCodeStrings,
  pickerStrings,
  rangeEditorStrings,
  ratingStrings,
  reorderStrings,
  selectionStrings,
  stepperStrings,
  tagFieldStrings,
  textFieldStrings,
  tileStrings,
  timeRangeStrings,
  timerStrings,
  transferStrings,
  trendStrings,
} from './coreStrings';

// The interfaces imported above are defined beside their components (each ships its own defaults); they are
// joined into `Messages` below.

/** Where a Stepper step stands. Without a `status`, steps before the current one are done and steps after it upcoming. */
export type StepperStatus = 'done' | 'current' | 'upcoming' | 'error' | 'skipped';

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
  /** Default accessible name of a Stepper. */
  steps: string;
  /**
   * A Stepper step's status in words, so it never relies on colour or icon alone: read after the title (done, error
   * and skipped), or shown in each step's badge with `hasStatusBadges`. `blocked` is an upcoming step that can't be
   * reached (`isDisabled`).
   */
  stepStatus: (params: { status: StepperStatus | 'blocked' }) => string;
  /** A Stepper's progress bar with `hasProgressBar`, for example "3 of 5 done". */
  stepProgress: (params: { done: number; total: number }) => string;
  /** Shown under the title of a step that can be skipped. */
  stepOptional: string;
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
  /** AnchorNav's title and accessible name, and its menu button's label on phones. */
  onThisPage: string;
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
  /** A Rating's value, announced and as a display's accessible name: "3.5 out of 5" (numbers already formatted). */
  ratingValue: (params: { value: string; max: string }) => string;
  /** Announced for a Rating input with no value. */
  ratingNone: string;
  /** A OneTimeCodeField's length, read after its description: "6-digit code" or "8-character code". */
  oneTimeCodeLength: (params: { length: number; isDigits: boolean }) => string;
  /** How many characters a MaskedField takes, read after its description: "10 digits" or "5 to 9 digits". */
  maskedFieldLength: (params: { min: number; max: number; isDigits: boolean }) => string;
  /** A masked field's error when its value is only partly entered. */
  maskedFieldIncomplete: string;
  /** Fallback error when an action fails without its own message. */
  genericError: string;
  /** Copy-to-clipboard button, and its confirmation. */
  copy: string;
  copied: string;
  /** Names an option's feedback icon (Radio, Checkbox): the success, danger, warning, and info or neutral tones. */
  feedbackCorrect: string;
  feedbackIncorrect: string;
  feedbackWarning: string;
  feedbackNote: string;
  /** Timer announcements, with a duration in words ("5 minutes"). */
  timeLeft: (params: { time: string }) => string;
  timeElapsed: (params: { time: string }) => string;
  timeUp: string;
  /** Shown beside a paused timer. */
  timerPaused: string;
  /** ReorderableList: a row's drag handle and move buttons, and the announcement after a move. */
  dragItem: (params: { item: string }) => string;
  moveUp: (params: { item: string }) => string;
  moveDown: (params: { item: string }) => string;
  itemMovedTo: (params: { item: string; position: number; total: number }) => string;
  /** Shown in an empty ListView. */
  listEmpty: string;
  /** Names a ListView row's actions menu. */
  listItemActions: (params: { item: string }) => string;
  /** TransferList: the two lists' default titles. */
  transferAvailable: string;
  transferChosen: string;
  /** TransferList move buttons, naming the list the items go to. */
  transferMove: (params: { list: string }) => string;
  transferMoveAll: (params: { list: string }) => string;
  /** Names a TransferList side's search field. */
  transferSearch: (params: { list: string }) => string;
  /** Names a TransferList side's select-all checkbox. */
  transferSelectAll: (params: { list: string }) => string;
  /** A TransferList side's selection count ("2 of 40 selected"). */
  transferSelectedCount: (params: { count: number; total: number }) => string;
  /** Announced after a TransferList move ("3 moved to Chosen"). */
  transferMoved: (params: { count: number; list: string }) => string;
  /** KanbanBoard: an empty list of cards. */
  kanbanEmpty: string;
  /** A KanbanBoard column's (or lane's) card count ("12 cards"). */
  kanbanCount: (params: { count: number }) => string;
  /** A column's count against its work-in-progress limit, read by screen readers ("8 of 10 cards"). */
  kanbanLimit: (params: { count: number; limit: number }) => string;
  /** A column over its work-in-progress limit, read by screen readers ("12 cards, over the limit of 10"). */
  kanbanOverLimit: (params: { count: number; limit: number }) => string;
  /** A column's count against its limit as shown ("12 / 10"). */
  kanbanLimitShort: (params: { count: number; limit: number }) => string;
  /** Name a column's collapse and expand buttons. */
  kanbanCollapse: (params: { column: string }) => string;
  kanbanExpand: (params: { column: string }) => string;
  /** A column's add button (KanbanBoard's `addLabel`). */
  kanbanAddCard: string;
  /** Titles the move sections of a card's actions menu, and names the selection bar's move menu. */
  kanbanMoveTo: string;
  kanbanMoveToLane: string;
  /** Names a column's list of cards in one lane ("Doing, Ada Lovelace"). */
  kanbanCell: (params: { column: string; lane: string }) => string;
  /** Announced after a move: the card's title, or a count of cards, and where they went. */
  kanbanMoved: (params: { count: number; item: string; column: string }) => string;
  /** TagField announcements: a tag added (or several, by count), removed, or taken back into the input to edit. */
  tagAdded: (params: { tag: string }) => string;
  tagsAdded: (params: { count: number }) => string;
  tagRemoved: (params: { tag: string }) => string;
  tagEditing: (params: { tag: string }) => string;
  /** Why a TagField refused a tag: already there, the `maxItems` limit, or not one of the suggestions. */
  tagDuplicate: (params: { tag: string }) => string;
  tagLimit: (params: { max: number }) => string;
  tagNotInList: (params: { tag: string }) => string;
  /** One announcement for a paste that added tags and refused some: the `tagsAdded` and refusal messages, joined. */
  tagsAddedWithRefusal: (params: { added: string; refusal: string }) => string;
  /** One invalid tag in a TagField's error list, with its `validateTag` message. */
  tagProblem: (params: { tag: string; message: string }) => string;
  /** Names a TileGrid's legend of statuses. */
  tileLegend: string;
  /** A TileGrid's limit, in its description ("Choose up to 3."). */
  tilesMax: (params: { max: number }) => string;
  /** Announced as tiles are chosen against a limit ("2 of 3 chosen"). */
  tilesChosen: (params: { count: number; max: number }) => string;
  /** Disclosure for secondary rows. */
  showMore: string;
  showLess: string;
  /** Read for a missing value (shown as an em dash). */
  notSet: string;
  /** Hint for a search field's keyboard shortcut. */
  searchShortcutHint: string;
  /** The Ctrl, Alt and Shift keys' names in shortcut hints off Apple devices, which show ⌘, ⌥ and ⇧ (Menubar). */
  modifierCtrl: string;
  modifierAlt: string;
  modifierShift: string;
  /** InlineEdit's edit button ("Edit Project name"): its label, or its text when it has no label. */
  inlineEditLabel: (params: { label: string }) => string;
  /** Announced after InlineEdit saves a change, with its label (or its new text). */
  inlineEditSaved: (params: { label: string }) => string;
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
  /** Names of a calendar's month and year Cyclers. */
  calendarMonth: string;
  calendarYear: string;
  /** A Cycler's arrows, which step to the previous or next value. */
  cyclePrevious: string;
  cycleNext: string;
  /** Page arrows in a Cycler's picker, when its options are grouped (years by decade, say). */
  cyclePreviousPage: string;
  cycleNextPage: string;
  /** An EventCalendar grid's default accessible name. */
  eventCalendarLabel: string;
  /** EventCalendar's month and agenda views, in its view switch (day and week use `scheduleViewDay` and `…Week`). */
  eventCalendarViewMonth: string;
  eventCalendarViewAgenda: string;
  /** Labels EventCalendar's all-day row, and an all-day event's time. */
  eventCalendarAllDay: string;
  /** A month day's accessible name: its date and how many events it has (`count` may be 0). */
  eventCalendarDay: (params: { date: string; count: number }) => string;
  /** An event's accessible name. */
  eventCalendarEvent: (params: { label: string; time: string; isLocked: boolean }) => string;
  /** The button on a day with more events than fit ("+3 more"). */
  eventCalendarMore: (params: { count: number }) => string;
  /** That button's accessible name, with the day. */
  eventCalendarMoreLabel: (params: { count: number; date: string }) => string;
  /** How to edit an event with the keyboard (an editable event's description). */
  eventCalendarEditHelp: string;
  /** How to add an event from a day with the keyboard. */
  eventCalendarCreateHelp: string;
  /** The label of the preview drawn while dragging out a new event. */
  eventCalendarNewEvent: string;
  /** Announced after an event moves or is resized. */
  eventCalendarEventChanged: (params: { label: string; time: string }) => string;
  /** A Carousel's role description (read as its kind, after its name). */
  carousel: string;
  /** The role description of each Carousel slide. */
  carouselSlide: string;
  /** Names each Carousel slide by its place: "3 of 10". */
  carouselSlideLabel: (params: { position: number; total: number }) => string;
  carouselPrevious: string;
  carouselNext: string;
  /** The Carousel's autoplay button, while stopped and while playing. */
  carouselPlay: string;
  carouselPause: string;
  /** Names the Carousel's dots or thumbnails. */
  carouselPicker: string;
  /** Names a Carousel dot or thumbnail by the slide it shows first, or by page when it moves a page at a time. */
  carouselGoToSlide: (params: { position: number; total: number }) => string;
  carouselGoToPage: (params: { position: number; total: number }) => string;
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
  // ActionBar, and DataTable's bulk-action bar (an ActionBar)
  /** How many items are selected, for example "3 selected". */
  selectedCount: (params: { count: number }) => string;
  clearSelection: string;
  /** Names the toolbar of actions for the selected items. */
  selectionActions: string;
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
  // GanttChart
  /** The chart's default accessible name. */
  ganttLabel: string;
  /** Names the task grid (and its pane's resize handle). */
  ganttTasks: string;
  /** Names the timeline grid (and its pane). */
  ganttTimeline: string;
  /** The task grid's column headers (with the common `start` and `end`). */
  ganttTaskColumn: string;
  ganttDuration: string;
  ganttProgress: string;
  /** The zoom choice's label, and each zoom's name. */
  ganttZoom: string;
  ganttZoomName: (params: { zoom: GanttZoom }) => string;
  ganttZoomIn: string;
  ganttZoomOut: string;
  /** Scrolls the timeline to today. */
  ganttToday: string;
  /** A quarter in the time scale's header ("Q4"). */
  ganttQuarter: (params: { quarter: number }) => string;
  /** Name a summary task's expand and collapse buttons. */
  ganttExpand: (params: { task: string }) => string;
  ganttCollapse: (params: { task: string }) => string;
  /** What a task is ("Summary task", "Milestone"). */
  ganttKind: (params: { kind: GanttTaskKind }) => string;
  /**
   * A task's accessible name in the timeline. `time` is its dates, `progress` the formatted percent, and `issues`
   * the dependencies its dates break (already joined), or empty.
   */
  ganttTaskName: (params: {
    label: string;
    kind: GanttTaskKind;
    time: string;
    progress: string;
    issues: string;
    isCritical: boolean;
    isLocked: boolean;
  }) => string;
  /** A task's time when it has no valid dates. */
  ganttNoDates: string;
  /** How much of a task is done ("40% done"); `percent` is formatted. */
  ganttDone: (params: { percent: string }) => string;
  /** A dependency type's name ("Finish to start"). */
  ganttDependencyType: (params: { type: GanttDependencyType }) => string;
  /** A broken dependency, from the successor's side ("Starts before Design finishes"). */
  ganttViolation: (params: { task: string; type: GanttDependencyType }) => string;
  /** The details' lists of the tasks a task depends on, and the tasks that depend on it. */
  ganttPredecessors: string;
  ganttSuccessors: string;
  /** Names a dependency's remove button. */
  ganttRemoveDependency: (params: { from: string; to: string }) => string;
  /** The details' menu of dependency types that starts linking the task to another. */
  ganttAddDependency: string;
  /** Shown and announced while choosing the task to link to. */
  ganttLinkPrompt: (params: { task: string; type: GanttDependencyType }) => string;
  /** Announced after a dependency is made. */
  ganttLinked: (params: { from: string; to: string; type: GanttDependencyType }) => string;
  /** How to edit a task with the keyboard (an editable task's description). */
  ganttEditHelp: string;
  /** Announced after a task moves, is resized or has its progress changed. */
  ganttTaskChanged: (params: { label: string; time: string; progress: string }) => string;
  /** Announced when a locked task can't be changed, and its details' note. */
  ganttTaskLocked: (params: { label: string }) => string;
  ganttLocked: string;
  /** Marks a task on the critical path in its details. */
  ganttCritical: string;
  /** Shown when there are no tasks. */
  ganttEmpty: string;
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
  /** Turns on selection in the phone card list. */
  select: string;
  /** The default name of a table's search field. */
  search: string;
  showRowDetails: (params: { row: string }) => string;
  /** A tree row's expand toggle, and the name of its children's list on phones. */
  childRows: (params: { row: string }) => string;
  /** Shown in place of a tree row's children when they couldn't load (with Retry). */
  childRowsFailed: string;
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
  /** Leaves the table view, where the toolbar's actions are shown in a host's menu. */
  viewAsChart: string;
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
  /** A value axis's title in a generated summary ("Axis: Score."). */
  valueAxisTitle: (params: { title: string }) => string;
  /** A heatmap cell's name: "Newton’s laws, week of Oct 5, 71%". */
  heatmapCell: (params: { row: string; column: string; value: string }) => string;
  /** A heatmap's generated summary, and its lowest and highest cells. */
  heatmapSummary: (params: { rows: number; columns: number }) => string;
  heatmapLowest: (params: { cell: string }) => string;
  heatmapHighest: (params: { cell: string }) => string;
  /** Names the scale legend. */
  heatmapScale: string;
  /** Under a calendar heatmap with no activity in its range. */
  calendarNoActivity: string;
  /** A calendar heatmap day's name ("Wed, Oct 8, 2026, 3 sessions"). */
  calendarDay: (params: { date: string; value: string }) => string;
  /** A diverging scale's centre in the legend ("Midpoint: 70%"). */
  heatmapMidpoint: (params: { value: string }) => string;
  /** Shown when a heatmap scrolls sideways on a narrow screen. */
  heatmapScrollHint: string;
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

/** Strings for `/code`. */
export interface CodeMessages {
  /** The toggle that wraps long lines. */
  wrapLines: string;
  /** Announced when copying fails. */
  codeCopyFailed: string;
}

/** Strings for `/markdown`. */
export interface MarkdownMessages {
  /** Read after a link that opens in a new tab. */
  opensInNewTab: string;
  /** Names a fenced code block by its language ("json code"), or "Code". */
  codeBlockLabel: (params: { language: string }) => string;
  /** Names a table's scrolling region. */
  markdownTable: string;
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
  /** Cooperative gestures' hints: zooming with the wheel on Windows and Linux, and on macOS. */
  mapZoomHint: string;
  mapZoomHintMac: string;
  /** Cooperative gestures' hint on touch screens. */
  mapTouchHint: string;
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

/** Strings for FlagPicker. */
export interface FlagPickerMessages {
  /** Names the search field above the flags. */
  searchCountries: string;
  /** Shown in the trigger when nothing is chosen. */
  noCountry: string;
}

/** Every string the library uses, for overriding through `UIProvider`. */
export type Messages = CoreMessages &
  FlagPickerMessages &
  SecretRevealMessages &
  JsonEditorMessages &
  TemplateEditorMessages &
  FormMessages &
  TableMessages &
  ChartMessages &
  ShellMessages &
  MapMessages &
  CodeMessages &
  MarkdownMessages &
  ModelViewerMessages &
  CanvasMessages &
  ChatMessages &
  ChartAnnotationMessages &
  ChartPlotMessages &
  CodesMessages &
  ActivityTimelineMessages &
  AvatarMessages &
  CidrFieldMessages &
  CommandPaletteMessages &
  CopyFieldMessages &
  KeyValueEditorMessages &
  KnobMessages &
  MoneyFieldMessages &
  PaginationMessages &
  PriceTickerMessages &
  PropertyInspectorMessages &
  RolloutProgressMessages &
  RuleBuilderMessages &
  ScheduleTimelineMessages &
  SegmentedMeterMessages &
  SlugFieldMessages &
  SplitViewMessages &
  TextFieldMessages &
  TreeMessages &
  UnitFieldMessages &
  UptimeBarMessages &
  WorldClockMessages &
  DicomMessages &
  DiffMessages &
  EditorMessages &
  FinanceMessages &
  GraphMessages &
  OrgChartMessages &
  LogViewerMessages &
  ChoroplethMessages &
  MarkdownEditorMessages &
  MathMessages &
  MediaFilesMessages &
  MediaImageMessages &
  MediaPlayerMessages &
  MusicMessages &
  NotificationMessages &
  EditableTableMessages &
  FlowsheetMessages &
  SpreadsheetMessages &
  TerminalMessages &
  DashboardMessages;

/**
 * The English defaults of every core string. Components don't use this (each ships only the groups it needs, see
 * coreStrings.ts); it's for apps that want the full set, such as a translation starting point.
 */
export const defaultMessages: CoreMessages = {
  ...commonStrings,
  ...stepperStrings,
  ...trendStrings,
  ...breadcrumbStrings,
  ...anchorNavStrings,
  ...confirmStrings,
  ...textFieldStrings,
  ...modifierKeyStrings,
  ...inlineEditStrings,
  ...ratingStrings,
  ...oneTimeCodeStrings,
  ...maskedFieldStrings,
  ...feedbackStrings,
  ...timerStrings,
  ...reorderStrings,
  ...listViewStrings,
  ...transferStrings,
  ...kanbanStrings,
  ...tagFieldStrings,
  ...tileStrings,
  ...timeRangeStrings,
  ...fileStrings,
  ...calendarStrings,
  ...eventCalendarStrings,
  ...carouselStrings,
  ...pickerStrings,
  ...rangeEditorStrings,
  ...selectionStrings,
  ...ganttStrings,
};
