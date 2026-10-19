// English defaults of ActivityTimeline's strings. It also uses the core `details` and `loadMore`.

/** Strings for ActivityTimeline. */
export interface ActivityTimelineMessages {
  /** The heading over today's items. */
  activityToday: string;
  /** The heading over yesterday's items. */
  activityYesterday: string;
  /** The default empty state's title. */
  activityEmpty: string;
}

export const defaultActivityTimelineMessages: ActivityTimelineMessages = {
  activityToday: 'Today',
  activityYesterday: 'Yesterday',
  activityEmpty: 'No activity yet',
};
