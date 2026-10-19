// Sample formulas and Markdown for the /math stories and tests.

export const quadraticFormula = 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}';
export const summation = '\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}';
export const integral = '\\int_0^1 x^2 \\, dx = \\frac{1}{3}';
export const matrix =
  'R = \\begin{bmatrix} \\cos\\theta & -\\sin\\theta & 0 \\\\ \\sin\\theta & \\cos\\theta & 0 \\\\ 0 & 0 & 1 \\end{bmatrix}';
export const alignedEquations =
  '\\begin{aligned} 2x + 3y &= 7 \\\\ x - y &= 1 \\\\ \\Rightarrow x &= 2, \\; y = 1 \\end{aligned}';
export const combustion = '\\ce{CH4 + 2 O2 -> CO2 + 2 H2O}';
export const invalidFormula = '\\frac{1}{2';
/** A long formula that scrolls sideways on narrow screens. */
export const longFormula =
  'e^x = 1 + x + \\frac{x^2}{2!} + \\frac{x^3}{3!} + \\frac{x^4}{4!} + \\frac{x^5}{5!} + \\frac{x^6}{6!} + \\frac{x^7}{7!} + \\frac{x^8}{8!} + \\cdots';
export const standardError = '\\mathrm{SE}_{\\bar{x}} = \\frac{s}{\\sqrt{n}}';

/** A statistics explanation with an inline mean and a block standard-error formula. */
export const statisticsMarkdown = `The sample mean $\\bar{x}$ estimates the mean $\\mu$ of all possible readings. How far it typically lands from $\\mu$ is its **standard error**:

$$
\\mathrm{SE}_{\\bar{x}} = \\frac{s}{\\sqrt{n}}
$$

With a standard deviation of $s = 2.4$ over $n = 36$ telescope readings, $\\mathrm{SE} = 0.4$. Quadrupling the readings only halves the error. (Prices such as $5 and $10 stay plain text, and \`$x$\` in code stays code.)`;

/** y = x² − 2 with the area from 0 to 1 shaded, and y = sin x: the CoordinatePlane acceptance example. */
export const parabolaAndSine = [
  {
    id: 'parabola',
    label: 'y = x^2 - 2',
    fn: (x: number) => x * x - 2,
    shade: { from: 0, to: 1 },
    features:
      'Roots at x = −1.41 and x = 1.41; minimum at (0, −2); shaded area from 0 to 1 is −5/3.',
  },
  {
    id: 'sine',
    label: 'y = \\sin x',
    fn: Math.sin,
    dash: [6, 4],
    features: 'Period 2π; between −1 and 1.',
  },
] as const;

/** The parabola's vertex, as a draggable point. */
export const vertexPoint = { id: 'vertex', x: 0, y: -2, label: 'Vertex' } as const;
