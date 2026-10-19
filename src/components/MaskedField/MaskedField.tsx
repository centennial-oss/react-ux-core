// MaskedField: text in a fixed pattern, such as a phone number, postal code, card number, date or IBAN, typed into a
// mask (src/utils/mask.ts). The mask's literals appear as its slots fill; typing, deleting and pasting keep the caret
// in step, skipping over literals; and the value is the raw characters unless `valueFormat` asks for the formatted
// text. Like Mantine's MaskInput and PrimeReact's InputMask it's one ordinary input, so screen readers hear the
// formatted value, and a hint after the description says how many characters it takes.
//
// - Typing, Backspace and Delete are handled from `beforeinput`, so on-screen keyboards behave as hardware ones do.
//   Edits the browser makes itself (IME composition, autofill, drag and drop, cut, word deletion) are read back from
//   the input's new text once they land; an IME's text is left alone until its composition ends.
// - `placeholderChar` draws the rest of the mask as a template behind the text while the field has focus. It's drawn,
//   not part of the value, so screen readers and copied text never include it.
// - Masks read left to right in every language, so the input keeps that direction in right-to-left layouts.
// - With native validation (the default) an incomplete value fails when the form is submitted, like a required one.

import {
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type Ref,
} from 'react';
import {
  Input,
  TextField as AriaTextField,
  type TextFieldProps as AriaTextFieldProps,
} from 'react-aria-components';
import { useEntryMessages } from '../../provider/context';
import { maskedFieldStrings } from '../../provider/coreStrings';
import { joinIds } from '../../utils/aria';
import { cn } from '../../utils/cn';
import {
  applyMask,
  editMask,
  maskTemplate,
  type Mask,
  type MaskEdit,
  type MaskTokens,
} from '../../utils/mask';
import { mergeRefs } from '../../utils/mergeRefs';
import { textChangeIn } from '../../utils/text';
import { useControllableState } from '../../utils/useControllableState';
import {
  FieldFrame,
  fieldRootClasses,
  inputClasses,
  inputGroupClasses,
  inputHeightClasses,
  type FieldBaseProps,
} from '../Field/Field';

/** How a MaskedField holds its value: the typed characters alone, or with the mask's literals. */
export type MaskValueFormat = 'raw' | 'formatted';

type FieldValidation = ReturnType<NonNullable<AriaTextFieldProps['validate']>>;

export interface MaskedFieldProps
  extends
    Omit<
      AriaTextFieldProps,
      | 'className'
      | 'style'
      | 'children'
      | 'render'
      | 'type'
      | 'value'
      | 'defaultValue'
      | 'onChange'
      | 'validate'
      | 'name'
      | 'maxLength'
      | 'minLength'
      | 'pattern'
    >,
    FieldBaseProps {
  /**
   * The pattern: `9` a digit, `a` a Latin letter, `A` a Latin letter (uppercased), `*` a letter or digit, `&` any
   * character, `[…]` an optional part at the end, `\` before a character to take it literally, and anything else a
   * literal: `(999) 999-9999`, `A9A 9A9`, `99999[-9999]`. Or a function of the raw value so far that returns one, for
   * formats that change with the input (card numbers by brand).
   */
  mask: Mask;
  /**
   * Slot characters of your own, added to or replacing the built-in ones: `{ H: /[0-9a-f]/ }`, or with a transform,
   * `{ X: { pattern: /[A-Z0-9]/, transform: (char) => char.toUpperCase() } }`. Keep the object stable (module level).
   */
  tokens?: MaskTokens;
  /** The value, controlled: the typed characters alone ("5551234567"), unless `valueFormat` is `formatted`. */
  value?: string;
  /** The initial value, uncontrolled. */
  defaultValue?: string;
  /** Called with the value on every change (it may be partly entered). */
  onChange?: (value: string) => void;
  /** Called with the value whenever typing or pasting completes the mask, for example to move on. */
  onComplete?: (value: string) => void;
  /**
   * `raw` (the default) holds the typed characters alone in `value`, `onChange`, `onComplete` and the submitted
   * value; `formatted` holds them with the mask's literals ("(555) 123-4567").
   */
  valueFormat?: MaskValueFormat;
  /** Draws the rest of the mask as a template while the field has focus, with this character in each empty slot. */
  placeholderChar?: string;
  /**
   * Checks the value (in `valueFormat`). With native validation (the default) an incomplete value already fails with
   * the `maskedFieldIncomplete` message when the form is submitted; with `validationBehavior="aria"` the app decides.
   */
  validate?: (value: string) => FieldValidation;
  placeholder?: string;
  /** Submits the value (in `valueFormat`) with a form, through a hidden input. */
  name?: string;
  /** Defaults to `md`. On touch screens the height grows to the minimum touch target. */
  size?: 'sm' | 'md';
  className?: string;
  /** The field's root element. */
  ref?: Ref<HTMLDivElement>;
  /** The input element. */
  inputRef?: Ref<HTMLInputElement>;
}

interface Selection {
  start: number;
  end: number;
}

function selectionOf(input: HTMLInputElement): Selection {
  const start = input.selectionStart ?? 0;
  return { start, end: input.selectionEnd ?? start };
}

/** The input's text size and padding, shared by the template drawn behind it so the two line up. */
const textClasses = 'px-3 text-base tabular-nums sm:text-sm';

/**
 * A text input with a pattern mask: phone numbers, postal codes, card numbers, dates, IBANs. The mask's literals
 * appear as the user types and the caret skips over them; pasted text with or without them fills the slots. The value
 * is the raw characters by default (`valueFormat` for the formatted text), `onComplete` fires when the mask is full,
 * the keyboard follows the mask (numeric for digits), and an incomplete value is invalid on submit.
 */
export function MaskedField({
  label,
  description,
  errorMessage,
  labelPosition,
  infoTip,
  mask,
  tokens,
  value: valueProp,
  defaultValue,
  onChange,
  onComplete,
  valueFormat = 'raw',
  placeholderChar,
  validate,
  placeholder,
  name,
  size = 'md',
  className,
  inputRef,
  inputMode,
  'aria-describedby': ariaDescribedBy,
  ...rest
}: MaskedFieldProps) {
  const messages = useEntryMessages(maskedFieldStrings);
  const isFormatted = valueFormat === 'formatted';
  const [value, setValue] = useControllableState(valueProp, defaultValue ?? '', onChange);
  const masked = useMemo(
    () => applyMask(mask, value, { tokens, isFormatted }),
    [mask, value, tokens, isFormatted],
  );
  const { parsed } = masked;
  const output = isFormatted ? masked.text : masked.raw;
  // An IME's text while it composes, shown as it is (null otherwise).
  const [draft, setDraft] = useState<string | null>(null);
  const [isFocused, setFocused] = useState(false);
  const localInputRef = useRef<HTMLInputElement | null>(null);
  // One ref callback for the field's life, so the app's `inputRef` isn't detached and reattached on every keystroke.
  const mergedInputRef = useMemo(() => mergeRefs(localInputRef, inputRef), [inputRef]);
  const templateRef = useRef<HTMLSpanElement>(null);
  // The selection before the next edit, to read an edit the browser made.
  const lastSelection = useRef<Selection>({ start: 0, end: 0 });
  // The selection when an IME composition started; the whole composition is read as one edit when it ends.
  const composition = useRef<Selection | null>(null);
  const rawAtFocus = useRef('');
  const hintId = useId();
  const isLocked = rest.isDisabled === true || rest.isReadOnly === true;
  const shownText = draft ?? masked.text;
  const template =
    placeholderChar !== undefined && isFocused && !isLocked
      ? maskTemplate(parsed, masked.raw, placeholderChar)
      : null;

  const select = (start: number, end = start) => {
    lastSelection.current = { start, end };
    // After React has rendered the new text (or kept the old one).
    queueMicrotask(() => {
      const input = localInputRef.current;
      if (input && document.activeElement === input) {
        input.setSelectionRange(start, end);
      }
    });
  };

  /** Applies an edit to the shown text; false when the mask refuses it. */
  const apply = (edit: MaskEdit): boolean => {
    const result = editMask(mask, masked.raw, edit, tokens);
    if (result === null) {
      return false;
    }
    if (result.raw !== masked.raw) {
      const next = isFormatted ? result.text : result.raw;
      setValue(next);
      if (result.isComplete && result.raw.length > masked.raw.length) {
        onComplete?.(next);
      }
    }
    select(result.caret);
    return true;
  };

  /** Reads an edit the browser made itself back from the input's new text, and formats the result. */
  const readEdit = (next: string, selection: Selection) => {
    setDraft(null);
    if (next === masked.text) {
      return;
    }
    const change = textChangeIn(masked.text, next, selection.start, selection.end);
    const isCaret = selection.start === selection.end;
    const isApplied = apply({
      ...change,
      direction:
        change.text !== '' || !isCaret
          ? undefined
          : change.end === selection.start
            ? 'backward'
            : 'forward',
    });
    if (!isApplied) {
      // React puts the old text back; put the selection back with it.
      select(selection.start, selection.end);
    }
  };

  const onInputChange = (next: string) => {
    if (composition.current !== null) {
      // Changing an IME's text while it composes would cancel the composition.
      setDraft(next);
      return;
    }
    readEdit(next, lastSelection.current);
  };

  // Typing, Backspace and Delete from any keyboard: on-screen keyboards often send no key name, but every one sends
  // these input types. Composition events can't be cancelled; those are read back when the composition ends.
  const onBeforeInput = useEffectEvent((event: InputEvent) => {
    const input = localInputRef.current;
    if (!input || isLocked || event.isComposing || !event.cancelable) {
      return;
    }
    const { start, end } = selectionOf(input);
    const isCaret = start === end;
    let edit: MaskEdit;
    switch (event.inputType) {
      case 'insertText':
        edit = { start, end, text: event.data ?? '' };
        break;
      case 'deleteContentBackward':
        edit = isCaret
          ? { start: Math.max(0, start - 1), end, text: '', direction: 'backward' }
          : { start, end, text: '' };
        break;
      case 'deleteContentForward':
        edit = isCaret
          ? { start, end: end + 1, text: '', direction: 'forward' }
          : { start, end, text: '' };
        break;
      default:
        return;
    }
    event.preventDefault();
    apply(edit);
  });

  /** Keeps the template under the text when a long value scrolls the input. */
  const alignTemplate = useEffectEvent(() => {
    const input = localInputRef.current;
    const drawn = templateRef.current;
    if (input && drawn) {
      drawn.style.transform =
        input.scrollLeft === 0 ? '' : `translateX(${String(-input.scrollLeft)}px)`;
    }
  });

  useEffect(() => {
    const input = localInputRef.current;
    if (!input) {
      return;
    }
    const onBefore = (event: InputEvent) => {
      onBeforeInput(event);
    };
    const onScroll = () => {
      alignTemplate();
    };
    input.addEventListener('beforeinput', onBefore);
    input.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      input.removeEventListener('beforeinput', onBefore);
      input.removeEventListener('scroll', onScroll);
    };
  }, []);

  const isTemplateShown = template !== null;
  useLayoutEffect(() => {
    if (isTemplateShown) {
      alignTemplate();
    }
  }, [isTemplateShown, shownText]);

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    if (isLocked) {
      return;
    }
    apply({ ...selectionOf(event.currentTarget), text: event.clipboardData.getData('text') });
  };

  // With native validation an incomplete value fails like a missing required one: shown once the form is submitted
  // or the user leaves a field they changed. With aria validation the app (or ConfigForm) decides when to show it.
  const fieldValidate =
    rest.validationBehavior === 'aria'
      ? validate && (() => validate(output))
      : (): FieldValidation =>
          masked.raw !== '' && !masked.isComplete
            ? messages.maskedFieldIncomplete
            : validate?.(output);

  return (
    <AriaTextField
      {...rest}
      value={shownText}
      onChange={onInputChange}
      inputMode={inputMode ?? (parsed.isNumeric ? 'numeric' : 'text')}
      validate={fieldValidate}
      aria-describedby={joinIds(parsed.slots.length > 0 && hintId, ariaDescribedBy)}
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
        <div className={cn(inputGroupClasses, inputHeightClasses[size])}>
          <div dir="ltr" className="relative flex h-full min-w-0 flex-1 overflow-hidden">
            {template !== null && (
              <span
                ref={templateRef}
                aria-hidden="true"
                className={cn(
                  textClasses,
                  'pointer-events-none absolute inset-y-0 left-0 flex items-center whitespace-pre text-fg-muted',
                )}
              >
                <span className="invisible">{shownText}</span>
                {template.slice(shownText.length)}
              </span>
            )}
            <Input
              ref={mergedInputRef}
              placeholder={template === null ? placeholder : undefined}
              autoCapitalize={parsed.isUppercase ? 'characters' : 'none'}
              autoCorrect="off"
              spellCheck={false}
              onFocus={() => {
                rawAtFocus.current = masked.raw;
                // Focus only changes what's drawn when there's a template to show.
                if (placeholderChar !== undefined) {
                  setFocused(true);
                }
              }}
              onBlur={(event) => {
                setFocused(false);
                // The browser fires `change` only for edits it made itself, and the field makes most of them. React
                // Aria shows a native validation error (an incomplete value) once a changed field is left, on `change`.
                if (masked.raw !== rawAtFocus.current) {
                  event.currentTarget.dispatchEvent(new Event('change', { bubbles: true }));
                }
              }}
              onSelect={(event) => {
                if (composition.current === null) {
                  lastSelection.current = selectionOf(event.currentTarget);
                }
              }}
              onPaste={onPaste}
              onCompositionStart={(event) => {
                composition.current = selectionOf(event.currentTarget);
              }}
              onCompositionEnd={(event) => {
                const selection = composition.current;
                composition.current = null;
                if (selection !== null) {
                  readEdit(event.currentTarget.value, selection);
                }
              }}
              className={cn(inputClasses, textClasses, 'relative w-full')}
            />
          </div>
        </div>
        {parsed.slots.length > 0 && (
          <span id={hintId} className="sr-only">
            {messages.maskedFieldLength({
              min: parsed.minLength,
              max: parsed.slots.length,
              isDigits: parsed.isNumeric,
            })}
          </span>
        )}
        {name !== undefined && <input type="hidden" name={name} value={output} />}
      </FieldFrame>
    </AriaTextField>
  );
}
