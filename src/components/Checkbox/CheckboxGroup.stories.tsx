import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Checkbox } from './Checkbox';
import { CheckboxGroup } from './CheckboxGroup';

const meta = {
  title: 'Inputs/CheckboxGroup',
  component: CheckboxGroup,
  args: {
    label: 'Notification channels',
    defaultValue: ['email'],
    children: (
      <>
        <Checkbox value="email">Email</Checkbox>
        <Checkbox value="sms">SMS</Checkbox>
        <Checkbox value="push">Push notification</Checkbox>
      </>
    ),
  },
} satisfies Meta<typeof CheckboxGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

/** Options stack vertically by default. Each option can have its own description. */
export const Vertical: Story = {
  render: () => (
    <CheckboxGroup
      label="Notification channels"
      description="Where we send alerts about your sites."
      defaultValue={['email', 'push']}
      isRequired
    >
      <Checkbox value="email">Email</Checkbox>
      <Checkbox value="sms" description="Carrier charges may apply.">
        SMS
      </Checkbox>
      <Checkbox value="push">Push notification</Checkbox>
      <Checkbox value="fax" isDisabled>
        Fax
      </Checkbox>
    </CheckboxGroup>
  ),
};

/** A horizontal group wraps onto more rows when space is short. */
export const Horizontal: Story = {
  render: () => (
    <div className="max-w-sm">
      <CheckboxGroup label="Days" orientation="horizontal" defaultValue={['mon', 'wed', 'fri']}>
        <Checkbox value="mon">Monday</Checkbox>
        <Checkbox value="tue">Tuesday</Checkbox>
        <Checkbox value="wed">Wednesday</Checkbox>
        <Checkbox value="thu">Thursday</Checkbox>
        <Checkbox value="fri">Friday</Checkbox>
      </CheckboxGroup>
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-6">
      <CheckboxGroup label="Invalid" isInvalid errorMessage="Choose at least one channel">
        <Checkbox value="email">Email</Checkbox>
        <Checkbox value="sms">SMS</Checkbox>
      </CheckboxGroup>
      <CheckboxGroup label="Disabled" isDisabled defaultValue={['email']}>
        <Checkbox value="email">Email</Checkbox>
        <Checkbox value="sms">SMS</Checkbox>
      </CheckboxGroup>
      <CheckboxGroup label="Read-only" isReadOnly defaultValue={['sms']}>
        <Checkbox value="email">Email</Checkbox>
        <Checkbox value="sms">SMS</Checkbox>
      </CheckboxGroup>
    </div>
  ),
};

/** Side labels sit beside the options in wide containers and move on top in narrow ones. */
export const SideLabel: Story = {
  render: () => (
    <div className="max-w-xl">
      <CheckboxGroup label="Channels" labelPosition="side" description="Pick any">
        <Checkbox value="email">Email</Checkbox>
        <Checkbox value="sms">SMS</Checkbox>
      </CheckboxGroup>
    </div>
  ),
};

/** Controlled with `value` / `onChange`, which receives the checked values. */
export const Controlled: Story = {
  tags: ['!visual'],
  render: function ControlledStory() {
    const [value, setValue] = useState<string[]>(['email']);
    return (
      <div className="flex flex-col gap-2">
        <CheckboxGroup label="Channels" value={value} onChange={setValue}>
          <Checkbox value="email">Email</Checkbox>
          <Checkbox value="sms">SMS</Checkbox>
          <Checkbox value="push">Push</Checkbox>
        </CheckboxGroup>
        <p className="text-sm text-fg-muted">Selected: {value.join(', ') || 'none'}</p>
      </div>
    );
  },
};

/**
 * A checked multiple-response question: chosen and correct, chosen and wrong, and correct but missed, each marked in
 * place with `feedback`.
 */
export const CheckedAnswers: Story = {
  render: () => (
    <CheckboxGroup
      label="Which two planets are gas giants? (Choose two.)"
      value={['jupiter', 'mars']}
      isReadOnly
    >
      <Checkbox value="jupiter" feedback={{ tone: 'success', message: 'Your answer, correct' }}>
        Jupiter
      </Checkbox>
      <Checkbox value="mars" feedback={{ tone: 'danger', message: 'Your answer' }}>
        Mars
      </Checkbox>
      <Checkbox
        value="saturn"
        feedback={{ tone: 'warning', message: 'Correct answer, not chosen' }}
      >
        Saturn
      </Checkbox>
      <Checkbox value="venus">Venus</Checkbox>
    </CheckboxGroup>
  ),
};
