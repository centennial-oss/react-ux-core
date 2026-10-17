// A small MusicXML reader for MusicNotation: the first part's first staff and voice of a `score-partwise` document,
// with key, time and clef, notes and chords, rests, durations and dots, ties, and harmony (chord symbols). Anything
// else (other parts and voices, grace notes, lyrics, dynamics, repeats) is skipped. Parsed with the browser's
// DOMParser, so no dependency.

import type { NotationDuration, NotationMeasure, NotationNote, NotationScore } from './notation';

const MAJOR_KEYS = [
  'Cb',
  'Gb',
  'Db',
  'Ab',
  'Eb',
  'Bb',
  'F',
  'C',
  'G',
  'D',
  'A',
  'E',
  'B',
  'F#',
  'C#',
];
const MINOR_KEYS = [
  'Ab',
  'Eb',
  'Bb',
  'F',
  'C',
  'G',
  'D',
  'A',
  'E',
  'B',
  'F#',
  'C#',
  'G#',
  'D#',
  'A#',
];

const TYPES: Record<string, NotationDuration> = {
  whole: 'whole',
  half: 'half',
  quarter: 'quarter',
  eighth: 'eighth',
  '16th': '16th',
  '32nd': '32nd',
};

/** Chord-symbol suffixes for MusicXML harmony kinds. */
const KIND_SUFFIXES: Record<string, string> = {
  major: '',
  minor: 'm',
  augmented: 'aug',
  diminished: 'dim',
  dominant: '7',
  'major-seventh': 'maj7',
  'minor-seventh': 'm7',
  'diminished-seventh': 'dim7',
  'augmented-seventh': 'aug7',
  'half-diminished': 'm7b5',
  'major-minor': 'm(maj7)',
  'major-sixth': '6',
  'minor-sixth': 'm6',
  'dominant-ninth': '9',
  'major-ninth': 'maj9',
  'minor-ninth': 'm9',
  'dominant-11th': '11',
  'dominant-13th': '13',
  'suspended-second': 'sus2',
  'suspended-fourth': 'sus4',
  power: '5',
};

/** Note values (in quarter notes) for notes that give a duration but no type. */
const VALUES: readonly [NotationDuration, number][] = [
  ['whole', 4],
  ['half', 2],
  ['quarter', 1],
  ['eighth', 0.5],
  ['16th', 0.25],
  ['32nd', 0.125],
];

function text(parent: Element | null | undefined, selector: string): string | null {
  return parent?.querySelector(`:scope > ${selector}`)?.textContent.trim() ?? null;
}

function child(parent: Element, name: string): Element | null {
  return parent.querySelector(`:scope > ${name}`);
}

function alterSign(alter: number): string {
  return alter >= 2 ? '##' : alter === 1 ? '#' : alter <= -2 ? 'bb' : alter === -1 ? 'b' : '';
}

function valueFromQuarters(quarters: number): { duration: NotationDuration; dots: 0 | 1 | 2 } {
  for (const [duration, length] of VALUES) {
    if (Math.abs(quarters - length) < 1e-6) {
      return { duration, dots: 0 };
    }
    if (Math.abs(quarters - length * 1.5) < 1e-6) {
      return { duration, dots: 1 };
    }
    if (Math.abs(quarters - length * 1.75) < 1e-6) {
      return { duration, dots: 2 };
    }
  }
  return { duration: 'quarter', dots: 0 };
}

function harmonySymbol(harmony: Element): string | null {
  const root = child(harmony, 'root');
  const step = text(root, 'root-step');
  if (!step) {
    return null;
  }
  const alter = Number(text(root, 'root-alter') ?? 0);
  const kind = child(harmony, 'kind');
  const suffix =
    kind?.getAttribute('text') ?? KIND_SUFFIXES[kind?.textContent.trim() ?? 'major'] ?? '';
  const bass = child(harmony, 'bass');
  const bassStep = text(bass, 'bass-step');
  const bassText = bassStep
    ? `/${bassStep}${alterSign(Number(text(bass, 'bass-alter') ?? 0))}`
    : '';
  return `${step}${alterSign(alter)}${suffix}${bassText}`;
}

/**
 * Reads a MusicXML `score-partwise` document into a `NotationScore`. Throws when the text isn't MusicXML it can read.
 */
export function parseMusicXml(source: string): NotationScore {
  const document = new DOMParser().parseFromString(source, 'application/xml');
  if (document.querySelector('parsererror')) {
    throw new Error('The score is not well-formed XML.');
  }
  const root = document.documentElement;
  if (root.nodeName !== 'score-partwise') {
    throw new Error('Only score-partwise MusicXML is supported.');
  }
  const part = root.querySelector(':scope > part');
  if (!part) {
    throw new Error('The score has no parts.');
  }
  const score: {
    title?: string;
    clef?: NotationScore['clef'];
    key?: string;
    timeSignature?: { beats: number; unit: number };
    measures: NotationMeasure[];
  } = { measures: [] };
  const title = text(root, 'movement-title') ?? text(child(root, 'work'), 'work-title');
  if (title) {
    score.title = title;
  }

  let divisions = 1;
  let firstVoice: string | null = null;
  for (const measureElement of part.querySelectorAll(':scope > measure')) {
    const notes: NotationNote[] = [];
    let pendingChord: string | null = null;
    for (const element of measureElement.children) {
      if (element.nodeName === 'attributes') {
        divisions = Number(text(element, 'divisions') ?? divisions) || divisions;
        const key = child(element, 'key');
        if (key && score.key === undefined) {
          const fifths = Number(text(key, 'fifths') ?? 0);
          const isMinor = text(key, 'mode') === 'minor';
          const name = (isMinor ? MINOR_KEYS : MAJOR_KEYS)[fifths + 7];
          if (name) {
            score.key = isMinor ? `${name}m` : name;
          }
        }
        const time = child(element, 'time');
        if (time && score.timeSignature === undefined) {
          const beats = Number(text(time, 'beats'));
          const unit = Number(text(time, 'beat-type'));
          if (beats > 0 && unit > 0) {
            score.timeSignature = { beats, unit };
          }
        }
        const clef = element.querySelector(
          ':scope > clef:not([number]), :scope > clef[number="1"]',
        );
        if (clef && score.clef === undefined) {
          const sign = text(clef, 'sign');
          const line = text(clef, 'line');
          score.clef =
            sign === 'F' ? 'bass' : sign === 'C' ? (line === '4' ? 'tenor' : 'alto') : 'treble';
        }
      } else if (element.nodeName === 'harmony') {
        pendingChord = harmonySymbol(element);
      } else if (element.nodeName === 'note') {
        if (child(element, 'grace') || child(element, 'cue')) {
          continue;
        }
        const staff = text(element, 'staff');
        if (staff !== null && staff !== '1') {
          continue;
        }
        const voice = text(element, 'voice') ?? '1';
        firstVoice ??= voice;
        if (voice !== firstVoice) {
          continue;
        }
        const pitch = child(element, 'pitch');
        const pitchText = pitch
          ? `${text(pitch, 'step') ?? 'C'}${alterSign(Number(text(pitch, 'alter') ?? 0))}${text(pitch, 'octave') ?? '4'}`
          : null;
        const isTied = [...element.querySelectorAll(':scope > tie')].some(
          (tie) => tie.getAttribute('type') === 'start',
        );
        const previous = notes.at(-1);
        if (child(element, 'chord') && previous && pitchText) {
          // A chord note stacks onto the note before it.
          notes[notes.length - 1] = {
            ...previous,
            pitches: [...(previous.pitches ?? []), pitchText],
            ...(isTied || previous.isTied ? { isTied: true } : {}),
          };
          continue;
        }
        const type = text(element, 'type');
        const dotCount = element.querySelectorAll(':scope > dot').length;
        const value =
          type && TYPES[type]
            ? { duration: TYPES[type], dots: Math.min(2, dotCount) as 0 | 1 | 2 }
            : valueFromQuarters(Number(text(element, 'duration') ?? divisions) / divisions);
        const note: NotationNote = {
          duration: value.duration,
          ...(value.dots > 0 ? { dots: value.dots } : {}),
          ...(pitchText && !child(element, 'rest') ? { pitches: [pitchText] } : {}),
          ...(isTied ? { isTied: true } : {}),
          ...(pendingChord ? { chord: pendingChord } : {}),
        };
        pendingChord = null;
        notes.push(note);
      }
    }
    score.measures.push({ notes });
  }
  return score;
}
