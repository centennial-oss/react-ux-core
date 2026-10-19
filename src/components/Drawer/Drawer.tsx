import { useId, type ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { useIsPhone } from '../../utils/useMediaQuery';
import type { DialogContent } from '../Dialog/Dialog';
import { renderContent, SheetHeader } from '../Overlay/SheetHeader';
import { SheetSurface } from '../Overlay/SheetSurface';

export interface DrawerProps {
  /** The drawer's title; it labels the drawer. */
  title: ReactNode;
  description?: ReactNode;
  /** The body. A function receives `close`. */
  children: DialogContent;
  /** Actions, usually a ButtonGroup. A `<Button slot="close">` closes the drawer; a function receives `close`. */
  footer?: DialogContent;
  /** The edge it slides from on tablet and desktop. Defaults to `end`. Phones always use a bottom sheet. */
  side?: 'start' | 'end';
  /** Swipe, Escape and outside clicks close the drawer. Defaults to true. */
  isDismissable?: boolean;
  /** Controlled open state, when used without a DialogTrigger. */
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  className?: string;
}

/**
 * A side sheet with the same semantics as Dialog (modal, labelled, focus trapped and returned). It slides in from
 * the side on tablet and desktop and becomes a bottom sheet on phones. Open it from a DialogTrigger or with `isOpen`.
 */
export function Drawer({
  title,
  description,
  children,
  footer,
  side = 'end',
  isDismissable = true,
  isOpen,
  onOpenChange,
  className,
}: DrawerProps) {
  const isPhone = useIsPhone();
  const descriptionId = useId();

  return (
    <SheetSurface
      position={isPhone ? 'bottom' : side}
      isDismissable={isDismissable}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      aria-describedby={description !== undefined ? descriptionId : undefined}
      className={cn(!isPhone && 'w-[min(28rem,100vw-2rem)]', className)}
    >
      {({ close }) => (
        <>
          <SheetHeader
            title={title}
            description={description}
            descriptionId={descriptionId}
            onClose={isDismissable ? close : undefined}
          />
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2 text-sm">
            {renderContent(children, close)}
          </div>
          {footer !== undefined && (
            <footer className="shrink-0 border-t border-border px-4 py-3">
              {renderContent(footer, close)}
            </footer>
          )}
        </>
      )}
    </SheetSurface>
  );
}
