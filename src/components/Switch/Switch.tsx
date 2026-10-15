import type { ReactNode, Ref } from 'react';
import {
  SwitchButton,
  SwitchField,
  type SwitchFieldProps as AriaSwitchFieldProps,
} from 'react-aria-components';
import { cn } from '../../utils/cn';
import { FieldDescription, FieldErrorMessage, type FieldBaseProps } from '../Field/Field';

export interface SwitchProps extends Omit<
  AriaSwitchFieldProps,
  'className' | 'style' | 'children' | 'render' | 'onChange'
> {
  /** The visible label, read as the switch's name. Without one, pass `aria-label`. */
  children?: ReactNode;
  /** Help text under the label. */
  description?: ReactNode;
  /** Shown when the switch is invalid (`isInvalid`, or failed validation). */
  errorMessage?: FieldBaseProps['errorMessage'];
  /** Called with the new on/off state. Pair with `isSelected` to control it, or use `defaultSelected`. */
  onChange?: (isSelected: boolean) => void;
  className?: string;
  /** The switch's root element. */
  ref?: Ref<HTMLDivElement>;
}

/**
 * An on/off setting that takes effect immediately, such as "Email notifications". It's a checkbox with
 * `role="switch"`: Space toggles it, and the whole label row is the touch target.
 */
export function Switch({ children, description, errorMessage, className, ...rest }: SwitchProps) {
  return (
    <SwitchField
      {...rest}
      className={cn('flex min-w-0 flex-col gap-0.5 text-sm text-fg', className)}
    >
      <SwitchButton
        className={cn(
          'group/switch inline-flex min-h-hit min-w-hit cursor-pointer items-center gap-2.5 self-start select-none',
          'data-disabled:cursor-not-allowed data-disabled:opacity-50 data-readonly:cursor-default',
        )}
      >
        {({ isSelected, isInvalid }) => (
          <>
            <span
              aria-hidden="true"
              className={cn(
                'inline-flex h-5 w-9 shrink-0 items-center rounded-full border',
                'transition-colors duration-(--duration-fast) ease-standard',
                'group-data-focus-visible/switch:focus-ring',
                isSelected
                  ? 'border-accent-solid bg-accent-solid'
                  : 'border-border-strong bg-surface-4',
                isInvalid && 'border-danger-solid',
                isInvalid && isSelected && 'bg-danger-solid',
              )}
            >
              <span
                className={cn(
                  // Off, the thumb sits 2 px in from the start; on, 2 px in from the end (34 px inner - 14 px - 2 px).
                  'size-3.5 rounded-full transition-[translate,background-color] duration-(--duration-fast) ease-standard',
                  isSelected
                    ? 'translate-x-4.5 bg-accent-on-solid rtl:-translate-x-4.5'
                    : 'translate-x-0.5 bg-fg-muted rtl:-translate-x-0.5',
                )}
              />
            </span>
            {children !== undefined && <span className="min-w-0">{children}</span>}
          </>
        )}
      </SwitchButton>
      {(description !== undefined || errorMessage !== undefined) && (
        // Indented to line up with the label text (track width plus gap).
        <div className="flex flex-col gap-0.5 ps-11.5">
          {description !== undefined && <FieldDescription>{description}</FieldDescription>}
          <FieldErrorMessage>{errorMessage}</FieldErrorMessage>
        </div>
      )}
    </SwitchField>
  );
}
