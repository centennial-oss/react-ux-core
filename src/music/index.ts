// Public API for @centennial-oss/react-ux-core/music: an on-screen and MIDI piano keyboard, a piano roll and step
// sequencer (on the /canvas Canvas), a transport and beat clock driven by the Web Audio clock, and music notation
// rendered with VexFlow (the entry's optional peer, loaded on first use).
export {
  createBeatClock,
  useBeatClock,
  type BeatClock,
  type BeatClockOptions,
  type BeatClockState,
  type BeatLoop,
  type BeatWindow,
  type UseBeatClockOptions,
} from './beatClock';
export {
  defaultMusicMessages,
  useMusicMessages,
  type MusicMessages,
  type MusicStrings,
} from './messages';
export { MusicNotation, type MusicNotationProps } from './MusicNotation';
export { parseMusicXml } from './musicxml';
export { MusicTransport, type MusicTransportProps } from './MusicTransport';
export {
  describeMeasure,
  describeNotationNote,
  noteAtPlayhead,
  noteBeats,
  timeScore,
  type NotationDuration,
  type NotationMeasure,
  type NotationNote,
  type NotationScore,
  type TimedNote,
} from './notation';
export {
  duplicateNotes,
  moveNotes,
  notesAt,
  notesEnd,
  quantizeNotes,
  resizeNotes,
  sortNotes,
  type MusicNote,
} from './notes';
export { NoteTable, type NoteTableProps } from './NoteTable';
export { PianoKeyboard, type PianoHighlight, type PianoKeyboardProps } from './PianoKeyboard';
export { PianoRoll, type PianoRollProps } from './PianoRoll';
export {
  barAndBeat,
  formatPitch,
  isBlackKey,
  isInScale,
  midiFromSpelled,
  nameNoteValue,
  parsePitch,
  pitchClass,
  pitchOctave,
  snapBeats,
  snapTo,
  spellPitch,
  type Accidental,
  type MusicScale,
  type NoteValueName,
  type PitchLetter,
  type PitchRange,
  type SnapValue,
  type SpelledPitch,
  type TimeSignature,
} from './pitch';
export {
  StepSequencer,
  type StepPattern,
  type StepSequencerProps,
  type StepSequencerRow,
} from './StepSequencer';
export {
  isMidiSupported,
  useMidiInput,
  type MidiDevice,
  type MidiInputState,
  type MidiStatus,
  type UseMidiInputOptions,
} from './useMidiInput';
