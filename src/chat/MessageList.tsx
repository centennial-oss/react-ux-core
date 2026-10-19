// MessageList: a bottom-anchored, virtualised chat transcript (10k+ messages). Messages are grouped by author within
// five minutes, with day separators and a "New messages" divider; the view follows the newest message until scrolled
// up, then offers "Jump to latest (N new)". Older messages load at the top without moving the view, and a streaming
// reply grows without making the scroll jump.
//
// Accessibility: a `log` region with `aria-live="off"` (a virtualised log would otherwise read out rows as they
// mount); new messages from others are announced through a separate polite live region instead, which
// `shouldAnnounce` turns off. Up and Down move focus between messages (Home and End to the ends, Escape back to the
// log); a focused or hovered message shows its actions toolbar.
import { defaultRangeExtractor, useVirtualizer } from '@tanstack/react-virtual';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { useLocale } from 'react-aria-components';
import { LiveRegion, useAnnouncer } from '../components/LiveRegion/LiveRegion';
import { useTimeZone } from '../provider/context';
import { cn } from '../utils/cn';
import { toggleInSet } from '../utils/collections';
import { dateTimeFormat } from '../utils/intl';
import { JumpToLatestButton } from '../utils/JumpToLatestButton';
import { useFollowScroll } from '../utils/useFollowScroll';
import type { EmojiDataLoader, SkinTone } from './emojiData';
import { MessageRow, type RowContext } from './MessageRow';
import { useChatMessages } from './messages';
import { DEFAULT_QUICK_REACTIONS } from './ReactionBar';
import { buildRows, dayKey, daysBetween, plainExcerpt, type ChatRow } from './rows';
import type { ChatMessage, ChatTypist } from './types';
import { TypingIndicator } from './TypingIndicator';

/** Estimated row heights in pixels; real heights are measured. */
const ESTIMATES: Record<ChatRow['kind'], number> = {
  older: 44,
  day: 40,
  unread: 32,
  message: 64,
};
/** How close to the bottom (in pixels) still counts as "at the newest message". */
const FOLLOW_THRESHOLD = 24;
/** Older messages load when the view is this close to the top (in pixels). */
const LOAD_OLDER_THRESHOLD = 240;

export interface MessageListProps {
  /** Oldest first. */
  messages: readonly ChatMessage[];
  /** The current user: their messages sit on the end side and show their delivery status. */
  currentUserId: string;
  /** Loads older messages when scrolled to the top (or the "Load older messages" button is pressed). */
  onLoadOlder?: () => void;
  /** Whether there are older messages to load. */
  hasOlder?: boolean;
  /** Shows that older messages are loading (and holds off further `onLoadOlder` calls). */
  isLoadingOlder?: boolean;
  /** The first unread message's id; draws a "New messages" divider above it. */
  firstUnreadId?: string;
  /** Who's typing, shown under the list. */
  typing?: readonly ChatTypist[];
  /** Adds or removes the current user's reaction. Without it, reactions show but can't be changed. */
  onReact?: (messageId: string, emoji: string) => void;
  onReply?: (messageId: string) => void;
  /** Resends a failed message. */
  onRetry?: (messageId: string) => void;
  /** Message actions (`MenuItem`s), such as edit, delete or copy link, in each message's "more" menu. */
  messageActions?: (message: ChatMessage) => ReactNode;
  /** Reactions offered first in the add-reaction picker. Defaults to 👍 ❤️ 😂 🎉 👀. */
  quickReactions?: readonly string[];
  /** Recently used emoji, for the picker. */
  recentEmoji?: readonly string[];
  skinTone?: SkinTone;
  onSkinToneChange?: (tone: SkinTone) => void;
  /** Loads the emoji picker's data (see EmojiPicker). */
  loadEmojiData?: EmojiDataLoader;
  /** Announces new messages from others to screen readers. Defaults to true. */
  shouldAnnounce?: boolean;
  /** The instant "Today" and "Yesterday" are judged against. Defaults to when the list mounts. */
  now?: Date | number;
  /** IANA time zone for times and day separators. Defaults to UIProvider's `timeZone`. */
  timeZone?: string;
  /** The list's maximum height, such as `30rem`. Defaults to `32rem`; give the root a height to fill it instead. */
  maxHeight?: string;
  /** Names the log. Defaults to the `chatLogLabel` message. */
  'aria-label'?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/**
 * A chat transcript: bottom-anchored and virtualised, grouped by author with day separators, an unread divider,
 * "Jump to latest", reactions, replies, delivery status and per-message actions. String bodies render as Markdown.
 */
export function MessageList({
  messages: chatMessages,
  currentUserId,
  onLoadOlder,
  hasOlder = false,
  isLoadingOlder = false,
  firstUnreadId,
  typing,
  onReact,
  onReply,
  onRetry,
  messageActions,
  quickReactions = DEFAULT_QUICK_REACTIONS,
  recentEmoji,
  skinTone,
  onSkinToneChange,
  loadEmojiData,
  shouldAnnounce = true,
  now: nowProp,
  timeZone,
  maxHeight = '32rem',
  'aria-label': ariaLabel,
  className,
  ref,
}: MessageListProps) {
  const messages = useChatMessages();
  const { locale } = useLocale();
  const defaultTimeZone = useTimeZone();
  const zone = timeZone ?? defaultTimeZone;
  const hintId = useId();
  const [mountedAt] = useState(() => Date.now());
  const now = nowProp === undefined ? mountedAt : new Date(nowProp).getTime();

  const rows = useMemo(
    () => buildRows(chatMessages, { timeZone: zone, firstUnreadId, hasOlder }),
    [chatMessages, zone, firstUnreadId, hasOlder],
  );
  const indexByKey = useMemo(() => new Map(rows.map((row, index) => [row.key, index])), [rows]);
  const messageRows = useMemo(
    () => rows.flatMap((row, index) => (row.kind === 'message' ? [index] : [])),
    [rows],
  );

  // Times and day labels.
  const timeFormatter = useMemo(
    () => dateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone: zone }),
    [locale, zone],
  );
  const today = dayKey(new Date(now), zone);
  const dayFormatter = useMemo(
    () =>
      dateTimeFormat(locale, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        timeZone: zone,
      }),
    [locale, zone],
  );
  const yearDayFormatter = useMemo(
    () =>
      dateTimeFormat(locale, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: zone,
      }),
    [locale, zone],
  );
  const formatTime = useCallback((date: Date) => timeFormatter.format(date), [timeFormatter]);
  const formatDay = useCallback(
    (row: Extract<ChatRow, { kind: 'day' }>) => {
      const distance = daysBetween(row.day, today);
      if (distance === 0) {
        return messages.chatToday;
      }
      if (distance === 1) {
        return messages.chatYesterday;
      }
      return row.day.slice(0, 4) === today.slice(0, 4)
        ? dayFormatter.format(row.date)
        : yearDayFormatter.format(row.date);
    },
    [today, messages, dayFormatter, yearDayFormatter],
  );

  // The message whose actions toolbar shows, and the messages with an open overlay (menu or picker).
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overlayIds, setOverlayIds] = useState<ReadonlySet<string>>(() => new Set());
  const setOverlay = useCallback((id: string, isOpen: boolean) => {
    setOverlayIds((current) =>
      current.has(id) === isOpen ? current : toggleInSet(current, id, isOpen),
    );
  }, []);

  // The focused message's row stays rendered even when scrolled out of the window, so focus isn't lost.
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const focusedIndex = focusedKey === null ? undefined : indexByKey.get(focusedKey);
  const pendingFocus = useRef<string | null>(null);

  // Virtualisation. TanStack Virtual returns functions the React Compiler can't memoise, so it skips this component.
  const scrollRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line react-hooks/incompatible-library -- expected; the component re-renders on scroll anyway.
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => ESTIMATES[rows[index]?.kind ?? 'message'],
    getItemKey: (index) => rows[index]?.key ?? index,
    overscan: 6,
    rangeExtractor: (range) => {
      const indexes = defaultRangeExtractor(range);
      if (focusedIndex !== undefined && !indexes.includes(focusedIndex)) {
        indexes.push(focusedIndex);
        indexes.sort((a, b) => a - b);
      }
      return indexes;
    },
  });
  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  // Following the newest message; sending one returns to it. "N new" counts messages from others.
  const [isFollowing, setFollowing] = useState(true);
  const firstMessageId = chatMessages[0]?.id;
  const lastMessage = chatMessages.at(-1);
  const lastMessageId = lastMessage?.id;
  const isFromOthers = useCallback(
    (message: ChatMessage) => message.author.id !== currentUserId,
    [currentUserId],
  );
  const follow = useFollowScroll({
    scrollRef,
    virtualizer,
    rows,
    totalSize,
    threshold: FOLLOW_THRESHOLD,
    isFollowing,
    setFollowing,
    items: chatMessages,
    isCounted: isFromOthers,
    shouldFollowLast: lastMessage?.author.id === currentUserId,
    firstKey: firstMessageId,
    indexOf: (key) => indexByKey.get(key),
    // Anchor on the first visible row that isn't the "load older" row.
    anchorAt: (top) =>
      virtualizer
        .getVirtualItems()
        .find((candidate) => candidate.end > top && rows[candidate.index]?.kind !== 'older'),
  });

  // Announce new messages from others (a streaming one once it's complete).
  const { ref: liveRef, announce } = useAnnouncer();
  const announcedThrough = useRef(lastMessageId);
  const streamingIds = useRef(new Set<string>());
  useEffect(() => {
    const previous = announcedThrough.current;
    announcedThrough.current = lastMessageId;
    const fresh: ChatMessage[] = [];
    if (previous !== lastMessageId && previous !== undefined) {
      for (let index = chatMessages.length - 1; index >= 0; index -= 1) {
        const message = chatMessages[index];
        if (!message || message.id === previous) {
          break;
        }
        if (message.author.id !== currentUserId) {
          fresh.unshift(message);
        }
      }
    }
    const ready: ChatMessage[] = [];
    for (const message of fresh) {
      if (message.isStreaming) {
        streamingIds.current.add(message.id);
      } else {
        ready.push(message);
      }
    }
    // Streaming messages finish near the end; look there first.
    if (streamingIds.current.size > 0) {
      for (let index = chatMessages.length - 1; index >= 0; index -= 1) {
        const message = chatMessages[index];
        if (message && streamingIds.current.has(message.id) && !message.isStreaming) {
          streamingIds.current.delete(message.id);
          ready.push(message);
        }
        if (chatMessages.length - index > 200) {
          break;
        }
      }
    }
    const latest = ready.at(-1);
    if (!latest || !shouldAnnounce) {
      return;
    }
    const text =
      typeof latest.body === 'string' ? plainExcerpt(latest.body) : plainExcerpt(latest.text ?? '');
    announce(
      ready.length === 1
        ? messages.chatAnnounceMessage({ author: latest.author.name, text })
        : messages.chatAnnounceMessages({
            count: ready.length,
            author: latest.author.name,
            text,
          }),
    );
  }, [chatMessages, lastMessageId, currentUserId, shouldAnnounce, messages, announce]);

  const requestedOlderFor = useRef<string | undefined>(undefined);
  const loadOlder = useCallback(() => {
    if (!onLoadOlder || isLoadingOlder || !hasOlder) {
      return;
    }
    requestedOlderFor.current = firstMessageId;
    onLoadOlder();
  }, [onLoadOlder, isLoadingOlder, hasOlder, firstMessageId]);

  const onScroll = () => {
    follow.onScroll();
    const top = scrollRef.current?.scrollTop;
    if (
      top !== undefined &&
      top < LOAD_OLDER_THRESHOLD &&
      requestedOlderFor.current !== firstMessageId
    ) {
      loadOlder();
    }
  };

  // Keyboard: move focus between messages.
  const focusRow = useCallback(
    (index: number) => {
      const row = rows[index];
      if (!row) {
        return;
      }
      setFocusedKey(row.key);
      pendingFocus.current = row.key;
      virtualizer.scrollToIndex(index, { align: 'auto' });
    },
    [rows, virtualizer],
  );
  useLayoutEffect(() => {
    const key = pendingFocus.current;
    if (key === null) {
      return;
    }
    const element = scrollRef.current?.querySelector<HTMLElement>(
      `[data-message-id="${CSS.escape(key)}"]`,
    );
    if (element) {
      pendingFocus.current = null;
      element.focus({ preventScroll: true });
    }
  });

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const element = scrollRef.current;
    const target = event.target as HTMLElement;
    const isLog = target === element;
    const messageId = target.dataset.messageId;
    if (!element || (!isLog && messageId === undefined) || messageRows.length === 0) {
      return;
    }
    if (event.key === 'Escape' && !isLog) {
      event.preventDefault();
      element.focus();
      return;
    }
    let next: number | undefined;
    if (isLog) {
      const top = element.scrollTop;
      const bottom = top + element.clientHeight;
      const visible = virtualizer
        .getVirtualItems()
        .filter((item) => rows[item.index]?.kind === 'message')
        .filter((item) => item.end > top && item.start < bottom);
      if (event.key === 'ArrowUp') {
        next = visible.at(-1)?.index ?? messageRows.at(-1);
      } else if (event.key === 'ArrowDown') {
        next = visible[0]?.index ?? messageRows[0];
      }
    } else {
      const index = indexByKey.get(messageId ?? '');
      const position = index === undefined ? -1 : messageRows.indexOf(index);
      if (event.key === 'ArrowUp') {
        next = messageRows[Math.max(0, position - 1)];
      } else if (event.key === 'ArrowDown') {
        next = messageRows[Math.min(messageRows.length - 1, position + 1)];
      } else if (event.key === 'Home') {
        next = messageRows[0];
      } else if (event.key === 'End') {
        next = messageRows.at(-1);
      }
    }
    if (next !== undefined) {
      event.preventDefault();
      focusRow(next);
    }
  };

  const canJumpTo = useCallback((id: string) => indexByKey.has(id), [indexByKey]);
  const jumpTo = useCallback(
    (id: string) => {
      const index = indexByKey.get(id);
      if (index !== undefined) {
        focusRow(index);
      }
    },
    [indexByKey, focusRow],
  );

  const setActive = setActiveId;

  const context = useMemo<RowContext>(
    () => ({
      messages,
      currentUserId,
      onReact,
      onReply,
      onRetry,
      messageActions,
      onLoadOlder: loadOlder,
      quickReactions,
      recentEmoji,
      skinTone,
      onSkinToneChange,
      loadEmojiData,
      formatTime,
      formatDay,
      setActive,
      setOverlay,
      canJumpTo,
      jumpTo,
    }),
    [
      messages,
      currentUserId,
      onReact,
      onReply,
      onRetry,
      messageActions,
      loadOlder,
      quickReactions,
      recentEmoji,
      skinTone,
      onSkinToneChange,
      loadEmojiData,
      formatTime,
      formatDay,
      setActive,
      setOverlay,
      canJumpTo,
      jumpTo,
    ],
  );

  return (
    <div
      ref={ref}
      className={cn(
        'relative flex min-h-0 min-w-0 max-w-full flex-col overflow-hidden rounded-card border border-border bg-surface-1',
        className,
      )}
    >
      <LiveRegion ref={liveRef} isAtomic />
      <span id={hintId} className="sr-only">
        {messages.chatNavigationHint}
      </span>
      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* The log handles Up and Down for itself and its messages (they bubble here). */}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- see above. */}
        <div
          ref={scrollRef}
          role="log"
          aria-live="off"
          aria-label={ariaLabel ?? messages.chatLogLabel}
          aria-describedby={hintId}
          // A scrollable log must be focusable so keyboard users can scroll it and reach its messages.
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- see above.
          tabIndex={0}
          onScroll={onScroll}
          onKeyDown={onKeyDown}
          onFocus={(event) => {
            const id = (event.target as HTMLElement).dataset.messageId;
            if (id !== undefined) {
              setFocusedKey(id);
            }
          }}
          // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the app's maximum height.
          style={{ maxHeight }}
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain outline-none focus-visible:focus-ring focus-visible:-outline-offset-2"
        >
          {rows.length === 0 ? (
            <p className="m-0 px-3 py-10 text-center text-sm text-fg-muted">{messages.chatEmpty}</p>
          ) : (
            <div className="flex min-h-full flex-col justify-end">
              <div
                // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the virtual list's total height.
                style={{ height: totalSize }}
                className="relative w-full shrink-0"
              >
                {virtualItems.map((item) => {
                  const row = rows[item.index];
                  if (!row) {
                    return null;
                  }
                  const isActive =
                    row.kind === 'message' && (activeId === row.key || overlayIds.has(row.key));
                  return (
                    <MessageRow
                      key={item.key}
                      row={row}
                      index={item.index}
                      start={item.start}
                      isActive={isActive}
                      isLoadingOlder={isLoadingOlder}
                      context={context}
                      measureRef={virtualizer.measureElement}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {!isFollowing && (
          <JumpToLatestButton
            label={messages.chatJumpToLatest({ count: follow.newCount })}
            onPress={follow.jumpToLatest}
            className="z-10"
          />
        )}
      </div>
      <TypingIndicator typing={typing} />
    </div>
  );
}
