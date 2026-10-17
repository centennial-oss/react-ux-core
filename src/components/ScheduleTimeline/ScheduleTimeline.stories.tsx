import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import {
  dayRange,
  observatoryItems,
  observatoryLanes,
  SCHEDULE_NOW,
  WEEK_START,
  weekRange,
} from '../../../test/schedule';
import type { TimelineItem } from './layout';
import { ScheduleTimeline } from './ScheduleTimeline';

const meta = {
  title: 'Display/ScheduleTimeline',
  component: ScheduleTimeline,
  args: {
    lanes: observatoryLanes,
    items: observatoryItems,
    defaultRange: weekRange,
    now: SCHEDULE_NOW,
    timeZone: 'UTC',
    firstDayOfWeek: 1,
    'aria-label': 'Observatory bookings',
  },
} satisfies Meta<typeof ScheduleTimeline>;
export default meta;
type Story = StoryObj<typeof meta>;

/** A week of 10 lanes with 80 bookings; two overlapping pairs are hatched and marked. */
export const Week: Story = {};

/** One day, with hour ticks and the now line. */
export const Day: Story = {
  args: { defaultRange: dayRange },
};

/** A custom range of three days. */
export const CustomRange: Story = {
  args: {
    defaultRange: {
      start: new Date(WEEK_START + 86_400_000),
      end: new Date(WEEK_START + 4 * 86_400_000),
    },
  },
};

/** Conflicts not highlighted. */
export const WithoutConflicts: Story = {
  tags: ['!visual'],
  args: { shouldShowConflicts: false, defaultRange: dayRange },
};

/**
 * Editable: drag items to move them, drag their edges to resize, and drag on empty space to add one (snapping to
 * 15 minutes). With the keyboard, Alt and the arrow keys move the focused item; Alt, Shift and Left or Right resize
 * it; Enter on a lane's name adds an hour there. Dome bookings are locked.
 */
export const Editable: Story = {
  tags: ['!visual'],
  render: function EditableStory(args) {
    const [items, setItems] = useState<TimelineItem[]>(observatoryItems);
    return (
      <ScheduleTimeline
        {...args}
        defaultRange={dayRange}
        items={items}
        isEditable
        onItemChange={(changed) => {
          setItems((current) => current.map((item) => (item.id === changed.id ? changed : item)));
        }}
        onCreate={(draft) => {
          setItems((current) => [
            ...current,
            { id: `new-${String(current.length)}`, label: 'New booking', ...draft },
          ]);
        }}
      />
    );
  },
};

/** In a narrow container (a phone), an agenda grouped by lane and day. */
export const NarrowAgenda: Story = {
  args: { defaultRange: dayRange },
  render: (args) => (
    <div className="max-w-sm">
      <ScheduleTimeline {...args} />
    </div>
  ),
};

/** Scrolls inside past `maxHeight`, keeping the time axis and lane names in view. */
export const MaxHeight: Story = {
  args: { maxHeight: '20rem' },
};

/** Lanes with nothing booked yet. */
export const EmptyLanes: Story = {
  args: { items: [], defaultRange: dayRange },
};
