import type { Meta, StoryObj } from '@storybook/react-vite';
import { Filter } from 'lucide-react';
import { Button } from '../Button';
import { Popover, PopoverTrigger } from './Popover';

const meta = {
  title: 'Overlays/Popover',
  component: Popover,
  args: { children: null },
} satisfies Meta<typeof Popover>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Anchored to its trigger on tablet and desktop; a bottom sheet on phones. */
export const Basic: Story = {
  tags: ['visual-page'],
  render: () => (
    <PopoverTrigger defaultOpen>
      <Button variant="outline" icon={Filter}>
        Filters
      </Button>
      <Popover aria-label="Filters" hasArrow>
        <div className="flex w-64 flex-col gap-2 text-sm">
          <p className="font-medium">Filters</p>
          <p className="text-fg-muted">Popover content goes here.</p>
          <Button size="sm" tone="accent">
            Apply
          </Button>
        </div>
      </Popover>
    </PopoverTrigger>
  ),
};
