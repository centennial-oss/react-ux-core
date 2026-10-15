import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../Button';
import { Banner } from './Banner';

const meta = {
  title: 'Feedback/Banner',
  component: Banner,
  args: {
    tone: 'info',
    title: 'Scheduled maintenance',
    children: 'The console will be read-only from 22:00 to 23:00 UTC.',
  },
} satisfies Meta<typeof Banner>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

export const Tones: Story = {
  render: () => (
    <div className="flex max-w-2xl flex-col gap-3">
      <Banner tone="neutral" title="Draft">
        This tariff hasn't been published yet.
      </Banner>
      <Banner tone="info" title="Scheduled maintenance">
        The console will be read-only from 22:00 to 23:00 UTC.
      </Banner>
      <Banner tone="success" title="Import complete">
        1,284 meters were imported.
      </Banner>
      <Banner tone="warning" title="Quota nearly used">
        You've used 92% of this month's API quota.
      </Banner>
      <Banner tone="danger" title="Sync failed">
        The last three syncs failed. Check the connection settings.
      </Banner>
    </div>
  ),
};

export const WithActionsAndDismiss: Story = {
  args: {
    tone: 'warning',
    title: 'Unsaved changes',
    children: 'You have changes that haven’t been saved.',
    isDismissable: true,
    actions: (
      <>
        <Button size="sm" tone="warning">
          Save now
        </Button>
        <Button size="sm" variant="ghost">
          Discard
        </Button>
      </>
    ),
  },
};

export const TitleOnly: Story = {
  args: { tone: 'success', title: 'Saved', children: undefined, isDismissable: true },
};
