import type { Meta, StoryObj } from '@storybook/react-vite';
import { Kbd } from './Kbd';

const meta = { title: 'Display/Kbd', component: Kbd, args: { children: '⌘K' } } satisfies Meta<
  typeof Kbd
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Keys: Story = {
  render: () => (
    <p className="flex items-center gap-1 text-sm text-fg">
      Press <Kbd>/</Kbd> to search, or <Kbd>⌘</Kbd>
      <Kbd>K</Kbd> for commands.
    </p>
  ),
};
