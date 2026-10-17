import { describe, expect, it } from 'vitest';
import { bassLine, odeToJoyLeadSheet, odeToJoyMusicXml } from '../../test/music';
import { createBeatClock, type BeatWindow } from './beatClock';
import { defaultMusicMessages, type MusicStrings } from './messages';
import { parseMusicXml } from './musicxml';
import {
  describeMeasure,
  describeNotationNote,
  noteAtPlayhead,
  noteBeats,
  timeScore,
} from './notation';
import {
  duplicateNotes,
  moveNotes,
  notesAt,
  quantizeNotes,
  resizeNotes,
  type MusicNote,
} from './notes';
import { layoutKeys } from './PianoKeyboard';
import {
  barAndBeat,
  formatPitch,
  isBlackKey,
  isInScale,
  midiFromSpelled,
  nameNoteValue,
  parsePitch,
  snapBeats,
  snapTo,
  spellPitch,
} from './pitch';

// The notation helpers only read /music's own strings.
const messages = defaultMusicMessages as MusicStrings;
const common = { beats: 4, unit: 4 };

function must<T>(value: T | undefined): T {
  if (value === undefined) {
    throw new Error('Expected a value');
  }
  return value;
}

describe('pitch', () => {
  it('spells MIDI numbers with sharps and names them', () => {
    expect(spellPitch(60)).toEqual({ letter: 'C', octave: 4 });
    expect(spellPitch(61)).toEqual({ letter: 'C', accidental: 'sharp', octave: 4 });
    expect(spellPitch(21)).toEqual({ letter: 'A', octave: 0 });
    expect(defaultMusicMessages.musicPitchName(spellPitch(61))).toBe('C sharp 4');
    expect(defaultMusicMessages.musicPitchName(spellPitch(64))).toBe('E4');
    expect(defaultMusicMessages.musicPitchLabel(spellPitch(70))).toBe('A♯4');
  });

  it('parses and formats scientific pitch notation', () => {
    expect(parsePitch('F#3')).toEqual({ letter: 'F', accidental: 'sharp', octave: 3 });
    expect(parsePitch('bb2')).toEqual({ letter: 'B', accidental: 'flat', octave: 2 });
    expect(parsePitch('H4')).toBeNull();
    expect(midiFromSpelled({ letter: 'B', accidental: 'sharp', octave: 3 })).toBe(60);
    expect(midiFromSpelled({ letter: 'E', accidental: 'flat', octave: 4 })).toBe(63);
    expect(formatPitch({ letter: 'D', accidental: 'double-flat', octave: 5 })).toBe('Dbb5');
  });

  it('knows black keys and scales', () => {
    expect([60, 61, 62, 63, 64, 65, 66].map(isBlackKey)).toEqual([
      false,
      true,
      false,
      true,
      false,
      false,
      true,
    ]);
    expect(isInScale(66, { root: 7, mode: 'major' })).toBe(true); // F♯ in G major
    expect(isInScale(65, { root: 7, mode: 'major' })).toBe(false);
    expect(isInScale(63, { root: 0, mode: 'minor' })).toBe(true); // E♭ in C minor
    expect(isInScale(61, { root: 0, mode: 'chromatic' })).toBe(true);
  });

  it('turns snap values, triplets included, into beats', () => {
    expect(snapBeats('1/16', common)).toBe(0.25);
    expect(snapBeats('1/8t', common)).toBeCloseTo(1 / 3);
    expect(snapBeats('1/16t', common)).toBeCloseTo(1 / 6);
    expect(snapBeats('1/8', { beats: 6, unit: 8 })).toBe(1);
    expect(snapBeats('off', common)).toBe(0);
    expect(snapTo(1.13, 0.25)).toBe(1.25);
    expect(snapTo(1.13, 0)).toBe(1.13);
  });

  it('gives bars and beats and names note values', () => {
    expect(barAndBeat(0, common)).toEqual({ bar: 1, beat: 1 });
    expect(barAndBeat(6.5, common)).toEqual({ bar: 2, beat: 3.5 });
    expect(nameNoteValue(1, common)).toEqual({ value: 'quarter', dots: 0, isTriplet: false });
    expect(nameNoteValue(1.5, common)).toEqual({ value: 'quarter', dots: 1, isTriplet: false });
    expect(nameNoteValue(1 / 3, common)).toEqual({ value: 'eighth', dots: 0, isTriplet: true });
    expect(nameNoteValue(0.3, common)).toBeNull();
    expect(
      defaultMusicMessages.musicNoteLength({ value: 'eighth', dots: 1, isTriplet: false }),
    ).toBe('dotted eighth note');
  });

  it('widens keyboard ranges to white keys', () => {
    const layout = layoutKeys({ low: 49, high: 70 });
    expect(layout.low).toBe(48);
    expect(layout.high).toBe(71);
    expect(layout.whiteCount).toBe(14);
    expect(layoutKeys({ low: 48, high: 72 }).whiteCount).toBe(15);
  });
});

describe('note editing', () => {
  const notes: MusicNote[] = [
    { id: 'a', pitch: 60, start: 0, duration: 1, velocity: 100 },
    { id: 'b', pitch: 64, start: 1.1, duration: 0.9, velocity: 100 },
    { id: 'c', pitch: 67, start: 2, duration: 1, velocity: 100 },
  ];
  const range = { low: 36, high: 84 };

  it('moves notes as a group, within the range and after beat 0', () => {
    expect(
      moveNotes(notes, ['a', 'c'], 1, 12, range).map((note) => [note.pitch, note.start]),
    ).toEqual([
      [72, 1],
      [64, 1.1],
      [79, 3],
    ]);
    // The top note stops at the range's top, and the chord keeps its shape.
    expect(moveNotes(notes, ['a', 'c'], 0, 24, range).map((note) => note.pitch)).toEqual([
      77, 64, 84,
    ]);
    expect(moveNotes(notes, ['b'], -5, 0, range)[1]?.start).toBe(0);
  });

  it('resizes, duplicates and quantizes', () => {
    expect(resizeNotes(notes, ['a'], -2, 0.25)[0]?.duration).toBe(0.25);
    let counter = 0;
    const duplicated = duplicateNotes(notes, ['a', 'b'], () => `copy${String(++counter)}`, 0.25);
    expect(duplicated.ids).toEqual(['copy1', 'copy2']);
    expect(duplicated.notes.slice(3).map((note) => note.start)).toEqual([2, 3.1]);
    const quantized = quantizeNotes(notes, 0.25);
    expect(quantized[1]).toMatchObject({ start: 1, duration: 1 });
    expect(quantizeNotes(notes, 0.5, ['c'])[1]).toEqual(notes[1]);
    expect(notesAt(notes, 2.5).map((note) => note.id)).toEqual(['c']);
  });
});

describe('notation model', () => {
  it('times notes and finds the note at a playhead', () => {
    expect(noteBeats({ duration: 'quarter', dots: 1 }, common)).toBe(1.5);
    expect(noteBeats({ duration: 'eighth' }, { beats: 6, unit: 8 })).toBe(1);
    const timed = timeScore(odeToJoyLeadSheet);
    expect(timed).toHaveLength(32);
    expect(timed[3]?.map((note) => note.start)).toEqual([0, 1.5, 2]);
    expect(noteAtPlayhead(timed, { measure: 4, beat: 2.75 })?.id).toBe('m4-n1');
    expect(noteAtPlayhead(timed, { measure: 4, beat: 3 })?.id).toBe('m4-n2');
    expect(noteAtPlayhead(timed, { measure: 40, beat: 1 })).toBeNull();
  });

  it('describes measures and notes in words', () => {
    expect(describeMeasure(must(odeToJoyLeadSheet.measures[0]), 1, messages)).toBe(
      'Measure 1: chord G, B4 quarter, B4 quarter, C5 quarter, D5 quarter',
    );
    const last = must(odeToJoyLeadSheet.measures[31]);
    expect(describeNotationNote(must(last.notes[2]), messages)).toBe('chord G, G4 B4 D5 quarter');
    expect(describeNotationNote(must(last.notes[3]), messages)).toBe('quarter rest');
    expect(describeNotationNote(must(must(bassLine.measures[1]).notes[2]), messages)).toBe(
      'F sharp 3 quarter, tied',
    );
    expect(describeMeasure({ notes: [] }, 7, messages)).toBe('Measure 7: empty');
  });

  it('reads a MusicXML subset', () => {
    const score = parseMusicXml(odeToJoyMusicXml);
    expect(score).toMatchObject({
      title: 'Ode to Joy',
      key: 'G',
      clef: 'treble',
      timeSignature: common,
    });
    expect(score.measures).toHaveLength(4);
    expect(score.measures[0]?.notes[0]).toEqual({
      pitches: ['B4'],
      duration: 'quarter',
      chord: 'G',
    });
    expect(score.measures[1]?.notes).toEqual([
      { pitches: ['D5'], duration: 'quarter', dots: 1, chord: 'D7' },
      { pitches: ['C5'], duration: 'eighth' },
      { pitches: ['F#4'], duration: 'quarter', isTied: true },
      { pitches: ['F#4'], duration: 'quarter' },
    ]);
    // The chord stacks, and the second voice is skipped.
    expect(score.measures[2]?.notes).toEqual([
      { pitches: ['G4'], duration: 'half', chord: 'G' },
      { pitches: ['B4', 'D5'], duration: 'half' },
    ]);
    // A whole-measure rest with no type gets its value from its duration.
    expect(score.measures[3]?.notes).toEqual([{ duration: 'whole' }]);
    expect(() => parseMusicXml('<score-timewise/>')).toThrow();
    expect(() => parseMusicXml('not xml')).toThrow();
  });
});

describe('beat clock', () => {
  function fakeContext() {
    return { currentTime: 0 } as unknown as BaseAudioContext & { currentTime: number };
  }

  it('counts beats on the audio clock and wraps loops', () => {
    const context = fakeContext();
    const clock = createBeatClock({ bpm: 120, audioContext: context, loop: { start: 0, end: 4 } });
    expect(clock.getBeat()).toBe(0);
    clock.play();
    context.currentTime = 1; // 2 beats at 120 BPM
    expect(clock.getBeat()).toBeCloseTo(2);
    context.currentTime = 2.5; // 5 beats, wrapped into the 4-beat loop
    expect(clock.getBeat()).toBeCloseTo(1);
    clock.setBpm(60);
    context.currentTime = 3.5; // 1 more beat at 60 BPM
    expect(clock.getBeat()).toBeCloseTo(2);
    clock.pause();
    context.currentTime = 10;
    expect(clock.getBeat()).toBeCloseTo(2);
    clock.stop();
    expect(clock.getBeat()).toBe(0);
    clock.dispose();
  });

  it('hands upcoming beats to the scheduler with their exact times, split at the loop end', async () => {
    const context = fakeContext();
    const windows: { from: number; to: number; time: number }[] = [];
    const clock = createBeatClock({
      bpm: 60,
      audioContext: context,
      loop: { start: 0, end: 2 },
      lookahead: 0.5,
      onSchedule: (window: BeatWindow) => {
        windows.push({ from: window.from, to: window.to, time: window.timeAt(window.from) });
      },
    });
    clock.seek(1);
    clock.play();
    expect(windows).toEqual([{ from: 1, to: 1.5, time: 0 }]);
    windows.length = 0;
    // 1.2 s later (beat 2.2, past the loop end) with 0.5 s of look-ahead: the rest of the loop, then its start again.
    context.currentTime = 1.2;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(
      windows.map(({ from, to, time }) =>
        [from, to, time].map((value) => Number(value.toFixed(6))),
      ),
    ).toEqual([
      [1.5, 2, 0.5],
      [0, 0.7, 1],
    ]);
    expect(clock.getBeat()).toBeCloseTo(0.2);
    clock.dispose();
  });
});
