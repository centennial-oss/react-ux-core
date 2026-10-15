import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button } from '../Button';
import { ButtonGroup } from '../ButtonGroup';
import { Dialog, DialogTrigger } from './Dialog';

const meta = {
  title: 'Overlays/Dialog',
  component: Dialog,
  args: { title: 'Dialog', children: null },
} satisfies Meta<typeof Dialog>;
export default meta;
type Story = StoryObj<typeof meta>;

const footer = (
  <ButtonGroup>
    <Button slot="close" variant="outline">
      Cancel
    </Button>
    <Button slot="close" tone="accent">
      Save
    </Button>
  </ButtonGroup>
);

/** Dims the page until dismissed (Escape, the backdrop, Close or Cancel). Full screen on phones. */
export const Basic: Story = {
  tags: ['visual-page'],
  render: () => (
    <DialogTrigger defaultOpen>
      <Button>Edit tariff</Button>
      <Dialog
        title="Edit tariff"
        description="Changes apply from the next billing period."
        footer={footer}
      >
        <p>Tariff details and form fields go here.</p>
      </Dialog>
    </DialogTrigger>
  ),
};

export const Sizes: Story = {
  tags: ['!visual'],
  render: () => (
    <div className="flex flex-wrap gap-2">
      {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
        <DialogTrigger key={size}>
          <Button variant="outline">{size}</Button>
          <Dialog title={`Size ${size}`} size={size} footer={footer}>
            <p>A {size} dialog.</p>
          </Dialog>
        </DialogTrigger>
      ))}
    </div>
  ),
};

/** While busy, the dialog can't be dismissed and reports aria-busy. */
export const Busy: Story = {
  tags: ['!visual'],
  render: function BusyStory() {
    const [isBusy, setBusy] = useState(false);
    return (
      <DialogTrigger>
        <Button>Import meters</Button>
        <Dialog
          title="Import meters"
          isBusy={isBusy}
          footer={
            <ButtonGroup>
              <Button slot="close" variant="outline" isDisabled={isBusy}>
                Cancel
              </Button>
              <Button
                tone="accent"
                isPending={isBusy}
                onPress={() => {
                  setBusy(true);
                }}
              >
                Import
              </Button>
            </ButtonGroup>
          }
        >
          <p>Importing can take a minute. Press Import to see the busy state.</p>
        </Dialog>
      </DialogTrigger>
    );
  },
};

/** Escape closes only the top dialog. */
export const Stacked: Story = {
  tags: ['!visual'],
  render: () => (
    <DialogTrigger>
      <Button>Open first</Button>
      <Dialog title="First dialog" footer={footer}>
        <DialogTrigger>
          <Button variant="outline">Open second</Button>
          <Dialog title="Second dialog" size="sm">
            <p>Press Escape: only this dialog closes.</p>
          </Dialog>
        </DialogTrigger>
      </Dialog>
    </DialogTrigger>
  ),
};
