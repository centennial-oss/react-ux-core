import type { ReactNode } from 'react';
import { Sheet, SheetBackdrop, SheetContent, SheetOverlay } from 'react-aria-components';
import { cn } from '../../utils/cn';

export interface SheetSurfaceProps {
  /** Content, or a function that receives `close`. */
  children: ReactNode | ((options: { close: () => void }) => ReactNode);
  /** Which edge the sheet slides from. Defaults to `bottom`. `start`/`end` mirror in right-to-left layouts. */
  position?: 'bottom' | 'start' | 'end';
  /** Accessible name for the sheet's dialog (or use `aria-labelledby`, or a `Heading slot="title"` inside). */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  /** `alertdialog` for confirmations. Defaults to `dialog`. */
  role?: 'dialog' | 'alertdialog';
  /** Swipe, Escape and outside clicks close the sheet. Defaults to true. */
  isDismissable?: boolean;
  /** Controlled open state. Inside a trigger (menu, select, dialog trigger) the trigger controls it instead. */
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  className?: string;
}

/**
 * A sheet built on React Aria's Sheet: a bottom sheet (phones) or a side sheet (drawers), with a scrim, swipe to
 * dismiss and safe-area padding. Internal: Popover, Menu, Select, Dialog and Drawer use it on phones.
 */
export function SheetSurface({
  children,
  position = 'bottom',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  role,
  isDismissable = true,
  isOpen,
  onOpenChange,
  className,
}: SheetSurfaceProps) {
  const isBottom = position === 'bottom';
  return (
    <SheetOverlay
      position={position}
      preventDismissal={!isDismissable}
      {...(isOpen !== undefined ? { isOpen, onOpenChange } : {})}
      className="group/sheet z-modal"
    >
      <SheetBackdrop
        swipeAnimation="rux-sheet-backdrop"
        className="data-[stack-index='0']:bg-scrim"
      />
      <Sheet
        stackAnimation="rux-sheet-scale-back"
        className={cn(
          // React Aria places the sheet inside its own scroll-snap container; these classes only size and style it.
          'flex flex-col bg-surface-2 text-fg shadow-overlay outline-none',
          isBottom
            ? 'w-full max-h-[calc(100dvh-2rem)] rounded-t-card pb-[env(safe-area-inset-bottom)]'
            : 'h-full w-[min(24rem,100vw-2rem)] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
          position === 'start' && 'start-0 rounded-e-card',
          position === 'end' && 'end-0 rounded-s-card',
          className,
        )}
      >
        {isBottom && isDismissable && (
          <span
            aria-hidden="true"
            className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border-strong"
          />
        )}
        <SheetContent
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-describedby={ariaDescribedBy}
          role={role}
          className="flex min-h-0 flex-1 flex-col overflow-hidden outline-none group-data-expanded/sheet:overflow-auto"
        >
          {children}
        </SheetContent>
      </Sheet>
    </SheetOverlay>
  );
}
