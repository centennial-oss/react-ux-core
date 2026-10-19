// The English defaults of the core strings (`CoreMessages`), in groups by feature. `commonStrings` are shared by many
// components and come with every one (UIProvider puts them in context); each other group ships only with the
// components that use it, which pass it to `useEntryMessages`. Keep every group a plain constant with no references
// between groups: bundlers can then leave out the groups a bundle never uses. `defaultMessages` (all of them
// together) lives in messages.ts, a separate module, for the same reason.

import type { GanttDependencyType, GanttTaskKind, GanttZoom } from '../components/GanttChart/types';
import type { CoreMessages, StepperStatus } from './messages';

type Strings<K extends keyof CoreMessages> = Pick<CoreMessages, K>;

/** Strings shared by many components; always in context. */
export type CommonMessages = Strings<
  | 'close'
  | 'cancel'
  | 'save'
  | 'revert'
  | 'delete'
  | 'clearAll'
  | 'loadMore'
  | 'loading'
  | 'dismiss'
  | 'remove'
  | 'noData'
  | 'moreActions'
  | 'moreOptions'
  | 'retry'
  | 'details'
  | 'genericError'
  | 'copy'
  | 'copied'
  | 'notSet'
  | 'noResults'
  | 'loadError'
  | 'selectPlaceholder'
  | 'clearValue'
  | 'moreInformation'
  | 'notifications'
  | 'showMore'
  | 'showLess'
  | 'yes'
  | 'no'
  | 'export'
  | 'loadFailed'
  | 'value'
  | 'start'
  | 'end'
  | 'from'
  | 'to'
  | 'summary'
  | 'confirm'
  | 'back'
  | 'next'
  | 'moveUp'
  | 'moveDown'
  | 'itemMovedTo'
  | 'removeRow'
  | 'range'
>;

export const commonStrings: CommonMessages = {
  close: 'Close',
  cancel: 'Cancel',
  save: 'Save',
  revert: 'Revert',
  delete: 'Delete',
  clearAll: 'Clear all',
  loadMore: 'Load more',
  loading: 'Loading',
  dismiss: 'Dismiss',
  remove: 'Remove',
  noData: 'No data',
  moreActions: 'More actions',
  moreOptions: 'More options',
  retry: 'Retry',
  details: 'Details',
  genericError: 'Something went wrong. Please try again.',
  copy: 'Copy',
  copied: 'Copied',
  notSet: 'Not set',
  noResults: 'No results',
  loadError: 'Couldn’t load options',
  selectPlaceholder: 'Select…',
  clearValue: 'Clear',
  moreInformation: 'More information',
  notifications: 'Notifications',
  showMore: 'Show more',
  showLess: 'Show less',
  yes: 'Yes',
  no: 'No',
  export: 'Export',
  loadFailed: 'Couldn’t load the data',
  value: 'Value',
  start: 'Start',
  end: 'End',
  from: 'From',
  to: 'To',
  summary: 'Summary',
  confirm: 'Confirm',
  back: 'Back',
  next: 'Next',
  moveUp: ({ item }) => `Move ${item} up`,
  moveDown: ({ item }) => `Move ${item} down`,
  itemMovedTo: ({ item, position, total }) => `${item}, moved to position ${position} of ${total}`,
  removeRow: ({ range }) => `Remove ${range}`,
  range: ({ from, to }) => `${from}–${to}`,
};

const stepStatusWords: Record<StepperStatus | 'blocked', string> = {
  done: 'Done',
  current: 'Up next',
  upcoming: 'To do',
  error: 'Needs attention',
  skipped: 'Skipped',
  blocked: 'Blocked',
};

/** Stepper and StepDialog progress. */
export const stepperStrings: Strings<
  'stepOf' | 'steps' | 'stepStatus' | 'stepProgress' | 'stepOptional'
> = {
  stepOf: ({ step, total }) => `Step ${step} of ${total}`,
  steps: 'Steps',
  stepStatus: ({ status }) => stepStatusWords[status],
  stepProgress: ({ done, total }) => `${done} of ${total} done`,
  stepOptional: 'Optional',
};

/** Sparkline summaries and StatTile or PriceTicker changes. */
export const trendStrings: Strings<'sparklineSummary' | 'deltaUp' | 'deltaDown' | 'deltaFlat'> = {
  sparklineSummary: ({ count, min, max, latest }) =>
    `${count} values from ${min} to ${max}, latest ${latest}`,
  deltaUp: ({ value }) => `Up ${value}`,
  deltaDown: ({ value }) => `Down ${value}`,
  deltaFlat: ({ value }) => `Unchanged ${value}`,
};

/** Breadcrumbs. */
export const breadcrumbStrings: Strings<'breadcrumbs' | 'showHiddenBreadcrumbs'> = {
  breadcrumbs: 'Breadcrumbs',
  showHiddenBreadcrumbs: 'Show hidden breadcrumbs',
};

/** AnchorNav. */
export const anchorNavStrings: Strings<'onThisPage'> = {
  onThisPage: 'On this page',
};

/** ConfirmDialog's typed confirmation. */
export const confirmStrings: Strings<'typeToConfirm'> = {
  typeToConfirm: ({ text }) => `Type ${text} to confirm`,
};

/** TextField, TextArea and SearchField extras. */
export const textFieldStrings: Strings<
  'showPassword' | 'hidePassword' | 'characterCount' | 'searchShortcutHint'
> = {
  showPassword: 'Show password',
  hidePassword: 'Hide password',
  characterCount: ({ count, max }) => `${count} / ${max}`,
  searchShortcutHint: 'Press / to search',
};

/** The modifier keys' names in shortcut hints off Apple devices (Menubar). */
export const modifierKeyStrings: Strings<'modifierCtrl' | 'modifierAlt' | 'modifierShift'> = {
  modifierCtrl: 'Ctrl',
  modifierAlt: 'Alt',
  modifierShift: 'Shift',
};

/** InlineEdit. */
export const inlineEditStrings: Strings<'inlineEditLabel' | 'inlineEditSaved'> = {
  inlineEditLabel: ({ label }) => `Edit ${label}`,
  inlineEditSaved: ({ label }) => `${label} saved`,
};

/** Rating. */
export const ratingStrings: Strings<'ratingValue' | 'ratingNone'> = {
  ratingValue: ({ value, max }) => `${value} out of ${max}`,
  ratingNone: 'No rating',
};

/** OneTimeCodeField. */
export const oneTimeCodeStrings: Strings<'oneTimeCodeLength'> = {
  oneTimeCodeLength: ({ length, isDigits }) =>
    isDigits ? `${length}-digit code` : `${length}-character code`,
};

/** MaskedField, and the form's `masked` fields. */
export const maskedFieldStrings: Strings<'maskedFieldLength' | 'maskedFieldIncomplete'> = {
  maskedFieldLength: ({ min, max, isDigits }) => {
    const count = min === max ? String(max) : `${String(min)} to ${String(max)}`;
    const noun = isDigits ? 'digit' : 'character';
    return `${count} ${max === 1 ? noun : `${noun}s`}`;
  },
  maskedFieldIncomplete: 'Enter the complete value',
};

/** Option feedback words. */
export const feedbackStrings: Strings<
  'feedbackCorrect' | 'feedbackIncorrect' | 'feedbackWarning' | 'feedbackNote'
> = {
  feedbackCorrect: 'Correct',
  feedbackIncorrect: 'Incorrect',
  feedbackWarning: 'Warning',
  feedbackNote: 'Note',
};

/** Timer. */
export const timerStrings: Strings<'timeLeft' | 'timeElapsed' | 'timeUp' | 'timerPaused'> = {
  timeLeft: ({ time }) => `${time} left`,
  timeElapsed: ({ time }) => `${time} elapsed`,
  timeUp: 'Time is up',
  timerPaused: 'Paused',
};

/** ReorderableList's drag handle. */
export const reorderStrings: Strings<'dragItem'> = {
  dragItem: ({ item }) => `Drag ${item}`,
};

/** ListView. */
export const listViewStrings: Strings<'listEmpty' | 'listItemActions'> = {
  listEmpty: 'No items',
  listItemActions: ({ item }) => `Actions for ${item}`,
};

/** TransferList. */
export const transferStrings: Strings<
  | 'transferAvailable'
  | 'transferChosen'
  | 'transferMove'
  | 'transferMoveAll'
  | 'transferSearch'
  | 'transferSelectAll'
  | 'transferSelectedCount'
  | 'transferMoved'
> = {
  transferAvailable: 'Available',
  transferChosen: 'Chosen',
  transferMove: ({ list }) => `Move selected to ${list}`,
  transferMoveAll: ({ list }) => `Move all to ${list}`,
  transferSearch: ({ list }) => `Search ${list}`,
  transferSelectAll: ({ list }) => `Select all in ${list}`,
  transferSelectedCount: ({ count, total }) => `${count} of ${total} selected`,
  transferMoved: ({ count, list }) => `${count} moved to ${list}`,
};

/** KanbanBoard. */
export const kanbanStrings: Strings<
  | 'kanbanEmpty'
  | 'kanbanCount'
  | 'kanbanLimit'
  | 'kanbanOverLimit'
  | 'kanbanLimitShort'
  | 'kanbanCollapse'
  | 'kanbanExpand'
  | 'kanbanAddCard'
  | 'kanbanMoveTo'
  | 'kanbanMoveToLane'
  | 'kanbanCell'
  | 'kanbanMoved'
> = {
  kanbanEmpty: 'No cards',
  kanbanCount: ({ count }) => (count === 1 ? '1 card' : `${count} cards`),
  kanbanLimit: ({ count, limit }) => `${count} of ${limit} cards`,
  kanbanOverLimit: ({ count, limit }) => `${count} cards, over the limit of ${limit}`,
  kanbanLimitShort: ({ count, limit }) => `${count} / ${limit}`,
  kanbanCollapse: ({ column }) => `Collapse ${column}`,
  kanbanExpand: ({ column }) => `Expand ${column}`,
  kanbanAddCard: 'Add card',
  kanbanMoveTo: 'Move to',
  kanbanMoveToLane: 'Move to lane',
  kanbanCell: ({ column, lane }) => `${column}, ${lane}`,
  kanbanMoved: ({ count, item, column }) =>
    count === 1 ? `${item} moved to ${column}` : `${count} cards moved to ${column}`,
};

/** TagField. */
export const tagFieldStrings: Strings<
  | 'tagAdded'
  | 'tagsAdded'
  | 'tagRemoved'
  | 'tagEditing'
  | 'tagDuplicate'
  | 'tagLimit'
  | 'tagNotInList'
  | 'tagsAddedWithRefusal'
  | 'tagProblem'
> = {
  tagAdded: ({ tag }) => `Added ${tag}`,
  tagsAdded: ({ count }) => `Added ${count}`,
  tagRemoved: ({ tag }) => `Removed ${tag}`,
  tagEditing: ({ tag }) => `Editing ${tag}`,
  tagDuplicate: ({ tag }) => `“${tag}” is already added`,
  tagLimit: ({ max }) => `You can add up to ${max}`,
  tagNotInList: ({ tag }) => `“${tag}” isn’t one of the options`,
  tagsAddedWithRefusal: ({ added, refusal }) => `${added}. ${refusal}`,
  tagProblem: ({ tag, message }) => `${tag}: ${message}`,
};

/** TilePicker. */
export const tileStrings: Strings<'tileLegend' | 'tilesMax' | 'tilesChosen'> = {
  tileLegend: 'Legend',
  tilesMax: ({ max }) => `Choose up to ${max}.`,
  tilesChosen: ({ count, max }) => `${count} of ${max} chosen`,
};

/** TimeRangePicker. */
export const timeRangeStrings: Strings<
  | 'apply'
  | 'now'
  | 'timeRange'
  | 'timeRangeAmount'
  | 'timeRangeUnit'
  | 'timeRangePresets'
  | 'timeRangeRelative'
  | 'timeRangeAbsolute'
  | 'timeRangeLastHour'
  | 'timeRangeLast24Hours'
  | 'timeRangeLast7Days'
  | 'timeRangeLast30Days'
  | 'timeRangeThisMonth'
  | 'timeRangeLast'
> = {
  apply: 'Apply',
  now: 'Now',
  timeRange: 'Time range',
  timeRangeAmount: 'Amount',
  timeRangeUnit: 'Unit',
  timeRangePresets: 'Presets',
  timeRangeRelative: 'Relative',
  timeRangeAbsolute: 'Absolute',
  timeRangeLastHour: 'Last hour',
  timeRangeLast24Hours: 'Last 24 hours',
  timeRangeLast7Days: 'Last 7 days',
  timeRangeLast30Days: 'Last 30 days',
  timeRangeThisMonth: 'This month',
  timeRangeLast: ({ amount }) => `Last ${amount}`,
};

/** FileField and file uploads. */
export const fileStrings: Strings<
  | 'dropFiles'
  | 'chooseFiles'
  | 'fileTooLarge'
  | 'fileTypeNotAccepted'
  | 'tooManyFiles'
  | 'uploading'
  | 'uploadFailed'
  | 'cancelUpload'
  | 'uploaded'
> = {
  dropFiles: 'Drop files here',
  chooseFiles: 'Choose files',
  fileTooLarge: ({ name, max }) => `${name} is larger than ${max}`,
  fileTypeNotAccepted: ({ name }) => `${name} isn’t an accepted file type`,
  tooManyFiles: ({ max }) => `Choose up to ${max} files`,
  uploading: ({ name }) => `Uploading ${name}`,
  uploadFailed: ({ name }) => `${name} couldn’t be uploaded`,
  cancelUpload: 'Cancel upload',
  uploaded: 'Uploaded',
};

/** Calendars, date pickers and Cycler. */
export const calendarStrings: Strings<
  | 'dateRangeTooLong'
  | 'calendarMonth'
  | 'calendarYear'
  | 'cyclePrevious'
  | 'cycleNext'
  | 'cyclePreviousPage'
  | 'cycleNextPage'
> = {
  dateRangeTooLong: ({ max }) => `Choose a range of ${max} days or fewer`,
  calendarMonth: 'Month',
  calendarYear: 'Year',
  cyclePrevious: 'Previous',
  cycleNext: 'Next',
  cyclePreviousPage: 'Previous page',
  cycleNextPage: 'Next page',
};

/** EventCalendar (which also uses ScheduleTimeline's strings, and the calendar Cyclers'). */
export const eventCalendarStrings: Strings<
  | 'eventCalendarLabel'
  | 'eventCalendarViewMonth'
  | 'eventCalendarViewAgenda'
  | 'eventCalendarAllDay'
  | 'eventCalendarDay'
  | 'eventCalendarEvent'
  | 'eventCalendarMore'
  | 'eventCalendarMoreLabel'
  | 'eventCalendarEditHelp'
  | 'eventCalendarCreateHelp'
  | 'eventCalendarNewEvent'
  | 'eventCalendarEventChanged'
> = {
  eventCalendarLabel: 'Calendar',
  eventCalendarViewMonth: 'Month',
  eventCalendarViewAgenda: 'Agenda',
  eventCalendarAllDay: 'All day',
  eventCalendarDay: ({ date, count }) =>
    count === 0 ? date : `${date}, ${count === 1 ? '1 event' : `${String(count)} events`}`,
  eventCalendarEvent: ({ label, time, isLocked }) =>
    [label, time, isLocked ? 'locked' : ''].filter((part) => part !== '').join(', '),
  eventCalendarMore: ({ count }) => `+${String(count)} more`,
  eventCalendarMoreLabel: ({ count, date }) => `${String(count)} more on ${date}`,
  eventCalendarEditHelp:
    'Alt and the arrow keys move it; Alt, Shift and the arrow keys change when it ends.',
  eventCalendarCreateHelp: 'Press Enter to add an event.',
  eventCalendarNewEvent: 'New event',
  eventCalendarEventChanged: ({ label, time }) => `${label} moved to ${time}`,
};

/** Carousel. */
export const carouselStrings: Strings<
  | 'carousel'
  | 'carouselSlide'
  | 'carouselSlideLabel'
  | 'carouselPrevious'
  | 'carouselNext'
  | 'carouselPlay'
  | 'carouselPause'
  | 'carouselPicker'
  | 'carouselGoToSlide'
  | 'carouselGoToPage'
> = {
  carousel: 'carousel',
  carouselSlide: 'slide',
  carouselSlideLabel: ({ position, total }) => `${position} of ${total}`,
  carouselPrevious: 'Previous slide',
  carouselNext: 'Next slide',
  carouselPlay: 'Start automatic slide show',
  carouselPause: 'Stop automatic slide show',
  carouselPicker: 'Choose slide',
  carouselGoToSlide: ({ position, total }) => `Slide ${position} of ${total}`,
  carouselGoToPage: ({ position, total }) => `Page ${position} of ${total}`,
};

/** ColorField and IconPicker. */
export const pickerStrings: Strings<'customColor' | 'hexColor' | 'searchIcons' | 'noIcon'> = {
  customColor: 'Custom colour',
  hexColor: 'Hex',
  searchIcons: 'Search icons',
  noIcon: 'No icon',
};

/** ActionBar. */
export const selectionStrings: Strings<'selectedCount' | 'clearSelection' | 'selectionActions'> = {
  selectedCount: ({ count }) => `${count} selected`,
  clearSelection: 'Clear selection',
  selectionActions: 'Actions for selected items',
};

/** ScheduleEditor and TierEditor. */
export const rangeEditorStrings: Strings<
  | 'openRange'
  | 'addPeriod'
  | 'addTier'
  | 'endBeforeStart'
  | 'overlaps'
  | 'gapBetween'
  | 'notCovered'
  | 'scheduleSegment'
  | 'schedulePreview'
  | 'noUpperLimit'
  | 'tierShouldStartAt'
  | 'tierEndAfterStart'
  | 'tierOnlyLastOpen'
> = {
  openRange: ({ from }) => `${from} and above`,
  addPeriod: 'Add period',
  addTier: 'Add tier',
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

const ganttZoomWords: Record<GanttZoom, string> = {
  hour: 'Hours',
  day: 'Days',
  week: 'Weeks',
  month: 'Months',
  quarter: 'Quarters',
};

const ganttKindWords: Record<GanttTaskKind, string> = {
  task: 'Task',
  summary: 'Summary task',
  milestone: 'Milestone',
};

const ganttTypeWords: Record<GanttDependencyType, string> = {
  'finish-to-start': 'Finish to start',
  'start-to-start': 'Start to start',
  'finish-to-finish': 'Finish to finish',
  'start-to-finish': 'Start to finish',
};

const ganttViolationWords: Record<GanttDependencyType, (task: string) => string> = {
  'finish-to-start': (task) => `Starts before ${task} finishes`,
  'start-to-start': (task) => `Starts before ${task} starts`,
  'finish-to-finish': (task) => `Finishes before ${task} finishes`,
  'start-to-finish': (task) => `Finishes before ${task} starts`,
};

/** GanttChart. */
export const ganttStrings: Strings<
  | 'ganttLabel'
  | 'ganttTasks'
  | 'ganttTimeline'
  | 'ganttTaskColumn'
  | 'ganttDuration'
  | 'ganttProgress'
  | 'ganttZoom'
  | 'ganttZoomName'
  | 'ganttZoomIn'
  | 'ganttZoomOut'
  | 'ganttToday'
  | 'ganttQuarter'
  | 'ganttExpand'
  | 'ganttCollapse'
  | 'ganttKind'
  | 'ganttTaskName'
  | 'ganttNoDates'
  | 'ganttDone'
  | 'ganttDependencyType'
  | 'ganttViolation'
  | 'ganttPredecessors'
  | 'ganttSuccessors'
  | 'ganttRemoveDependency'
  | 'ganttAddDependency'
  | 'ganttLinkPrompt'
  | 'ganttLinked'
  | 'ganttEditHelp'
  | 'ganttTaskChanged'
  | 'ganttTaskLocked'
  | 'ganttLocked'
  | 'ganttCritical'
  | 'ganttEmpty'
> = {
  ganttLabel: 'Project schedule',
  ganttTasks: 'Tasks',
  ganttTimeline: 'Timeline',
  ganttTaskColumn: 'Task',
  ganttDuration: 'Duration',
  ganttProgress: 'Progress',
  ganttZoom: 'Zoom',
  ganttZoomName: ({ zoom }) => ganttZoomWords[zoom],
  ganttZoomIn: 'Zoom in',
  ganttZoomOut: 'Zoom out',
  ganttToday: 'Today',
  ganttQuarter: ({ quarter }) => `Q${String(quarter)}`,
  ganttExpand: ({ task }) => `Expand ${task}`,
  ganttCollapse: ({ task }) => `Collapse ${task}`,
  ganttKind: ({ kind }) => ganttKindWords[kind],
  ganttTaskName: ({ label, kind, time, progress, issues, isCritical, isLocked }) =>
    [
      label,
      kind === 'task' ? '' : ganttKindWords[kind].toLowerCase(),
      time,
      kind === 'milestone' ? '' : progress,
      issues,
      isCritical ? 'on the critical path' : '',
      isLocked ? 'locked' : '',
    ]
      .filter((part) => part !== '')
      .join(', '),
  ganttNoDates: 'No dates',
  ganttDone: ({ percent }) => `${percent} done`,
  ganttDependencyType: ({ type }) => ganttTypeWords[type],
  ganttViolation: ({ task, type }) => ganttViolationWords[type](task),
  ganttPredecessors: 'Depends on',
  ganttSuccessors: 'Needed by',
  ganttRemoveDependency: ({ from, to }) => `Remove the link from ${from} to ${to}`,
  ganttAddDependency: 'Link to a task',
  ganttLinkPrompt: ({ task, type }) =>
    `Choose the task ${task} links to (${ganttTypeWords[type].toLowerCase()}), then press Enter or tap it. Escape cancels.`,
  ganttLinked: ({ from, to, type }) =>
    `Linked ${from} to ${to}, ${ganttTypeWords[type].toLowerCase()}`,
  ganttEditHelp:
    'Alt and Left or Right move it; Alt, Shift and Left or Right change its length; Alt and Up or Down change its progress.',
  ganttTaskChanged: ({ label, time, progress }) => `${label}: ${time}, ${progress}`,
  ganttTaskLocked: ({ label }) => `${label} is locked`,
  ganttLocked: 'Locked',
  ganttCritical: 'On the critical path',
  ganttEmpty: 'No tasks yet',
};
