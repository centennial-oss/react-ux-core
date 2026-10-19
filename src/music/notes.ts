// Note editing for the piano roll: moving, resizing, duplicating and quantizing notes. Pure functions over arrays of
// notes, so they're unit-tested on their own and apps can use them too.

import { snapTo, type PitchRange } from './pitch';

/** A note: MIDI pitch, start and duration in beats, and velocity. */
export interface MusicNote {
  id: string;
  /** MIDI note number, 0–127 (60 is middle C). */
  pitch: number;
  /** Beats from the start. */
  start: number;
  /** Beats. */
  duration: number;
  /** 1–127. */
  velocity: number;
}

/** The shortest a note can be, in beats, when snapping is off. */
export const MIN_NOTE_BEATS = 1 / 32;

/** Notes sorted by start, then pitch (the order the notes table lists them in). */
export function sortNotes<T extends MusicNote>(notes: readonly T[]): T[] {
  return [...notes].sort((a, b) => a.start - b.start || a.pitch - b.pitch);
}

/** The beat where the last note ends (0 when there are none). */
export function notesEnd(notes: readonly MusicNote[]): number {
  return notes.reduce((end, note) => Math.max(end, note.start + note.duration), 0);
}

function clampPitch(pitch: number, range: PitchRange): number {
  return Math.max(range.low, Math.min(range.high, Math.round(pitch)));
}

/**
 * Moves the notes in `ids` by `beats` and `semitones`, keeping them in the pitch range and after beat 0. The move is
 * limited as a group, so a chord moved up past the top keeps its shape.
 */
export function moveNotes(
  notes: readonly MusicNote[],
  ids: readonly string[],
  beats: number,
  semitones: number,
  range: PitchRange,
): MusicNote[] {
  const moving = notes.filter((note) => ids.includes(note.id));
  if (moving.length === 0) {
    return [...notes];
  }
  const lowest = Math.min(...moving.map((note) => note.pitch));
  const highest = Math.max(...moving.map((note) => note.pitch));
  const earliest = Math.min(...moving.map((note) => note.start));
  const shift = Math.max(range.low - lowest, Math.min(range.high - highest, semitones));
  const delta = Math.max(-earliest, beats);
  return notes.map((note) =>
    ids.includes(note.id)
      ? {
          ...note,
          pitch: clampPitch(note.pitch + shift, range),
          start: Number((note.start + delta).toFixed(6)),
        }
      : note,
  );
}

/** Changes the duration of the notes in `ids` by `beats`, never below `minimum`. */
export function resizeNotes(
  notes: readonly MusicNote[],
  ids: readonly string[],
  beats: number,
  minimum: number,
): MusicNote[] {
  return notes.map((note) =>
    ids.includes(note.id)
      ? { ...note, duration: Number(Math.max(minimum, note.duration + beats).toFixed(6)) }
      : note,
  );
}

/**
 * Copies the notes in `ids`, placed right after them (shifted by the selection's length, rounded up to `step`).
 * Returns every note and the copies' ids.
 */
export function duplicateNotes(
  notes: readonly MusicNote[],
  ids: readonly string[],
  makeId: () => string,
  step = 0,
): { notes: MusicNote[]; ids: string[] } {
  const copies = notes.filter((note) => ids.includes(note.id));
  if (copies.length === 0) {
    return { notes: [...notes], ids: [] };
  }
  const start = Math.min(...copies.map((note) => note.start));
  const end = Math.max(...copies.map((note) => note.start + note.duration));
  let offset = end - start;
  if (step > 0) {
    offset = Math.max(step, Math.ceil(offset / step - 1e-9) * step);
  }
  const added = copies.map((note) => ({
    ...note,
    id: makeId(),
    start: Number((note.start + offset).toFixed(6)),
  }));
  return { notes: [...notes, ...added], ids: added.map((note) => note.id) };
}

/**
 * Snaps the starts and durations of the notes in `ids` (every note when `ids` is omitted) to `step` beats. A note
 * never becomes shorter than one step.
 */
export function quantizeNotes(
  notes: readonly MusicNote[],
  step: number,
  ids?: readonly string[],
): MusicNote[] {
  if (!(step > 0)) {
    return [...notes];
  }
  return notes.map((note) =>
    !ids || ids.includes(note.id)
      ? {
          ...note,
          start: Math.max(0, snapTo(note.start, step)),
          duration: Math.max(step, snapTo(note.duration, step)),
        }
      : note,
  );
}

/** The notes sounding at a beat (start included, end excluded). */
export function notesAt(notes: readonly MusicNote[], beat: number): MusicNote[] {
  return notes.filter((note) => beat >= note.start && beat < note.start + note.duration);
}
