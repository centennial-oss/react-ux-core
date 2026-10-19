// OneTimeCodeField: a verification or PIN code shown as a row of cells. Like Radix's OneTimePasswordField and Base UI's
// OTP Field, it is one real input (React Aria's TextField), so screen readers hear one field with its label and a
// length hint ("6-digit code"), autofill and SMS suggestions fill it in one go, and it submits with a form. The input
// lies transparent over the cells, which are drawn from its value and selection:
//
// - The character in the current cell stays selected, so typing replaces it and moves on; an empty current cell
//   shows a caret. Cells fill in order, so the current cell is never past the first empty one.
// - Arrow keys, Home and End move between cells. Backspace clears the selected cell (or the one before an empty
//   current cell) and moves to the previous cell, except that an emptied last cell stays current, to be retyped.
// - Pasting, dropping or autofilling a whole code fills every cell; spaces, hyphens and other characters are dropped,
//   and digits from other scripts (Arabic-Indic, full-width) become ASCII.
// - Codes read left to right in every language, so the cells keep that order in right-to-left layouts too.
// - In forced-colours mode the input keeps its transparent text, caret and selection, and the drawn caret, dots and
//   selection use system colours.

import {
  Fragment,
  useEffect,
  useEffectEvent,
  useId,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type Ref,
} from 'react';
import {
  Input,
  TextField as AriaTextField,
  type TextFieldProps as AriaTextFieldProps,
} from 'react-aria-components';
import { useEntryMessages } from '../../provider/context';
import { oneTimeCodeStrings } from '../../provider/coreStrings';
import { joinIds } from '../../utils/aria';
import { cn } from '../../utils/cn';
import { clamp } from '../../utils/math';
import { mergeRefs } from '../../utils/mergeRefs';
import type { Size } from '../../utils/types';
import { useControllableState } from '../../utils/useControllableState';
import { FieldFrame, fieldRootClasses, type FieldBaseProps } from '../Field/Field';
import { cleanCode, codeGroups, resolveCodeLength, type OneTimeCodeCharacters } from './code';

export interface OneTimeCodeFieldProps
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
      | 'inputMode'
      | 'autoComplete'
      | 'maxLength'
      | 'minLength'
      | 'pattern'
    >,
    FieldBaseProps {
  /** The code, controlled. */
  value?: string;
  /** The initial code, uncontrolled. */
  defaultValue?: string;
  /** Called with the code on every change (it may be partly entered). */
  onChange?: (value: string) => void;
  /** Called with the code whenever a change fills every cell, for example to submit it. */
  onComplete?: (code: string) => void;
  /** The number of characters. Defaults to the sum of `groupSizes`, or 6. */
  codeLength?: number;
  /** Cells per visual group, with a separator between groups: `[3, 3]` shows 123–456. The last size repeats. */
  groupSizes?: readonly number[];
  /**
   * `digits` (the default, with a numeric keyboard), `alphanumeric` (Latin letters, uppercased as they're typed, and
   * digits), or a pattern each character must match, such as `/[0-9A-F]/` (taken as typed).
   */
  allowedCharacters?: OneTimeCodeCharacters;
  /** Shows dots instead of the characters, and makes the input a password input. */
  isMasked?: boolean;
  /** Defaults to `md`. On touch screens the cells grow to the minimum touch height. */
  size?: Size;
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

const cellSizes: Record<Size, string> = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-12 w-12 text-xl',
};

/** The drawn caret and mask dots: the text colour, and the system's text colour in forced-colours mode. */
const drawnClasses = 'bg-fg [forced-color-adjust:none] forced-colors:bg-[color:CanvasText]';

/** Cells inside a selection of several, in the system's highlight colours in forced-colours mode. */
const selectedCellClasses = [
  'border-accent-solid bg-accent-bg',
  'forced-colors:border-[color:Highlight] forced-colors:bg-[color:Highlight] forced-colors:text-[color:HighlightText]',
  'forced-colors:[forced-color-adjust:none]',
].join(' ');

const cellClasses = [
  'flex min-h-hit min-w-0 shrink items-center justify-center rounded-control border border-border-strong',
  'bg-surface-2 font-medium text-fg tabular-nums',
  'group-data-invalid/field:border-danger-solid group-data-disabled/field:opacity-50',
  'group-data-readonly/field:bg-surface-1',
].join(' ');

/**
 * A one-time code (verification code, PIN) in cells: one input underneath, so it's one field to screen readers and to
 * autofill (`autocomplete="one-time-code"`, a numeric keyboard for digits). Pasting or autofilling a whole code fills
 * every cell; Backspace and the arrow keys move between cells; typing over a filled cell replaces it. `groupSizes`
 * splits the cells (3 + 3), `isMasked` hides the characters, and `onComplete` fires when every cell is filled.
 */
export function OneTimeCodeField({
  label,
  description,
  errorMessage,
  labelPosition,
  infoTip,
  value: valueProp,
  defaultValue,
  onChange,
  onComplete,
  codeLength: codeLengthProp,
  groupSizes,
  allowedCharacters = 'digits',
  isMasked = false,
  size = 'md',
  className,
  inputRef,
  'aria-describedby': ariaDescribedBy,
  ...rest
}: OneTimeCodeFieldProps) {
  const messages = useEntryMessages(oneTimeCodeStrings);
  const codeLength = resolveCodeLength(codeLengthProp, groupSizes);
  const [value, setValue] = useControllableState(valueProp, defaultValue ?? '', onChange);
  const code = value.slice(0, codeLength);
  // The input's selection while it has focus (null without focus): which cells show as current or selected.
  const [selection, setSelection] = useState<Selection | null>(null);
  // The selection before the next edit, to tell what an edit inserted.
  const lastSelection = useRef<Selection>({ start: 0, end: 0 });
  const localInputRef = useRef<HTMLInputElement | null>(null);
  // One ref callback for the field's life: the field re-renders on every selection change, and a new callback would
  // detach and reattach the app's `inputRef` each time.
  const mergedInputRef = useMemo(() => mergeRefs(localInputRef, inputRef), [inputRef]);
  const cellsRef = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const isDigits = allowedCharacters === 'digits';
  const isLocked = rest.isDisabled === true || rest.isReadOnly === true;

  const remember = (start: number, end: number) => {
    lastSelection.current = { start, end };
    setSelection((current) =>
      current?.start === start && current.end === end ? current : { start, end },
    );
  };

  /** Makes cell `index` current: selects its character, or puts the caret in it when it's empty. */
  const selectCell = (index: number) => {
    const input = localInputRef.current;
    if (!input || document.activeElement !== input) {
      return;
    }
    const length = input.value.length;
    const cell = clamp(index, 0, Math.min(length, codeLength - 1));
    const end = cell < length ? cell + 1 : cell;
    input.setSelectionRange(cell, end);
    remember(cell, end);
  };

  /** Keeps the selection on whole cells after the browser moves it (a click, a tap, an edit). */
  const syncSelection = (input: HTMLInputElement) => {
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? start;
    if (start === end && (start < input.value.length || input.value.length >= codeLength)) {
      selectCell(start);
    } else {
      remember(start, end);
    }
  };

  /** Sets a new code from an edit and puts the current cell at `caret`. */
  const commit = (next: string, caret: number) => {
    if (next !== code) {
      setValue(next);
      if (next.length === codeLength) {
        onComplete?.(next);
      }
    }
    // After React has rendered the new value (or restored the old one, for a refused edit).
    queueMicrotask(() => {
      selectCell(caret);
    });
  };

  const onInputChange = (raw: string) => {
    const { start, end } = lastSelection.current;
    const cleaned = cleanCode(raw, allowedCharacters);
    if (raw.length >= code.length && cleaned.length < code.length) {
      // A character that isn't allowed, typed over a selected one, would delete it: refuse the edit.
      commit(code, start);
      return;
    }
    const caretEnd = localInputRef.current?.selectionEnd ?? raw.length;
    let next = cleaned;
    let caret = cleanCode(raw.slice(0, caretEnd), allowedCharacters).length;
    if (cleaned.length > codeLength) {
      // A whole code arriving at once (autofill, dropped text) replaces the code rather than adding to it.
      const inserted = cleanCode(
        raw.slice(start, raw.length - (code.length - end)),
        allowedCharacters,
      );
      if (inserted.length >= codeLength) {
        next = inserted;
        caret = codeLength;
      }
      next = next.slice(0, codeLength);
    }
    commit(next, caret);
  };

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    if (isLocked) {
      return;
    }
    const pasted = cleanCode(event.clipboardData.getData('text'), allowedCharacters);
    if (pasted === '') {
      return;
    }
    if (pasted.length >= codeLength) {
      commit(pasted.slice(0, codeLength), codeLength);
      return;
    }
    // A part of a code types over the cells from the current one.
    const start = event.currentTarget.selectionStart ?? code.length;
    const end = event.currentTarget.selectionEnd ?? start;
    const next =
      code.slice(0, start) + pasted + code.slice(start + Math.max(pasted.length, end - start));
    commit(next.slice(0, codeLength), start + pasted.length);
  };

  /**
   * Backspace, from any keyboard (on-screen keyboards often send no key name, but every one sends this input type):
   * clears the selected cell, or the one before an empty current cell, and moves back a cell.
   */
  const deleteBackward = useEffectEvent((event: InputEvent) => {
    const input = localInputRef.current;
    if (event.inputType !== 'deleteContentBackward' || !input || isLocked) {
      return;
    }
    event.preventDefault();
    const start = input.selectionStart ?? code.length;
    const end = input.selectionEnd ?? start;
    if (end - start > 1) {
      commit(code.slice(0, start) + code.slice(end), start);
      return;
    }
    const index = end > start ? start : start - 1;
    if (index < 0) {
      return;
    }
    const next = code.slice(0, index) + code.slice(index + 1);
    // An emptied last cell stays current, so the next key retypes it; otherwise the previous cell is current.
    commit(next, index === next.length ? index : index - 1);
  });

  useEffect(() => {
    const input = localInputRef.current;
    if (!input) {
      return;
    }
    const listener = (event: InputEvent) => {
      deleteBackward(event);
    };
    input.addEventListener('beforeinput', listener);
    return () => {
      input.removeEventListener('beforeinput', listener);
    };
  }, []);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    const input = event.currentTarget;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? start;
    const isRange = end - start > 1;
    const moves: Record<string, number> = {
      ArrowLeft: isRange ? start : start - 1,
      ArrowRight: isRange ? end - 1 : start + 1,
      ArrowUp: 0,
      ArrowDown: codeLength,
      Home: 0,
      End: codeLength,
    };
    const target = event.shiftKey ? undefined : moves[event.key];
    if (target !== undefined) {
      event.preventDefault();
      selectCell(target);
    } else if (event.key.length === 1 && cleanCode(event.key, allowedCharacters) === '') {
      // Keeps the cells unchanged rather than taking and then refusing the character.
      event.preventDefault();
    }
  };

  const onClick = (event: ReactMouseEvent<HTMLInputElement>) => {
    // Double and triple clicks keep the browser's selection (the whole code).
    if (event.detail > 1) {
      return;
    }
    const cells = cellsRef.current?.querySelectorAll('[data-cell]') ?? [];
    let nearest = 0;
    let distance = Infinity;
    cells.forEach((cell, index) => {
      const rect = cell.getBoundingClientRect();
      const offset = Math.abs(event.clientX - (rect.left + rect.width / 2));
      if (offset < distance) {
        distance = offset;
        nearest = index;
      }
    });
    selectCell(nearest);
  };

  const groups = codeGroups(codeLength, groupSizes);
  const groupStarts = groups.map((_, index) =>
    groups.slice(0, index).reduce((sum, groupSize) => sum + groupSize, 0),
  );
  const isRangeSelected = selection !== null && selection.end - selection.start > 1;
  const current = selection === null ? -1 : Math.min(selection.start, codeLength - 1);

  return (
    <AriaTextField
      {...rest}
      type={isMasked ? 'password' : 'text'}
      inputMode={isDigits ? 'numeric' : 'text'}
      autoComplete="one-time-code"
      aria-describedby={joinIds(hintId, ariaDescribedBy)}
      value={code}
      onChange={onInputChange}
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
        <div dir="ltr" className="relative flex w-max max-w-full">
          <div ref={cellsRef} aria-hidden="true" className="flex min-w-0 items-center gap-2">
            {groups.map((groupSize, group) => (
              <Fragment key={group}>
                {group > 0 && <span className="h-0.5 w-2 shrink-0 rounded-full bg-border-strong" />}
                <div className="flex min-w-0 gap-1.5">
                  {Array.from({ length: groupSize }, (_, offset) => {
                    const index = (groupStarts[group] ?? 0) + offset;
                    const char = code[index];
                    const isCurrent = index === current && !isRangeSelected;
                    return (
                      <div
                        key={index}
                        data-cell
                        data-current={isCurrent || undefined}
                        className={cn(
                          cellClasses,
                          cellSizes[size],
                          isCurrent &&
                            'border-accent-solid focus-ring forced-colors:outline-[color:Highlight]',
                          isRangeSelected &&
                            index >= selection.start &&
                            index < selection.end &&
                            selectedCellClasses,
                        )}
                      >
                        {char === undefined ? (
                          isCurrent &&
                          !isLocked && (
                            <span
                              className={cn('h-1/2 w-px motion-safe:animate-pulse', drawnClasses)}
                            />
                          )
                        ) : isMasked ? (
                          <span className={cn('size-2 rounded-full', drawnClasses)} />
                        ) : (
                          char
                        )}
                      </div>
                    );
                  })}
                </div>
              </Fragment>
            ))}
          </div>
          <Input
            ref={mergedInputRef}
            autoCapitalize={allowedCharacters === 'alphanumeric' ? 'characters' : 'none'}
            autoCorrect="off"
            spellCheck={false}
            onFocus={() => {
              // After the browser's own focus selection (all the text, on keyboard focus): the first empty cell.
              queueMicrotask(() => {
                selectCell(localInputRef.current?.value.length ?? 0);
              });
            }}
            onBlur={() => {
              setSelection(null);
            }}
            onSelect={(event) => {
              syncSelection(event.currentTarget);
            }}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            onClick={onClick}
            className={cn(
              // Covers the cells, so a press anywhere focuses it; its own text, caret and selection stay invisible,
              // forced colours included.
              'absolute inset-0 size-full min-w-0 cursor-text appearance-none border-0 bg-transparent p-0',
              'text-base text-transparent caret-transparent outline-none selection:bg-transparent',
              '[forced-color-adjust:none]',
              'disabled:cursor-not-allowed',
            )}
          />
        </div>
        <span id={hintId} className="sr-only">
          {messages.oneTimeCodeLength({ length: codeLength, isDigits })}
        </span>
      </FieldFrame>
    </AriaTextField>
  );
}
