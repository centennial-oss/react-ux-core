import type { ReactNode } from 'react';
import { Dialog, DialogTrigger } from 'react-aria-components';
import { cn } from '../../utils/cn';
import { useIsPhone } from '../../utils/useMediaQuery';
import { PopoverSurface, type PopoverSurfaceProps } from '../Overlay/PopoverSurface';
import { SheetSurface } from '../Overlay/SheetSurface';

/**
 * Pairs a trigger (its first child, usually a Button) with a `Popover` (its second child). Controlled with
 * `isOpen` / `onOpenChange` or uncontrolled with `defaultOpen`.
 */
export const PopoverTrigger = DialogTrigger;

export interface PopoverProps extends Pick<
  PopoverSurfaceProps,
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
    <PopoverSurface {...rest} hasArrow={hasArrow} isOpen={isOpen} onOpenChange={onOpenChange}>
      <Dialog
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className={cn('p-3 outline-none', className)}
      >
        {children}
      </Dialog>
    </PopoverSurface>
  );
}
