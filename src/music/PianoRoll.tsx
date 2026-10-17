// PianoRoll (FR-069): a note editor on the /canvas Canvas. Time runs left to right (bars and beats), pitch bottom to
// top, with a vertical PianoKeyboard beside the grid that auditions its keys. With the draw tool a press on empty grid
// adds a note and dragging sets its length; with the select tool a drag draws a marquee (a double-click still adds a
// note). Notes move by dragging (the whole selection, snapped to the grid), resize from their right edge, and
// duplicate with Control/Command+D; quantize snaps starts and lengths. Pinch, the wheel and the zoom buttons zoom.
// Keyboard: a grid cursor (the first stop inside the grid) moves by the snap and adds notes with Enter, and each note
// moves by the snap (Shift with up or down by an octave, Shift with left or right resizes), with its pitch and position
// announced ("E4, bar 1, beat 3, quarter note"). A table view lists every note for editing as fields. Scale rows,
// a playhead and a loop region come from props; a velocity lane under the grid sets velocities by dragging.

import { Copy, Grid3x3, Magnet, MousePointer2, Pencil, Trash2, Wand2 } from 'lucide-react';
import {
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
  type Ref,
} from 'react';
import { useLocale } from 'react-aria-components';
import { Canvas } from '../canvas/Canvas';
import { CanvasItem } from '../canvas/CanvasItem';
import type { CanvasPoint, CanvasViewport } from '../canvas/geometry';
import { IconButton } from '../components/IconButton/IconButton';
import { Option } from '../components/ListBox';
import { Select } from '../components/Select/Select';
import { cn } from '../utils/cn';
import { useControllableState } from '../utils/useControllableState';
import type { BeatLoop } from './beatClock';
import { useMusicMessages } from './messages';
import { NoteTable } from './NoteTable';
import {
  duplicateNotes,
  MIN_NOTE_BEATS,
  moveNotes,
  notesAt,
  notesEnd,
  quantizeNotes,
  resizeNotes,
  sortNotes,
  type MusicNote,
} from './notes';
import { PianoKeyboard } from './PianoKeyboard';
import {
  barAndBeat,
  isBlackKey,
  isInScale,
  nameNoteValue,
  pitchClass,
  snapBeats,
  snapTo,
  spellPitch,
  type MusicScale,
  type PitchRange,
  type SnapValue,
  type TimeSignature,
} from './pitch';

export interface PianoRollProps {
  notes: readonly MusicNote[];
  /** Called with every note after an edit. Without it the roll is read-only. */
  onChange?: (notes: MusicNote[]) => void;
  /** The pitches shown, both ends included. Defaults to C2–C6 (36–84). */
  pitchRange?: PitchRange;
  /** Beats per bar and the beat's note value. Defaults to 4/4. */
  timeSignature?: TimeSignature;
  /** The grid notes snap to (controlled). Triplets are `1/8t` and `1/16t`. */
  snap?: SnapValue;
  /** The initial snap, uncontrolled. Defaults to `1/16`. */
  defaultSnap?: SnapValue;
  onSnapChange?: (snap: SnapValue) => void;
  /** The length shown, in bars; it grows to fit the notes plus a bar. Defaults to 4. */
  bars?: number;
  /** The playhead position in beats (such as `useBeatClock().beat`). */
  playhead?: number;
  /** Keeps the playhead in view as it moves. Defaults to true. */
  shouldFollowPlayhead?: boolean;
  /** A loop region in beats, shaded on the ruler and grid. */
  loop?: BeatLoop | null;
  /** A velocity lane under the grid. Defaults to true. */
  hasVelocityLane?: boolean;
  /** Plays a pitch when a note is created or selected, or a key pressed (the app supplies the sound). */
  onAudition?: (pitch: number, velocity: number) => void;
  /** Highlights the scale's rows (the root most strongly). Without one, black-key rows are shaded. */
  scale?: MusicScale;
  /** Velocity of new notes. Defaults to 100. */
  defaultVelocity?: number;
  /** The grid's height (CSS). Defaults to `20rem`. */
  height?: string;
  'aria-label'?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/** World units per beat and per semitone row. A quarter of a beat is a row's height, so drags snap to both. */
const BEAT_WIDTH = 64;
const ROW_HEIGHT = 16;
const DRAG_GRID = { size: ROW_HEIGHT, isVisible: false };
const DEFAULT_PITCH_RANGE: PitchRange = { low: 36, high: 84 };
const COMMON_TIME: TimeSignature = { beats: 4, unit: 4 };
const SNAP_VALUES: readonly SnapValue[] = ['1/4', '1/8', '1/16', '1/32', '1/8t', '1/16t', 'off'];
const EMPTY_IDS: readonly string[] = [];
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;

type Tool = 'draw' | 'select';

interface Draft {
  pointerId: number;
  pitch: number;
  start: number;
  duration: number;
  hasMoved: boolean;
}

interface Resize {
  pointerId: number;
  ids: readonly string[];
  startX: number;
  delta: number;
}

interface VelocityEdit {
  pointerId: number;
  id: string;
  velocity: number;
}

/** A gesture's state for rendering, plus a ref that's current as soon as it's set. */
function useGesture<T>(): [T | null, RefObject<T | null>, (next: T | null) => void] {
  const [value, setValue] = useState<T | null>(null);
  const ref = useRef<T | null>(null);
  const set = useCallback((next: T | null) => {
    ref.current = next;
    setValue(next);
  }, []);
  return [value, ref, set];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** A note editor with a keyboard, snapping grid, velocity lane and table view. */
export function PianoRoll({
  notes,
  onChange,
  pitchRange = DEFAULT_PITCH_RANGE,
  timeSignature = COMMON_TIME,
  snap: snapProp,
  defaultSnap = '1/16',
  onSnapChange,
  bars = 4,
  playhead,
  shouldFollowPlayhead = true,
  loop,
  hasVelocityLane = true,
  onAudition,
  scale,
  defaultVelocity = 100,
  height = '20rem',
  'aria-label': ariaLabel,
  className,
  ref,
}: PianoRollProps) {
  const messages = useMusicMessages();
  const { locale } = useLocale();
  const idPrefix = useId();
  const noteInstructionsId = useId();
  const cursorInstructionsId = useId();
  const keysLabelId = useId();
  const numberFormat = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }),
    [locale],
  );
  const isEditable = onChange !== undefined;

  const low = Math.max(0, Math.min(pitchRange.low, pitchRange.high));
  const high = Math.min(127, Math.max(pitchRange.low, pitchRange.high));
  const range = useMemo(() => ({ low, high }), [low, high]);
  const rows = high - low + 1;
  const perBar = timeSignature.beats;
  const [snap, setSnap] = useControllableState(snapProp, defaultSnap, onSnapChange);
  const snapStep = snapBeats(snap, timeSignature);
  /** Keyboard moves and minimum lengths use the snap, or a quarter beat when snapping is off. */
  const step = snapStep > 0 ? snapStep : 0.25;
  const minLength = snapStep > 0 ? snapStep : MIN_NOTE_BEATS;
  // ----- Viewport: the canvas's, kept inside the world (the key column, ruler and lane follow it).
  const canvasBoxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const sizeRef = useRef(size);
  const [viewport, setViewportState] = useState<CanvasViewport>({ x: 0, y: 0, zoom: 1 });
  const viewportRef = useRef(viewport);
  // The length: the bars asked for, the notes plus a bar, and enough to fill the view.
  const fillBars = Math.ceil(size.width / viewport.zoom / (perBar * BEAT_WIDTH) - 1e-9);
  const totalBars = Math.max(bars, Math.ceil(notesEnd(notes) / perBar - 1e-9) + 1, fillBars);
  const totalBeats = totalBars * perBar;
  const worldWidth = totalBeats * BEAT_WIDTH;
  const worldHeight = rows * ROW_HEIGHT;

  const [tool, setTool] = useState<Tool>('draw');
  const [isTableView, setTableView] = useState(false);
  const [selection, setSelection] = useState<readonly string[]>(EMPTY_IDS);
  // Gestures in progress: state for drawing them, and refs so a burst of pointer events sees the latest one.
  const [draft, draftRef, setDraft] = useGesture<Draft>();
  const [resize, resizeRef, setResize] = useGesture<Resize>();
  const [velocityEdit, velocityRef, setVelocityEdit] = useGesture<VelocityEdit>();
  const [cursor, setCursor] = useState(() => ({ pitch: clamp(60, low, high), beat: 0 }));
  const [announcement, setAnnouncement] = useState('');
  const lastDuration = useRef<number | null>(null);
  const idCounter = useRef(0);
  const makeId = useCallback(() => {
    idCounter.current += 1;
    return `${idPrefix}note-${String(idCounter.current)}`;
  }, [idPrefix]);

  const clampViewport = useCallback(
    (next: CanvasViewport): CanvasViewport => {
      const zoom = clamp(next.zoom, MIN_ZOOM, MAX_ZOOM);
      const { width, height: boxHeight } = sizeRef.current;
      const maxX = Math.max(0, worldWidth - width / zoom);
      const maxY = Math.max(0, worldHeight - boxHeight / zoom);
      return { zoom, x: clamp(next.x, 0, maxX), y: clamp(next.y, 0, maxY) };
    },
    [worldWidth, worldHeight],
  );
  const setViewport = useCallback(
    (next: CanvasViewport) => {
      const clamped = clampViewport(next);
      viewportRef.current = clamped;
      setViewportState(clamped);
    },
    [clampViewport],
  );
  const hasPositioned = useRef(false);
  useLayoutEffect(() => {
    const box = canvasBoxRef.current;
    if (!box) {
      return;
    }
    const measure = () => {
      const next = { width: box.clientWidth, height: box.clientHeight };
      if (next.width === sizeRef.current.width && next.height === sizeRef.current.height) {
        return;
      }
      sizeRef.current = next;
      setSize(next);
      // Open on the notes (or middle C) rather than the top of the range.
      if (!hasPositioned.current && next.height > 0) {
        hasPositioned.current = true;
        const centre =
          notes.length > 0 ? notes.reduce((sum, note) => sum + note.pitch, 0) / notes.length : 60;
        const y =
          (high - clamp(Math.round(centre), low, high) + 0.5) * ROW_HEIGHT - next.height / 2;
        setViewport({ ...viewportRef.current, y });
      } else {
        setViewport(viewportRef.current);
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => {
      observer.disconnect();
    };
    // The opening position is computed once, from the notes at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTableView, setViewport]);

  /** Pans the least distance that brings a world rectangle into view. */
  const reveal = useCallback(
    (x: number, y: number, width: number, rectHeight: number) => {
      const current = viewportRef.current;
      const visibleWidth = sizeRef.current.width / current.zoom;
      const visibleHeight = sizeRef.current.height / current.zoom;
      if (visibleWidth === 0) {
        return;
      }
      const margin = 8 / current.zoom;
      const shift = (start: number, length: number, from: number, visible: number) => {
        if (start - margin < from) {
          return start - margin;
        }
        if (start + length + margin > from + visible) {
          return Math.min(start - margin, start + length + margin - visible);
        }
        return from;
      };
      setViewport({
        ...current,
        x: shift(x, width, current.x, visibleWidth),
        y: shift(y, rectHeight, current.y, visibleHeight),
      });
    },
    [setViewport],
  );

  // The playhead stays in view while it plays: past the right edge (or before the left) the view pages to it.
  useLayoutEffect(() => {
    if (playhead === undefined || !shouldFollowPlayhead || isTableView) {
      return;
    }
    const current = viewportRef.current;
    const x = playhead * BEAT_WIDTH;
    const visibleWidth = sizeRef.current.width / current.zoom;
    if (visibleWidth > 0 && (x < current.x || x > current.x + visibleWidth * 0.95)) {
      setViewport({ ...current, x: x - visibleWidth * 0.05 });
    }
  }, [playhead, shouldFollowPlayhead, isTableView, setViewport]);

  // ----- Naming and announcing.
  const pitchName = useCallback(
    (pitch: number) => messages.musicPitchName(spellPitch(pitch)),
    [messages],
  );
  const lengthName = useCallback(
    (beats: number) => {
      const named = nameNoteValue(beats, timeSignature);
      return named
        ? messages.musicNoteLength(named)
        : messages.musicBeats({ count: numberFormat.format(beats) });
    },
    [messages, numberFormat, timeSignature],
  );
  const position = useCallback(
    (note: Pick<MusicNote, 'pitch' | 'start' | 'duration'>) => {
      const where = barAndBeat(note.start, timeSignature);
      return messages.pianoRollNotePosition({
        pitch: pitchName(note.pitch),
        bar: where.bar,
        beat: numberFormat.format(where.beat),
        length: lengthName(note.duration),
      });
    },
    [messages, numberFormat, pitchName, lengthName, timeSignature],
  );

  // The latest values, for handlers that must stay stable (the note elements are memoized).
  const latest = useRef({
    notes,
    onChange,
    onAudition,
    selection,
    step,
    snapStep,
    minLength,
    range,
    defaultVelocity,
    position,
    messages,
    tool,
    totalBeats,
  });
  useLayoutEffect(() => {
    latest.current = {
      notes,
      onChange,
      onAudition,
      selection,
      step,
      snapStep,
      minLength,
      range,
      defaultVelocity,
      position,
      messages,
      tool,
      totalBeats,
    };
  });

  const audition = useCallback((note: Pick<MusicNote, 'pitch' | 'velocity'>) => {
    latest.current.onAudition?.(note.pitch, note.velocity);
  }, []);
  const commit = useCallback((next: MusicNote[]) => {
    latest.current.notes = next;
    latest.current.onChange?.(next);
  }, []);

  const pendingFocus = useRef<string | null>(null);
  useLayoutEffect(() => {
    const id = pendingFocus.current;
    if (id === null) {
      return;
    }
    pendingFocus.current = null;
    canvasBoxRef.current
      ?.querySelector<HTMLElement>(`[data-canvas-item="${CSS.escape(id)}"]`)
      ?.focus();
  });

  const changeSelection = useCallback(
    (ids: readonly string[]) => {
      const previous = latest.current.selection;
      latest.current.selection = ids;
      setSelection(ids);
      if (ids.length === 1 && !(previous.length === 1 && previous[0] === ids[0])) {
        const note = latest.current.notes.find((other) => other.id === ids[0]);
        if (note) {
          audition(note);
        }
      }
    },
    [audition],
  );

  // ----- Moving notes by dragging: the canvas reports each selected item's end position; they're applied together.
  const pendingMoves = useRef(new Map<string, CanvasPoint>());
  const flushMoves = useCallback(() => {
    const moves = pendingMoves.current;
    pendingMoves.current = new Map();
    const { notes: current, snapStep: snapping, range: pitches } = latest.current;
    const [first] = moves.entries();
    if (!first) {
      return;
    }
    const [id, point] = first;
    const note = current.find((other) => other.id === id);
    if (!note) {
      return;
    }
    const start = Math.max(0, snapTo(point.x / BEAT_WIDTH, snapping));
    const pitch = pitches.high - Math.round(point.y / ROW_HEIGHT);
    const beats = start - note.start;
    const semitones = pitch - note.pitch;
    if (Math.abs(beats) < 1e-9 && semitones === 0) {
      return;
    }
    const next = moveNotes(current, [...moves.keys()], beats, semitones, pitches);
    commit(next);
    const moved = next.find((other) => other.id === id);
    if (moved && semitones !== 0) {
      audition(moved);
    }
  }, [audition, commit]);
  const queueMove = useCallback(
    (id: string, point: CanvasPoint) => {
      if (pendingMoves.current.size === 0) {
        queueMicrotask(flushMoves);
      }
      pendingMoves.current.set(id, point);
    },
    [flushMoves],
  );

  const deleteNotes = useCallback(
    (ids: readonly string[]) => {
      const { notes: current, messages: strings } = latest.current;
      const removed = current.filter((note) => ids.includes(note.id));
      if (removed.length === 0) {
        return;
      }
      commit(current.filter((note) => !ids.includes(note.id)));
      changeSelection(EMPTY_IDS);
      setAnnouncement(strings.pianoRollDeleted({ count: removed.length }));
      // Focus goes to the grid cursor where the (first) note was, so keyboard users keep their place.
      const [first] = sortNotes(removed);
      if (first && canvasBoxRef.current?.contains(document.activeElement)) {
        setCursor({ pitch: first.pitch, beat: first.start });
        cursorRef.current?.focus({ preventScroll: true });
      }
    },
    [commit, changeSelection],
  );

  const duplicate = useCallback(
    (ids: readonly string[]) => {
      const { notes: current, snapStep: snapping, messages: strings } = latest.current;
      const result = duplicateNotes(current, ids, makeId, snapping);
      if (result.ids.length === 0) {
        return;
      }
      commit(result.notes);
      changeSelection(result.ids);
      pendingFocus.current = result.ids[0] ?? null;
      setAnnouncement(strings.pianoRollDuplicated({ count: result.ids.length }));
    },
    [commit, changeSelection, makeId],
  );

  const onNoteKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>, id: string) => {
      const {
        notes: current,
        selection: selected,
        step: moveStep,
        minLength: shortest,
        range: pitches,
      } = latest.current;
      if (!latest.current.onChange) {
        return;
      }
      const ids = selected.includes(id) ? selected : [id];
      let next: MusicNote[] | null = null;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        duplicate(ids);
        return;
      }
      if (event.altKey || event.metaKey || event.ctrlKey) {
        return;
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        next = event.shiftKey
          ? resizeNotes(current, ids, direction * moveStep, shortest)
          : moveNotes(current, ids, direction * moveStep, 0, pitches);
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const direction = event.key === 'ArrowUp' ? 1 : -1;
        next = moveNotes(current, ids, 0, direction * (event.shiftKey ? 12 : 1), pitches);
      }
      if (!next) {
        return;
      }
      event.preventDefault();
      commit(next);
      const moved = next.find((note) => note.id === id);
      if (moved) {
        setAnnouncement(latest.current.position(moved));
        const before = current.find((note) => note.id === id);
        if (before && before.pitch !== moved.pitch) {
          audition(moved);
        }
        reveal(
          moved.start * BEAT_WIDTH,
          (pitches.high - moved.pitch) * ROW_HEIGHT,
          moved.duration * BEAT_WIDTH,
          ROW_HEIGHT,
        );
      }
    },
    [audition, commit, duplicate, reveal],
  );

  // ----- Resizing from a note's right edge.
  const startResize = useCallback(
    (event: PointerEvent<HTMLSpanElement>, id: string) => {
      if (event.button !== 0) {
        return;
      }
      event.stopPropagation();
      const ids = latest.current.selection.includes(id) ? latest.current.selection : [id];
      if (!latest.current.selection.includes(id)) {
        latest.current.selection = [id];
        setSelection([id]);
      }
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // The pointer is already gone.
      }
      setResize({ pointerId: event.pointerId, ids, startX: event.clientX, delta: 0 });
    },
    [setResize],
  );
  const onResizeMove = useCallback(
    (event: PointerEvent<HTMLSpanElement>) => {
      const current = resizeRef.current;
      if (current?.pointerId !== event.pointerId) {
        return;
      }
      const beats = (event.clientX - current.startX) / viewportRef.current.zoom / BEAT_WIDTH;
      const delta = snapTo(beats, latest.current.snapStep);
      if (delta !== current.delta) {
        setResize({ ...current, delta });
      }
    },
    [resizeRef, setResize],
  );
  const onResizeEnd = useCallback(
    (event: PointerEvent<HTMLSpanElement>) => {
      const current = resizeRef.current;
      if (current?.pointerId !== event.pointerId) {
        return;
      }
      setResize(null);
      if (current.delta !== 0 && event.type !== 'pointercancel') {
        commit(
          resizeNotes(latest.current.notes, current.ids, current.delta, latest.current.minLength),
        );
      }
    },
    [commit, resizeRef, setResize],
  );

  // ----- What's drawn: the notes with any resize or velocity edit in progress applied.
  const shown = useMemo(() => {
    let result: readonly MusicNote[] = notes;
    if (resize && resize.delta !== 0) {
      result = resizeNotes(result, resize.ids, resize.delta, minLength);
    }
    if (velocityEdit) {
      result = result.map((note) =>
        note.id === velocityEdit.id ? { ...note, velocity: velocityEdit.velocity } : note,
      );
    }
    return result;
  }, [notes, resize, velocityEdit, minLength]);

  const noteItems = useMemo(
    () =>
      shown.map((note) => {
        const where = barAndBeat(note.start, timeSignature);
        const label = messages.pianoRollNote({
          pitch: pitchName(note.pitch),
          bar: where.bar,
          beat: numberFormat.format(where.beat),
          length: lengthName(note.duration),
          velocity: note.velocity,
        });
        return (
          <CanvasItem
            key={note.id}
            id={note.id}
            x={note.start * BEAT_WIDTH}
            y={(high - note.pitch) * ROW_HEIGHT}
            width={Math.max(4, note.duration * BEAT_WIDTH)}
            height={ROW_HEIGHT}
            aria-label={label}
            aria-describedby={isEditable ? noteInstructionsId : undefined}
            hasInstructions={false}
            isMovable={isEditable}
            className="rounded-sm aria-selected:ring-fg"
            onMoveEnd={(point) => {
              queueMove(note.id, point);
            }}
            onKeyDown={(event) => {
              onNoteKeyDown(event, note.id);
            }}
            onAction={() => {
              audition(note);
            }}
          >
            <div className="relative size-full">
              <div className="flex size-full items-center overflow-hidden rounded-sm border border-accent-border bg-accent-solid ps-1 text-[0.625rem] leading-none text-accent-on-solid">
                <span aria-hidden="true" className="pointer-events-none truncate">
                  {messages.musicPitchLabel(spellPitch(note.pitch))}
                </span>
              </div>
              {isEditable && (
                <span
                  aria-hidden="true"
                  data-resize-handle=""
                  className="absolute inset-y-0 -end-1 w-2 cursor-ew-resize touch-none"
                  onPointerDown={(event) => {
                    startResize(event, note.id);
                  }}
                  onPointerMove={onResizeMove}
                  onPointerUp={onResizeEnd}
                  onPointerCancel={onResizeEnd}
                />
              )}
            </div>
          </CanvasItem>
        );
      }),
    [
      shown,
      high,
      timeSignature,
      messages,
      pitchName,
      numberFormat,
      lengthName,
      isEditable,
      noteInstructionsId,
      queueMove,
      onNoteKeyDown,
      audition,
      startResize,
      onResizeMove,
      onResizeEnd,
    ],
  );

  // ----- Adding notes: drawing on empty grid, double-clicking, the grid cursor and the table.
  const addNote = useCallback(
    (pitch: number, start: number, duration: number) => {
      const { notes: current, defaultVelocity: velocity, messages: strings } = latest.current;
      const note: MusicNote = { id: makeId(), pitch, start, duration, velocity };
      commit([...current, note]);
      lastDuration.current = duration;
      setAnnouncement(strings.pianoRollAdded({ note: latest.current.position(note) }));
      return note;
    },
    [commit, makeId],
  );
  const newLength = () =>
    lastDuration.current ??
    (latest.current.snapStep > 0 ? Math.max(latest.current.snapStep, 1) : 1);

  const spaceHeld = useRef(false);
  const touches = useRef(new Set<number>());
  const toWorld = (
    event: { clientX: number; clientY: number },
    element: HTMLElement,
  ): CanvasPoint => {
    // The background is in world space, so its box on screen is the world's origin and scale.
    const rect = element.getBoundingClientRect();
    const zoom = viewportRef.current.zoom;
    return { x: (event.clientX - rect.left) / zoom, y: (event.clientY - rect.top) / zoom };
  };
  const cellAt = (point: CanvasPoint) => {
    const pitch = high - Math.floor(point.y / ROW_HEIGHT);
    const raw = point.x / BEAT_WIDTH;
    const start = snapStep > 0 ? Math.floor(raw / snapStep + 1e-9) * snapStep : raw;
    return { pitch, start: Number(start.toFixed(6)) };
  };
  const onGridPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (
      !isEditable ||
      tool !== 'draw' ||
      event.button !== 0 ||
      spaceHeld.current ||
      touches.current.size > 1
    ) {
      return;
    }
    // Drawing replaces the canvas's marquee and pan for this press.
    event.stopPropagation();
    const { pitch, start } = cellAt(toWorld(event, event.currentTarget));
    if (pitch < low || pitch > high || start < 0) {
      return;
    }
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // The pointer is already gone.
    }
    setDraft({ pointerId: event.pointerId, pitch, start, duration: newLength(), hasMoved: false });
    audition({ pitch, velocity: defaultVelocity });
  };
  const onGridPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const draft = draftRef.current;
    if (draft?.pointerId !== event.pointerId) {
      return;
    }
    const point = toWorld(event, event.currentTarget);
    const length = point.x / BEAT_WIDTH - draft.start;
    const duration = snapStep > 0 ? Math.ceil(length / snapStep - 1e-9) * snapStep : length;
    const next = Math.max(minLength, Number(duration.toFixed(6)));
    if (next !== draft.duration && (draft.hasMoved || length > minLength / 2)) {
      setDraft({ ...draft, duration: next, hasMoved: true });
    }
  };
  const onGridPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const draft = draftRef.current;
    if (draft?.pointerId !== event.pointerId) {
      return;
    }
    setDraft(null);
    if (event.type === 'pointercancel' || touches.current.size > 1) {
      return;
    }
    const note = addNote(draft.pitch, draft.start, draft.duration);
    changeSelection([note.id]);
    setCursor({ pitch: note.pitch, beat: Math.min(note.start + note.duration, totalBeats - step) });
  };
  const onGridDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!isEditable || tool !== 'select' || event.target !== event.currentTarget) {
      return;
    }
    const { pitch, start } = cellAt(toWorld(event, event.currentTarget));
    if (pitch < low || pitch > high) {
      return;
    }
    const note = addNote(pitch, start, newLength());
    changeSelection([note.id]);
    audition(note);
  };

  // The grid cursor: the keyboard's way to add notes.
  const cursorRef = useRef<HTMLButtonElement>(null);
  const cursorWidth = Math.max(step, 0.25) * BEAT_WIDTH;
  const revealCursor = (next: { pitch: number; beat: number }) => {
    reveal(next.beat * BEAT_WIDTH, (high - next.pitch) * ROW_HEIGHT, cursorWidth, ROW_HEIGHT);
  };
  const cursorName = (where: { pitch: number; beat: number }) => {
    const bb = barAndBeat(where.beat, timeSignature);
    return messages.pianoRollCursor({
      pitch: pitchName(where.pitch),
      bar: bb.bar,
      beat: numberFormat.format(bb.beat),
    });
  };
  const onCursorKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.altKey || event.metaKey || event.ctrlKey) {
      return;
    }
    let next = cursor;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      next = {
        ...cursor,
        beat: clamp(snapTo(cursor.beat + direction * step, step), 0, totalBeats - step),
      };
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      const direction = event.key === 'ArrowUp' ? 1 : -1;
      next = {
        ...cursor,
        pitch: clamp(cursor.pitch + direction * (event.shiftKey ? 12 : 1), low, high),
      };
    } else {
      return;
    }
    event.preventDefault();
    setCursor(next);
    setAnnouncement(cursorName(next));
    revealCursor(next);
  };
  const addAtCursor = () => {
    if (!isEditable) {
      return;
    }
    const note = addNote(cursor.pitch, cursor.beat, newLength());
    audition(note);
    const next = { ...cursor, beat: Math.min(note.start + note.duration, totalBeats - step) };
    setCursor(next);
    revealCursor(next);
  };

  // ----- The world-space background: rows, beat and bar lines, the loop region, the draft note and the cursor.
  const rowElements = useMemo(
    () =>
      Array.from({ length: rows }, (_, index) => {
        const pitch = high - index;
        let shade = isBlackKey(pitch) ? 'bg-surface-3' : 'bg-surface-1';
        if (scale && scale.mode !== 'chromatic') {
          shade = !isInScale(pitch, scale)
            ? 'bg-surface-3'
            : pitchClass(pitch - scale.root) === 0
              ? 'bg-accent-bg'
              : 'bg-surface-1';
        }
        return (
          <div
            key={pitch}
            className={cn(
              'pointer-events-none absolute left-0 w-full border-b',
              pitchClass(pitch) === 0 ? 'border-border-strong' : 'border-border/60',
              shade,
            )}
            // Dynamic geometry: each row's place in the world.
            // eslint-disable-next-line no-restricted-syntax -- see above.
            style={{ top: index * ROW_HEIGHT, height: ROW_HEIGHT }}
          />
        );
      }),
    [rows, high, scale],
  );
  const beatPx = BEAT_WIDTH;
  const barPx = BEAT_WIDTH * perBar;
  const subPx = snapStep > 0 && snapStep < 1 ? snapStep * BEAT_WIDTH : 0;
  const lineLayers = [
    `repeating-linear-gradient(to right, var(--color-border-strong) 0 1px, transparent 1px ${String(barPx)}px)`,
    `repeating-linear-gradient(to right, var(--color-border) 0 1px, transparent 1px ${String(beatPx)}px)`,
    ...(subPx > 0
      ? [
          `repeating-linear-gradient(to right, color-mix(in oklab, var(--color-border) 45%, transparent) 0 1px, transparent 1px ${String(subPx)}px)`,
        ]
      : []),
  ];

  const background = (
    // Pointer handling here draws notes on the empty grid; notes are options and the cursor is a button.
    <div
      className={cn('absolute top-0 left-0', tool === 'draw' && isEditable && 'cursor-crosshair')}
      // Dynamic geometry: the world's size follows the length and pitch range.
      // eslint-disable-next-line no-restricted-syntax -- see above.
      style={{ width: worldWidth, height: worldHeight }}
      onPointerDown={onGridPointerDown}
      onPointerMove={onGridPointerMove}
      onPointerUp={onGridPointerUp}
      onPointerCancel={onGridPointerUp}
      onDoubleClick={onGridDoubleClick}
    >
      {rowElements}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        // Dynamic geometry: the bar, beat and snap lines' spacing follows the time signature and snap.
        // eslint-disable-next-line no-restricted-syntax -- see above.
        style={{ backgroundImage: lineLayers.join(', ') }}
      />
      {loop && loop.end > loop.start && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 h-full border-x border-accent-border bg-accent-bg/30"
          // Dynamic geometry: the loop region's place in time.
          // eslint-disable-next-line no-restricted-syntax -- see above.
          style={{ left: loop.start * BEAT_WIDTH, width: (loop.end - loop.start) * BEAT_WIDTH }}
        />
      )}
      {draft && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-sm border border-accent-border bg-accent-solid/70"
          // Dynamic geometry: the note being drawn.
          // eslint-disable-next-line no-restricted-syntax -- see above.
          style={{
            left: draft.start * BEAT_WIDTH,
            top: (high - draft.pitch) * ROW_HEIGHT,
            width: draft.duration * BEAT_WIDTH,
            height: ROW_HEIGHT,
          }}
        />
      )}
      {isEditable && (
        <button
          ref={cursorRef}
          type="button"
          data-grid-cursor=""
          aria-label={cursorName(cursor)}
          aria-describedby={cursorInstructionsId}
          className="pointer-events-none absolute top-0 left-0 rounded-sm border-2 border-focus bg-accent-bg/40 opacity-0 outline-none focus-visible:opacity-100"
          // Dynamic geometry: the cursor's cell.
          // eslint-disable-next-line no-restricted-syntax -- see above.
          style={{
            transform: `translate(${String(cursor.beat * BEAT_WIDTH)}px, ${String((high - cursor.pitch) * ROW_HEIGHT)}px)`,
            width: cursorWidth,
            height: ROW_HEIGHT,
          }}
          onFocus={() => {
            revealCursor(cursor);
          }}
          onKeyDown={onCursorKeyDown}
          onClick={addAtCursor}
        />
      )}
    </div>
  );

  // ----- Toolbar actions.
  const selectedOrAll = selection.length > 0 ? selection : notes.map((note) => note.id);
  const quantize = () => {
    if (snapStep <= 0) {
      return;
    }
    commit(quantizeNotes(notes, snapStep, selectedOrAll));
    setAnnouncement(messages.pianoRollQuantized({ count: selectedOrAll.length }));
  };

  // ----- Velocity lane: drag a note's stalk up or down.
  const laneRef = useRef<HTMLDivElement>(null);
  const velocityFromY = (clientY: number) => {
    const rect = laneRef.current?.getBoundingClientRect();
    if (!rect) {
      return defaultVelocity;
    }
    return Math.round(clamp(1 - (clientY - rect.top) / Math.max(1, rect.height), 0, 1) * 126 + 1);
  };
  const onLanePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!isEditable || event.button !== 0) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / viewport.zoom + viewport.x;
    const tolerance = 10 / viewport.zoom;
    const candidates = notes
      .filter(
        (note) =>
          Math.abs(note.start * BEAT_WIDTH - x) <= tolerance ||
          (x >= note.start * BEAT_WIDTH && x <= (note.start + note.duration) * BEAT_WIDTH),
      )
      .sort(
        (a, b) =>
          Number(selection.includes(b.id)) - Number(selection.includes(a.id)) ||
          Math.abs(a.start * BEAT_WIDTH - x) - Math.abs(b.start * BEAT_WIDTH - x),
      );
    const [note] = candidates;
    if (!note) {
      return;
    }
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // The pointer is already gone.
    }
    setVelocityEdit({
      pointerId: event.pointerId,
      id: note.id,
      velocity: velocityFromY(event.clientY),
    });
  };
  const onLanePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const velocityEdit = velocityRef.current;
    if (velocityEdit?.pointerId === event.pointerId) {
      setVelocityEdit({ ...velocityEdit, velocity: velocityFromY(event.clientY) });
    }
  };
  const onLanePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const velocityEdit = velocityRef.current;
    if (velocityEdit?.pointerId !== event.pointerId) {
      return;
    }
    setVelocityEdit(null);
    if (event.type !== 'pointercancel') {
      commit(
        latest.current.notes.map((note) =>
          note.id === velocityEdit.id ? { ...note, velocity: velocityEdit.velocity } : note,
        ),
      );
    }
  };

  const zoom = viewport.zoom;
  const sounding = useMemo(
    () => (playhead === undefined ? [] : notesAt(notes, playhead).map((note) => note.pitch)),
    [notes, playhead],
  );
  const playheadX = playhead === undefined ? null : (playhead * BEAT_WIDTH - viewport.x) * zoom;
  const isPlayheadVisible = playheadX !== null && playheadX >= 0 && playheadX <= size.width;
  const shift = { transform: `translateX(${String(-viewport.x * zoom)}px)` };

  return (
    <div
      ref={ref}
      role="group"
      aria-label={ariaLabel ?? messages.pianoRollLabel}
      className={cn('flex min-w-0 flex-col gap-2', className)}
    >
      <div
        role="group"
        aria-label={messages.pianoRollToolbar}
        className="flex min-w-0 flex-wrap items-center gap-1"
      >
        {isEditable && !isTableView && (
          <>
            <IconButton
              icon={Pencil}
              variant="outline"
              aria-label={messages.pianoRollDraw}
              isSelected={tool === 'draw'}
              onChange={() => {
                setTool('draw');
              }}
            />
            <IconButton
              icon={MousePointer2}
              variant="outline"
              aria-label={messages.pianoRollSelect}
              isSelected={tool === 'select'}
              onChange={() => {
                setTool('select');
              }}
            />
          </>
        )}
        <div className="flex items-center gap-1 ps-1">
          <Magnet aria-hidden="true" className="size-4 text-fg-muted" />
          <Select
            aria-label={messages.pianoRollSnap}
            size="sm"
            value={snap}
            className="w-28"
            onChange={(next) => {
              setSnap(next);
            }}
          >
            {SNAP_VALUES.map((value) => (
              <Option
                key={value}
                id={value}
                textValue={
                  value === 'off'
                    ? messages.musicSnapOff
                    : value.endsWith('t')
                      ? messages.musicSnapTriplet({ value: value.slice(0, -1) })
                      : value
                }
              >
                {value === 'off'
                  ? messages.musicSnapOff
                  : value.endsWith('t')
                    ? messages.musicSnapTriplet({ value: value.slice(0, -1) })
                    : value}
              </Option>
            ))}
          </Select>
        </div>
        {isEditable && (
          <>
            <IconButton
              icon={Wand2}
              variant="outline"
              aria-label={messages.pianoRollQuantize}
              isDisabled={snapStep <= 0 || notes.length === 0}
              onPress={quantize}
            />
            <IconButton
              icon={Copy}
              variant="outline"
              aria-label={messages.pianoRollDuplicate}
              isDisabled={selection.length === 0}
              onPress={() => {
                duplicate(selection);
              }}
            />
            <IconButton
              icon={Trash2}
              variant="outline"
              aria-label={messages.delete}
              isDisabled={selection.length === 0}
              onPress={() => {
                deleteNotes(selection);
              }}
            />
          </>
        )}
        <IconButton
          icon={Grid3x3}
          variant="outline"
          aria-label={messages.pianoRollTableView}
          className="ms-auto"
          isSelected={isTableView}
          onChange={setTableView}
        />
      </div>

      {isTableView ? (
        <NoteTable
          notes={notes}
          pitchRange={range}
          step={step}
          onChange={onChange}
          onAudition={onAudition}
          onAdd={() => {
            const end = notesEnd(notes);
            const last = sortNotes(notes).at(-1);
            addNote(last?.pitch ?? clamp(60, low, high), snapTo(end, step), newLength());
          }}
        />
      ) : (
        // Key handling here only notes Space (held to pan the canvas), so drawing doesn't start while panning.
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- see above.
        <div
          className="grid min-w-0 grid-cols-[3rem_minmax(0,1fr)] gap-x-1 gap-y-1 sm:grid-cols-[3.5rem_minmax(0,1fr)]"
          onKeyDown={(event) => {
            if (event.key === ' ') {
              spaceHeld.current = true;
            }
          }}
          onKeyUp={(event) => {
            if (event.key === ' ') {
              spaceHeld.current = false;
            }
          }}
          onPointerDownCapture={(event) => {
            if (event.pointerType === 'touch') {
              touches.current.add(event.pointerId);
              if (touches.current.size > 1 && draftRef.current) {
                setDraft(null);
              }
            }
          }}
          onPointerUpCapture={(event) => {
            touches.current.delete(event.pointerId);
          }}
          onPointerCancelCapture={(event) => {
            touches.current.delete(event.pointerId);
          }}
        >
          <div aria-hidden="true" />
          <div
            aria-hidden="true"
            className="relative h-6 overflow-hidden rounded-control border border-border bg-surface-2"
          >
            <div
              className="absolute inset-y-0 left-0"
              // Dynamic geometry: the ruler scrolls and zooms with the grid.
              // eslint-disable-next-line no-restricted-syntax -- see above.
              style={{ ...shift, width: worldWidth * zoom }}
            >
              {loop && loop.end > loop.start && (
                <div
                  className="absolute inset-y-0 border-x-2 border-accent-solid bg-accent-bg"
                  // Dynamic geometry: the loop region on the ruler.
                  // eslint-disable-next-line no-restricted-syntax -- see above.
                  style={{
                    left: loop.start * BEAT_WIDTH * zoom,
                    width: (loop.end - loop.start) * BEAT_WIDTH * zoom,
                  }}
                />
              )}
              {Array.from({ length: totalBars }, (_, bar) => (
                <span
                  key={bar}
                  className="absolute inset-y-0 border-s border-border-strong ps-1 text-xs leading-6 text-fg-muted tabular-nums"
                  // Dynamic geometry: each bar number's place.
                  // eslint-disable-next-line no-restricted-syntax -- see above.
                  style={{ left: bar * barPx * zoom }}
                >
                  {bar + 1}
                </span>
              ))}
              {playhead !== undefined && (
                <span
                  className="absolute bottom-0 size-0 -translate-x-1/2 border-x-[5px] border-t-[7px] border-x-transparent border-t-accent-solid"
                  // Dynamic geometry: the playhead marker.
                  // eslint-disable-next-line no-restricted-syntax -- see above.
                  style={{ left: playhead * BEAT_WIDTH * zoom }}
                />
              )}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-control border border-border">
            <span id={keysLabelId} hidden>
              {messages.pianoRollKeys}
            </span>
            <div
              className="absolute inset-x-0 top-0"
              // Dynamic geometry: the key column scrolls and zooms with the grid.
              // eslint-disable-next-line no-restricted-syntax -- see above.
              style={{
                height: worldHeight * zoom,
                transform: `translateY(${String(-viewport.y * zoom)}px)`,
              }}
            >
              <PianoKeyboard
                orientation="vertical"
                range={range}
                activeNotes={sounding}
                aria-labelledby={keysLabelId}
                onNoteOn={(pitch, velocity) => {
                  onAudition?.(pitch, velocity);
                }}
              />
            </div>
          </div>
          <div ref={canvasBoxRef} className="min-w-0">
            <Canvas
              aria-label={messages.pianoRollGrid}
              height={height}
              viewport={viewport}
              onViewportChange={setViewport}
              minZoom={MIN_ZOOM}
              maxZoom={MAX_ZOOM}
              grid={DRAG_GRID}
              selection={selection}
              onSelectionChange={changeSelection}
              hasMarquee={tool === 'select' || !isEditable}
              contentBounds={{ x: 0, y: 0, width: worldWidth, height: worldHeight }}
              onDelete={isEditable ? deleteNotes : undefined}
              background={background}
              overlay={
                isPlayheadVisible && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-0 z-10 w-0.5 bg-accent-solid"
                    // Dynamic geometry: the playhead line.
                    // eslint-disable-next-line no-restricted-syntax -- see above.
                    style={{ transform: `translateX(${String(playheadX)}px)` }}
                  />
                )
              }
            >
              {noteItems}
            </Canvas>
          </div>

          {hasVelocityLane && (
            <>
              <div className="flex min-w-0 items-center justify-end pe-1 text-[0.625rem] text-fg-muted sm:text-xs">
                {messages.pianoRollVelocityLane}
              </div>
              <div
                ref={laneRef}
                aria-hidden="true"
                className={cn(
                  'relative h-16 touch-none overflow-hidden rounded-control border border-border bg-surface-2',
                  isEditable && 'cursor-ns-resize',
                )}
                onPointerDown={onLanePointerDown}
                onPointerMove={onLanePointerMove}
                onPointerUp={onLanePointerUp}
                onPointerCancel={onLanePointerUp}
              >
                <div
                  className="pointer-events-none absolute inset-y-0 left-0"
                  // Dynamic geometry: the lane scrolls and zooms with the grid.
                  // eslint-disable-next-line no-restricted-syntax -- see above.
                  style={{ ...shift, width: worldWidth * zoom }}
                >
                  {shown.map((note) => (
                    <span
                      key={note.id}
                      data-velocity-note={note.id}
                      className={cn(
                        'absolute bottom-0 w-1 rounded-t-sm',
                        selection.includes(note.id) ? 'bg-fg' : 'bg-accent-solid',
                      )}
                      // Dynamic geometry: the stalk's place and height (velocity).
                      // eslint-disable-next-line no-restricted-syntax -- see above.
                      style={{
                        left: note.start * BEAT_WIDTH * zoom,
                        height: `${String((note.velocity / 127) * 100)}%`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
      <span id={noteInstructionsId} hidden>
        {messages.pianoRollNoteInstructions}
      </span>
      <span id={cursorInstructionsId} hidden>
        {messages.pianoRollCursorInstructions}
      </span>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}
