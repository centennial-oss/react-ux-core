// MathInput's palette: named templates inserted into the field, grouped by the input mode that offers them.
import type { GreekLetterName, MathMessages } from './messages';

/** How much maths a MathInput allows: plain arithmetic for younger students up to everything. */
export type MathInputMode = 'arithmetic' | 'algebra' | 'calculus' | 'full';

/** A palette button: what it inserts, how its face looks (TeX) and its accessible name. */
export interface MathTemplate {
  id: string;
  /**
   * MathLive insertion: `#@` takes the selection (or the item before the caret), `#0` is the first placeholder
   * (selected after inserting) and `#?` more placeholders.
   */
  insert: string;
  /** A MathLive command to run instead of inserting, such as `moveToSuperscript` (what typing `^` does). */
  command?: 'moveToSuperscript' | 'moveToSubscript';
  /** The button's face, as TeX. */
  face: string;
  label: (messages: MathMessages) => string;
}

const greek = (name: GreekLetterName, command: string): MathTemplate => ({
  id: name,
  insert: command,
  face: command,
  label: (messages) => messages.paletteGreekLetter({ name }),
});

const arithmetic: readonly MathTemplate[] = [
  {
    id: 'fraction',
    insert: '\\frac{#@}{#?}',
    face: '\\frac{a}{b}',
    label: (messages) => messages.paletteFraction,
  },
  {
    id: 'parentheses',
    insert: '\\left(#0\\right)',
    face: '(\\,)',
    label: (messages) => messages.paletteParentheses,
  },
  { id: 'times', insert: '\\times', face: '\\times', label: (messages) => messages.paletteTimes },
  { id: 'divide', insert: '\\div', face: '\\div', label: (messages) => messages.paletteDivide },
];

const algebra: readonly MathTemplate[] = [
  {
    id: 'power',
    insert: '#@^{#?}',
    command: 'moveToSuperscript',
    face: 'x^{n}',
    label: (messages) => messages.palettePower,
  },
  {
    id: 'subscript',
    insert: '#@_{#?}',
    command: 'moveToSubscript',
    face: 'x_{n}',
    label: (messages) => messages.paletteSubscript,
  },
  {
    id: 'squareRoot',
    insert: '\\sqrt{#0}',
    face: '\\sqrt{x}',
    label: (messages) => messages.paletteSquareRoot,
  },
  {
    id: 'nthRoot',
    insert: '\\sqrt[#?]{#0}',
    face: '\\sqrt[n]{x}',
    label: (messages) => messages.paletteNthRoot,
  },
  {
    id: 'absoluteValue',
    insert: '\\left|#0\\right|',
    face: '|x|',
    label: (messages) => messages.paletteAbsoluteValue,
  },
  { id: 'plusMinus', insert: '\\pm', face: '\\pm', label: (messages) => messages.palettePlusMinus },
  {
    id: 'lessOrEqual',
    insert: '\\le',
    face: '\\le',
    label: (messages) => messages.paletteLessOrEqual,
  },
  {
    id: 'greaterOrEqual',
    insert: '\\ge',
    face: '\\ge',
    label: (messages) => messages.paletteGreaterOrEqual,
  },
  { id: 'notEqual', insert: '\\ne', face: '\\ne', label: (messages) => messages.paletteNotEqual },
  greek('pi', '\\pi'),
  greek('theta', '\\theta'),
];

const calculus: readonly MathTemplate[] = [
  {
    id: 'integral',
    insert: '\\int_{#?}^{#?}#0\\,dx',
    face: '\\int_a^b',
    label: (messages) => messages.paletteIntegral,
  },
  {
    id: 'sum',
    insert: '\\sum_{#?}^{#?}#0',
    face: '\\sum',
    label: (messages) => messages.paletteSum,
  },
  {
    id: 'limit',
    insert: '\\lim_{#?\\to#?}#0',
    face: '\\lim',
    label: (messages) => messages.paletteLimit,
  },
  {
    id: 'infinity',
    insert: '\\infty',
    face: '\\infty',
    label: (messages) => messages.paletteInfinity,
  },
  greek('alpha', '\\alpha'),
  greek('beta', '\\beta'),
  greek('delta', '\\delta'),
  greek('lambda', '\\lambda'),
];

const full: readonly MathTemplate[] = [
  {
    id: 'matrix',
    insert: '\\begin{pmatrix}#0 & #?\\\\ #? & #?\\end{pmatrix}',
    face: '\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}',
    label: (messages) => messages.paletteMatrix,
  },
  greek('gamma', '\\gamma'),
  greek('mu', '\\mu'),
  greek('sigma', '\\sigma'),
  greek('phi', '\\phi'),
  greek('omega', '\\omega'),
];

/** The templates a mode offers: each mode adds to the one before it. */
export function paletteFor(mode: MathInputMode): readonly MathTemplate[] {
  switch (mode) {
    case 'arithmetic':
      return arithmetic;
    case 'algebra':
      return [...arithmetic, ...algebra];
    case 'calculus':
      return [...arithmetic, ...algebra, ...calculus];
    case 'full':
      return [...arithmetic, ...algebra, ...calculus, ...full];
  }
}

/** The virtual keyboard layouts (MathLive's names) a mode shows on phones. */
export const keyboardLayouts: Record<MathInputMode, readonly string[]> = {
  arithmetic: ['numeric-only'],
  algebra: ['numeric', 'alphabetic'],
  calculus: ['numeric', 'symbols', 'alphabetic', 'greek'],
  full: ['numeric', 'symbols', 'alphabetic', 'greek'],
};

/** Plain text as a TeX `\text{…}` argument, with TeX's special characters escaped. */
export function texText(text: string): string {
  const escaped = text.replace(/[\\{}$&#^_%~]/g, (character) => {
    if (character === '\\') {
      return '\\textbackslash{}';
    }
    if (character === '^') {
      return '\\textasciicircum{}';
    }
    if (character === '~') {
      return '\\textasciitilde{}';
    }
    return `\\${character}`;
  });
  return `\\text{${escaped}}`;
}
