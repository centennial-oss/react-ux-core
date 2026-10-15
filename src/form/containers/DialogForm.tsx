import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog';
import { Dialog, type DialogSize } from '../../components/Dialog/Dialog';

import { FormElement } from '../ConfigForm';
import { FormActionBar } from '../FormActionBar';
import { FormRuntimeContext, useFormRuntime } from '../runtime';
import { useFormController, type FormControllerOptions } from '../useFormController';
import { useFormMessages } from '../messages';

export interface DialogFormProps<V, TCustom extends string = never> extends Omit<
  FormControllerOptions<V, TCustom>,
  'mode' | 'defaultMode' | 'onModeChange' | 'hasEditToggle'
> {
  title: ReactNode;
  description?: ReactNode;
  /** Maximum width on tablet and desktop. Defaults to `md`. Phones always show a full-screen sheet. */
  size?: DialogSize;
  /** Closes the dialog after a successful submit. Defaults to true. */
  shouldCloseOnSuccess?: boolean;
  /** Controlled open state, when used without a DialogTrigger. */
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

/** Inside the open dialog: closes it after a successful submit, and starts over when it closes. */
function DialogFormBody({
  close,
  shouldCloseOnSuccess,
}: {
  close: () => void;
  shouldCloseOnSuccess: boolean;
}) {
  const { status, revert } = useFormRuntime();
  // Close once, when the status becomes `succeeded`: `close` is a new function on every render, and the status stays
  // `succeeded` while the dialog animates out.
  const latestClose = useRef(close);
  useLayoutEffect(() => {
    latestClose.current = close;
  });
  useEffect(() => {
    if (shouldCloseOnSuccess && status === 'succeeded') {
      latestClose.current();
    }
  }, [shouldCloseOnSuccess, status]);
  // A dialog opened again shows the record as saved, not edits that were cancelled.
  useEffect(() => revert, [revert]);
  return <FormElement />;
}

function DialogFormFooter({ close }: { close: () => void }) {
  const { isDirty } = useFormRuntime();
  const messages = useFormMessages();
  const [isDiscardOpen, setDiscardOpen] = useState(false);
  return (
    <>
      <FormActionBar
        isSticky={false}
        onCancel={() => {
          if (isDirty) {
            setDiscardOpen(true);
          } else {
            close();
          }
        }}
        className="w-full"
      />
      <ConfirmDialog
        isOpen={isDiscardOpen}
        onOpenChange={setDiscardOpen}
        tone="danger"
        title={messages.unsavedChangesTitle}
        body={messages.unsavedChangesBody}
        confirmLabel={messages.discardChanges}
        cancelLabel={messages.keepEditing}
        onConfirm={close}
      />
    </>
  );
}

/**
 * A ConfigForm in a modal dialog, with the buttons in the dialog footer. It can't be dismissed while submitting, and
 * with unsaved changes Escape and the backdrop don't close it: Cancel asks before discarding them. It closes after a
 * successful submit. Use it inside a DialogTrigger, or control `isOpen`.
 */
export function DialogForm<V, TCustom extends string = never>({
  title,
  description,
  size,
  shouldCloseOnSuccess = true,
  isOpen,
  defaultOpen,
  onOpenChange,
  ...options
}: DialogFormProps<V, TCustom>) {
  const runtime = useFormController(options);
  const isBusy = runtime.status === 'submitting' || runtime.status === 'validating';
  return (
    <FormRuntimeContext.Provider value={runtime}>
      <Dialog
        title={title}
        description={description}
        size={size}
        isBusy={isBusy}
        isDismissable={!runtime.isDirty}
        hasCloseButton={false}
        isOpen={isOpen}
        defaultOpen={defaultOpen}
        onOpenChange={onOpenChange}
        footer={(close) => <DialogFormFooter close={close} />}
      >
        {(close) => <DialogFormBody close={close} shouldCloseOnSuccess={shouldCloseOnSuccess} />}
      </Dialog>
    </FormRuntimeContext.Provider>
  );
}
