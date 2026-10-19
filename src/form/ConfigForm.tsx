import type { ReactNode } from 'react';
import { cn } from '../utils/cn';
import { FormActionBar } from './FormActionBar';
import { FormFields } from './FormFields';
import { FormStatus } from './FormStatus';
import { FormView } from './FormView';
import { FormRuntimeContext, useFormRuntime } from './runtime';
import { useFormController, type FormControllerOptions } from './useFormController';

/** The `<form>` element with the status area and the fields. Containers put the action bar elsewhere. */
export function FormElement({ className, children }: { className?: string; children?: ReactNode }) {
  const { formId, setRootElement, submit, status } = useFormRuntime();
  return (
    <form
      id={formId}
      ref={setRootElement}
      noValidate
      aria-busy={status === 'submitting' || undefined}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className={cn('@container/form flex min-w-0 flex-col gap-6', className)}
    >
      <FormStatus />
      <FormFields />
      {children}
    </form>
  );
}

export interface ConfigFormProps<V, TCustom extends string = never> extends FormControllerOptions<
  V,
  TCustom
> {
  className?: string;
  /** On phones, keeps the action bar at the bottom of the screen while the form scrolls. Defaults to true. */
  hasStickyActions?: boolean;
}

/**
 * A form described as data. It renders the fields from the config (through the field registry), owns the values
 * (with TanStack Form), validates them (on blur first, then on change, everything on submit), and runs the submit
 * lifecycle: server field and form errors, a needs-confirmation step, and focus on the first invalid field. Parents
 * observe through callbacks; they never hold a second copy of the values. `mode="view"` shows the same config as a
 * read-only description list.
 */
export function ConfigForm<V, TCustom extends string = never>({
  className,
  hasStickyActions = true,
  ...options
}: ConfigFormProps<V, TCustom>) {
  const runtime = useFormController(options);
  return (
    <FormRuntimeContext.Provider value={runtime}>
      {runtime.mode === 'view' ? (
        <FormView className={className} />
      ) : (
        <FormElement className={className}>
          <FormActionBar isSticky={hasStickyActions} />
        </FormElement>
      )}
    </FormRuntimeContext.Provider>
  );
}
