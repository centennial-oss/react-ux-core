import { CalendarDate, getDayOfWeek } from '@internationalized/date';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DatePicker } from './DatePicker';

const meta = {
  title: 'Inputs/DatePicker',
  component: DatePicker,
  args: { label: 'Start date', timeZone: 'America/Denver' },
} satisfies Meta<typeof DatePicker>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

// Fixed dates (never "today") keep the visual snapshots stable.
const contractStart = new CalendarDate(2025, 3, 14);

export const States: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-5">
      <DatePicker
        label="Start date"
        description="When the contract begins"
        isRequired
        timeZone="America/Denver"
      />
      <DatePicker label="Invoice date" defaultValue={contractStart} timeZone="America/Denver" />
      <DatePicker
        label="Renewal date"
        defaultValue={new CalendarDate(2025, 2, 28)}
        isInvalid
        errorMessage="Renewal must be after the start date"
        timeZone="America/Denver"
      />
      <DatePicker
        label="Signed on"
        defaultValue={contractStart}
        isReadOnly
        timeZone="America/Denver"
      />
      <DatePicker label="Archived on" defaultValue={contractStart} isDisabled />
      <DatePicker label="Small" size="sm" defaultValue={contractStart} />
    </div>
  ),
};

/** Side labels sit beside the input in wide containers and move on top in narrow ones. */
export const SideLabels: Story = {
  render: () => (
    <div className="flex max-w-xl flex-col gap-4">
      <DatePicker label="Start date" labelPosition="side" defaultValue={contractStart} />
      <DatePicker label="End date" labelPosition="side" description="Leave empty for open-ended" />
    </div>
  ),
};

/**
 * Days before `minValue` are disabled and weekends are unavailable (struck through). The calendar is a popover on
 * tablet and desktop and a full-screen sheet on phones.
 */
export const OpenWithLimits: Story = {
  tags: ['visual-page'],
  render: () => (
    <div className="max-w-xs">
      <DatePicker
        label="Delivery date"
        defaultOpen
        defaultValue={contractStart}
        minValue={new CalendarDate(2025, 3, 5)}
        isDateUnavailable={(date) => getDayOfWeek(date, 'en-US') % 6 === 0}
        timeZone="America/Denver"
      />
    </div>
  ),
};
