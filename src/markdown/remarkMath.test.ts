import { describe, expect, it } from 'vitest';
import { extractMath } from './remarkMath';

/** The formulas found in `markdown`, as [display, tex] pairs. */
function found(markdown: string): [string, string][] {
  return extractMath(markdown).formulas.map((formula) => [formula.display, formula.tex]);
}

describe('extractMath', () => {
  it('finds inline and block formulas', () => {
    expect(found('The mean $\\bar{x}$ is\n\n$$\n\\frac{s}{\\sqrt{n}}\n$$\n\nand $y_1$.')).toEqual([
      ['inline', '\\bar{x}'],
      ['block', '\\frac{s}{\\sqrt{n}}'],
      ['inline', 'y_1'],
    ]);
  });

  it('keeps TeX escapes, emphasis characters and line breaks inside formulas', () => {
    expect(found('$$\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}$$ and $a*b*c$')).toEqual([
      ['block', '\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}'],
      ['inline', 'a*b*c'],
    ]);
  });

  it('leaves currency alone', () => {
    expect(found('It costs $5 and $10, or $20.')).toEqual([]);
    expect(found('Between $5 and $x$ dollars')).toEqual([['inline', 'x']]);
    expect(found('Pay $x$5 now')).toEqual([]);
    expect(found('A lone $ sign, and $ spaced $')).toEqual([]);
  });

  it('leaves escaped dollars alone, inside and outside formulas', () => {
    const { markdown, formulas } = extractMath('Price \\$5, and $\\$x$');
    expect(formulas.map((formula) => formula.tex)).toEqual(['\\$x']);
    expect(markdown.startsWith('Price \\$5, and ')).toBe(true);
  });

  it('skips code spans and fenced code', () => {
    expect(found('Use `$x$` literally, but $y$ is maths.')).toEqual([['inline', 'y']]);
    expect(found('``a ` $b$ ``, $c$')).toEqual([['inline', 'c']]);
    expect(found('Costs $10, and `$x$` is code.')).toEqual([]);
    expect(found('```tex\n$x$\n```\n\n~~~\n$$y$$\n~~~\n\n$z$')).toEqual([['inline', 'z']]);
  });

  it('keeps inline formulas inside a paragraph', () => {
    expect(found('$a\n\nb$')).toEqual([]);
    expect(found('$a +\nb$')).toEqual([['inline', 'a +\nb']]);
  });

  it('replaces formulas with placeholders the parser passes through', () => {
    const { markdown, formulas } = extractMath('A $x$ B\n\n$$y$$');
    expect(formulas.map((formula) => formula.raw)).toEqual(['$x$', '$$y$$']);
    expect(markdown).not.toContain('$');
    expect(markdown).toMatch(/^A 0 B\n\n1$/);
  });
});
