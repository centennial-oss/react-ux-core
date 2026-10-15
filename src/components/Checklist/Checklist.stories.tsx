import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../Button';
import { Checklist } from './Checklist';

const meta = { title: 'Display/Checklist', component: Checklist } satisfies Meta<typeof Checklist>;
export default meta;
type Story = StoryObj<typeof meta>;

export const SiteSetup: Story = {
  args: {
    label: 'Site setup',
    steps: [
      {
        id: 'users',
        title: 'Add users',
        status: 'done',
        description: 'Operators and vendors can sign in.',
      },
      {
        id: 'settings',
        title: 'Confirm site settings',
        status: 'current',
        description: 'Time zone, currency and phone code.',
        action: (
          <Button size="sm" tone="accent">
            Confirm
          </Button>
        ),
      },
      {
        id: 'driver',
        title: 'Register a meter driver',
        status: 'todo',
        action: <Button size="sm">Register</Button>,
      },
      {
        id: 'tariff',
        title: 'Create the first tariff',
        status: 'blocked',
        description: 'Waiting for the site settings.',
      },
    ],
  },
};
