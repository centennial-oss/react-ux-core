import { useId, useRef, type Ref } from 'react';
import {
  TextArea as AriaTextArea,
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
  inputClasses,
  inputGroupClasses,
  type FieldBaseProps,
} from '../Field/Field';
import { useAutoGrow } from './useAutoGrow';

export interface TextAreaProps
  extends
    Omit<AriaTextFieldProps, 'className' | 'style' | 'children' | 'render' | 'type' | 'pattern'>,
    FieldBaseProps {
  placeholder?: string;
  /** The height, in lines, when empty or short. Defaults to 3. */
  minRows?: number;
  /** The most lines the area grows to; longer text scrolls inside it. Defaults to 8. */
  maxRows?: number;
  /**
   * Shows a "count / maxLength" counter under the area (needs `maxLength`). Screen readers hear it with the field's
   * description, not on every keystroke.
   */
  hasCharacterCount?: boolean;
  className?: string;
  /** The field's root element. */
  ref?: Ref<HTMLDivElement>;
  /** The textarea element. */
  inputRef?: Ref<HTMLTextAreaElement>;
}

/** Multi-line text in the standard field frame. It grows with its content between `minRows` and `maxRows`. */
export function TextArea({
  label,
  description,
  errorMessage,
  labelPosition,
  infoTip,
  placeholder,
  minRows = 3,
  maxRows = 8,
  hasCharacterCount = false,
  className,
  inputRef,
  value: valueProp,
  defaultValue,
  onChange,
  'aria-describedby': ariaDescribedBy,
  ...rest
}: TextAreaProps) {
  const messages = useMessages();
  const [value, setValue] = useControllableState(valueProp, defaultValue ?? '', onChange);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const countId = useId();
  useAutoGrow(textareaRef, frameRef, value, minRows, maxRows);

  const isCountShown = hasCharacterCount && rest.maxLength !== undefined;
  const describedBy = [ariaDescribedBy, isCountShown ? countId : undefined]
    .filter(Boolean)
    .join(' ');

  return (
    <AriaTextField
      {...rest}
      aria-describedby={describedBy || undefined}
      value={value}
      onChange={setValue}
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
        <div ref={frameRef} className={cn(inputGroupClasses, 'items-stretch')}>
          <AriaTextArea
            ref={mergeRefs(textareaRef, inputRef)}
            rows={minRows}
            placeholder={placeholder}
            className={cn(inputClasses, 'h-auto resize-none py-2')}
          />
        </div>
        {isCountShown && (
          <span id={countId} className="self-end text-xs text-fg-muted tabular-nums">
            {messages.characterCount({ count: value.length, max: rest.maxLength ?? 0 })}
          </span>
        )}
      </FieldFrame>
    </AriaTextField>
  );
}
