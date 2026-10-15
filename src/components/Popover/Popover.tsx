import type { ReactNode } from 'react';
import {
  Dialog,
  DialogTrigger,
  OverlayArrow,
  Popover as AriaPopover,
  type PopoverProps as AriaPopoverProps,
} from 'react-aria-components';
import { cn } from '../../utils/cn';
import { useIsPhone } from '../../utils/useMediaQuery';
import { SheetSurface } from '../Overlay/SheetSurface';
import { arrowClasses, popoverClasses } from '../Overlay/styles';

/**
 * Pairs a trigger (its first child, usually a Button) with a `Popover` (its second child). Controlled with
 * `isOpen` / `onOpenChange` or uncontrolled with `defaultOpen`.
 */
export const PopoverTrigger = DialogTrigger;

export interface PopoverProps extends Pick<
  AriaPopoverProps,
  'placement' | 'offset' | 'crossOffset' | 'shouldFlip' | 'isNonModal' | 'triggerRef'
> {
  children: ReactNode;
  /** Accessible name for the popover's dialog. Required unless `aria-labelledby` is set. */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  /** Shows an arrow pointing at the trigger (anchored popovers only). */
  hasArrow?: boolean;
  /** Shows a bottom sheet on phones instead of an anchored popover. Defaults to true. */
  hasPhoneSheet?: boolean;
  /** Controlled open state, when used without a PopoverTrigger (with `triggerRef`). */
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  className?: string;
}

/**
 * A panel anchored to its trigger, with dialog semantics (focus moves in, Escape and outside clicks close it, focus
 * returns). On phones it becomes a bottom sheet (spec phone behaviour).
 */
export function Popover({
  children,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  hasArrow = false,
  hasPhoneSheet = true,
  isOpen,
  onOpenChange,
  className,
  placement = 'bottom',
  offset,
  ...rest
}: PopoverProps) {
  const isPhone = useIsPhone();

  if (isPhone && hasPhoneSheet) {
    return (
      <SheetSurface
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
      >
        <div className={cn('p-4', className)}>{children}</div>
      </SheetSurface>
    );
  }

  return (
    <AriaPopover
      {...rest}
      {...(isOpen !== undefined ? { isOpen, onOpenChange } : {})}
      placement={placement}
      offset={offset ?? (hasArrow ? 12 : 8)}
      className={cn(
        'group/popover max-w-[min(24rem,calc(100vw-1.5rem))] overflow-visible',
        popoverClasses,
      )}
    >
      {hasArrow && (
        <OverlayArrow>
          <svg width={12} height={12} viewBox="0 0 12 12" className={arrowClasses}>
            <path d="M0 0 L6 6 L12 0" />
          </svg>
        </OverlayArrow>
      )}
      <Dialog
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className={cn('p-3 outline-none', className)}
      >
        {children}
      </Dialog>
    </AriaPopover>
  );
}
