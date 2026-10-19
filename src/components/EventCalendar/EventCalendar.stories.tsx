import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import {
  busyMonth,
  EVENTS_NOW,
  eventsDay,
  eventsWeek,
  octoberEvents,
  octoberGrid,
} from '../../../test/events';
import { observatoryItems, SCHEDULE_NOW, weekRange } from '../../../test/schedule';
import type { TimelineRange } from '../ScheduleTimeline';
import { EventCalendar } from './EventCalendar';
import type { EventCalendarItem, EventCalendarView } from './layout';

const meta = {
  title: 'Display/EventCalendar',
  component: EventCalendar,
  args: {
    items: octoberEvents,
    defaultRange: octoberGrid,
    now: EVENTS_NOW,
    timeZone: 'UTC',
    firstDayOfWeek: 1,
    'aria-label': 'Team calendar',
  },
} satisfies Meta<typeof EventCalendar>;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * October: timed events as chips with their start, all-day and multi-day events as bars across days, and "+N more" on
 * days with more than fit, which lists them all.
 */
export const Month: Story = {};

/**
 * A week of time: hours down the side, overlapping meetings side by side (Wednesday), all-day events in the row under
 * the days, a migration that runs past midnight, and a line at the current time.
 */
export const Week: Story = {
  args: { defaultView: 'week', defaultRange: eventsWeek },
};

/** One day. */
export const Day: Story = {
  args: { defaultView: 'day', defaultRange: eventsDay },
};

/** The month as a list of days. */
export const Agenda: Story = {
  args: { defaultView: 'agenda' },
};

/**
 * ScheduleTimeline's items work as they are: a dense week of 80 observatory bookings across 10 instruments, drawn by
 * time rather than by lane.
 */
export const DenseWeek: Story = {
  args: {
    items: observatoryItems,
    defaultView: 'week',
    defaultRange: weekRange,
    now: SCHEDULE_NOW,
    maxHeight: '24rem',
  },
};

/** Over 400 events in the month: each day shows what fits and counts the rest. */
export const BusyMonth: Story = {
  tags: ['!visual'],
  args: { items: busyMonth(10) },
};

/**
 * Editable: drag events to move them (to other days too), drag their ends to resize, and drag on empty time or days
 * to add one (snapping to 15 minutes). With the keyboard, Alt and the arrow keys move the focused event and Alt, Shift
 * and the arrow keys change when it ends; Enter on a day adds one. The release freeze is locked.
 */
export const Editable: Story = {
  tags: ['!visual'],
  args: { defaultView: 'week', defaultRange: eventsWeek },
  render: function EditableStory(args) {
    const [items, setItems] = useState<EventCalendarItem[]>(octoberEvents);
    return (
      <EventCalendar
        {...args}
        items={items}
        isEditable
        onItemChange={(changed) => {
          setItems((current) => current.map((item) => (item.id === changed.id ? changed : item)));
        }}
        onCreate={(draft) => {
          setItems((current) => [
            ...current,
            { id: `new-${String(current.length)}`, label: 'New event', ...draft },
          ]);
        }}
      />
    );
  },
};

/** Controlled view and range: the app keeps both, and would fetch the events of each range it's told about. */
export const Controlled: Story = {
  tags: ['!visual'],
  render: function ControlledStory(args) {
    const [view, setView] = useState<EventCalendarView>('month');
    const [range, setRange] = useState<TimelineRange>(octoberGrid);
    return (
      <div className="flex flex-col gap-2">
        <EventCalendar
          {...args}
          view={view}
          onViewChange={setView}
          range={range}
          onRangeChange={setRange}
        />
        <p className="m-0 text-sm text-fg-muted">
          {view}: {range.start.toISOString().slice(0, 10)} – {range.end.toISOString().slice(0, 10)}
        </p>
      </div>
    );
  },
};

/** Only the month and agenda views, with a shorter scroll area. */
export const SomeViews: Story = {
  tags: ['!visual'],
  args: { views: ['month', 'agenda'], maxHeight: '20rem' },
};

/** A month with nothing in it. */
export const Empty: Story = {
  args: { items: [] },
};
