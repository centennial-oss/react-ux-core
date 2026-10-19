import type { Meta, StoryObj } from '@storybook/react-vite';
import { cometQuestion } from '../../test/finance';
import { ProbabilityBar } from './ProbabilityBar';

const meta = {
  title: 'Finance/ProbabilityBar',
  component: ProbabilityBar,
  args: { yes: 0.62 },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProbabilityBar>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Both percentages are written out, so the split doesn't rely on colour. */
export const Medium: Story = {};

/** Labels beside a thin bar, for lists of markets. */
export const Small: Story = { args: { size: 'sm' } };

/** Custom labels, and the market's question as the group's name. */
export const CustomLabels: Story = {
  args: { yes: 0.35, labels: { yes: 'Visible', no: 'Not visible' }, 'aria-label': cometQuestion },
};

/** Near-certain and settled markets. */
export const Extremes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <ProbabilityBar yes={0.97} />
      <ProbabilityBar yes={1} />
      <ProbabilityBar yes={0} size="sm" />
    </div>
  ),
};
