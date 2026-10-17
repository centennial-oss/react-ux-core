import type { Meta, StoryObj } from '@storybook/react-vite';
import { CircleAlert, GitBranch, Rocket, Telescope } from 'lucide-react';
import { useState } from 'react';
import { ACTIVITY_NOW, activityEvents } from '../../../test/people';
import { Code } from '../Code';
import { ActivityTimeline, type ActivityItem } from './ActivityTimeline';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Pins the shared clock to `ACTIVITY_NOW` while a story shows, so the day headings ("Today", "Oct 14") and relative
 * times ("20 minutes ago") are the same on every run.
 */
function pinClock() {
  const realNow = Date.now.bind(Date);
  Date.now = () => ACTIVITY_NOW;
  return () => {
    Date.now = realNow;
  };
}

const meta = {
  title: 'Display/ActivityTimeline',
  component: ActivityTimeline,
  args: { items: [], timeZone: 'UTC' },
  beforeEach: pinClock,
} satisfies Meta<typeof ActivityTimeline>;
export default meta;
type Story = StoryObj<typeof meta>;

const deployHistory: ActivityItem[] = [
  {
    id: 'deploy-3',
    at: ACTIVITY_NOW - 20 * MINUTE,
    actor: { name: 'Ada Lovelace' },
    action: 'deployed',
    target: { label: 'Telescope array v2.4', href: '#/releases/2.4' },
    tone: 'success',
    icon: Rocket,
    detail: (
      <Code>
        {`focus: auto → manual
exposure: 30s → 45s`}
      </Code>
    ),
  },
  {
    id: 'alert',
    at: ACTIVITY_NOW - 3 * HOUR,
    action: 'Dome humidity rose above 85%',
    tone: 'warning',
    icon: CircleAlert,
  },
  {
    id: 'comment',
    at: ACTIVITY_NOW - 6 * HOUR,
    actor: { name: 'Grace Hopper' },
    action: 'commented on',
    target: { label: 'Night log, Oct 15', href: '#/logs/2026-10-15' },
    detail: 'Seeing was poor after midnight; the second run should be repeated.',
  },
  {
    id: 'branch',
    at: ACTIVITY_NOW - DAY - 2 * HOUR,
    actor: { name: 'Alan Turing' },
    action: 'merged the calibration changes into',
    target: { label: 'main' },
    tone: 'accent',
    icon: GitBranch,
  },
  {
    id: 'schedule',
    at: ACTIVITY_NOW - DAY - 5 * HOUR,
    actor: { name: 'Vera Rubin' },
    action: 'updated the observing schedule for',
    target: { label: 'North dome', href: '#/domes/north' },
  },
  {
    id: 'calibrated',
    at: ACTIVITY_NOW - 2 * DAY - 4 * HOUR,
    actor: { name: 'Katherine Johnson' },
    action: 'calibrated',
    target: { label: 'Spectrometer 2' },
    tone: 'neutral',
    icon: Telescope,
  },
  {
    id: 'outage',
    at: ACTIVITY_NOW - 400 * DAY,
    action: 'Archive was offline for 2 hours',
    tone: 'danger',
    icon: CircleAlert,
  },
];

/**
 * A deploy history grouped by day: icons or avatars in the rail, relative times with the exact time on hover or
 * focus, and detail that expands inline. Older days show the date (with the year when it isn't this year's).
 */
export const DeployHistory: Story = {
  args: { items: deployHistory },
};

/** Without day headings: one ordered list. */
export const Ungrouped: Story = {
  args: { items: deployHistory.slice(0, 4), isGroupedByDay: false },
};

/** With nothing to show, the default empty state (or the app's own `emptyState`). */
export const Empty: Story = {
  args: { items: [] },
};

/**
 * Two hundred events over ten days, loading forty at a time: from the "Load more" button, or when the end of the
 * list scrolls into view.
 */
export const LoadMore: Story = {
  tags: ['!visual'],
  render: function LoadMoreStory(args) {
    const all = activityEvents(200, 10);
    const [count, setCount] = useState(40);
    return (
      <ActivityTimeline
        {...args}
        items={all.slice(0, count)}
        hasMore={count < all.length}
        onLoadMore={() => {
          setCount((value) => Math.min(all.length, value + 40));
        }}
      />
    );
  },
};

/** The first page of a longer history, with the "Load more" button (scroll loading off). */
export const WithLoadMoreButton: Story = {
  args: {
    items: activityEvents(12, 2),
    hasMore: true,
    shouldLoadOnScroll: false,
    onLoadMore: () => undefined,
  },
};
