// The score model MusicNotation renders, and the maths and text alternatives built on it. No DOM and no VexFlow, so
// it's unit-tested on its own.

import type { MusicStrings } from './messages';
import { parsePitch, type NoteValueName, type TimeSignature } from './pitch';

/** A written note value. */
export type NotationDuration = NoteValueName['value'];

/**
 * A note, chord or rest. Pitches use scientific pitch notation (`E4`, `F#4`, `Bb3`; C4 is middle C). Accidentals are
 * written as the pitch is spelled, and the renderer shows only the ones the key signature and bar don't already imply.
 */
export interface NotationNote {
  /** Identifies the note for `onNotePress` and highlighting. Defaults to `m<measure>-n<index>` (1-based measure). */
  id?: string;
  /** The pitches; several make a chord. Empty or omitted is a rest. */
  pitches?: readonly string[];
  duration: NotationDuration;
  /** Augmentation dots. Defaults to 0. */
  dots?: 0 | 1 | 2;
  /** Tied to the next note, which should have the same pitches. */
  isTied?: boolean;
  /** A chord symbol shown above the note, such as `C`, `Am7` or `G7`. */
  chord?: string;
}

export interface NotationMeasure {
  notes: readonly NotationNote[];
}

/**
 * A single-staff score: clef, key and time signature, and measures of notes. Simple enough to write by hand or
 * generate (a lead sheet is a melody with chord symbols); MusicXML can be passed instead.
 */
export interface NotationScore {
  title?: string;
  /** Defaults to `treble`. */
  clef?: 'treble' | 'bass' | 'alto' | 'tenor';
  /** A major key (`C`, `G`, `Bb`, `F#`) or minor key (`Am`, `F#m`). Defaults to `C`. */
  key?: string;
  /** Defaults to 4/4. */
  timeSignature?: TimeSignature;
  measures: readonly NotationMeasure[];
}

/** A note with where it falls in its measure. */
export interface TimedNote {
  note: NotationNote;
  id: string;
  /** 1-based measure number. */
  measure: number;
  /** Index in the measure. */
  index: number;
  /** Beats from the start of the measure (0-based). */
  start: number;
  /** Length in beats. */
  beats: number;
}

const WHOLE_FRACTIONS: Record<NotationDuration, number> = {
  whole: 1,
  half: 1 / 2,
  quarter: 1 / 4,
  eighth: 1 / 8,
  '16th': 1 / 16,
  '32nd': 1 / 32,
};

export const DEFAULT_TIME_SIGNATURE: TimeSignature = { beats: 4, unit: 4 };

/** A note's length in beats of the time signature. */
export function noteBeats(
  note: Pick<NotationNote, 'duration' | 'dots'>,
  timeSignature: TimeSignature,
): number {
  const dots = note.dots ?? 0;
  const factor = dots === 2 ? 1.75 : dots === 1 ? 1.5 : 1;
  return WHOLE_FRACTIONS[note.duration] * factor * timeSignature.unit;
}

/** Whether a note is a rest. */
export function isRest(note: NotationNote): boolean {
  return !note.pitches || note.pitches.length === 0;
}

/** Every note of a score with its id, measure and position in beats. */
export function timeScore(score: NotationScore): TimedNote[][] {
  const timeSignature = score.timeSignature ?? DEFAULT_TIME_SIGNATURE;
  return score.measures.map((measure, measureIndex) => {
    let start = 0;
    return measure.notes.map((note, index) => {
      const beats = noteBeats(note, timeSignature);
      const timed: TimedNote = {
        note,
        id: note.id ?? `m${String(measureIndex + 1)}-n${String(index)}`,
        measure: measureIndex + 1,
        index,
        start,
        beats,
      };
      start += beats;
      return timed;
    });
  });
}

/**
 * The note at a playhead position: `measure` 1-based, `beat` 1-based within the measure (1 is the downbeat; 2.5 is
 * halfway through the second beat). Null outside the score; a beat past the last note gives the last note.
 */
export function noteAtPlayhead(
  timed: readonly (readonly TimedNote[])[],
  playhead: { measure: number; beat: number },
): TimedNote | null {
  const notes = timed[Math.floor(playhead.measure) - 1];
  if (!notes || notes.length === 0) {
    return null;
  }
  const offset = playhead.beat - 1;
  return (
    notes.find((note) => offset >= note.start - 1e-9 && offset < note.start + note.beats - 1e-9) ??
    notes.at(-1) ??
    null
  );
}

/** A note's (or chord's, or rest's) text alternative, such as "E4 quarter" or "chord C, C4 E4 G4 half, tied". */
export function describeNotationNote(note: NotationNote, messages: MusicStrings): string {
  const value = messages.musicNoteValue({
    value: note.duration,
    dots: note.dots ?? 0,
    isTriplet: false,
  });
  let text: string;
  if (isRest(note)) {
    text = messages.notationRest({ value });
  } else {
    const pitches = (note.pitches ?? [])
      .map((pitch) => {
        const spelled = parsePitch(pitch);
        return spelled ? messages.musicPitchName(spelled) : pitch;
      })
      .join(' ');
    text = messages.notationNote({ pitches, value });
  }
  if (note.isTied) {
    text = messages.notationTied({ note: text });
  }
  if (note.chord) {
    text = messages.notationWithChord({ chord: note.chord, note: text });
  }
  return text;
}

/** A measure's text alternative, such as "Measure 3: E4 quarter, G4 quarter, C5 half". */
export function describeMeasure(
  measure: NotationMeasure,
  number: number,
  messages: MusicStrings,
  locale = 'en',
): string {
  if (measure.notes.length === 0) {
    return messages.notationEmptyMeasure({ number });
  }
  const list = new Intl.ListFormat(locale, { type: 'unit', style: 'short' });
  return messages.notationMeasure({
    number,
    notes: list.format(measure.notes.map((note) => describeNotationNote(note, messages))),
  });
}
