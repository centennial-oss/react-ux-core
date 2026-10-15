import { Banner } from '../components/Banner/Banner';
import { ConfirmDialog } from '../components/ConfirmDialog/ConfirmDialog';

import { useFormRuntime } from './runtime';
import { useFormMessages } from './messages';

/**
 * The form's status: the form-level error banner (announced), a live region that announces failed submits, and the
 * confirmation dialog for a needs-confirmation result.
 */
export function FormStatus() {
  const { formError, announcement, confirmation, confirmSubmit, cancelConfirmation } =
    useFormRuntime();
  const messages = useFormMessages();
  const hasFormError = formError !== null && formError !== undefined && formError !== '';

  return (
    <>
      {hasFormError && <Banner tone="danger">{formError}</Banner>}
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
      <ConfirmDialog
        isOpen={confirmation !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            cancelConfirmation();
          }
        }}
        title={messages.confirmSubmitTitle}
        body={confirmation?.warning}
        confirmLabel={confirmation?.confirmLabel}
        onConfirm={confirmSubmit}
      />
    </>
  );
}
