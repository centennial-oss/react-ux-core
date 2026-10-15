import { useState } from 'react';
import { Button } from '../components/Button/Button';
import { ConfirmDialog } from '../components/ConfirmDialog/ConfirmDialog';

import { cn } from '../utils/cn';
import { useFormRuntime } from './runtime';
import { useFormMessages } from './messages';

export interface FormActionBarProps {
  /** On phones, keeps the bar at the bottom of the screen while the form scrolls. Defaults to true. */
  isSticky?: boolean;
  /** Shows a Cancel button (containers use it to close). */
  onCancel?: () => void;
  className?: string;
}

/**
 * The generated buttons: Create; or Save, Revert (while there are changes) and Delete (while there are none, when
 * configured, always confirmed). With the edit toggle, Cancel returns to view mode.
 */
export function FormActionBar({ isSticky = true, onCancel, className }: FormActionBarProps) {
  const { actions, status, isDirty, formId, revert, deleteRecord, hasEditToggle, setMode } =
    useFormRuntime();
  const messages = useFormMessages();
  const [isDeleteOpen, setDeleteOpen] = useState(false);

  if (actions.kind === 'none' && !onCancel) {
    return null;
  }

  const isBusy = status === 'submitting' || status === 'validating';
  const showRevert = actions.kind === 'update' && actions.hasRevert && isDirty;
  const showDelete = actions.kind === 'update' && actions.hasDelete && !isDirty;
  const cancel =
    onCancel ??
    (hasEditToggle
      ? () => {
          revert();
          setMode('view');
        }
      : undefined);
  const confirmation = actions.deleteConfirmation;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2',
        // Phones: a bar pinned to the bottom of the screen, above the safe area.
        isSticky &&
          'max-sm:sticky max-sm:bottom-0 max-sm:z-sticky max-sm:-mx-4 max-sm:border-t max-sm:border-border max-sm:bg-surface-1 max-sm:px-4 max-sm:pt-3 max-sm:pb-[max(--spacing(3),env(safe-area-inset-bottom))]',
        className,
      )}
    >
      {showDelete && (
        <Button
          variant="ghost"
          tone="danger"
          isDisabled={isBusy}
          onPress={() => {
            setDeleteOpen(true);
          }}
        >
          {messages.delete}
        </Button>
      )}
      <div className="ms-auto flex flex-wrap items-center justify-end gap-2">
        {cancel && (
          <Button variant="ghost" isDisabled={isBusy} onPress={cancel}>
            {messages.cancel}
          </Button>
        )}
        {showRevert && (
          <Button variant="outline" isDisabled={isBusy} onPress={revert}>
            {messages.revert}
          </Button>
        )}
        {actions.kind !== 'none' && (
          <Button type="submit" form={formId} tone="accent" isPending={isBusy}>
            {actions.submitLabel ?? (actions.kind === 'create' ? messages.create : messages.save)}
          </Button>
        )}
      </div>
      {showDelete && (
        <ConfirmDialog
          isOpen={isDeleteOpen}
          onOpenChange={setDeleteOpen}
          tone="danger"
          title={confirmation?.title ?? messages.deleteRecordTitle}
          body={confirmation?.body}
          consequence={confirmation?.consequence ?? messages.cannotBeUndone}
          confirmText={confirmation?.confirmText}
          confirmLabel={messages.delete}
          onConfirm={deleteRecord}
        />
      )}
    </div>
  );
}
