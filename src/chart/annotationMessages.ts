// English defaults of `/chart`'s strings for event markers (FR-029), LiveTimeSeries (FR-045) and OutcomeChart
// (FR-057). They merge into `useChartMessages()`, so apps override them through `UIProvider`'s `messages` like any
// other chart string.

/** A live series' direction over its visible window. */
export type LiveTrend = 'rising' | 'falling' | 'steady';

/** Strings for chart event markers, live charts and outcome charts. */
export interface ChartAnnotationMessages {
  /** The events column header in a chart's table view. */
  chartEvents: string;
  /** An event marker's accessible name: the event and its time ("Deploy 42, Oct 12, 2026, 3:00 PM"). */
  chartEventMarker: (values: { label: string; time: string }) => string;
  /** A cluster of nearby events' accessible name ("3 events: Deploy 41, Deploy 42 and Rollback"). */
  chartEventCluster: (values: { count: number; labels: string }) => string;
  /** A span event's times ("Oct 12, 3:00 PM to Oct 12, 5:00 PM"). */
  chartEventSpan: (values: { start: string; end: string }) => string;
  /** The events part of a chart's summary ("3 events:"). */
  chartEventsSummary: (values: { count: number }) => string;
  /** One point event in a chart's summary. */
  chartEventAt: (values: { label: string; time: string }) => string;
  /** One span event in a chart's summary. */
  chartEventFromTo: (values: { label: string; start: string; end: string }) => string;
  /** The live chart's pause button. */
  livePause: string;
  /** The live chart's resume button. */
  liveResume: string;
  /** The chip on a paused live chart, with the points that arrived since it paused. */
  livePaused: (values: { count: number }) => string;
  /** One series in a live chart's summary ("Bitrate 4.4 Mbps, steady."). */
  liveSeries: (values: { label: string; value: string; trend: LiveTrend }) => string;
  /** The leading outcome in an outcome chart's summary. */
  outcomeLeader: (values: { label: string; value: string }) => string;
  /** The leader's change over the last days, in percentage points. */
  outcomeChange: (values: {
    label: string;
    points: string;
    direction: 'up' | 'down' | 'flat';
    days: number;
  }) => string;
  /** The resolution in an outcome chart's summary. */
  outcomeResolved: (values: { label: string; date: string }) => string;
  /** The resolution's event marker. */
  outcomeResolvedMarker: (values: { label: string }) => string;
}

export const defaultChartAnnotationMessages: ChartAnnotationMessages = {
  chartEvents: 'Events',
  chartEventMarker: ({ label, time }) => `${label}, ${time}`,
  chartEventCluster: ({ count, labels }) => `${String(count)} events: ${labels}`,
  chartEventSpan: ({ start, end }) => `${start} to ${end}`,
  chartEventsSummary: ({ count }) => (count === 1 ? '1 event:' : `${String(count)} events:`),
  chartEventAt: ({ label, time }) => `${label} at ${time}.`,
  chartEventFromTo: ({ label, start, end }) => `${label} from ${start} to ${end}.`,
  livePause: 'Pause updates',
  liveResume: 'Resume',
  livePaused: ({ count }) =>
    count === 0
      ? 'Paused'
      : count === 1
        ? 'Paused, 1 new point'
        : `Paused, ${String(count)} new points`,
  liveSeries: ({ label, value, trend }) =>
    `${label} ${value}, ${trend === 'rising' ? 'rising' : trend === 'falling' ? 'falling' : 'steady'}.`,
  outcomeLeader: ({ label, value }) => `${label} leads at ${value}.`,
  outcomeChange: ({ label, points, direction, days }) =>
    direction === 'flat'
      ? `${label} is unchanged over the last ${String(days)} days.`
      : `${label} is ${direction} ${points} points over the last ${String(days)} days.`,
  outcomeResolved: ({ label, date }) => `Resolved: ${label}, ${date}.`,
  outcomeResolvedMarker: ({ label }) => `Resolved: ${label}`,
};
