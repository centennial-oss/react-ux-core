import type { Meta, StoryObj } from '@storybook/react-vite';
import { explanationMarkdown, labMarkdown } from '../../test/code';
import { Markdown } from './Markdown';

const meta = {
  title: 'Display/Markdown',
  component: Markdown,
  args: { children: explanationMarkdown },
} satisfies Meta<typeof Markdown>;
export default meta;
type Story = StoryObj<typeof meta>;

/** A question's explanation: emphasis, a list, fenced JSON through CodeBlock, and links. */
export const Explanation: Story = {
  args: { size: 'sm' },
};

/** A long-form lab write-up: shifted headings, a task list, steps with fenced code, a quote and an aligned table. */
export const LabWriteUp: Story = {
  args: { children: labMarkdown },
};
