import type { Meta, StoryObj } from '@storybook/react-vite';
import { ScrollRegion } from './ScrollRegion';

const meta = { title: 'Display/ScrollRegion', component: ScrollRegion } satisfies Meta<
  typeof ScrollRegion
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Terms: Story = {
  args: {
    'aria-label': 'Terms of service',
    maxHeight: '12rem',
    children: Array.from({ length: 8 }, (_, i) => (
      <p key={i} className="mb-3 text-sm text-fg">
        Paragraph {i + 1}. Long text scrolls inside this region, which keyboard users can focus and
        scroll with the arrow keys.
      </p>
    )),
  },
};
