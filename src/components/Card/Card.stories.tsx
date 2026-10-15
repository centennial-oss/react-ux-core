import type { Meta, StoryObj } from '@storybook/react-vite';
import { Users } from 'lucide-react';
import { Button } from '../Button';
import { Card } from './Card';

const meta = {
  title: 'Display/Card',
  component: Card,
  args: {
    title: 'Customers',
    description: 'Active in the last 30 days',
    children: 'Card body content.',
  },
} satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

export const Full: Story = {
  render: (args) => (
    <Card
      {...args}
      icon={Users}
      actions={
        <Button size="sm" variant="outline">
          Export
        </Button>
      }
      footer={<span className="text-sm text-fg-muted">Updated 5 minutes ago</span>}
      className="max-w-md"
    >
      <p className="text-3xl font-semibold">1,284</p>
    </Card>
  ),
};

export const BodyOnly: Story = {
  args: { title: undefined, description: undefined },
  render: (args) => (
    <Card {...args} className="max-w-md">
      A card without a header.
    </Card>
  ),
};
