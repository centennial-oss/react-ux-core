import { act, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { chatCommands, loadMentions, screenshotFile } from '../../test/chat';
import type { Messages } from '../provider/messages';
import { UIProvider } from '../provider/UIProvider';
import { Composer, ComposerReplyContext, type ComposerProps } from './Composer';
import type { EmojiDataLoader } from './emojiData';
import type { ChatMessages } from './messages';

const isDesktop = window.innerWidth >= 1024;
const isTouch = window.matchMedia('(pointer: coarse)').matches;

const emojiLoader: EmojiDataLoader = () =>
  Promise.resolve([{ unicode: '🔭', label: 'telescope', hexcode: '1F52D', group: 7 }]);

function textbox() {
  return screen.getByRole('textbox', { name: 'Message' });
}

async function focusAndType(text: string) {
  await userEvent.click(textbox());
  await userEvent.keyboard(text);
}

/** Pastes `files` (and optional text) into the message box, as a clipboard would. */
function paste(files: File[], text = '') {
  const data = new DataTransfer();
  for (const file of files) {
    data.items.add(file);
  }
  if (text !== '') {
    data.setData('text/plain', text);
  }
  // A real ClipboardEvent: Testing Library's paste helper can't carry files.
  act(() => {
    textbox().dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
    );
  });
}

function renderComposer(props: Partial<ComposerProps> = {}) {
  const onSubmit = props.onSubmit ?? vi.fn();
  // Room above for the suggestions, which open upwards (a composer sits at the bottom of a chat).
  render(
    <div className="p-2 pt-72">
      <Composer
        loadMentions={loadMentions}
        commands={chatCommands}
        hasAttachments
        hasEmoji
        loadEmojiData={emojiLoader}
        {...props}
        onSubmit={onSubmit}
      />
    </div>,
  );
  return onSubmit;
}

describe('Composer', () => {
  it.skipIf(!isDesktop)(
    'suggests "Ada" for "@ad", inserts the mention with Enter, and reports it on send',
    async () => {
      const onSubmit = renderComposer();
      await focusAndType('Thanks @ad');
      const list = await screen.findByRole('listbox', { name: 'People' });
      expect(
        within(list)
          .getAllByRole('option')
          .map((option) => option.textContent),
      ).toEqual(['Ada']);
      expect(textbox()).toHaveAttribute('aria-controls', list.id);
      expect(textbox()).toHaveAttribute('aria-activedescendant');
      await userEvent.keyboard('{Enter}');
      expect(textbox()).toHaveValue('Thanks @Ada ');
      expect(screen.queryByRole('listbox')).toBeNull();
      expect(onSubmit).not.toHaveBeenCalled();
      await userEvent.keyboard('for the flats{Enter}');
      expect(onSubmit).toHaveBeenCalledWith({
        text: 'Thanks @Ada for the flats',
        attachments: [],
        mentions: ['ada'],
      });
      await expect.poll(() => textbox()).toHaveValue('');
    },
  );

  it.skipIf(!isTouch)('inserts a mention when its suggestion is tapped', async () => {
    renderComposer();
    await focusAndType('@gr');
    const option = await screen.findByRole('option', { name: 'Grace' });
    option.setAttribute('data-testid', 'grace');
    await commands.tap('[data-testid="grace"]');
    expect(textbox()).toHaveValue('@Grace ');
  });

  it.skipIf(!isDesktop)(
    'adds a new line with Shift+Enter, and closes suggestions with Escape',
    async () => {
      const onSubmit = renderComposer();
      await focusAndType('Clear skies{Shift>}{Enter}{/Shift}tonight');
      expect(textbox()).toHaveValue('Clear skies\ntonight');
      expect(onSubmit).not.toHaveBeenCalled();
      await userEvent.keyboard(' @');
      expect(await screen.findByRole('listbox', { name: 'People' })).toBeInTheDocument();
      await userEvent.keyboard('{Escape}');
      expect(screen.queryByRole('listbox')).toBeNull();
    },
  );

  it.skipIf(!isDesktop)('sends with Ctrl+Enter when sendKey is mod-enter', async () => {
    const onSubmit = renderComposer({ sendKey: 'mod-enter' });
    await focusAndType('Line one{Enter}line two');
    expect(textbox()).toHaveValue('Line one\nline two');
    await userEvent.keyboard('{Control>}{Enter}{/Control}');
    expect(onSubmit).toHaveBeenCalledWith({
      text: 'Line one\nline two',
      attachments: [],
      mentions: [],
    });
  });

  it.skipIf(!isDesktop)('offers /commands with descriptions and reports the command', async () => {
    const onSubmit = renderComposer();
    await focusAndType('/');
    const list = await screen.findByRole('listbox', { name: 'Commands' });
    expect(within(list).getAllByRole('option')).toHaveLength(3);
    expect(list.textContent).toEqual(expect.stringContaining('Post the latest weather report'));
    await userEvent.keyboard('po{Tab}');
    expect(textbox()).toHaveValue('/poll ');
    await userEvent.keyboard('Which target?{Enter}');
    expect(onSubmit).toHaveBeenCalledWith({
      text: '/poll Which target?',
      attachments: [],
      mentions: [],
      command: 'poll',
    });
  });

  it('attaches a pasted screenshot, lists it with a remove button, and sends it', async () => {
    const onSubmit = renderComposer();
    const screenshot = await screenshotFile();
    paste([screenshot]);
    const list = await screen.findByRole('list', { name: 'Files to send' });
    expect(within(list).getByText('guider-screenshot.png')).toBeInTheDocument();
    expect(document.querySelector('[aria-live="polite"]:not([role])')?.textContent).toBe(
      '1 file attached',
    );
    // Text pasted with it still goes in.
    paste([screenshot], 'see attached');
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    const remove = within(list).getAllByRole('button', { name: 'Remove guider-screenshot.png' })[1];
    if (!remove) {
      throw new Error('No remove button');
    }
    if (isTouch) {
      remove.setAttribute('data-testid', 'remove');
      await commands.tap('[data-testid="remove"]');
    } else {
      await userEvent.click(remove);
    }
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    const send = screen.getByRole('button', { name: 'Send' });
    if (isTouch) {
      send.setAttribute('data-testid', 'send');
      await commands.tap('[data-testid="send"]');
    } else {
      await userEvent.click(send);
    }
    expect(onSubmit).toHaveBeenCalledWith({ text: '', attachments: [screenshot], mentions: [] });
    await expect.poll(() => screen.queryByRole('list', { name: 'Files to send' })).toBeNull();
  });

  it('shows a pending state while sending, and keeps the text when sending fails', async () => {
    let reject: (error: Error) => void = () => undefined;
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((_, fail) => {
          reject = fail;
        }),
    );
    renderComposer({ onSubmit, defaultValue: 'Dome closing at dawn' });
    const send = screen.getByRole('button', { name: 'Send' });
    await userEvent.click(send);
    await expect.poll(() => send.getAttribute('aria-busy')).toBe('true');
    expect(textbox()).toHaveAttribute('readonly');
    act(() => {
      reject(new Error('offline'));
    });
    const alert = await screen.findByText(/Couldn’t send the message/);
    expect(alert).toHaveAttribute('role', 'alert');
    expect(textbox()).toHaveValue('Dome closing at dawn');
    expect(textbox()).not.toHaveAttribute('readonly');
  });

  it('counts toward maxLength, and can be disabled', () => {
    const { unmount } = render(
      <Composer onSubmit={vi.fn()} maxLength={20} defaultValue={'x'.repeat(18)} />,
    );
    expect(screen.getByText('18 / 20')).toBeInTheDocument();
    unmount();
    render(<Composer onSubmit={vi.fn()} isDisabled hasAttachments />);
    expect(textbox()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Attach files' })).toBeDisabled();
  });

  it('shows a reply context with a cancel button', async () => {
    const onCancel = vi.fn();
    render(
      <Composer
        onSubmit={vi.fn()}
        context={<ComposerReplyContext author="Ada" excerpt="Focus drifted" onCancel={onCancel} />}
      />,
    );
    expect(screen.getByText('Replying to Ada')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel reply' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it.skipIf(!isDesktop)('documents its shortcuts in an InfoTip', async () => {
    renderComposer();
    await userEvent.click(screen.getByRole('button', { name: 'Keyboard shortcuts' }));
    const dialog = await screen.findByRole('dialog', { name: 'Keyboard shortcuts' });
    expect(dialog.textContent).toEqual(expect.stringContaining('ShiftEnterNew line'));
    expect(dialog.textContent).toEqual(expect.stringContaining('@Mention someone'));
  });

  it.skipIf(!isDesktop)('inserts an emoji at the caret from the picker', async () => {
    renderComposer({ defaultValue: 'Clear skies' });
    await userEvent.click(screen.getByRole('button', { name: 'Add emoji' }));
    const dialog = await screen.findByRole('dialog', { name: 'Emoji' });
    await userEvent.click(await within(dialog).findByRole('button', { name: 'telescope' }));
    expect(textbox()).toHaveValue('Clear skies🔭');
    await expect.poll(() => document.activeElement).toBe(textbox());
  });

  it('works controlled', async () => {
    function Controlled() {
      const [value, setValue] = useState('Hello');
      return (
        <>
          <Composer value={value} onChange={setValue} onSubmit={vi.fn()} />
          <output data-testid="value">{value}</output>
        </>
      );
    }
    render(<Controlled />);
    await userEvent.click(textbox());
    await userEvent.keyboard('{End} Grace');
    expect(screen.getByTestId('value').textContent).toBe('Hello Grace');
  });

  it('has no axe violations', async () => {
    renderComposer({
      context: <ComposerReplyContext author="Ada" onCancel={vi.fn()} />,
    });
    paste([await screenshotFile()]);
    await screen.findByRole('list', { name: 'Files to send' });
    const container = textbox().closest('.p-2');
    if (!container) {
      throw new Error('No container');
    }
    await expectNoAxeViolations(container);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });

  it('takes its strings from UIProvider', () => {
    const overrides: Partial<ChatMessages> = { composerLabel: 'Nachricht', composerSend: 'Senden' };
    render(
      <UIProvider messages={overrides as Partial<Messages>}>
        <Composer onSubmit={vi.fn()} />
      </UIProvider>,
    );
    expect(screen.getByRole('textbox', { name: 'Nachricht' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Senden' })).toBeInTheDocument();
  });
});
