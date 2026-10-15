import type { Meta, StoryObj } from '@storybook/react-vite';
import { Bell, Settings, Trash2 } from 'lucide-react';
import { IconButton } from '../IconButton';
import { Tooltip } from './Tooltip';

const meta = {
  title: 'Overlays/Tooltip',
  component: Tooltip,
  args: { content: 'Settings', children: null },
} satisfies Meta<typeof Tooltip>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Hover, focus with the keyboard, or tap on a touch screen. */
export const IconButtons: Story = {
  render: () => (
    <div className="flex gap-2 pt-10">
      <Tooltip content="Workspace settings">
        <IconButton icon={Settings} aria-label="Settings" />
      </Tooltip>
      <Tooltip content="Notifications" placement="bottom">
        <IconButton icon={Bell} aria-label="Notifications" />
      </Tooltip>
      <Tooltip content="Delete row">
        <IconButton icon={Trash2} aria-label="Delete" tone="danger" />
      </Tooltip>
    </div>
  ),
};
