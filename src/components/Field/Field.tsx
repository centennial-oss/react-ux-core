// The frame every input renders through (spec §4.5): label, description and error message, wired by React Aria
// (aria-labelledby, aria-describedby, aria-errormessage), a required indicator, and top or side label placement
// from one markup structure. Side labels drop to the top in narrow containers.

import type { ReactNode } from 'react';
import {
  ButtonContext,
  FieldError,
  Label,
  Text,
  type ValidationResult,
} from 'react-aria-components';
import { cn } from '../../utils/cn';
import { controlHeightClasses, disabledClasses } from '../../utils/stateClasses';
import { InfoTip } from '../InfoTip/InfoTip';

/** Props every input shares. */
export interface FieldBaseProps {
  /** The visible label. Without one, pass `aria-label`. */
  label?: ReactNode;
  /** Help text under the input. */
  description?: ReactNode;
  /** Shown when the field is invalid (`isInvalid`, or failed validation). A function receives the validation result. */
  errorMessage?: ReactNode | ((validation: ValidationResult) => ReactNode);
  /** `side` puts the label beside the input in containers wider than 28rem. Defaults to `top`. */
  labelPosition?: 'top' | 'side';
  /** Extra help behind an (i) button next to the label. */
  infoTip?: ReactNode;
}

/** Classes for a field's root (the React Aria field element). */
export function fieldRootClasses(className?: string): string {
  return cn('group/field @container flex min-w-0 flex-col text-sm text-fg', className);
}

/** The label/control layout inside a field root. */
export function FieldLayout({
  labelPosition = 'top',
  label,
  children,
}: {
  labelPosition?: 'top' | 'side';
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'grid gap-1.5',
        labelPosition === 'side' &&
          '@md:grid-cols-[minmax(7rem,12rem)_minmax(0,1fr)] @md:items-start @md:gap-x-4',
      )}
    >
      {label}
      <div className="flex min-w-0 flex-col gap-1.5">{children}</div>
    </div>
  );
}

export function FieldLabel({
  children,
  isRequired = false,
  labelPosition = 'top',
}: {
  children: ReactNode;
  isRequired?: boolean;
  labelPosition?: 'top' | 'side';
}) {
  return (
    <Label className={cn('font-medium text-fg', labelPosition === 'side' && '@md:pt-2.5')}>
      {children}
      {isRequired && (
        <span aria-hidden="true" className="ms-0.5 text-danger-fg">
          *
        </span>
      )}
    </Label>
  );
}

export function FieldDescription({ children }: { children: ReactNode }) {
  return (
    <Text slot="description" className="text-xs text-fg-muted">
      {children}
    </Text>
  );
}

export function FieldErrorMessage({ children }: { children: FieldBaseProps['errorMessage'] }) {
  return <FieldError className="text-xs font-medium text-danger-fg">{children}</FieldError>;
}

/** Renders the label, the control, the description and the error for a field. */
export function FieldFrame({
  label,
  description,
  errorMessage,
  labelPosition = 'top',
  infoTip,
  isRequired,
  children,
}: FieldBaseProps & { isRequired?: boolean; children: ReactNode }) {
  const fieldLabel =
    label !== undefined ? (
      <FieldLabel isRequired={isRequired} labelPosition={labelPosition}>
        {label}
      </FieldLabel>
    ) : null;
  return (
    <FieldLayout
      labelPosition={labelPosition}
      label={
        // The (i) button sits beside the label, not inside it: a <label> can't contain a button.
        infoTip !== undefined && fieldLabel !== null ? (
          <div
            className={cn(
              'flex min-w-0 items-center gap-1',
              labelPosition === 'side' && '@md:items-start',
            )}
          >
            {fieldLabel}
            <span className={cn('inline-flex', labelPosition === 'side' && '@md:pt-2')}>
              {/* Inputs such as NumberField give their buttons slots; this button isn't one of them. */}
              <ButtonContext.Provider value={null}>
                <InfoTip>{infoTip}</InfoTip>
              </ButtonContext.Provider>
            </span>
          </div>
        ) : (
          fieldLabel
        )
      }
    >
      {children}
      {description !== undefined && <FieldDescription>{description}</FieldDescription>}
      <FieldErrorMessage>{errorMessage}</FieldErrorMessage>
    </FieldLayout>
  );
}

/** The bordered box around an input and its adornments. */
export const inputGroupClasses = [
  'flex min-h-hit w-full items-center rounded-control border border-border-strong bg-surface-2 text-fg',
  'has-[input:focus-visible,textarea:focus-visible]:focus-ring',
  'group-data-invalid/field:border-danger-solid group-data-disabled/field:opacity-50',
  'group-data-readonly/field:bg-surface-1',
].join(' ');

/** The input element inside an input group. Text is 16px on phones so iOS doesn't zoom. */
export const inputClasses =
  'h-full min-w-0 flex-1 bg-transparent px-3 text-base text-fg outline-none placeholder:text-fg-muted disabled:cursor-not-allowed sm:text-sm';

export const inputHeightClasses = controlHeightClasses;

/**
 * Added to `inputGroupClasses` for a field whose chips come before its text input (MultiSelect, TagField): chips and
 * input wrap onto more lines, so the box grows from a minimum height instead of having a fixed one.
 */
export const chipGroupClasses: Record<'sm' | 'md', string> = {
  sm: 'h-auto min-h-8 flex-wrap gap-1 py-1 ps-1.5',
  md: 'h-auto min-h-10 flex-wrap gap-1 py-1 ps-1.5',
};

/** The text input after the chips in a chip group. Text is 16px on phones so iOS doesn't zoom. */
export const chipInputClasses =
  'h-7 min-w-24 flex-1 bg-transparent px-1.5 text-base text-fg outline-none placeholder:text-fg-muted disabled:cursor-not-allowed sm:text-sm';

/**
 * Small buttons inside an input group (clear, show password, steppers). On touch screens they grow to the minimum
 * touch width and the group's full height, covering its top and bottom border, instead of extending an invisible hit
 * area past the field's sides (which could make the page scroll sideways when a field touches the screen edge).
 */
export const inputButtonClasses = [
  'me-1 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-control text-fg-muted',
  'pointer-coarse:-my-px pointer-coarse:me-0 pointer-coarse:h-auto pointer-coarse:w-11 pointer-coarse:self-stretch',
  'data-focus-visible:focus-ring data-hovered:bg-surface-3 data-hovered:text-fg',
  disabledClasses,
].join(' ');
