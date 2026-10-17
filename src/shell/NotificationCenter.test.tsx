import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { sampleNotifications, useSampleNotifications } from '../../test/notifications';
import { UIProvider } from '../provider/UIProvider';
import { NotificationBell } from './NotificationBell';
import {
  groupNotifications,
  NotificationCenter,
  type NotificationItem,
} from './NotificationCenter';

const isDesktop = window.innerWidth >= 1024;
const hasTouch = navigator.maxTouchPoints > 0;

function StatefulBell({ pageSize }: { pageSize?: number }) {
  const { props } = useSampleNotifications(sampleNotifications(50, 8), pageSize);
  return <NotificationBell {...props} timeZone="UTC" />;
}

function StatefulCenter() {
  const { props } = useSampleNotifications(sampleNotifications(50, 8));
  return <NotificationCenter {...props} timeZone="UTC" />;
}

/** The notification rows (not the group headings) in the list. */
function notificationRows(): HTMLElement[] {
  const grid = screen.getByRole('grid', { name: 'Notifications' });
  return within(grid)
    .getAllByRole('row')
    .filter((row) => row.closest('[data-key]')?.getAttribute('data-key')?.startsWith('n-'));
}

describe('groupNotifications', () => {
  it('keeps the order each group first appears in', () => {
    const at = 0;
    const items: NotificationItem[] = [
      { id: 'a', title: 'A', at, isRead: false, group: 'Today' },
      { id: 'b', title: 'B', at, isRead: false },
      { id: 'c', title: 'C', at, isRead: false, group: 'Earlier' },
      { id: 'd', title: 'D', at, isRead: false, group: 'Today' },
    ];
    expect(groupNotifications(items).map((group) => [group.key, group.items.length])).toEqual([
      ['Today', 2],
      ['', 1],
      ['Earlier', 1],
    ]);
  });
});

describe('NotificationCenter', () => {
  it('lists 50 notifications under 3 group headings', () => {
    render(<StatefulCenter />);
    const grid = screen.getByRole('grid', { name: 'Notifications' });
    for (const heading of ['Today', 'Yesterday', 'Earlier']) {
      expect(within(grid).getByText(heading)).toBeInTheDocument();
    }
    expect(notificationRows()).toHaveLength(50);
    expect(screen.getByText('8 unread')).toBeInTheDocument();
  });

  it('marks unread rows other than by colour: a bold title and "Unread" for screen readers', () => {
    render(<StatefulCenter />);
    const [first] = notificationRows();
    expect(first?.textContent).toEqual(expect.stringContaining('Unread: '));
    const last = notificationRows().at(-1);
    expect(last?.textContent).not.toEqual(expect.stringContaining('Unread'));
  });

  it('marks one read, dismisses one, and marks all read', async () => {
    const onMarkRead = vi.fn();
    const onDismiss = vi.fn();
    const onMarkAllRead = vi.fn();
    const items = sampleNotifications(4, 2);
    render(
      <NotificationCenter
        items={items}
        onMarkRead={onMarkRead}
        onDismiss={onDismiss}
        onMarkAllRead={onMarkAllRead}
      />,
    );
    const [first] = notificationRows();
    if (!first) {
      throw new Error('no rows');
    }
    await userEvent.click(within(first).getByRole('button', { name: 'Mark as read' }));
    expect(onMarkRead).toHaveBeenLastCalledWith(['n-0']);
    await userEvent.click(within(first).getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenLastCalledWith('n-0');
    await userEvent.click(screen.getByRole('button', { name: 'Mark all read' }));
    expect(onMarkAllRead).toHaveBeenCalledOnce();
  });

  it('falls back to onMarkRead with every unread id for "Mark all read"', async () => {
    const onMarkRead = vi.fn();
    render(<NotificationCenter items={sampleNotifications(6, 3)} onMarkRead={onMarkRead} />);
    await userEvent.click(screen.getByRole('button', { name: 'Mark all read' }));
    expect(onMarkRead).toHaveBeenLastCalledWith(['n-0', 'n-1', 'n-2']);
  });

  it('switches filters with the tabs', async () => {
    render(<StatefulCenter />);
    await userEvent.click(screen.getByRole('tab', { name: 'Alerts' }));
    expect(screen.getByRole('tab', { name: 'Alerts' })).toHaveAttribute('aria-selected', 'true');
    // Every third of the 50 is an alert.
    expect(notificationRows()).toHaveLength(17);
  });

  it('loads more', async () => {
    const onLoadMore = vi.fn();
    render(
      <NotificationCenter items={sampleNotifications(5, 0)} hasMore onLoadMore={onLoadMore} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(onLoadMore).toHaveBeenCalledOnce();
  });

  it('says when there is nothing to show', () => {
    render(<NotificationCenter items={[]} />);
    expect(screen.getByRole('heading', { name: 'No notifications' })).toBeInTheDocument();
  });

  it.skipIf(!isDesktop)(
    'moves between notifications with the arrow keys and opens with Enter',
    async () => {
      const onMarkRead = vi.fn();
      render(<NotificationCenter items={sampleNotifications(6, 6)} onMarkRead={onMarkRead} />);
      await userEvent.tab();
      // Past the "Mark all read" button into the list.
      await userEvent.tab();
      const rows = notificationRows();
      expect(rows[0]).toHaveFocus();
      await userEvent.keyboard('{ArrowDown}');
      expect(rows[1]).toHaveFocus();
      await userEvent.keyboard('{Enter}');
      expect(onMarkRead).toHaveBeenLastCalledWith(['n-1']);
      await userEvent.keyboard('{ArrowRight}');
      expect(document.activeElement?.closest('[role="row"]')).toBe(rows[1]);
      expect(rows[1]).not.toHaveFocus();
    },
  );

  it('takes its strings from UIProvider', () => {
    render(
      <UIProvider
        messages={{
          notificationUnreadCount: ({ count }: { count: number }) => `${String(count)} nouvelles`,
        }}
      >
        <NotificationCenter items={sampleNotifications(3, 2)} />
      </UIProvider>,
    );
    expect(screen.getByText('2 nouvelles')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<StatefulCenter />);
    await expectNoAxeViolations(container);
  });
});

describe('NotificationBell', () => {
  it('names the unread count, and "Mark all read" clears the badge', async () => {
    render(<StatefulBell />);
    const bell = screen.getByRole('button', { name: 'Notifications, 8 unread' });
    expect(bell.textContent).toBe('8');
    await userEvent.click(bell);
    const dialog = await screen.findByRole('dialog', { name: 'Notifications' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mark all read' }));
    expect(within(dialog).getByText('All read')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    // Focus moved into the list, so Escape still reaches the drawer.
    await expect.poll(() => screen.queryByRole('dialog')).toBeNull();
    const cleared = screen.getByRole('button', { name: 'Notifications' });
    expect(cleared.textContent).toBe('');
  });

  it('opens the center with a touch tap', async () => {
    if (!hasTouch || isDesktop) {
      return;
    }
    render(<StatefulBell pageSize={10} />);
    await commands.tap('[aria-label="Notifications, 8 unread"]');
    expect(await screen.findByRole('dialog', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('announces new notifications politely while closed, but not older ones loaded later', async () => {
    const base = sampleNotifications(5, 1);
    function Bell() {
      const [items, setItems] = useState<NotificationItem[]>(base);
      return (
        <>
          <NotificationBell items={items} />
          <button
            type="button"
            onClick={() => {
              setItems((current) => [
                ...current,
                { id: 'old', title: 'An old one', at: 0, isRead: false },
              ]);
            }}
          >
            older
          </button>
          <button
            type="button"
            onClick={() => {
              setItems((current) => [
                { id: 'new', title: 'Cloud cover rising', at: Date.now(), isRead: false },
                ...current,
              ]);
            }}
          >
            newer
          </button>
        </>
      );
    }
    render(<Bell />);
    const status = screen.getByRole('status');
    expect(status.textContent).toBe('');
    await userEvent.click(screen.getByRole('button', { name: 'older' }));
    expect(status.textContent).toBe('');
    await userEvent.click(screen.getByRole('button', { name: 'newer' }));
    expect(status.textContent).toBe('New notification: Cloud cover rising');
    expect(screen.getByRole('button', { name: 'Notifications, 3 unread' })).toBeInTheDocument();
  });

  it('has no accessibility violations, closed and open', async () => {
    const { container } = render(<StatefulBell pageSize={10} />);
    await expectNoAxeViolations(container);
    await userEvent.click(screen.getByRole('button', { name: 'Notifications, 8 unread' }));
    const dialog = await screen.findByRole('dialog', { name: 'Notifications' });
    await expectNoAxeViolations(dialog);
  });
});
