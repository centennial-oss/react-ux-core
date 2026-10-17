// Deterministic data for the chart event, live and outcome stories and tests (no randomness, so snapshots stay
// stable).

import type { ChartEvent } from '../src/chart/events';
import type { Outcome } from '../src/chart/OutcomeChart';
import type { TimePoint, TimeSeries } from '../src/chart/TimeSeriesChart';

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;

/** The start of the 7-day latency chart: Oct 5, 2026, 00:00 UTC. */
export const WEEK_START = Date.UTC(2026, 9, 5);

/** Observatory network latency over 7 days, hourly: a daily cycle with a bump after the third deploy. */
export const latency: TimeSeries = {
  id: 'latency',
  label: 'Latency',
  unit: 'ms',
  color: 'chart-1',
  data: Array.from({ length: 7 * 24 + 1 }, (_, hour) => ({
    t: WEEK_START + hour * HOUR,
    v:
      Math.round(
        (42 +
          12 * Math.sin(((hour % 24) - 8) * (Math.PI / 12)) +
          ((hour * 7) % 5) +
          (hour >= 81 && hour <= 90 ? 25 : 0)) *
          10,
      ) / 10,
  })),
};

/** Five deploys over the week; the third and fourth, an hour apart, cluster on the axis. */
export const deploys: ChartEvent[] = [
  { id: 'deploy-1', at: WEEK_START + 34 * HOUR, label: 'Deploy 1.4.0', tone: 'accent' },
  {
    id: 'deploy-2',
    at: WEEK_START + 63 * HOUR,
    label: 'Deploy 1.4.1',
    tone: 'accent',
    detail: 'Faster dome telemetry.',
  },
  {
    id: 'deploy-3',
    at: WEEK_START + 81 * HOUR,
    label: 'Deploy 1.5.0',
    tone: 'warning',
    detail: 'Latency rose for nine hours after this release.',
  },
  { id: 'deploy-4', at: WEEK_START + 82 * HOUR, label: 'Config change', tone: 'neutral' },
  { id: 'deploy-5', at: WEEK_START + 134 * HOUR, label: 'Deploy 1.5.1', tone: 'success' },
];

/** A maintenance window (a span) and an incident with a link. */
export const maintenance: ChartEvent[] = [
  {
    id: 'maintenance',
    at: WEEK_START + 100 * HOUR,
    until: WEEK_START + 112 * HOUR,
    label: 'Mirror recoating',
    detail: 'The south telescope was offline for its mirror recoating.',
  },
  {
    id: 'incident',
    at: WEEK_START + 145 * HOUR,
    label: 'Network incident',
    tone: 'danger',
    href: 'https://example.com/incidents/42',
    detail: 'Packet loss on the summit link.',
  },
];

/** The start of the live charts' data: Oct 16, 2026, 21:00 UTC. */
export const LIVE_START = Date.UTC(2026, 9, 16, 21);

/** Telescope tracking error in arcseconds, for one dome at time `t` (ms). */
export function trackingError(dome: number, t: number): number {
  const seconds = (t - LIVE_START) / 1000;
  return (
    Math.round(
      (0.6 +
        dome * 0.35 +
        0.25 * Math.sin(seconds / (9 + dome * 4)) +
        0.08 * Math.sin(seconds * 1.7)) *
        100,
    ) / 100
  );
}

export const domes = [
  { id: 'north', label: 'North dome', unit: '″' },
  { id: 'south', label: 'South dome', unit: '″' },
  { id: 'west', label: 'West dome', unit: '″' },
] as const;

/** `seconds` of tracking error at 10 points a second for each dome, from LIVE_START. */
export function trackingHistory(seconds: number): Record<string, TimePoint[]> {
  return Object.fromEntries(
    domes.map((dome, index) => [
      dome.id,
      Array.from({ length: seconds * 10 }, (_, step) => {
        const t = LIVE_START + step * 100;
        return { t, v: trackingError(index, t) };
      }),
    ]),
  );
}

/** The start of the 90-day outcome market: Jul 1, 2026, 00:00 UTC. */
export const MARKET_START = Date.UTC(2026, 6, 1);

/**
 * "When will the comet be brightest?": four outcomes over 90 days, daily, as probabilities (softmax of smooth
 * scores, so they add up to 1). "Late October" pulls ahead after the second news event.
 */
export const cometOutcomes: Outcome[] = (() => {
  const labels = [
    { id: 'sep', label: 'September' },
    { id: 'early-oct', label: 'Early October' },
    { id: 'late-oct', label: 'Late October' },
    { id: 'nov', label: 'November or later' },
  ];
  const score = (outcome: number, day: number) =>
    [
      0.6 - day / 70 + 0.15 * Math.sin(day / 6),
      0.4 + 0.2 * Math.sin(day / 11),
      -0.2 + (day > 40 ? (day - 40) / 30 : 0) + 0.1 * Math.sin(day / 5),
      0.1 + 0.15 * Math.cos(day / 9) - day / 200,
    ][outcome] ?? 0;
  const days = Array.from({ length: 90 }, (_, day) => {
    const scores = labels.map((_, outcome) => Math.exp(score(outcome, day)));
    const total = scores.reduce((sum, value) => sum + value, 0);
    return scores.map((value) => Math.round((value / total) * 1000) / 1000);
  });
  return labels.map((entry, outcome) => ({
    ...entry,
    data: days.map((values, day) => ({ t: MARKET_START + day * DAY, v: values[outcome] ?? null })),
  }));
})();

/** Three news events in the market. */
export const cometNews: ChartEvent[] = [
  {
    id: 'news-1',
    at: MARKET_START + 18 * DAY,
    label: 'Comet discovered to be outbursting',
    tone: 'accent',
  },
  {
    id: 'news-2',
    at: MARKET_START + 41 * DAY,
    label: 'Orbit refined by the survey telescope',
    tone: 'accent',
    detail: 'Perihelion moved two weeks later.',
  },
  {
    id: 'news-3',
    at: MARKET_START + 70 * DAY,
    label: 'Nucleus fragmentation reported',
    tone: 'warning',
  },
];
