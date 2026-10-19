import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { newtonMarkdown } from '../../test/markdownEditor';
import { MarkdownEditor, type UploadedImage } from './MarkdownEditor';

const meta = {
  title: 'Inputs/MarkdownEditor',
  component: MarkdownEditor,
  args: {
    label: 'Explanation',
    description: 'Shown to learners after they answer.',
    defaultValue: newtonMarkdown,
  },
} satisfies Meta<typeof MarkdownEditor>;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Editor and preview side by side, with synced scrolling. Below 48rem (on a phone, or in a narrow card) it shows as
 * Write / Preview tabs instead. Enter continues lists, and Tab indents a list item (Escape, then Tab, moves on).
 */
export const Split: Story = {};

/** Write and Preview tabs at every width. */
export const Tabs: Story = {
  args: { layout: 'tabs' },
};

/** The tabs layout opened on Preview, rendered by `Markdown` just as learners see it. */
export const TabsOnPreview: Story = {
  args: { layout: 'tabs', defaultSelectedTab: 'preview' },
};

/** The editor alone, for a form with its own preview elsewhere. */
export const EditorOnly: Story = {
  args: { layout: 'editor', minRows: 6, maxRows: 12 },
};

/** Without the toolbar; the shortcuts still work. */
export const WithoutToolbar: Story = {
  args: { layout: 'editor', hasToolbar: false, minRows: 4, maxRows: 8 },
};

/** A counter with `maxLength`; toolbar commands that would pass the limit do nothing. */
export const CharacterCount: Story = {
  args: { layout: 'editor', hasCharacterCount: true, maxLength: 1200, minRows: 6, maxRows: 10 },
};

export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <MarkdownEditor
        label="Required, invalid"
        layout="editor"
        minRows={3}
        isRequired
        isInvalid
        errorMessage="Explain why the answer is right."
        defaultValue="Because"
      />
      <MarkdownEditor
        label="Read-only"
        layout="editor"
        minRows={3}
        isReadOnly
        defaultValue="**F = m·a**, so a 2 kg cart pulled with 6 N accelerates at 3 m/s²."
      />
      <MarkdownEditor
        label="Disabled"
        layout="editor"
        minRows={3}
        isDisabled
        defaultValue="Archived explanation"
      />
    </div>
  ),
};

/** Draws a small square image, so the demo upload needs no network or asset. */
function drawnImage(label: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 90;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = '#1e3a5f';
    context.fillRect(0, 0, 160, 90);
    context.fillStyle = '#f5f5f5';
    context.font = '14px sans-serif';
    context.fillText(label.slice(0, 18), 12, 50);
  }
  return canvas.toDataURL('image/png');
}

/**
 * Paste or drop an image (or use the image button) to "upload" it: a placeholder shows for a moment, then
 * `![alt](src)`. The demo upload draws a stand-in image instead of sending the file anywhere.
 */
export const ImageUploads: Story = {
  tags: ['!visual'],
  args: {
    defaultValue: 'Paste or drop a photo of your apparatus here:\n\n',
    uploadImage: (file: File) =>
      new Promise<UploadedImage>((resolve) => {
        requestAnimationFrame(() => {
          resolve({ src: drawnImage(file.name), alt: `Apparatus: ${file.name}` });
        });
      }),
  },
};

/** Controlled: the value lives in the parent, here echoed below the editor. */
export const Controlled: Story = {
  tags: ['!visual'],
  render: function Render(args) {
    const [value, setValue] = useState('- [ ] Measure the mass\n- [ ] Time the run');
    return (
      <div className="flex flex-col gap-3">
        <MarkdownEditor {...args} defaultValue={undefined} value={value} onChange={setValue} />
        <pre className="overflow-x-auto rounded-control bg-surface-2 p-3 text-xs">{value}</pre>
      </div>
    );
  },
};
