// English defaults of ScheduleTimeline's strings. It also uses the core `now`, `details` and `close`.

/** Strings for ScheduleTimeline. */
export interface ScheduleTimelineMessages {
  /** The grid's default accessible name. */
  scheduleLabel: string;
  /** The heading of the lane column. */
  scheduleLanes: string;
  /** The heading of the time column (the axis). */
  scheduleTimeAxis: string;
  /** Names the day / week / custom choice. */
  scheduleView: string;
  scheduleViewDay: string;
  scheduleViewWeek: string;
  scheduleViewCustom: string;
  /** The custom view's length field. */
  scheduleDays: string;
  /** Moves the range back by its own length. */
  schedulePrevious: string;
  /** Moves the range forward by its own length. */
  scheduleNext: string;
  /** Moves the range to the one containing now. */
  scheduleToday: string;
  /** A start and end time, such as "14:00 to 15:30". */
  scheduleTimeRange: (params: { start: string; end: string }) => string;
  /**
   * An item's accessible name. `conflicts` lists the items it overlaps (already joined, such as "A and B"), or is
   * empty.
   */
  scheduleItem: (params: {
    lane: string;
    label: string;
    time: string;
    conflicts: string;
    isLocked: boolean;
  }) => string;
  /** Labels the conflict marker and the agenda's conflict note. */
  scheduleConflictsWith: (params: { items: string }) => string;
  /** Labels a locked item's lock icon. */
  scheduleLocked: string;
  /** How to edit an item with the keyboard (an editable item's description). */
  scheduleEditHelp: string;
  /** How to add an item from a lane's header with the keyboard. */
  scheduleCreateHelp: string;
  /** Announced after an item moves or is resized. */
  scheduleItemChanged: (params: { label: string; lane: string; time: string }) => string;
  /** Announced when a locked item can't be moved. */
  scheduleItemLocked: (params: { label: string }) => string;
  /** The label of the preview drawn while dragging out a new item. */
  scheduleNewItem: string;
  /** The agenda's note for a lane with nothing in the range. */
  scheduleLaneEmpty: string;
}

export const defaultScheduleTimelineMessages: ScheduleTimelineMessages = {
  scheduleLabel: 'Schedule',
  scheduleLanes: 'Lanes',
  scheduleTimeAxis: 'Time',
  scheduleView: 'View',
  scheduleViewDay: 'Day',
  scheduleViewWeek: 'Week',
  scheduleViewCustom: 'Custom',
  scheduleDays: 'Days',
  schedulePrevious: 'Previous',
  scheduleNext: 'Next',
  scheduleToday: 'Today',
  scheduleTimeRange: ({ start, end }) => `${start} to ${end}`,
  scheduleItem: ({ lane, label, time, conflicts, isLocked }) =>
    [
      lane,
      label,
      time,
      conflicts === '' ? '' : `conflicts with ${conflicts}`,
      isLocked ? 'locked' : '',
    ]
      .filter((part) => part !== '')
      .join(', '),
  scheduleConflictsWith: ({ items }) => `Conflicts with ${items}`,
  scheduleLocked: 'Locked',
  scheduleEditHelp:
    'Alt and the arrow keys move it; Alt, Shift and Left or Right change its length.',
  scheduleCreateHelp: 'Press Enter to add an item to this lane.',
  scheduleItemChanged: ({ label, lane, time }) => `${label} moved to ${lane}, ${time}`,
  scheduleItemLocked: ({ label }) => `${label} is locked`,
  scheduleNewItem: 'New item',
  scheduleLaneEmpty: 'Nothing scheduled',
};
