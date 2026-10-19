// Deterministic notifications for the NotificationCenter and NotificationBell stories and tests.
import { useState } from 'react';
import type { NotificationItem } from '../src/shell/NotificationCenter';
import { ACTIVITY_NOW, people } from './people';

/** The instant the notification stories and tests treat as "now" (the same as the activity stories'). */
export const NOTIFICATIONS_NOW = ACTIVITY_NOW;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export type NotificationKind = 'mention' | 'alert' | 'job';

/** A notification with the kind the stories filter on (All / Mentions / Alerts). */
export type SampleNotification = NotificationItem & { kind: NotificationKind };

const alerts = [
  { title: 'Dome humidity above 85%', tone: 'warning' },
  { title: 'Spectrometer 2 stopped responding', tone: 'danger' },
  { title: 'Weather station back online', tone: 'success' },
] as const;

const jobs = [
  'Night log export finished',
  'Calibration run finished',
  'Archive backup finished',
  'Star catalogue import finished',
];

const mentions = [
  'mentioned you in Night log, Oct 12',
  'replied to your comment on Telescope array',
  'assigned you to North dome maintenance',
];

/**
 * `count` notifications, newest first, in three groups: 10 today, 15 yesterday and the rest earlier. The first
 * `unread` are unread. Kinds cycle mention, alert, job.
 */
export function sampleNotifications(
  count = 50,
  unread = 8,
  now: number = NOTIFICATIONS_NOW,
): SampleNotification[] {
  return Array.from({ length: count }, (_, index) => {
    const group = index < 10 ? 'Today' : index < 25 ? 'Yesterday' : 'Earlier';
    const at =
      index < 10
        ? now - (index + 1) * 25 * MINUTE
        : index < 25
          ? now - DAY - (index - 10) * 40 * MINUTE
          : now - 2 * DAY - (index - 25) * 5 * HOUR;
    const base = { id: `n-${String(index)}`, at, group, isRead: index >= unread };
    const kind = (['mention', 'alert', 'job'] as const)[index % 3] ?? 'job';
    if (kind === 'mention') {
      const person = people[index % people.length] ?? people[0];
      const text = mentions[index % mentions.length] ?? '';
      return {
        ...base,
        kind,
        title: `${person.name} ${text}`,
        body: 'Could you check the readings before tonight’s session?',
        actor: { name: person.name, avatarSrc: 'src' in person ? person.src : undefined },
        href: `#/notifications/${String(index)}`,
      };
    }
    if (kind === 'alert') {
      const alert = alerts[index % alerts.length] ?? alerts[0];
      return { ...base, kind, title: alert.title, tone: alert.tone };
    }
    return {
      ...base,
      kind,
      title: jobs[index % jobs.length] ?? '',
      body: `Job ${String(1000 + index)} completed in ${String(2 + (index % 7))} minutes.`,
      tone: 'info',
    };
  });
}

/** The filter tabs the stories use. */
export const notificationFilters = [
  { id: 'all', label: 'All' },
  { id: 'mention', label: 'Mentions' },
  { id: 'alert', label: 'Alerts' },
] as const;

/** The items a filter shows. */
export function filterNotifications(
  items: readonly SampleNotification[],
  filter: string,
): SampleNotification[] {
  return filter === 'all' ? [...items] : items.filter((item) => item.kind === filter);
}

/**
 * The state an app keeps for a NotificationBell or NotificationCenter, over `initial` items: read and dismissed
 * notifications, the filter, and paging (`pageSize` at a time, all at once without it). Spread `props` onto the
 * component; `add` puts a new notification at the top.
 */
export function useSampleNotifications(initial: readonly SampleNotification[], pageSize?: number) {
  const [all, setAll] = useState<SampleNotification[]>(() => [...initial]);
  const [filter, setFilter] = useState('all');
  const [shown, setShown] = useState(pageSize ?? Infinity);
  const matching = filterNotifications(all, filter);
  return {
    all,
    add: (item: SampleNotification) => {
      setAll((items) => [item, ...items]);
      setShown((count) => count + 1);
    },
    props: {
      items: matching.slice(0, shown),
      unreadCount: all.filter((item) => !item.isRead).length,
      filters: notificationFilters,
      selectedFilter: filter,
      onFilterChange: setFilter,
      hasMore: matching.length > shown,
      onLoadMore: () => {
        setShown((count) => count + (pageSize ?? 0));
      },
      onMarkRead: (ids: string[]) => {
        setAll((items) =>
          items.map((item) => (ids.includes(item.id) ? { ...item, isRead: true } : item)),
        );
      },
      onMarkAllRead: () => {
        setAll((items) => items.map((item) => ({ ...item, isRead: true })));
      },
      onDismiss: (id: string) => {
        setAll((items) => items.filter((item) => item.id !== id));
      },
    },
  };
}
