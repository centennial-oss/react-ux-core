// PianoKeyboard (FR-071): an on-screen piano for input and display. Keys are buttons named by pitch ("C sharp 4"),
// pressed while held by mouse, touch (several fingers at once, velocity from how far down the key you press, or pen
// pressure), Space or Enter, the computer keyboard (A W S E D … like a DAW, when turned on) or a MIDI device. Dragging
// across keys plays a glissando. Keys the app marks active (playback) show pressed, and highlights (a chord, a scale)
// carry text in the key's name as well as colour and a dot. On narrow screens the keyboard scrolls sideways inside
// itself, with buttons to move by an octave; vertical swipes still scroll the page. `orientation="vertical"` draws one
// key per row, highest at the top, for a piano roll's key column.

import { Cable, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type Ref,
} from 'react';
import { Button } from '../components/Button/Button';
import { IconButton } from '../components/IconButton/IconButton';
import { LiveRegion } from '../components/LiveRegion/LiveRegion';
import { StatusDot } from '../components/StatusDot/StatusDot';
import { Switch } from '../components/Switch/Switch';
import { cn } from '../utils/cn';
import { isFormControlTarget } from '../utils/keyboard';
import { clamp } from '../utils/math';
import { capturePointer } from '../utils/pointer';
import { toneFillClasses, toneSolidClasses } from '../utils/toneClasses';
import type { Tone } from '../utils/types';
import { useLatest } from '../utils/useLatest';
import { useMusicMessages, type MusicStrings } from './messages';
import { isBlackKey, normalizePitchRange, pitchClass, spellPitch, type PitchRange } from './pitch';
import { useMidiInput, type MidiDevice, type MidiStatus } from './useMidiInput';

/** A highlighted key: its colour role and, optionally, the text read with its name (defaults to "highlighted"). */
export interface PianoHighlight {
  pitch: number;
  tone: Tone;
  label?: string;
}

export interface PianoKeyboardProps {
  /** MIDI numbers, both ends included (widened to white keys). Defaults to C3–C5 (48–72). */
  pitchRange?: PitchRange;
  /** Keys shown as pressed (from playback or the app's own MIDI handling). */
  activeNotes?: readonly number[];
  onNoteOn?: (pitch: number, velocity: number) => void;
  onNoteOff?: (pitch: number) => void;
  /**
   * Listens to MIDI input: `auto` for every device, a device id or name for one, or null (the default) for none.
   * Access is asked for on demand, with a connect button; the devices show with their status.
   */
  midiInput?: string | null;
  /** Plays notes from the computer keyboard (A W S E D …; Z and X change octave), with a switch to turn it off. Defaults to false. */
  hasQwertyInput?: boolean;
  /** Which keys show their pitch name. Defaults to `c-only`. */
  keyLabels?: 'none' | 'c-only' | 'all';
  /** Highlights keys, such as a chord to play or a scale. */
  highlightedNotes?: readonly PianoHighlight[];
  /** `vertical` stacks one key per row, highest at the top, filling the container's height. Defaults to `horizontal`. */
  orientation?: 'horizontal' | 'vertical';
  /** Velocity of notes played with Space, Enter or the computer keyboard. Defaults to 100. */
  keyboardVelocity?: number;
  isDisabled?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

const DEFAULT_RANGE: PitchRange = { low: 48, high: 72 };
const EMPTY_NOTES: readonly number[] = [];
const EMPTY_HIGHLIGHTS: readonly PianoHighlight[] = [];
/** A black key's width as a share of a white key's (horizontal) or of the column (vertical). */
const BLACK_WIDTH = 0.6;

/** Computer-keyboard keys (by physical position) and the semitone above the base C each plays. */
const QWERTY_OFFSETS: Record<string, number> = {
  KeyA: 0,
  KeyW: 1,
  KeyS: 2,
  KeyE: 3,
  KeyD: 4,
  KeyF: 5,
  KeyT: 6,
  KeyG: 7,
  KeyY: 8,
  KeyH: 9,
  KeyU: 10,
  KeyJ: 11,
  KeyK: 12,
  KeyO: 13,
  KeyL: 14,
  KeyP: 15,
  Semicolon: 16,
  Quote: 17,
};

/** Plain keys in the dark theme, where the foreground token is light and the surface dark. */
const darkWhiteKeyClasses = 'dark:bg-fg dark:text-fg-inverse';
const darkBlackKeyClasses = 'dark:bg-surface-1 dark:text-fg dark:ring-1 dark:ring-border-strong';

/**
 * The tones of a highlighted white key and a black key's dot (static strings for Tailwind). A highlighted black key
 * uses `toneSolidClasses` and a white key's dot `toneFillClasses`.
 */
const whiteToneClasses: Record<Tone, string> = {
  neutral: 'bg-neutral-bg',
  accent: 'bg-accent-bg',
  success: 'bg-success-bg',
  warning: 'bg-warning-bg',
  danger: 'bg-danger-bg',
};
const blackDotClasses: Record<Tone, string> = {
  neutral: 'bg-neutral-on-solid',
  accent: 'bg-accent-on-solid',
  success: 'bg-success-on-solid',
  warning: 'bg-warning-on-solid',
  danger: 'bg-danger-on-solid',
};

interface KeyLayout {
  pitch: number;
  isBlack: boolean;
  /** For a white key its own index among the white keys; for a black key the index of the white key below it. */
  whiteIndex: number;
}

/** The keys of a range widened to white keys at both ends, with their positions. */
export function layoutKeys(range: PitchRange): {
  keys: KeyLayout[];
  whiteCount: number;
  low: number;
  high: number;
} {
  let { low, high } = normalizePitchRange(range.low, range.high);
  if (isBlackKey(low)) {
    low -= 1;
  }
  if (isBlackKey(high)) {
    high += 1;
  }
  const keys: KeyLayout[] = [];
  let whiteIndex = -1;
  for (let pitch = low; pitch <= high; pitch++) {
    const isBlack = isBlackKey(pitch);
    if (!isBlack) {
      whiteIndex += 1;
    }
    keys.push({ pitch, isBlack, whiteIndex });
  }
  return { keys, whiteCount: whiteIndex + 1, low, high };
}

/** A pitch's accessible name. */
export function pitchName(messages: MusicStrings, pitch: number): string {
  return messages.musicPitchName(spellPitch(pitch));
}

function percent(value: number): string {
  return `${String(Number((value * 100).toFixed(4)))}%`;
}

function midiStatusDot(
  messages: MusicStrings,
  status: MidiStatus,
  devices: readonly MidiDevice[],
): { tone: Tone; label: string }[] {
  switch (status) {
    case 'unsupported':
      return [{ tone: 'neutral', label: messages.midiUnsupported }];
    case 'denied':
      return [{ tone: 'danger', label: messages.midiDenied }];
    case 'connecting':
    case 'idle':
      return [{ tone: 'accent', label: messages.midiConnecting }];
    case 'ready':
      return devices.length === 0
        ? [{ tone: 'warning', label: messages.midiNoDevices }]
        : devices.map((device) => ({
            tone: device.isConnected ? 'success' : 'neutral',
            label: messages.midiDevice({ name: device.name, isConnected: device.isConnected }),
          }));
  }
}

/** An on-screen piano keyboard with multi-touch, glissando, computer-keyboard and MIDI input. */
export function PianoKeyboard({
  pitchRange: range = DEFAULT_RANGE,
  activeNotes = EMPTY_NOTES,
  onNoteOn,
  onNoteOff,
  midiInput = null,
  hasQwertyInput = false,
  keyLabels: labels = 'c-only',
  highlightedNotes = EMPTY_HIGHLIGHTS,
  orientation = 'horizontal',
  keyboardVelocity = 100,
  isDisabled = false,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  className,
  ref,
}: PianoKeyboardProps) {
  const messages = useMusicMessages();
  const instructionsId = useId();
  const qwertyDescriptionId = useId();
  const isVertical = orientation === 'vertical';
  const { keys, whiteCount, low, high } = useMemo(() => layoutKeys(range), [range]);

  // Keys held on this keyboard (pointer, Space/Enter, computer keyboard), counted per pitch so two fingers on one key
  // or a key held two ways sound once and stop once.
  const holds = useRef(new Map<number, number>());
  const [held, setHeld] = useState<readonly number[]>(EMPTY_NOTES);
  const callbacks = useLatest({ onNoteOn, onNoteOff });
  const syncHeld = () => {
    setHeld([...holds.current.keys()]);
  };
  const press = useCallback(
    (pitch: number, velocity: number) => {
      const count = holds.current.get(pitch) ?? 0;
      holds.current.set(pitch, count + 1);
      if (count === 0) {
        callbacks.current.onNoteOn?.(pitch, clamp(Math.round(velocity), 1, 127));
        syncHeld();
      }
    },
    [callbacks],
  );
  const release = useCallback(
    (pitch: number) => {
      const count = holds.current.get(pitch) ?? 0;
      if (count <= 0) {
        return;
      }
      if (count === 1) {
        holds.current.delete(pitch);
        callbacks.current.onNoteOff?.(pitch);
        syncHeld();
      } else {
        holds.current.set(pitch, count - 1);
      }
    },
    [callbacks],
  );
  // Nothing stays sounding when the keyboard goes away.
  useEffect(
    () => () => {
      for (const pitch of holds.current.keys()) {
        callbacks.current.onNoteOff?.(pitch);
      }
      holds.current.clear();
    },
    [callbacks],
  );

  const midi = useMidiInput({ input: midiInput, onNoteOn, onNoteOff });
  const shownDevices = useMemo(
    () =>
      midiInput === null || midiInput === 'auto'
        ? midi.devices
        : midi.devices.filter((device) => device.id === midiInput || device.name === midiInput),
    [midi.devices, midiInput],
  );

  const active = useMemo(
    () => new Set([...activeNotes, ...held, ...midi.heldNotes]),
    [activeNotes, held, midi.heldNotes],
  );
  const highlights = useMemo(
    () => new Map(highlightedNotes.map((highlight) => [highlight.pitch, highlight])),
    [highlightedNotes],
  );

  // Roving focus: one key is in the tab order; arrow keys move between keys.
  const [focusPitch, setFocusPitch] = useState<number | null>(null);
  const tabPitch =
    focusPitch !== null && focusPitch >= low && focusPitch <= high
      ? focusPitch
      : 60 >= low && 60 <= high
        ? 60
        : low;
  const keysRef = useRef<HTMLDivElement>(null);
  const focusKey = (pitch: number) => {
    const target = clamp(pitch, low, high);
    setFocusPitch(target);
    keysRef.current?.querySelector<HTMLElement>(`[data-pitch="${String(target)}"]`)?.focus();
  };

  // Pointer playing: each pointer holds one key; moving onto another key releases the old one (glissando).
  const pointers = useRef(new Map<number, number | null>());
  const velocityAt = (event: PointerEvent, key: HTMLElement): number => {
    if (event.pointerType === 'pen' && event.pressure > 0) {
      return 1 + event.pressure * 126;
    }
    const rect = key.getBoundingClientRect();
    const share = isVertical
      ? (event.clientX - rect.left) / Math.max(1, rect.width)
      : (event.clientY - rect.top) / Math.max(1, rect.height);
    // Pressing further along the key (towards the player) plays louder, as on a real key's front edge.
    return 32 + clamp(share, 0, 1) * 95;
  };
  const keyAt = (x: number, y: number): HTMLElement | null => {
    const element = document.elementFromPoint(x, y);
    const key = element instanceof Element ? element.closest<HTMLElement>('[data-pitch]') : null;
    return key && keysRef.current?.contains(key) ? key : null;
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (isDisabled || (event.pointerType === 'mouse' && event.button !== 0)) {
      return;
    }
    const key = (event.target as Element).closest<HTMLElement>('[data-pitch]');
    if (!key) {
      return;
    }
    const pitch = Number(key.dataset.pitch);
    // The pointer can already be gone (a very quick tap); the press still plays.
    capturePointer(event.currentTarget, event.pointerId);
    pointers.current.set(event.pointerId, pitch);
    setFocusPitch(pitch);
    press(pitch, velocityAt(event, key));
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) {
      return;
    }
    const current = pointers.current.get(event.pointerId) ?? null;
    const key = keyAt(event.clientX, event.clientY);
    const pitch = key ? Number(key.dataset.pitch) : null;
    if (pitch === current) {
      return;
    }
    if (current !== null) {
      release(current);
    }
    pointers.current.set(event.pointerId, pitch);
    if (key && pitch !== null) {
      press(pitch, velocityAt(event, key));
    }
  };
  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) {
      return;
    }
    const current = pointers.current.get(event.pointerId) ?? null;
    pointers.current.delete(event.pointerId);
    if (current !== null) {
      release(current);
    }
  };

  // Space and Enter play the focused key while held.
  const keyboardHeld = useRef(new Set<number>());
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, pitch: number) => {
    const previous = isVertical ? 'ArrowDown' : 'ArrowLeft';
    const next = isVertical ? 'ArrowUp' : 'ArrowRight';
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (!event.repeat && !keyboardHeld.current.has(pitch)) {
        keyboardHeld.current.add(pitch);
        press(pitch, keyboardVelocity);
      }
    } else if (event.key === previous || event.key === next) {
      event.preventDefault();
      focusKey(pitch + (event.key === next ? 1 : -1));
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusKey(low);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusKey(high);
    }
  };
  const releaseKeyboard = (pitch: number) => {
    if (keyboardHeld.current.delete(pitch)) {
      release(pitch);
    }
  };

  // The computer keyboard plays from a base C, which Z and X move by an octave.
  const [isQwertyOn, setQwertyOn] = useState(true);
  const isQwertyActive = hasQwertyInput && isQwertyOn && !isDisabled;
  const [qwertyBase, setQwertyBase] = useState(() => {
    const firstC = Math.ceil(low / 12) * 12;
    return firstC <= high ? firstC : low - pitchClass(low);
  });
  const [announcement, setAnnouncement] = useState('');
  const qwertyRange = {
    low: pitchName(messages, qwertyBase),
    high: pitchName(messages, qwertyBase + 12),
  };
  const latestQwerty = useLatest({ qwertyBase, keyboardVelocity, messages });
  useEffect(() => {
    if (!isQwertyActive) {
      return;
    }
    const sounding = new Map<string, number>();
    const onDown = (event: globalThis.KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isFormControlTarget(event.target)) {
        return;
      }
      const {
        qwertyBase: base,
        keyboardVelocity: velocity,
        messages: strings,
      } = latestQwerty.current;
      if (event.code === 'KeyZ' || event.code === 'KeyX') {
        event.preventDefault();
        if (event.repeat) {
          return;
        }
        const nextBase = clamp(base + (event.code === 'KeyX' ? 12 : -12), 0, 108);
        setQwertyBase(nextBase);
        setAnnouncement(
          strings.pianoQwertyOn({
            low: pitchName(strings, nextBase),
            high: pitchName(strings, nextBase + 12),
          }),
        );
        return;
      }
      const offset = QWERTY_OFFSETS[event.code];
      if (offset === undefined) {
        return;
      }
      event.preventDefault();
      if (event.repeat || sounding.has(event.code)) {
        return;
      }
      const pitch = base + offset;
      if (pitch > 127) {
        return;
      }
      sounding.set(event.code, pitch);
      press(pitch, velocity);
    };
    const onUp = (event: globalThis.KeyboardEvent) => {
      const pitch = sounding.get(event.code);
      if (pitch !== undefined) {
        sounding.delete(event.code);
        release(pitch);
      }
    };
    const releaseAll = () => {
      for (const pitch of sounding.values()) {
        release(pitch);
      }
      sounding.clear();
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', releaseAll);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', releaseAll);
      releaseAll();
    };
  }, [isQwertyActive, press, release, latestQwerty]);

  // A keyboard wider than its container scrolls inside itself; the buttons move it an octave at a time.
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = useState({ isOverflowing: false, isAtStart: true, isAtEnd: true });
  const hasCentered = useRef(false);
  const measureScroll = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }
    const isOverflowing = scroller.scrollWidth > scroller.clientWidth + 1;
    const next = {
      isOverflowing,
      isAtStart: scroller.scrollLeft <= 1,
      isAtEnd: scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 1,
    };
    setScroll((current) =>
      current.isOverflowing === next.isOverflowing &&
      current.isAtStart === next.isAtStart &&
      current.isAtEnd === next.isAtEnd
        ? current
        : next,
    );
  }, []);
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || isVertical) {
      return;
    }
    const measure = () => {
      // The first time it overflows, open on middle C (or the range's middle) rather than the lowest keys.
      if (!hasCentered.current && scroller.scrollWidth > scroller.clientWidth + 1) {
        hasCentered.current = true;
        const centre = 60 >= low && 60 <= high ? 60 : Math.round((low + high) / 2);
        const key = scroller.querySelector<HTMLElement>(`[data-pitch="${String(centre)}"]`);
        if (key) {
          scroller.scrollLeft = key.offsetLeft + key.offsetWidth / 2 - scroller.clientWidth / 2;
        }
      }
      measureScroll();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    return () => {
      observer.disconnect();
    };
  }, [isVertical, low, high, measureScroll]);
  const scrollByOctave = (direction: 1 | -1) => {
    const scroller = scrollerRef.current;
    if (scroller) {
      scroller.scrollBy({
        left: direction * (scroller.scrollWidth / whiteCount) * 7,
        behavior: 'smooth',
      });
    }
  };

  const rows = high - low + 1;
  // A vertical keyboard lists its keys top (highest) to bottom, the order they're seen in.
  const keyElements = (isVertical ? [...keys].reverse() : keys).map(
    ({ pitch, isBlack, whiteIndex }) => {
      const spelled = spellPitch(pitch);
      const name = messages.musicPitchName(spelled);
      const highlight = highlights.get(pitch);
      const isActive = active.has(pitch);
      const showsLabel =
        labels === 'all' || (labels === 'c-only' && spelled.letter === 'C' && !spelled.accidental);
      let geometry: CSSProperties;
      if (isVertical) {
        geometry = { top: percent((high - pitch) / rows), height: percent(1 / rows) };
      } else if (isBlack) {
        geometry = {
          left: percent((whiteIndex + 1 - BLACK_WIDTH / 2) / whiteCount),
          width: percent(BLACK_WIDTH / whiteCount),
        };
      } else {
        geometry = { left: percent(whiteIndex / whiteCount), width: percent(1 / whiteCount) };
      }
      return (
        <button
          key={pitch}
          type="button"
          data-pitch={pitch}
          data-active={isActive || undefined}
          aria-pressed={isActive}
          aria-label={
            highlight
              ? messages.pianoKeyHighlighted({
                  pitch: name,
                  label: highlight.label ?? messages.pianoHighlight,
                })
              : name
          }
          aria-describedby={pitch === tabPitch ? instructionsId : undefined}
          tabIndex={pitch === tabPitch ? 0 : -1}
          disabled={isDisabled}
          className={cn(
            'absolute flex cursor-pointer items-center outline-none select-none disabled:cursor-not-allowed disabled:opacity-50',
            'focus-visible:z-30 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus focus-visible:outline-solid',
            isVertical
              ? isBlack
                ? 'left-0 z-10 w-[60%] flex-row justify-end rounded-e-sm bg-fg pe-1 text-fg-inverse'
                : 'left-0 w-full flex-row justify-end border-b border-border pe-1 text-fg-muted'
              : isBlack
                ? 'top-0 z-10 h-[62%] flex-col justify-end rounded-b-md bg-fg pb-1.5 text-fg-inverse shadow-sm'
                : 'top-0 bottom-0 flex-col justify-end rounded-b-md border border-border-strong bg-surface-1 pb-2 text-fg-muted',
            highlight &&
              (isBlack ? toneSolidClasses[highlight.tone] : whiteToneClasses[highlight.tone]),
            // The dark theme keeps the keys the way round a piano has them: light white keys, dark black keys.
            !highlight && !isActive && (isBlack ? darkBlackKeyClasses : darkWhiteKeyClasses),
            isActive && 'bg-accent-solid text-accent-on-solid',
          )}
          // Dynamic geometry: each key's place along the keyboard depends on the range.
          // eslint-disable-next-line no-restricted-syntax -- see above.
          style={geometry}
          onFocus={() => {
            setFocusPitch(pitch);
          }}
          onKeyDown={(event) => {
            onKeyDown(event, pitch);
          }}
          onKeyUp={(event) => {
            if (event.key === ' ' || event.key === 'Enter') {
              event.preventDefault();
              releaseKeyboard(pitch);
            }
          }}
          onBlur={() => {
            releaseKeyboard(pitch);
          }}
        >
          {highlight && (
            <span
              aria-hidden="true"
              className={cn(
                'pointer-events-none size-2 shrink-0 rounded-full ring-1 ring-surface-1',
                isVertical ? 'me-1' : 'mb-1',
                isActive
                  ? 'bg-accent-on-solid'
                  : isBlack
                    ? blackDotClasses[highlight.tone]
                    : toneFillClasses[highlight.tone],
              )}
            />
          )}
          {showsLabel && (
            // The short label ("C♯4") is drawn as generated content: the key's name spells it out ("C sharp 4"), and
            // a text node that differs from the name would read as a label/name mismatch.
            <span
              aria-hidden="true"
              data-label={messages.musicPitchLabel(spelled)}
              className={cn(
                'pointer-events-none leading-none font-medium after:content-[attr(data-label)]',
                isBlack ? 'text-[0.5625rem]' : 'text-[0.6875rem]',
              )}
            />
          )}
        </button>
      );
    },
  );

  const keyboard = (
    // Pointer handling here is for the keys inside (multi-touch and glissando across them); each key is a button.
    <div
      ref={keysRef}
      role="group"
      aria-label={ariaLabelledBy ? undefined : (ariaLabel ?? messages.pianoKeyboardLabel)}
      aria-labelledby={ariaLabelledBy}
      data-orientation={orientation}
      className={cn(
        'relative isolate bg-surface-1 select-none',
        isVertical
          ? 'h-full w-full touch-none'
          : 'h-36 w-full min-w-[calc(var(--piano-white-keys)*1.5rem)] touch-pan-y pointer-coarse:min-w-[calc(var(--piano-white-keys)*2.75rem)] sm:h-40',
      )}
      // Dynamic geometry: the keyboard's minimum width follows its number of white keys.
      // eslint-disable-next-line no-restricted-syntax -- see above.
      style={{ '--piano-white-keys': whiteCount } as CSSProperties}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onContextMenu={(event) => {
        // A long press on a key plays it; it shouldn't also open the context menu.
        event.preventDefault();
      }}
    >
      {keyElements}
    </div>
  );

  const midiDots =
    midiInput !== null && midi.status !== 'idle'
      ? midiStatusDot(messages, midi.status, shownDevices)
      : [];
  const hasToolbar = !isVertical && (hasQwertyInput || midiInput !== null || scroll.isOverflowing);

  return (
    <div ref={ref} className={cn('flex min-w-0 flex-col gap-2', isVertical && 'h-full', className)}>
      {hasToolbar && (
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
          {hasQwertyInput && (
            <Switch
              isSelected={isQwertyOn}
              isDisabled={isDisabled}
              aria-describedby={qwertyDescriptionId}
              onChange={(isSelected) => {
                setQwertyOn(isSelected);
                setAnnouncement(
                  isSelected ? messages.pianoQwertyOn(qwertyRange) : messages.pianoQwertyOff,
                );
              }}
            >
              {messages.pianoQwertyToggle}
            </Switch>
          )}
          {midiInput !== null && (
            <div
              role="group"
              aria-label={messages.midiDevices}
              className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1"
            >
              {midi.status === 'idle' && (
                <Button size="sm" variant="outline" icon={Cable} onPress={midi.connect}>
                  {messages.midiConnect}
                </Button>
              )}
              <div
                aria-live="polite"
                className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1"
              >
                {midiDots.map((dot) => (
                  <StatusDot key={dot.label} tone={dot.tone} label={dot.label} size="sm" />
                ))}
              </div>
            </div>
          )}
          {scroll.isOverflowing && (
            <div className="ms-auto flex items-center gap-1">
              <IconButton
                icon={ChevronLeft}
                size="sm"
                variant="outline"
                aria-label={messages.pianoShowLowerKeys}
                isDisabled={scroll.isAtStart}
                onPress={() => {
                  scrollByOctave(-1);
                }}
              />
              <IconButton
                icon={ChevronRight}
                size="sm"
                variant="outline"
                aria-label={messages.pianoShowHigherKeys}
                isDisabled={scroll.isAtEnd}
                onPress={() => {
                  scrollByOctave(1);
                }}
              />
            </div>
          )}
        </div>
      )}
      {isVertical ? (
        keyboard
      ) : (
        <div
          ref={scrollerRef}
          className="relative min-w-0 overflow-x-auto overscroll-x-contain rounded-control border border-border"
          onScroll={measureScroll}
        >
          {keyboard}
        </div>
      )}
      <span id={instructionsId} hidden>
        {messages.pianoKeyboardInstructions}
      </span>
      {hasQwertyInput && (
        <span id={qwertyDescriptionId} hidden>
          {messages.pianoQwertyOn(qwertyRange)}
        </span>
      )}
      <LiveRegion>{announcement}</LiveRegion>
    </div>
  );
}
