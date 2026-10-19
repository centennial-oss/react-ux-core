import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../Button';
import { ButtonGroup } from './ButtonGroup';

const meta = {
  title: 'Actions/ButtonGroup',
  component: ButtonGroup,
  args: { layout: 'end', children: null },
} satisfies Meta<typeof ButtonGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Each layout in a wide container. Narrow containers (under 24rem) stack the buttons. */
export const Layouts: Story = {
  render: () => (
    <div className="flex max-w-xl flex-col gap-6">
      {(['start', 'end', 'between', 'stretch'] as const).map((layout) => (
        <ButtonGroup key={layout} layout={layout} aria-label={`${layout} layout`}>
          <Button variant="outline">Cancel</Button>
          <Button tone="accent">Save</Button>
        </ButtonGroup>
      ))}
    </div>
  ),
};

export const NarrowContainer: Story = {
  render: () => (
    <div className="w-72 rounded-card border border-border p-4">
      <ButtonGroup>
        <Button variant="outline">Cancel</Button>
        <Button tone="accent">Save changes</Button>
      </ButtonGroup>
    </div>
  ),
};
