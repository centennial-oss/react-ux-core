import type { Meta, StoryObj } from '@storybook/react-vite';
import { Separator } from './Separator';

const meta = { title: 'Display/Separator', component: Separator } satisfies Meta<typeof Separator>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Orientations: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-3 text-sm text-fg">
      <span>Above</span>
      <Separator />
      <div className="flex h-6 items-center gap-3">
        <span>Left</span>
        <Separator orientation="vertical" />
        <span>Right</span>
      </div>
    </div>
  ),
};
