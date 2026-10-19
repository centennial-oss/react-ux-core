import { Minus, Plus } from 'lucide-react';
import type { ReactNode, Ref } from 'react';
import {
  Button as AriaButton,
  Group,
  Input,
  NumberField as AriaNumberField,
  type NumberFieldProps as AriaNumberFieldProps,
} from 'react-aria-components';
import { cn } from '../../utils/cn';
import {
  FieldFrame,
  fieldRootClasses,
  inputButtonClasses,
  inputClasses,
  inputHeightClasses,
  inputGroupClasses,
  type FieldBaseProps,
} from '../Field/Field';

type ValidationError = string | string[];

export interface NumberFieldProps
  extends
    Omit<
      AriaNumberFieldProps,
      | 'className'
      | 'style'
      | 'children'
      | 'render'
      | 'value'
      | 'defaultValue'
      | 'onChange'
      | 'validate'
    >,
    FieldBaseProps {
  /** The number, controlled. `null` is an empty field. */
  value?: number | null;
  /** The initial number, uncontrolled. Defaults to empty. */
  defaultValue?: number | null;
  /**
   * Called with the committed number (clamped to `minValue`/`maxValue` and snapped to `step`) when the user leaves
   * the field, presses Enter, steps with the arrow keys or steppers, or scrolls; `null` when they empty it. Typing
   * alone doesn't call it, so partly typed numbers ("1.", "-") never reach the app.
   */
  onChange?: (value: number | null) => void;
  /** Custom validation. Receives the committed number, or `null` when empty. */
  validate?: (value: number | null) => ValidationError | true | null | undefined;
  /** Shows decrement and increment buttons on either side of the input. */
  hasStepper?: boolean;
  /** Content before the number, such as a currency code. */
  prefix?: ReactNode;
  /** Content after the number, such as a unit ("kWh"). */
  suffix?: ReactNode;
  placeholder?: string;
  /** Defaults to `md`. On touch screens the height grows to the minimum touch target. */
  size?: 'sm' | 'md';
  className?: string;
  /** The field's root element. */
  ref?: Ref<HTMLDivElement>;
  /** The input element. */
  inputRef?: Ref<HTMLInputElement>;
}

const fromAria = (value: number): number | null => (Number.isNaN(value) ? null : value);

/**
 * A number input that parses and formats for the locale (`UIProvider`'s `locale`): "1.234,5" in German, currency
 * with the currency's own fraction digits through `formatOptions`, percentages, units. Typing, pasting and IME input
 * are never filtered keystroke by keystroke; the text is parsed when committed. ArrowUp/ArrowDown step by `step`,
 * PageUp/PageDown by a larger amount, and Home/End jump to `minValue`/`maxValue`.
 */
export function NumberField(props: NumberFieldProps) {
  const {
    label,
    description,
    errorMessage,
    labelPosition,
    infoTip,
    value,
    defaultValue,
    onChange,
    validate,
    hasStepper = false,
    placeholder,
    prefix,
    suffix,
    size = 'md',
    className,
    inputRef,
    ...rest
  } = props;
  return (
    <AriaNumberField
      {...rest}
      // React Aria uses NaN for an empty field; the public API uses null.
      value={value === null ? Number.NaN : value}
      defaultValue={defaultValue ?? undefined}
      onChange={
        onChange &&
        ((next: number) => {
          onChange(fromAria(next));
        })
      }
      validate={validate && ((next: number) => validate(fromAria(next)))}
      className={fieldRootClasses(className)}
    >
      <FieldFrame {...props}>
        <Group className={cn(inputGroupClasses, inputHeightClasses[size])}>
          {hasStepper && (
            <AriaButton
              slot="decrement"
              className={cn(inputButtonClasses, 'ms-1 me-0 pointer-coarse:ms-0')}
            >
              <Minus aria-hidden="true" className="size-4" />
            </AriaButton>
          )}
          {prefix !== undefined && <span className="shrink-0 ps-3 text-fg-muted">{prefix}</span>}
          <Input
            ref={inputRef}
            placeholder={placeholder}
            className={cn(inputClasses, 'tabular-nums', hasStepper && 'text-center')}
          />
          {suffix !== undefined && <span className="shrink-0 pe-3 text-fg-muted">{suffix}</span>}
          {hasStepper && (
            <AriaButton slot="increment" className={inputButtonClasses}>
              <Plus aria-hidden="true" className="size-4" />
            </AriaButton>
          )}
        </Group>
      </FieldFrame>
    </AriaNumberField>
  );
}
