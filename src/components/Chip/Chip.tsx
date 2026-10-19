import { X } from 'lucide-react';
import { useId, type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import { useCommonMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import type { IconComponent } from '../../utils/icon';
import { toneSoftBorderedClasses } from '../../utils/toneClasses';
import type { Tone } from '../../utils/types';

export interface ChipProps extends Omit<
  HTMLAttributes<HTMLSpanElement>,
  'className' | 'style' | 'children'
> {
  /** The chip's label. */
  children: ReactNode;
  /** Shows a remove button (its own focusable control) that calls this. */
  onRemove?: () => void;
  icon?: IconComponent;
  /** Defaults to `neutral`. */
  tone?: Tone;
  /** Defaults to `md`. */
  size?: 'sm' | 'md';
  /** Disables the remove button. */
  isDisabled?: boolean;
  className?: string;
  ref?: Ref<HTMLSpanElement>;
}

/** A compact label, such as an active filter, optionally removable with its own button. */
export function Chip({
  children,
  onRemove,
  icon: Icon,
  tone = 'neutral',
  size = 'md',
  isDisabled = false,
  className,
  ...rest
}: ChipProps) {
  const messages = useCommonMessages();
  const labelId = useId();
  const removeId = useId();

  return (
    <span
      {...rest}
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-full border font-medium',
        size === 'sm' ? 'h-6 px-2 text-xs' : 'h-7 px-2.5 text-sm',
        onRemove && (size === 'sm' ? 'pe-1' : 'pe-1.5'),
        toneSoftBorderedClasses[tone],
        isDisabled && 'opacity-50',
        className,
      )}
    >
      {Icon && <Icon aria-hidden="true" className="size-3.5 shrink-0" />}
      <span id={labelId} className="truncate">
        {children}
      </span>
      {onRemove && (
        <AriaButton
          id={removeId}
          aria-label={messages.remove}
          aria-labelledby={`${removeId} ${labelId}`}
          isDisabled={isDisabled}
          onPress={onRemove}
          className={cn(
            'hit-area inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full',
            size === 'sm' ? 'size-4' : 'size-5',
            'data-focus-visible:focus-ring data-hovered:bg-current/15 data-disabled:cursor-not-allowed',
          )}
        >
          <X aria-hidden="true" className="size-3" />
        </AriaButton>
      )}
    </span>
  );
}
