import type { Meta, StoryObj } from '@storybook/react-vite';
import { Telescope } from 'lucide-react';
import { useState } from 'react';
import {
  NOTIFICATIONS_NOW,
  sampleNotifications,
  useSampleNotifications,
} from '../../test/notifications';
import { Button } from '../components/Button/Button';
import { Brand } from './Brand';
import { Header } from './Header';
import { NotificationBell } from './NotificationBell';
import { NotificationCenter } from './NotificationCenter';
import { UserMenu } from './UserMenu';

/** Pins the shared clock to `NOTIFICATIONS_NOW` while a story shows, so relative times are the same on every run. */
function pinClock() {
  const realNow = Date.now.bind(Date);
  Date.now = () => NOTIFICATIONS_NOW;
  return () => {
    Date.now = realNow;
  };
}

const meta = {
  title: 'Shell/NotificationCenter',
  component: NotificationCenter,
  args: { items: [], timeZone: 'UTC' },
  beforeEach: pinClock,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof NotificationCenter>;
export default meta;
type Story = StoryObj<typeof meta>;

const fifty = sampleNotifications(50, 8);

function CenterDemo({ pageSize }: { pageSize?: number }) {
  const { props } = useSampleNotifications(fifty, pageSize);
  return (
    <div className="max-w-md rounded-card border border-border bg-surface-2 p-3">
      <NotificationCenter {...props} timeZone="UTC" />
    </div>
  );
}

/**
 * Notifications under Today / Yesterday / Earlier, with All / Mentions / Alerts tabs. Unread ones are tinted, dotted
 * and bold; open one (click, or Enter) or press its check to mark it read, or dismiss it. Twelve at a time, with
 * "Load more" for the rest.
 */
export const Center: Story = {
  render: () => <CenterDemo pageSize={12} />,
};

/** The bell in a Header's actions: its badge shows the unread count, which is part of its name. */
export const BellInHeader: Story = {
  parameters: { layout: 'fullscreen' },
  render: function Render() {
    const { props } = useSampleNotifications(fifty, 15);
    return (
      <Header
        brand={<Brand name="Observatory" icon={Telescope} href="#/" />}
        hasMenuToggle={false}
        pinnedActions={<NotificationBell {...props} timeZone="UTC" />}
        userMenu={<UserMenu name="Ada Lovelace" />}
      />
    );
  },
};

/** The center opens in a drawer from the end edge, and as a bottom sheet on phones. */
export const BellOpen: Story = {
  tags: ['visual-page'],
  render: function Render() {
    const { props } = useSampleNotifications(fifty, 10);
    return <NotificationBell {...props} timeZone="UTC" defaultOpen />;
  },
};

/** With nothing to show. */
export const Empty: Story = {
  render: () => (
    <div className="max-w-md rounded-card border border-border bg-surface-2 p-3">
      <NotificationCenter items={[]} onMarkAllRead={() => undefined} />
    </div>
  ),
};

/** Without filter tabs or groups: a plain list of a few notifications. */
export const Simple: Story = {
  render: function Render() {
    const { props } = useSampleNotifications(
      sampleNotifications(5, 2).map((item) => ({ ...item, group: undefined })),
    );
    return (
      <div className="max-w-md rounded-card border border-border bg-surface-2 p-3">
        <NotificationCenter
          items={props.items}
          onMarkRead={props.onMarkRead}
          onDismiss={props.onDismiss}
          timeZone="UTC"
        />
      </div>
    );
  },
};

/**
 * New notifications arriving while the drawer is closed: the badge counts up and a screen reader hears "New
 * notification: …".
 */
export const Arrivals: Story = {
  tags: ['!visual'],
  render: function Render() {
    const { props, add } = useSampleNotifications(sampleNotifications(6, 1));
    const [count, setCount] = useState(0);
    return (
      <div className="flex items-center gap-3">
        <NotificationBell {...props} timeZone="UTC" />
        <Button
          variant="outline"
          onPress={() => {
            add({
              id: `new-${String(count)}`,
              kind: 'alert',
              title: `Seeing alert ${String(count + 1)}: cloud cover rising`,
              tone: 'warning',
              at: Date.now(),
              isRead: false,
              group: 'Today',
            });
            setCount(count + 1);
          }}
        >
          Simulate a new notification
        </Button>
      </div>
    );
  },
};
