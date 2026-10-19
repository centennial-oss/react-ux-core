import { BellOff, Check, CircleCheck, CircleX, Info, TriangleAlert, X } from 'lucide-react';
import { useId, useMemo, useRef, type ReactNode, type Ref } from 'react';
import {
  GridList,
  GridListHeader,
  GridListItem,
  GridListSection,
  type Key,
} from 'react-aria-components';
import { Avatar } from '../components/Avatar/Avatar';
import { Button } from '../components/Button/Button';
import { EmptyState } from '../components/EmptyState/EmptyState';
import { IconButton } from '../components/IconButton/IconButton';
import { RelativeTime } from '../components/RelativeTime/RelativeTime';
import { Tab, TabList, TabPanel, Tabs } from '../components/Tabs/Tabs';
import { cn } from '../utils/cn';
import type { IconComponent } from '../utils/icon';
import { hoverSurfaceClasses } from '../utils/stateClasses';
import type { FeedbackTone } from '../utils/types';
import { useControllableState } from '../utils/useControllableState';
import { useShellMessages } from './messages';

/** One notification. */
export interface NotificationItem {
  /** Unique among the items. */
  id: string;
  title: ReactNode;
  /** A line or two of detail under the title. */
  body?: ReactNode;
  /** When it happened: a Date, epoch milliseconds or an ISO 8601 string. */
  at: Date | number | string;
  /** The icon and its colour when there's no `actor`. Defaults to `neutral`. */
  tone?: FeedbackTone;
  isRead: boolean;
  /** Where the notification leads. Opening it also marks it read. */
  href?: string;
  /** Who it's from: shown as an Avatar. */
  actor?: { name: string; avatarSrc?: string };
  /** The heading it's listed under ("Today", "Earlier", "Deploys"…). Groups keep the order they first appear in. */
  group?: string;
  /** Plain text for typeahead and announcements when `title` isn't a string. */
  textValue?: string;
}

/** A filter tab, such as All, Mentions or Alerts. */
export interface NotificationFilter {
  id: string;
  label: string;
}

export interface NotificationCenterProps {
  /** The notifications to show, newest first (the order is kept). Filtering is the app's: pass the matching items. */
  items: readonly NotificationItem[];
  /** Marks notifications read: from a row's "Mark as read" button, or when a row is opened. */
  onMarkRead?: (ids: string[]) => void;
  /** Marks every notification read. Without it, "Mark all read" calls `onMarkRead` with every unread id. */
  onMarkAllRead?: () => void;
  /** Removes a notification. Each row gets a Dismiss button when this is set. */
  onDismiss?: (id: string) => void;
  /** Asks for older notifications (a "Load more" button shows while `hasMore`). */
  onLoadMore?: () => void;
  /** Whether there are older notifications to load. */
  hasMore?: boolean;
  /** Older notifications are on their way: the button shows a spinner. */
  isLoadingMore?: boolean;
  /** Tabs such as All / Mentions / Alerts. */
  filters?: readonly NotificationFilter[];
  /** The selected filter's id. Controlled; see `defaultSelectedFilter`. */
  selectedFilter?: string;
  /** Defaults to the first filter. */
  defaultSelectedFilter?: string;
  onFilterChange?: (id: string) => void;
  /** How many notifications are unread, when `items` is only a page of them. Defaults to the unread `items`. */
  unreadCount?: number;
  /** Shown when there are no items. Defaults to an EmptyState saying "No notifications". */
  emptyState?: ReactNode;
  /** IANA time zone for the exact timestamps. Defaults to UIProvider's `timeZone`. */
  timeZone?: string;
  /** Names the list. Defaults to "Notifications". */
  'aria-label'?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

const toneClasses: Record<FeedbackTone, string> = {
  neutral: 'bg-neutral-bg text-neutral-fg',
  info: 'bg-info-bg text-info-fg',
  success: 'bg-success-bg text-success-fg',
  warning: 'bg-warning-bg text-warning-fg',
  danger: 'bg-danger-bg text-danger-fg',
};

const toneIcons: Record<FeedbackTone, IconComponent> = {
  neutral: Info,
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleX,
};

/** Plain text for a notification: its `textValue`, or its title when that's a string. */
export function notificationText(item: NotificationItem): string | undefined {
  return item.textValue ?? (typeof item.title === 'string' ? item.title : undefined);
}

interface NotificationGroup {
  key: string;
  label: string | undefined;
  items: NotificationItem[];
}

/** The items under their `group`s, in the order each group first appears; ungrouped items share one unnamed group. */
export function groupNotifications(items: readonly NotificationItem[]): NotificationGroup[] {
  const groups: NotificationGroup[] = [];
  const byKey = new Map<string, NotificationGroup>();
  for (const item of items) {
    const key = item.group ?? '';
    let group = byKey.get(key);
    if (!group) {
      group = { key, label: item.group, items: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}

function Row({
  item,
  timeZone,
  onMarkRead,
  onDismiss,
}: {
  item: NotificationItem;
  timeZone: string | undefined;
  onMarkRead?: (ids: string[]) => void;
  onDismiss?: (id: string) => void;
}) {
  const messages = useShellMessages();
  const titleId = useId();
  const tone = item.tone ?? 'neutral';
  const ToneIcon = toneIcons[tone];
  const isUnread = !item.isRead;
  return (
    <GridListItem
      id={item.id}
      textValue={notificationText(item)}
      href={item.href}
      onAction={() => {
        if (isUnread) {
          onMarkRead?.([item.id]);
        }
      }}
      data-unread={isUnread || undefined}
      className={cn(
        'group/row relative flex min-w-0 cursor-default items-start gap-3 rounded-control px-2 py-2.5 text-sm text-fg outline-none',
        hoverSurfaceClasses,
        'data-focus-visible:ring-2 data-focus-visible:ring-focus data-focus-visible:ring-inset',
        // Unread rows are tinted, and also marked by a dot, a bold title and (for screen readers) "Unread".
        isUnread && 'bg-accent-bg',
        item.href !== undefined && 'cursor-pointer',
      )}
    >
      {/* The unread dot: a shape as well as a colour; its meaning is read out by the hidden text in the title. */}
      <span aria-hidden="true" className="flex h-8 w-2 shrink-0 items-center">
        {isUnread && <span className="size-2 rounded-full bg-accent-solid" />}
      </span>
      {item.actor ? (
        // The name is part of the row's text, so the avatar is just a picture.
        <Avatar name={item.actor.name} src={item.actor.avatarSrc} size="sm" aria-hidden="true" />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full',
            toneClasses[tone],
          )}
        >
          <ToneIcon className="size-4" />
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span id={titleId} className={cn('[overflow-wrap:anywhere]', isUnread && 'font-semibold')}>
          {isUnread && <span className="sr-only">{`${messages.notificationUnread}: `}</span>}
          {item.title}
        </span>
        {item.body !== undefined && (
          <span className="text-fg-muted [overflow-wrap:anywhere]">{item.body}</span>
        )}
        <span className="flex flex-wrap items-center gap-x-1.5 text-xs text-fg-muted">
          {item.actor && <span className="font-medium">{item.actor.name}</span>}
          <RelativeTime value={item.at} timeZone={timeZone} />
        </span>
      </span>
      {(isUnread || onDismiss) && (
        <span className="flex shrink-0 gap-0.5">
          {isUnread && onMarkRead && (
            <IconButton
              icon={Check}
              size="sm"
              aria-label={messages.notificationMarkRead}
              aria-describedby={titleId}
              onPress={() => {
                onMarkRead([item.id]);
              }}
            />
          )}
          {onDismiss && (
            <IconButton
              icon={X}
              size="sm"
              aria-label={messages.dismiss}
              aria-describedby={titleId}
              onPress={() => {
                onDismiss(item.id);
              }}
            />
          )}
        </span>
      )}
    </GridListItem>
  );
}

/**
 * A list of notifications (job finished, mention, alert) under group headings, with filter tabs, mark read, mark all
 * read, dismiss and load more. It's a keyboard grid: arrow keys move between notifications and into a row's buttons,
 * Enter opens one (marking it read). Unread notifications are tinted, dotted, bold and announced as unread. Usually
 * shown by a `NotificationBell` in a drawer.
 */
export function NotificationCenter({
  items,
  onMarkRead,
  onMarkAllRead,
  onDismiss,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  filters,
  selectedFilter: selectedFilterProp,
  defaultSelectedFilter,
  onFilterChange,
  unreadCount,
  emptyState,
  timeZone,
  'aria-label': ariaLabel,
  className,
  ref,
}: NotificationCenterProps) {
  const messages = useShellMessages();
  const label = ariaLabel ?? messages.notificationCenterTitle;
  const [selectedFilter, setSelectedFilter] = useControllableState<string | undefined>(
    selectedFilterProp,
    defaultSelectedFilter ?? filters?.[0]?.id,
    (id) => {
      if (id !== undefined) {
        onFilterChange?.(id);
      }
    },
  );
  const groups = useMemo(() => groupNotifications(items), [items]);
  const unreadIds = items.filter((item) => !item.isRead).map((item) => item.id);
  const unread = unreadCount ?? unreadIds.length;
  const canMarkAll = onMarkAllRead !== undefined || onMarkRead !== undefined;

  const gridRef = useRef<HTMLDivElement>(null);
  const markAllRead = () => {
    // The button disables itself once nothing is unread, so focus moves to the list rather than being lost.
    gridRef.current?.focus();
    if (onMarkAllRead) {
      onMarkAllRead();
    } else {
      onMarkRead?.(unreadIds);
    }
  };

  const toolbar = (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
      <span className="text-sm text-fg-muted tabular-nums">
        {messages.notificationUnreadCount({ count: unread })}
      </span>
      {canMarkAll && (
        <Button
          size="sm"
          variant="ghost"
          icon={Check}
          isDisabled={unread === 0}
          onPress={markAllRead}
        >
          {messages.notificationMarkAllRead}
        </Button>
      )}
    </div>
  );

  const list =
    items.length === 0 && !(hasMore && onLoadMore) ? (
      (emptyState ?? (
        <EmptyState
          icon={BellOff}
          title={messages.notificationsEmpty}
          hint={messages.notificationsEmptyHint}
        />
      ))
    ) : (
      <div className="flex min-w-0 flex-col gap-2">
        <GridList
          ref={gridRef}
          aria-label={label}
          selectionMode="none"
          className="flex min-w-0 flex-col gap-0.5 outline-none"
        >
          {groups.map((group) => {
            const rows = group.items.map((item) => (
              <Row
                key={item.id}
                item={item}
                timeZone={timeZone}
                onMarkRead={onMarkRead}
                onDismiss={onDismiss}
              />
            ));
            return group.label === undefined ? (
              rows
            ) : (
              <GridListSection
                key={group.key}
                id={`group-${group.key}`}
                className="flex min-w-0 flex-col gap-0.5 not-first:mt-3"
              >
                <GridListHeader className="px-2 pb-1 text-xs font-semibold tracking-wide text-fg-muted uppercase">
                  {group.label}
                </GridListHeader>
                {rows}
              </GridListSection>
            );
          })}
        </GridList>
        {hasMore && onLoadMore && (
          <div className="flex justify-center">
            <Button variant="outline" size="sm" isPending={isLoadingMore} onPress={onLoadMore}>
              {messages.loadMore}
            </Button>
          </div>
        )}
      </div>
    );

  return (
    <div ref={ref} className={cn('flex min-w-0 flex-col gap-3', className)}>
      {filters && filters.length > 0 ? (
        <Tabs
          selectedKey={selectedFilter}
          onSelectionChange={(key: Key) => {
            setSelectedFilter(String(key));
          }}
        >
          <TabList aria-label={messages.notificationFilters} items={filters}>
            {(filter) => <Tab id={filter.id}>{filter.label}</Tab>}
          </TabList>
          {filters.map((filter) => (
            <TabPanel key={filter.id} id={filter.id} className="flex flex-col gap-3 pt-3">
              {toolbar}
              {list}
            </TabPanel>
          ))}
        </Tabs>
      ) : (
        <>
          {toolbar}
          {list}
        </>
      )}
    </div>
  );
}
