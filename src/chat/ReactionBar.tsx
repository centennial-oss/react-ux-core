// ReactionBar: a message's reactions as toggle buttons with counts and who reacted, and an add-reaction button that
// opens the EmojiPicker. Toggling announces the new count.
import { useId, useMemo, useRef, type Ref } from 'react';
import { ToggleButton, useLocale } from 'react-aria-components';
import { Tooltip } from '../components/Tooltip/Tooltip';
import { cn } from '../utils/cn';
import { emojiKey, emojiName, type EmojiDataLoader, type SkinTone } from './emojiData';
import { EmojiPickerButton } from './EmojiPicker';
import { useChatMessages } from './messages';
import type { ChatReaction } from './types';

/** The quick reactions MessageList offers by default. */
export const DEFAULT_QUICK_REACTIONS: readonly string[] = ['👍', '❤️', '😂', '🎉', '👀'];

export interface ReactionBarProps {
  reactions: readonly ChatReaction[];
  /** Called with the emoji to add (or remove, when it's already the current user's). */
  onToggle: (emoji: string) => void;
  /** Quick reactions: these come first in the bar, and first in the picker. */
  quick?: readonly string[];
  /** Recently used emoji, shown in the picker after the quick reactions. */
  recent?: readonly string[];
  /** Shows the add-reaction button. Defaults to true. */
  canAdd?: boolean;
  skinTone?: SkinTone;
  onSkinToneChange?: (tone: SkinTone) => void;
  /** Loads the picker's emoji (see EmojiPicker). */
  loadData?: EmojiDataLoader;
  isDisabled?: boolean;
  /** Reports the add-reaction picker opening and closing. */
  onPickerOpenChange?: (isOpen: boolean) => void;
  /** Names the group. Defaults to the `reactionsLabel` message. */
  'aria-label'?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/** Reactions as toggle chips (`aria-pressed`) with counts, who reacted, and a button to add one. */
export function ReactionBar({
  reactions,
  onToggle,
  quick = DEFAULT_QUICK_REACTIONS,
  recent,
  canAdd = true,
  skinTone,
  onSkinToneChange,
  loadData,
  isDisabled = false,
  onPickerOpenChange,
  'aria-label': ariaLabel,
  className,
  ref,
}: ReactionBarProps) {
  const messages = useChatMessages();
  const { locale } = useLocale();
  const baseId = useId();
  const liveRef = useRef<HTMLSpanElement>(null);
  const listFormat = useMemo(
    () => new Intl.ListFormat(locale, { type: 'conjunction', style: 'long' }),
    [locale],
  );

  // Quick reactions first (in their order), then the rest as given.
  const ordered = useMemo(() => {
    const rank = new Map(quick.map((emoji, index) => [emojiKey(emoji), index]));
    return reactions
      .filter((reaction) => reaction.count > 0)
      .map((reaction, index) => ({ reaction, index }))
      .sort((a, b) => {
        const ra = rank.get(emojiKey(a.reaction.emoji)) ?? Infinity;
        const rb = rank.get(emojiKey(b.reaction.emoji)) ?? Infinity;
        return ra === rb ? a.index - b.index : ra - rb;
      })
      .map(({ reaction }) => reaction);
  }, [reactions, quick]);

  const pickerRecent = useMemo(() => {
    const seen = new Set<string>();
    return [...quick, ...(recent ?? [])].filter((emoji) => {
      const key = emojiKey(emoji);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, [quick, recent]);

  const announce = (text: string) => {
    if (liveRef.current) {
      liveRef.current.textContent = text;
    }
  };

  const toggle = (reaction: ChatReaction | undefined, emoji: string) => {
    const name = emojiName(emoji, loadData) ?? emoji;
    const isAdding = !reaction?.isMine;
    const count = Math.max(0, (reaction?.count ?? 0) + (isAdding ? 1 : -1));
    onToggle(emoji);
    announce(
      isAdding
        ? messages.reactionAdded({ name, count })
        : messages.reactionRemoved({ name, count }),
    );
  };

  return (
    <div
      ref={ref}
      role="group"
      aria-label={ariaLabel ?? messages.reactionsLabel}
      className={cn('flex min-w-0 flex-wrap items-center gap-1.5', className)}
    >
      {ordered.map((reaction, index) => {
        const name = emojiName(reaction.emoji, loadData) ?? reaction.emoji;
        const names =
          reaction.names && reaction.names.length > 0
            ? messages.reactionNames({ names: listFormat.format(reaction.names) })
            : undefined;
        const namesId = `${baseId}-${String(index)}`;
        const button = (
          <ToggleButton
            isSelected={reaction.isMine}
            isDisabled={isDisabled}
            onChange={() => {
              toggle(reaction, reaction.emoji);
            }}
            aria-label={messages.reactionLabel({ name, count: reaction.count })}
            aria-describedby={names === undefined ? undefined : namesId}
            className={cn(
              'hit-area relative inline-flex h-7 cursor-pointer items-center gap-1 rounded-full border px-2 text-sm text-fg outline-none select-none',
              'border-border bg-surface-1 data-hovered:bg-surface-3',
              'data-selected:border-accent-border data-selected:bg-accent-bg data-selected:text-accent-fg',
              'data-focus-visible:focus-ring data-disabled:cursor-not-allowed data-disabled:opacity-50',
            )}
          >
            <span aria-hidden="true" className="text-base leading-none">
              {reaction.emoji}
            </span>
            <span aria-hidden="true" className="font-medium tabular-nums">
              {reaction.count}
            </span>
          </ToggleButton>
        );
        return (
          <span key={reaction.emoji} className="relative inline-flex">
            {names === undefined ? (
              button
            ) : (
              <>
                <Tooltip content={names}>{button}</Tooltip>
                <span id={namesId} className="sr-only">
                  {names}
                </span>
              </>
            )}
          </span>
        );
      })}
      {canAdd && (
        <EmojiPickerButton
          label={messages.chatAddReaction}
          isDisabled={isDisabled}
          recent={pickerRecent}
          skinTone={skinTone}
          onSkinToneChange={onSkinToneChange}
          loadData={loadData}
          onOpenChange={onPickerOpenChange}
          onSelect={(emoji) => {
            const existing = reactions.find(
              (reaction) => emojiKey(reaction.emoji) === emojiKey(emoji),
            );
            // Picking an emoji the user already reacted with leaves it on.
            if (existing?.isMine) {
              return;
            }
            toggle(existing, emoji);
          }}
          className="size-7 rounded-full text-fg-muted"
        />
      )}
      <span ref={liveRef} className="sr-only" aria-live="polite" />
    </div>
  );
}
