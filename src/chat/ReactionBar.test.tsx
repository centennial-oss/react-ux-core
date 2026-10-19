import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import type { Messages } from '../provider/messages';
import { UIProvider } from '../provider/UIProvider';
import type { EmojiDataLoader } from './emojiData';
import type { ChatMessages } from './messages';
import { ReactionBar } from './ReactionBar';
import type { ChatReaction } from './types';

const isTouch = window.matchMedia('(pointer: coarse)').matches;

const loader: EmojiDataLoader = () =>
  Promise.resolve([
    { unicode: '🔭', label: 'telescope', hexcode: '1F52D', group: 7, tags: ['science'] },
    { unicode: '🌙', label: 'crescent moon', hexcode: '1F319', group: 5, tags: ['moon'] },
  ]);

const initial: ChatReaction[] = [
  { emoji: '🔭', count: 1, isMine: false, names: ['Grace Hopper'] },
  { emoji: '👍', count: 2, isMine: true, names: ['Ada Lovelace', 'Edwin Hubble'] },
];

/** A bar that updates its reactions like an app would. */
function Bar({ onToggle }: { onToggle?: (emoji: string) => void }) {
  const [reactions, setReactions] = useState(initial);
  return (
    <ReactionBar
      reactions={reactions}
      loadEmojiData={loader}
      onToggle={(emoji) => {
        onToggle?.(emoji);
        setReactions((current) => {
          const existing = current.find((reaction) => reaction.emoji === emoji);
          if (!existing) {
            return [...current, { emoji, count: 1, isMine: true }];
          }
          return current.map((reaction) =>
            reaction.emoji === emoji
              ? {
                  ...reaction,
                  isMine: !reaction.isMine,
                  count: reaction.count + (reaction.isMine ? -1 : 1),
                }
              : reaction,
          );
        });
      }}
    />
  );
}

async function press(element: HTMLElement, id: string) {
  if (isTouch) {
    element.setAttribute('data-testid', id);
    await commands.tap(`[data-testid="${id}"]`);
  } else {
    await userEvent.click(element);
  }
}

function live() {
  return screen.getByRole('group', { name: 'Reactions' }).querySelector('[aria-live="polite"]');
}

describe('ReactionBar', () => {
  it('shows toggle buttons with counts and who reacted, quick reactions first', () => {
    render(<Bar />);
    const group = screen.getByRole('group', { name: 'Reactions' });
    const buttons = within(group).getAllByRole('button');
    // 👍 is a default quick reaction, so it comes first.
    expect(buttons[0]).toHaveAttribute('aria-label', '👍: 2 reactions');
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
    expect(buttons[0]).toHaveAccessibleDescription('Ada Lovelace and Edwin Hubble reacted');
    expect(buttons[1]).toHaveAttribute('aria-label', '🔭: 1 reaction');
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'false');
    expect(buttons[2]).toHaveAccessibleName('Add reaction');
  });

  it('toggles a reaction on and off, updating and announcing its count', async () => {
    const onToggle = vi.fn();
    render(<Bar onToggle={onToggle} />);
    const telescope = screen.getByRole('button', { name: '🔭: 1 reaction' });
    await press(telescope, 'telescope');
    expect(onToggle).toHaveBeenCalledWith('🔭');
    expect(telescope).toHaveAttribute('aria-pressed', 'true');
    expect(telescope).toHaveAttribute('aria-label', '🔭: 2 reactions');
    expect(live()?.textContent).toBe('Added 🔭. 2 reactions');
    await press(telescope, 'telescope');
    expect(telescope).toHaveAttribute('aria-pressed', 'false');
    expect(telescope).toHaveAttribute('aria-label', '🔭: 1 reaction');
    expect(live()?.textContent).toBe('Removed 🔭. 1 reaction');
  });

  it('adds a reaction from the picker, with quick reactions first', async () => {
    render(<Bar />);
    await press(screen.getByRole('button', { name: 'Add reaction' }), 'add');
    const dialog = await screen.findByRole('dialog', { name: 'Emoji' });
    const recent = await within(dialog).findByRole('grid', { name: 'Recently used' });
    const quick = within(recent)
      .getAllByRole('button')
      .map((button) => button.textContent);
    expect(quick.slice(0, 5)).toEqual(['👍', '❤️', '😂', '🎉', '👀']);
    // Named by the CLDR names once the data has loaded.
    const moon = await within(dialog).findByRole('button', { name: 'crescent moon' });
    moon.click();
    expect(
      await screen.findByRole('button', { name: 'crescent moon: 1 reaction' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <div className="p-2">
        <Bar />
      </div>,
    );
    await expectNoAxeViolations(container);
  });

  it('takes its strings from UIProvider', () => {
    const overrides: Partial<ChatMessages> = {
      reactionsLabel: 'Réactions',
      reactionLabel: ({ name, count }) => `${name} (${String(count)})`,
    };
    render(
      <UIProvider messages={overrides as Partial<Messages>}>
        <Bar />
      </UIProvider>,
    );
    expect(screen.getByRole('group', { name: 'Réactions' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '👍 (2)' })).toBeInTheDocument();
  });
});
