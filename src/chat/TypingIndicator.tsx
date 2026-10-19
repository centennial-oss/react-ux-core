// TypingIndicator: "Grace is typing…" with three dots, under a MessageList. It keeps its line's height when nobody is
// typing, so the list above doesn't change size as people start and stop.
import { cn } from '../utils/cn';
import { useListFormat } from '../utils/intl';
import { useChatMessages } from './messages';
import type { ChatTypist } from './types';

export interface TypingIndicatorProps {
  typing?: readonly ChatTypist[];
  className?: string;
}

/** Who's typing, announced politely (a `status` region). */
export function TypingIndicator({ typing = [], className }: TypingIndicatorProps) {
  const messages = useChatMessages();
  const listFormat = useListFormat();
  const text =
    typing.length === 0
      ? ''
      : messages.chatTyping({
          names: listFormat.format(typing.map((typist) => typist.name)),
          count: typing.length,
        });
  return (
    <div
      role="status"
      className={cn('flex h-7 shrink-0 items-center gap-2 px-3 text-xs text-fg-muted', className)}
    >
      {text !== '' && (
        <>
          <span aria-hidden="true" className="flex items-center gap-0.5">
            <span className="size-1.5 rounded-full bg-fg-muted motion-safe:animate-bounce" />
            <span className="size-1.5 rounded-full bg-fg-muted motion-safe:animate-bounce motion-safe:[animation-delay:150ms]" />
            <span className="size-1.5 rounded-full bg-fg-muted motion-safe:animate-bounce motion-safe:[animation-delay:300ms]" />
          </span>
          <span className="min-w-0 truncate">{text}</span>
        </>
      )}
    </div>
  );
}
