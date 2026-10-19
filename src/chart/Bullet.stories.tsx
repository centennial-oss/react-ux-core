import type { Meta, StoryObj } from '@storybook/react-vite';
import { BulletChart } from './BulletChart';

const meta = {
  title: 'Chart/Bullet',
  component: BulletChart,
  parameters: { layout: 'padded' },
  args: {
    label: 'Observing hours',
    value: 1_840,
    target: 2_000,
    ranges: [
      { to: 1_500, label: 'Behind' },
      { to: 1_900, label: 'On track' },
      { to: 2_400, label: 'Ahead' },
    ],
    unit: 'h',
  },
} satisfies Meta<typeof BulletChart>;
export default meta;
type Story = StoryObj<typeof meta>;

/** A measure against its target over poor, satisfactory and good ranges; the range's name shows by the value. */
export const Default: Story = {};

/** Several bullets as a KPI list, each on its own scale. */
export const KpiList: Story = {
  render: () => (
    <div className="flex max-w-xl flex-col gap-5">
      <BulletChart
        label="Dome uptime"
        value={0.915}
        target={0.95}
        ranges={[
          { to: 0.8, label: 'Poor' },
          { to: 0.92, label: 'Satisfactory' },
          { to: 1, label: 'Good' },
        ]}
        formatOptions={{ style: 'percent', maximumFractionDigits: 1 }}
      />
      <BulletChart
        label="Observing hours"
        value={1_840}
        target={2_000}
        ranges={[
          { to: 1_500, label: 'Behind' },
          { to: 1_900, label: 'On track' },
          { to: 2_400, label: 'Ahead' },
        ]}
        unit="h"
      />
      <BulletChart
        label="Archive requests served"
        value={1.42}
        target={1.2}
        ranges={[
          { to: 0.8, label: 'Low' },
          { to: 1.4, label: 'Expected' },
          { to: 2, label: 'High' },
        ]}
        formatOptions={{ maximumFractionDigits: 2 }}
        unit="M"
      />
    </div>
  ),
};

/** No ranges or target: a plain bar on a scale. */
export const Plain: Story = {
  args: {
    label: 'Storage used',
    value: 61,
    maxValue: 100,
    unit: 'TB',
    ranges: [],
    target: undefined,
  },
};
