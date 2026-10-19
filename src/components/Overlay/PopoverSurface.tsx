import type { ReactNode } from 'react';
import {
  OverlayArrow,
  Popover as AriaPopover,
  type PopoverProps as AriaPopoverProps,
} from 'react-aria-components';
import { cn } from '../../utils/cn';
import { arrowClasses, popoverClasses } from './styles';

export interface PopoverSurfaceProps extends Pick<
  AriaPopoverProps,
  | 'placement'
  | 'offset'
  | 'crossOffset'
  | 'shouldFlip'
  | 'isNonModal'
  | 'triggerRef'
  | 'aria-label'
  | 'aria-labelledby'
> {
  children: ReactNode;
  /** Shows an arrow pointing at the trigger. */
  hasArrow?: boolean;
  /** Controlled open state, for a popover without a trigger that provides it. */
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

/**
 * Popover's anchored surface: React Aria's Popover with the library's styling, offset and optional arrow. Internal:
 * Popover puts a Dialog inside it; HoverCard's preview popover is itself the dialog.
 */
export function PopoverSurface({
  children,
  hasArrow = false,
  isOpen,
  onOpenChange,
  placement = 'bottom',
  offset,
  ...rest
}: PopoverSurfaceProps) {
  return (
    <AriaPopover
      {...rest}
      {...(isOpen !== undefined ? { isOpen, onOpenChange } : {})}
      placement={placement}
      offset={offset ?? (hasArrow ? 12 : 8)}
      className={cn(
        'group/popover max-w-[min(24rem,calc(100vw-1.5rem))]',
        popoverClasses,
        // popoverClasses scroll what doesn't fit, which would clip an arrow: it sits just outside the box.
        hasArrow && 'overflow-visible',
      )}
    >
      {hasArrow && (
        <OverlayArrow>
          <svg width={12} height={12} viewBox="0 0 12 12" className={arrowClasses}>
            <path d="M0 0 L6 6 L12 0" />
          </svg>
        </OverlayArrow>
      )}
      {children}
    </AriaPopover>
  );
}
