import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Mixer } from '../../../test/mixer';
import { Knob } from './Knob';

const meta = {
  title: 'Inputs/Knob',
  component: Knob,
  args: { label: 'Gain', defaultValue: 40 },
} satisfies Meta<typeof Knob>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

/** Small, medium and large. Every size keeps a touch target of at least `--hit-size`. */
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-end gap-6">
      <Knob label="Small" size="sm" defaultValue={25} />
      <Knob label="Medium" size="md" defaultValue={50} />
      <Knob label="Large" size="lg" defaultValue={75} />
    </div>
  ),
};

/** `unit` is shown with the value and announced with it; `formatOptions` formats the number. */
export const Units: Story = {
  render: () => (
    <div className="flex flex-wrap items-start gap-6">
      <Knob
        label="Gain"
        unit="dB"
        minValue={-24}
        maxValue={24}
        step={0.5}
        defaultValue={-6}
        isBipolar
        formatOptions={{ signDisplay: 'exceptZero', maximumFractionDigits: 1 }}
      />
      <Knob
        label="Cutoff"
        unit="Hz"
        scale="log"
        minValue={20}
        maxValue={20000}
        defaultValue={1000}
        ticks={[20, 100, 1000, 10000, 20000]}
      />
      <Knob
        label="Mix"
        minValue={0}
        maxValue={1}
        step={0.01}
        defaultValue={0.35}
        formatOptions={{ style: 'percent' }}
      />
    </div>
  ),
};

/** `isBipolar` fills from the centre, with a detent there while dragging (pan, EQ gain). */
export const Bipolar: Story = {
  render: () => (
    <div className="flex flex-wrap items-start gap-6">
      <Knob label="Pan" minValue={-100} maxValue={100} isBipolar defaultValue={-40} />
      <Knob label="Centred" minValue={-100} maxValue={100} isBipolar />
      <Knob label="Treble" unit="dB" minValue={-12} maxValue={12} isBipolar defaultValue={5} />
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex flex-wrap items-start gap-6">
      <Knob
        label="Described"
        description="Double-click to reset"
        defaultValue={60}
        resetValue={50}
      />
      <Knob label="Invalid" defaultValue={95} isInvalid errorMessage="Clipping above 90" />
      <Knob label="Read-only" defaultValue={30} isReadOnly />
      <Knob label="Disabled" defaultValue={70} isDisabled />
      <Knob label="Value as text" defaultValue={45} isValueEditable={false} />
      <Knob aria-label="Unlabelled" defaultValue={20} isValueHidden />
    </div>
  ),
};

/** Controlled, with `onChangeEnd` reporting once per drag, key press or typed value. */
export const Controlled: Story = {
  tags: ['!visual'],
  render: function ControlledStory() {
    const [value, setValue] = useState(30);
    const [committed, setCommitted] = useState(30);
    return (
      <div className="flex flex-col items-start gap-2">
        <Knob label="Volume" value={value} onChange={setValue} onChangeEnd={setCommitted} />
        <p className="text-sm text-fg-muted">
          Live: {value}, committed: {committed}
        </p>
      </div>
    );
  },
};

/** Pan knobs over vertical faders: a mixer that scrolls sideways inside its region on narrow screens. */
export const InAMixer: Story = {
  render: () => <Mixer channels={8} />,
};
