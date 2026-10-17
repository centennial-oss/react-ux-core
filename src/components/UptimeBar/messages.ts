// English defaults of UptimeBar's strings. Percentages and dates arrive already formatted for the locale.

/** Strings for UptimeBar. */
export interface UptimeBarMessages {
  /**
   * The summary under the bar, for example "99.95% over 90 days, 2 days below 99.9%". `uptime` is null when no day
   * has data.
   */
  uptimeSummary: (params: {
    uptime: string | null;
    dayCount: number;
    belowCount: number;
    threshold: string;
  }) => string;
  /** A day's full name in the list, for example "Oct 14, 2026: 99.95% uptime, 1 incident". */
  uptimeDay: (params: { date: string; uptime: string | null; incidents: number }) => string;
  /** The tooltip's uptime line, for example "99.95% uptime". */
  uptimeValue: (params: { uptime: string }) => string;
  /** The tooltip's incident line, for example "2 incidents". */
  uptimeIncidents: (params: { count: number }) => string;
}

const incidents = (count: number) =>
  count === 0 ? 'no incidents' : count === 1 ? '1 incident' : `${count} incidents`;

export const defaultUptimeBarMessages: UptimeBarMessages = {
  uptimeSummary: ({ uptime, dayCount, belowCount, threshold }) => {
    const days = dayCount === 1 ? '1 day' : `${dayCount} days`;
    if (uptime === null) {
      return `No data over ${days}`;
    }
    const below = belowCount === 0 ? 'no days' : belowCount === 1 ? '1 day' : `${belowCount} days`;
    return `${uptime} over ${days}, ${below} below ${threshold}`;
  },
  uptimeDay: ({ date, uptime, incidents: count }) =>
    uptime === null ? `${date}: no data` : `${date}: ${uptime} uptime, ${incidents(count)}`,
  uptimeValue: ({ uptime }) => `${uptime} uptime`,
  uptimeIncidents: ({ count }) =>
    count === 0 ? 'No incidents' : count === 1 ? '1 incident' : `${count} incidents`,
};
