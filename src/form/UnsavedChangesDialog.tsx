import { useRef, type ReactNode } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog/ConfirmDialog';
import { useFormMessages } from './messages';

export interface UnsavedChangesDialogProps {
  /** Show it while the app's router blocker holds a navigation. */
  isOpen: boolean;
  /** The user chose to leave and lose the changes (let the navigation proceed). */
  onDiscard: () => void;
  /** The user chose to stay (cancel the navigation). */
  onKeepEditing: () => void;
  /** Defaults to the `unsavedChangesTitle` message. */
  title?: ReactNode;
  /** Defaults to the `unsavedChangesBody` message. */
  body?: ReactNode;
}

/**
 * Asks whether to discard unsaved changes. ConfigForm reports changes through `onDirtyChange`; the app wires its
 * router's navigation blocker to this dialog (the library has no router).
 */
export function UnsavedChangesDialog({
  isOpen,
  onDiscard,
  onKeepEditing,
  title,
  body,
}: UnsavedChangesDialogProps) {
  const messages = useFormMessages();
  // Confirming also closes the dialog; only a close without Discard means "keep editing".
  const hasDiscarded = useRef(false);
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (open) {
          hasDiscarded.current = false;
        } else if (!hasDiscarded.current) {
          onKeepEditing();
        }
      }}
      tone="danger"
      title={title ?? messages.unsavedChangesTitle}
      body={body ?? messages.unsavedChangesBody}
      confirmLabel={messages.discardChanges}
      cancelLabel={messages.keepEditing}
      onConfirm={() => {
        hasDiscarded.current = true;
        onDiscard();
      }}
    />
  );
}
