// English defaults of WorldClock's strings. Times, dates and hour differences arrive already formatted for the locale.

/** Strings for WorldClock. */
export interface WorldClockMessages {
  /** The group's name when no `aria-label` is given. */
  worldClockLabel: string;
  /** Shown instead of an hour difference when a clock's zone is level with the local one. */
  worldClockSameTime: string;
  /** Beside the hour difference when it's already the next or still the previous day there. */
  worldClockTomorrow: string;
  worldClockYesterday: string;
  /** Whether it's day (6 AM to 6 PM) or night there. */
  worldClockDay: string;
  worldClockNight: string;
  /** Whether it's within `workingHours` on a working day there. */
  worldClockWorking: string;
  worldClockNotWorking: string;
  /** Shown on a clock whose time zone isn't a known IANA zone. */
  worldClockUnknownZone: (params: { timeZone: string }) => string;
}

export const defaultWorldClockMessages: WorldClockMessages = {
  worldClockLabel: 'World clock',
  worldClockSameTime: 'Same time',
  worldClockTomorrow: 'Tomorrow',
  worldClockYesterday: 'Yesterday',
  worldClockDay: 'Day',
  worldClockNight: 'Night',
  worldClockWorking: 'Working hours',
  worldClockNotWorking: 'Outside working hours',
  worldClockUnknownZone: ({ timeZone }) => `Unknown time zone: ${timeZone}`,
};
