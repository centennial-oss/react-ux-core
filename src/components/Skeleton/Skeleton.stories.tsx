import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../Button';
import { Card } from '../Card';
import { Skeleton } from './Skeleton';

const meta = { title: 'Feedback/Skeleton', component: Skeleton } satisfies Meta<typeof Skeleton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Shapes: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-4">
      <div className="flex items-center gap-3">
        <Skeleton shape="circle" width={40} />
        <Skeleton lines={2} />
      </div>
      <Skeleton shape="rect" height={120} />
      <Skeleton lines={4} />
    </div>
  ),
};

/** Wrapping real content draws placeholders shaped like its text and controls. */
export const ShapedFromContent: Story = {
  render: () => (
    <div aria-busy="true" className="max-w-md">
      <Skeleton isLoading>
        <Card title="Customer details" footer={<Button size="sm">Edit</Button>}>
          <p className="text-sm">Acme Corporation</p>
          <p className="text-sm">Joined March 2024</p>
        </Card>
      </Skeleton>
    </div>
  ),
};
