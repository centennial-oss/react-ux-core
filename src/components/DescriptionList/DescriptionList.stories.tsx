import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from '../Card';
import { DescriptionList, type DescriptionItem } from './DescriptionList';

const items: DescriptionItem[] = [
  { id: 'name', label: 'Customer', value: 'Acme Corporation' },
  { id: 'account', label: 'Account ID', value: 'ACC-10422', copyValue: 'ACC-10422' },
  {
    id: 'tariff',
    label: 'Tariff',
    value: 'Commercial (C-2)',
    infoTip: 'The rate plan this customer is billed on.',
  },
  { id: 'region', label: 'Region', value: 'North' },
  { id: 'phone', label: 'Phone', value: undefined },
  {
    id: 'email',
    label: 'Billing email',
    value: 'billing@acme.example',
    copyValue: 'billing@acme.example',
  },
  { id: 'created', label: 'Created', value: 'March 4, 2024', isSecondary: true },
  { id: 'owner', label: 'Account owner', value: 'Sam Rivera', isSecondary: true },
];

const meta = {
  title: 'Display/DescriptionList',
  component: DescriptionList,
  args: { items },
} satisfies Meta<typeof DescriptionList>;
export default meta;
type Story = StoryObj<typeof meta>;

export const InACard: Story = {
  render: (args) => (
    <Card title="Customer details" className="max-w-3xl">
      <DescriptionList {...args} />
    </Card>
  ),
};

export const ThreeColumns: Story = {
  args: { columns: 3 },
  render: (args) => (
    <div className="max-w-5xl">
      <DescriptionList {...args} />
    </div>
  ),
};
