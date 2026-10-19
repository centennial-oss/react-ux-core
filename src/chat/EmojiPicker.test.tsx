import { act, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import type { Messages } from '../provider/messages';
import { UIProvider } from '../provider/UIProvider';
import type { EmojiDataLoader, EmojiSourceEntry } from './emojiData';
import { EmojiPicker, EmojiPickerButton } from './EmojiPicker';
import type { ChatMessages } from './messages';

const isDesktop = window.innerWidth >= 1024;
const isTouch = window.matchMedia('(pointer: coarse)').matches;
const isPhone = window.matchMedia('(max-width: 639.98px)').matches;

const tones = (base: string, hex: string) =>
  ['1F3FB', '1F3FC', '1F3FD', '1F3FE', '1F3FF'].map((modifier, index) => ({
    unicode: base + String.fromCodePoint(0x1f3fb + index),
    hexcode: `${hex}-${modifier}`,
  }));

/** A small dataset, so the tests don't depend on (or wait for) the full one. */
const smallSet: EmojiSourceEntry[] = [
  ...['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃'].map((unicode, index) => ({
    unicode,
    label: `smiley ${String(index + 1)}`,
    hexcode: String(index),
    group: 0,
    tags: ['face'],
  })),
  {
    unicode: '👍',
    label: 'thumbs up',
    hexcode: '1F44D',
    group: 1,
    tags: ['thumb'],
    skins: tones('👍', '1F44D'),
  },
  {
    unicode: '✋',
    label: 'raised hand',
    hexcode: '270B',
    group: 1,
    tags: ['hand'],
    skins: tones('✋', '270B'),
  },
  { unicode: '🔭', label: 'telescope', hexcode: '1F52D', group: 7, tags: ['science'] },
];

function loader(): EmojiDataLoader {
  return () => Promise.resolve(smallSet);
}

async function findGrid(name: string, options?: { timeout: number }) {
  return screen.findByRole('grid', { name }, options);
}

describe('EmojiPicker', () => {
  it('loads emojibase’s data on first use and finds 👍 when searching "thumb"', async () => {
    const onSelect = vi.fn();
    render(<EmojiPicker onSelect={onSelect} shouldAutoFocus={false} />);
    expect(screen.getByRole('progressbar', { name: 'Loading emoji…' })).toBeInTheDocument();
    expect(await findGrid('Smileys & emotion', { timeout: 10_000 })).toBeInTheDocument();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search emoji' }), 'thumb');
    const results = await findGrid('Search results');
    const thumbsUp = within(results).getByRole('button', { name: 'thumbs up' });
    expect(thumbsUp.textContent).toBe('👍');
    expect(within(results).getByRole('button', { name: 'thumbs down' })).toBeInTheDocument();
    await expect
      .poll(() => document.querySelector('[aria-live="polite"]')?.textContent)
      .toMatch(/emoji$/);
    await userEvent.click(thumbsUp);
    expect(onSelect).toHaveBeenCalledWith('👍');
  });

  it('shows recent emoji first, named by CLDR names, and takes a loader', async () => {
    render(<EmojiPicker onSelect={vi.fn()} recent={['🔭', '👍🏽']} loadEmojiData={loader()} />);
    const recent = await findGrid('Recently used');
    const buttons = within(recent).getAllByRole('button');
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'telescope',
      'thumbs up',
    ]);
    expect(buttons[1]?.textContent).toBe('👍🏽');
    // The search field has focus when the picker appears.
    expect(screen.getByRole('searchbox', { name: 'Search emoji' })).toHaveFocus();
  });

  it.skipIf(!isDesktop)('moves through the grid with the arrow keys', async () => {
    const onSelect = vi.fn();
    render(<EmojiPicker onSelect={onSelect} loadEmojiData={loader()} />);
    const smileys = await findGrid('Smileys & emotion');
    // Down from the search field enters the grid.
    await userEvent.keyboard('{ArrowDown}');
    const cells = within(smileys).getAllByRole('button');
    expect(cells[0]).toHaveFocus();
    expect(cells[0]).toHaveAttribute('tabindex', '0');
    expect(cells[1]).toHaveAttribute('tabindex', '-1');
    await userEvent.keyboard('{ArrowRight}{ArrowDown}');
    // Row 2 has two cells (8 per row), so down from the second cell lands on the tenth.
    expect(cells[9]).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    const people = await findGrid('People & body');
    expect(within(people).getByRole('button', { name: 'raised hand' })).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(within(people).getByRole('button', { name: 'raised hand' })).toHaveFocus();
    await userEvent.keyboard('{Home}{Enter}');
    expect(onSelect).toHaveBeenCalledWith('👍');
  });

  it('changes the skin tone', async () => {
    const onSkinToneChange = vi.fn();
    render(
      <EmojiPicker
        onSelect={vi.fn()}
        onSkinToneChange={onSkinToneChange}
        loadEmojiData={loader()}
        shouldAutoFocus={false}
      />,
    );
    const people = await findGrid('People & body');
    expect(within(people).getByRole('button', { name: 'thumbs up' }).textContent).toBe('👍');
    // The radio input is visually hidden; its label is what's pressed.
    const tone = screen.getByRole('radio', { name: 'Medium skin tone' }).closest('label');
    if (!tone) {
      throw new Error('No label');
    }
    if (isTouch) {
      tone.setAttribute('data-testid', 'tone');
      await commands.tap('[data-testid="tone"]');
    } else {
      await userEvent.click(tone);
    }
    expect(onSkinToneChange).toHaveBeenCalledWith(4);
    expect(within(people).getByRole('button', { name: 'thumbs up' }).textContent).toBe('👍🏽');
  });

  it('jumps to a category', async () => {
    render(<EmojiPicker onSelect={vi.fn()} loadEmojiData={loader()} shouldAutoFocus={false} />);
    await findGrid('Objects');
    await userEvent.click(screen.getByRole('button', { name: 'Objects' }));
    const heading = screen.getByRole('heading', { name: 'Objects' });
    await expect
      .poll(() => {
        const scroller = heading.closest('.overflow-y-auto');
        if (!scroller) {
          return false;
        }
        return scroller.scrollTop > 0 || scroller.scrollHeight <= scroller.clientHeight;
      })
      .toBe(true);
  });

  it('says when nothing matches, and retries a failed load', async () => {
    let attempts = 0;
    const flaky: EmojiDataLoader = () => {
      attempts += 1;
      return attempts === 1 ? Promise.reject(new Error('offline')) : Promise.resolve(smallSet);
    };
    render(<EmojiPicker onSelect={vi.fn()} loadEmojiData={flaky} shouldAutoFocus={false} />);
    expect(await screen.findByText('Couldn’t load the emoji.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await findGrid('Smileys & emotion');
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search emoji' }), 'zebra');
    expect(await screen.findByText('No emoji found', { selector: 'p' })).toBeInTheDocument();
  });

  it('opens from EmojiPickerButton in a popover (a sheet on phones) and closes on choosing', async () => {
    const onSelect = vi.fn();
    render(<EmojiPickerButton onSelect={onSelect} loadEmojiData={loader()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add emoji' }));
    const dialog = await screen.findByRole('dialog', { name: 'Emoji' });
    expect(dialog.closest('[data-position="bottom"]') !== null).toBe(isPhone);
    const telescope = await within(dialog).findByRole('button', { name: 'telescope' });
    if (isPhone) {
      // The sheet slides in (a scroll-driven animation), so Playwright never sees the button as stable.
      act(() => {
        telescope.click();
      });
    } else {
      await userEvent.click(telescope);
    }
    expect(onSelect).toHaveBeenCalledWith('🔭');
    await expect.poll(() => screen.queryByRole('dialog')).toBeNull();
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <div className="p-2">
        <EmojiPicker onSelect={vi.fn()} recent={['🔭']} loadEmojiData={loader()} />
      </div>,
    );
    await findGrid('Recently used');
    await expectNoAxeViolations(container);
  });

  it('takes its strings from UIProvider', async () => {
    const overrides: Partial<ChatMessages> = {
      emojiSearch: 'Chercher',
      emojiGroupObjects: 'Objets',
    };
    render(
      <UIProvider messages={overrides as Partial<Messages>}>
        <EmojiPicker onSelect={vi.fn()} loadEmojiData={loader()} shouldAutoFocus={false} />
      </UIProvider>,
    );
    expect(screen.getByRole('searchbox', { name: 'Chercher' })).toBeInTheDocument();
    expect(await findGrid('Objets')).toBeInTheDocument();
    act(() => {
      screen.getByRole('searchbox').blur();
    });
  });
});
