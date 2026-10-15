import type { Meta, StoryObj } from '@storybook/react-vite';
import { TextField } from './TextField';

const meta = {
  title: 'Inputs/TextField',
  component: TextField,
  args: { label: 'Company name', placeholder: 'Acme Corporation' },
} satisfies Meta<typeof TextField>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

export const States: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-5">
      <TextField label="Company name" description="As shown on invoices" isRequired />
      <TextField
        label="Email"
        type="email"
        defaultValue="not-an-email"
        isInvalid
        errorMessage="Enter a valid email address"
      />
      <TextField label="Password" type="password" defaultValue="hunter2" />
      <TextField label="Rate" prefix="USD" suffix="/ kWh" defaultValue="0.18" isClearable />
      <TextField label="Account ID" defaultValue="ACC-10422" isReadOnly />
      <TextField label="Region" defaultValue="North" isDisabled />
      <TextField label="Small" size="sm" />
    </div>
  ),
};

/** Side labels sit beside the input in wide containers and move on top in narrow ones. */
export const SideLabels: Story = {
  render: () => (
    <div className="flex max-w-xl flex-col gap-4">
      <TextField label="Company name" labelPosition="side" description="As shown on invoices" />
      <TextField label="Billing email" type="email" labelPosition="side" isRequired />
    </div>
  ),
};
