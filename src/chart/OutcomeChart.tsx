// OutcomeChart (FR-057): the probabilities of a market's outcomes over time, which add up to 100%. As lines (each
// outcome's probability) or as stacked areas that fill to 100% (TimeSeriesChart's percent stack). The y-axis is fixed
// from 0 to 100%, the legend shows each outcome's latest value, news and other events mark the time axis, and once the
// market resolves the winner is drawn thicker, the rest faded, with a resolution marker. The summary names the leader
// and how it moved over the last week.

import { CircleCheck } from 'lucide-react';
import { useMemo } from 'react';
import { useLocale } from 'react-aria-components';
import { useTimeZone } from '../provider/context';
import { DAY_MS, toEpochMs } from '../utils/time';
import type { ChartFrameOptions } from './ChartFrame';
import type { ChartColor } from './colors';
import type { ChartEvent } from './events';
import { formatPercent, formatTime, formatValue } from './format';
import { useChartMessages, type ChartStrings } from './messages';
import { TimeSeriesChart, type TimePoint, type TimeSeries } from './TimeSeriesChart';

/** One outcome: its probabilities over time, from 0 to 1. */
export interface Outcome {
  id: string;
  label: string;
  /** Defaults to the next palette colour. */
  color?: ChartColor;
  /** Probabilities from 0 to 1 (`null` for a gap). */
  data: readonly TimePoint[];
}

/** How the market resolved: the winning outcome and when. */
export interface OutcomeResolution {
  outcomeId: string;
  at: Date | number | string;
}

export interface OutcomeChartProps extends ChartFrameOptions {
  outcomes: readonly Outcome[];
  /** `lines` (each outcome's probability) or `stacked` (areas that fill to 100%). Defaults to `lines`. */
  mode?: 'lines' | 'stacked';
  /** News, resolution and other events on the time axis. */
  events?: readonly ChartEvent[];
  /** Called when an event's marker is pressed. */
  onEventPress?: (event: ChartEvent) => void;
  /** Marks the resolution: the winner is emphasised and the rest faded. */
  resolution?: OutcomeResolution;
  /** IANA time zone for the axis, tooltips, table and summary. Defaults to the provider's. */
  timeZone?: string;
  /** Allows zooming (pinch and pan on touch, Ctrl+wheel). Defaults to true. */
  isZoomable?: boolean;
}

const PERCENT_AXIS = { left: { min: 0, max: 100 } };
const noEvents: readonly ChartEvent[] = [];

function latestPoint(data: readonly TimePoint[]): { time: number; value: number } | undefined {
  for (let index = data.length - 1; index >= 0; index--) {
    const point = data[index];
    if (point && point.v !== null) {
      return { time: toEpochMs(point.t), value: point.v };
    }
  }
  return undefined;
}

/** The value at or just before `time` (the first value when `time` is before them all). */
function valueAt(data: readonly TimePoint[], time: number): number | undefined {
  let found: number | undefined;
  for (const point of data) {
    if (point.v === null) {
      continue;
    }
    if (toEpochMs(point.t) > time && found !== undefined) {
      break;
    }
    found = point.v;
  }
  return found;
}

/**
 * The summary: the latest leader, its change over the last 7 days (or the whole span when shorter), and the
 * resolution. Probabilities are given from 0 to 1.
 */
export function describeOutcomes(
  outcomes: readonly Outcome[],
  resolution: OutcomeResolution | undefined,
  messages: ChartStrings,
  locale: string,
  timeZone: string,
): string {
  let leader: { outcome: Outcome; time: number; value: number } | undefined;
  for (const outcome of outcomes) {
    const latest = latestPoint(outcome.data);
    if (latest && (!leader || latest.value > leader.value)) {
      leader = { outcome, ...latest };
    }
  }
  if (!leader) {
    return messages.noData;
  }
  const parts = [
    messages.outcomeLeader({
      label: leader.outcome.label,
      value: formatPercent(leader.value * 100, locale),
    }),
  ];
  const first = leader.outcome.data.find((point) => point.v !== null);
  const since = Math.max(leader.time - 7 * DAY_MS, first ? toEpochMs(first.t) : leader.time);
  const days = Math.round((leader.time - since) / DAY_MS);
  const before = valueAt(leader.outcome.data, since);
  if (days >= 1 && before !== undefined) {
    const change = (leader.value - before) * 100;
    parts.push(
      messages.outcomeChange({
        label: leader.outcome.label,
        points: formatValue(Math.round(Math.abs(change) * 10) / 10, locale),
        direction: Math.abs(change) < 0.5 ? 'flat' : change > 0 ? 'up' : 'down',
        days,
      }),
    );
  }
  const winner = resolution && outcomes.find((outcome) => outcome.id === resolution.outcomeId);
  if (resolution && winner) {
    parts.push(
      messages.outcomeResolved({
        label: winner.label,
        date: formatTime(toEpochMs(resolution.at), locale, timeZone),
      }),
    );
  }
  return parts.join(' ');
}

/** Outcome probabilities over time, as lines or stacked to 100%, with events and the resolution marked. */
export function OutcomeChart({
  outcomes,
  mode = 'lines',
  events = noEvents,
  onEventPress,
  resolution,
  timeZone: timeZoneProp,
  isZoomable,
  ...frame
}: OutcomeChartProps) {
  const messages = useChartMessages();
  const { locale } = useLocale();
  const providerZone = useTimeZone();
  const timeZone = timeZoneProp ?? providerZone;
  const winner = resolution && outcomes.find((outcome) => outcome.id === resolution.outcomeId);

  const series = useMemo(
    () =>
      outcomes.map((outcome): TimeSeries => ({
        id: outcome.id,
        label: outcome.label,
        color: outcome.color,
        format: 'percent',
        type: mode === 'stacked' ? 'area' : 'line',
        stack: mode === 'stacked' ? { id: 'outcomes', mode: 'percent' } : undefined,
        shadeOpacity: mode === 'stacked' ? 0.5 : undefined,
        isFaded: winner !== undefined && outcome.id !== winner.id,
        isEmphasized: winner?.id === outcome.id,
        data: outcome.data.map((point) => ({
          t: point.t,
          v: point.v === null ? null : point.v * 100,
        })),
      })),
    [outcomes, mode, winner],
  );

  const allEvents = useMemo(
    () =>
      resolution && winner
        ? [
            ...events,
            {
              id: `resolution-${winner.id}`,
              at: resolution.at,
              label: messages.outcomeResolvedMarker({ label: winner.label }),
              tone: 'success' as const,
              icon: CircleCheck,
            },
          ]
        : events,
    [events, resolution, winner, messages],
  );

  const summary = useMemo(
    () => describeOutcomes(outcomes, resolution, messages, locale, timeZone),
    [outcomes, resolution, messages, locale, timeZone],
  );

  return (
    <TimeSeriesChart
      {...frame}
      series={series}
      timeZone={timeZone}
      axes={mode === 'lines' ? PERCENT_AXIS : undefined}
      events={allEvents}
      onEventPress={onEventPress}
      summary={summary}
      isZoomable={isZoomable}
      hasLegendValues
    />
  );
}
