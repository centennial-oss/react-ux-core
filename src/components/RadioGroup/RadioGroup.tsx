import type { ReactNode, Ref } from 'react';
import {
  RadioButton,
  RadioField,
  RadioGroup as AriaRadioGroup,
  type RadioFieldProps as AriaRadioFieldProps,
  type RadioGroupProps as AriaRadioGroupProps,
} from 'react-aria-components';
import { cn } from '../../utils/cn';
import { disabledClasses } from '../../utils/stateClasses';
import {
  FieldDescription,
  FieldFrame,
  fieldRootClasses,
  type FieldBaseProps,
} from '../Field/Field';
import {
  optionDescription,
  optionFeedbackClasses,
  type OptionFeedback,
} from '../Field/OptionFeedback';

export interface RadioGroupProps<T extends string = string>
  extends
    Omit<
      AriaRadioGroupProps,
      'className' | 'style' | 'children' | 'render' | 'value' | 'defaultValue' | 'onChange'
    >,
    FieldBaseProps {
  /** The options: `Radio` elements, each with a `value`. */
  children: ReactNode;
  /** The chosen option's value, controlled. `null` means nothing is chosen. */
  value?: T | null;
  /**
   * The initially chosen option's value, uncontrolled. It doesn't narrow the value type; give the group a type
   * argument (`<RadioGroup<Plan>>`) or type `onChange` to get a union.
   */
  defaultValue?: NoInfer<T> | null;
  /** Called with the chosen option's value. */
  onChange?: (value: T) => void;
  /** `vertical` (the default) stacks the options; `horizontal` puts them in a row that wraps when space is short. */
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  /** The group's root element. */
  ref?: Ref<HTMLDivElement>;
}

/**
 * A single choice from a short list of options, all visible at once. Arrow keys move the choice between options and
 * Tab leaves the group in one step. The value type is inferred from `value` or `onChange`, so a group bound to a
 * union-typed state gets that union back.
 */
export function RadioGroup<T extends string = string>({
  label,
  description,
  errorMessage,
  labelPosition,
  infoTip,
  orientation = 'vertical',
  className,
  children,
  value,
  defaultValue,
  onChange,
  ...rest
}: RadioGroupProps<T>) {
  return (
    <AriaRadioGroup
      {...rest}
      value={value}
      defaultValue={defaultValue}
      // React Aria reports a plain string; it is always one of the options' values, which the caller typed as T.
      onChange={onChange as ((value: string) => void) | undefined}
      orientation={orientation}
      className={fieldRootClasses(className)}
    >
      <FieldFrame
        label={label}
        description={description}
        errorMessage={errorMessage}
        labelPosition={labelPosition}
        infoTip={infoTip}
        isRequired={rest.isRequired}
      >
        <div
          className={cn(
            'flex min-w-0',
            orientation === 'horizontal' ? 'flex-row flex-wrap gap-x-5' : 'flex-col',
            // A side label is padded for a 40 px input; drop the first row so its centre lines up with the label's
            // (the label's line centre is 1.25rem down; a row is --hit-size tall).
            labelPosition === 'side' && '@md:pt-[max(0px,calc(1.25rem-var(--hit-size)/2))]',
          )}
        >
          {children}
        </div>
      </FieldFrame>
    </AriaRadioGroup>
  );
}

export interface RadioProps extends Omit<
  AriaRadioFieldProps,
  'className' | 'style' | 'children' | 'render'
> {
  /** The value the group reports when this option is chosen. */
  value: string;
  /** The visible label. Without one, pass `aria-label`. */
  children?: ReactNode;
  /** Help text under the label. */
  description?: ReactNode;
  /**
   * Marks the option, for example after an answer is checked: a tone on its row, the tone's icon, and a message
   * under the label. Independent of selection, `isReadOnly` and `isDisabled`.
   */
  feedback?: OptionFeedback;
  className?: string;
  /** The option's root element. */
  ref?: Ref<HTMLDivElement>;
}

/** One option in a `RadioGroup`. The whole label row is the touch target. */
export function Radio({ children, description, feedback, className, ...rest }: RadioProps) {
  const fullDescription = optionDescription(description, feedback);
  return (
    <RadioField
      {...rest}
      className={cn(
        'flex min-w-0 flex-col gap-0.5 text-sm text-fg',
        optionFeedbackClasses(feedback),
        className,
      )}
    >
      <RadioButton
        className={cn(
          'group/radio inline-flex min-h-hit min-w-hit cursor-pointer items-center gap-2 self-start select-none',
          disabledClasses,
          'data-readonly:cursor-default',
        )}
      >
        {({ isSelected, isInvalid }) => (
          <>
            <span
              aria-hidden="true"
              className={cn(
                'inline-flex size-4 shrink-0 items-center justify-center rounded-full border',
                'transition-colors duration-(--duration-fast) ease-standard',
                'group-data-focus-visible/radio:focus-ring',
                isSelected
                  ? 'border-accent-solid bg-accent-solid'
                  : 'border-border-strong bg-surface-2 group-data-hovered/radio:bg-surface-3',
                isInvalid && 'border-danger-solid',
                isInvalid && isSelected && 'bg-danger-solid',
              )}
            >
              {isSelected && <span className="size-1.5 rounded-full bg-accent-on-solid" />}
            </span>
            {children !== undefined && <span className="min-w-0">{children}</span>}
          </>
        )}
      </RadioButton>
      {fullDescription !== undefined && (
        // Indented to line up with the label text (circle width plus gap).
        <div className={cn('ps-6', feedback && 'pb-1.5')}>
          <FieldDescription>{fullDescription}</FieldDescription>
        </div>
      )}
    </RadioField>
  );
}
