import type { Meta, StoryObj } from '@storybook/react-vite';
import { statisticsMarkdown } from '../../test/math';
import { Markdown } from '../markdown/Markdown';

// Markdown with `hasMath`: `$…$` inline and `$$…$$` block formulas. The converter loads on demand, so each formula
// shows its TeX until it's ready (`data-math-status`).
const meta = {
  title: 'Math/Markdown',
  component: Markdown,
  args: { children: statisticsMarkdown, hasMath: true },
} satisfies Meta<typeof Markdown>;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A statistics explanation with an inline `$\bar{x}$` and a block standard-error formula. Currency (`$5 and $10`) and
 * code stay text.
 */
export const StatisticsExplanation: Story = {};

/** Chemistry and a matrix in Markdown. */
export const ChemistryAndMatrices: Story = {
  args: {
    children: `Methane burns in oxygen:

$$\\ce{CH4 + 2 O2 -> CO2 + 2 H2O}$$

A quarter turn about the $z$-axis is the matrix
$$\\begin{bmatrix} 0 & -1 & 0 \\\\ 1 & 0 & 0 \\\\ 0 & 0 & 1 \\end{bmatrix}$$
which maps $(1, 0, 0)$ to $(0, 1, 0)$.`,
  },
};
