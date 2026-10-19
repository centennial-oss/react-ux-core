import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { newtonMarkdown } from '../../test/markdownEditor';
import type { Messages } from '../provider/messages';
import { UIProvider } from '../provider/UIProvider';
import type { MarkdownEditorMessages } from './editorMessages';
import { Markdown } from './Markdown';
import { MarkdownEditor, type UploadedImage } from './MarkdownEditor';

const isDesktop = window.innerWidth >= 1024;
const hasTouch = navigator.maxTouchPoints > 0;
const mod = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent) ? 'Meta' : 'Control';

function editor(name = 'Explanation') {
  return screen.getByRole<HTMLTextAreaElement>('textbox', { name });
}

/** Puts the caret (or a selection) in the editor. */
function select(area: HTMLTextAreaElement, start: number, end = start) {
  area.focus();
  area.setSelectionRange(start, end);
}

/** The text of the elements that describe `element` (its aria-describedby), hidden ones included. */
function description(element: Element) {
  return (element.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ');
}

function caretAtEnd(area: HTMLTextAreaElement) {
  select(area, area.value.length);
}

/** A promise with its resolve and reject, for controlling an upload. */
function deferred() {
  let resolve: (value: UploadedImage) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<UploadedImage>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function imageFile(name = 'cart.png') {
  return new File([new Uint8Array([137, 80, 78, 71])], name, { type: 'image/png' });
}

describe('MarkdownEditor', () => {
  it('is a labelled textbox with a formatting toolbar, described with its keyboard help', () => {
    render(<MarkdownEditor label="Explanation" description="Shown after an answer" />);
    const area = editor();
    expect(area.tagName).toBe('TEXTAREA');
    expect(area.className).toContain('font-mono');
    expect(description(area)).toContain('Shown after an answer');
    expect(description(area)).toContain('Press Escape, then Tab');
    const toolbar = screen.getByRole('toolbar', { name: 'Formatting' });
    const names = within(toolbar)
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label'));
    expect(names).toEqual([
      'Bold',
      'Italic',
      'Code',
      'Link',
      'Heading',
      'Quote',
      'Bulleted list',
      'Numbered list',
      'Task list',
      'Code block',
      'Image',
    ]);
    expect(within(toolbar).getByRole('button', { name: 'Bold' })).toHaveAttribute(
      'aria-keyshortcuts',
      `${mod}+B`,
    );
  });

  it('leaves out the toolbar with hasToolbar={false}', () => {
    render(<MarkdownEditor label="Explanation" hasToolbar={false} />);
    expect(screen.queryByRole('toolbar')).toBeNull();
  });

  it.skipIf(!isDesktop)(
    'shows a split preview that matches the Markdown component (list and fenced JSON)',
    async () => {
      const { container } = render(
        <>
          <MarkdownEditor label="Explanation" defaultValue={newtonMarkdown} />
          <div data-testid="reference">
            <Markdown isFullWidth>{newtonMarkdown}</Markdown>
          </div>
        </>,
      );
      const preview = screen.getByRole('region', { name: 'Preview' });
      const reference = screen.getByTestId('reference');
      const tags = (root: Element) =>
        Array.from(root.querySelectorAll('*'), (element) => element.tagName).join(' ');
      expect(preview.textContent).toBe(reference.textContent);
      expect(tags(preview)).toBe(tags(reference));
      expect(within(preview).getAllByRole('listitem').length).toBe(8);
      expect(within(preview).getByRole('figure', { name: 'json code' }).textContent).toEqual(
        expect.stringContaining('"acceleration_ms2": 3.0'),
      );
      await expectNoAxeViolations(container);
    },
  );

  it('updates the preview and calls onChange as you type', async () => {
    const onChange = vi.fn();
    render(<MarkdownEditor label="Explanation" layout="split" onChange={onChange} />);
    await userEvent.type(editor(), '**F = ma**');
    expect(onChange).toHaveBeenLastCalledWith('**F = ma**');
    if (isDesktop) {
      const preview = screen.getByRole('region', { name: 'Preview' });
      await expect.poll(() => preview.querySelector('strong')?.textContent).toBe('F = ma');
    }
  });

  it('switches split to Write / Preview tabs in a narrow container', async () => {
    const { container } = render(
      <div style={{ width: 340 }}>
        <MarkdownEditor label="Explanation" defaultValue={newtonMarkdown} />
      </div>,
    );
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Write', 'Preview']);
    expect(screen.getByRole('tablist', { name: 'View' })).toBeInTheDocument();
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    await expectNoAxeViolations(container);

    if (hasTouch) {
      await commands.tap('[role="tab"]:last-of-type');
    } else {
      await userEvent.click(screen.getByRole('tab', { name: 'Preview' }));
    }
    const panel = screen.getByRole('tabpanel', { name: 'Preview' });
    expect(within(panel).getByRole('heading', { name: "Newton's second law" })).toBeInTheDocument();
    // The editor stays mounted (hidden) behind the Preview tab.
    expect(container.querySelector('textarea')?.value).toBe(newtonMarkdown);
    await expectNoAxeViolations(container);
  });

  it('opens on the Preview tab with defaultSelectedTab', () => {
    render(
      <MarkdownEditor
        label="Explanation"
        layout="tabs"
        defaultSelectedTab="preview"
        defaultValue="Hi"
      />,
    );
    expect(screen.getByRole('tab', { name: 'Preview' })).toHaveAttribute('aria-selected', 'true');
  });

  it('shows only the editor with layout="editor"', () => {
    render(<MarkdownEditor label="Explanation" layout="editor" defaultValue="Hi" />);
    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.queryByRole('region', { name: 'Preview' })).toBeNull();
  });

  it.skipIf(!isDesktop)('continues lists on Enter and ends them on an empty item', async () => {
    render(<MarkdownEditor label="Explanation" layout="editor" />);
    const area = editor();
    await userEvent.click(area);
    await userEvent.keyboard('- mass{Enter}force{Enter}{Enter}1. push{Enter}pull{Enter}');
    await userEvent.keyboard('{Enter}- [[x] calibrate{Enter}repeat');
    expect(area.value).toBe('- mass\n- force\n\n1. push\n2. pull\n\n- [x] calibrate\n- [ ] repeat');
  });

  it.skipIf(!isDesktop)(
    'indents and outdents list items with Tab, and lets Tab move on outside lists or after Escape',
    async () => {
      render(
        <>
          <MarkdownEditor label="Explanation" layout="editor" defaultValue={'- mass\n- force'} />
          <button type="button">After</button>
        </>,
      );
      const area = editor();
      caretAtEnd(area);
      await userEvent.keyboard('{Tab}');
      expect(area.value).toBe('- mass\n  - force');
      expect(area).toHaveFocus();
      expect(
        await screen.findByText('Tab indents. Press Esc, then Tab, to move on.'),
      ).toBeInTheDocument();
      await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
      expect(area.value).toBe('- mass\n- force');

      // Escape releases the next Tab, which leaves the editor.
      await userEvent.keyboard('{Escape}');
      expect(await screen.findByText('Tab now moves to the next control.')).toBeInTheDocument();
      await userEvent.keyboard('{Tab}');
      expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
      expect(area.value).toBe('- mass\n- force');

      // Outside a list, Tab moves focus as usual.
      caretAtEnd(area);
      await userEvent.keyboard('{Enter}{Enter}plain');
      await userEvent.keyboard('{Tab}');
      expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
    },
  );

  it.skipIf(!isDesktop)(
    'wraps the selection from the toolbar and from shortcuts, and native undo reverts it',
    async () => {
      render(<MarkdownEditor label="Explanation" layout="editor" defaultValue="F equals m a" />);
      const area = editor();
      select(area, 0, 1);
      await userEvent.click(screen.getByRole('button', { name: 'Bold' }));
      expect(area.value).toBe('**F** equals m a');
      expect(area).toHaveFocus();
      expect(area.value.slice(area.selectionStart, area.selectionEnd)).toBe('F');

      await userEvent.keyboard(`{${mod}>}z{/${mod}}`);
      expect(area.value).toBe('F equals m a');

      select(area, 2, 8);
      await userEvent.keyboard(`{${mod}>}i{/${mod}}`);
      expect(area.value).toBe('F _equals_ m a');
      caretAtEnd(area);
      await userEvent.keyboard(`{${mod}>}{Shift>}8{/Shift}{/${mod}}`);
      expect(area.value).toBe('- F _equals_ m a');
      await userEvent.keyboard(`{${mod}>}k{/${mod}}`);
      expect(area.value).toBe('- F _equals_ m a[](url)');
    },
  );

  it.skipIf(!isDesktop)('moves through the toolbar with arrow keys (one tab stop)', async () => {
    render(<MarkdownEditor label="Explanation" layout="editor" />);
    await userEvent.keyboard('{Tab}');
    expect(screen.getByRole('button', { name: 'Bold' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: 'Italic' })).toHaveFocus();
    await userEvent.keyboard('{Tab}');
    expect(editor()).toHaveFocus();
  });

  it.skipIf(!hasTouch)('applies formatting with a touch tap', async () => {
    render(<MarkdownEditor label="Explanation" layout="editor" defaultValue="mass" />);
    const area = editor();
    select(area, 0, 4);
    await commands.tap('button[aria-label="Code"]');
    await expect.poll(() => area.value).toBe('`mass`');
  });

  it('uploads a pasted image through a placeholder', async () => {
    const upload = deferred();
    const uploadImage = vi.fn(() => upload.promise);
    render(<MarkdownEditor label="Explanation" layout="editor" uploadImage={uploadImage} />);
    const area = editor();
    area.focus();
    const data = new DataTransfer();
    data.items.add(imageFile());
    area.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
    );
    expect(uploadImage).toHaveBeenCalledWith(expect.objectContaining({ name: 'cart.png' }));
    await expect.poll(() => area.value).toBe('![Uploading cart.png…]()');
    upload.resolve({ src: 'https://example.com/cart.png' });
    await expect.poll(() => area.value).toBe('![cart](https://example.com/cart.png)');
  });

  it('uploads a dropped image with the alt text the upload returns, and reports failures', async () => {
    const first = deferred();
    const second = deferred();
    const uploadImage = vi
      .fn<(file: File) => Promise<UploadedImage>>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    render(
      <MarkdownEditor
        label="Explanation"
        layout="editor"
        defaultValue="Setup: "
        uploadImage={uploadImage}
      />,
    );
    const area = editor();
    caretAtEnd(area);
    const data = new DataTransfer();
    data.items.add(imageFile('track.png'));
    area.dispatchEvent(
      new DragEvent('drop', { dataTransfer: data, bubbles: true, cancelable: true }),
    );
    first.resolve({ src: '/track.png', alt: 'The air track' });
    await expect.poll(() => area.value).toBe('Setup: ![The air track](/track.png)');

    caretAtEnd(area);
    const again = new DataTransfer();
    again.items.add(imageFile('broken.png'));
    area.dispatchEvent(
      new DragEvent('drop', { dataTransfer: again, bubbles: true, cancelable: true }),
    );
    second.reject(new Error('offline'));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Couldn’t upload broken.png. Try again.',
    );
    expect(area.value).toBe('Setup: ![The air track](/track.png)');
  });

  it('uploads images chosen from the toolbar’s image button', async () => {
    const uploadImage = vi.fn(() => Promise.resolve({ src: '/moon.png', alt: 'The Moon' }));
    const { container } = render(
      <MarkdownEditor label="Explanation" layout="editor" uploadImage={uploadImage} />,
    );
    const input = container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).not.toBeNull();
    expect(input?.getAttribute('accept')).toBe('image/*');
    if (input) {
      await userEvent.upload(input, imageFile('moon.png'));
    }
    await expect.poll(() => editor().value).toBe('![The Moon](/moon.png)');
  });

  it('inserts image syntax to fill in when there is no uploadImage', async () => {
    render(<MarkdownEditor label="Explanation" layout="editor" defaultValue="cart" />);
    const area = editor();
    select(area, 0, 4);
    if (hasTouch) {
      await commands.tap('button[aria-label="Image"]');
    } else {
      await userEvent.click(screen.getByRole('button', { name: 'Image' }));
    }
    await expect.poll(() => area.value).toBe('![cart](url)');
  });

  it('shows a character count with hasCharacterCount and maxLength', async () => {
    render(
      <MarkdownEditor
        label="Explanation"
        layout="editor"
        hasCharacterCount
        maxLength={200}
        defaultValue="Hi"
      />,
    );
    const area = editor();
    expect(area).toHaveAttribute('maxlength', '200');
    expect(screen.getByText('2 / 200')).toBeInTheDocument();
    expect(description(area)).toContain('2 / 200');
    await userEvent.type(area, '!');
    expect(screen.getByText('3 / 200')).toBeInTheDocument();
  });

  it('disables the toolbar when disabled or read-only, and shows field errors', () => {
    const { unmount } = render(<MarkdownEditor label="Explanation" isDisabled />);
    expect(editor()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Bold' })).toBeDisabled();
    unmount();

    render(
      <MarkdownEditor
        label="Explanation"
        isReadOnly
        isInvalid
        isRequired
        errorMessage="Write an explanation"
      />,
    );
    expect(editor()).toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: 'Bold' })).toBeDisabled();
    expect(description(editor())).toContain('Write an explanation');
  });

  it('works controlled', async () => {
    function Controlled() {
      const [value, setValue] = useState('- one');
      return (
        <>
          <MarkdownEditor label="Explanation" layout="editor" value={value} onChange={setValue} />
          <output>{value}</output>
        </>
      );
    }
    render(<Controlled />);
    const area = editor();
    caretAtEnd(area);
    await userEvent.keyboard('{Enter}two');
    expect(screen.getByRole('status').textContent).toBe('- one\n- two');
  });

  it.skipIf(!isDesktop)('keeps the preview scrolled in step with the editor', async () => {
    const long = Array.from({ length: 60 }, (_, index) => `Line ${String(index + 1)}\n`).join('\n');
    render(<MarkdownEditor label="Explanation" defaultValue={long} maxRows={6} />);
    const area = editor();
    const preview = screen.getByRole('region', { name: 'Preview' });
    area.scrollTop = area.scrollHeight;
    await expect
      .poll(() => preview.scrollTop)
      .toBeGreaterThan(preview.scrollHeight - preview.clientHeight - 2);
    // Let the preview's own scroll event (the echo of being synced) pass first.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    preview.scrollTop = 0;
    await expect.poll(() => area.scrollTop).toBeLessThan(2);
  });

  it('takes the app’s strings from UIProvider', () => {
    // A plain object until MarkdownEditorMessages joins the Messages union that UIProvider's type lists.
    const germanMessages = {
      markdownEditorToolbar: 'Formatierung',
      markdownEditorBold: 'Fett',
      markdownEditorWrite: 'Schreiben',
      markdownEditorPreview: 'Vorschau',
    } satisfies Partial<MarkdownEditorMessages> as unknown as Partial<Messages>;
    render(
      <UIProvider messages={germanMessages}>
        <MarkdownEditor label="Erklärung" layout="tabs" />
      </UIProvider>,
    );
    expect(screen.getByRole('toolbar', { name: 'Formatierung' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fett' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Vorschau' })).toBeInTheDocument();
  });

  it('never scrolls the page sideways', () => {
    render(
      <div style={{ padding: 8 }}>
        <MarkdownEditor label="Explanation" defaultValue={newtonMarkdown} />
      </div>,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });
});
