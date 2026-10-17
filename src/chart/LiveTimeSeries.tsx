// LiveTimeSeries (FR-045): a streaming chart. Points arrive through an imperative handle (`append`), never through
// React state, and the chart draws them on the next animation frame: the window slides smoothly toward the latest
// point (or steps, under reduced motion). Points older than `retainMs` are dropped. Hovering the plot (or touching
// it) pauses it so values can be read, with a "Paused, N new points" chip and Resume; a Pause button is always there
// too (WCAG 2.2.2). The summary and the table view (the last points of each series) refresh at most every 10 s, so
// screen readers aren't flooded. Thresholds, bands and events work as in TimeSeriesChart.

import type { Chart } from 'chart.js';
import { Pause, Play } from 'lucide-react';
import { useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react';
import { useLocale } from 'react-aria-components';
import { Button } from '../components/Button/Button';
import { IconButton } from '../components/IconButton/IconButton';
import { useControllableState } from '../utils/useControllableState';
import type { LiveTrend } from './annotationMessages';
import { formatSeriesValue } from './format';
import { createLiveBuffer, type LiveBuffer, type LivePoint } from './liveBuffer';
import { useChartMessages, type ChartStrings } from './messages';
import {
  TimeSeriesPlot,
  type LiveBinding,
  type TimePoint,
  type TimeSeries,
  type TimeSeriesChartProps,
} from './TimeSeriesChart';
import { useChartLook } from './useChart';

export interface LiveTimeSeriesHandle {
  /** Appends points without re-rendering React; the chart updates on the next animation frame. */
  append: (seriesId: string, points: readonly TimePoint[]) => void;
  /** Drops every point. */
  clear: () => void;
}

export interface LiveTimeSeriesProps extends Omit<
  TimeSeriesChartProps,
  'series' | 'onRangeSelect' | 'isZoomable' | 'summary'
> {
  /** The series, without data: points arrive through the handle's `append`. */
  series: readonly Omit<TimeSeries, 'data'>[];
  /** The visible window in milliseconds, such as 5 minutes. */
  windowMs: number;
  /** Points older than this (before the latest point) are dropped. Defaults to `windowMs` × 2. */
  retainMs?: number;
  /** Pauses while the plot is hovered, or after it's touched, so values can be read. Defaults to true. */
  shouldPauseOnInspect?: boolean;
  /** Controlled pause state. */
  isPaused?: boolean;
  /** Uncontrolled initial pause state. Defaults to false. */
  defaultPaused?: boolean;
  onPausedChange?: (isPaused: boolean) => void;
  /** Receives the handle that appends points. */
  handleRef?: Ref<LiveTimeSeriesHandle>;
  /** How many of each series' latest points the table view lists. Defaults to 50. */
  tableLimit?: number;
  /** Points to start with by series id, such as recent history loaded before streaming starts. */
  defaultData?: Readonly<Record<string, readonly TimePoint[]>>;
}

/** How often the summary and table view may refresh, in milliseconds. */
const SNAPSHOT_EVERY = 10_000;
/** How often the paused chip's count may refresh, in milliseconds. */
const COUNT_EVERY = 250;

/** A series' direction over the visible window: its change against the window's range of values. */
export function liveTrend(points: readonly LivePoint[], from: number): LiveTrend {
  let first: number | undefined;
  let last: number | undefined;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const point of points) {
    if (point.x < from || point.y === null) {
      continue;
    }
    first ??= point.y;
    last = point.y;
    min = Math.min(min, point.y);
    max = Math.max(max, point.y);
  }
  if (first === undefined || last === undefined) {
    return 'steady';
  }
  const scale = Math.max(max - min, Math.abs(last) * 0.05, Number.EPSILON);
  const change = (last - first) / scale;
  return change > 0.25 ? 'rising' : change < -0.25 ? 'falling' : 'steady';
}

/** The summary and table data at one moment: each series' latest points and a sentence per series. */
function snapshotOf(
  buffer: LiveBuffer,
  series: readonly Omit<TimeSeries, 'data'>[],
  windowStart: number,
  limit: number,
  messages: ChartStrings,
  locale: string,
): { series: TimeSeries[]; summary: string } {
  const parts: string[] = [];
  const snapshot = series.map((entry): TimeSeries => {
    const points = buffer.points(entry.id);
    let latest: number | null = null;
    for (let index = points.length - 1; index >= 0 && latest === null; index--) {
      latest = points[index]?.y ?? null;
    }
    if (latest !== null) {
      parts.push(
        messages.liveSeries({
          label: entry.label,
          value: formatSeriesValue(latest, locale, entry),
          trend: liveTrend(points, windowStart),
        }),
      );
    }
    return {
      ...entry,
      data: points.slice(-limit).map((point) => ({ t: point.x, v: point.y })),
    };
  });
  return { series: snapshot, summary: parts.length > 0 ? parts.join(' ') : messages.noData };
}

/** A time series chart fed point by point, sliding over a fixed window, pausable to read values. */
export function LiveTimeSeries({
  series,
  windowMs,
  retainMs: retainProp,
  shouldPauseOnInspect = true,
  isPaused: isPausedProp,
  defaultPaused = false,
  onPausedChange,
  handleRef,
  tableLimit = 50,
  defaultData,
  ...chart
}: LiveTimeSeriesProps) {
  const messages = useChartMessages();
  const { locale } = useLocale();
  const { isReducedMotion } = useChartLook();
  const [isPaused, setPaused] = useControllableState(isPausedProp, defaultPaused, onPausedChange);
  const retainMs = Math.max(windowMs, retainProp ?? windowMs * 2);
  const [buffer] = useState(() => {
    const created = createLiveBuffer();
    for (const [id, points] of Object.entries(defaultData ?? {})) {
      created.append(id, points);
    }
    created.flush();
    created.prune(retainMs);
    return created;
  });
  const [instance, setInstance] = useState<Chart | null>(null);
  const [snapshot, setSnapshot] = useState(() =>
    snapshotOf(buffer, series, (buffer.latest() ?? 0) - windowMs, tableLimit, messages, locale),
  );
  const [pendingCount, setPendingCount] = useState(0);

  // Everything the animation-frame loop reads, kept current without restarting it.
  const state = useRef({
    chart: null as Chart | null,
    frame: null as number | null,
    windowEnd: buffer.latest(),
    lastSnapshot: Number.NEGATIVE_INFINITY,
    lastCount: Number.NEGATIVE_INFINITY,
    shownCount: 0,
    isSnapshotDue: false,
    isInspecting: false,
    props: { series, windowMs, retainMs, tableLimit, isPaused, isReducedMotion, messages, locale },
  });
  useEffect(() => {
    state.current.props = {
      series,
      windowMs,
      retainMs,
      tableLimit,
      isPaused,
      isReducedMotion,
      messages,
      locale,
    };
  });

  // The animation-frame loop: one frame at a time, scheduled by appends, resumes and its own easing.
  const [schedule] = useState(() => {
    const current = state.current;
    const schedule = () => {
      if (current.frame !== null) {
        return;
      }
      current.frame = requestAnimationFrame((now) => {
        current.frame = null;
        tick(now);
      });

      function tick(now: number) {
        const { props } = current;
        if (props.isPaused) {
          // Frozen: keep only the retention window of queued points, and show how many are waiting.
          buffer.prune(props.retainMs, true);
          const count = buffer.pendingCount();
          if (count !== current.shownCount) {
            if (now - current.lastCount >= COUNT_EVERY) {
              current.lastCount = now;
              current.shownCount = count;
              setPendingCount(count);
            } else {
              schedule();
            }
          }
          return;
        }
        buffer.flush();
        buffer.prune(props.retainMs);
        const target = buffer.latest();
        const end = current.windowEnd;
        let next = target;
        if (
          target !== undefined &&
          end !== undefined &&
          !props.isReducedMotion &&
          target > end &&
          target - end < props.windowMs
        ) {
          // Ease toward the latest point, and land on it once within half a pixel.
          const msPerPixel = props.windowMs / Math.max(1, current.chart?.chartArea.width ?? 600);
          next = end + (target - end) * 0.25;
          if (target - next < msPerPixel / 2) {
            next = target;
          }
        }
        current.windowEnd = next;
        const chartInstance = current.chart;
        const x = chartInstance?.options.scales?.x;
        if (chartInstance && x && next !== undefined) {
          x.min = next - props.windowMs;
          x.max = next;
        }
        chartInstance?.update('none');
        if (next !== target) {
          schedule();
        }
        if (current.isSnapshotDue || now - current.lastSnapshot >= SNAPSHOT_EVERY) {
          current.isSnapshotDue = false;
          current.lastSnapshot = now;
          setSnapshot(
            snapshotOf(
              buffer,
              props.series,
              (next ?? 0) - props.windowMs,
              props.tableLimit,
              props.messages,
              props.locale,
            ),
          );
        }
      }
    };
    return schedule;
  });

  useEffect(
    () => () => {
      const { frame } = state.current;
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
    },
    [],
  );

  useImperativeHandle(
    handleRef,
    () => ({
      append(seriesId, points) {
        buffer.append(seriesId, points);
        if (state.current.windowEnd === undefined) {
          // The first points: refresh the summary and table (and show the plot) at once.
          state.current.isSnapshotDue = true;
        }
        schedule();
      },
      clear() {
        buffer.clear();
        state.current.windowEnd = undefined;
        state.current.isSnapshotDue = true;
        schedule();
      },
    }),
    [buffer, schedule],
  );

  // Resuming catches up at once; pausing starts the count of waiting points.
  useEffect(() => {
    state.current.shownCount = -1;
    if (!isPaused) {
      state.current.isInspecting = false;
    }
    schedule();
  }, [isPaused, schedule]);

  // The series' set or the window changed (not on mount: the first snapshot is already made): redraw and re-describe.
  const [shape] = useState(() => ({ series, windowMs, retainMs }));
  useEffect(() => {
    if (shape.series !== series || shape.windowMs !== windowMs || shape.retainMs !== retainMs) {
      Object.assign(shape, { series, windowMs, retainMs });
      state.current.isSnapshotDue = true;
      schedule();
    }
  }, [shape, series, windowMs, retainMs, schedule]);

  // Inspecting pauses: hovering the plot (until the pointer leaves) or touching it (until Resume).
  useEffect(() => {
    const box = instance?.canvas.parentElement;
    if (!box || !shouldPauseOnInspect) {
      return;
    }
    const current = state.current;
    const onEnter = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' && !current.props.isPaused) {
        current.isInspecting = true;
        setPendingCount(0);
        setPaused(true);
      }
    };
    const onLeave = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' && current.isInspecting) {
        current.isInspecting = false;
        setPaused(false);
      }
    };
    const onDown = (event: PointerEvent) => {
      const isControl = event.target instanceof Element && event.target.closest('button') !== null;
      if (event.pointerType === 'touch' && !isControl && !current.props.isPaused) {
        setPendingCount(0);
        setPaused(true);
      }
    };
    box.addEventListener('pointerenter', onEnter);
    box.addEventListener('pointerleave', onLeave);
    box.addEventListener('pointerdown', onDown);
    return () => {
      box.removeEventListener('pointerenter', onEnter);
      box.removeEventListener('pointerleave', onLeave);
      box.removeEventListener('pointerdown', onDown);
    };
  }, [instance, shouldPauseOnInspect, setPaused]);

  const live = useMemo(
    (): LiveBinding => ({
      points: buffer.points,
      window: () => {
        const end = state.current.windowEnd;
        return end === undefined ? undefined : [end - windowMs, end];
      },
      onChart: (next) => {
        state.current.chart = next;
        setInstance(next);
        if (next) {
          schedule();
        }
      },
    }),
    [buffer, windowMs, schedule],
  );

  return (
    <TimeSeriesPlot
      {...chart}
      series={snapshot.series}
      summary={snapshot.summary}
      isZoomable={false}
      live={live}
      actions={
        <IconButton
          icon={Pause}
          aria-label={messages.livePause}
          variant="ghost"
          size="sm"
          isSelected={isPaused}
          onChange={(isSelected) => {
            state.current.isInspecting = false;
            setPendingCount(0);
            setPaused(isSelected);
          }}
        />
      }
      overlay={
        isPaused ? (
          // Centred at the top of the plot, clear of threshold labels at its end.
          <span className="absolute start-1/2 top-2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-surface-1 ps-2.5 text-xs whitespace-nowrap text-fg shadow-raised rtl:translate-x-1/2">
            <span className="tabular-nums">{messages.livePaused({ count: pendingCount })}</span>
            <Button
              variant="ghost"
              size="sm"
              icon={Play}
              className="rounded-full"
              onPress={() => {
                state.current.isInspecting = false;
                setPaused(false);
              }}
            >
              {messages.liveResume}
            </Button>
          </span>
        ) : undefined
      }
    />
  );
}
