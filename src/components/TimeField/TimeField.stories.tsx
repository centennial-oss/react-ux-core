import { parseZonedDateTime, Time } from '@internationalized/date';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { TimeField } from './TimeField';

const meta = {
  title: 'Inputs/TimeField',
  component: TimeField,
  args: { label: 'Opens at' },
} satisfies Meta<typeof TimeField>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

export const States: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-5">
      <TimeField label="Opens at" description="Local time at the site" isRequired />
      <TimeField label="Closes at" defaultValue={new Time(17, 30)} />
      <TimeField label="24-hour" hourCycle={24} defaultValue={new Time(17, 30)} />
      <TimeField label="With seconds" granularity="second" defaultValue={new Time(9, 5, 30)} />
      <TimeField
        label="Break starts"
        defaultValue={new Time(3)}
        isInvalid
        errorMessage="Choose a time in business hours"
      />
      <TimeField label="Locked" defaultValue={new Time(9)} isReadOnly />
      <TimeField label="Disabled" defaultValue={new Time(9)} isDisabled />
      <TimeField label="Small" size="sm" defaultValue={new Time(9)} />
    </div>
  ),
};

/** A zoned value is shown in `timeZone` (or the provider's), with the zone's abbreviation unless hidden. */
export const TimeZones: Story = {
  render: () => {
    // A fixed instant (never "now"), so the zone abbreviations and the visual snapshots stay stable.
    const instant = parseZonedDateTime('2025-03-14T14:30[America/Denver]');
    return (
      <div className="flex max-w-md flex-col gap-5">
        <TimeField label="Denver" timeZone="America/Denver" defaultValue={instant} />
        <TimeField label="London" timeZone="Europe/London" defaultValue={instant} />
        <TimeField
          label="Tokyo (zone hidden)"
          timeZone="Asia/Tokyo"
          defaultValue={instant}
          hideTimeZone
        />
      </div>
    );
  },
};
