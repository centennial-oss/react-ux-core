import { useCallback, useState, type ReactNode } from 'react';
import { PopoverContext, PreviewTrigger, useSlottedContext } from 'react-aria-components';
import { cn } from '../../utils/cn';
import { useControllableState } from '../../utils/useControllableState';
import { PHONE_QUERY, useIsPhone } from '../../utils/useMediaQuery';
import { PopoverSurface } from '../Overlay/PopoverSurface';
import { SheetSurface } from '../Overlay/SheetSurface';
import type { PopoverProps } from '../Popover/Popover';

type SurfaceProps = Pick<
  PopoverProps,
  | 'aria-label'
  | 'aria-labelledby'
  | 'hasArrow'
  | 'hasPhoneSheet'
  | 'placement'
  | 'offset'
  | 'crossOffset'
  | 'shouldFlip'
  | 'className'
>;

export interface HoverCardProps extends SurfaceProps {
  /**
   * The trigger: one focusable React Aria-based element, such as a Button with `href` (a link) or an IconButton. It
   * keeps its own action, so a link still navigates when pressed.
   */
  children: ReactNode;
  /** The card. It may hold interactive content (links, buttons), which Tab reaches from the trigger. */
  content: ReactNode;
  /** Milliseconds of hover or keyboard focus before opening. Defaults to 600. A touch long press opens it at once. */
  delay?: number;
  /** Milliseconds before closing once the pointer and focus have left the trigger and the card. Defaults to 200. */
  closeDelay?: number;
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  isDisabled?: boolean;
}

/**
 * A card that previews what its trigger leads to (a person, a page) on hover, keyboard focus or a touch long press,
 * after a short delay. Unlike a tooltip it may hold links and buttons; unlike a popover the trigger keeps its own
 * action. Placed and styled like Popover, and like Popover a bottom sheet on phones. Built on React Aria's
 * PreviewTrigger.
 */
export function HoverCard({
  children,
  content,
  delay,
  closeDelay,
  isOpen: isOpenProp,
  defaultOpen = false,
  onOpenChange,
  isDisabled,
  hasPhoneSheet = true,
  ...surface
}: HoverCardProps) {
  const [isOpen, setOpen] = useControllableState(isOpenProp, defaultOpen, onOpenChange);
  // The card mounts when it first opens, so a page of triggers (a table of names) costs no popovers until one is used.
  const [hasOpened, setHasOpened] = useState(isOpen);
  if (isOpen && !hasOpened) {
    setHasOpened(true);
  }

  const onPreviewOpenChange = useCallback(
    (open: boolean) => {
      // On phones the card is a modal sheet that takes focus, which the preview reads as focus leaving it: only the
      // sheet closes itself (a swipe, the scrim or Escape).
      if (open || !hasPhoneSheet || !window.matchMedia(PHONE_QUERY).matches) {
        setOpen(open);
      }
    },
    [hasPhoneSheet, setOpen],
  );

  return (
    <PreviewTrigger
      isOpen={isOpen}
      onOpenChange={onPreviewOpenChange}
      delay={delay}
      closeDelay={closeDelay}
      isDisabled={isDisabled}
    >
      {children}
      {hasOpened && (
        <HoverCardSurface
          {...surface}
          hasPhoneSheet={hasPhoneSheet}
          isOpen={isOpen}
          onOpenChange={setOpen}
        >
          {content}
        </HoverCardSurface>
      )}
    </PreviewTrigger>
  );
}

interface HoverCardSurfaceProps extends SurfaceProps {
  children: ReactNode;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

/** The card: PreviewTrigger's own popover (it's the dialog, with no Dialog inside), or on phones a bottom sheet. */
function HoverCardSurface({
  children,
  hasPhoneSheet,
  isOpen,
  onOpenChange,
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...anchor
}: HoverCardSurfaceProps) {
  const isPhone = useIsPhone();
  // PreviewTrigger's popover id (which the trigger's aria-controls and aria-describedby name) and element ref, which
  // tracks where focus is. On phones the sheet's dialog takes both.
  const preview = useSlottedContext(PopoverContext);

  if (isPhone && hasPhoneSheet) {
    return (
      // The sheet replaces PreviewTrigger's popover, so a popover inside the card mustn't pick up its settings.
      <PopoverContext.Provider value={null}>
        <SheetSurface
          id={preview?.id}
          dialogRef={preview?.ref}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          isOpen={isOpen}
          onOpenChange={onOpenChange}
        >
          <div className={cn('p-4', className)}>{children}</div>
        </SheetSurface>
      </PopoverContext.Provider>
    );
  }

  return (
    <PopoverSurface {...anchor} aria-label={ariaLabel} aria-labelledby={ariaLabelledBy}>
      <div className={cn('p-3', className)}>{children}</div>
    </PopoverSurface>
  );
}
