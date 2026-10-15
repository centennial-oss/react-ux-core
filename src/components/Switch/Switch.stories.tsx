import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Switch } from './Switch';

const meta = {
  title: 'Inputs/Switch',
  component: Switch,
  args: { children: 'Email notifications' },
} satisfies Meta<typeof Switch>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

export const States: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-3">
      <Switch>Off</Switch>
      <Switch defaultSelected>On</Switch>
      <Switch description="A weekly summary of activity, sent on Mondays.">Weekly digest</Switch>
      <Switch isDisabled>Disabled off</Switch>
      <Switch isDisabled defaultSelected>
        Disabled on
      </Switch>
      <Switch isReadOnly defaultSelected>
        Read-only
      </Switch>
      <Switch isInvalid errorMessage="Turn this on to continue">
        Accept the data policy
      </Switch>
    </div>
  ),
};

/** Long labels wrap beside the switch instead of widening the page. */
export const LongLabel: Story = {
  render: () => (
    <div className="max-w-xs">
      <Switch description="Applies to every site in this organisation, including archived ones.">
        Send a notification whenever a scheduled report finishes running
      </Switch>
    </div>
  ),
};

/** Controlled with `isSelected` / `onChange`. */
export const Controlled: Story = {
  tags: ['!visual'],
  render: function ControlledStory() {
    const [isOn, setOn] = useState(false);
    return (
      <div className="flex flex-col gap-2">
        <Switch isSelected={isOn} onChange={setOn}>
          Maintenance mode
        </Switch>
        <p className="text-sm text-fg-muted">Maintenance mode is {isOn ? 'on' : 'off'}.</p>
      </div>
    );
  },
};
