import type { Ref } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import { useEntryMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import { Popover, PopoverTrigger } from '../Popover/Popover';
import { StatusDot } from '../StatusDot/StatusDot';
import { Avatar, type AvatarProps, type AvatarSize } from './Avatar';
import { defaultAvatarMessages } from './messages';

// Each avatar overlaps the one before it and has a ring of the surface colour, so the outlines stay apart.
const overlapClasses: Record<AvatarSize, string> = {
  xs: '-ms-1 first:ms-0',
  sm: '-ms-1.5 first:ms-0',
  md: '-ms-2 first:ms-0',
  lg: '-ms-2.5 first:ms-0',
  xl: '-ms-3 first:ms-0',
};

const moreSizeClasses: Record<AvatarSize, string> = {
  xs: 'size-6 text-[0.625rem]',
  sm: 'size-8 text-xs',
  md: 'size-9 text-xs',
  lg: 'size-12 text-sm',
  xl: 'size-16 text-base',
};

export interface AvatarGroupProps {
  /** The people, in order. Each takes Avatar's props (`name`, `src`, `presence`, `color`…). */
  people: readonly AvatarProps[];
  /** How many avatars show before the "+N" button. Defaults to 4. */
  max?: number;
  /** Defaults to `sm`. */
  size?: AvatarSize;
  /** Called by the "+N" button instead of opening the list of the other people. */
  onOverflowPress?: () => void;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/**
 * A row of overlapping avatars that ends with "+N" when there are more than `max`. The "+N" button opens a list of
 * the others (or calls `onOverflowPress`). A group named "N people".
 */
export function AvatarGroup({
  people,
  max = 4,
  size = 'sm',
  onOverflowPress,
  className,
  ref,
}: AvatarGroupProps) {
  const messages = useEntryMessages(defaultAvatarMessages);
  const shown = people.length > max ? people.slice(0, Math.max(0, max)) : people;
  const hidden = people.slice(shown.length);
  const moreLabel = messages.avatarGroupMoreLabel({ count: hidden.length });

  const moreButton = (
    <AriaButton
      aria-label={moreLabel}
      onPress={onOverflowPress}
      className={cn(
        'hit-area relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full',
        'bg-neutral-bg font-semibold text-neutral-fg tabular-nums ring-2 ring-surface-1 outline-none',
        'data-focus-visible:focus-ring data-hovered:brightness-95 data-pressed:brightness-90',
        moreSizeClasses[size],
        overlapClasses[size],
      )}
    >
      {messages.avatarGroupMore({ count: hidden.length })}
    </AriaButton>
  );

  return (
    <div
      ref={ref}
      role="group"
      aria-label={messages.avatarGroupLabel({ count: people.length })}
      className={cn('flex min-w-0 items-center', className)}
    >
      {shown.map((person, index) => (
        <Avatar
          // People may share a name; the index keeps keys unique.
          key={`${person.name}-${String(index)}`}
          {...person}
          size={size}
          className={cn('ring-2 ring-surface-1', overlapClasses[size], person.className)}
        />
      ))}
      {hidden.length > 0 &&
        (onOverflowPress ? (
          moreButton
        ) : (
          <PopoverTrigger>
            {moreButton}
            <Popover aria-label={moreLabel} placement="bottom end">
              <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
                {hidden.map((person, index) => (
                  <li
                    key={`${person.name}-${String(index)}`}
                    className="flex min-w-0 items-center gap-2 text-sm text-fg"
                  >
                    <Avatar {...person} size="sm" presence={undefined} aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{person.name}</span>
                    {person.presence && (
                      <StatusDot
                        tone={person.presence.tone}
                        label={person.presence.label}
                        size="sm"
                        className="shrink-0 text-fg-muted"
                      />
                    )}
                  </li>
                ))}
              </ul>
            </Popover>
          </PopoverTrigger>
        ))}
    </div>
  );
}
