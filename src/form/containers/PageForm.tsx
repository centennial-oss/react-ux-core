import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import type { HeadingLevel } from '../../utils/types';
import { FormElement } from '../ConfigForm';
import { FormActionBar } from '../FormActionBar';
import { FormView } from '../FormView';
import { FormRuntimeContext } from '../runtime';
import { useFormController, type FormControllerOptions } from '../useFormController';

export interface PageFormProps<V, TCustom extends string = never> extends FormControllerOptions<
  V,
  TCustom
> {
  title?: ReactNode;
  description?: ReactNode;
  /** The title's heading level. Defaults to 2 (the page header usually holds the 1). */
  headingLevel?: HeadingLevel;
  /** Shows a Cancel button in the action bar (for example to navigate back). */
  onCancel?: () => void;
  className?: string;
}

/**
 * A ConfigForm laid out as a page: an optional heading, the sections, and an action bar that stays at the bottom of
 * the screen while the page scrolls (above the safe area on phones). Focused fields scroll clear of the bar.
 */
export function PageForm<V, TCustom extends string = never>({
  title,
  description,
  headingLevel = 2,
  onCancel,
  className,
  ...options
}: PageFormProps<V, TCustom>) {
  const runtime = useFormController(options);
  const Heading = `h${String(headingLevel)}` as 'h2';
  const isEditing = runtime.mode === 'edit';
  return (
    <FormRuntimeContext.Provider value={runtime}>
      <div className={cn('flex min-w-0 flex-col gap-6', className)}>
        {(title !== undefined || description !== undefined) && (
          <div className="flex flex-col gap-1">
            {title !== undefined && (
              <Heading className="text-xl font-semibold text-fg">{title}</Heading>
            )}
            {description !== undefined && <p className="text-sm text-fg-muted">{description}</p>}
          </div>
        )}
        {isEditing ? (
          <>
            <FormElement className="scroll-pb-24" />
            <div className="sticky bottom-0 z-sticky -mx-4 border-t border-border bg-surface-1 px-4 pt-3 pb-[max(--spacing(3),env(safe-area-inset-bottom))]">
              <FormActionBar isSticky={false} onCancel={onCancel} />
            </div>
          </>
        ) : (
          <FormView />
        )}
      </div>
    </FormRuntimeContext.Provider>
  );
}
