// AudioMeter (FR-046): segmented level bars per channel, drawn on canvases, with peak hold, a dB scale, warning and
// clip zones and a clip indicator per channel that stays lit until pressed. Levels arrive through the `levels` prop,
// through the handle's `push` (60 fps without React re-renders: drawing happens on the next animation frame), or
// straight from a MediaStream or AudioNode through AnalyserNodes. A text readout of each channel's peak refreshes at
// most once a second, and the first clip is announced once.

import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type Ref,
} from 'react';
import { Button as AriaButton, useLocale } from 'react-aria-components';
import { cn } from '../../utils/cn';
import { mergeRefs } from '../../utils/mergeRefs';
import { useDeadlineTimer } from '../../utils/timers';
import { useThemeAttribute } from '../../utils/useThemeAttribute';
import {
  dbToPosition,
  peakDb,
  scaleMarks,
  updatePeakHold,
  zoneOf,
  type MeterZones,
  type PeakHold,
} from './meterMath';
import { useMediaPlayerMessages } from './messages';

export interface AudioMeterHandle {
  /** Pushes levels in dBFS by channel; the meter redraws on the next animation frame, without re-rendering React. */
  push: (levels: readonly number[]) => void;
  /** Clears every latched clip indicator. */
  resetClip: () => void;
}

export interface AudioMeterProps {
  /** Names the meter, for example "Program". */
  label: string;
  /** Levels in dBFS by channel, such as `[-18, -20]`. For 60 fps updates use `handleRef`'s `push` instead. */
  levels?: readonly number[];
  /** Channel names, such as `["L", "R"]`. Defaults to "Channel 1", "Channel 2"… (and L/R for two channels). */
  channelLabels?: readonly string[];
  /** Defaults to `vertical`. */
  orientation?: 'vertical' | 'horizontal';
  /** How long a peak is held, in milliseconds. Defaults to 1500. */
  peakHoldMs?: number;
  /** Zones in dBFS. Defaults to warning at −12 and clip at −1. */
  zones?: MeterZones;
  /** Reads levels from a MediaStream (such as a microphone) or an AudioNode, through AnalyserNodes. */
  source?: MediaStream | AudioNode;
  /** The unit shown on the scale and readout. Levels are read the same way. Defaults to `dbfs`. */
  scale?: 'dbfs' | 'lufs';
  /** The bottom of the scale in dB. Defaults to −60. */
  minDb?: number;
  /** The number of channels when levels only arrive through `push` or `source`. Defaults to 2. */
  channelCount?: number;
  /** The bars' length: `sm` (7rem), `md` (10rem, the default) or `lg` (14rem). Horizontal meters fill the width. */
  length?: 'sm' | 'md' | 'lg';
  /** Receives the handle with `push` and `resetClip`. */
  handleRef?: Ref<AudioMeterHandle>;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

const DEFAULT_ZONES: MeterZones = { warning: -12, clip: -1 };
const lengthClasses = { sm: 'h-28', md: 'h-40', lg: 'h-56' } as const;
/** Segment size and gap in CSS pixels. */
const SEGMENT = 3;
const SEGMENT_GAP = 1;

/** What changes at frame rate, kept out of React state. */
interface LiveMeterState {
  levels: number[];
  holds: PeakHold[];
  /** The loudest level per channel since the readout last refreshed. */
  readoutPeaks: number[];
  hasPushedSinceReadout: boolean;
  frame: number | null;
}

interface Palette {
  safe: string;
  warning: string;
  clip: string;
  off: string;
  hold: string;
}

function readPalette(element: Element): Palette {
  const style = getComputedStyle(element);
  const read = (name: string) => style.getPropertyValue(name).trim() || 'currentColor';
  return {
    safe: read('--color-success-solid'),
    warning: read('--color-warning-solid'),
    clip: read('--color-danger-solid'),
    off: read('--color-surface-4'),
    hold: read('--color-fg'),
  };
}

/** Draws one channel's bar: lit segments up to the level, the held peak, unlit segments above. */
function drawBar(
  canvas: HTMLCanvasElement,
  isVertical: boolean,
  db: number,
  hold: number,
  minDb: number,
  zones: MeterZones,
  palette: Palette,
) {
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  const length = isVertical ? height : width;
  const count = Math.max(1, Math.floor((length + SEGMENT_GAP) / (SEGMENT + SEGMENT_GAP)));
  const level = dbToPosition(db, minDb) * count;
  const holdSegment = Math.min(count - 1, Math.floor(dbToPosition(hold, minDb) * count));
  const hasHold = Number.isFinite(hold) && hold > minDb;
  for (let segment = 0; segment < count; segment += 1) {
    const segmentDb = minDb + ((segment + 0.5) / count) * -minDb;
    const zoneColour =
      palette[zoneOf(segmentDb, zones) === 'safe' ? 'safe' : zoneOf(segmentDb, zones)];
    const isLit = segment < level;
    const isHold = hasHold && segment === holdSegment;
    context.fillStyle = isLit || isHold ? zoneColour : palette.off;
    const offset = segment * (SEGMENT + SEGMENT_GAP);
    if (isVertical) {
      context.fillRect(0, height - offset - SEGMENT, width, SEGMENT);
    } else {
      context.fillRect(offset, 0, SEGMENT, height);
    }
  }
}

/** Segmented level bars with peak hold, zones, latching clip indicators and a dB scale. */
export function AudioMeter({
  label,
  levels,
  channelLabels,
  orientation = 'vertical',
  peakHoldMs = 1500,
  zones = DEFAULT_ZONES,
  source,
  scale = 'dbfs',
  minDb = -60,
  channelCount: channelCountProp,
  length = 'md',
  handleRef,
  className,
  ref,
}: AudioMeterProps) {
  const messages = useMediaPlayerMessages();
  const { locale } = useLocale();
  const labelId = useId();
  const isVertical = orientation === 'vertical';
  const channelCount = Math.max(1, levels?.length ?? channelCountProp ?? 2);
  const names = useMemo(
    () =>
      Array.from(
        { length: channelCount },
        (_, index) =>
          channelLabels?.[index] ??
          (channelCount === 2 ? [messages.meterLeft, messages.meterRight][index] : undefined) ??
          messages.meterChannel({ index: index + 1 }),
      ),
    [channelCount, channelLabels, messages],
  );
  const unit = scale === 'lufs' ? messages.meterUnitLufs : messages.meterUnitDbfs;

  // Live values live in a ref and are drawn on the next frame; React state changes only for the readout (at most
  // once a second) and the clip indicators (when one latches or is reset).
  const live = useRef<LiveMeterState>({
    levels: [],
    holds: [],
    readoutPeaks: [],
    hasPushedSinceReadout: false,
    frame: null,
  });
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const theme = useThemeAttribute();
  const palette = useRef<Palette | null>(null);
  const [clipped, setClipped] = useState<boolean[]>([]);
  const clippedRef = useRef<boolean[]>([]);
  const [announcement, setAnnouncement] = useState('');
  const [readout, setReadout] = useState<number[]>([]);

  const settings = useRef({ isVertical, minDb, zones, peakHoldMs, names, messages });
  useEffect(() => {
    settings.current = { isVertical, minDb, zones, peakHoldMs, names, messages };
  });

  const draw = useCallback(() => {
    live.current.frame = null;
    const {
      isVertical: vertical,
      minDb: floor,
      zones: currentZones,
      peakHoldMs: holdMs,
    } = settings.current;
    if (!palette.current && rootRef.current) {
      palette.current = readPalette(rootRef.current);
    }
    const colours = palette.current;
    if (!colours) {
      return;
    }
    const now = performance.now();
    canvases.current.forEach((canvas, index) => {
      if (!canvas) {
        return;
      }
      const db = live.current.levels[index] ?? Number.NEGATIVE_INFINITY;
      // A held peak decays once its hold time passes, even without new levels.
      const hold = live.current.holds[index];
      const held = hold && now - hold.at <= holdMs ? hold.db : db;
      drawBar(canvas, vertical, db, held, floor, currentZones, colours);
    });
  }, []);

  const schedule = useCallback(() => {
    live.current.frame ??= requestAnimationFrame(draw);
  }, [draw]);

  const push = useCallback(
    (next: readonly number[]) => {
      const now = performance.now();
      const {
        zones: currentZones,
        peakHoldMs: holdMs,
        names: channelNames,
        messages: strings,
      } = settings.current;
      const state = live.current;
      state.levels = next.map((db) => (Number.isFinite(db) ? db : Number.NEGATIVE_INFINITY));
      state.hasPushedSinceReadout = true;
      let newlyClipped: number | null = null;
      for (const [index, db] of state.levels.entries()) {
        state.holds[index] = updatePeakHold(
          state.holds[index] ?? { db: Number.NEGATIVE_INFINITY, at: 0 },
          db,
          now,
          holdMs,
        );
        state.readoutPeaks[index] = Math.max(
          state.readoutPeaks[index] ?? Number.NEGATIVE_INFINITY,
          db,
        );
        if (db >= currentZones.clip && !clippedRef.current[index]) {
          clippedRef.current = [...clippedRef.current];
          clippedRef.current[index] = true;
          newlyClipped ??= index;
        }
      }
      if (newlyClipped !== null) {
        setClipped(clippedRef.current);
        setAnnouncement(strings.meterClipped({ label: channelNames[newlyClipped] ?? '' }));
      }
      schedule();
    },
    [schedule],
  );

  const resetClip = useCallback((channel?: number) => {
    clippedRef.current =
      channel === undefined
        ? []
        : clippedRef.current.map((value, index) => (index === channel ? false : value));
    setClipped(clippedRef.current);
    setAnnouncement('');
  }, []);

  useImperativeHandle(
    handleRef,
    () => ({
      push,
      resetClip: () => {
        resetClip();
      },
    }),
    [push, resetClip],
  );

  // Levels from the prop.
  useEffect(() => {
    if (levels) {
      push(levels);
    }
  }, [levels, push]);

  // Theme changes recolour the bars.
  useEffect(() => {
    palette.current = null;
    schedule();
  }, [theme, schedule, isVertical, minDb, zones, channelCount]);

  // Resizes redraw at the new size.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    const observer = new ResizeObserver(() => {
      schedule();
    });
    observer.observe(root);
    const state = live.current;
    return () => {
      observer.disconnect();
      if (state.frame !== null) {
        cancelAnimationFrame(state.frame);
        state.frame = null;
      }
    };
  }, [schedule]);

  // The readout: the loudest level of the last second per channel, refreshed once a second.
  const refreshAgain = useRef<() => void>(() => undefined);
  const readoutTimer = useDeadlineTimer(() => {
    // The loudest level since the last refresh, or the current level when none arrived (a steady `levels` prop).
    const state = live.current;
    const peaks = state.hasPushedSinceReadout ? state.readoutPeaks : state.levels;
    state.readoutPeaks = [];
    state.hasPushedSinceReadout = false;
    setReadout((previous) =>
      previous.length === peaks.length && previous.every((value, index) => value === peaks[index])
        ? previous
        : peaks,
    );
    refreshAgain.current();
  });
  useEffect(() => {
    refreshAgain.current = () => {
      readoutTimer.start(1000);
    };
    readoutTimer.start(0);
    return () => {
      readoutTimer.clear();
    };
  }, [readoutTimer]);

  // Levels from a MediaStream or an AudioNode, through one AnalyserNode per channel.
  useEffect(() => {
    if (!source) {
      return;
    }
    const ownContext = source instanceof MediaStream ? new AudioContext() : null;
    const context = ownContext ?? (source as AudioNode).context;
    if (context instanceof AudioContext) {
      void context.resume().catch(() => undefined);
    }
    const input = ownContext
      ? ownContext.createMediaStreamSource(source as MediaStream)
      : (source as AudioNode);
    const splitter = context.createChannelSplitter(channelCount);
    input.connect(splitter);
    const analysers = Array.from({ length: channelCount }, (_, index) => {
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      splitter.connect(analyser, index);
      return analyser;
    });
    const buffers = analysers.map((analyser) => new Float32Array(analyser.fftSize));
    let frame = 0;
    const tick = () => {
      push(
        analysers.map((analyser, index) => {
          const buffer = buffers[index] ?? new Float32Array(analyser.fftSize);
          analyser.getFloatTimeDomainData(buffer);
          return peakDb(buffer);
        }),
      );
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      try {
        input.disconnect(splitter);
      } catch {
        // Already disconnected.
      }
      splitter.disconnect();
      void ownContext?.close();
    };
  }, [source, channelCount, push]);

  const decimal = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const formatDb = (db: number | undefined) =>
    db === undefined || !Number.isFinite(db) || db < minDb
      ? messages.meterSilent
      : decimal.format(db).replace('-', '−');
  const marks = scaleMarks(minDb);

  const scaleColumn = (
    <div
      aria-hidden="true"
      className={cn(
        'relative shrink-0 font-mono text-[0.625rem] leading-none text-fg-muted tabular-nums',
        isVertical ? cn('w-7', lengthClasses[length]) : 'h-3 w-full',
      )}
    >
      {marks.map((db, index) => {
        const position = dbToPosition(db, minDb) * 100;
        return (
          <span
            key={db}
            className={cn(
              'absolute',
              // A narrow horizontal meter labels fewer marks: the ends always, then every other mark, then all.
              !isVertical &&
                index !== 0 &&
                index !== marks.length - 1 &&
                (index % 2 === 0 ? 'hidden @xs:block' : 'hidden @md:block'),
              isVertical
                ? 'end-0.5 translate-y-1/2'
                : position > 98
                  ? '-translate-x-full rtl:translate-x-full'
                  : position < 2
                    ? ''
                    : '-translate-x-1/2 rtl:translate-x-1/2',
            )}
            // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the mark's position on the scale
            style={
              isVertical
                ? { bottom: `${String(position)}%` }
                : { insetInlineStart: `${String(position)}%` }
            }
          >
            {db === 0 ? '0' : String(db).replace('-', '−')}
          </span>
        );
      })}
    </div>
  );

  return (
    <div
      ref={mergeRefs(rootRef, ref)}
      role="group"
      aria-labelledby={labelId}
      data-orientation={orientation}
      className={cn(
        'inline-flex min-w-0 flex-col gap-1.5 text-fg',
        // Horizontal meters fill their container and query its width (vertical ones shrink to fit their bars).
        !isVertical && '@container flex w-full',
        className,
      )}
    >
      <span id={labelId} className="text-xs font-medium">
        {label}
      </span>
      <div className={cn('flex min-w-0', isVertical ? 'items-end' : 'flex-col')}>
        {!isVertical && <div className="ms-[2.375rem] me-9">{scaleColumn}</div>}
        {isVertical && <div className="pb-5">{scaleColumn}</div>}
        {names.map((name, index) => {
          const isClipped = clipped[index] === true;
          const clipButton = (
            <AriaButton
              aria-label={messages.meterResetClip({ channel: name })}
              data-clipped={isClipped || undefined}
              onPress={() => {
                resetClip(index);
              }}
              className={cn(
                'hit-area shrink-0 cursor-pointer rounded-sm border outline-none data-focus-visible:focus-ring',
                isVertical ? 'h-2 w-3' : 'h-3 w-2',
                isClipped
                  ? 'border-danger-solid bg-danger-solid'
                  : 'border-border-strong bg-surface-3',
              )}
            />
          );
          const bar = (
            <canvas
              ref={(canvas) => {
                canvases.current[index] = canvas;
              }}
              aria-hidden="true"
              className={cn(
                'block rounded-sm bg-surface-3',
                isVertical ? cn('w-3', lengthClasses[length]) : 'h-3 min-w-0 flex-1',
              )}
            />
          );
          return isVertical ? (
            <div key={name} className="flex min-w-hit flex-col items-center gap-1">
              {clipButton}
              {bar}
              <span className="h-4 text-xs leading-4 text-fg-muted">{name}</span>
            </div>
          ) : (
            <div key={name} className="flex min-h-hit min-w-0 items-center gap-1.5">
              <span className="w-8 shrink-0 truncate text-end text-xs text-fg-muted">{name}</span>
              {bar}
              {clipButton}
              <span className="w-4 shrink-0" />
            </div>
          );
        })}
      </div>
      <p className="m-0 flex flex-wrap gap-x-3 font-mono text-xs text-fg-muted tabular-nums">
        {names.map((name, index) => (
          <span key={name} className={clipped[index] ? 'text-danger-fg' : undefined}>
            {messages.meterPeak({ channel: name, value: formatDb(readout[index]), unit })}
          </span>
        ))}
      </p>
      <span className="sr-only" aria-live="assertive">
        {announcement}
      </span>
    </div>
  );
}
