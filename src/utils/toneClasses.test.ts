import { describe, expect, it } from 'vitest';
import {
  toneFillClasses,
  toneOutlineClasses,
  toneSelectedClasses,
  toneSoftBorderedClasses,
  toneSoftClasses,
  toneSolidClasses,
  toneTextClasses,
} from './toneClasses';
import type { Tone } from './types';

const tones: readonly Tone[] = ['neutral', 'accent', 'success', 'warning', 'danger'];

describe('tone classes', () => {
  it.each([
    ['solid', toneSolidClasses, (tone: Tone) => `bg-${tone}-solid text-${tone}-on-solid`],
    ['soft', toneSoftClasses, (tone: Tone) => `bg-${tone}-bg text-${tone}-fg`],
    [
      'soft bordered',
      toneSoftBorderedClasses,
      (tone: Tone) => `border-${tone}-border bg-${tone}-bg text-${tone}-fg`,
    ],
    ['outline', toneOutlineClasses, (tone: Tone) => `border border-${tone}-border text-${tone}-fg`],
    ['text', toneTextClasses, (tone: Tone) => `text-${tone}-fg`],
    ['fill', toneFillClasses, (tone: Tone) => `bg-${tone}-solid`],
    [
      'selected',
      toneSelectedClasses,
      (tone: Tone) =>
        `data-selected:border-transparent data-selected:bg-${tone}-solid data-selected:text-${tone}-on-solid`,
    ],
  ])('%s uses each tone’s own tokens', (_, classes, expected) => {
    for (const tone of tones) {
      expect(classes[tone]).toBe(expected(tone));
    }
  });
});
