import type { Meta, StoryObj } from '@storybook/react-vite';
import { Option } from '../ListBox';
import { ComboBox } from './ComboBox';

const customers = [
  { id: 'acme', name: 'Acme Corporation' },
  { id: 'globex', name: 'Globex' },
  { id: 'initech', name: 'Initech' },
  { id: 'umbrella', name: 'Umbrella' },
  { id: 'hooli', name: 'Hooli' },
];

async function searchCustomers(query: string, signal: AbortSignal) {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, 400);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
  return customers.filter((customer) => customer.name.toLowerCase().includes(query.toLowerCase()));
}

const meta = {
  title: 'Inputs/ComboBox',
  component: ComboBox,
  args: { label: 'Customer', children: null },
} satisfies Meta<typeof ComboBox>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Static: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-5">
      <ComboBox label="Customer" items={customers} description="Type to filter">
        {(customer) => <Option id={customer.id}>{customer.name}</Option>}
      </ComboBox>
      <ComboBox label="Customer" items={customers} defaultValue="globex">
        {(customer) => <Option id={customer.id}>{customer.name}</Option>}
      </ComboBox>
      <ComboBox label="Customer" items={customers} isInvalid errorMessage="Choose a customer">
        {(customer) => <Option id={customer.id}>{customer.name}</Option>}
      </ComboBox>
    </div>
  ),
};

/** Results load as you type (debounced; stale requests are aborted). */
export const Async: Story = {
  tags: ['!visual'],
  render: () => (
    <div className="max-w-md">
      <ComboBox label="Customer" loadItems={searchCustomers}>
        {(customer) => <Option id={customer.id}>{customer.name}</Option>}
      </ComboBox>
    </div>
  ),
};
