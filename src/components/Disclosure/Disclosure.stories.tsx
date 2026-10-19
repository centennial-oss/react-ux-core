import type { Meta, StoryObj } from '@storybook/react-vite';
import { Gauge } from 'lucide-react';
import { Button } from '../Button';
import { Accordion, CollapsibleCard, Disclosure } from './Disclosure';

const meta = {
  title: 'Display/Disclosure',
  component: Disclosure,
  args: { title: 'Advanced settings', children: 'Settings most people never need to change.' },
} satisfies Meta<typeof Disclosure>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {
  render: (args) => (
    <div className="max-w-md">
      <Disclosure {...args} />
      <Disclosure title="Expanded by default" defaultExpanded>
        This one starts open.
      </Disclosure>
    </div>
  ),
};

export const AccordionGroup: Story = {
  name: 'Accordion',
  render: () => (
    <Accordion defaultExpandedKeys={['billing']} className="max-w-md">
      <Disclosure id="billing" title="How is billing calculated?">
        Usage is metered hourly and billed monthly.
      </Disclosure>
      <Disclosure id="tariffs" title="Can I change tariffs?">
        Yes, from the start of the next billing period.
      </Disclosure>
      <Disclosure id="export" title="Can I export my data?" isDisabled>
        Export is coming soon.
      </Disclosure>
    </Accordion>
  ),
};

export const Collapsible: Story = {
  name: 'CollapsibleCard',
  render: () => (
    <CollapsibleCard
      title="Meter M-1042"
      description="Commercial tariff · Plant 12"
      icon={Gauge}
      defaultExpanded
      actions={
        <Button size="sm" variant="outline">
          Edit
        </Button>
      }
      className="max-w-md"
    >
      <p className="text-sm">Last reading 1,284 kWh at 09:30.</p>
    </CollapsibleCard>
  ),
};
