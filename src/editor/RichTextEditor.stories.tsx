import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { findAstronomers, tidesArticleWithImages, uploadAsDataUrl } from '../../test/editorArticle';
import { CodeBlock } from '../code/CodeBlock';
import { RichTextEditor } from './RichTextEditor';

const meta = {
  title: 'Editor/RichTextEditor',
  component: RichTextEditor,
  args: { label: 'Article', format: 'markdown' },
  parameters: {
    a11y: {
      config: {
        rules: [
          // Exception: checklist items are Lexical's <li role="checkbox" aria-checked> (their list is a group, so the
          // list rule holds), announced as checkboxes with their state. ARIA in HTML doesn't list checkbox among
          // <li>'s roles, which axe's best-practice aria-allowed-role reports.
          { id: 'aria-allowed-role', enabled: false },
        ],
      },
    },
  },
} satisfies Meta<typeof RichTextEditor>;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A 2,000-word article stored as Markdown: headings, emphasis, links, lists, a checklist, a quote, code blocks with
 * CodeBlock's colours, images and a table. Long documents scroll inside `maxHeight`; "/" opens the block menu.
 */
export const Article: Story = {
  args: {
    defaultValue: tidesArticleWithImages,
    maxHeight: '32rem',
    hasSlashMenu: true,
    uploadImage: uploadAsDataUrl,
  },
};

/** Controlled, with the stored Markdown shown as it changes. Output is deterministic, so diffs stay small. */
export const MarkdownOutput: Story = {
  render: (args) => {
    const [value, setValue] = useState(
      '## Observing log\n\nThe **Moon** was *bright* tonight. See the [guide](https://example.com/guide).\n\n- [x] Align the finder\n- [ ] Sketch the terminator',
    );
    return (
      <div className="flex flex-col gap-4">
        <RichTextEditor {...args} value={value} onChange={setValue} />
        <CodeBlock code={value} title="observing-log.md" />
      </div>
    );
  },
  args: { label: 'Observing log', hasSlashMenu: true },
};

/** Stored as sanitised HTML: only the elements the features allow, one block per line. */
export const HtmlOutput: Story = {
  render: (args) => {
    const [value, setValue] = useState(
      '<h2>Lab readings</h2>\n<p>Samples were kept at <strong>4 °C</strong> and read <em>hourly</em>.</p>\n<table>\n<thead>\n<tr><th><p>Hour</p></th><th><p>pH</p></th></tr>\n</thead>\n<tbody>\n<tr><td><p>1</p></td><td><p>7.2</p></td></tr>\n<tr><td><p>2</p></td><td><p>7.1</p></td></tr>\n</tbody>\n</table>',
    );
    return (
      <div className="flex flex-col gap-4">
        <RichTextEditor {...args} value={value} onChange={setValue} />
        <CodeBlock code={value} title="readings.html" />
      </div>
    );
  },
  args: { label: 'Lab notes', format: 'html' },
};

/** A comment box: a few inline features, @-mentions and a placeholder. Type "@" to mention someone. */
export const Comment: Story = {
  args: {
    label: 'Comment',
    description: 'Mention a colleague with @.',
    features: ['bold', 'italic', 'code', 'link', 'list', 'mention'],
    loadMentions: findAstronomers,
    placeholder: 'Write a comment…',
    minHeight: '6rem',
  },
};

/** Empty, with a placeholder. */
export const Empty: Story = {
  args: {
    label: 'Summary',
    placeholder: 'Start writing, or type / for blocks',
    hasSlashMenu: true,
  },
};

/** Required, invalid with an error message, disabled and read-only. */
export const States: Story = {
  render: (args) => (
    <div className="flex flex-col gap-6">
      <RichTextEditor
        {...args}
        label="Abstract"
        description="One or two paragraphs."
        isRequired
        isInvalid
        errorMessage="Write an abstract before submitting."
        minHeight="5rem"
      />
      <RichTextEditor
        {...args}
        label="Disabled"
        isDisabled
        defaultValue="Telescope time is **booked** for Friday."
        minHeight="5rem"
      />
      <RichTextEditor
        {...args}
        label="Read-only"
        isReadOnly
        defaultValue="Observed *Jupiter* and four moons: Io, Europa, Ganymede and Callisto."
        minHeight="5rem"
      />
    </div>
  ),
};
