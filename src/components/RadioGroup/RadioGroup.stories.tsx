import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Radio, RadioGroup } from './RadioGroup';

const meta = {
  title: 'Inputs/RadioGroup',
  component: RadioGroup,
  args: {
    label: 'Billing interval',
    defaultValue: 'monthly',
    children: (
      <>
        <Radio value="monthly">Monthly</Radio>
        <Radio value="yearly">Yearly</Radio>
      </>
    ),
  },
} satisfies Meta<typeof RadioGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

/** Options stack vertically by default. Each option can have its own description. */
export const Vertical: Story = {
  render: () => (
    <RadioGroup
      label="Plan"
      description="You can change plans at any time."
      defaultValue="pro"
      isRequired
    >
      <Radio value="free" description="Up to 3 sites">
        Free
      </Radio>
      <Radio value="pro" description="Unlimited sites and API access">
        Pro
      </Radio>
      <Radio value="enterprise" description="Single sign-on and audit logs" isDisabled>
        Enterprise
      </Radio>
    </RadioGroup>
  ),
};

/** A horizontal group wraps onto more rows when space is short. */
export const Horizontal: Story = {
  render: () => (
    <div className="max-w-sm">
      <RadioGroup label="Units" orientation="horizontal" defaultValue="kwh">
        <Radio value="wh">Watt-hours</Radio>
        <Radio value="kwh">Kilowatt-hours</Radio>
        <Radio value="mwh">Megawatt-hours</Radio>
      </RadioGroup>
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-6">
      <RadioGroup label="Invalid" isInvalid errorMessage="Choose a delivery method">
        <Radio value="post">Post</Radio>
        <Radio value="courier">Courier</Radio>
      </RadioGroup>
      <RadioGroup label="Invalid with a choice" isInvalid defaultValue="post">
        <Radio value="post">Post</Radio>
        <Radio value="courier">Courier</Radio>
      </RadioGroup>
      <RadioGroup label="Disabled" isDisabled defaultValue="post">
        <Radio value="post">Post</Radio>
        <Radio value="courier">Courier</Radio>
      </RadioGroup>
      <RadioGroup label="Read-only" isReadOnly defaultValue="courier">
        <Radio value="post">Post</Radio>
        <Radio value="courier">Courier</Radio>
      </RadioGroup>
    </div>
  ),
};

/** Side labels sit beside the options in wide containers and move on top in narrow ones. */
export const SideLabel: Story = {
  render: () => (
    <div className="max-w-xl">
      <RadioGroup label="Interval" labelPosition="side" defaultValue="monthly">
        <Radio value="monthly">Monthly</Radio>
        <Radio value="yearly">Yearly</Radio>
      </RadioGroup>
    </div>
  ),
};

type Interval = 'monthly' | 'yearly';

/** Controlled with `value` / `onChange`; bound to union-typed state, `onChange` receives that union. */
export const Controlled: Story = {
  tags: ['!visual'],
  render: function ControlledStory() {
    const [interval, setBillingInterval] = useState<Interval>('yearly');
    return (
      <div className="flex flex-col gap-2">
        <RadioGroup label="Billing interval" value={interval} onChange={setBillingInterval}>
          <Radio value="monthly">Monthly</Radio>
          <Radio value="yearly">Yearly</Radio>
        </RadioGroup>
        <p className="text-sm text-fg-muted">Billed {interval}.</p>
      </div>
    );
  },
};
