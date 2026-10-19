import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../../components/Button/Button';
import { DialogTrigger } from '../../components/Dialog/Dialog';
import type { FormConfig, SubmitResult } from '../types';
import { CardForm } from './CardForm';
import { DialogForm } from './DialogForm';
import { PageForm } from './PageForm';
import { WizardForm } from './WizardForm';

const meta = {
  title: 'Form/Containers',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface Meter {
  label: string;
  serial: string;
  capacity: number | null;
  notes: string;
}

const meterConfig: FormConfig<Meter> = {
  defaultValues: { label: 'Main meter', serial: 'EM-20419', capacity: 60, notes: '' },
  layout: [{ id: 'meter', columns: 2, fields: ['label', 'serial', 'capacity', 'notes'] }],
  fields: [
    { type: 'text', name: 'label', label: 'Label', isRequired: true },
    { type: 'text', name: 'serial', label: 'Serial number', isRequired: true },
    { type: 'number', name: 'capacity', label: 'Capacity', unit: 'A' },
    { type: 'textarea', name: 'notes', label: 'Notes', colSpan: 'full' },
  ],
  actions: {
    update: async (): Promise<SubmitResult> => {
      await wait(600);
      return { ok: true, message: 'Meter saved' };
    },
    delete: async (): Promise<SubmitResult> => {
      await wait(600);
      return { ok: true, message: 'Meter deleted' };
    },
  },
};

/**
 * DialogForm: the buttons sit in the dialog footer. It can't be dismissed while saving; with unsaved changes Escape
 * and the backdrop don't close it, and Cancel asks first. Full screen on phones.
 */
export const Dialog: Story = {
  tags: ['visual-page'],
  render: () => (
    <DialogTrigger defaultOpen>
      <Button>Edit meter</Button>
      <DialogForm
        title="Edit meter"
        description="Changes apply immediately."
        config={meterConfig}
      />
    </DialogTrigger>
  ),
};

/** CardForm with the edit toggle: the record reads as a detail card until Edit, then edits in place. */
export const Card: Story = {
  render: () => (
    <CardForm
      title="Meter"
      description="Installed at the north substation."
      config={meterConfig}
      defaultMode="view"
      hasEditToggle
      className="max-w-2xl"
    />
  ),
};

/** PageForm: a full page with an action bar that stays at the bottom of the screen as the page scrolls. */
export const Page: Story = {
  render: () => (
    <PageForm
      title="Edit meter"
      description="Meter details for billing and outage alerts."
      config={meterConfig}
      onCancel={() => undefined}
      className="max-w-3xl"
    />
  ),
};

interface Refund {
  account: string;
  invoice: string | null;
  amount: string | null;
  reason: string;
  shouldNotify: boolean;
}

/**
 * WizardForm: each step must be valid before Next, and the summary lists every value before the refund is issued.
 * Shows "Step 2 of 4" on phones too.
 */
export const Wizard: Story = {
  tags: ['visual-page'],
  render: () => (
    <DialogTrigger defaultOpen>
      <Button>Issue a refund</Button>
      <WizardForm<Refund>
        title="Issue a refund"
        hasSummaryStep
        steps={[
          { id: 'account', title: 'Account', fields: ['account', 'invoice'] },
          { id: 'amount', title: 'Amount', fields: ['amount', 'reason'] },
          { id: 'notify', title: 'Notify', fields: ['shouldNotify'] },
        ]}
        config={{
          defaultValues: {
            account: '',
            invoice: null,
            amount: null,
            reason: '',
            shouldNotify: true,
          },
          fields: [
            { type: 'text', name: 'account', label: 'Account number', isRequired: true },
            {
              type: 'select',
              name: 'invoice',
              label: 'Invoice',
              isRequired: true,
              items: [
                { id: 'inv-1042', label: 'INV-1042 · March' },
                { id: 'inv-1043', label: 'INV-1043 · April' },
              ],
            },
            { type: 'money', name: 'amount', label: 'Amount', currency: 'USD', isRequired: true },
            { type: 'textarea', name: 'reason', label: 'Reason' },
            { type: 'switch', name: 'shouldNotify', label: 'Email the customer' },
          ],
          actions: {
            create: async () => {
              await wait(600);
              return { ok: true, message: 'Refund issued' };
            },
            submitLabel: 'Issue refund',
          },
        }}
      />
    </DialogTrigger>
  ),
};
