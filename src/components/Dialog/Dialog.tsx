import { X } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import {
  Dialog as AriaDialog,
  DialogTrigger as AriaDialogTrigger,
  Heading,
  Modal,
  ModalOverlay,
  Text,
} from 'react-aria-components';
import { useMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import { IconButton } from '../IconButton/IconButton';

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl';

const sizeClasses: Record<DialogSize, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
};

/**
 * Pairs a trigger (its first child, usually a Button) with a `Dialog` or `Drawer` (its second child). Controlled
 * with `isOpen` / `onOpenChange` or uncontrolled with `defaultOpen`.
 */
export const DialogTrigger = AriaDialogTrigger;

/** Content that can close its dialog: a node, or a function that receives `close`. */
export type DialogContent = ReactNode | ((close: () => void) => ReactNode);

export interface DialogProps {
  /** The dialog's title; it labels the dialog. */
  title: ReactNode;
  /** Supporting text under the title; it describes the dialog. */
  description?: ReactNode;
  /** The body. A function receives `close`. */
  children: DialogContent;
  /**
   * Actions, usually a ButtonGroup. A `<Button slot="close">` closes the dialog; a function receives `close`.
   */
  footer?: DialogContent;
  /** Maximum width on tablet and desktop. Defaults to `md`. Phones always show a full-screen sheet. */
  size?: DialogSize;
  /** Escape and clicking the backdrop close the dialog. Defaults to true. Always off while `isBusy`. */
  isDismissable?: boolean;
  /** Something is in progress: dismissal and the close button are disabled, and the dialog is `aria-busy`. */
  isBusy?: boolean;
  /** Shows a close (×) button in the header. Defaults to `isDismissable`. */
  hasCloseButton?: boolean;
  /** `alertdialog` for confirmations that interrupt the user. Defaults to `dialog`. */
  role?: 'dialog' | 'alertdialog';
  /** Controlled open state, when used without a DialogTrigger. */
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  className?: string;
  classNames?: { body?: string; footer?: string };
}

function renderContent(content: DialogContent, close: () => void): ReactNode {
  return typeof content === 'function' ? content(close) : content;
}

/**
 * A modal dialog. The page behind is dimmed and inert, focus is trapped inside and returns to the trigger on close,
 * and the page doesn't scroll. Stacked dialogs close one at a time with Escape. On phones it's a full-screen sheet
 * whose footer stays above the on-screen keyboard and the safe area.
 */
export function Dialog({
  title,
  description,
  children,
  footer,
  size = 'md',
  isDismissable = true,
  isBusy = false,
  hasCloseButton,
  role,
  isOpen,
  defaultOpen,
  onOpenChange,
  className,
  classNames,
}: DialogProps) {
  const messages = useMessages();
  const descriptionId = useId();
  const canDismiss = isDismissable && !isBusy;
  const showCloseButton = hasCloseButton ?? isDismissable;

  return (
    <ModalOverlay
      isDismissable={canDismiss}
      isKeyboardDismissDisabled={!canDismiss}
      {...(isOpen !== undefined ? { isOpen } : {})}
      {...(defaultOpen !== undefined ? { defaultOpen } : {})}
      {...(onOpenChange !== undefined ? { onOpenChange } : {})}
      className={cn(
        'fixed inset-0 z-modal flex h-(--visual-viewport-height) items-end justify-center bg-scrim sm:items-center sm:p-4',
        'data-entering:animate-[rux-fade-in_var(--duration-normal)_var(--ease-standard)]',
        'data-exiting:animate-[rux-fade-out_var(--duration-fast)_var(--ease-standard)]',
      )}
    >
      <Modal
        className={cn(
          'flex h-full w-full flex-col bg-surface-2 text-fg shadow-overlay outline-none',
          'sm:h-auto sm:max-h-full sm:rounded-card',
          'data-entering:animate-[rux-pop-in_var(--duration-normal)_var(--ease-standard)]',
          'data-exiting:animate-[rux-pop-out_var(--duration-fast)_var(--ease-standard)]',
          sizeClasses[size],
          className,
        )}
      >
        <AriaDialog
          role={role}
          aria-describedby={description !== undefined ? descriptionId : undefined}
          className="flex min-h-0 flex-1 flex-col outline-none"
          // React Aria drops aria-busy, so add it to the dialog element directly.
          render={(domProps) => <section {...domProps} aria-busy={isBusy || undefined} />}
        >
          {({ close }) => (
            <>
              <header className="flex shrink-0 items-start gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2 sm:pt-4">
                <div className="min-w-0 flex-1">
                  <Heading slot="title" className="text-lg font-semibold">
                    {title}
                  </Heading>
                  {description !== undefined && (
                    <Text id={descriptionId} className="mt-1 block text-sm text-fg-muted">
                      {description}
                    </Text>
                  )}
                </div>
                {showCloseButton && (
                  <IconButton
                    icon={X}
                    aria-label={messages.close}
                    size="sm"
                    isDisabled={isBusy}
                    onPress={close}
                    className="-me-1 -mt-1"
                  />
                )}
              </header>
              <div
                className={cn('min-h-0 flex-1 overflow-y-auto px-4 py-2 text-sm', classNames?.body)}
              >
                {renderContent(children, close)}
              </div>
              {footer !== undefined && (
                <footer
                  className={cn(
                    'shrink-0 border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:border-t-0 sm:pb-4',
                    classNames?.footer,
                  )}
                >
                  {renderContent(footer, close)}
                </footer>
              )}
            </>
          )}
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}
