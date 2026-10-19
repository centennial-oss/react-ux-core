import type { Meta, StoryObj } from '@storybook/react-vite';
import { Copy, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  ada,
  CHAT_NOW,
  FIRST_UNREAD_ID,
  manyMessages,
  observatoryMessages,
  skyGuide,
  skyGuideReply,
} from '../../test/chat';
import { MenuItem } from '../components/Menu/Menu';
import { Composer } from './Composer';
import { MessageList } from './MessageList';
import type { ChatMessage } from './types';

/** Toggles the current user's reaction on a message, as an app would. */
function toggleReaction(messages: ChatMessage[], id: string, emoji: string): ChatMessage[] {
  return messages.map((message) => {
    if (message.id !== id) {
      return message;
    }
    const reactions = message.reactions ?? [];
    const existing = reactions.find((reaction) => reaction.emoji === emoji);
    const next = existing
      ? reactions.map((reaction) =>
          reaction.emoji === emoji
            ? {
                ...reaction,
                isMine: !reaction.isMine,
                count: reaction.count + (reaction.isMine ? -1 : 1),
              }
            : reaction,
        )
      : [...reactions, { emoji, count: 1, isMine: true, names: ['Ada Lovelace'] }];
    return { ...message, reactions: next.filter((reaction) => reaction.count > 0) };
  });
}

const meta = {
  title: 'Chat/MessageList',
  component: MessageList,
  args: {
    messages: observatoryMessages(),
    currentUserId: 'ada',
    now: CHAT_NOW,
    timeZone: 'UTC',
    'aria-label': '#dome-a',
  },
  render: function MessageListStory(args) {
    const [messages, setMessages] = useState(args.messages);
    return (
      <MessageList
        {...args}
        messages={messages}
        onReact={(id, emoji) => {
          setMessages((current) => toggleReaction(current as ChatMessage[], id, emoji));
        }}
        onReply={() => undefined}
        onRetry={(id) => {
          setMessages((current) =>
            current.map((message) =>
              message.id === id ? { ...message, status: 'sent' as const } : message,
            ),
          );
        }}
        messageActions={() => (
          <>
            <MenuItem icon={Copy}>Copy link</MenuItem>
            <MenuItem icon={Pencil}>Edit</MenuItem>
            <MenuItem icon={Trash2} tone="danger">
              Delete
            </MenuItem>
          </>
        )}
      />
    );
  },
} satisfies Meta<typeof MessageList>;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * An observatory team's channel: messages grouped by author within five minutes, day separators, a reply with a
 * quote, reactions, Markdown, attachments, a system notice, an edited message, and the current user's delivery
 * status (with a failed message to retry). Hover, focus or tap a message for its actions.
 */
export const Conversation: Story = {
  args: { maxHeight: '40rem' },
};

/** The "New messages" divider above the first unread message, and someone typing. */
export const Unread: Story = {
  args: {
    firstUnreadId: FIRST_UNREAD_ID,
    typing: [{ id: 'grace', name: 'Grace Hopper' }],
    maxHeight: '40rem',
  },
};

/** Several people typing. */
export const SeveralTyping: Story = {
  args: {
    typing: [
      { id: 'grace', name: 'Grace Hopper' },
      { id: 'edwin', name: 'Edwin Hubble' },
    ],
    maxHeight: '24rem',
  },
};

/** A short conversation in a fixed-height panel sits at the bottom, with "Load older messages" at the top. */
export const BottomAnchored: Story = {
  args: { messages: observatoryMessages().slice(-3), hasOlder: true, className: 'h-[28rem]' },
};

/** No messages yet. */
export const Empty: Story = {
  args: { messages: [], className: 'h-64' },
};

const tenThousand = manyMessages(10_000);

/** 10,000 messages: only the visible window is in the page. */
export const TenThousandMessages: Story = {
  name: '10k messages',
  args: { messages: tenThousand, maxHeight: '28rem' },
};

/** Scrolling to the top loads 100 older messages at a time, keeping the view in place. */
export const LoadOlder: Story = {
  tags: ['!visual'],
  render: function LoadOlderStory(args) {
    const [messages, setMessages] = useState(() => manyMessages(100, 900));
    const [isLoading, setLoading] = useState(false);
    const first = Number(messages[0]?.id.slice(1) ?? 0);
    return (
      <MessageList
        {...args}
        messages={messages}
        hasOlder={first > 0}
        isLoadingOlder={isLoading}
        onLoadOlder={() => {
          setLoading(true);
          setTimeout(() => {
            setMessages((current) => {
              const start = Math.max(0, first - 100);
              const end = Number(current[0]?.at ?? CHAT_NOW) - 90_000;
              return [...manyMessages(first - start, start, end), ...current];
            });
            setLoading(false);
          }, 600);
        }}
        maxHeight="24rem"
      />
    );
  },
};

/**
 * SkyGuide's reply streams in a few words at a time: the view stays on it without jumping (scroll up and it stays
 * put), and it's announced once complete. Send a message to see the list follow your own message.
 */
export const StreamingReply: Story = {
  tags: ['!visual'],
  render: function StreamingStory(args) {
    const [messages, setMessages] = useState<ChatMessage[]>(() => observatoryMessages());
    const [shown, setShown] = useState(0);
    const words = skyGuideReply.split(' ');
    useEffect(() => {
      if (shown >= words.length) {
        return;
      }
      const handle = setTimeout(() => {
        setShown((count) => count + 1);
      }, 120);
      return () => {
        clearTimeout(handle);
      };
    }, [shown, words.length]);
    const reply: ChatMessage = {
      id: 'skyguide-reply',
      author: skyGuide,
      at: CHAT_NOW,
      body: words.slice(0, shown).join(' '),
      isStreaming: shown < words.length,
    };
    return (
      <div className="flex h-[36rem] flex-col gap-2">
        <MessageList
          {...args}
          messages={[...messages, reply]}
          typing={shown === 0 ? [{ id: 'skyguide', name: 'SkyGuide' }] : []}
          className="min-h-0 flex-1"
          maxHeight="none"
        />
        <Composer
          onSubmit={({ text }) => {
            setMessages((current) => [
              ...current,
              {
                id: `sent-${String(current.length)}`,
                author: ada,
                at: CHAT_NOW,
                body: text,
                status: 'sent',
              },
            ]);
          }}
        />
      </div>
    );
  },
};

/** Times and day separators in another time zone. */
export const TimeZone: Story = {
  args: { timeZone: 'Asia/Tokyo', maxHeight: '32rem' },
};
