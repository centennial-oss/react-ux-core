import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect } from 'react';
import { Button } from '../Button';
import { ToastRegion } from './ToastRegion';
import { toast } from './toastStore';

const meta = {
  title: 'Feedback/Toast',
  component: ToastRegion,
} satisfies Meta<typeof ToastRegion>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Press a button to show a toast. Info and success dismiss themselves after 5 seconds; hover to pause. */
export const Playground: Story = {
  tags: ['!visual'],
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Button
        onPress={() =>
          toast.info({ title: 'Report queued', description: 'We’ll email you when it’s ready.' })
        }
      >
        Info
      </Button>
      <Button onPress={() => toast.success('Tariff saved')}>Success</Button>
      <Button
        onPress={() =>
          toast.warning({
            title: 'Quota nearly used',
            description: '92% of this month’s API quota.',
          })
        }
      >
        Warning
      </Button>
      <Button
        onPress={() =>
          toast.error({
            title: 'Sync failed',
            action: { label: 'Retry', onPress: () => toast.success('Sync restarted') },
          })
        }
      >
        Error
      </Button>
      <Button
        variant="outline"
        onPress={() => {
          toast.clear();
        }}
      >
        Clear
      </Button>
    </div>
  ),
};

/** Every tone, an action and "Clear all". */
export const Stack: Story = {
  tags: ['visual-page'],
  render: function StackStory() {
    useEffect(() => {
      toast({
        id: 'story-info',
        tone: 'info',
        title: 'Report queued',
        description: 'We’ll email you when it’s ready.',
        timeout: null,
      });
      toast({ id: 'story-success', tone: 'success', title: 'Tariff saved', timeout: null });
      toast({
        id: 'story-warning',
        tone: 'warning',
        title: 'Quota nearly used',
        description: '92% of this month’s API quota.',
      });
      toast({
        id: 'story-error',
        tone: 'danger',
        title: 'Sync failed',
        action: { label: 'Retry', onPress: () => undefined },
      });
      return () => {
        toast.clear();
      };
    }, []);
    return (
      <p className="text-sm text-fg-muted">
        Toasts appear in the corner (at the bottom on phones).
      </p>
    );
  },
};
