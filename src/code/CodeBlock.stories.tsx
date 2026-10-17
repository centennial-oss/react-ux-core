import type { Meta, StoryObj } from '@storybook/react-vite';
import { longLine, marsOrbitJson, observationHcl, planetsJson } from '../../test/code';
import { CodeBlock } from './CodeBlock';

const meta = {
  title: 'Display/CodeBlock',
  component: CodeBlock,
  args: { code: planetsJson, language: 'json' },
} satisfies Meta<typeof CodeBlock>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Planet data in JSON, with a title, copy and wrap buttons. */
export const PlanetData: Story = {
  args: { title: 'planets.json' },
};

/**
 * Mars's orbit with the values Kepler's third law needs highlighted (background and a left border, not colour alone),
 * and line numbers.
 */
export const HighlightedLines: Story = {
  args: {
    code: marsOrbitJson,
    title: 'mars.json',
    hasLineNumbers: true,
    highlightedLines: [5, 6, 7],
  },
};

/** A configuration file in HCL. */
export const Hcl: Story = {
  name: 'HCL',
  args: { code: observationHcl, language: 'hcl', title: 'observation.hcl' },
};

/** A long single line scrolls inside the block (focusable so it can be scrolled), or wraps. */
export const LongLine: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <CodeBlock code={longLine} language="bash" aria-label="Run the projectile simulation" />
      <CodeBlock
        code={longLine}
        language="bash"
        aria-label="Run the projectile simulation"
        defaultWrapped
      />
    </div>
  ),
};

/** Scrolls inside past `maxHeight`. */
export const MaxHeight: Story = {
  args: { code: marsOrbitJson, title: 'mars.json', maxHeight: '12rem', hasLineNumbers: true },
};
