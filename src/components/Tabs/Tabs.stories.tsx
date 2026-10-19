import type { Meta, StoryObj } from '@storybook/react-vite';
import { Activity, Bell, FileText, Gauge, LayoutDashboard, Settings } from 'lucide-react';
import { useState } from 'react';
import type { Key } from 'react-aria-components';
import { MenuItem, OverflowMenu } from '../Menu';
import { Tab, TabList, TabPanel, Tabs } from './Tabs';

const meta = {
  title: 'Display/Tabs',
  component: Tabs,
  args: { children: null },
} satisfies Meta<typeof Tabs>;
export default meta;
type Story = StoryObj<typeof meta>;

const SECTIONS = [
  'Overview',
  'Meters',
  'Readings',
  'Tariffs',
  'Invoices',
  'Contacts',
  'Documents',
  'Activity',
  'Settings',
];

export const Playground: Story = {
  tags: ['!visual'],
  render: (args) => (
    <Tabs {...args}>
      <TabList aria-label="Site sections">
        <Tab id="overview">Overview</Tab>
        <Tab id="meters">Meters</Tab>
        <Tab id="billing">Billing</Tab>
      </TabList>
      <TabPanel id="overview">Site overview.</TabPanel>
      <TabPanel id="meters">Meters on this site.</TabPanel>
      <TabPanel id="billing">Billing for this site.</TabPanel>
    </Tabs>
  ),
};

/** Text tabs with a disabled tab. Arrow keys move between tabs; Tab moves into the panel. */
export const Basic: Story = {
  render: () => (
    <Tabs className="max-w-xl">
      <TabList aria-label="Site sections">
        <Tab id="overview">Overview</Tab>
        <Tab id="meters">Meters</Tab>
        <Tab id="billing">Billing</Tab>
        <Tab id="archive" isDisabled>
          Archive
        </Tab>
      </TabList>
      <TabPanel id="overview">
        <p className="text-sm">Plant 12 has 14 active meters across 3 tariffs.</p>
      </TabPanel>
      <TabPanel id="meters">
        <p className="text-sm">Meters on this site.</p>
      </TabPanel>
      <TabPanel id="billing">
        <p className="text-sm">Billing for this site.</p>
      </TabPanel>
      <TabPanel id="archive">
        <p className="text-sm">Archived records.</p>
      </TabPanel>
    </Tabs>
  ),
};

/** Icons and badges (counts are part of each tab's accessible name). */
export const IconsAndBadges: Story = {
  render: () => (
    <Tabs defaultSelectedKey="alerts" className="max-w-xl">
      <TabList aria-label="Site sections">
        <Tab id="dashboard" icon={LayoutDashboard}>
          Dashboard
        </Tab>
        <Tab id="meters" icon={Gauge} badge={14}>
          Meters
        </Tab>
        <Tab id="alerts" icon={Bell} badge={3}>
          Alerts
        </Tab>
        <Tab id="settings" icon={Settings}>
          Settings
        </Tab>
      </TabList>
      <TabPanel id="dashboard">
        <p className="text-sm">Dashboard.</p>
      </TabPanel>
      <TabPanel id="meters">
        <p className="text-sm">14 meters.</p>
      </TabPanel>
      <TabPanel id="alerts">
        <p className="text-sm">3 open alerts.</p>
      </TabPanel>
      <TabPanel id="settings">
        <p className="text-sm">Site settings.</p>
      </TabPanel>
    </Tabs>
  ),
};

/**
 * More tabs than fit: the list scrolls sideways (swipe, trackpad or arrow keys) and the page doesn't. The selected
 * tab starts scrolled into view.
 */
export const Overflow: Story = {
  render: () => (
    <Tabs defaultSelectedKey="Documents" className="max-w-md">
      <TabList aria-label="Site sections">
        {SECTIONS.map((name) => (
          <Tab key={name} id={name}>
            {name}
          </Tab>
        ))}
      </TabList>
      {SECTIONS.map((name) => (
        <TabPanel key={name} id={name}>
          <p className="text-sm">{name} for Plant 12.</p>
        </TabPanel>
      ))}
    </Tabs>
  ),
};

/** The end slot holds a quick-actions menu, outside the scrolling list. */
export const WithActions: Story = {
  render: () => (
    <Tabs className="max-w-xl">
      <TabList
        aria-label="Site sections"
        actions={
          <OverflowMenu>
            <MenuItem id="export" icon={FileText}>
              Export
            </MenuItem>
            <MenuItem id="history" icon={Activity}>
              View history
            </MenuItem>
          </OverflowMenu>
        }
      >
        {SECTIONS.slice(0, 6).map((name) => (
          <Tab key={name} id={name}>
            {name}
          </Tab>
        ))}
      </TabList>
      {SECTIONS.slice(0, 6).map((name) => (
        <TabPanel key={name} id={name}>
          <p className="text-sm">{name} for Plant 12.</p>
        </TabPanel>
      ))}
    </Tabs>
  ),
};

/** Controlled with `selectedKey`, as an app keeping the tab in the URL would. */
export const Controlled: Story = {
  tags: ['!visual'],
  render: function ControlledStory() {
    const [tab, setTab] = useState<Key>('readings');
    return (
      <div className="flex max-w-md flex-col gap-3">
        <p className="text-sm text-fg-muted">
          URL: <code>?tab={String(tab)}</code>
        </p>
        <Tabs selectedKey={tab} onSelectionChange={setTab}>
          <TabList aria-label="Site sections">
            {SECTIONS.map((name) => (
              <Tab key={name} id={name.toLowerCase()}>
                {name}
              </Tab>
            ))}
          </TabList>
          {SECTIONS.map((name) => (
            <TabPanel key={name} id={name.toLowerCase()}>
              <p className="text-sm">{name} for Plant 12.</p>
            </TabPanel>
          ))}
        </Tabs>
      </div>
    );
  },
};

/** Manual activation: arrow keys move focus only; Enter or Space selects. */
export const ManualActivation: Story = {
  tags: ['!visual'],
  render: () => (
    <Tabs keyboardActivation="manual" className="max-w-xl">
      <TabList aria-label="Reports">
        <Tab id="daily">Daily</Tab>
        <Tab id="weekly">Weekly</Tab>
        <Tab id="monthly">Monthly</Tab>
      </TabList>
      <TabPanel id="daily">
        <p className="text-sm">Daily report.</p>
      </TabPanel>
      <TabPanel id="weekly">
        <p className="text-sm">Weekly report.</p>
      </TabPanel>
      <TabPanel id="monthly">
        <p className="text-sm">Monthly report.</p>
      </TabPanel>
    </Tabs>
  ),
};
