import type { Meta, StoryObj } from '@storybook/react-vite';
import { VisuallyHidden } from './VisuallyHidden';

const meta = {
  title: 'Display/VisuallyHidden',
  component: VisuallyHidden,
  args: { children: 'Hidden text' },
} satisfies Meta<typeof VisuallyHidden>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The second sentence is read by screen readers but not shown. */
export const Example: Story = {
  render: () => (
    <p className="text-sm text-fg">
      Shown on screen.
      <VisuallyHidden> Only for screen readers.</VisuallyHidden>
    </p>
  ),
};
