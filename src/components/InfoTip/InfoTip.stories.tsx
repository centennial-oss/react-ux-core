import type { Meta, StoryObj } from '@storybook/react-vite';
import { InfoTip } from './InfoTip';

const meta = {
  title: 'Overlays/InfoTip',
  component: InfoTip,
  args: { children: 'The dates a bill covers.' },
} satisfies Meta<typeof InfoTip>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Explains a term on tap, click or keyboard. */
export const NextToALabel: Story = {
  render: () => (
    <p className="flex items-center gap-1 text-sm font-medium text-fg">
      Billing period
      <InfoTip title="Billing period" aria-label="About billing periods">
        The range of dates a bill covers. Usage outside it appears on the next bill.
      </InfoTip>
    </p>
  ),
};
