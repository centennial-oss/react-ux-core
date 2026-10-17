// The shared field behind DurationField, ByteSizeField and BitrateField: a text input and a unit Select. The value is
// always a number in the base unit; the text is read when committed (Enter or leaving the field), so partly typed
// values never reach the app. A typed unit ("2h", "512 MiB") switches the Select; a plain number is in the selected
// unit. After a commit the text shows the value in friendly units again.

import { useId, useState, type Ref } from 'react';
import {
  Input,
  TextField as AriaTextField,
  type TextFieldProps as AriaTextFieldProps,
} from 'react-aria-components';
import { useEntryMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import { useControllableState } from '../../utils/useControllableState';
import {
  FieldFrame,
  fieldRootClasses,
  inputClasses,
  inputGroupClasses,
  inputHeightClasses,
  type FieldBaseProps,
} from '../Field/Field';
import { Option } from '../ListBox/ListBoxParts';
import { Select } from '../Select/Select';
import { defaultUnitFieldMessages } from './messages';
import { parseLocaleNumber, formatPlainNumber } from './number';
import type { UnitParseError, UnitParseResult } from './parse';

/** Props every unit field shares. */
export interface UnitFieldSharedProps
  extends
    Omit<
      AriaTextFieldProps,
      | 'className'
      | 'style'
      | 'children'
      | 'render'
      | 'value'
      | 'defaultValue'
      | 'onChange'
      | 'validate'
      | 'type'
      | 'name'
      | 'pattern'
      | 'minLength'
      | 'maxLength'
    >,
    FieldBaseProps {
  /** The value in the base unit, controlled. `null` is an empty field. */
  value?: number | null;
  /** The initial value in the base unit, uncontrolled. Defaults to empty. */
  defaultValue?: number | null;
  /**
   * Called with the committed value in the base unit when the user presses Enter, leaves the field or picks another
   * unit; `null` when they empty it. Text that can't be read shows an error and isn't reported.
   */
  onChange?: (value: number | null) => void;
  /** The smallest allowed value, in the base unit. Smaller values show an error in friendly units. */
  minValue?: number;
  /** The largest allowed value, in the base unit. */
  maxValue?: number;
  placeholder?: string;
  /** Submits the value in the base unit with a form, through a hidden input. */
  name?: string;
  /** Defaults to `md`. On touch screens the height grows to the minimum touch target. */
  size?: 'sm' | 'md';
  className?: string;
  /** The field's root element. */
  ref?: Ref<HTMLDivElement>;
  /** The text input. */
  inputRef?: Ref<HTMLInputElement>;
}

/** A unit offered in the Select. */
export interface UnitChoice<U extends string> {
  id: U;
  /** The unit's size in the base unit. */
  factor: number;
  /** Shown in the Select ("h", "MiB"). */
  label: string;
  /** The unit's full name ("hours"), shown under the symbol in the list, when there is one. */
  name?: string;
}

interface UnitFieldBaseProps<U extends string> extends UnitFieldSharedProps {
  units: readonly UnitChoice<U>[];
  /** The selected unit while there's no value. */
  initialUnit: U;
  /** Reads typed text; a plain number is in `unit`. */
  parse: (text: string, unit: U) => UnitParseResult;
  /** The text and unit that show a committed value. */
  present: (value: number) => { text: string; unit: U };
  /** A value in friendly units for messages ("1 day"). */
  formatShort: (value: number) => string;
  /** A value in words for screen readers ("1 hour 30 minutes"). */
  formatLong: (value: number) => string;
  /** The error for unreadable text. */
  invalidMessage: (error: UnitParseError) => string;
  locale: string;
}

export function UnitFieldBase<U extends string>({
  label,
  description,
  errorMessage,
  labelPosition,
  infoTip,
  value: valueProp,
  defaultValue,
  onChange,
  minValue,
  maxValue,
  placeholder,
  name,
  size = 'md',
  className,
  inputRef,
  units,
  initialUnit,
  parse,
  present,
  formatShort,
  formatLong,
  invalidMessage,
  locale,
  'aria-describedby': ariaDescribedBy,
  ...rest
}: UnitFieldBaseProps<U>) {
  const messages = useEntryMessages(defaultUnitFieldMessages);
  const [value, setValue] = useControllableState(valueProp, defaultValue ?? null, onChange);
  const initial = value === null ? { text: '', unit: initialUnit } : present(value);
  const [text, setText] = useState(initial.text);
  const [unit, setUnit] = useState<U>(initial.unit);
  const [parseError, setParseError] = useState<string | null>(null);
  // The value the text currently shows. When the app changes the value, the text follows.
  const [shownValue, setShownValue] = useState(value);
  if (shownValue !== value) {
    setShownValue(value);
    const next = value === null ? { text: '', unit } : present(value);
    setText(next.text);
    setUnit(next.unit);
    setParseError(null);
  }
  const spokenId = useId();

  const report = (next: number | null) => {
    setShownValue(next);
    if (next !== value) {
      setValue(next);
    }
  };

  const commit = (nextText: string, nextUnit: U) => {
    const result = parse(nextText, nextUnit);
    if (result.error !== undefined) {
      setParseError(invalidMessage(result.error));
      return;
    }
    setParseError(null);
    if (result.value === null) {
      setText('');
      setUnit(nextUnit);
    } else {
      const shown = present(result.value);
      setText(shown.text);
      setUnit(shown.unit);
    }
    report(result.value);
  };

  const changeUnit = (nextUnit: U) => {
    const factor = units.find((choice) => choice.id === nextUnit)?.factor ?? 1;
    const plain = parseLocaleNumber(text, locale);
    if (text.trim() === '') {
      setUnit(nextUnit);
    } else if (plain !== null) {
      // A plain number keeps its digits and takes the new unit.
      setUnit(nextUnit);
      setParseError(null);
      report(Math.round(plain * factor));
    } else {
      // Text with its own units ("1h 30m") keeps its value, re-expressed in the new unit.
      const result = parse(text, unit);
      setUnit(nextUnit);
      if (result.error === undefined && result.value !== null) {
        setText(formatPlainNumber(result.value / factor, locale));
        setParseError(null);
        report(result.value);
      }
    }
  };

  const rangeError =
    value === null
      ? null
      : minValue !== undefined && value < minValue
        ? messages.unitFieldTooSmall({ min: formatShort(minValue) })
        : maxValue !== undefined && value > maxValue
          ? messages.unitFieldTooLarge({ max: formatShort(maxValue) })
          : null;
  const ownError = parseError ?? rangeError;
  const textLabel = typeof label === 'string' ? label : (rest['aria-label'] ?? undefined);
  const spoken = value !== null && parseError === null ? formatLong(value) : null;

  return (
    <AriaTextField
      {...rest}
      value={text}
      onChange={setText}
      isInvalid={rest.isInvalid === true || ownError !== null}
      aria-describedby={
        [ariaDescribedBy, spoken === null ? undefined : spokenId].filter(Boolean).join(' ') ||
        undefined
      }
      className={fieldRootClasses(className)}
    >
      <FieldFrame
        label={label}
        description={description}
        errorMessage={ownError ?? errorMessage}
        labelPosition={labelPosition}
        infoTip={infoTip}
        isRequired={rest.isRequired}
      >
        <div className="relative flex min-w-0 gap-2">
          <div className={cn(inputGroupClasses, inputHeightClasses[size], 'min-w-0 flex-1')}>
            <Input
              ref={inputRef}
              placeholder={placeholder}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              onBlur={() => {
                commit(text, unit);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  commit(text, unit);
                }
              }}
              className={cn(inputClasses, 'tabular-nums')}
            />
          </div>
          <Select<object, U>
            aria-label={
              textLabel === undefined
                ? messages.unitFieldUnit
                : messages.unitFieldUnitFor({ label: textLabel })
            }
            value={unit}
            onChange={changeUnit}
            isDisabled={rest.isDisabled === true || rest.isReadOnly === true}
            size={size}
            className="w-24 shrink-0"
          >
            {units.map((choice) => (
              <Option
                key={choice.id}
                id={choice.id}
                textValue={choice.label}
                description={choice.name}
              >
                {choice.label}
              </Option>
            ))}
          </Select>
          {spoken !== null && (
            <span id={spokenId} className="sr-only">
              {spoken}
            </span>
          )}
        </div>
        {name !== undefined && (
          <input type="hidden" name={name} value={value === null ? '' : String(value)} />
        )}
      </FieldFrame>
    </AriaTextField>
  );
}
