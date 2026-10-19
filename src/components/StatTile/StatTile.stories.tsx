import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { StatTile } from './StatTile';

const meta = {
  title: 'Display/StatTile',
  component: StatTile,
  args: { label: 'Energy today', value: '1,284', unit: 'kWh' },
} satisfies Meta<typeof StatTile>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

export const Grid: Story = {
  render: () => (
    <div className="grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        label="Energy today"
        value="1,284"
        unit="kWh"
        delta={{ value: '4.2%', direction: 'up' }}
        sparkline={[3, 5, 4, 8, 6, 9, 7, 11]}
        footer="vs. yesterday"
      />
      <StatTile
        label="Revenue (MTD)"
        value="$48,120"
        delta={{ value: '1.1%', direction: 'down' }}
      />
      <StatTile label="Errors" value="42" delta={{ value: '8', direction: 'up', tone: 'danger' }} />
      <StatTile
        label="Meters online"
        value="98.6"
        unit="%"
        delta={{ value: '0%', direction: 'flat' }}
      />
    </div>
  ),
};

/** Long values shrink to fit the tile instead of overflowing. */
export const LongValueNarrowTile: Story = {
  render: () => (
    <div className="w-44">
      <StatTile label="Lifetime energy" value="123,456,789" unit="kWh" />
    </div>
  ),
};

export const Loading: Story = { args: { isLoading: true } };

/** A tile that steps through variants of the same figure when pressed: the whole tile is a button. */
export const Pressable: Story = {
  render: function Render() {
    const sensors = [
      { value: '21.4', caption: 'Sensor A' },
      { value: '21.9', caption: 'Sensor B' },
      { value: '20.8', caption: 'Sensor C' },
    ];
    const [index, setIndex] = useState(0);
    const sensor = sensors[index] ?? sensors[0];
    return (
      <div className="max-w-xs">
        <StatTile
          label="Hall temperature"
          value={sensor?.value}
          unit="°C"
          footer={`${String(index + 1)} of ${String(sensors.length)} · ${sensor?.caption ?? ''}`}
          onPress={() => {
            setIndex((current) => (current + 1) % sensors.length);
          }}
          pressHint="Show the next value"
        />
      </div>
    );
  },
};
