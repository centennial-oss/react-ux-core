// Pieces for fields that aren't React Aria fields (a group of swatches, a dial, a list of rows): they wire their own
// label, description and error ids instead of using React Aria's slots.

import { useId, type ReactNode } from 'react';
import { cn } from '../../utils/cn';
import type { FieldBaseProps } from './Field';

/** Ids for a standalone field's label, description and error message. */
export function useFieldIds() {
  return { labelId: useId(), descriptionId: useId(), errorId: useId() };
}

/** Names an element by the visible label when there is one, otherwise by `aria-label`. */
export function ariaLabelProps(label: ReactNode, labelId: string, ariaLabel: string | undefined) {
  return label !== undefined ? { 'aria-labelledby': labelId } : { 'aria-label': ariaLabel };
}

/**
 * The app's error message for a standalone field to show, or `undefined`: shown while the field is invalid, and only a
 * message it can render (a function needs React Aria's validation result, which a standalone field doesn't have).
 */
export function shownError(
  isInvalid: boolean,
  errorMessage: FieldBaseProps['errorMessage'],
): ReactNode {
  return isInvalid && typeof errorMessage !== 'function' ? errorMessage : undefined;
}

/** A standalone field's help text, linked by `id` from the field's `aria-describedby`. */
export function PlainFieldDescription({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span id={id} className={cn('text-xs text-fg-muted', className)}>
      {children}
    </span>
  );
}

/** A standalone field's error message, linked by `id` from the field's `aria-describedby`. Nothing when undefined. */
export function PlainFieldError({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: ReactNode;
}) {
  return children === undefined ? null : (
    <span id={id} className={cn('text-xs font-medium text-danger-fg', className)}>
      {children}
    </span>
  );
}
