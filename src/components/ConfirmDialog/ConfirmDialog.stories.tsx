import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../Button';
import { DialogTrigger } from '../Dialog';
import { ConfirmDialog } from './ConfirmDialog';

const meta = {
  title: 'Overlays/ConfirmDialog',
  component: ConfirmDialog,
  args: { title: 'Confirm', onConfirm: () => undefined },
} satisfies Meta<typeof ConfirmDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

/** A destructive action that requires typing the meter's name. */
export const TypeToConfirm: Story = {
  tags: ['visual-page'],
  render: () => (
    <DialogTrigger defaultOpen>
      <Button tone="danger" variant="soft">
        Delete meter
      </Button>
      <ConfirmDialog
        title="Delete meter M-1042?"
        body="Its readings will be removed from every report."
        consequence="This can't be undone."
        tone="danger"
        confirmLabel="Delete meter"
        confirmText="M-1042"
        onConfirm={() => new Promise((resolve) => setTimeout(resolve, 1200))}
      />
    </DialogTrigger>
  ),
};

/** onConfirm rejects: the error shows inline and the dialog stays open. */
export const FailingConfirm: Story = {
  tags: ['!visual'],
  render: () => (
    <DialogTrigger>
      <Button>Publish tariff</Button>
      <ConfirmDialog
        title="Publish tariff?"
        body="Customers on this tariff will be billed at the new rates from the next period."
        confirmLabel="Publish"
        onConfirm={() =>
          new Promise((_, reject) =>
            setTimeout(() => {
              reject(new Error('The tariff overlaps an existing one.'));
            }, 800),
          )
        }
      />
    </DialogTrigger>
  ),
};
