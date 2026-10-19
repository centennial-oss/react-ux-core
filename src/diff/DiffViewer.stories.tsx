import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  longLineAfter,
  longLineBefore,
  observatoryLive,
  observatoryProposed,
  observatoryReordered,
  telescopeYamlAfter,
  telescopeYamlBefore,
} from '../../test/diff';
import { DiffViewer } from './DiffViewer';

const meta = {
  title: 'Diff/DiffViewer',
  component: DiffViewer,
  args: {
    before: telescopeYamlBefore,
    after: telescopeYamlAfter,
    language: 'yaml',
    beforeLabel: 'Live',
    afterLabel: 'Proposed',
  },
} satisfies Meta<typeof DiffViewer>;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A telescope's configuration, live and proposed. Split side by side on wide containers and unified below 48rem, with
 * changed words underlined and outlined within changed lines.
 */
export const Default: Story = {};

/** An observatory's 400-line JSON configuration with three changes: three hunks, the rest collapsed. */
export const LargeConfig: Story = {
  args: {
    before: observatoryLive,
    after: observatoryProposed,
    language: 'json',
    maxHeight: '32rem',
  },
};

/** Always unified, with +/− marks and line numbers from both sides. */
export const Unified: Story = {
  args: { layout: 'unified' },
};

/** Always split. */
export const Split: Story = {
  args: { layout: 'split' },
};

/**
 * Structural mode: the proposed JSON has its keys in another order, which isn't a change; only the three real
 * changes show.
 */
export const Structural: Story = {
  args: {
    before: observatoryLive,
    after: observatoryReordered,
    isStructural: true,
    language: 'json',
    contextLines: 1,
    maxHeight: '24rem',
  },
};

/** Structural mode falls back to a text diff, with a note, when a side isn't valid JSON. */
export const StructuralFallback: Story = {
  args: {
    before: '{ "aperture_mm": 1200 }',
    after: '{ "aperture_mm": 1200, }',
    isStructural: true,
  },
};

/** Without word highlights: changed lines only. */
export const WithoutWordDiff: Story = {
  args: { hasWordDiff: false },
};

/** No context: only changed lines, with every unchanged run collapsed. */
export const NoContext: Story = {
  args: { contextLines: 0, layout: 'unified' },
};

/** Long lines scroll inside the unified view and wrap in the split view; the page never scrolls sideways. */
export const LongLines: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      <DiffViewer
        {...args}
        before={longLineBefore}
        after={longLineAfter}
        language="bash"
        layout="unified"
      />
      <DiffViewer
        {...args}
        before={longLineBefore}
        after={longLineAfter}
        language="bash"
        layout="split"
      />
    </div>
  ),
};

/** Both sides the same: the text collapses, with a button to show it. */
export const NoDifferences: Story = {
  args: { after: telescopeYamlBefore },
};
