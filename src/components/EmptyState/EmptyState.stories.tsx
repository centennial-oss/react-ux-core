import type { Meta, StoryObj } from '@storybook/react-vite';
import { Plus, Users } from 'lucide-react';
import { Button } from '../Button';
import { EmptyState } from './EmptyState';

const meta = {
  title: 'Feedback/EmptyState',
  component: EmptyState,
  args: {
    icon: Users,
    title: 'No customers yet',
    hint: 'Customers appear here once they sign up or you invite them.',
  },
} satisfies Meta<typeof EmptyState>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithAction: Story = {
  args: {
    action: (
      <Button tone="accent" icon={Plus}>
        Invite a customer
      </Button>
    ),
  },
};

export const Minimal: Story = { args: { icon: undefined, hint: undefined } };
