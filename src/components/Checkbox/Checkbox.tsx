import { Check, Minus } from 'lucide-react';
import type { ReactNode, Ref } from 'react';
import {
  CheckboxButton,
  CheckboxField,
  type CheckboxFieldProps as AriaCheckboxFieldProps,
} from 'react-aria-components';
import { cn } from '../../utils/cn';
import { FieldDescription, FieldErrorMessage, type FieldBaseProps } from '../Field/Field';

export interface CheckboxProps extends Omit<
  AriaCheckboxFieldProps,
  'className' | 'style' | 'children' | 'render' | 'onChange'
> {
  /** The visible label, read as the checkbox's name. Without one, pass `aria-label`. */
  children?: ReactNode;
  /** Help text under the label. */
  description?: ReactNode;
  /**
   * Shown when a standalone checkbox is invalid (`isInvalid`, or failed validation). Inside a `CheckboxGroup`, the
   * group shows the error instead.
   */
  errorMessage?: FieldBaseProps['errorMessage'];
  /**
   * Called with the new checked state. Pair with `isSelected` to control it, or use `defaultSelected`. Inside a
   * `CheckboxGroup`, the group's `value` and `onChange` own the state and `value` names this checkbox.
   */
  onChange?: (isSelected: boolean) => void;
  className?: string;
  /** The checkbox's root element. */
  ref?: Ref<HTMLDivElement>;
}

/**
 * A single checkbox with its label, on its own (`isSelected` / `onChange`) or as an option in a `CheckboxGroup`
 * (`value`). `isIndeterminate` shows a dash for a partly selected parent. The whole label row is the touch target.
 */
export function Checkbox({
  children,
  description,
  errorMessage,
  className,
  ...rest
}: CheckboxProps) {
  return (
    <CheckboxField
      {...rest}
      className={cn('flex min-w-0 flex-col gap-0.5 text-sm text-fg', className)}
    >
      <CheckboxButton
        className={cn(
          'group/checkbox inline-flex min-h-hit min-w-hit cursor-pointer items-center gap-2 self-start select-none',
          'data-disabled:cursor-not-allowed data-disabled:opacity-50 data-readonly:cursor-default',
        )}
      >
        {({ isSelected, isIndeterminate, isInvalid }) => {
          const isFilled = isSelected || isIndeterminate;
          return (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  'inline-flex size-4 shrink-0 items-center justify-center rounded-[0.25rem] border',
                  'transition-colors duration-(--duration-fast) ease-standard',
                  'group-data-focus-visible/checkbox:focus-ring',
                  isFilled
                    ? 'border-accent-solid bg-accent-solid text-accent-on-solid'
                    : 'border-border-strong bg-surface-2 group-data-hovered/checkbox:bg-surface-3',
                  isInvalid && 'border-danger-solid',
                  isInvalid && isFilled && 'bg-danger-solid text-danger-on-solid',
                )}
              >
                {isIndeterminate ? (
                  <Minus className="size-3" strokeWidth={3} />
                ) : (
                  isSelected && <Check className="size-3" strokeWidth={3} />
                )}
              </span>
              {children !== undefined && <span className="min-w-0">{children}</span>}
            </>
          );
        }}
      </CheckboxButton>
      {(description !== undefined || errorMessage !== undefined) && (
        // Indented to line up with the label text (box width plus gap).
        <div className="flex flex-col gap-0.5 ps-6">
          {description !== undefined && <FieldDescription>{description}</FieldDescription>}
          <FieldErrorMessage>{errorMessage}</FieldErrorMessage>
        </div>
      )}
    </CheckboxField>
  );
}
