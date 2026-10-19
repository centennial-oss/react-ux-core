import { Bell } from 'lucide-react';
import { useState, type ReactNode, type Ref } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import { Badge } from '../components/Badge/Badge';
import { Drawer } from '../components/Drawer/Drawer';
import { cn } from '../utils/cn';
import { hoverSurfaceClasses } from '../utils/stateClasses';
import { toEpochMs } from '../utils/time';
import { useControllableState } from '../utils/useControllableState';
import { useShellMessages, type ShellStrings } from './messages';
import {
  NotificationCenter,
  notificationText,
  type NotificationCenterProps,
  type NotificationItem,
} from './NotificationCenter';

export interface NotificationBellProps extends Omit<NotificationCenterProps, 'className' | 'ref'> {
  /** Whether the drawer is open. Controlled; see `defaultOpen`. */
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  /** The drawer's title. Defaults to "Notifications". */
  title?: ReactNode;
  /** Classes for the bell button. */
  className?: string;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * What to announce when `items` changes to `next`: the unread items that weren't there before and are newer than
 * everything that was (so loading older notifications isn't announced). Empty when there's nothing new.
 */
function announcementFor(
  previous: readonly NotificationItem[],
  next: readonly NotificationItem[],
  messages: ShellStrings,
): string {
  const seen = new Set(previous.map((item) => item.id));
  const newest = previous.reduce((latest, item) => Math.max(latest, toEpochMs(item.at)), -Infinity);
  const fresh = next.filter(
    (item) => !item.isRead && !seen.has(item.id) && toEpochMs(item.at) >= newest,
  );
  const [first] = fresh;
  if (first === undefined) {
    return '';
  }
  const text = fresh.length === 1 ? notificationText(first) : undefined;
  return text === undefined
    ? messages.notificationsNew({ count: fresh.length })
    : messages.notificationNew({ title: text });
}

/**
 * A Header action: a bell with the unread count on a badge (and in its name, "Notifications, 3 unread") that opens
 * a `NotificationCenter` in a drawer, a bottom sheet on phones. New notifications are announced politely while the
 * drawer is closed. Takes the NotificationCenter's props.
 */
export function NotificationBell({
  isOpen: isOpenProp,
  defaultOpen = false,
  onOpenChange,
  title,
  className,
  ref,
  ...centerProps
}: NotificationBellProps) {
  const messages = useShellMessages();
  const [isOpen, setOpen] = useControllableState(isOpenProp, defaultOpen, onOpenChange);
  const { items } = centerProps;
  const unread = centerProps.unreadCount ?? items.filter((item) => !item.isRead).length;

  // Announce new arrivals while the drawer is closed (while it's open, they appear in the list in front of the user).
  const [previousItems, setPreviousItems] = useState(items);
  const [announcement, setAnnouncement] = useState('');
  if (items !== previousItems) {
    setPreviousItems(items);
    const next = isOpen ? '' : announcementFor(previousItems, items, messages);
    if (next !== '') {
      setAnnouncement(next);
    }
  }

  return (
    <>
      <span role="status" className="sr-only">
        {announcement}
      </span>
      <AriaButton
        ref={ref}
        aria-label={messages.notificationBell({ count: unread })}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onPress={() => {
          setOpen(true);
        }}
        className={cn(
          'hit-area relative inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-control text-neutral-fg outline-none select-none',
          'data-focus-visible:focus-ring',
          hoverSurfaceClasses,
          className,
        )}
      >
        <Bell aria-hidden="true" className="size-5" />
        {unread > 0 && (
          // The count is in the button's name; the badge only shows it.
          <Badge
            aria-hidden="true"
            variant="solid"
            tone="danger"
            className="pointer-events-none absolute -end-0.5 -top-0.5 h-4.5 min-w-4.5 justify-center px-1 text-[0.6875rem] ring-2 ring-surface-2"
          >
            {messages.notificationBadgeCount({ count: unread })}
          </Badge>
        )}
      </AriaButton>
      <Drawer
        title={title ?? messages.notificationCenterTitle}
        isOpen={isOpen}
        onOpenChange={setOpen}
      >
        <NotificationCenter {...centerProps} />
      </Drawer>
    </>
  );
}
