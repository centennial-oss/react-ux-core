import type { Meta, StoryObj } from '@storybook/react-vite';
import { WifiOff } from 'lucide-react';
import { useState } from 'react';
import { Card } from '../Card';
import { ErrorState } from './ErrorState';

const meta = {
  title: 'Feedback/ErrorState',
  component: ErrorState,
  args: {
    title: "Couldn't load customers",
    description: 'Check your connection and try again. If it keeps happening, contact support.',
    onRetry: () => undefined,
    details: 'Error 503 Service Unavailable\nGET /api/customers?page=2\nRequest id: 8f2c1d9e',
  },
} satisfies Meta<typeof ErrorState>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

/** Message, description, retry and a collapsed details disclosure. */
export const Default: Story = {};

/** While a retry is in flight the button shows a spinner and blocks presses. */
export const Retrying: Story = {
  tags: ['!visual'],
  args: { isRetrying: true },
};

/** Pressing Retry shows the pending state for a moment, then the error again. */
export const RetryFlow: Story = {
  tags: ['!visual'],
  render: function RetryFlowStory(args) {
    const [isRetrying, setRetrying] = useState(false);
    return (
      <ErrorState
        {...args}
        isRetrying={isRetrying}
        onRetry={() => {
          setRetrying(true);
          void new Promise((resolve) => setTimeout(resolve, 1500)).then(() => {
            setRetrying(false);
          });
        }}
      />
    );
  },
};

/** Just the message: no description, retry or details. */
export const Minimal: Story = {
  args: { description: undefined, onRetry: undefined, details: undefined },
};

/** A custom icon, inside a card in a narrow column. */
export const InCard: Story = {
  args: {
    icon: WifiOff,
    title: "You're offline",
    description: 'Readings will refresh when you reconnect.',
    details: undefined,
  },
  render: (args) => (
    <Card title="Meter readings" className="max-w-sm">
      <ErrorState {...args} headingLevel={4} className="py-6" />
    </Card>
  ),
};
