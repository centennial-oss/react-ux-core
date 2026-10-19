import { describe, expect, it } from 'vitest';
import { convertTex, MathSyntaxError, texToMathML, usesChemistry } from './tex';

describe('texToMathML', () => {
  it.each([
    ['\\frac{a}{b}', '<math><mfrac><mi>a</mi><mi>b</mi></mfrac></math>'],
    ['x^2', '<math><msup><mi>x</mi><mn class="tml-sml-pad">2</mn></msup></math>'],
    [
      '\\sum_{i=1}^{n} x_i',
      '<math><mrow><msubsup><mo movablelimits="false">∑</mo><mrow><mi>i</mi><mo>=</mo><mn>1</mn></mrow><mi>n</mi></msubsup><msub><mi>x</mi><mi>i</mi></msub></mrow></math>',
    ],
    ['\\alpha+\\beta', '<math><mrow><mi>α</mi><mo>+</mo></mrow><mrow><mi>β</mi></mrow></math>'],
  ])('converts %s', (tex, mathml) => {
    expect(texToMathML(tex)).toBe(mathml);
  });

  it('renders display maths as a block without soft wrapping', () => {
    const mathml = texToMathML('a+b=c+d', { display: 'block' });
    expect(mathml).toMatch(/^<math display="block"/);
    expect(mathml).toContain('<mi>a</mi><mo>+</mo><mi>b</mi>');
    // Inline maths may wrap at top-level operators (Temml groups each term in its own <mrow>).
    expect(texToMathML('a+b=c+d')).toContain('<mrow><mi>a</mi><mo>+</mo></mrow>');
  });

  it('adds the TeX annotation only when asked', () => {
    expect(texToMathML('x')).not.toContain('<annotation');
    expect(texToMathML('x', { hasAnnotation: true })).toContain(
      '<annotation encoding="application/x-tex">x</annotation>',
    );
  });

  it('throws a MathSyntaxError with the parser message for invalid TeX', () => {
    expect(() => texToMathML('\\frac{1}{')).toThrow(MathSyntaxError);
    try {
      texToMathML('\\frac{1}{');
    } catch (error) {
      expect(error).toBeInstanceOf(MathSyntaxError);
      expect((error as MathSyntaxError).reason).toBe('syntax');
      expect((error as MathSyntaxError).message).toMatch(/^Unexpected end of input/);
    }
  });

  it('gates \\ce and \\pu behind hasChemistry', () => {
    expect(usesChemistry('\\ce{H2O}')).toBe(true);
    expect(usesChemistry('\\cents')).toBe(false);
    expect(() => texToMathML('\\ce{H2O}')).toThrow(MathSyntaxError);
    const water = texToMathML('\\ce{2H2 + O2 -> 2H2O}', { hasChemistry: true });
    expect(water).toContain('<mi mathvariant="normal">H</mi>');
    expect(water).toContain('→');
  });

  it('never trusts links or raw HTML', () => {
    expect(() => texToMathML('\\href{javascript:alert(1)}{x}')).toThrow(MathSyntaxError);
  });

  it('supports macros without leaking them between conversions', () => {
    const macros = { '\\R': '\\mathbb{R}' };
    expect(texToMathML('\\R', { macros })).toContain('ℝ');
    texToMathML('\\gdef\\twice#1{2#1}\\twice{x}', { macros });
    expect(Object.keys(macros)).toEqual(['\\R']);
  });
});

describe('convertTex', () => {
  it('returns failures instead of throwing, and caches results', () => {
    const result = convertTex('\\frac{');
    expect(result.isOk).toBe(false);
    expect(convertTex('\\frac{')).toBe(result);
    const chemistry = convertTex('\\ce{CO2}');
    expect(chemistry).toMatchObject({ isOk: false, reason: 'chemistry' });
    expect(convertTex('x', { display: 'block' })).not.toBe(convertTex('x'));
  });
});
