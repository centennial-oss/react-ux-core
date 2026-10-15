import { X } from 'lucide-react';
import { useContext, useMemo, type ReactNode } from 'react';
import {
  ButtonContext,
  Dialog,
  GroupContext,
  LabelContext,
  OverlayTriggerStateContext,
  Popover,
  Provider,
  TextContext,
} from 'react-aria-components';
import { useMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import { useIsPhone } from '../../utils/useMediaQuery';
import { IconButton } from '../IconButton/IconButton';
import { SheetSurface } from '../Overlay/SheetSurface';
import { popoverClasses } from '../Overlay/styles';

export interface PickerOverlayProps {
  children: ReactNode;
  /** Shown in the header of the phone sheet, usually the field's label. */
  title?: ReactNode;
  /** Accessible name for the dialog. Date pickers label it themselves (React Aria's DialogContext). */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  /** Classes for the content area. */
  className?: string;
}

/**
 * The surface a picker opens: an anchored popover on tablet and desktop, a full-screen sheet with a close button on
 * phones (spec phone behaviour for date and time pickers). It reads its open state from the surrounding React Aria
 * trigger (DatePicker, DateRangePicker or DialogTrigger).
 */
export function PickerOverlay({
  children,
  title,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  className,
}: PickerOverlayProps) {
  const isPhone = useIsPhone();
  const messages = useMessages();
  const triggerState = useContext(OverlayTriggerStateContext);
  // Escape, outside presses and the close button all close through `setOpen(false)`: React Aria's date picker state
  // commits a day picked without a time there, but its `close()` (used by dismissal) skips that.
  const state = useMemo(
    () =>
      triggerState && {
        ...triggerState,
        close: () => {
          triggerState.setOpen(false);
        },
      },
    [triggerState],
  );

  return (
    <OverlayTriggerStateContext.Provider value={state}>
      {isPhone ? (
        <SheetSurface
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          className="h-dvh max-h-dvh rounded-none pt-[env(safe-area-inset-top)]"
        >
          {/* A popover clears the picker's field contexts for its content; the sheet has to do it itself, or buttons
            and text inside would pick up the field's calendar-button and description props. */}
          <Provider
            values={[
              [GroupContext, null],
              [ButtonContext, null],
              [LabelContext, null],
              [TextContext, null],
            ]}
          >
            <div className="flex shrink-0 items-center gap-3 px-4 pt-1 pb-2">
              <div className="min-w-0 flex-1 truncate text-lg font-semibold">{title}</div>
              <IconButton
                icon={X}
                aria-label={messages.close}
                onPress={() => {
                  state?.close();
                }}
                className="-me-2"
              />
            </div>
            <div
              className={cn(
                'flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4',
                className,
              )}
            >
              {children}
            </div>
          </Provider>
        </SheetSurface>
      ) : (
        <Popover
          placement="bottom start"
          offset={8}
          className={cn('max-h-[min(40rem,80vh)] max-w-[calc(100vw-1.5rem)]', popoverClasses)}
        >
          <Dialog
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            className={cn('flex flex-col gap-3 p-3 outline-none', className)}
          >
            {children}
          </Dialog>
        </Popover>
      )}
    </OverlayTriggerStateContext.Provider>
  );
}
