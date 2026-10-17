import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { MathFormula } from './MathFormula';
import { MathInput } from './MathInput';

// MathLive loads on demand and draws with the system's fonts unless the app serves its KaTeX fonts (`fontsDirectory`),
// so these stories aren't captured in the visual suite.
const meta = {
  title: 'Math/MathInput',
  component: MathInput,
  args: { label: 'Answer', hasPalette: true },
  tags: ['!visual'],
} satisfies Meta<typeof MathInput>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Formula entry with the full palette; the value is TeX, rendered below with MathFormula. */
export const WithPalette: Story = {
  render: (args) => {
    const [tex, setTex] = useState('\\frac{3}{4}x^2 - 2x + 1');
    return (
      <div className="flex max-w-xl flex-col gap-4">
        <MathInput {...args} value={tex} onChange={setTex} />
        <p className="text-sm text-fg-muted">
          TeX: <code>{tex}</code>
        </p>
        <MathFormula tex={tex} display="block" />
      </div>
    );
  },
};

/** Arithmetic mode for younger students: a short palette, no exponents or TeX commands, and a number pad on phones. */
export const Arithmetic: Story = {
  args: {
    label: 'What is 3 quarters of 12?',
    mode: 'arithmetic',
    placeholder: 'Type a number or a fraction',
  },
};

/** Algebra mode with a description, a required marker and an error. */
export const Invalid: Story = {
  args: {
    label: 'Factorise x² − 9',
    mode: 'algebra',
    description: 'Use the palette or type, for example (x+3)(x-3).',
    isRequired: true,
    isInvalid: true,
    errorMessage: 'Enter the factors as a product.',
    defaultValue: 'x^2-9',
  },
};

/** Read-only and disabled fields hide the palette. */
export const ReadOnlyAndDisabled: Story = {
  render: () => (
    <div className="flex max-w-xl flex-col gap-4">
      <MathInput
        label="Worked answer"
        defaultValue="\int_0^1 x^2\,dx = \frac{1}{3}"
        isReadOnly
        hasPalette
      />
      <MathInput label="Locked" defaultValue="e^{i\pi} + 1 = 0" isDisabled hasPalette />
    </div>
  ),
};
