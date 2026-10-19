// MusicNotation (FR-070): a single-staff score drawn with VexFlow as SVG — clef, key and time signatures, notes,
// chords, rests, ties and chord symbols — in the theme's colours, wrapped into systems that fit the container (or four
// measures a line, scrolling sideways). A playhead highlights its measure and note and keeps them in view. Over the
// drawing, each measure is a group named by its text alternative ("Measure 3: E4 quarter, G4 quarter, C5 half") and
// each note a button (press for `onNotePress`); arrow keys move by note (left and right) and by measure (up and
// down). VexFlow and its music font load on first use (a dynamic import, with the font embedded, so nothing is
// fetched from the network); `data-notation-status` reads `loading`, `ready` or `error`.

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type Ref,
} from 'react';
import { useLocale } from 'react-aria-components';
import type * as VexFlowModule from 'vexflow/bravura';
import { cn } from '../utils/cn';
import { mergeRefs } from '../utils/mergeRefs';
import { useElementWidth } from '../utils/useElementWidth';
import { useThemeAttribute } from '../utils/useThemeAttribute';
import { useMusicMessages } from './messages';
import { parseMusicXml } from './musicxml';
import {
  describeMeasure,
  describeNotationNote,
  noteAtPlayhead,
  timeScore,
  type NotationScore,
} from './notation';
import { renderNotation, type RenderedNotation } from './renderNotation';

type VexFlow = typeof VexFlowModule;

export interface MusicNotationProps {
  /** The score: the documented JSON model, or MusicXML (`score-partwise`, first part and voice). */
  score: string | NotationScore;
  /** Highlights the measure and note at the playhead: `measure` 1-based, `beat` 1-based within it (1 is the downbeat). */
  playhead?: { measure: number; beat: number } | null;
  /** Keeps the playhead's measure scrolled into view. Defaults to true. */
  shouldFollowPlayhead?: boolean;
  /** Called with a note's id when it's pressed, for editing elsewhere (such as the PianoRoll). */
  onNotePress?: (noteId: string) => void;
  /** Wraps systems to the container's width. Otherwise four measures a line, scrolling sideways. Defaults to true. */
  isResponsive?: boolean;
  /** Scales the notation. Defaults to 1. */
  zoom?: number;
  /** Defaults to the score's title, or "Score". */
  'aria-label'?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

let vexflowLoad: Promise<VexFlow> | null = null;

/** Loads VexFlow (with its embedded Bravura and Academico fonts) once, resolving when the fonts are ready. */
function loadVexFlow(): Promise<VexFlow> {
  vexflowLoad ??= import('vexflow/bravura').then(async (module) => {
    if (typeof document !== 'undefined' && 'fonts' in document) {
      await Promise.all([
        document.fonts.load('30px Bravura'),
        document.fonts.load('12px Academico'),
      ]);
    }
    return module;
  });
  vexflowLoad.catch(() => {
    vexflowLoad = null;
  });
  return vexflowLoad;
}

/** A score rendered as music notation, with a playhead and a navigable text alternative. */
export function MusicNotation({
  score,
  playhead,
  shouldFollowPlayhead = true,
  onNotePress,
  isResponsive = true,
  zoom = 1,
  'aria-label': ariaLabel,
  className,
  ref,
}: MusicNotationProps) {
  const messages = useMusicMessages();
  const { locale } = useLocale();
  const theme = useThemeAttribute();
  const instructionsId = useId();
  const [widthRef, width] = useElementWidth();
  const hostRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [vexflow, setVexflow] = useState<VexFlow | null>(null);
  const [hasLoadFailed, setLoadFailed] = useState(false);
  const [hasRenderFailed, setRenderFailed] = useState(false);
  const [layout, setLayout] = useState<RenderedNotation | null>(null);

  useEffect(() => {
    let isCurrent = true;
    loadVexFlow().then(
      (module) => {
        if (isCurrent) {
          setVexflow(module);
        }
      },
      () => {
        if (isCurrent) {
          setLoadFailed(true);
        }
      },
    );
    return () => {
      isCurrent = false;
    };
  }, []);

  const parsed = useMemo((): NotationScore | null => {
    try {
      return typeof score === 'string' ? parseMusicXml(score) : score;
    } catch {
      return null;
    }
  }, [score]);
  const timed = useMemo(() => (parsed ? timeScore(parsed) : []), [parsed]);

  // Draw (and redraw on resize, zoom and theme changes).
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!vexflow || !parsed || !host || (isResponsive && width === undefined)) {
      return;
    }
    try {
      setLayout(
        renderNotation(vexflow, host, parsed, timed, { width: width ?? 0, zoom, isResponsive }),
      );
      setRenderFailed(false);
    } catch {
      host.replaceChildren();
      setLayout(null);
      setRenderFailed(true);
    }
  }, [vexflow, parsed, timed, width, zoom, isResponsive, theme]);

  const status =
    hasLoadFailed || !parsed || hasRenderFailed ? 'error' : layout ? 'ready' : 'loading';

  const current = useMemo(
    () => (playhead ? noteAtPlayhead(timed, playhead) : null),
    [playhead, timed],
  );
  const currentMeasure = playhead ? Math.floor(playhead.measure) : null;
  const currentBox = layout?.measures.find((measure) => measure.number === currentMeasure) ?? null;

  // The note at the playhead takes the accent colour in the drawing.
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host || !layout) {
      return;
    }
    const element = current ? host.querySelector(`#${CSS.escape(`vf-${current.id}`)}`) : null;
    element?.setAttribute('data-current', '');
    return () => {
      element?.removeAttribute('data-current');
    };
  }, [current, layout]);

  // The playhead's measure stays in view.
  useEffect(() => {
    if (!shouldFollowPlayhead || currentMeasure === null || !layout) {
      return;
    }
    overlayRef.current
      ?.querySelector(`[data-measure="${String(currentMeasure)}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [currentMeasure, shouldFollowPlayhead, layout]);

  // Roving focus over the notes: arrow keys move by note and by measure.
  const notes = useMemo(() => layout?.notes ?? [], [layout]);
  const [focusId, setFocusId] = useState<string | null>(null);
  const tabId = notes.some((note) => note.id === focusId) ? focusId : (notes[0]?.id ?? null);
  const focusNote = (id: string | undefined) => {
    if (id === undefined) {
      return;
    }
    setFocusId(id);
    overlayRef.current?.querySelector<HTMLElement>(`[data-note-id="${CSS.escape(id)}"]`)?.focus();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, position: number) => {
    const note = notes[position];
    if (!note) {
      return;
    }
    let target: string | undefined;
    if (event.key === 'ArrowRight') {
      target = notes[position + 1]?.id;
    } else if (event.key === 'ArrowLeft') {
      target = notes[position - 1]?.id;
    } else if (event.key === 'ArrowDown') {
      target = notes.find((other) => other.measure > note.measure)?.id;
    } else if (event.key === 'ArrowUp') {
      const previous = [...notes].reverse().find((other) => other.measure < note.measure);
      target = previous ? notes.find((other) => other.measure === previous.measure)?.id : undefined;
    } else if (event.key === 'Home') {
      target = notes[0]?.id;
    } else if (event.key === 'End') {
      target = notes.at(-1)?.id;
    } else {
      return;
    }
    event.preventDefault();
    focusNote(target);
  };

  const label = ariaLabel ?? parsed?.title ?? messages.notationLabel;

  return (
    <div
      ref={mergeRefs(ref, widthRef)}
      role="group"
      aria-label={label}
      aria-describedby={instructionsId}
      data-notation-status={status}
      className={cn('relative w-full min-w-0 text-fg', className)}
    >
      {status === 'loading' && (
        <p role="status" className="py-8 text-center text-sm text-fg-muted">
          {messages.loading}
        </p>
      )}
      {status === 'error' && (
        <p role="alert" className="py-8 text-center text-sm text-danger-fg">
          {messages.notationError}
        </p>
      )}
      <div
        className={cn('relative min-w-0', !isResponsive && 'overflow-x-auto overscroll-x-contain')}
      >
        <div
          className="relative"
          // Dynamic geometry: the drawing's size comes from the layout.
          // eslint-disable-next-line no-restricted-syntax -- see above.
          style={layout ? { width: layout.width, height: layout.height } : undefined}
        >
          {currentBox && (
            <div
              aria-hidden="true"
              className="absolute rounded-control bg-accent-bg"
              // Dynamic geometry: the playhead's measure.
              // eslint-disable-next-line no-restricted-syntax -- see above.
              style={{
                left: currentBox.x,
                top: currentBox.y,
                width: currentBox.width,
                height: currentBox.height,
              }}
            />
          )}
          <div ref={hostRef} className="relative [&_[data-current]]:text-accent-fg [&_svg]:block" />
          {layout && parsed && (
            <div ref={overlayRef} className="absolute inset-0">
              {layout.measures.map((box) => {
                const measure = parsed.measures[box.number - 1];
                if (!measure) {
                  return null;
                }
                const measureNotes = notes.filter((note) => note.measure === box.number);
                return (
                  <div
                    key={box.number}
                    role="group"
                    aria-label={describeMeasure(measure, box.number, messages, locale)}
                    data-measure={box.number}
                    data-current={box.number === currentMeasure || undefined}
                    className="absolute"
                    // Dynamic geometry: the measure's place in the drawing.
                    // eslint-disable-next-line no-restricted-syntax -- see above.
                    style={{ left: box.x, top: box.y, width: box.width, height: box.height }}
                  >
                    {measureNotes.map((note) => {
                      const source = measure.notes[note.index];
                      if (!source) {
                        return null;
                      }
                      const position = notes.indexOf(note);
                      const isCurrent = current?.id === note.id;
                      return (
                        <button
                          key={note.id}
                          type="button"
                          data-note-id={note.id}
                          tabIndex={note.id === tabId ? 0 : -1}
                          aria-label={describeNotationNote(source, messages)}
                          aria-current={isCurrent || undefined}
                          className={cn(
                            'absolute top-0 h-full cursor-pointer rounded-sm outline-none',
                            'focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-focus focus-visible:outline-solid',
                          )}
                          // Dynamic geometry: the note's place in its measure.
                          // eslint-disable-next-line no-restricted-syntax -- see above.
                          style={{ left: note.x - box.x, width: note.width }}
                          onFocus={() => {
                            setFocusId(note.id);
                          }}
                          onKeyDown={(event) => {
                            onKeyDown(event, position);
                          }}
                          onClick={() => {
                            onNotePress?.(note.id);
                          }}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <span id={instructionsId} hidden>
        {messages.notationInstructions}
      </span>
    </div>
  );
}
