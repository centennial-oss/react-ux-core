// MoneyField: an amount of money as a decimal string in major units ("1234.50"), never a float. It shows the amount
// formatted for the locale while not focused ("1,234.50", with the currency symbol as an adornment the locale places)
// and plain digits while editing, and reads typed or pasted text when committed ("$1,234.5" becomes "1234.50").

import { useId, useMemo, useState, type Ref } from 'react';
import {
  Input,
  TextField as AriaTextField,
  useLocale,
  type TextFieldProps as AriaTextFieldProps,
} from 'react-aria-components';
import { useEntryMessages } from '../../provider/context';
import { joinIds } from '../../utils/aria';
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
import { decimalCompare, decimalPrecision, isDecimal } from './decimal';
import { defaultMoneyFieldMessages } from './messages';
import {
  currencyMinorUnits,
  currencySymbolPosition,
  formatMoney,
  formatMoneyForEditing,
  parseMoneyInput,
  type MoneyParseError,
} from './money';

export interface MoneyFieldProps
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
      | 'inputMode'
    >,
    FieldBaseProps {
  /** The amount as a decimal string in major units ("1234.50"), controlled. `null` is an empty field. */
  value?: string | null;
  /** The initial amount, uncontrolled. Defaults to empty. */
  defaultValue?: string | null;
  /**
   * Called with the committed amount, with exactly `minorUnits` decimals ("1234.50"), when the user presses Enter or
   * leaves the field; `null` when they empty it. Text that isn't an acceptable amount shows an error and isn't
   * reported.
   */
  onChange?: (value: string | null) => void;
  /** The ISO 4217 currency code ("USD"). */
  currency: string;
  /** Currencies offered in a Select beside the amount, when the app allows several. */
  currencies?: readonly string[];
  /** Called when a currency is picked from `currencies`. */
  onCurrencyChange?: (currency: string) => void;
  /** Digits after the decimal point. Defaults to the currency's standard (JPY 0, USD 2, BHD 3). */
  minorUnits?: number;
  /** Accepts amounts below zero. Defaults to false. */
  allowsNegative?: boolean;
  /** `parentheses` shows negatives the accounting way, "(1,234.50)", where the locale has that style. */
  negativeStyle?: 'minus' | 'parentheses';
  /** The smallest allowed amount, as a decimal string. */
  minValue?: string;
  /** The largest allowed amount, as a decimal string. */
  maxValue?: string;
  placeholder?: string;
  /** Submits the amount as a decimal string with a form, through a hidden input. */
  name?: string;
  /** Defaults to `md`. On touch screens the height grows to the minimum touch target. */
  size?: 'sm' | 'md';
  className?: string;
  /** The field's root element. */
  ref?: Ref<HTMLDivElement>;
  /** The text input. */
  inputRef?: Ref<HTMLInputElement>;
}

/**
 * An amount of money as a decimal string, so it never drifts the way floats do. Formats for the locale when not
 * focused, shows plain digits for editing, and accepts pasted amounts with symbols and grouping. Screen readers hear
 * the amount with the currency's name ("1,234.50 US dollars"). Combine amounts with the decimal helpers
 * (`decimalAdd`, `decimalMultiply`, `roundHalfEven`…).
 */
export function MoneyField(props: MoneyFieldProps) {
  const {
    label,
    description,
    errorMessage,
    labelPosition,
    infoTip,
    value: valueProp,
    defaultValue,
    onChange,
    currency,
    currencies,
    onCurrencyChange,
    minorUnits,
    allowsNegative = false,
    negativeStyle = 'minus',
    minValue,
    maxValue,
    placeholder,
    name,
    size = 'md',
    className,
    inputRef,
    'aria-describedby': ariaDescribedBy,
    onFocus,
    onBlur,
    ...rest
  } = props;
  const messages = useEntryMessages(defaultMoneyFieldMessages);
  const { locale } = useLocale();
  const [value, setValue] = useControllableState(valueProp, defaultValue ?? null, onChange);
  const [text, setText] = useState('');
  const [isEditing, setEditing] = useState(false);
  const [parseError, setParseError] = useState<MoneyParseError | null>(null);
  const spokenId = useId();
  const digits = minorUnits ?? currencyMinorUnits(currency);
  const adornment = useMemo(() => currencySymbolPosition(currency, locale), [currency, locale]);
  const currencyNames = useMemo(
    () => new Intl.DisplayNames(locale, { type: 'currency', fallback: 'code' }),
    [locale],
  );

  const validValue = value !== null && isDecimal(value) ? value : null;
  // An amount from the app with more decimals than the currency allows still shows all of them (and an error).
  const shownDigits = validValue === null ? digits : Math.max(digits, decimalPrecision(validValue));
  const money = (amount: string, options: Parameters<typeof formatMoney>[2] = {}) =>
    formatMoney(amount, currency, { locale, minorUnits: shownDigits, negativeStyle, ...options });

  const errorText = (error: MoneyParseError) =>
    error === 'tooManyDecimals'
      ? messages.moneyFieldTooManyDecimals({ count: digits })
      : error === 'negative'
        ? messages.moneyFieldNegative
        : messages.moneyFieldInvalid;

  const commit = () => {
    const result = parseMoneyInput(text, { locale, minorUnits: digits, allowsNegative });
    if (result.error !== undefined) {
      setParseError(result.error);
      return;
    }
    setParseError(null);
    if (result.value !== value) {
      setValue(result.value);
    }
  };

  const valueError =
    validValue === null
      ? value === null
        ? null
        : messages.moneyFieldInvalid
      : decimalPrecision(validValue) > digits
        ? messages.moneyFieldTooManyDecimals({ count: digits })
        : !allowsNegative && validValue.startsWith('-')
          ? messages.moneyFieldNegative
          : minValue !== undefined &&
              isDecimal(minValue) &&
              decimalCompare(validValue, minValue) < 0
            ? messages.moneyFieldTooSmall({ min: money(minValue, { minorUnits: digits }) })
            : maxValue !== undefined &&
                isDecimal(maxValue) &&
                decimalCompare(validValue, maxValue) > 0
              ? messages.moneyFieldTooLarge({ max: money(maxValue, { minorUnits: digits }) })
              : null;
  const ownError = parseError === null ? valueError : errorText(parseError);

  const shownText =
    isEditing || parseError !== null
      ? text
      : validValue === null
        ? (value ?? '')
        : money(validValue, { isCurrencyHidden: true });
  const spoken =
    validValue !== null && parseError === null
      ? money(validValue, { currencyDisplay: 'name' })
      : null;
  const textLabel = typeof label === 'string' ? label : rest['aria-label'];
  const symbol = (
    <span
      aria-hidden="true"
      className={cn('shrink-0 text-fg-muted', adornment.position === 'start' ? 'ps-3' : 'pe-3')}
    >
      {adornment.symbol}
    </span>
  );

  return (
    <AriaTextField
      {...rest}
      value={shownText}
      onChange={setText}
      inputMode={allowsNegative ? 'text' : digits > 0 ? 'decimal' : 'numeric'}
      isInvalid={rest.isInvalid === true || ownError !== null}
      aria-describedby={joinIds(ariaDescribedBy, spoken !== null && spokenId)}
      onFocus={(event) => {
        if (parseError === null) {
          setText(
            validValue === null
              ? (value ?? '')
              : formatMoneyForEditing(validValue, locale, shownDigits),
          );
        }
        setEditing(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        commit();
        setEditing(false);
        onBlur?.(event);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          commit();
        }
        rest.onKeyDown?.(event);
      }}
      className={fieldRootClasses(className)}
    >
      <FieldFrame {...props} errorMessage={ownError ?? errorMessage}>
        <div className="relative flex min-w-0 gap-2">
          <div className={cn(inputGroupClasses, inputHeightClasses[size], 'flex-1')}>
            {adornment.position === 'start' && symbol}
            <Input
              ref={inputRef}
              placeholder={placeholder}
              autoComplete="off"
              className={cn(inputClasses, 'tabular-nums', adornment.position === 'start' && 'ps-2')}
            />
            {adornment.position === 'end' && symbol}
          </div>
          {currencies !== undefined && currencies.length > 0 && (
            <Select<object, string>
              aria-label={
                textLabel === undefined
                  ? messages.moneyFieldCurrency
                  : messages.moneyFieldCurrencyFor({ label: textLabel })
              }
              value={currency}
              onChange={(next) => {
                onCurrencyChange?.(next);
              }}
              isDisabled={rest.isDisabled === true || rest.isReadOnly === true}
              size={size}
              className="w-24 shrink-0"
            >
              {currencies.map((code) => (
                <Option key={code} id={code} textValue={code} description={currencyNames.of(code)}>
                  {code}
                </Option>
              ))}
            </Select>
          )}
          {spoken !== null && (
            <span id={spokenId} className="sr-only">
              {spoken}
            </span>
          )}
        </div>
        {name !== undefined && <input type="hidden" name={name} value={value ?? ''} />}
      </FieldFrame>
    </AriaTextField>
  );
}
