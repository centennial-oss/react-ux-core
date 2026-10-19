import { useState, type HTMLAttributes, type Ref } from 'react';
import { useEntryMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import type { Tone } from '../../utils/types';
import { StatusDot } from '../StatusDot/StatusDot';
import { avatarColorClasses, avatarColorFor, initialsOf, type AvatarColor } from './avatarColors';
import { defaultAvatarMessages } from './messages';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarShape = 'circle' | 'square';

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'size-6 text-[0.625rem]',
  sm: 'size-8 text-xs',
  md: 'size-9 text-sm',
  lg: 'size-12 text-base',
  xl: 'size-16 text-xl',
};

const shapeClasses: Record<AvatarShape, Record<AvatarSize, string>> = {
  circle: {
    xs: 'rounded-full',
    sm: 'rounded-full',
    md: 'rounded-full',
    lg: 'rounded-full',
    xl: 'rounded-full',
  },
  square: {
    xs: 'rounded-sm',
    sm: 'rounded-md',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
  },
};

// The presence dot sits on the corner, in a ring of the surface colour so it stays visible over any picture.
const presenceClasses: Record<AvatarShape, string> = {
  circle: '-end-0.5 -bottom-0.5',
  square: '-end-1 -bottom-1',
};

export interface AvatarProps extends Omit<
  HTMLAttributes<HTMLSpanElement>,
  'className' | 'style' | 'children' | 'color'
> {
  /** The person's (or team's) name. It names the avatar and gives the initials and the default colour. */
  name: string;
  /** A picture. Without one, or if it fails to load, the avatar shows initials. */
  src?: string;
  /** Defaults to `md` (36 px). */
  size?: AvatarSize;
  /** Defaults to `circle`. */
  shape?: AvatarShape;
  /** A presence dot in StatusDot's tones and shapes. The label is added to the avatar's name. */
  presence?: { tone: Tone; label: string };
  /** The initials' background. Defaults to a chart palette colour picked from the name. */
  color?: AvatarColor;
  /** Overrides the initials taken from `name`. */
  initials?: string;
  className?: string;
  ref?: Ref<HTMLSpanElement>;
}

/**
 * A person's picture, or their initials on a colour picked from their name, with an optional presence dot. An
 * `img` named by the name (and presence).
 */
export function Avatar({
  name,
  src,
  size = 'md',
  shape = 'circle',
  presence,
  color,
  initials,
  className,
  ...rest
}: AvatarProps) {
  const messages = useEntryMessages(defaultAvatarMessages);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const hasImage = src !== undefined && failedSrc !== src;
  const label =
    presence === undefined ? name : messages.avatarWithPresence({ name, presence: presence.label });
  return (
    <span
      role="img"
      aria-label={label}
      {...rest}
      className={cn(
        'relative inline-flex shrink-0 align-middle select-none',
        sizeClasses[size],
        shapeClasses[shape][size],
        className,
      )}
    >
      <span
        className={cn(
          'flex size-full items-center justify-center overflow-hidden font-semibold',
          shapeClasses[shape][size],
          avatarColorClasses[color ?? avatarColorFor(name)],
        )}
      >
        {hasImage ? (
          <img
            src={src}
            alt=""
            className="size-full object-cover"
            onError={() => {
              setFailedSrc(src);
            }}
          />
        ) : (
          // Initials stand in for a picture, so they're generated content rather than text: the avatar's name is
          // the person's name, and the initials aren't a label to match it (WCAG 2.5.3).
          <span
            aria-hidden="true"
            data-initials={initials ?? initialsOf(name)}
            className="before:content-[attr(data-initials)]"
          />
        )}
      </span>
      {presence !== undefined && (
        <span
          aria-hidden="true"
          className={cn(
            'absolute flex rounded-full bg-surface-1 p-px leading-none',
            presenceClasses[shape],
          )}
        >
          <StatusDot
            tone={presence.tone}
            label={presence.label}
            isLabelHidden
            size={size === 'lg' || size === 'xl' ? 'md' : 'sm'}
            className="gap-0"
          />
        </span>
      )}
    </span>
  );
}
