import { Eye, EyeOff, X } from 'lucide-react';
import { useId, useRef, useState, type ReactNode, type Ref } from 'react';
import {
  Button as AriaButton,
  Input,
  TextField as AriaTextField,
  type TextFieldProps as AriaTextFieldProps,
} from 'react-aria-components';
import { useMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import { mergeRefs } from '../../utils/mergeRefs';
import { useControllableState } from '../../utils/useControllableState';
import {
  FieldFrame,
  fieldRootClasses,
  inputButtonClasses,
  inputClasses,
  inputGroupClasses,
  inputHeightClasses,
  type FieldBaseProps,
} from '../Field/Field';
import { CharacterCount, characterCountState, RecommendedLengthAnnouncer } from './CharacterCount';

export type TextFieldType = 'text' | 'email' | 'tel' | 'url' | 'password' | 'search';

type FieldHints = Pick<AriaTextFieldProps, 'inputMode' | 'autoComplete' | 'enterKeyHint'>;

// Sensible on-screen keyboard and autofill hints per type; props override them. Addresses, URLs and passwords also
// turn off autocapitalisation and spellcheck on the input itself.
const typeHints: Record<TextFieldType, FieldHints> = {
  text: {},
  email: { inputMode: 'email', autoComplete: 'email' },
  tel: { inputMode: 'tel', autoComplete: 'tel' },
  url: { inputMode: 'url', autoComplete: 'url' },
  password: { autoComplete: 'current-password' },
  search: { inputMode: 'search', enterKeyHint: 'search' },
};
const literalTypes = new Set<TextFieldType>(['email', 'url', 'password']);

export interface TextFieldProps
  extends
    Omit<AriaTextFieldProps, 'className' | 'style' | 'children' | 'render' | 'type'>,
    FieldBaseProps {
  /** Defaults to `text`. `password` adds a show/hide toggle. */
  type?: TextFieldType;
  placeholder?: string;
  /** Content before the input, such as a currency code. */
  prefix?: ReactNode;
  /** Content after the input, such as a unit. */
  suffix?: ReactNode;
  /** Shows a clear button while there's a value. */
  isClearable?: boolean;
  /**
   * Shows a counter under the field ("count / maxLength", or "count / recommendedLength recommended"); needs
   * `maxLength` or `recommendedLength`. Screen readers hear it with the field's description, not on every keystroke.
   */
  hasCharacterCount?: boolean;
  /**
   * A soft limit, such as about 60 characters for an SEO title. Past it the counter turns to the warning tone (shown
   * even without `hasCharacterCount`) and the change is announced once; the field stays valid.
   */
  recommendedLength?: number;
  /** Defaults to `md`. On touch screens the height grows to the minimum touch target. */
  size?: 'sm' | 'md';
  className?: string;
  /** The field's root element. */
  ref?: Ref<HTMLDivElement>;
  /** The input element. */
  inputRef?: Ref<HTMLInputElement>;
}

/** A single-line text input in the standard field frame. */
export function TextField({
  label,
  description,
  errorMessage,
  labelPosition,
  infoTip,
  type = 'text',
  placeholder,
  prefix,
  suffix,
  isClearable = false,
  hasCharacterCount = false,
  recommendedLength,
  size = 'md',
  className,
  inputRef,
  value: valueProp,
  defaultValue,
  onChange,
  'aria-describedby': ariaDescribedBy,
  ...rest
}: TextFieldProps) {
  const messages = useMessages();
  const [value, setValue] = useControllableState(valueProp, defaultValue ?? '', onChange);
  const [isRevealed, setRevealed] = useState(false);
  const localInputRef = useRef<HTMLInputElement | null>(null);
  const hints = typeHints[type];
  const countId = useId();
  const count = characterCountState({
    count: value.length,
    maxLength: rest.maxLength,
    recommendedLength,
    hasCharacterCount,
  });
  const describedBy = [ariaDescribedBy, count.isShown ? countId : undefined]
    .filter(Boolean)
    .join(' ');

  return (
    <AriaTextField
      {...hints}
      {...rest}
      type={type === 'password' && isRevealed ? 'text' : type}
      aria-describedby={describedBy || undefined}
      value={value}
      onChange={setValue}
      className={fieldRootClasses(cn(recommendedLength !== undefined && 'relative', className))}
    >
      <FieldFrame
        label={label}
        description={description}
        errorMessage={errorMessage}
        labelPosition={labelPosition}
        infoTip={infoTip}
        isRequired={rest.isRequired}
      >
        <div className={cn(inputGroupClasses, inputHeightClasses[size])}>
          {prefix !== undefined && <span className="shrink-0 ps-3 text-fg-muted">{prefix}</span>}
          <Input
            ref={mergeRefs(localInputRef, inputRef)}
            autoCapitalize={literalTypes.has(type) ? 'none' : undefined}
            spellCheck={literalTypes.has(type) ? false : undefined}
            placeholder={placeholder}
            // Hide the browser's own search clear button; isClearable provides ours.
            className={cn(inputClasses, '[&::-webkit-search-cancel-button]:appearance-none')}
          />
          {isClearable && value !== '' && !rest.isReadOnly && (
            <AriaButton
              aria-label={messages.clearValue}
              isDisabled={rest.isDisabled}
              onPress={() => {
                setValue('');
                localInputRef.current?.focus();
              }}
              className={inputButtonClasses}
            >
              <X aria-hidden="true" className="size-4" />
            </AriaButton>
          )}
          {type === 'password' && (
            <AriaButton
              aria-label={isRevealed ? messages.hidePassword : messages.showPassword}
              isDisabled={rest.isDisabled}
              onPress={() => {
                setRevealed((revealed) => !revealed);
              }}
              className={inputButtonClasses}
            >
              {isRevealed ? (
                <EyeOff aria-hidden="true" className="size-4" />
              ) : (
                <Eye aria-hidden="true" className="size-4" />
              )}
            </AriaButton>
          )}
          {suffix !== undefined && <span className="shrink-0 pe-3 text-fg-muted">{suffix}</span>}
        </div>
        {count.isShown && (
          <CharacterCount
            id={countId}
            count={value.length}
            maxLength={rest.maxLength}
            recommendedLength={recommendedLength}
            isOver={count.isOver}
          />
        )}
      </FieldFrame>
      <RecommendedLengthAnnouncer recommendedLength={recommendedLength} isOver={count.isOver} />
    </AriaTextField>
  );
}
