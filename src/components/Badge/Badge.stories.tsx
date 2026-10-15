import type { Meta, StoryObj } from '@storybook/react-vite';
import { Check, Clock } from 'lucide-react';
import { Badge } from './Badge';

const TONES = ['neutral', 'accent', 'success', 'warning', 'danger'] as const;
const VARIANTS = ['solid', 'soft', 'outline'] as const;

const meta = {
  title: 'Display/Badge',
  component: Badge,
  args: { children: 'Badge', variant: 'soft', tone: 'neutral', size: 'sm' },
} satisfies Meta<typeof Badge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

export const VariantsAndTones: Story = {
  render: (args) => (
    <div className="grid gap-3">
      {VARIANTS.map((variant) => (
        <div key={variant} className="flex flex-wrap gap-2">
          {TONES.map((tone) => (
            <Badge key={tone} {...args} variant={variant} tone={tone}>
              {`${variant} ${tone}`}
            </Badge>
          ))}
        </div>
      ))}
    </div>
  ),
};

export const WithIconAndSizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone="success" icon={Check}>
        Paid
      </Badge>
      <Badge tone="warning" icon={Clock} size="md">
        Pending
      </Badge>
      <Badge variant="solid" tone="danger">
        12
      </Badge>
    </div>
  ),
};
