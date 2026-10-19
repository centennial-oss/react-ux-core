import type { Meta, StoryObj } from '@storybook/react-vite';
import { TimeZoneContext } from '../../provider/context';
import type { WorldClockItem } from './clockInfo';
import { WorldClock } from './WorldClock';

// A fixed instant and local zone, so the stories (and their visual snapshots) never change: Wednesday 14 October 2026,
// 5:30 PM in New York.
const NOW = Date.UTC(2026, 9, 14, 21, 30, 12);

const offices: WorldClockItem[] = [
  { id: 'sf', timeZone: 'America/Los_Angeles', label: 'San Francisco' },
  { id: 'ny', timeZone: 'America/New_York' },
  { id: 'london', timeZone: 'Europe/London' },
  { id: 'berlin', timeZone: 'Europe/Berlin' },
  { id: 'bengaluru', timeZone: 'Asia/Kolkata', label: 'Bengaluru' },
  { id: 'tokyo', timeZone: 'Asia/Tokyo' },
  { id: 'sydney', timeZone: 'Australia/Sydney' },
];

const meta = {
  title: 'Display/WorldClock',
  component: WorldClock,
  args: { items: offices, now: NOW },
  decorators: [
    (Story) => (
      <TimeZoneContext.Provider value="America/New_York">
        <Story />
      </TimeZoneContext.Provider>
    ),
  ],
} satisfies Meta<typeof WorldClock>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Digital clocks in a grid that fits its width, each with its date, how far it is from New York, and day or night. */
export const Digital: Story = {};

/** Analog faces; the face is darker where it's night. */
export const Analog: Story = { args: { variant: 'analog' } };

/** A compact list with offsets from UTC and working hours (9 to 5, Monday to Friday) at each office. */
export const List: Story = {
  args: { layout: 'list', hasOffset: true, workingHours: { start: 9, end: 17 } },
};

/** Analog faces in a row with second hands, and 24-hour time. */
export const RowWithSeconds: Story = {
  args: {
    items: offices.slice(1, 5),
    layout: 'row',
    variant: 'analog',
    granularity: 'second',
    size: 'sm',
    hasDate: false,
  },
};

/** Large 24-hour digital clocks with seconds. */
export const TwentyFourHour: Story = {
  args: { items: offices.slice(2, 5), hourCycle: 24, granularity: 'second', size: 'lg' },
};

/** An unknown zone shows an error on its clock alone. */
export const UnknownZone: Story = {
  args: {
    items: [...offices.slice(1, 3), { id: 'mars', timeZone: 'Mars/Olympus_Mons' }],
  },
};

/** The real time, ticking every second from the page's one shared clock (left out of visual snapshots). */
export const Live: Story = {
  tags: ['!visual'],
  args: { now: undefined, variant: 'analog', granularity: 'second' },
};
