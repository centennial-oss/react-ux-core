import type { Meta, StoryObj } from '@storybook/react-vite';
import { SegmentedMeter } from './SegmentedMeter';

const meta = {
  title: 'Display/SegmentedMeter',
  component: SegmentedMeter,
  args: {
    label: 'Archive storage',
    unit: 'GiB',
    maxValue: 100,
    segments: [
      { id: 'used', label: 'Used', value: 62 },
      { id: 'reserved', label: 'Reserved', value: 10 },
    ],
    markers: [{ value: 80, label: 'Soft limit' }],
  },
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SegmentedMeter>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Used, reserved and free of a 100 GiB quota, with an 80 GiB soft-limit marker. */
export const Quota: Story = {};

/** The total has passed the soft limit: the marker and the total turn to a warning. */
export const OverSoftLimit: Story = {
  args: {
    segments: [
      { id: 'used', label: 'Used', value: 74 },
      { id: 'reserved', label: 'Reserved', value: 12 },
    ],
  },
};

/** Past capacity: the scale stretches to the total and the share past the maximum is hatched. */
export const OverCapacity: Story = {
  args: {
    segments: [
      { id: 'used', label: 'Used', value: 96 },
      { id: 'reserved', label: 'Reserved', value: 16 },
    ],
  },
};

/** An observing-time budget in hours, with tone colours and two markers. */
export const Budget: Story = {
  args: {
    label: 'Telescope time this semester',
    unit: 'h',
    maxValue: 400,
    segments: [
      { id: 'observed', label: 'Observed', value: 182, color: 'chart-3' },
      { id: 'scheduled', label: 'Scheduled', value: 96, color: 'chart-6' },
      { id: 'lost', label: 'Lost to weather', value: 41, color: 'neutral' },
    ],
    markers: [
      { value: 200, label: 'Mid-semester' },
      { value: 360, label: 'Allocation' },
    ],
  },
};

/** Sizes, without a legend, and with currency formatting (no unit). */
export const Variants: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <SegmentedMeter
          key={size}
          size={size}
          label="Lab freezer capacity"
          unit="racks"
          maxValue={24}
          segments={[
            { id: 'samples', label: 'Samples', value: 14 },
            { id: 'reagents', label: 'Reagents', value: 5 },
          ]}
          hasLegend={size !== 'sm'}
        />
      ))}
      <SegmentedMeter
        label="Outreach budget"
        maxValue={12000}
        formatOptions={{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }}
        segments={[
          { id: 'spent', label: 'Spent', value: 7400 },
          { id: 'committed', label: 'Committed', value: 2100 },
        ]}
      />
    </div>
  ),
};
