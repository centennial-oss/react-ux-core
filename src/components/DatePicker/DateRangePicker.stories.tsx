import { CalendarDate } from '@internationalized/date';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DateRangePicker } from './DateRangePicker';

const meta = {
  title: 'Inputs/DateRangePicker',
  component: DateRangePicker,
  args: { label: 'Stay', timeZone: 'America/Denver' },
} satisfies Meta<typeof DateRangePicker>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

// Fixed dates (never "today") keep the visual snapshots stable.
const stay = { start: new CalendarDate(2025, 3, 10), end: new CalendarDate(2025, 3, 14) };

export const States: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-5">
      <DateRangePicker label="Stay" description="Check-in to check-out" isRequired />
      <DateRangePicker label="Billing period" defaultValue={stay} />
      <DateRangePicker
        label="Report period"
        defaultValue={{ start: stay.start, end: new CalendarDate(2025, 4, 30) }}
        maxRangeDays={31}
        errorMessage="Choose 31 days or fewer"
      />
      <DateRangePicker label="Locked period" defaultValue={stay} isReadOnly />
      <DateRangePicker label="Archived period" defaultValue={stay} isDisabled />
      <DateRangePicker label="Small" size="sm" defaultValue={stay} />
    </div>
  ),
};

/**
 * With `maxRangeDays`, once the first end is picked the calendar makes days further away unavailable. A popover on
 * tablet and desktop, a full-screen sheet on phones.
 */
export const OpenWithMaxRange: Story = {
  tags: ['visual-page'],
  render: () => (
    <div className="max-w-xs">
      <DateRangePicker
        label="Stay"
        description="Up to 7 nights"
        defaultOpen
        defaultValue={stay}
        maxRangeDays={8}
        minValue={new CalendarDate(2025, 3, 3)}
      />
    </div>
  ),
};

/**
 * `visibleMonths={2}` shows two months side by side in the popover, so a range across a month boundary is easy to pick.
 * The phone sheet stacks them.
 */
export const OpenWithTwoMonths: Story = {
  tags: ['visual-page'],
  render: () => (
    <div className="max-w-xs">
      <DateRangePicker
        label="Stay"
        defaultOpen
        defaultValue={{ start: new CalendarDate(2025, 3, 28), end: new CalendarDate(2025, 4, 3) }}
        visibleMonths={2}
        timeZone="America/Denver"
      />
    </div>
  ),
};
