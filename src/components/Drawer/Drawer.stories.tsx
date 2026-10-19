import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../Button';
import { ButtonGroup } from '../ButtonGroup';
import { DialogTrigger } from '../Dialog';
import { TextField } from '../TextField';
import { Drawer } from './Drawer';

const meta = {
  title: 'Overlays/Drawer',
  component: Drawer,
  args: { title: 'Drawer', children: null },
} satisfies Meta<typeof Drawer>;
export default meta;
type Story = StoryObj<typeof meta>;

/** A side sheet on tablet and desktop; a bottom sheet on phones. */
export const Filters: Story = {
  tags: ['visual-page'],
  render: () => (
    <DialogTrigger defaultOpen>
      <Button variant="outline">Filters</Button>
      <Drawer
        title="Filters"
        description="Narrow the customer list."
        footer={
          <ButtonGroup layout="stretch">
            <Button slot="close" variant="outline">
              Reset
            </Button>
            <Button slot="close" tone="accent">
              Apply
            </Button>
          </ButtonGroup>
        }
      >
        <div className="flex flex-col gap-4">
          <TextField label="Name contains" />
          <TextField label="Region" />
        </div>
      </Drawer>
    </DialogTrigger>
  ),
};
