import type { Meta, StoryObj } from '@storybook/react-vite';
import { Database, Globe, KeyRound, Lock, Mail, Server, Shield, Users } from 'lucide-react';
import { useState } from 'react';
import { listPeople } from '../../../test/listItems';
import { enableVirtualizer } from '../../../test/virtualizer';
import type { ListViewItem } from '../ListView';
import { Text } from '../Text';
import { TransferList } from './TransferList';

const permissions: ListViewItem[] = [
  { id: 'read', label: 'Read projects', description: 'View projects and their files', icon: Globe },
  { id: 'write', label: 'Edit projects', description: 'Change files and settings', icon: Server },
  { id: 'billing', label: 'Billing', description: 'Invoices and payment methods', icon: KeyRound },
  { id: 'members', label: 'Manage members', description: 'Invite and remove people', icon: Users },
  { id: 'email', label: 'Send email', description: 'Notifications to customers', icon: Mail },
  { id: 'backups', label: 'Backups', description: 'Restore from snapshots', icon: Database },
  {
    id: 'security',
    label: 'Security settings',
    description: 'Only owners can grant this',
    icon: Shield,
    isDisabled: true,
  },
  { id: 'secrets', label: 'Secrets', description: 'API keys and tokens', icon: Lock },
];

const meta = {
  title: 'Inputs/TransferList',
  component: TransferList,
  args: { 'aria-label': 'Permissions', items: permissions },
  // Lets React Aria's virtualizer run under the story test runner (see test/virtualizer.ts).
  beforeEach: enableVirtualizer,
} satisfies Meta<typeof TransferList>;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Choose a role's permissions: tick rows (or select all), then move them with the buttons, or drag them across.
 * Each side's search filters it. Disabled rows stay where they are.
 */
export const Permissions: Story = {
  render: function PermissionsStory() {
    const [value, setValue] = useState(['read', 'write']);
    return (
      <div className="flex max-w-3xl flex-col gap-3">
        <TransferList
          label="Editor permissions"
          description="What people with the Editor role can do."
          items={permissions}
          value={value}
          onChange={setValue}
          availableLabel="Not granted"
          chosenLabel="Granted"
          listHeight="16rem"
        />
        <Text variant="small">Granted: {value.join(', ') || 'nothing'}</Text>
      </div>
    );
  },
};

/** With `isReorderable`, the chosen rows can also be dragged into order (here, a report's columns). */
export const ReorderableChoice: Story = {
  render: function ReorderableStory() {
    const [value, setValue] = useState(['members', 'read', 'billing']);
    return (
      <div className="flex max-w-3xl flex-col gap-3">
        <TransferList
          label="Report columns"
          description="Drag the shown columns into the order you want."
          items={permissions}
          value={value}
          onChange={setValue}
          availableLabel="Hidden"
          chosenLabel="Shown"
          isReorderable
          isSearchable={false}
          listHeight="14rem"
        />
        <Text variant="small">Column order: {value.join(', ')}</Text>
      </div>
    );
  },
};

const everyone = listPeople(5_000).map((person) => ({
  ...person,
  avatar: { name: person.label, src: person.src },
}));

/** 5,000 people: both lists draw only the rows in view, and search keeps up while typing. */
export const Thousands: Story = {
  tags: ['!visual'],
  render: function ThousandsStory() {
    const [value, setValue] = useState<string[]>([]);
    return (
      <div className="flex max-w-4xl flex-col gap-3">
        <TransferList
          label="Mailing list"
          items={everyone}
          value={value}
          onChange={setValue}
          availableLabel="Everyone"
          chosenLabel="Recipients"
          density="regular"
          listHeight="24rem"
        />
        <Text variant="small">{value.length.toLocaleString()} recipients</Text>
      </div>
    );
  },
};

/** Locked: the lists stay readable, but nothing can move. */
export const Disabled: Story = {
  render: () => (
    <div className="max-w-3xl">
      <TransferList
        label="Editor permissions"
        items={permissions}
        defaultValue={['read']}
        isDisabled
        listHeight="12rem"
      />
    </div>
  ),
};
