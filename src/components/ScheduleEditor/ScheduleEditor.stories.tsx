import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Pillbox } from '../Pillbox/Pillbox';
import type { Schedule } from './schedule';
import { ScheduleEditor } from './ScheduleEditor';

const meta = {
  title: 'Inputs/ScheduleEditor',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const setpoints: Schedule = [
  { start: '00:00', end: '06:00', value: 40 },
  { start: '06:00', end: '18:00', value: 120 },
  { start: '18:00', end: '22:00', value: 90 },
  { start: '22:00', end: '24:00', value: 40 },
];

/** A full-day schedule of power limits in kW, with the 24-hour preview. */
export const Limits: Story = {
  render: () => {
    const [value, setValue] = useState<Schedule>(setpoints);
    return (
      <ScheduleEditor
        label="Demand limit"
        description="The most the site may draw at each time of day"
        value={value}
        onChange={setValue}
        unit="kW"
        minValue={0}
        newRowValue={50}
        isFullDayRequired
        className="max-w-3xl"
      />
    );
  },
};

/** Problems: a period that ends before it starts, an overlap, and time the schedule doesn't cover. */
export const WithProblems: Story = {
  render: () => (
    <ScheduleEditor
      label="Charging windows"
      defaultValue={[
        { start: '00:00', end: '05:00', value: 0.8 },
        { start: '04:00', end: '07:00', value: 0.5 },
        { start: '13:00', end: '12:00', value: 0.3 },
      ]}
      formatOptions={{ style: 'percent' }}
      allowsGaps={false}
      isFullDayRequired
      className="max-w-3xl"
    />
  ),
};

type Mode = 'eco' | 'comfort';

/** Any value type, through a custom field. */
export const CustomValues: Story = {
  render: () => (
    <ScheduleEditor<Mode>
      label="Heating mode"
      defaultValue={[
        { start: '00:00', end: '07:00', value: 'eco' },
        { start: '07:00', end: '22:00', value: 'comfort' },
        { start: '22:00', end: '24:00', value: 'eco' },
      ]}
      newRowValue="eco"
      formatValue={(mode) => (mode === 'eco' ? 'Eco' : 'Comfort')}
      toNumber={(mode) => (mode === 'eco' ? 0 : 1)}
      valueLabel="Mode"
      renderValue={({ value, onChange, label, 'aria-label': ariaLabel, isDisabled }) => (
        <Pillbox
          aria-label={ariaLabel ?? label ?? ''}
          value={value}
          onChange={onChange}
          isDisabled={isDisabled}
          options={[
            { id: 'eco', label: 'Eco' },
            { id: 'comfort', label: 'Comfort' },
          ]}
        />
      )}
      className="max-w-3xl"
    />
  ),
};
