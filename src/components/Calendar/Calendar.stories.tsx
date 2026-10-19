import { CalendarDate, getDayOfWeek, type DateValue } from '@internationalized/date';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Calendar, RangeCalendar, type CalendarDayInfo } from './Calendar';

const meta = {
  title: 'Inputs/Calendar',
  component: Calendar,
  args: { 'aria-label': 'Delivery date', timeZone: 'America/Denver' },
} satisfies Meta<typeof Calendar>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Opens on today. */
export const Playground: Story = { tags: ['!visual'] };

// Fixed dates (never "today") keep the visual snapshots stable.
const march14 = new CalendarDate(2025, 3, 14);
const isWeekend = (date: DateValue) => getDayOfWeek(date, 'en-US') % 6 === 0;

/** Days before `minValue` are disabled, and weekends are unavailable (struck through). */
export const Single: Story = {
  render: () => (
    <Calendar
      aria-label="Delivery date"
      defaultValue={march14}
      minValue={new CalendarDate(2025, 3, 5)}
      isDateUnavailable={isWeekend}
      timeZone="America/Denver"
    />
  ),
};

/**
 * The header's month and year Cyclers (the default): step with their arrows (the month rolls into the next year), or
 * press the month or year to jump straight to one. Years page by decade.
 */
export const MonthAndYearCyclers: Story = {
  render: () => (
    <Calendar
      aria-label="Birth date"
      defaultValue={new CalendarDate(1987, 7, 24)}
      yearRange={{ start: 1925, end: 2025 }}
      timeZone="America/Denver"
    />
  ),
};

/** `headerControls="arrows"`: just previous and next buttons around the month, for calendars that stay near today. */
export const Arrows: Story = {
  render: () => (
    <Calendar
      aria-label="Delivery date"
      defaultValue={march14}
      headerControls="arrows"
      timeZone="America/Denver"
    />
  ),
};

/** Months sit side by side and wrap onto more rows when there isn't room (one per row on phones). */
export const MultipleMonths: Story = {
  render: () => (
    <Calendar
      aria-label="Delivery date"
      defaultValue={march14}
      visibleMonths={2}
      selectionAlignment="start"
      timeZone="America/Denver"
    />
  ),
};

/** Each press adds or removes a day. */
export const MultipleSelection: Story = {
  render: function MultipleSelectionStory() {
    const [days, setDays] = useState<CalendarDate[]>([
      new CalendarDate(2025, 3, 7),
      new CalendarDate(2025, 3, 14),
      new CalendarDate(2025, 3, 21),
    ]);
    return (
      <div className="flex flex-col items-center gap-3">
        <Calendar
          aria-label="Days off"
          selectionMode="multiple"
          value={days}
          onChange={setDays}
          timeZone="America/Denver"
        />
        <p className="text-sm text-fg-muted">
          {days.length} {days.length === 1 ? 'day' : 'days'} off
        </p>
      </div>
    );
  },
};

/** One week at a time; the arrows move by a week. */
export const WeekView: Story = {
  render: () => (
    <Calendar
      aria-label="Appointment date"
      defaultValue={march14}
      view="week"
      timeZone="America/Denver"
    />
  ),
};

/**
 * Exception for stories with text on days: React Aria names each day by its date, and the day's text (a price) is its
 * description (aria-describedby), so axe's experimental label-content-name-mismatch rule sees visible text outside
 * the name. The day number, the visible label, is still part of each accessible name (WCAG 2.5.3).
 */
const dayTextParameters = {
  a11y: { config: { rules: [{ id: 'label-content-name-mismatch', enabled: false }] } },
};

const fares: Record<number, number> = { 3: 129, 4: 99, 10: 89, 14: 149, 17: 79, 21: 189, 25: 99 };

function fareInfo(date: CalendarDate): CalendarDayInfo | undefined {
  const fare = fares[date.day];
  if (date.month !== 3 || fare === undefined) {
    return undefined;
  }
  return {
    content: `$${String(fare)}`,
    description: `From $${String(fare)}`,
    tone: fare < 90 ? 'success' : undefined,
  };
}

/**
 * `size="lg"` leaves a line under each number for a price or a short badge. The cheapest fares are tinted, and each
 * price is read after its date by screen readers.
 */
export const Prices: Story = {
  parameters: dayTextParameters,
  render: () => (
    <Calendar
      aria-label="Departure date"
      defaultValue={march14}
      size="lg"
      getDayInfo={fareInfo}
      timeZone="America/Denver"
    />
  ),
};

const events: Record<number, number> = { 3: 1, 6: 2, 12: 3, 14: 1, 19: 2, 27: 1 };

/** Dots along the bottom of `md` days. `bg-current` keeps them visible on the selected day. */
export const Dots: Story = {
  render: () => (
    <Calendar
      aria-label="Agenda date"
      defaultValue={march14}
      getDayInfo={(date) => {
        const count = date.month === 3 ? events[date.day] : undefined;
        if (count === undefined) {
          return undefined;
        }
        return {
          content: (
            <span className="flex gap-0.5">
              {Array.from({ length: count }, (_, index) => (
                <span key={index} className="size-1 rounded-full bg-current" />
              ))}
            </span>
          ),
          description: count === 1 ? '1 event' : `${String(count)} events`,
        };
      }}
      timeZone="America/Denver"
    />
  ),
};

/**
 * The first press picks one end and the second the other. With `maxRangeDays`, days too far from the first end
 * become unavailable once it's picked.
 */
export const Range: Story = {
  render: () => (
    <RangeCalendar
      aria-label="Stay"
      defaultValue={{ start: march14, end: new CalendarDate(2025, 3, 19) }}
      visibleMonths={2}
      selectionAlignment="start"
      maxRangeDays={14}
      timeZone="America/Denver"
    />
  ),
};

/** Ranges can carry day content too. */
export const RangeWithPrices: Story = {
  parameters: dayTextParameters,
  render: () => (
    <RangeCalendar
      aria-label="Stay"
      defaultValue={{ start: new CalendarDate(2025, 3, 10), end: march14 }}
      size="lg"
      getDayInfo={fareInfo}
      timeZone="America/Denver"
    />
  ),
};
