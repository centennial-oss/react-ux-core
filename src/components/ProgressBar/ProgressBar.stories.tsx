import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProgressBar } from './ProgressBar';

const meta = {
  title: 'Feedback/ProgressBar',
  component: ProgressBar,
  args: { label: 'Uploading invoices.csv', value: 45 },
} satisfies Meta<typeof ProgressBar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

export const States: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-5">
      <ProgressBar label="Uploading invoices.csv" value={45} />
      <ProgressBar
        label="Storage used"
        value={9.2}
        maxValue={10}
        tone="warning"
        formatOptions={{ style: 'unit', unit: 'gigabyte' }}
      />
      <ProgressBar label="Quota" value={100} tone="danger" />
      <ProgressBar label="Importing meters" isIndeterminate />
      <ProgressBar aria-label="Sync progress" value={70} size="sm" tone="success" />
    </div>
  ),
};
