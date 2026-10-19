import type { Meta, StoryObj } from '@storybook/react-vite';
import { services, uptimeDays } from '../../../test/people';
import { UptimeBar } from './UptimeBar';

const meta = {
  title: 'Display/UptimeBar',
  component: UptimeBar,
  args: { label: 'Telescope array', days: uptimeDays(90) },
} satisfies Meta<typeof UptimeBar>;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Ninety days as thin bars coloured by threshold (warning below 99.9%, danger below 99%), the overall uptime and a
 * summary. Hover, focus or tap a day for its details; arrow keys move between days.
 */
export const Default: Story = {};

/** Days without data are grey and don't count toward the overall uptime. */
export const MissingData: Story = {
  args: { label: 'Archive', days: uptimeDays(90, 1) },
};

/** Stricter thresholds: a warning below 100% and danger below 99.9%. */
export const CustomThresholds: Story = {
  args: { label: 'Weather station', thresholds: { warning: 100, danger: 99.9 } },
};

/** Thirty days, for a shorter report. */
export const ThirtyDays: Story = {
  args: { label: 'Data pipeline', days: uptimeDays(30, 2) },
};

/** A status grid: twelve services by ninety days. */
export const ServiceGrid: Story = {
  render: () => (
    <div className="flex flex-col gap-5">
      {services.map((service, index) => (
        <UptimeBar key={service} label={service} days={uptimeDays(90, index)} />
      ))}
    </div>
  ),
};
