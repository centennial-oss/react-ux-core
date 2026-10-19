// The music entry point's strings and their English defaults. Apps override them through `UIProvider`'s `messages`.
import type { CommonMessages } from '../provider/coreStrings';
import { useEntryMessages } from '../provider/context';

import type { NoteValueName, SpelledPitch } from './pitch';

export interface MusicMessages {
  /** A pitch's accessible name, such as "C sharp 4" or "E4". Map `letter` here for solfège or German names. */
  musicPitchName: (params: SpelledPitch) => string;
  /** A pitch's short visible label, such as "C♯4". */
  musicPitchLabel: (params: SpelledPitch) => string;
  /** A note value, such as "quarter", "dotted half" or "eighth triplet". */
  musicNoteValue: (params: NoteValueName) => string;
  /** A note's length as a note value, such as "quarter note" or "dotted eighth note". */
  musicNoteLength: (params: NoteValueName) => string;
  /** A length that isn't a plain note value, in beats. */
  musicBeats: (params: { count: string }) => string;
  /** The "off" choice of a snap menu. */
  musicSnapOff: string;
  /** A triplet snap value in a snap menu, such as "1/8 triplet". */
  musicSnapTriplet: (params: { value: string }) => string;

  /** The piano keyboard's accessible name when the app doesn't give one. */
  pianoKeyboardLabel: string;
  /** How to play the keyboard from the keyboard, read as its description. */
  pianoKeyboardInstructions: string;
  /** A highlighted key's name: its pitch and the highlight's text. */
  pianoKeyHighlighted: (params: { pitch: string; label: string }) => string;
  /** The highlight text when a highlight has no label of its own. */
  pianoHighlight: string;
  /** Scrolls a keyboard that's wider than its container. */
  pianoShowLowerKeys: string;
  pianoShowHigherKeys: string;
  /** The toggle that turns computer-keyboard playing on and off. */
  pianoQwertyToggle: string;
  /** Announced when computer-keyboard playing turns on, or its octave changes. */
  pianoQwertyOn: (params: { low: string; high: string }) => string;
  /** Announced when computer-keyboard playing turns off. */
  pianoQwertyOff: string;
  /** The button that asks for MIDI access. */
  midiConnect: string;
  /** Names the MIDI status and device list. */
  midiDevices: string;
  midiUnsupported: string;
  midiDenied: string;
  midiConnecting: string;
  midiNoDevices: string;
  /** A MIDI input device and whether it's connected. */
  midiDevice: (params: { name: string; isConnected: boolean }) => string;

  /** The piano roll's accessible name when the app doesn't give one. */
  pianoRollLabel: string;
  /** Names the piano roll's toolbar. */
  pianoRollToolbar: string;
  /** Names the vertical keyboard beside the grid. */
  pianoRollKeys: string;
  /** Names the note grid (a canvas). */
  pianoRollGrid: string;
  /** The draw tool: a press or drag on empty grid adds a note. */
  pianoRollDraw: string;
  /** The select tool: a drag on empty grid draws a selection marquee. */
  pianoRollSelect: string;
  pianoRollSnap: string;
  pianoRollQuantize: string;
  pianoRollDuplicate: string;
  /** The toggle that shows the notes as an editable table. */
  pianoRollTableView: string;
  /** A note's name: pitch, position and length, such as "E4, bar 1, beat 3, quarter note, velocity 100". */
  pianoRollNote: (params: {
    pitch: string;
    bar: number;
    beat: string;
    length: string;
    velocity: number;
  }) => string;
  /** A note's position for announcements, such as "E4, bar 1, beat 3, quarter note". */
  pianoRollNotePosition: (params: {
    pitch: string;
    bar: number;
    beat: string;
    length: string;
  }) => string;
  /** How to work a note from the keyboard. */
  pianoRollNoteInstructions: string;
  /** The grid cursor's name: the empty cell it's on. */
  pianoRollCursor: (params: { pitch: string; bar: number; beat: string }) => string;
  /** How to work the grid cursor. */
  pianoRollCursorInstructions: string;
  /** Announced after notes are added, deleted, duplicated or quantized. */
  pianoRollAdded: (params: { note: string }) => string;
  pianoRollDeleted: (params: { count: number }) => string;
  pianoRollDuplicated: (params: { count: number }) => string;
  pianoRollQuantized: (params: { count: number }) => string;
  /** Names the velocity lane under the grid. */
  pianoRollVelocityLane: string;
  /** The notes table's caption and column headers. */
  pianoRollNotes: string;
  pianoRollPitch: string;
  pianoRollStart: string;
  pianoRollLength: string;
  pianoRollVelocity: string;
  pianoRollAddNote: string;
  pianoRollNoNotes: string;
  /** Names a field in the notes table, such as "Velocity, note 3". */
  pianoRollField: (params: { column: string; row: number }) => string;
  /** The remove button in the notes table. */
  pianoRollRemoveNote: (params: { row: number }) => string;

  /** The step sequencer's accessible name when the app doesn't give one. */
  stepSequencerLabel: string;
  /** How to work the step grid from the keyboard. */
  stepSequencerInstructions: string;
  /** A step cell's name, such as "Kick, step 5". */
  stepSequencerCell: (params: { row: string; step: number }) => string;
  /** An active cell's velocity, read as its description. */
  stepSequencerVelocity: (params: { velocity: number }) => string;
  /** The row header button that auditions the row's sound. */
  stepSequencerAudition: (params: { row: string }) => string;
  /** The corner header over the row names. */
  stepSequencerSounds: string;

  /** Names the transport toolbar. */
  transportLabel: string;
  transportPlay: string;
  transportPause: string;
  transportStop: string;
  transportLoop: string;
  /** The tempo field's label. */
  transportBpm: string;
  /** The position readout's accessible text. */
  transportPosition: (params: { bar: number; beat: number }) => string;

  /** The score's accessible name when the app doesn't give one. */
  notationLabel: string;
  /** How to move through the score from the keyboard. */
  notationInstructions: string;
  /** Shown when the score can't be parsed or rendered. */
  notationError: string;
  /** A measure's text alternative, such as "Measure 3: E4 quarter, G4 quarter, C5 half". */
  notationMeasure: (params: { number: number; notes: string }) => string;
  /** A measure with nothing in it. */
  notationEmptyMeasure: (params: { number: number }) => string;
  /** A note or chord, such as "E4 quarter" or "C4 E4 G4 half". */
  notationNote: (params: { pitches: string; value: string }) => string;
  notationRest: (params: { value: string }) => string;
  /** A note tied to the next one. */
  notationTied: (params: { note: string }) => string;
  /** A note with a chord symbol above it. */
  notationWithChord: (params: { chord: string; note: string }) => string;
}

const ACCIDENTAL_WORDS = {
  sharp: 'sharp',
  flat: 'flat',
  natural: 'natural',
  'double-sharp': 'double sharp',
  'double-flat': 'double flat',
} as const;

const ACCIDENTAL_SIGNS = {
  sharp: '♯',
  flat: '♭',
  natural: '♮',
  'double-sharp': '𝄪',
  'double-flat': '𝄫',
} as const;

const NOTE_VALUES = {
  whole: 'whole',
  half: 'half',
  quarter: 'quarter',
  eighth: 'eighth',
  '16th': 'sixteenth',
  '32nd': 'thirty-second',
} as const;

const plural = (count: number, one: string, many: string) =>
  count === 1 ? one : `${String(count)} ${many}`;

export const defaultMusicMessages: MusicMessages = {
  musicPitchName: ({ letter, accidental, octave }) =>
    accidental
      ? `${letter} ${ACCIDENTAL_WORDS[accidental]} ${String(octave)}`
      : `${letter}${String(octave)}`,
  musicPitchLabel: ({ letter, accidental, octave }) =>
    `${letter}${accidental ? ACCIDENTAL_SIGNS[accidental] : ''}${String(octave)}`,
  musicNoteValue: ({ value, dots, isTriplet }) =>
    `${dots === 2 ? 'double-dotted ' : dots === 1 ? 'dotted ' : ''}${NOTE_VALUES[value]}${isTriplet ? ' triplet' : ''}`,
  musicNoteLength: ({ value, dots, isTriplet }) =>
    `${dots === 2 ? 'double-dotted ' : dots === 1 ? 'dotted ' : ''}${NOTE_VALUES[value]}${isTriplet ? ' triplet' : ''} note`,
  musicBeats: ({ count }) => (count === '1' ? '1 beat' : `${count} beats`),
  musicSnapOff: 'Off',
  musicSnapTriplet: ({ value }) => `${value} triplet`,

  pianoKeyboardLabel: 'Piano keyboard',
  pianoKeyboardInstructions:
    'Left and right arrow keys move between keys. Space or Enter plays the key while held.',
  pianoKeyHighlighted: ({ pitch, label }) => `${pitch}, ${label}`,
  pianoHighlight: 'highlighted',
  pianoShowLowerKeys: 'Show lower keys',
  pianoShowHigherKeys: 'Show higher keys',
  pianoQwertyToggle: 'Play with the computer keyboard',
  pianoQwertyOn: ({ low, high }) =>
    `Computer keyboard playing is on: keys A to K play ${low} to ${high}. Z and X change the octave.`,
  pianoQwertyOff: 'Computer keyboard playing is off.',
  midiConnect: 'Connect MIDI device',
  midiDevices: 'MIDI devices',
  midiUnsupported: 'MIDI isn’t available in this browser.',
  midiDenied: 'MIDI access was blocked. Allow it in the browser’s site settings.',
  midiConnecting: 'Connecting to MIDI…',
  midiNoDevices: 'No MIDI devices found. Connect one to play.',
  midiDevice: ({ name, isConnected }) => `${name}: ${isConnected ? 'connected' : 'disconnected'}`,

  pianoRollLabel: 'Piano roll',
  pianoRollToolbar: 'Piano roll tools',
  pianoRollKeys: 'Keys',
  pianoRollGrid: 'Note grid',
  pianoRollDraw: 'Draw notes',
  pianoRollSelect: 'Select notes',
  pianoRollSnap: 'Snap',
  pianoRollQuantize: 'Quantize',
  pianoRollDuplicate: 'Duplicate',
  pianoRollTableView: 'Show notes as a table',
  pianoRollNote: ({ pitch, bar, beat, length, velocity }) =>
    `${pitch}, bar ${String(bar)}, beat ${beat}, ${length}, velocity ${String(velocity)}`,
  pianoRollNotePosition: ({ pitch, bar, beat, length }) =>
    `${pitch}, bar ${String(bar)}, beat ${beat}, ${length}`,
  pianoRollNoteInstructions:
    'Arrow keys move it by the snap. Shift with up or down moves it an octave; Shift with left or right changes its length. Delete removes it; Control or Command with D duplicates it.',
  pianoRollCursor: ({ pitch, bar, beat }) => `Add note: ${pitch}, bar ${String(bar)}, beat ${beat}`,
  pianoRollCursorInstructions:
    'Arrow keys move the cursor by the snap; Shift with up or down moves it an octave. Enter adds a note.',
  pianoRollAdded: ({ note }) => `Added ${note}`,
  pianoRollDeleted: ({ count }) => `Deleted ${plural(count, 'a note', 'notes')}`,
  pianoRollDuplicated: ({ count }) => `Duplicated ${plural(count, 'a note', 'notes')}`,
  pianoRollQuantized: ({ count }) => `Quantized ${plural(count, 'a note', 'notes')}`,
  pianoRollVelocityLane: 'Velocity',
  pianoRollNotes: 'Notes',
  pianoRollPitch: 'Pitch',
  pianoRollStart: 'Start (beats)',
  pianoRollLength: 'Length (beats)',
  pianoRollVelocity: 'Velocity',
  pianoRollAddNote: 'Add note',
  pianoRollNoNotes: 'No notes yet.',
  pianoRollField: ({ column, row }) => `${column}, note ${String(row)}`,
  pianoRollRemoveNote: ({ row }) => `Remove note ${String(row)}`,

  stepSequencerLabel: 'Step sequencer',
  stepSequencerInstructions:
    'Arrow keys move between steps. Space or Enter turns a step on or off; plus and minus change its velocity.',
  stepSequencerCell: ({ row, step }) => `${row}, step ${String(step)}`,
  stepSequencerVelocity: ({ velocity }) => `velocity ${String(velocity)}`,
  stepSequencerAudition: ({ row }) => `Play ${row}`,
  stepSequencerSounds: 'Sounds',

  transportLabel: 'Transport',
  transportPlay: 'Play',
  transportPause: 'Pause',
  transportStop: 'Stop',
  transportLoop: 'Loop',
  transportBpm: 'BPM',
  transportPosition: ({ bar, beat }) => `Bar ${String(bar)}, beat ${String(beat)}`,

  notationLabel: 'Score',
  notationInstructions:
    'Left and right arrow keys move between notes; up and down arrow keys move between measures.',
  notationError: 'Couldn’t show this score.',
  notationMeasure: ({ number, notes }) => `Measure ${String(number)}: ${notes}`,
  notationEmptyMeasure: ({ number }) => `Measure ${String(number)}: empty`,
  notationNote: ({ pitches, value }) => `${pitches} ${value}`,
  notationRest: ({ value }) => `${value} rest`,
  notationTied: ({ note }) => `${note}, tied`,
  notationWithChord: ({ chord, note }) => `chord ${chord}, ${note}`,
};

/** The strings `/music` components read: the core strings and `/music`'s own. */
export type MusicStrings = CommonMessages & MusicMessages;

/** `/music`'s strings, with the app's overrides from `UIProvider`. */
export function useMusicMessages(): MusicStrings {
  return useEntryMessages(defaultMusicMessages);
}
