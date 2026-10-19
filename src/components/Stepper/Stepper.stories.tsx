import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { Stepper, type StepperStep } from './Stepper';

const CHECKOUT: StepperStep[] = [
  { id: 'cart', title: 'Cart', description: '3 items' },
  { id: 'shipping', title: 'Shipping', description: 'Address and speed' },
  { id: 'payment', title: 'Payment', description: 'Card or invoice' },
  { id: 'review', title: 'Review', description: 'Check and place the order' },
];

const ONBOARDING: StepperStep[] = [
  { id: 'account', title: 'Create the account', description: 'Name, email and password.' },
  {
    id: 'team',
    title: 'Invite your team',
    description: 'They get an email with a link to join.',
    isOptional: true,
    status: 'skipped',
  },
  {
    id: 'billing',
    title: 'Add billing details',
    description: 'The card was declined. Try another one.',
    status: 'error',
    content: (
      <Button size="sm" tone="accent">
        Update card
      </Button>
    ),
  },
  { id: 'domain', title: 'Connect a domain', isOptional: true },
  {
    id: 'launch',
    title: 'Launch',
    description: 'Waiting for billing.',
    isDisabled: true,
  },
];

const meta = {
  title: 'Display/Stepper',
  component: Stepper,
  args: { steps: CHECKOUT, defaultCurrentStep: 1, label: 'Checkout' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['numbered', 'dot', 'arrow', 'compact'] },
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
  },
} satisfies Meta<typeof Stepper>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

/** Numbered steps in a row: done steps before the current one, upcoming after it. */
export const Horizontal: Story = {};

/** A column of steps, with room for each step's description and content. */
export const Vertical: Story = {
  args: { orientation: 'vertical', steps: ONBOARDING, defaultCurrentStep: 2, label: 'Onboarding' },
};

/** Every state: done, skipped (and optional), current with an error, optional, and disabled (locked). */
export const States: Story = {
  args: { steps: ONBOARDING, defaultCurrentStep: 2, label: 'Onboarding' },
};

/** Small dots instead of numbers, for a quieter row. */
export const Dots: Story = {
  args: { variant: 'dot' },
};

export const DotsVertical: Story = {
  args: { variant: 'dot', orientation: 'vertical', steps: ONBOARDING, defaultCurrentStep: 2 },
};

/** Arrow-shaped segments in a row, like a breadcrumb trail. */
export const Arrows: Story = {
  args: { variant: 'arrow', defaultCurrentStep: 2 },
};

/**
 * "Step 2 of 5" over a segmented bar, with the current step's title: for narrow containers. Horizontal steppers
 * switch to it by themselves when there isn't room for every step (`compactBelow`).
 */
export const Compact: Story = {
  args: { variant: 'compact' },
};

/** The same horizontal stepper in a narrow column switches to the compact variant. */
export const NarrowContainer: Story = {
  render: (args) => (
    <div className="w-72 max-w-full">
      <Stepper {...args} />
    </div>
  ),
};

/** Any step can be pressed to go to it (non-linear). */
export const Clickable: Story = {
  render: function Render(args) {
    const [current, setCurrent] = useState(1);
    return <Stepper {...args} currentStep={current} onCurrentStepChange={setCurrent} />;
  },
};

/** With `isLinear`, only steps already reached can be pressed; the next ones wait for Next. */
export const Linear: Story = {
  render: function Render(args) {
    const [current, setCurrent] = useState(2);
    return (
      <div className="flex flex-col gap-6">
        <Stepper {...args} isLinear currentStep={current} onCurrentStepChange={setCurrent} />
        <div className="flex gap-2">
          <Button
            isDisabled={current === 0}
            onPress={() => {
              setCurrent(current - 1);
            }}
          >
            Back
          </Button>
          <Button
            tone="accent"
            isDisabled={current >= CHECKOUT.length}
            onPress={() => {
              setCurrent(current + 1);
            }}
          >
            Next
          </Button>
        </div>
      </div>
    );
  },
};

/** A vertical stepper whose steps can be pressed, with a badge beside each title. */
export const ClickableVertical: Story = {
  args: {
    orientation: 'vertical',
    steps: CHECKOUT.map((step, index) => ({
      ...step,
      badge: index === 0 ? <Badge tone="success">Saved</Badge> : undefined,
    })),
  },
  render: function Render(args) {
    const [current, setCurrent] = useState(1);
    return <Stepper {...args} currentStep={current} onCurrentStepChange={setCurrent} />;
  },
};

/**
 * A standing checklist whose steps happen on different screens over days: vertical, with an "N of M done" progress
 * bar (`hasProgressBar`), each status in words beside its title (`hasStatusBadges`), headings, and an action per
 * step. Blocked steps are upcoming and `isDisabled`.
 */
export const Checklist: Story = {
  args: {
    label: 'Site setup',
    orientation: 'vertical',
    headingLevel: 3,
    hasProgressBar: true,
    hasStatusBadges: true,
    currentStep: 1,
    steps: [
      {
        id: 'users',
        title: 'Add users',
        description: 'Operators and vendors can sign in.',
      },
      {
        id: 'settings',
        title: 'Confirm site settings',
        description: 'Time zone, currency and phone code.',
        content: (
          <Button size="sm" tone="accent">
            Confirm
          </Button>
        ),
      },
      {
        id: 'driver',
        title: 'Register a meter driver',
        content: <Button size="sm">Register</Button>,
      },
      {
        id: 'tariff',
        title: 'Create the first tariff',
        description: 'Waiting for the site settings.',
        isDisabled: true,
      },
    ],
  },
};

/** Status badges in a horizontal stepper sit under each title. */
export const StatusBadges: Story = {
  args: { hasStatusBadges: true, steps: ONBOARDING, defaultCurrentStep: 2, label: 'Onboarding' },
};

/** Every step done (`currentStep` is the number of steps). */
export const AllDone: Story = {
  args: { currentStep: CHECKOUT.length },
};

/** Right to left: the row, its connectors and the arrows are mirrored. */
export const RightToLeft: Story = {
  render: (args) => (
    <div dir="rtl" className="flex flex-col gap-8">
      <Stepper {...args} />
      <Stepper {...args} variant="arrow" />
    </div>
  ),
};
