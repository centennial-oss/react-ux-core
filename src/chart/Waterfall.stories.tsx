import type { Meta, StoryObj } from '@storybook/react-vite';
import { budgetBridge } from '../../test/plotCharts';
import { CategoryChart } from './CategoryChart';

const meta = {
  title: 'Chart/Waterfall',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * An observatory's budget bridge from September to October: increases in green and decreases in red, each labelled
 * with its sign, totals in neutral, and dashed connectors at the running total. On a phone the steps run down the
 * page. The summary names the start, the end and the largest increase and decrease; the table lists running totals.
 */
export const BudgetBridge: Story = {
  render: () => (
    <CategoryChart
      type="waterfall"
      title="Observatory budget"
      description="September to October"
      steps={budgetBridge}
      unit="USD"
      exportFileName="observatory-budget"
    />
  ),
};

/** Always horizontal, one row per step. */
export const Horizontal: Story = {
  render: () => (
    <CategoryChart
      type="waterfall"
      title="Observatory budget"
      steps={budgetBridge}
      unit="USD"
      orientation="horizontal"
      height="20rem"
    />
  ),
};

/** Always vertical, with a subtotal and an axis title. */
export const VerticalWithSubtotal: Story = {
  render: () => (
    <CategoryChart
      type="waterfall"
      title="Observatory budget"
      steps={[
        ...budgetBridge.slice(0, 4),
        { label: 'Running costs', value: 51_170, kind: 'total' },
        ...budgetBridge.slice(4),
      ]}
      unit="USD"
      orientation="vertical"
      valueAxis={{ title: 'US dollars' }}
    />
  ),
};
