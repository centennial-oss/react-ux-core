import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { TierEditor } from './TierEditor';
import type { Tiers } from './tiers';

const meta = {
  title: 'Inputs/TierEditor',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const prices: Tiers = [
  { from: 0, to: 500, value: 0.18 },
  { from: 500, to: 2000, value: 0.15 },
  { from: 2000, to: null, value: 0.12 },
];

/** Price per kWh by monthly usage; the last tier is open-ended. Adding a tier starts at the last one's end. */
export const UsageTiers: Story = {
  render: () => {
    const [value, setValue] = useState<Tiers>(prices);
    return (
      <TierEditor
        label="Energy price"
        description="Price per kWh, by monthly usage"
        value={value}
        onChange={setValue}
        boundUnit="kWh"
        valueLabel="Price per kWh"
        formatOptions={{ style: 'currency', currency: 'USD', minimumFractionDigits: 2 }}
        newRowValue={0.1}
        className="max-w-3xl"
      />
    );
  },
};

/** Problems: a gap between tiers, a tier that ends where it starts, and an open tier that isn't last. */
export const WithProblems: Story = {
  render: () => (
    <TierEditor
      label="Demand charge"
      defaultValue={[
        { from: 0, to: 100, value: 4 },
        { from: 150, to: null, value: 6 },
        { from: 300, to: 300, value: 8 },
      ]}
      boundUnit="kW"
      formatOptions={{ style: 'currency', currency: 'USD' }}
      className="max-w-3xl"
    />
  ),
};
