import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { findAstronomers, tidesArticleWithImages } from '../../test/editorArticle';
import { googleDocsClipboard } from '../../test/googleDocs';
import type { Messages } from '../provider/messages';
import { UIProvider } from '../provider/UIProvider';
import { isApplePlatform } from './actions';
import type { EditorFeature, EditorFormat } from './features';
import type { EditorMessages } from './messages';
import { RichTextEditor, type RichTextEditorProps } from './RichTextEditor';

const isDesktop = window.innerWidth >= 1024;
const isPhone = window.innerWidth < 640;
const isTouch = navigator.maxTouchPoints > 0;
const mod = isApplePlatform() ? 'Meta' : 'Control';

function Editor({
  initial = '',
  format = 'markdown',
  ...props
}: Partial<RichTextEditorProps> & { initial?: string; format?: EditorFormat }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <RichTextEditor label="Notes" format={format} value={value} onChange={setValue} {...props} />
      <output data-testid="value">{value}</output>
    </>
  );
}

const value = () => screen.getByTestId('value').textContent;
const editable = () => screen.getByRole('textbox', { name: 'Notes' });

async function focusEnd() {
  await userEvent.click(editable());
  await userEvent.keyboard(`{${mod}>}{End}{/${mod}}`);
}

/** Pastes HTML (and its plain text) into the editor as the browser would. */
function paste(html: string, text = '') {
  const data = new DataTransfer();
  data.setData('text/html', html);
  data.setData('text/plain', text);
  editable().dispatchEvent(
    new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
  );
}

describe('RichTextEditor', () => {
  it('is a labelled, multi-line text box with a formatting toolbar', async () => {
    const { container } = render(
      <Editor initial="Hello **Moon**" description="Shown on the observing log." isRequired />,
    );
    const textbox = editable();
    expect(textbox).toHaveAttribute('aria-multiline', 'true');
    expect(textbox).toHaveAttribute('aria-required', 'true');
    expect(textbox).toHaveAccessibleDescription('Shown on the observing log.');
    const toolbar = screen.getByRole('toolbar', { name: 'Formatting' });
    expect(within(toolbar).getByRole('button', { name: 'Bold' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(
      within(toolbar).getByRole('button', { name: 'Bold' }).getAttribute('aria-keyshortcuts'),
    ).toMatch(/^(Meta|Control)\+B$/);
    expect(textbox.querySelector('strong, .font-semibold')?.textContent).toBe('Moon');
    await expectNoAxeViolations(container);
  });

  it('shows a long article with every block accessibly', async () => {
    const { container } = render(
      <RichTextEditor
        label="Notes"
        format="markdown"
        defaultValue={tidesArticleWithImages}
        maxHeight="20rem"
      />,
    );
    const textbox = editable();
    expect(textbox.querySelectorAll('h2')).toHaveLength(9);
    expect(textbox.querySelectorAll('img[alt]')).toHaveLength(3);
    expect(textbox.querySelectorAll('table tr')).toHaveLength(6);
    await expect
      .poll(() => textbox.querySelector('code[data-language] .text-code-keyword')?.textContent)
      .toBe('import');
    expect(within(textbox).getAllByRole('checkbox')).toHaveLength(5);
    expect(within(textbox).getAllByRole('checkbox', { checked: true })).toHaveLength(2);
    // Checklist items are Lexical's <li role="checkbox" aria-checked> (their list is a group, so the list rule
    // holds), announced as checkboxes with their state; ARIA in HTML doesn't list checkbox among <li>'s roles, which
    // axe's best-practice aria-allowed-role reports.
    await expectNoAxeViolations(container, { disabledRules: ['aria-allowed-role'] });
  });

  it('wires the error message when invalid', () => {
    render(<Editor isInvalid errorMessage="Write something first." />);
    expect(editable()).toHaveAttribute('aria-invalid', 'true');
    expect(editable()).toHaveAccessibleErrorMessage('Write something first.');
  });

  it.skipIf(!isDesktop)('ticks a checklist item with the command key and Enter', async () => {
    render(<Editor initial="- [ ] Calibrate the gauge" />);
    await focusEnd();
    await userEvent.keyboard(`{${mod}>}{Enter}{/${mod}}`);
    await expect.poll(value).toBe('- [x] Calibrate the gauge');
  });

  it('reports typing as Markdown', async () => {
    render(<Editor />);
    await focusEnd();
    await userEvent.keyboard('Tides rise twice a day');
    await expect.poll(value).toBe('Tides rise twice a day');
  });

  it('turns Markdown shortcuts into blocks as you type', async () => {
    render(<Editor />);
    await focusEnd();
    await userEvent.keyboard('# Tides{Enter}- first{Enter}second{Enter}{Enter}**bold** text');
    await expect.poll(value).toBe('# Tides\n\n- first\n- second\n\n**bold** text');
    expect(editable().querySelector('h1')?.textContent).toBe('Tides');
  });

  it.skipIf(!isDesktop)('applies formatting from the toolbar and shows it as pressed', async () => {
    render(<Editor initial="Spring tide" />);
    await focusEnd();
    await userEvent.keyboard(`{${mod}>}a{/${mod}}`);
    const bold = screen.getByRole('button', { name: 'Bold' });
    await userEvent.click(bold);
    await expect.poll(value).toBe('**Spring tide**');
    expect(bold).toHaveAttribute('aria-pressed', 'true');
    // The caret stays in the text.
    expect(editable()).toHaveFocus();
  });

  it.skipIf(!isDesktop)('runs every action from its keyboard shortcut', async () => {
    render(<Editor initial="Neap tide" />);
    await focusEnd();
    await userEvent.keyboard(`{${mod}>}a{/${mod}}{${mod}>}{Shift>}x{/Shift}{/${mod}}`);
    await expect.poll(value).toBe('~~Neap tide~~');
    await userEvent.keyboard(`{${mod}>}{Alt>}2{/Alt}{/${mod}}`);
    await expect.poll(value).toBe('## ~~Neap tide~~');
    await userEvent.keyboard(`{${mod}>}{Shift>}8{/Shift}{/${mod}}`);
    await expect.poll(value).toBe('- ~~Neap tide~~');
  });

  it.skipIf(!isDesktop)('moves through the toolbar with arrow keys (one tab stop)', async () => {
    render(<Editor />);
    await userEvent.click(editable());
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    const toolbar = screen.getByRole('toolbar');
    expect(toolbar.contains(document.activeElement)).toBe(true);
    // Shift+Tab from the text lands on the last button; arrows move along.
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Divider' }));
    await userEvent.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Table' }));
    // Tab leaves the toolbar in one step.
    await userEvent.keyboard('{Tab}');
    expect(toolbar.contains(document.activeElement)).toBe(false);
  });

  it.skipIf(!isTouch)('applies formatting with a touch tap', async () => {
    render(<Editor initial="Low water" />);
    await userEvent.click(editable());
    await userEvent.keyboard(`{${mod}>}a{/${mod}}`);
    await commands.tap('[aria-label="Italic"]');
    await expect.poll(value).toBe('*Low water*');
  });

  it('keeps only allowed formatting from a Google Docs paste', async () => {
    render(<Editor features={['bold', 'italic', 'link', 'list', 'heading']} />);
    await focusEnd();
    paste(googleDocsClipboard, 'Observing the Moon');
    await expect
      .poll(value)
      .toBe(
        [
          '## Observing the Moon',
          '',
          'The Moon is **easiest** to watch near the *terminator*, where shadows are long (not at full moon)1. Read the [observing guide](https://example.com/moon-guide) and run focus --auto.',
          '',
          '- Binoculars',
          '- **A small telescope**',
          '',
          '**Phase**',
          '',
          '**Best for**',
          '',
          'First quarter',
          '',
          'Craters',
        ].join('\n'),
      );
    expect((window as { pasted?: boolean }).pasted).toBeUndefined();
    expect(editable().querySelector('[style*="color"], script, style, img')).toBeNull();
  });

  it('loads a new value from the app without reporting it back', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <RichTextEditor label="Notes" format="markdown" value="First" onChange={onChange} />,
    );
    rerender(
      <RichTextEditor label="Notes" format="markdown" value="# Second" onChange={onChange} />,
    );
    await expect.poll(() => editable().querySelector('h1')?.textContent).toBe('Second');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('stores sanitised HTML', async () => {
    render(<Editor format="html" initial="<p>Hi <b>there</b></p>" />);
    await focusEnd();
    await userEvent.keyboard('!');
    // Typing at the end of bold text continues it.
    await expect.poll(value).toBe('<p>Hi <strong>there!</strong></p>');
  });

  it('stores Lexical JSON', async () => {
    render(<Editor format="json" />);
    await focusEnd();
    await userEvent.keyboard('Io');
    await expect.poll(() => (JSON.parse(value() || '{}') as { root?: unknown }).root).toBeDefined();
    expect(value()).toContain('"text": "Io"');
  });

  it('loads a stored JSON document', async () => {
    const json = JSON.stringify({
      root: {
        type: 'root',
        version: 1,
        direction: null,
        format: '',
        indent: 0,
        children: [
          {
            type: 'heading',
            tag: 'h2',
            version: 1,
            direction: null,
            format: '',
            indent: 0,
            children: [
              {
                type: 'text',
                text: 'Europa',
                version: 1,
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
              },
            ],
          },
        ],
      },
    });
    render(<RichTextEditor label="Notes" format="json" defaultValue={json} />);
    await expect.poll(() => editable().querySelector('h2')?.textContent).toBe('Europa');
  });

  it.skipIf(!isDesktop)('adds a link through the link popover', async () => {
    render(<Editor initial="Read the guide" />);
    await focusEnd();
    await userEvent.keyboard(`{${mod}>}a{/${mod}}`);
    await userEvent.click(screen.getByRole('button', { name: 'Link' }));
    const address = await screen.findByRole('textbox', { name: 'Web address' });
    await userEvent.clear(address);
    await userEvent.type(address, 'javascript:alert(1)');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(address).toHaveAttribute('aria-invalid', 'true');
    await userEvent.clear(address);
    await userEvent.type(address, 'https://example.com/guide{Enter}');
    await expect.poll(value).toBe('[Read the guide](https://example.com/guide)');
    // The popover shows the link at the caret, through the app's LinkComponent, and can remove it.
    await userEvent.click(screen.getByRole('button', { name: 'Link' }));
    expect(await screen.findByRole('link', { name: 'Open link' })).toHaveAttribute(
      'href',
      'https://example.com/guide',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Remove link' }));
    await expect.poll(value).toBe('Read the guide');
  });

  it.skipIf(!isDesktop)('inserts an image only with alt text', async () => {
    render(<Editor initial="Tides" />);
    await focusEnd();
    await userEvent.click(screen.getByRole('button', { name: 'Image' }));
    const dialog = await screen.findByRole('dialog', { name: 'Insert image' });
    await userEvent.type(
      within(dialog).getByRole('textbox', { name: /Image address/ }),
      'https://example.com/moon.png',
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Insert' }));
    expect(within(dialog).getByRole('textbox', { name: /Alt text/ })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    await userEvent.type(
      within(dialog).getByRole('textbox', { name: /Alt text/ }),
      'The full Moon',
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Insert' }));
    await expect.poll(value).toBe('Tides![The full Moon](https://example.com/moon.png)');
  });

  it('uploads pasted image files and asks for their alt text', async () => {
    const uploadImage = vi.fn(() => Promise.resolve({ src: 'https://example.com/upload/1.png' }));
    render(<Editor uploadImage={uploadImage} />);
    await focusEnd();
    const data = new DataTransfer();
    data.items.add(new File(['png'], 'moon.png', { type: 'image/png' }));
    editable().dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Insert image' });
    expect(uploadImage).toHaveBeenCalledOnce();
    const alt = within(dialog).getByRole('textbox', { name: /Alt text/ });
    await userEvent.type(alt, 'Craters near the terminator');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Insert' }));
    await expect
      .poll(value)
      .toBe('![Craters near the terminator](https://example.com/upload/1.png)');
  });

  it.skipIf(!isDesktop)('inserts blocks from the "/" menu', async () => {
    render(<Editor hasSlashMenu />);
    await focusEnd();
    await userEvent.keyboard('/tab');
    const menu = await screen.findByRole('listbox', { name: 'Insert block' });
    expect(
      within(menu)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Table']);
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => editable().querySelector('table')).not.toBeNull();
    expect(value()).toContain('| --- | --- | --- |');
  });

  it.skipIf(!isDesktop)('mentions people found by loadMentions', async () => {
    const loadMentions = vi.fn(findAstronomers);
    render(<Editor features={['bold', 'mention']} loadMentions={loadMentions} />);
    await focusEnd();
    await userEvent.keyboard('Thanks @ver');
    const menu = await screen.findByRole('listbox', { name: 'People' });
    await expect
      .poll(() => within(menu).queryByRole('option', { name: 'Vera Rubin' }))
      .not.toBeNull();
    expect(loadMentions).toHaveBeenLastCalledWith('ver', expect.any(AbortSignal));
    await userEvent.keyboard('{Enter}');
    await expect.poll(value).toBe('Thanks @Vera Rubin');
  });

  it('leaves out toolbar items for features that are off, and underline in Markdown', () => {
    const features: EditorFeature[] = ['bold', 'underline', 'link'];
    render(<Editor features={features} />);
    const toolbar = screen.getByRole('toolbar');
    expect(within(toolbar).getByRole('button', { name: 'Bold' })).toBeInTheDocument();
    expect(within(toolbar).queryByRole('button', { name: 'Underline' })).toBeNull();
    expect(within(toolbar).queryByRole('button', { name: 'Table' })).toBeNull();
  });

  it('is read-only without a toolbar, and disabled with a disabled one', () => {
    render(
      <>
        <RichTextEditor label="Read" format="markdown" isReadOnly defaultValue="Fixed" />
        <RichTextEditor label="Off" format="markdown" isDisabled defaultValue="Off" />
      </>,
    );
    const read = screen.getByRole('textbox', { name: 'Read' });
    expect(read).toHaveAttribute('aria-readonly', 'true');
    expect(read).toHaveAttribute('tabindex', '0');
    expect(screen.getAllByRole('toolbar')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Bold' })).toBeDisabled();
  });

  it.skipIf(!isDesktop)('edits an image’s alt text with Enter', async () => {
    render(<Editor initial="![A crater](https://example.com/crater.png)" />);
    await userEvent.click(screen.getByRole('img', { name: 'A crater' }));
    await userEvent.keyboard('{Enter}');
    const dialog = await screen.findByRole('dialog', { name: 'Image description' });
    const alt = within(dialog).getByRole('textbox', { name: /Alt text/ });
    expect(alt).toHaveValue('A crater');
    await userEvent.clear(alt);
    await userEvent.type(alt, 'Copernicus crater at sunrise');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await expect
      .poll(value)
      .toBe('![Copernicus crater at sunrise](https://example.com/crater.png)');
  });

  it('submits the document with a form through `name`', async () => {
    const { container } = render(<Editor name="body" initial="Draft" />);
    await focusEnd();
    await userEvent.keyboard(' two');
    await expect
      .poll(() => container.querySelector<HTMLInputElement>('input[name="body"]')?.value)
      .toBe('Draft two');
  });

  it('takes the app’s strings from UIProvider', () => {
    // A plain object until EditorMessages joins the Messages union that UIProvider's type lists.
    const frenchMessages = {
      editorToolbar: 'Mise en forme',
      editorBold: 'Gras',
    } satisfies Partial<EditorMessages> as unknown as Partial<Messages>;
    render(
      <UIProvider messages={frenchMessages}>
        <RichTextEditor label="Notes" format="markdown" />
      </UIProvider>,
    );
    expect(screen.getByRole('toolbar', { name: 'Mise en forme' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gras' })).toBeInTheDocument();
  });

  it.skipIf(!isPhone)('scrolls the toolbar sideways on a phone without scrolling the page', () => {
    render(
      <div className="p-2">
        <Editor />
      </div>,
    );
    const toolbar = screen.getByRole('toolbar');
    expect(toolbar.scrollWidth).toBeGreaterThan(toolbar.clientWidth);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });
});
