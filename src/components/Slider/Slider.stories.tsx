import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { faderTicks, Mixer } from '../../../test/mixer';
import { Slider } from './Slider';

const meta = {
  title: 'Inputs/Slider',
  component: Slider,
  args: { label: 'Brightness', defaultValue: 60 },
} satisfies Meta<typeof Slider>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

export const States: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-6">
      <Slider label="Volume" description="Applies to alarms and alerts" defaultValue={40} />
      <Slider label="Without a value label" defaultValue={25} isValueHidden />
      <Slider
        label="Threshold"
        defaultValue={5}
        isInvalid
        errorMessage="Set the threshold to at least 10 for this site"
      />
      <Slider label="Disabled" defaultValue={70} isDisabled />
      <Slider aria-label="Zoom" defaultValue={50} />
    </div>
  ),
};

/** `formatOptions` (`Intl.NumberFormat`) formats the value shown and announced. */
export const Formatting: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-6">
      <Slider
        label="Battery reserve"
        minValue={0}
        maxValue={1}
        step={0.05}
        defaultValue={0.2}
        formatOptions={{ style: 'percent' }}
      />
      <Slider
        label="Monthly budget"
        minValue={0}
        maxValue={2000}
        step={50}
        defaultValue={650}
        formatOptions={{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }}
      />
      <Slider
        label="Precise (continuous)"
        minValue={0}
        maxValue={1}
        step={0.001}
        defaultValue={0.618}
      />
    </div>
  ),
};

/** Discrete steps with labelled ticks. */
export const Ticks: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-6">
      <Slider
        label="Fan speed"
        minValue={0}
        maxValue={4}
        step={1}
        defaultValue={2}
        ticks={[
          { value: 0, label: 'Off' },
          { value: 1, label: 'Low' },
          { value: 2, label: 'Medium' },
          { value: 3, label: 'High' },
          { value: 4, label: 'Max' },
        ]}
      />
      <Slider
        label="Tilt"
        maxValue={90}
        step={15}
        defaultValue={30}
        formatOptions={{ style: 'unit', unit: 'degree' }}
        ticks={[0, 15, 30, 45, 60, 75, 90].map((value) => ({ value }))}
      />
    </div>
  ),
};

/** Side labels put the label and value beside the track in wide containers. */
export const SideLabel: Story = {
  render: () => (
    <div className="max-w-xl">
      <Slider label="Brightness" labelPosition="side" defaultValue={60} />
    </div>
  ),
};

/** Controlled with `value` / `onChange`; `onChangeEnd` fires once when a drag or key press ends. */
export const Controlled: Story = {
  tags: ['!visual'],
  render: function ControlledStory() {
    const [value, setValue] = useState(30);
    const [committed, setCommitted] = useState(30);
    return (
      <div className="flex max-w-md flex-col gap-2">
        <Slider label="Volume" value={value} onChange={setValue} onChangeEnd={setCommitted} />
        <p className="text-sm text-fg-muted">
          Live: {value}, committed: {committed}
        </p>
      </div>
    );
  },
};

/** `orientation="vertical"` makes a fader: the minimum is at the bottom, and tick labels sit beside the track. */
export const Vertical: Story = {
  render: () => (
    <div className="flex flex-wrap items-start gap-6">
      <Slider
        label="Master"
        orientation="vertical"
        minValue={-60}
        maxValue={6}
        step={0.5}
        defaultValue={-6}
        ticks={faderTicks}
        formatOptions={{ signDisplay: 'exceptZero', maximumFractionDigits: 1 }}
      />
      <Slider label="Short" orientation="vertical" trackLength="sm" defaultValue={40} />
      <Slider
        label="Tall"
        orientation="vertical"
        trackLength="lg"
        defaultValue={75}
        description="Long track"
      />
      <Slider
        label="Invalid"
        orientation="vertical"
        defaultValue={95}
        isInvalid
        errorMessage="Too loud"
      />
      <Slider label="Disabled" orientation="vertical" defaultValue={30} isDisabled />
    </div>
  ),
};

/**
 * A 16-channel mixer: a pan Knob over a vertical fader per channel. At phone widths the desk scrolls sideways inside
 * its own region: swipe sideways on the channel names or the knobs (a knob turns only with a vertical drag).
 */
export const Mixer16: Story = {
  name: 'Mixer',
  render: () => <Mixer />,
};
