// Chart events (FR-029): deploys, incidents, news and maintenance windows marked on a time axis. Each event is a
// dashed vertical line (or a shaded span) drawn on the canvas, with a marker chip on the time axis: a focusable button
// that opens a popover with the event's detail. Markers closer than a chip's width cluster into one chip ("3
// events"), whose popover lists them all. Events are also described in the chart's summary and listed in its table
// view. Any Chart.js time chart can use them through `useChartEvents` (TimeSeriesChart, LiveTimeSeries,
// OutcomeChart, and later CandlestickChart).

import type { Chart, ChartType, Plugin } from 'chart.js';
import { Flag } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import { Button } from '../components/Button/Button';
import { Popover, PopoverTrigger } from '../components/Popover/Popover';
import type { DataTableColumn } from '../table/types';
import { cn } from '../utils/cn';
import type { IconComponent } from '../utils/icon';
import type { ChartTable } from './ChartFrame';
import type { ChartPalette } from './colors';
import { withAlpha } from './colors';
import { formatTime, toTime } from './format';
import type { ChartStrings } from './messages';

/** Something that happened at a time (or over a span), marked on a chart's time axis. */
export interface ChartEvent {
  id: string;
  at: Date | number | string;
  /** A span instead of a point, such as a maintenance window. */
  until?: Date | number | string;
  label: string;
  /** Defaults to `neutral`. */
  tone?: ChartEventTone;
  /** The marker's icon. Defaults to a flag. */
  icon?: IconComponent;
  /** More about the event, shown in its popover. */
  detail?: ReactNode;
  /** Makes the event's label in its popover a link. */
  href?: string;
}

export type ChartEventTone = 'neutral' | 'accent' | 'warning' | 'danger' | 'success';

/** An event's marker at a horizontal position (CSS pixels from the canvas's left edge). */
export interface EventMarker {
  event: ChartEvent;
  x: number;
}

/** One chip on the axis: a single event or a cluster of nearby ones. */
export interface EventCluster {
  key: string;
  x: number;
  events: readonly ChartEvent[];
}

/** The closest two chips' centres may be, in CSS pixels; nearer markers cluster. */
export const MARKER_GAP = 28;

/**
 * Groups markers that are closer than `minGap` to the previous one (so a chain of close markers is one cluster),
 * placing each cluster at its members' mean position. Clusters' positions are then at least `minGap` apart.
 */
export function clusterEventMarkers(
  markers: readonly EventMarker[],
  minGap = MARKER_GAP,
): EventCluster[] {
  const sorted = [...markers].sort((a, b) => a.x - b.x);
  const groups: EventMarker[][] = [];
  for (const marker of sorted) {
    const group = groups.at(-1);
    const last = group?.at(-1);
    if (group && last && marker.x - last.x < minGap) {
      group.push(marker);
    } else {
      groups.push([marker]);
    }
  }
  return groups.map((group) => ({
    key: group.map((marker) => marker.event.id).join('|'),
    x: group.reduce((sum, marker) => sum + marker.x, 0) / group.length,
    events: group.map((marker) => marker.event),
  }));
}

interface ResolvedEvent {
  at: number;
  until?: number;
  color: string;
}

/** Options for the events plugin, keyed under `plugins.chartEvents`. */
export interface ChartEventsOptions {
  items: ResolvedEvent[];
}

declare module 'chart.js' {
  // The type parameter must match Chart.js's declaration to merge with it.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface PluginOptionsByType<TType extends ChartType> {
    chartEvents?: ChartEventsOptions;
  }
}

/** Where the markers go: the plot's width and axis line, and each visible event's position. */
interface EventLayout {
  width: number;
  bottom: number;
  markers: EventMarker[];
}

function layoutOf(chart: Chart, events: readonly ChartEvent[]): EventLayout | null {
  const scale = chart.scales.x;
  const area = chart.chartArea;
  // `chartArea` is undefined until Chart.js's first layout.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!scale || !area) {
    return null;
  }
  const markers = events.flatMap((event): EventMarker[] => {
    const start = scale.getPixelForValue(toTime(event.at));
    const end = event.until === undefined ? start : scale.getPixelForValue(toTime(event.until));
    if (!Number.isFinite(start) || end < area.left - 0.5 || start > area.right + 0.5) {
      return [];
    }
    return [{ event, x: Math.min(Math.max(start, area.left), area.right) }];
  });
  return { width: chart.width, bottom: area.bottom, markers };
}

function layoutKey(layout: EventLayout | null): string {
  if (!layout) {
    return '';
  }
  return [
    Math.round(layout.width),
    Math.round(layout.bottom),
    ...layout.markers.map((marker) => `${marker.event.id}:${String(Math.round(marker.x))}`),
  ].join(',');
}

function eventColor(tone: ChartEventTone | undefined, palette: ChartPalette): string {
  return tone === 'accent' ? palette.series('accent', 0) : palette.tone(tone ?? 'neutral');
}

const chipToneClasses: Record<ChartEventTone, string> = {
  neutral: 'bg-neutral-solid text-neutral-on-solid',
  accent: 'bg-accent-solid text-accent-on-solid',
  success: 'bg-success-solid text-success-on-solid',
  warning: 'bg-warning-solid text-warning-on-solid',
  danger: 'bg-danger-solid text-danger-on-solid',
};

/** An event's time as text: its instant, or its span. */
function eventTime(
  event: ChartEvent,
  messages: ChartStrings,
  locale: string,
  timeZone: string,
): string {
  const start = formatTime(toTime(event.at), locale, timeZone);
  return event.until === undefined
    ? start
    : messages.chartEventSpan({ start, end: formatTime(toTime(event.until), locale, timeZone) });
}

function listOf(labels: readonly string[], locale: string): string {
  return new Intl.ListFormat(locale, { type: 'conjunction' }).format(labels);
}

/** The events part of a chart's summary, in time order (empty without events). */
export function describeEvents(
  events: readonly ChartEvent[],
  messages: ChartStrings,
  locale: string,
  timeZone: string,
): string {
  if (events.length === 0) {
    return '';
  }
  const sorted = [...events].sort((a, b) => toTime(a.at) - toTime(b.at));
  return [
    messages.chartEventsSummary({ count: events.length }),
    ...sorted.map((event) =>
      event.until === undefined
        ? messages.chartEventAt({
            label: event.label,
            time: formatTime(toTime(event.at), locale, timeZone),
          })
        : messages.chartEventFromTo({
            label: event.label,
            start: formatTime(toTime(event.at), locale, timeZone),
            end: formatTime(toTime(event.until), locale, timeZone),
          }),
    ),
  ].join(' ');
}

/**
 * Adds the events to a time table: an Events column, with a row at each event's time (merged into the row already
 * at that time). Rows are keyed and sorted by their `time` field. Without events the table is unchanged.
 */
export function withEventRows(
  table: ChartTable,
  events: readonly ChartEvent[],
  messages: ChartStrings,
  locale: string,
): ChartTable {
  if (events.length === 0) {
    return table;
  }
  const byTime = new Map<number, Record<string, unknown>>(
    table.rows.map((row) => [Number(row.time), { ...row }]),
  );
  const labels = new Map<number, string[]>();
  for (const event of events) {
    const time = toTime(event.at);
    labels.set(time, [...(labels.get(time) ?? []), event.label]);
    if (!byTime.has(time)) {
      byTime.set(time, { __key: time, time });
    }
  }
  for (const [time, names] of labels) {
    const row = byTime.get(time);
    if (row) {
      row.__events = listOf(names, locale);
    }
  }
  const column: DataTableColumn<Record<string, unknown>> = {
    id: '__events',
    header: messages.chartEvents,
    value: (row) => row.__events ?? '',
    mobile: true,
  };
  return {
    columns: [...table.columns, column],
    rows: [...byTime.values()].sort((a, b) => Number(a.time) - Number(b.time)),
  };
}

interface EventMarkersProps {
  layout: EventLayout;
  messages: ChartStrings;
  locale: string;
  timeZone: string;
  onEventPress?: (event: ChartEvent) => void;
}

function EventDetails({
  event,
  messages,
  locale,
  timeZone,
  onEventPress,
  isInCluster,
}: Omit<EventMarkersProps, 'layout'> & { event: ChartEvent; isInCluster: boolean }) {
  const Icon = event.icon ?? Flag;
  const press = onEventPress
    ? () => {
        onEventPress(event);
      }
    : undefined;
  let title: ReactNode = event.label;
  if (event.href !== undefined) {
    title = (
      <Button variant="link" size="sm" href={event.href} onPress={press}>
        {event.label}
      </Button>
    );
  } else if (isInCluster && press) {
    title = (
      <Button variant="link" size="sm" onPress={press}>
        {event.label}
      </Button>
    );
  }
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-fg">
        <Icon aria-hidden="true" className="size-3.5 shrink-0 text-fg-muted" />
        {title}
      </p>
      <p className="text-xs text-fg-muted">{eventTime(event, messages, locale, timeZone)}</p>
      {event.detail !== undefined && <div className="text-sm text-fg">{event.detail}</div>}
    </div>
  );
}

/** The marker chips over a chart's time axis, each opening a popover with its events. */
function EventMarkers({ layout, messages, locale, timeZone, onEventPress }: EventMarkersProps) {
  const clusters = clusterEventMarkers(layout.markers);
  return (
    // Over the canvas without blocking its hover; clipped, so a chip never widens the page.
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {clusters.map((cluster) => {
        const single = cluster.events.length === 1 ? cluster.events[0] : undefined;
        const Icon = single?.icon ?? Flag;
        const tones = new Set(cluster.events.map((event) => event.tone ?? 'neutral'));
        const tone: ChartEventTone = tones.size === 1 ? ([...tones][0] ?? 'neutral') : 'neutral';
        const name = single
          ? messages.chartEventMarker({
              label: single.label,
              time: eventTime(single, messages, locale, timeZone),
            })
          : messages.chartEventCluster({
              count: cluster.events.length,
              labels: listOf(
                cluster.events.map((event) => event.label),
                locale,
              ),
            });
        // Kept inside the plot's box, so the chip and its focus ring stay visible at the edges.
        const x = Math.min(Math.max(cluster.x, 16), layout.width - 16);
        return (
          <span
            key={cluster.key}
            className="pointer-events-auto absolute -translate-x-1/2 -translate-y-full"
            // Dynamic geometry: the event's time on the axis, just above the axis line.
            // eslint-disable-next-line no-restricted-syntax
            style={{ left: x, top: layout.bottom - 2 }}
          >
            <PopoverTrigger>
              <AriaButton
                aria-label={name}
                data-event-marker={cluster.key}
                onPress={() => {
                  if (single) {
                    onEventPress?.(single);
                  }
                }}
                className={cn(
                  'hit-area flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold tabular-nums shadow-raised ring-2 ring-surface-1 outline-none',
                  'cursor-pointer data-focus-visible:focus-ring',
                  chipToneClasses[tone],
                )}
              >
                {single ? (
                  <Icon aria-hidden="true" className="size-3" />
                ) : (
                  <span aria-hidden="true">{cluster.events.length}</span>
                )}
              </AriaButton>
              <Popover aria-label={single ? single.label : name} placement="top" hasArrow>
                {single ? (
                  <EventDetails
                    event={single}
                    messages={messages}
                    locale={locale}
                    timeZone={timeZone}
                    onEventPress={onEventPress}
                    isInCluster={false}
                  />
                ) : (
                  <ul className="flex flex-col gap-3">
                    {cluster.events.map((event) => (
                      <li key={event.id}>
                        <EventDetails
                          event={event}
                          messages={messages}
                          locale={locale}
                          timeZone={timeZone}
                          onEventPress={onEventPress}
                          isInCluster
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </Popover>
            </PopoverTrigger>
          </span>
        );
      })}
    </div>
  );
}

/** What a chart needs to show events: a plugin, its options, the marker overlay, and summary text. */
export interface ChartEventsBinding {
  /** Draws the events' lines and spans and tracks where their markers go. Stable: pass it in `config.plugins`. */
  plugin: Plugin<ChartType, ChartEventsOptions>;
  /** `plugins.chartEvents` options for the chart's config. */
  options: ChartEventsOptions;
  /** The marker chips, for ChartFrame's `overlay`. */
  overlay: ReactNode;
  /** The events part of the chart's summary ("" without events). */
  summary: string;
}

/**
 * Events on a Chart.js time chart (one with an `x` time scale). Put `plugin` in the config's `plugins`, `options` in
 * `options.plugins.chartEvents`, `overlay` in ChartFrame's overlay and `summary` in the chart's summary, and pass
 * the table through `withEventRows`.
 */
export function useChartEvents({
  events,
  palette,
  messages,
  locale,
  timeZone,
  onEventPress,
}: {
  events: readonly ChartEvent[];
  palette: ChartPalette;
  messages: ChartStrings;
  locale: string;
  timeZone: string;
  onEventPress?: (event: ChartEvent) => void;
}): ChartEventsBinding {
  const [layout, setLayout] = useState<EventLayout | null>(null);
  const latest = useRef({ events, key: '' });
  // Before the chart's own update effect (callers create the chart after this hook), so a redraw sees these events.
  useEffect(() => {
    latest.current.events = events;
  }, [events]);

  // One plugin object for the chart's lifetime; it reads the latest events when it draws.
  const [plugin] = useState((): Plugin<ChartType, ChartEventsOptions> => ({
    id: 'chartEvents',
    beforeDatasetsDraw(chart, _args, options: ChartEventsOptions | undefined) {
      const scale = chart.scales.x;
      if (!scale || !Array.isArray(options?.items)) {
        return;
      }
      const { ctx, chartArea } = chart;
      ctx.save();
      for (const item of options.items) {
        if (item.until === undefined) {
          continue;
        }
        const start = Math.max(scale.getPixelForValue(item.at), chartArea.left);
        const end = Math.min(scale.getPixelForValue(item.until), chartArea.right);
        if (end > start) {
          ctx.fillStyle = withAlpha(item.color, 0.12);
          ctx.fillRect(start, chartArea.top, end - start, chartArea.bottom - chartArea.top);
        }
      }
      ctx.restore();
    },
    afterDatasetsDraw(chart, _args, options: ChartEventsOptions | undefined) {
      const scale = chart.scales.x;
      if (!scale || !Array.isArray(options?.items)) {
        return;
      }
      const { ctx, chartArea } = chart;
      ctx.save();
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      for (const item of options.items) {
        const x = scale.getPixelForValue(item.at);
        if (x < chartArea.left || x > chartArea.right) {
          continue;
        }
        ctx.strokeStyle = item.color;
        ctx.beginPath();
        ctx.moveTo(x, chartArea.top);
        ctx.lineTo(x, chartArea.bottom);
        ctx.stroke();
      }
      ctx.restore();
    },
    afterDraw(chart) {
      // Markers follow every layout change: resizes, zooms and pans, a live chart's sliding window.
      const next =
        latest.current.events.length === 0 ? null : layoutOf(chart, latest.current.events);
      const key = layoutKey(next);
      if (key !== latest.current.key) {
        latest.current.key = key;
        setLayout(next);
      }
    },
  }));

  const options = useMemo(
    (): ChartEventsOptions => ({
      items: events.map((event) => ({
        at: toTime(event.at),
        until: event.until === undefined ? undefined : toTime(event.until),
        color: eventColor(event.tone, palette),
      })),
    }),
    [events, palette],
  );

  const summary = useMemo(
    () => describeEvents(events, messages, locale, timeZone),
    [events, messages, locale, timeZone],
  );

  // Markers show the current events (by id), and ones removed since the last draw don't linger.
  const byId = new Map(events.map((event) => [event.id, event]));
  const shown =
    layout && events.length > 0
      ? {
          ...layout,
          markers: layout.markers.flatMap((marker) => {
            const event = byId.get(marker.event.id);
            return event ? [{ ...marker, event }] : [];
          }),
        }
      : null;

  return {
    plugin,
    options,
    summary,
    overlay: shown ? (
      <EventMarkers
        layout={shown}
        messages={messages}
        locale={locale}
        timeZone={timeZone}
        onEventPress={onEventPress}
      />
    ) : null,
  };
}
