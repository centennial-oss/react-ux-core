import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { RangeSlider } from './Slider';

const meta = {
  title: 'Inputs/RangeSlider',
  component: RangeSlider,
  args: { label: 'Price per night', defaultValue: [80, 240], maxValue: 400 },
} satisfies Meta<typeof RangeSlider>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

export const States: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-6">
      <RangeSlider
        label="Price per night"
        description="Taxes not included"
        maxValue={400}
        step={10}
        defaultValue={[80, 240]}
        formatOptions={{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }}
      />
      <RangeSlider
        label="Charging window"
        minValue={0}
        maxValue={24}
        defaultValue={[10, 11]}
        isInvalid
        errorMessage="Choose a window of at least 3 hours"
      />
      <RangeSlider label="Disabled" defaultValue={[30, 70]} isDisabled />
    </div>
  ),
};

/** Hours of the day with tick labels; each thumb has its own accessible name. */
export const Ticks: Story = {
  render: () => (
    <div className="max-w-md">
      <RangeSlider
        label="Quiet hours"
        startLabel="Start"
        endLabel="End"
        minValue={0}
        maxValue={24}
        defaultValue={[22, 24]}
        ticks={[
          { value: 0, label: '00:00' },
          { value: 6, label: '06:00' },
          { value: 12, label: '12:00' },
          { value: 18, label: '18:00' },
          { value: 24, label: '24:00' },
        ]}
      />
    </div>
  ),
};

/** Controlled with `value` / `onChange`, which receives `[start, end]`. */
export const Controlled: Story = {
  tags: ['!visual'],
  render: function ControlledStory() {
    const [range, setRange] = useState<[number, number]>([25, 75]);
    return (
      <div className="flex max-w-md flex-col gap-2">
        <RangeSlider label="Range" value={range} onChange={setRange} />
        <p className="text-sm text-fg-muted">
          From {range[0]} to {range[1]}
        </p>
      </div>
    );
  },
};
