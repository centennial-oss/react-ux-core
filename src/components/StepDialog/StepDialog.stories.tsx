import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button } from '../Button';
import { DialogTrigger } from '../Dialog';
import { TextField } from '../TextField';
import { StepDialog } from './StepDialog';

const meta = {
  title: 'Overlays/StepDialog',
  component: StepDialog,
  args: { title: 'Steps', steps: [], onConfirm: () => undefined },
} satisfies Meta<typeof StepDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

/** A money flow: validated steps, then a generated summary before the final confirm. */
export const RefundWizard: Story = {
  tags: ['visual-page'],
  render: function RefundWizardStory() {
    const [customer, setCustomer] = useState('Acme Corporation');
    const [amount, setAmount] = useState('120.00');
    return (
      <DialogTrigger defaultOpen>
        <Button tone="accent">Issue refund</Button>
        <StepDialog
          title="Issue refund"
          hasSummaryStep
          confirmLabel="Issue refund"
          onConfirm={() => new Promise((resolve) => setTimeout(resolve, 1000))}
          steps={[
            {
              id: 'customer',
              title: 'Customer',
              content: (
                <TextField label="Customer" value={customer} onChange={setCustomer} isRequired />
              ),
              canAdvance: customer.trim() !== '',
              summary: [{ label: 'Customer', value: customer }],
            },
            {
              id: 'amount',
              title: 'Amount',
              content: (
                <TextField
                  label="Amount"
                  prefix="USD"
                  inputMode="decimal"
                  value={amount}
                  onChange={setAmount}
                />
              ),
              validate: () =>
                Number(amount) > 0 && Number(amount) <= 500
                  ? true
                  : 'Enter an amount between 0.01 and 500.',
              summary: [{ label: 'Amount', value: `USD ${amount}` }],
            },
          ]}
        />
      </DialogTrigger>
    );
  },
};
