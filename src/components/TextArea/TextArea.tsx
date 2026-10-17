import { useId, useRef, type Ref } from 'react';
import {
  TextArea as AriaTextArea,
  TextField as AriaTextField,
  type TextFieldProps as AriaTextFieldProps,
} from 'react-aria-components';
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
import {
  CharacterCount,
  characterCountState,
  RecommendedLengthAnnouncer,
} from '../TextField/CharacterCount';
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
   * Shows a counter under the area ("count / maxLength", or "count / recommendedLength recommended"); needs
   * `maxLength` or `recommendedLength`. Screen readers hear it with the field's description, not on every keystroke.
   */
  hasCharacterCount?: boolean;
  /**
   * A soft limit, such as about 160 characters for a meta description. Past it the counter turns to the warning tone
   * (shown even without `hasCharacterCount`) and the change is announced once; the field stays valid.
   */
  recommendedLength?: number;
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
  recommendedLength,
  className,
  inputRef,
  value: valueProp,
  defaultValue,
  onChange,
  'aria-describedby': ariaDescribedBy,
  ...rest
}: TextAreaProps) {
  const [value, setValue] = useControllableState(valueProp, defaultValue ?? '', onChange);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const countId = useId();
  useAutoGrow(textareaRef, frameRef, value, minRows, maxRows);

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
      {...rest}
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
        <div ref={frameRef} className={cn(inputGroupClasses, 'items-stretch')}>
          <AriaTextArea
            ref={mergeRefs(textareaRef, inputRef)}
            rows={minRows}
            placeholder={placeholder}
            className={cn(inputClasses, 'h-auto resize-none py-2')}
          />
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
