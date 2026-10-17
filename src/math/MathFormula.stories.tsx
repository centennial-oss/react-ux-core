import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  alignedEquations,
  combustion,
  integral,
  invalidFormula,
  longFormula,
  matrix,
  quadraticFormula,
  standardError,
  summation,
} from '../../test/math';
import { Prose } from '../components/Prose/Prose';
import { MathFormula } from './MathFormula';

const meta = {
  title: 'Math/MathFormula',
  component: MathFormula,
  args: { tex: quadraticFormula, display: 'block' },
} satisfies Meta<typeof MathFormula>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The quadratic formula as a block, rendered as native MathML in the theme's text colour. */
export const QuadraticFormula: Story = {};

/** A summation and an integral, numbered. */
export const SummationAndIntegral: Story = {
  render: () => (
    <div>
      <MathFormula tex={summation} display="block" label="(1)" id="eq-sum" />
      <MathFormula tex={integral} display="block" label="(2)" id="eq-integral" />
    </div>
  ),
};

/** A 3×3 rotation matrix. */
export const Matrix: Story = {
  name: '3×3 matrix',
  args: { tex: matrix },
};

/** Aligned equations with a label that text links to by id. */
export const AlignedEquations: Story = {
  render: () => (
    <Prose>
      <p>
        Solving the pair of equations by elimination (see <a href="#eq-system">equation (3)</a>):
      </p>
      <MathFormula tex={alignedEquations} display="block" label="(3)" id="eq-system" />
    </Prose>
  ),
};

/** A chemical equation with mhchem's `\ce{}` (needs `hasChemistry`). */
export const ChemicalEquation: Story = {
  args: { tex: combustion, hasChemistry: true },
};

/** TeX that doesn't parse shows its source in the danger tone, with the parser's message behind the (i) button. */
export const InvalidTex: Story = {
  args: { tex: invalidFormula, display: 'inline' },
};

/** Formulas in running text: inline maths sits on the line and wraps with it. */
export const InParagraph: Story = {
  render: () => (
    <Prose>
      <p>
        For a sample of <MathFormula tex="n" /> readings with standard deviation{' '}
        <MathFormula tex="s" />, the standard error of the mean is{' '}
        <MathFormula tex={standardError} />, so quadrupling <MathFormula tex="n" /> halves it. The
        roots of <MathFormula tex="ax^2 + bx + c = 0" /> are <MathFormula tex={quadraticFormula} />.
      </p>
    </Prose>
  ),
};

/** A long block formula scrolls sideways inside a focusable region on narrow screens, never the page. */
export const LongFormula: Story = {
  args: { tex: longFormula, label: '(4)' },
};
