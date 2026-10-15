import { useContext, useState, type ReactNode } from 'react';
import { OverlayTriggerStateContext } from 'react-aria-components';
import { useMessages } from '../../provider/context';
import { Banner } from '../Banner/Banner';
import { Button } from '../Button/Button';
import { ButtonGroup } from '../ButtonGroup/ButtonGroup';
import { Dialog } from '../Dialog/Dialog';
import { TextField } from '../TextField/TextField';

export interface ConfirmDialogProps {
  title: ReactNode;
  body?: ReactNode;
  /** What happens if the user confirms, for example "This can't be undone." */
  consequence?: ReactNode;
  /** `danger` for destructive actions. Defaults to `neutral`. */
  tone?: 'neutral' | 'danger';
  /** Defaults to the `confirm` message. */
  confirmLabel?: string;
  /** Defaults to the `cancel` message. */
  cancelLabel?: string;
  /** A word or name the user must type before Confirm is enabled. */
  confirmText?: string;
  /**
   * Called when the user confirms. If it returns a promise, the dialog shows a pending state until it settles,
   * closes when it resolves, and shows the error inline (staying open) when it rejects.
   */
  onConfirm: () => void | Promise<void>;
  /** Controlled open state, when used without a DialogTrigger. */
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

/** Asks the user to confirm an action, optionally by typing a word or name first (`alertdialog`). */
export function ConfirmDialog({
  title,
  body,
  consequence,
  tone = 'neutral',
  confirmLabel,
  cancelLabel,
  confirmText,
  onConfirm,
  isOpen,
  defaultOpen,
  onOpenChange,
}: ConfirmDialogProps) {
  const messages = useMessages();
  const triggerState = useContext(OverlayTriggerStateContext);
  const isShown = isOpen ?? triggerState?.isOpen ?? defaultOpen ?? false;

  const [typed, setTyped] = useState('');
  const [isPending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start fresh each time the dialog opens (React's "adjust state when a prop changes" pattern).
  const [wasShown, setWasShown] = useState(isShown);
  if (isShown !== wasShown) {
    setWasShown(isShown);
    if (isShown) {
      setTyped('');
      setError(null);
      setPending(false);
    }
  }

  const isConfirmEnabled = confirmText === undefined || typed === confirmText;

  const confirm = async (close: () => void) => {
    if (!isConfirmEnabled || isPending) {
      return;
    }
    setError(null);
    setPending(true);
    try {
      await onConfirm();
      setPending(false);
      close();
    } catch (reason) {
      setPending(false);
      setError(
        reason instanceof Error && reason.message !== '' ? reason.message : messages.genericError,
      );
    }
  };

  return (
    <Dialog
      title={title}
      role="alertdialog"
      size="sm"
      isBusy={isPending}
      isOpen={isOpen}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      footer={(close) => (
        <ButtonGroup>
          <Button slot="close" variant="outline" isDisabled={isPending}>
            {cancelLabel ?? messages.cancel}
          </Button>
          <Button
            tone={tone === 'danger' ? 'danger' : 'accent'}
            isPending={isPending}
            isDisabled={!isConfirmEnabled}
            onPress={() => void confirm(close)}
          >
            {confirmLabel ?? messages.confirm}
          </Button>
        </ButtonGroup>
      )}
    >
      {(close) => (
        <div className="flex flex-col gap-3">
          {body !== undefined && <div>{body}</div>}
          {consequence !== undefined && (
            <p className={tone === 'danger' ? 'font-medium text-danger-fg' : 'font-medium'}>
              {consequence}
            </p>
          )}
          {confirmText !== undefined && (
            <TextField
              label={messages.typeToConfirm({ text: confirmText })}
              value={typed}
              onChange={setTyped}
              autoComplete="off"
              isDisabled={isPending}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void confirm(close);
                }
              }}
            />
          )}
          {error !== null && <Banner tone="danger">{error}</Banner>}
        </div>
      )}
    </Dialog>
  );
}
