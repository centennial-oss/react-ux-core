import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatusDot } from './StatusDot';

const meta = {
  title: 'Display/StatusDot',
  component: StatusDot,
  args: { label: 'Online', tone: 'success' },
} satisfies Meta<typeof StatusDot>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

/** Every tone has its own shape as well as colour, and always a label (visible or hidden). */
export const Tones: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <StatusDot tone="neutral" label="Unknown" />
      <StatusDot tone="accent" label="Syncing" />
      <StatusDot tone="success" label="Online" />
      <StatusDot tone="warning" label="Degraded" />
      <StatusDot tone="danger" label="Offline" />
      <StatusDot tone="success" label="Online" size="sm" />
    </div>
  ),
};
