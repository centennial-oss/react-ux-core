// Pitch and rhythm maths shared by the /music components: MIDI numbers to spelled pitches, piano key colours, scales,
// note values in beats and snapping. No DOM, so it's unit-tested on its own.

/** A letter name. Translations map it to their own names (solfège, German H) in the pitch messages. */
export type PitchLetter = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';

/** An accidental as spelled; `undefined` is no accidental. */
export type Accidental = 'sharp' | 'flat' | 'natural' | 'double-sharp' | 'double-flat';

/** A pitch as written: letter, accidental and octave (scientific pitch: C4 is middle C, MIDI 60). */
export interface SpelledPitch {
  letter: PitchLetter;
  accidental?: Accidental;
  octave: number;
}

/** A range of MIDI note numbers, both ends included. */
export interface PitchRange {
  low: number;
  high: number;
}

const LETTERS: readonly PitchLetter[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_SEMITONES: Record<PitchLetter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const BLACK_KEYS = new Set([1, 3, 6, 8, 10]);
/** Sharp spellings of the twelve pitch classes. */
const SHARP_SPELLING: readonly [PitchLetter, Accidental | undefined][] = [
  ['C', undefined],
  ['C', 'sharp'],
  ['D', undefined],
  ['D', 'sharp'],
  ['E', undefined],
  ['F', undefined],
  ['F', 'sharp'],
  ['G', undefined],
  ['G', 'sharp'],
  ['A', undefined],
  ['A', 'sharp'],
  ['B', undefined],
];
const ACCIDENTAL_OFFSETS: Record<Accidental, number> = {
  sharp: 1,
  flat: -1,
  natural: 0,
  'double-sharp': 2,
  'double-flat': -2,
};

/** The pitch class (0 = C … 11 = B) of a MIDI note. */
export function pitchClass(pitch: number): number {
  return ((pitch % 12) + 12) % 12;
}

/** The octave of a MIDI note in scientific pitch notation (MIDI 60 is C4). */
export function pitchOctave(pitch: number): number {
  return Math.floor(pitch / 12) - 1;
}

/** Whether the MIDI note is a black key on a piano. */
export function isBlackKey(pitch: number): boolean {
  return BLACK_KEYS.has(pitchClass(pitch));
}

/** A MIDI note spelled with sharps, as on a keyboard. */
export function spellPitch(pitch: number): SpelledPitch {
  const [letter, accidental] = SHARP_SPELLING[pitchClass(pitch)] ?? ['C', undefined];
  return accidental
    ? { letter, accidental, octave: pitchOctave(pitch) }
    : { letter, octave: pitchOctave(pitch) };
}

/** The MIDI number of a spelled pitch (B♯3 is 60, like C4). */
export function midiFromSpelled({ letter, accidental, octave }: SpelledPitch): number {
  return (
    (octave + 1) * 12 + LETTER_SEMITONES[letter] + (accidental ? ACCIDENTAL_OFFSETS[accidental] : 0)
  );
}

const PITCH_PATTERN = /^([A-Ga-g])(##|bb|#|b|n|x|♯|♭|♮)?(-?\d+)$/;
const ACCIDENTAL_SIGNS: Record<string, Accidental> = {
  '#': 'sharp',
  '♯': 'sharp',
  b: 'flat',
  '♭': 'flat',
  n: 'natural',
  '♮': 'natural',
  '##': 'double-sharp',
  x: 'double-sharp',
  bb: 'double-flat',
};

/** Parses scientific pitch notation such as `C4`, `F#3`, `Bb2` or `En5`; null when it isn't one. */
export function parsePitch(text: string): SpelledPitch | null {
  const match = PITCH_PATTERN.exec(text.trim());
  if (!match) {
    return null;
  }
  const letter = (match[1] ?? 'C').toUpperCase() as PitchLetter;
  const accidental = match[2] ? ACCIDENTAL_SIGNS[match[2]] : undefined;
  const octave = Number(match[3]);
  return accidental ? { letter, accidental, octave } : { letter, octave };
}

/** Scientific pitch notation for a spelled pitch (`C#4`, `Bb3`), the format `parsePitch` reads. */
export function formatPitch({ letter, accidental, octave }: SpelledPitch): string {
  const signs: Record<Accidental, string> = {
    sharp: '#',
    flat: 'b',
    natural: 'n',
    'double-sharp': '##',
    'double-flat': 'bb',
  };
  return `${letter}${accidental ? signs[accidental] : ''}${String(octave)}`;
}

/** The letters in order, for code that steps through staff positions. */
export function pitchLetters(): readonly PitchLetter[] {
  return LETTERS;
}

/** A scale for highlighting rows and keys. `chromatic` includes every pitch. */
export interface MusicScale {
  /** The tonic's pitch class (0 = C … 11 = B), or any MIDI note of it. */
  root: number;
  mode: 'major' | 'minor' | 'chromatic';
}

const SCALE_STEPS: Record<MusicScale['mode'], readonly number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

/** Whether a MIDI note is in the scale. */
export function isInScale(pitch: number, scale: MusicScale): boolean {
  return SCALE_STEPS[scale.mode].includes(pitchClass(pitch - scale.root));
}

/** Every MIDI note in a range, low to high. */
export function pitchesInRange({ low, high }: PitchRange): number[] {
  const pitches: number[] = [];
  for (let pitch = Math.max(0, low); pitch <= Math.min(127, high); pitch++) {
    pitches.push(pitch);
  }
  return pitches;
}

/** A time signature: `beats` per bar, each a `unit` note (4 is a quarter note). */
export interface TimeSignature {
  beats: number;
  unit: number;
}

/** A grid for snapping: straight note values, triplets, or no snapping. */
export type SnapValue = '1/4' | '1/8' | '1/16' | '1/32' | '1/8t' | '1/16t' | 'off';

/** A note value's length in whole notes (`1/8t` is an eighth-note triplet, a third of a quarter). */
const SNAP_WHOLE_NOTES: Record<Exclude<SnapValue, 'off'>, number> = {
  '1/4': 1 / 4,
  '1/8': 1 / 8,
  '1/16': 1 / 16,
  '1/32': 1 / 32,
  '1/8t': 1 / 12,
  '1/16t': 1 / 24,
};

/** The snap step in beats for a time signature, or 0 when snapping is off. */
export function snapBeats(snap: SnapValue, timeSignature: TimeSignature): number {
  return snap === 'off' ? 0 : SNAP_WHOLE_NOTES[snap] * timeSignature.unit;
}

/** `value` rounded to the nearest multiple of `step` (unchanged when `step` is 0), without float noise. */
export function snapTo(value: number, step: number): number {
  if (!(step > 0)) {
    return value;
  }
  return Number((Math.round(value / step + 1e-9) * step).toFixed(6));
}

/** The bar (1-based) and beat (1-based, fractional) of a position in beats. */
export function barAndBeat(
  beat: number,
  timeSignature: TimeSignature,
): { bar: number; beat: number } {
  const perBar = timeSignature.beats;
  const bar = Math.floor(beat / perBar + 1e-9);
  return { bar: bar + 1, beat: Number((beat - bar * perBar + 1).toFixed(4)) };
}

/** A named note value: the base value, dots and whether it's a triplet. */
export interface NoteValueName {
  value: 'whole' | 'half' | 'quarter' | 'eighth' | '16th' | '32nd';
  dots: number;
  isTriplet: boolean;
}

const BASE_VALUES: readonly [NoteValueName['value'], number][] = [
  ['whole', 1],
  ['half', 1 / 2],
  ['quarter', 1 / 4],
  ['eighth', 1 / 8],
  ['16th', 1 / 16],
  ['32nd', 1 / 32],
];

/** Names a length in beats as a note value (a dotted quarter, an eighth triplet), or null when it isn't one. */
export function nameNoteValue(beats: number, timeSignature: TimeSignature): NoteValueName | null {
  const whole = beats / timeSignature.unit;
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
  for (const [value, length] of BASE_VALUES) {
    if (near(whole, length)) {
      return { value, dots: 0, isTriplet: false };
    }
    if (near(whole, length * 1.5)) {
      return { value, dots: 1, isTriplet: false };
    }
    if (near(whole, length * 1.75)) {
      return { value, dots: 2, isTriplet: false };
    }
    if (near(whole, (length * 2) / 3)) {
      return { value, dots: 0, isTriplet: true };
    }
  }
  return null;
}
