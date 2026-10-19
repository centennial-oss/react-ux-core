import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { ACTIVITY_NOW, activityEvents } from '../../../test/people';
import type { Messages } from '../../provider/messages';
import { UIProvider } from '../../provider/UIProvider';
import { ActivityTimeline, type ActivityItem } from './ActivityTimeline';
import { dayKey, groupByDay, previousDayKey } from './days';
import type { ActivityTimelineMessages } from './messages';

const hasTouch = navigator.maxTouchPoints > 0;
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const items: ActivityItem[] = [
  {
    id: 'deploy',
    at: ACTIVITY_NOW - 20 * MINUTE,
    actor: { name: 'Ada Lovelace' },
    action: 'deployed',
    target: { label: 'Telescope array', href: '/releases/2.4' },
    tone: 'success',
    detail: <p>Exposure changed from 30 s to 45 s.</p>,
  },
  { id: 'alert', at: ACTIVITY_NOW - 3 * HOUR, action: 'Dome humidity rose', tone: 'warning' },
  {
    id: 'comment',
    at: ACTIVITY_NOW - DAY,
    actor: { name: 'Grace Hopper' },
    action: 'commented on',
    target: { label: 'Night log' },
  },
  { id: 'calibrated', at: ACTIVITY_NOW - 2 * DAY, action: 'Spectrometer calibrated' },
  { id: 'old', at: ACTIVITY_NOW - 400 * DAY, action: 'Archive moved' },
];

// "Now" is pinned, so day headings and relative times don't depend on when the tests run.
beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(ACTIVITY_NOW);
});
afterEach(() => {
  vi.restoreAllMocks();
});

function headings() {
  return screen.queryAllByRole('heading').map((heading) => heading.textContent);
}

describe('day grouping', () => {
  it('finds calendar days in a time zone', () => {
    const late = new Date(Date.UTC(2026, 9, 16, 2, 0));
    expect(dayKey(late, 'UTC')).toBe('2026-10-16');
    expect(dayKey(late, 'America/Los_Angeles')).toBe('2026-10-15');
    expect(previousDayKey('2026-03-01')).toBe('2026-02-28');
    expect(previousDayKey('2026-01-01')).toBe('2025-12-31');
  });

  it('groups consecutive items by day, keeping their order', () => {
    const groups = groupByDay(items, (item) => new Date(item.at), 'UTC');
    expect(groups.map((group) => [group.key, group.items.length])).toEqual([
      ['2026-10-16', 2],
      ['2026-10-15', 1],
      ['2026-10-14', 1],
      ['2025-09-11', 1],
    ]);
  });
});

describe('ActivityTimeline', () => {
  it('groups items under day headings in the time zone, each day an ordered list', () => {
    render(
      <UIProvider locale="en-US">
        <ActivityTimeline items={items} timeZone="UTC" />
      </UIProvider>,
    );
    expect(headings()).toEqual(['Today', 'Yesterday', 'Oct 14', 'Sep 11, 2025']);
    expect(screen.getAllByRole('heading')[0]?.tagName).toBe('H3');
    const lists = screen.getAllByRole('list');
    expect(lists.map((list) => within(list).getAllByRole('listitem').length)).toEqual([2, 1, 1, 1]);
    expect(lists[0]?.tagName).toBe('OL');
  });

  it('uses the time zone for "today"', () => {
    // 2:00 UTC on Oct 16 is still Oct 15 in Los Angeles, where "now" (15:00 UTC) is 8:00 on Oct 16.
    render(
      <ActivityTimeline
        items={[{ id: 'late', at: Date.UTC(2026, 9, 16, 2, 0), action: 'Night run finished' }]}
        timeZone="America/Los_Angeles"
      />,
    );
    expect(headings()).toEqual(['Yesterday']);
  });

  it('renders 200 items across 10 days, grouped', () => {
    render(<ActivityTimeline items={activityEvents(200, 10)} timeZone="UTC" />);
    expect(headings()).toHaveLength(10);
    expect(headings()[0]).toBe('Today');
    expect(screen.getAllByRole('listitem')).toHaveLength(200);
  });

  it('reads as actor, action and target, with a relative time and the exact time for screen readers', () => {
    render(
      <UIProvider locale="en-US">
        <ActivityTimeline items={items.slice(0, 1)} timeZone="UTC" />
      </UIProvider>,
    );
    const item = screen.getByRole('listitem');
    expect(item.textContent).toEqual(
      expect.stringContaining('Ada Lovelace deployed Telescope array'),
    );
    expect(within(item).getByRole('link', { name: 'Telescope array' })).toHaveAttribute(
      'href',
      '/releases/2.4',
    );
    const time = item.querySelector('time');
    expect(time?.textContent).toEqual(expect.stringContaining('20 minutes ago'));
    expect(time?.textContent).toEqual(expect.stringContaining('Oct 16, 2026, 2:40 PM UTC'));
  });

  it('expands detail inline as a disclosure, keeping the focus', async () => {
    render(<ActivityTimeline items={items} timeZone="UTC" />);
    const trigger = screen.getByRole('button', { name: 'Details' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAccessibleDescription(/deployed/);
    trigger.focus();
    await userEvent.keyboard('{Enter}');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Exposure changed from 30 s to 45 s.')).toBeVisible();
    expect(trigger).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it.runIf(hasTouch)('expands detail with a touch tap', async () => {
    render(<ActivityTimeline items={items} timeZone="UTC" />);
    await commands.tap('[aria-expanded]');
    expect(screen.getByRole('button', { name: 'Details' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('loads more from the button', async () => {
    const onLoadMore = vi.fn();
    render(
      <ActivityTimeline
        items={items}
        timeZone="UTC"
        hasMore
        onLoadMore={onLoadMore}
        shouldLoadOnScroll={false}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(onLoadMore).toHaveBeenCalledOnce();
  });

  it('loads more once per batch when the end scrolls into view', async () => {
    const onLoadMore = vi.fn();
    const { rerender } = render(
      <ActivityTimeline items={items.slice(0, 2)} timeZone="UTC" hasMore onLoadMore={onLoadMore} />,
    );
    await expect.poll(() => onLoadMore.mock.calls.length).toBe(1);
    rerender(
      <ActivityTimeline
        items={items.slice(0, 2)}
        timeZone="UTC"
        hasMore
        onLoadMore={onLoadMore}
        isLoadingMore
      />,
    );
    expect(screen.getByRole('button', { name: 'Load more' })).toHaveAttribute('aria-busy', 'true');
    rerender(<ActivityTimeline items={items} timeZone="UTC" hasMore onLoadMore={onLoadMore} />);
    await expect.poll(() => onLoadMore.mock.calls.length).toBe(2);
  });

  it('lists without day headings when not grouped', () => {
    render(<ActivityTimeline items={items} timeZone="UTC" isGroupedByDay={false} />);
    expect(headings()).toEqual([]);
    expect(screen.getAllByRole('list')).toHaveLength(1);
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });

  it('shows an empty state', () => {
    const { rerender } = render(<ActivityTimeline items={[]} />);
    expect(screen.getByRole('heading', { name: 'No activity yet' })).toBeInTheDocument();
    rerender(<ActivityTimeline items={[]} emptyState={<p>Nothing has happened.</p>} />);
    expect(screen.getByText('Nothing has happened.')).toBeInTheDocument();
  });

  it('takes the app’s strings from UIProvider', () => {
    const overrides: Partial<ActivityTimelineMessages> = {
      activityToday: 'Heute',
      activityYesterday: 'Gestern',
    };
    render(
      <UIProvider
        locale="de-DE"
        messages={{ ...(overrides as Partial<Messages>), details: 'Einzelheiten' }}
      >
        <ActivityTimeline items={items.slice(0, 4)} timeZone="UTC" />
      </UIProvider>,
    );
    expect(headings()).toEqual(['Heute', 'Gestern', '14. Okt.']);
    expect(screen.getByRole('button', { name: 'Einzelheiten' })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <div className="p-2">
        <ActivityTimeline
          items={items}
          timeZone="UTC"
          hasMore
          onLoadMore={() => undefined}
          shouldLoadOnScroll={false}
        />
      </div>,
    );
    await expectNoAxeViolations(container);
  });
});
