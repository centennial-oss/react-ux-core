import { parseZonedDateTime } from '@internationalized/date';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DateTimePicker } from './DateTimePicker';

// A fixed instant and zone (never "now"), so the zone abbreviation and the visual snapshots stay stable.
const meeting = parseZonedDateTime('2025-03-14T14:30[America/Denver]');

const meta = {
  title: 'Inputs/DateTimePicker',
  component: DateTimePicker,
  args: { label: 'Meeting', timeZone: 'America/Denver', placeholderValue: meeting },
} satisfies Meta<typeof DateTimePicker>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

export const States: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-5">
      <DateTimePicker
        label="Meeting"
        description="Shown in Mountain Time"
        timeZone="America/Denver"
        placeholderValue={meeting}
        isRequired
      />
      <DateTimePicker label="Starts" timeZone="America/Denver" defaultValue={meeting} />
      <DateTimePicker
        label="Starts (Tokyo, 24-hour)"
        timeZone="Asia/Tokyo"
        hourCycle={24}
        defaultValue={meeting}
      />
      <DateTimePicker
        label="Starts (zone hidden, seconds)"
        timeZone="America/Denver"
        hideTimeZone
        granularity="second"
        defaultValue={meeting}
      />
      <DateTimePicker
        label="Ends"
        timeZone="America/Denver"
        defaultValue={meeting}
        isInvalid
        errorMessage="The meeting must end after it starts"
      />
      <DateTimePicker label="Locked" timeZone="America/Denver" defaultValue={meeting} isReadOnly />
      <DateTimePicker
        label="Disabled"
        timeZone="America/Denver"
        defaultValue={meeting}
        isDisabled
      />
    </div>
  ),
};

/** The calendar with time entry below it. On phones it's a full-screen sheet with large time segments. */
export const Open: Story = {
  tags: ['visual-page'],
  render: () => (
    <div className="max-w-xs">
      <DateTimePicker
        label="Meeting"
        timeZone="America/Denver"
        defaultOpen
        defaultValue={meeting}
      />
    </div>
  ),
};
