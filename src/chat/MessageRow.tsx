// One row of MessageList: a message (avatar, author and time on the first of a group, an optional reply quote, the
// body, attachments, reactions, status and an actions toolbar), a day separator, the "New messages" divider, or
// the "Load older messages" row at the top.
import { AlertCircle, Check, CheckCheck, Clock, Reply } from 'lucide-react';
import { memo, type FocusEvent, type ReactNode } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import { Avatar } from '../components/Avatar/Avatar';
import { Button } from '../components/Button/Button';
import { IconButton } from '../components/IconButton/IconButton';
import { OverflowMenu } from '../components/Menu/MenuButtons';
import { Spinner } from '../components/Spinner/Spinner';
import { Tooltip } from '../components/Tooltip/Tooltip';
import { Markdown } from '../markdown/Markdown';
import { FilePreviewList } from '../media/files/FilePreviewList';
import { cn } from '../utils/cn';
import type { IconComponent } from '../utils/icon';
import type { EmojiDataLoader, SkinTone } from './emojiData';
import { EmojiPickerButton } from './EmojiPicker';
import type { ChatStrings } from './messages';
import { ReactionBar } from './ReactionBar';
import type { ChatRow } from './rows';
import type { ChatMessage, ChatMessageStatus } from './types';

/** What every row shares: handlers and settings, held in one stable object. */
export interface RowContext {
  messages: ChatStrings;
  currentUserId: string;
  onReact?: (messageId: string, emoji: string) => void;
  onReply?: (messageId: string) => void;
  onRetry?: (messageId: string) => void;
  messageActions?: (message: ChatMessage) => ReactNode;
  onLoadOlder?: () => void;
  quickReactions: readonly string[];
  recentEmoji?: readonly string[];
  skinTone?: SkinTone;
  onSkinToneChange?: (tone: SkinTone) => void;
  loadEmojiData?: EmojiDataLoader;
  formatTime: (date: Date) => string;
  formatDay: (row: Extract<ChatRow, { kind: 'day' }>) => string;
  /** Shows a message's toolbar while it's hovered or holds focus (`null` hides it). */
  setActive: (id: string | null) => void;
  /** Keeps a message's toolbar while one of its overlays (menu, emoji picker) is open. */
  setOverlay: (id: string, isOpen: boolean) => void;
  /** Whether the quoted message is loaded, so the quote can jump to it. */
  canJumpTo: (id: string) => boolean;
  jumpTo: (id: string) => void;
}

const statusIcons: Record<ChatMessageStatus, IconComponent> = {
  sending: Clock,
  sent: Check,
  delivered: CheckCheck,
  read: CheckCheck,
  failed: AlertCircle,
};

const statusClasses: Record<ChatMessageStatus, string> = {
  sending: 'text-fg-muted',
  sent: 'text-fg-muted',
  delivered: 'text-fg-muted',
  read: 'text-accent-fg',
  failed: 'text-danger-fg',
};

function statusLabel(status: ChatMessageStatus, messages: ChatStrings): string {
  const labels: Record<ChatMessageStatus, string> = {
    sending: messages.chatStatusSending,
    sent: messages.chatStatusSent,
    delivered: messages.chatStatusDelivered,
    read: messages.chatStatusRead,
    failed: messages.chatStatusFailed,
  };
  return labels[status];
}

export interface MessageRowProps {
  row: ChatRow;
  index: number;
  /** The row's offset in the list (dynamic geometry). */
  start: number;
  /** Shows the actions toolbar. */
  isActive: boolean;
  isLoadingOlder: boolean;
  context: RowContext;
  measureRef: (element: Element | null) => void;
}

/** A virtual row, positioned at its offset and measured. */
export const MessageRow = memo(function MessageRow({
  row,
  index,
  start,
  isActive,
  isLoadingOlder,
  context,
  measureRef,
}: MessageRowProps) {
  return (
    <div
      ref={measureRef}
      data-index={index}
      data-chat-row={row.kind}
      // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the virtual row's offset.
      style={{ transform: `translateY(${String(start)}px)` }}
      className={cn('absolute inset-x-0 top-0', isActive && 'z-[2]')}
    >
      <RowContent row={row} isActive={isActive} isLoadingOlder={isLoadingOlder} context={context} />
    </div>
  );
});

function RowContent({
  row,
  isActive,
  isLoadingOlder,
  context,
}: {
  row: ChatRow;
  isActive: boolean;
  isLoadingOlder: boolean;
  context: RowContext;
}) {
  const { messages } = context;
  switch (row.kind) {
    case 'older':
      return (
        <div className="flex justify-center px-3 py-2">
          {isLoadingOlder ? (
            <span className="flex items-center gap-2 text-xs text-fg-muted">
              <Spinner size="sm" label={messages.chatLoadingOlder} />
              <span aria-hidden="true">{messages.chatLoadingOlder}</span>
            </span>
          ) : (
            <Button size="sm" variant="ghost" onPress={context.onLoadOlder}>
              {messages.chatLoadOlder}
            </Button>
          )}
        </div>
      );
    case 'day':
      return (
        <div className="flex items-center gap-3 px-3 pt-4 pb-2 text-xs font-medium text-fg-muted">
          <span aria-hidden="true" className="h-px flex-1 bg-border" />
          <span>{context.formatDay(row)}</span>
          <span aria-hidden="true" className="h-px flex-1 bg-border" />
        </div>
      );
    case 'unread':
      return (
        <div className="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-danger-fg">
          <span aria-hidden="true" className="h-px flex-1 bg-danger-border" />
          <span>{messages.chatNewMessages}</span>
          <span aria-hidden="true" className="h-px flex-1 bg-danger-border" />
        </div>
      );
    case 'message':
      return row.message.isSystem ? (
        <SystemMessage row={row} context={context} />
      ) : (
        <Message row={row} isActive={isActive} context={context} />
      );
  }
}

type MessageRowData = Extract<ChatRow, { kind: 'message' }>;

function SystemMessage({ row, context }: { row: MessageRowData; context: RowContext }) {
  const { message, date } = row;
  return (
    <div
      data-message-id={message.id}
      tabIndex={-1}
      className="mx-3 my-1 flex flex-wrap items-baseline justify-center gap-x-2 rounded-control px-2 py-1 text-center text-xs text-fg-muted outline-none focus-visible:focus-ring"
    >
      <span>{message.body}</span>
      <time dateTime={date.toISOString()}>{context.formatTime(date)}</time>
    </div>
  );
}

function Message({
  row,
  isActive,
  context,
}: {
  row: MessageRowData;
  isActive: boolean;
  context: RowContext;
}) {
  const { message, date, isGroupStart, isGroupEnd } = row;
  const { messages } = context;
  const isMine = message.author.id === context.currentUserId;
  const time = context.formatTime(date);
  const status = isMine ? message.status : undefined;
  const actions = context.messageActions?.(message);
  const hasActions = actions !== undefined && actions !== null && actions !== false;
  const hasToolbar = context.onReact !== undefined || context.onReply !== undefined || hasActions;
  const reactions = message.reactions?.filter((reaction) => reaction.count > 0) ?? [];
  const showsStatus =
    status !== undefined && (isGroupEnd || status === 'failed' || status === 'sending');

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      context.setActive(null);
    }
  };

  return (
    <div
      data-message-id={message.id}
      tabIndex={-1}
      onFocus={() => {
        context.setActive(message.id);
      }}
      onBlur={onBlur}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') {
          context.setActive(message.id);
        }
      }}
      onPointerLeave={(event) => {
        if (
          event.pointerType === 'mouse' &&
          !event.currentTarget.contains(document.activeElement)
        ) {
          context.setActive(null);
        }
      }}
      className={cn(
        'relative mx-1 flex gap-2 rounded-control px-2 outline-none focus-visible:focus-ring',
        isGroupStart ? 'pt-2' : 'pt-0.5',
        isGroupEnd ? 'pb-1' : 'pb-0',
        isMine && 'flex-row-reverse',
        isActive && 'bg-surface-2/60',
      )}
    >
      {!isMine && (
        <div className="w-8 shrink-0" aria-hidden="true">
          {isGroupStart && (
            <Avatar name={message.author.name} src={message.author.avatarSrc} size="sm" />
          )}
        </div>
      )}
      <div
        className={cn(
          'flex max-w-[min(42rem,85%)] min-w-0 flex-col gap-1',
          isMine ? 'items-end' : 'items-start',
        )}
      >
        {isGroupStart ? (
          <div className={cn('flex items-baseline gap-2 text-xs', isMine && 'flex-row-reverse')}>
            <span className={cn('font-semibold text-fg', isMine && 'sr-only')}>
              {message.author.name}
            </span>
            {isMine && <span className="sr-only">,</span>}
            <time dateTime={date.toISOString()} className="text-fg-muted">
              {time}
            </time>
          </div>
        ) : (
          <span className="sr-only">
            {messages.chatMessageMeta({ author: message.author.name, time })}
          </span>
        )}
        {message.replyTo && <ReplyQuote message={message} context={context} />}
        {(message.isStreaming === true ||
          (message.body !== '' && message.body !== null && message.body !== undefined)) && (
          <div
            aria-busy={message.isStreaming === true ? true : undefined}
            className={cn(
              'max-w-full min-w-0 rounded-2xl px-3 py-2 text-sm text-fg',
              isMine ? 'bg-accent-bg' : 'bg-surface-2',
            )}
          >
            {typeof message.body === 'string' ? (
              <Markdown
                size="sm"
                headingLevel={4}
                isFullWidth
                className="[&_p]:my-1.5 [&_ol]:my-1.5 [&_ul]:my-1.5"
              >
                {message.body}
              </Markdown>
            ) : (
              message.body
            )}
            {message.isStreaming && (
              <span
                aria-hidden="true"
                className="ms-0.5 inline-block h-4 w-1.5 translate-y-0.5 rounded-sm bg-fg-muted motion-safe:animate-pulse"
              />
            )}
          </div>
        )}
        {message.attachments && message.attachments.length > 0 && (
          <FilePreviewList
            files={message.attachments}
            size="sm"
            aria-label={messages.chatAttachments}
            className={cn(isMine && 'justify-end')}
          />
        )}
        {reactions.length > 0 && (
          <ReactionBar
            reactions={reactions}
            onToggle={(emoji) => {
              context.onReact?.(message.id, emoji);
            }}
            isDisabled={context.onReact === undefined}
            canAdd={context.onReact !== undefined}
            quick={context.quickReactions}
            recent={context.recentEmoji}
            skinTone={context.skinTone}
            onSkinToneChange={context.onSkinToneChange}
            loadEmojiData={context.loadEmojiData}
            onPickerOpenChange={(isOpen) => {
              context.setOverlay(message.id, isOpen);
            }}
            className={cn(isMine && 'justify-end')}
          />
        )}
        {(showsStatus || message.isEdited) && (
          <div
            className={cn(
              'flex flex-wrap items-center gap-x-2 gap-y-1 text-xs',
              isMine && 'justify-end',
            )}
          >
            {message.isEdited && <span className="text-fg-muted">{messages.chatEdited}</span>}
            {showsStatus && <StatusLine message={message} status={status} context={context} />}
          </div>
        )}
        {status !== undefined && !showsStatus && (
          <span className="sr-only">{statusLabel(status, messages)}</span>
        )}
      </div>
      {hasToolbar && isActive && (
        <div
          className={cn(
            'absolute -top-3 z-[3] flex items-center gap-0.5 rounded-control border border-border bg-surface-1 p-0.5 shadow-raised',
            isMine ? 'start-2' : 'end-2',
          )}
        >
          {context.onReact && (
            <EmojiPickerButton
              label={messages.chatAddReaction}
              recent={[...context.quickReactions, ...(context.recentEmoji ?? [])]}
              skinTone={context.skinTone}
              onSkinToneChange={context.onSkinToneChange}
              loadEmojiData={context.loadEmojiData}
              onOpenChange={(isOpen) => {
                context.setOverlay(message.id, isOpen);
              }}
              onSelect={(emoji) => {
                const existing = message.reactions?.find((reaction) => reaction.emoji === emoji);
                if (!existing?.isMine) {
                  context.onReact?.(message.id, emoji);
                }
              }}
              className="size-7"
            />
          )}
          {context.onReply && (
            <Tooltip content={messages.chatReply}>
              <IconButton
                icon={Reply}
                size="sm"
                aria-label={messages.chatReply}
                onPress={() => {
                  context.onReply?.(message.id);
                }}
                className="size-7"
              />
            </Tooltip>
          )}
          {hasActions && (
            <OverflowMenu
              aria-label={messages.chatMessageActions}
              size="sm"
              onOpenChange={(isOpen) => {
                context.setOverlay(message.id, isOpen);
              }}
              className="size-7"
            >
              {actions}
            </OverflowMenu>
          )}
        </div>
      )}
    </div>
  );
}

function ReplyQuote({ message, context }: { message: ChatMessage; context: RowContext }) {
  const reply = message.replyTo;
  if (!reply) {
    return null;
  }
  const content = (
    <>
      <span className="sr-only">{context.messages.chatInReplyTo({ author: reply.author })}</span>
      <span aria-hidden="true" className="font-semibold text-fg">
        {reply.author}
      </span>
      <span className="line-clamp-2 text-fg-muted">{reply.excerpt}</span>
    </>
  );
  const classes =
    'flex max-w-full min-w-0 flex-col items-start rounded-control border-s-4 border-border-strong bg-surface-1 px-2 py-1 text-start text-xs';
  return context.canJumpTo(reply.id) ? (
    <AriaButton
      onPress={() => {
        context.jumpTo(reply.id);
      }}
      className={cn(
        classes,
        'cursor-pointer outline-none data-focus-visible:focus-ring data-hovered:bg-surface-3',
      )}
    >
      {content}
    </AriaButton>
  ) : (
    <div className={classes}>{content}</div>
  );
}

function StatusLine({
  message,
  status,
  context,
}: {
  message: ChatMessage;
  status: ChatMessageStatus;
  context: RowContext;
}) {
  const Icon = statusIcons[status];
  return (
    <span className={cn('inline-flex items-center gap-1', statusClasses[status])}>
      <Icon aria-hidden="true" className="size-3.5" />
      <span>{statusLabel(status, context.messages)}</span>
      {status === 'failed' && context.onRetry && (
        <Button
          size="sm"
          variant="ghost"
          tone="danger"
          onPress={() => {
            context.onRetry?.(message.id);
          }}
          className="h-6 px-1.5"
        >
          {context.messages.retry}
        </Button>
      )}
    </span>
  );
}
