// Draws a NotationScore with VexFlow into an element as SVG: systems of staves wrapped to a width (or four measures a
// line), clef, key and time signatures, notes, chords, rests, dots, beams, ties (split across line breaks) and chord
// symbols. Everything is drawn in `currentColor`, so the score takes the theme's text colour from CSS and follows
// theme changes without redrawing. Returns where each measure and note landed, for the interactive layer on top.
// VexFlow is passed in (it's loaded with a dynamic import), so this module has no runtime dependency on it.

import type * as VexFlowModule from 'vexflow/bravura';
import { isRest, type NotationDuration, type NotationScore, type TimedNote } from './notation';
import { parsePitch } from './pitch';

type VexFlow = typeof VexFlowModule;
type StaveNote = InstanceType<VexFlow['StaveNote']>;

export interface NotationBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RenderedNotation {
  /** The drawing's size in CSS pixels. */
  width: number;
  height: number;
  measures: (NotationBox & { number: number })[];
  notes: (NotationBox & { id: string; measure: number; index: number })[];
}

export interface RenderOptions {
  /** The width to wrap systems to, in CSS pixels. */
  width: number;
  zoom: number;
  isResponsive: boolean;
}

/** Room above each stave (for chord symbols), the height of a system, and the side margin, in unscaled units. */
const SYSTEM_HEIGHT = 120;
const MARGIN = 6;
/** Space added to each measure's minimum note width so notes aren't cramped. */
const MEASURE_PADDING = 28;
/** Measures per system when the score doesn't wrap to its container. */
const FIXED_MEASURES_PER_SYSTEM = 4;
/** The narrowest a note's touch target is, in CSS pixels. */
const MIN_TARGET = 24;

const DURATIONS: Record<NotationDuration, string> = {
  whole: 'w',
  half: 'h',
  quarter: 'q',
  eighth: '8',
  '16th': '16',
  '32nd': '32',
};

const REST_KEYS: Record<NonNullable<NotationScore['clef']>, string> = {
  treble: 'b/4',
  bass: 'd/3',
  alto: 'c/4',
  tenor: 'a/3',
};

const ACCIDENTAL_SIGNS: Record<string, string> = {
  sharp: '#',
  flat: 'b',
  natural: 'n',
  'double-sharp': '##',
  'double-flat': 'bb',
};

/** A pitch in VexFlow's key format (`F#4` → `f#/4`). */
function vexKey(pitch: string): string {
  const spelled = parsePitch(pitch);
  if (!spelled) {
    return 'b/4';
  }
  const accidental = spelled.accidental ? (ACCIDENTAL_SIGNS[spelled.accidental] ?? '') : '';
  return `${spelled.letter.toLowerCase()}${accidental}/${String(spelled.octave)}`;
}

/** Maps any black drawn by VexFlow's defaults to `currentColor`. */
function themeColours(host: HTMLElement): void {
  const blacks = new Set(['black', '#000', '#000000', 'rgb(0, 0, 0)']);
  for (const element of host.querySelectorAll('[fill], [stroke]')) {
    for (const name of ['fill', 'stroke']) {
      const value = element.getAttribute(name);
      if (value && blacks.has(value.toLowerCase())) {
        element.setAttribute(name, 'currentColor');
      }
    }
  }
}

/** Renders `score` into `host` (replacing what was there) and returns the layout. */
export function renderNotation(
  VF: VexFlow,
  host: HTMLElement,
  score: NotationScore,
  timed: readonly (readonly TimedNote[])[],
  { width, zoom, isResponsive }: RenderOptions,
): RenderedNotation {
  host.replaceChildren();
  const clef = score.clef ?? 'treble';
  const key = score.key ?? 'C';
  const beats = score.timeSignature?.beats ?? 4;
  const unit = score.timeSignature?.unit ?? 4;
  const timeSpec = `${String(beats)}/${String(unit)}`;
  const beamGroups = VF.Beam.getDefaultBeamGroups(timeSpec);

  // Build every measure's notes first: their minimum widths decide the line breaks.
  const built = score.measures.map((measure, measureIndex) => {
    const notes: StaveNote[] = measure.notes.map((note, index) => {
      const rest = isRest(note);
      const dots = note.dots ?? 0;
      const staveNote = new VF.StaveNote({
        keys: rest ? [REST_KEYS[clef]] : (note.pitches ?? []).map(vexKey),
        duration: `${DURATIONS[note.duration]}${'d'.repeat(dots)}${rest ? 'r' : ''}`,
        clef,
        autoStem: true,
      });
      for (let dot = 0; dot < dots; dot++) {
        VF.Dot.buildAndAttach([staveNote], { all: true });
      }
      if (note.chord) {
        staveNote.addModifier(new VF.ChordSymbol().addGlyphOrText(note.chord), 0);
      }
      staveNote.setAttribute(
        'id',
        timed[measureIndex]?.[index]?.id ?? `m${String(measureIndex + 1)}-n${String(index)}`,
      );
      return staveNote;
    });
    if (notes.length === 0) {
      return { notes, voice: null, beams: [], minWidth: 40 };
    }
    const voice = new VF.Voice({ numBeats: beats, beatValue: unit }).setMode(VF.Voice.Mode.SOFT);
    voice.addTickables(notes);
    VF.Accidental.applyAccidentals([voice], key);
    const beams = VF.Beam.generateBeams(notes, { groups: beamGroups });
    const minWidth = new VF.Formatter().joinVoices([voice]).preCalculateMinTotalWidth([voice]);
    return { notes, voice, beams, minWidth };
  });

  // How much room the clef and key signature (and, on the first line, the time signature) take.
  const plainStart = new VF.Stave(0, 0, 500).getNoteStartX();
  const lineStart =
    new VF.Stave(0, 0, 500).addClef(clef).addKeySignature(key).getNoteStartX() - plainStart;
  const firstStart =
    new VF.Stave(0, 0, 500)
      .addClef(clef)
      .addKeySignature(key)
      .addTimeSignature(timeSpec)
      .getNoteStartX() - plainStart;
  const natural = built.map((measure) => measure.minWidth + MEASURE_PADDING + plainStart);
  const lead = (index: number, isFirstInLine: boolean) =>
    isFirstInLine ? (index === 0 ? firstStart : lineStart) : 0;

  // Break into systems.
  const systems: number[][] = [];
  if (isResponsive) {
    const available = Math.max(120, width / zoom - MARGIN * 2);
    let line: number[] = [];
    let used = 0;
    natural.forEach((measureWidth, index) => {
      const asNext = measureWidth;
      if (line.length > 0 && used + asNext > available) {
        systems.push(line);
        line = [];
        used = 0;
      }
      used += measureWidth + lead(index, line.length === 0);
      line.push(index);
    });
    if (line.length > 0) {
      systems.push(line);
    }
  } else {
    for (let index = 0; index < natural.length; index += FIXED_MEASURES_PER_SYSTEM) {
      systems.push(
        natural.slice(index, index + FIXED_MEASURES_PER_SYSTEM).map((_, offset) => index + offset),
      );
    }
  }
  const lineWidth = (line: readonly number[]) =>
    line.reduce(
      (sum, index, position) => sum + (natural[index] ?? 0) + lead(index, position === 0),
      0,
    );
  const contentWidth = isResponsive
    ? Math.max(120, width / zoom - MARGIN * 2)
    : Math.max(...systems.map(lineWidth), 120);
  const drawingWidth = contentWidth + MARGIN * 2;
  const drawingHeight = systems.length * SYSTEM_HEIGHT + 16;

  const renderer = new VF.Renderer(host as HTMLDivElement, VF.Renderer.Backends.SVG);
  renderer.resize(Math.ceil(drawingWidth * zoom), Math.ceil(drawingHeight * zoom));
  const context = renderer.getContext();
  context.scale(zoom, zoom);
  context.setFillStyle('currentColor');
  context.setStrokeStyle('currentColor');

  const layout: RenderedNotation = {
    width: Math.ceil(drawingWidth * zoom),
    height: Math.ceil(drawingHeight * zoom),
    measures: [],
    notes: [],
  };
  const systemOf: number[] = [];
  systems.forEach((line, systemIndex) => {
    const leads = line.reduce((sum, index, position) => sum + lead(index, position === 0), 0);
    const notesWidth = line.reduce((sum, index) => sum + (natural[index] ?? 0), 0);
    // Stretch lines to the full width, except a short last line, which keeps its natural spacing.
    const isShortLast =
      systemIndex === systems.length - 1 && leads + notesWidth < contentWidth * 0.6;
    const stretch = isShortLast ? 1 : (contentWidth - leads) / Math.max(1, notesWidth);
    let x = MARGIN;
    const y = systemIndex * SYSTEM_HEIGHT;
    line.forEach((index, position) => {
      const measureWidth = (natural[index] ?? 0) * stretch + lead(index, position === 0);
      const stave = new VF.Stave(x, y, measureWidth);
      if (position === 0) {
        stave.addClef(clef).addKeySignature(key);
        if (index === 0) {
          stave.addTimeSignature(timeSpec);
        }
      }
      if (index === built.length - 1) {
        stave.setEndBarType(VF.BarlineType.END);
      }
      stave.setContext(context).draw();
      const measure = built[index];
      if (measure?.voice) {
        new VF.Formatter().joinVoices([measure.voice]).formatToStave([measure.voice], stave);
        measure.voice.draw(context, stave);
        for (const beam of measure.beams) {
          beam.setContext(context).draw();
        }
      }
      const top = stave.getYForLine(0) - 30;
      const bottom = stave.getYForLine(4) + 30;
      const box = {
        x: x * zoom,
        y: top * zoom,
        width: measureWidth * zoom,
        height: (bottom - top) * zoom,
      };
      layout.measures.push({ number: index + 1, ...box });
      measure?.notes.forEach((note, noteIndex) => {
        systemOf.push(systemIndex);
        const bounds = note.getBoundingBox();
        const noteX = bounds.getX() * zoom;
        const noteWidth = bounds.getW() * zoom;
        const targetWidth = Math.max(MIN_TARGET, noteWidth + 8);
        layout.notes.push({
          id: timed[index]?.[noteIndex]?.id ?? `m${String(index + 1)}-n${String(noteIndex)}`,
          measure: index + 1,
          index: noteIndex,
          x: noteX + noteWidth / 2 - targetWidth / 2,
          y: box.y,
          width: targetWidth,
          height: box.height,
        });
      });
      x += measureWidth;
    });
  });

  // Ties, after every note has its position; a tie across a line break is drawn as two halves.
  const flat = built.flatMap((measure, index) =>
    measure.notes.map((note, noteIndex) => ({
      staveNote: note,
      note: score.measures[index]?.notes[noteIndex],
    })),
  );
  flat.forEach((entry, position) => {
    const next = flat[position + 1];
    if (!entry.note?.isTied || !next || isRest(entry.note) || !next.note || isRest(next.note)) {
      return;
    }
    const indexes = (entry.note.pitches ?? []).map((_, keyIndex) => keyIndex);
    const nextIndexes = (next.note.pitches ?? [])
      .map((_, keyIndex) => keyIndex)
      .slice(0, indexes.length);
    const firstIndexes = indexes.slice(0, nextIndexes.length);
    if (systemOf[position] === systemOf[position + 1]) {
      new VF.StaveTie({
        firstNote: entry.staveNote,
        lastNote: next.staveNote,
        firstIndexes,
        lastIndexes: nextIndexes,
      })
        .setContext(context)
        .draw();
    } else {
      new VF.StaveTie({ firstNote: entry.staveNote, firstIndexes, lastIndexes: firstIndexes })
        .setContext(context)
        .draw();
      new VF.StaveTie({
        lastNote: next.staveNote,
        firstIndexes: nextIndexes,
        lastIndexes: nextIndexes,
      })
        .setContext(context)
        .draw();
    }
  });

  themeColours(host);
  const svg = host.querySelector('svg');
  svg?.setAttribute('aria-hidden', 'true');
  svg?.setAttribute('focusable', 'false');
  return layout;
}
