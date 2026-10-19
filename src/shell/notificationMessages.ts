// Strings for NotificationCenter and NotificationBell (merged into `/shell`'s strings by `useShellMessages`).

/** Strings for NotificationCenter and NotificationBell. */
export interface NotificationMessages {
  /** The notification center's name, and the drawer's title. */
  notificationCenterTitle: string;
  /** The bell's accessible name, with the unread count. */
  notificationBell: (params: { count: number }) => string;
  /** The count shown on the bell's badge (a cap such as "99+" keeps it short). */
  notificationBadgeCount: (params: { count: number }) => string;
  /** Names the filter tabs (All, Mentions, Alerts…). */
  notificationFilters: string;
  /** The unread count beside "Mark all read". */
  notificationUnreadCount: (params: { count: number }) => string;
  /** Marks every notification read. */
  notificationMarkAllRead: string;
  /** Marks one notification read. */
  notificationMarkRead: string;
  /** Read by screen readers at the start of an unread notification. */
  notificationUnread: string;
  /** The empty state's title. */
  notificationsEmpty: string;
  /** The empty state's hint. */
  notificationsEmptyHint: string;
  /** Announced when one new notification arrives while the center is closed. */
  notificationNew: (params: { title: string }) => string;
  /** Announced when several new notifications arrive while the center is closed. */
  notificationsNew: (params: { count: number }) => string;
}

export const defaultNotificationMessages: NotificationMessages = {
  notificationCenterTitle: 'Notifications',
  notificationBell: ({ count }) =>
    count === 0 ? 'Notifications' : `Notifications, ${String(count)} unread`,
  notificationBadgeCount: ({ count }) => (count > 99 ? '99+' : String(count)),
  notificationFilters: 'Filter notifications',
  notificationUnreadCount: ({ count }) => (count === 0 ? 'All read' : `${String(count)} unread`),
  notificationMarkAllRead: 'Mark all read',
  notificationMarkRead: 'Mark as read',
  notificationUnread: 'Unread',
  notificationsEmpty: 'No notifications',
  notificationsEmptyHint: 'You’re all caught up.',
  notificationNew: ({ title }) => `New notification: ${title}`,
  notificationsNew: ({ count }) => `${String(count)} new notifications`,
};
