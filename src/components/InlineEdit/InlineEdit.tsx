// Click-to-edit text: a value shown as text (or a heading) with an edit button, which switches to a field in place.
// Enter (Ctrl or ⌘+Enter in a text area) or the Save button saves, Escape or Cancel cancels, and leaving the field does
// either (`blurAction`). An async `onSave` keeps the field open, pending, until it settles, and with its error if it
// fails. The field and its state exist only while editing, so a long list of these costs little more than its text.

import { Check, Pencil, X } from 'lucide-react';
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react';
import { Button as AriaButton } from 'react-aria-components';
import { useEntryMessages } from '../../provider/context';
import { inlineEditStrings, type CommonMessages } from '../../provider/coreStrings';
import { cn } from '../../utils/cn';
import { editKeyAction } from '../../utils/editKeys';
import { errorMessageOf } from '../../utils/errors';
import { TABBABLE_SELECTOR } from '../../utils/focus';
import { isPromise } from '../../utils/promise';
import { useDeadlineTimer } from '../../utils/timers';
import type { HeadingLevel } from '../../utils/types';
import { useControllableState } from '../../utils/useControllableState';
import { useLatest } from '../../utils/useLatest';
import type { FieldBaseProps } from '../Field/Field';
import { IconButton } from '../IconButton/IconButton';
import { LiveRegion, useAnnouncer } from '../LiveRegion/LiveRegion';
import { Heading, Text } from '../Text/Text';
import { TextArea } from '../TextArea/TextArea';
import { TextField } from '../TextField/TextField';

type ValidationError = string | string[];

/** A field's `validate`: an error (or several) for an invalid value, or nothing (or `true`) for a valid one. */
export type InlineEditValidate<Value> = (value: Value) => ValidationError | true | null | undefined;

/** What `onSave` returns: an error message to keep the field open with it, or nothing once the value is saved. */
// `void` too, so any callback fits, including one declared to return nothing.
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- see above.
export type InlineEditSaveResult = string | null | undefined | void;

/** The props `renderEditor` gets: spread them onto a CCUX field (NumberField, Select, DatePicker…). */
export interface InlineEditEditorProps<Value> {
  /** The value being edited. */
  value: Value;
  onChange: (value: Value) => void;
  'aria-label'?: string;
  /** The visible label's id, when there is one. */
  'aria-labelledby'?: string;
  placeholder?: string;
  description?: ReactNode;
  /** `validate`'s message for the value, a failed save's message, or InlineEdit's `errorMessage`. */
  errorMessage?: FieldBaseProps['errorMessage'];
  /** True while `validate` fails or a failed save's message shows. */
  isInvalid?: boolean;
  /** True while a save is pending. */
  isReadOnly: boolean;
  size: 'sm' | 'md';
}

interface InlineEditBaseProps<Value> extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'className' | 'style' | 'children' | 'onChange' | 'defaultValue' | 'placeholder'
> {
  /** The value, controlled. */
  value?: Value;
  /** The starting value, uncontrolled. Defaults to an empty string. */
  defaultValue?: Value;
  /** Called with the new value once it's saved (after `onSave`, when there is one, succeeds). */
  onChange?: (value: Value) => void;
  /**
   * Called with the edited value when the user saves a change (an unchanged value just closes the field). Return an
   * error message, or reject, to keep the field open with the message. While a returned promise is pending the Save
   * button shows a spinner and the field is read-only.
   */
  onSave?: (value: Value) => InlineEditSaveResult | Promise<InlineEditSaveResult>;
  /** Called when the user cancels an edit: Escape, the Cancel button, or leaving the field with `blurAction` `cancel`. */
  onCancel?: () => void;
  /** Whether the field is shown, controlled. */
  isEditing?: boolean;
  /** Whether the field is shown at first, uncontrolled. */
  defaultEditing?: boolean;
  /** Called when the field opens or closes. */
  onEditingChange?: (isEditing: boolean) => void;
  /**
   * A visible label above the value. Without one, pass `aria-label`. Either names the field and the edit button
   * ("Edit Project name"); without both, the button is named by the text.
   */
  label?: string;
  description?: FieldBaseProps['description'];
  errorMessage?: FieldBaseProps['errorMessage'];
  /** Shown, muted, while the value is empty, and in the empty field. Defaults to the `notSet` message. */
  placeholder?: string;
  /** Shows the value as a heading (h2–h6) instead of text, and edits it in the heading's font. */
  headingLevel?: HeadingLevel;
  /** Edits in a TextArea, where Enter adds a line and Ctrl+Enter or ⌘+Enter saves. The text keeps its line breaks. */
  isMultiline?: boolean;
  /** With `isMultiline`, the text area's height in lines when empty or short. Defaults to 3. */
  minRows?: number;
  /** With `isMultiline`, the most lines the text area grows to. Defaults to 8. */
  maxRows?: number;
  maxLength?: number;
  /** Checks the value as the user types: its message shows under the field, and an invalid value can't be saved. */
  validate?: InlineEditValidate<Value>;
  /** What leaving the field does: `save` (the default), `cancel`, or `none` to keep it open. */
  blurAction?: 'save' | 'cancel' | 'none';
  /**
   * Shows Save and Cancel buttons beside the field. Defaults to true. Without them Enter and Escape still work, but
   * touch users can only save or cancel by leaving the field (`blurAction`).
   */
  hasActionButtons?: boolean;
  isDisabled?: boolean;
  /** Shows the value without the edit button. */
  isReadOnly?: boolean;
  /** The field's and buttons' size. Defaults to `md`. */
  size?: 'sm' | 'md';
  /** The text shown for a value. Defaults to the value itself for strings, numbers and booleans, and empty otherwise. */
  formatValue?: (value: Value) => string;
  className?: string;
  /** The root element. */
  ref?: Ref<HTMLDivElement>;
}

type RenderEditor<Value> = (props: InlineEditEditorProps<Value>) => ReactNode;

/**
 * InlineEdit's props. A string value edits in a TextField (or a TextArea with `isMultiline`); any other value needs
 * `renderEditor`, which draws a field from the props it's given.
 */
export type InlineEditProps<Value = string> = InlineEditBaseProps<Value> &
  ([Value] extends [string]
    ? { renderEditor?: RenderEditor<Value> }
    : { renderEditor: RenderEditor<Value> });

/** Where focus goes when editing ends: back to the text after a key or a button, or left where a blur took it. */
type ExitFocus = 'restore' | 'keep';

// The field in a heading's font. Levels 4 to 6 are about the input's own size already.
const headingFieldClasses: Record<HeadingLevel, string> = {
  2: '[&_:is(input,textarea)]:text-lg [&_:is(input,textarea)]:font-semibold [&_:is(input,textarea)]:tracking-tight',
  3: '[&_:is(input,textarea)]:text-base [&_:is(input,textarea)]:font-semibold [&_:is(input,textarea)]:tracking-tight',
  4: '[&_:is(input,textarea)]:font-semibold [&_:is(input,textarea)]:tracking-tight',
  5: '[&_:is(input,textarea)]:font-semibold [&_:is(input,textarea)]:tracking-tight',
  6: '[&_:is(input,textarea)]:font-semibold [&_:is(input,textarea)]:tracking-tight',
};

// The read view: the edit button's ::before covers it, so a press anywhere on the text edits. The negative start margin
// lines the text up with the content around it, with the hover surface just outside; the end stays inside, so the
// page never scrolls sideways.
const readClasses = [
  'relative -ms-1.5 flex min-h-hit w-fit max-w-[calc(100%+0.375rem)] items-center rounded-control px-1.5',
  'transition-colors duration-(--duration-fast) ease-standard',
  'has-[[data-hovered]]:bg-surface-3 has-[[data-pressed]]:bg-surface-4 has-[[data-focus-visible]]:focus-ring',
].join(' ');

const editButtonClasses = [
  'ms-1.5 inline-flex size-5 cursor-pointer items-center justify-center rounded-control align-middle text-fg-muted',
  'outline-none before:absolute before:inset-0 before:rounded-[inherit]',
  'data-hovered:text-fg data-disabled:cursor-not-allowed data-disabled:opacity-50',
].join(' ');

function formatAsString(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  return typeof value === 'number' || typeof value === 'boolean' ? String(value) : '';
}

/** The message of a `validate` result, or undefined when it's valid. */
function validationMessage(result: ValidationError | true | null | undefined): string | undefined {
  if (typeof result === 'string') {
    return result === '' ? undefined : result;
  }
  return Array.isArray(result) && result.length > 0 ? result.join(' ') : undefined;
}

/** Whether a key press comes from inside the element in the page, not from an overlay portalled out of it. */
function isOwnKey(event: KeyboardEvent<HTMLElement>): boolean {
  return event.target instanceof Node && event.currentTarget.contains(event.target);
}

/** Focuses the editor's first field: a text input with its text selected, a text area with the caret at the end. */
function focusEditor(container: HTMLElement | null) {
  const field = container?.querySelector<HTMLElement>(TABBABLE_SELECTOR);
  if (!field) {
    return;
  }
  field.focus();
  if (field instanceof HTMLTextAreaElement) {
    field.setSelectionRange(field.value.length, field.value.length);
  } else if (field instanceof HTMLInputElement) {
    field.select();
  }
}

/** Text or a heading that turns into a field when pressed (or on Enter or F2), saved and cancelled in place. */
export function InlineEdit<Value = string>(props: InlineEditProps<Value>) {
  const {
    value: valueProp,
    defaultValue,
    onChange,
    onSave,
    onCancel,
    isEditing: isEditingProp,
    defaultEditing = false,
    onEditingChange,
    label,
    'aria-label': ariaLabel,
    description,
    errorMessage,
    placeholder,
    headingLevel,
    isMultiline = false,
    minRows,
    maxRows,
    maxLength,
    validate,
    blurAction = 'save',
    hasActionButtons = true,
    isDisabled = false,
    isReadOnly = false,
    size = 'md',
    formatValue = formatAsString,
    renderEditor,
    className,
    ref,
    ...rest
  } = props as InlineEditBaseProps<Value> & { renderEditor?: RenderEditor<Value> };
  const messages = useEntryMessages(inlineEditStrings);
  const [value, setValue] = useControllableState(
    valueProp,
    defaultValue ?? ('' as Value),
    onChange,
  );
  const [isEditingState, setEditing] = useControllableState(
    isEditingProp,
    defaultEditing,
    onEditingChange,
  );
  const isEditing = isEditingState && !isDisabled && !isReadOnly;
  const labelId = useId();
  const valueId = useId();
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const exitFocusRef = useRef<ExitFocus | null>(null);
  const wasEditingRef = useRef(isEditing);
  const { ref: liveRef, announce } = useAnnouncer();

  const text = formatValue(value);
  const isEmpty = text === '';
  const name = label ?? ariaLabel;

  // Focus follows the switch: into the field when editing starts (not when the page loads with it open), and back to
  // the edit button when it ends, unless a blur took focus somewhere else.
  useLayoutEffect(() => {
    if (isEditing === wasEditingRef.current) {
      return;
    }
    wasEditingRef.current = isEditing;
    const exit = exitFocusRef.current;
    exitFocusRef.current = null;
    if (isEditing) {
      focusEditor(editorRef.current);
      return;
    }
    const active = document.activeElement;
    if (exit === 'restore' || (exit === null && (active === null || active === document.body))) {
      editButtonRef.current?.focus();
    }
  }, [isEditing]);

  const startEditing = () => {
    setEditing(true);
  };
  const finish = (focus: ExitFocus) => {
    exitFocusRef.current = focus;
    setEditing(false);
  };

  const shown = isEmpty ? (placeholder ?? messages.notSet) : text;
  const valueClasses = cn('inline', isMultiline && 'whitespace-pre-wrap');
  const valueElement =
    headingLevel === undefined ? (
      <Text id={valueId} as="span" variant={isEmpty ? 'muted' : 'body'} className={valueClasses}>
        {shown}
      </Text>
    ) : (
      <Heading
        id={valueId}
        level={headingLevel}
        tone={isEmpty ? 'muted' : 'default'}
        className={valueClasses}
      >
        {shown}
      </Heading>
    );

  return (
    <div
      {...rest}
      ref={ref}
      data-editing={isEditing || undefined}
      className={cn('flex min-w-0 flex-col gap-1.5', className)}
    >
      {label !== undefined && (
        <span id={labelId} className="text-sm font-medium text-fg">
          {label}
        </span>
      )}
      {isEditing ? (
        <InlineEditField
          containerRef={editorRef}
          value={value}
          labelledBy={label === undefined ? undefined : labelId}
          ariaLabel={label === undefined ? ariaLabel : undefined}
          description={description}
          errorMessage={errorMessage}
          placeholder={placeholder}
          headingLevel={headingLevel}
          isMultiline={isMultiline}
          minRows={minRows}
          maxRows={maxRows}
          maxLength={maxLength}
          validate={validate}
          blurAction={blurAction}
          hasActionButtons={hasActionButtons}
          size={size}
          renderEditor={renderEditor}
          messages={messages}
          announce={announce}
          onSave={onSave}
          onSaved={(next, focus) => {
            setValue(next);
            announce(messages.inlineEditSaved({ label: name ?? formatValue(next) }));
            finish(focus);
          }}
          onUnchanged={finish}
          onCancel={(focus) => {
            onCancel?.();
            finish(focus);
          }}
        />
      ) : isReadOnly ? (
        <div className="min-w-0 wrap-anywhere">{valueElement}</div>
      ) : (
        <div className={readClasses}>
          <div className="min-w-0 wrap-anywhere">
            {valueElement}
            <AriaButton
              ref={editButtonRef}
              aria-label={messages.inlineEditLabel({ label: name ?? shown })}
              // With a label, the button also reads the value; without one, the value is already its name.
              aria-describedby={name === undefined ? undefined : valueId}
              isDisabled={isDisabled}
              onPress={startEditing}
              onKeyDown={(event) => {
                if (event.key === 'F2') {
                  event.preventDefault();
                  startEditing();
                } else {
                  event.continuePropagation();
                }
              }}
              className={editButtonClasses}
            >
              <Pencil aria-hidden="true" className="size-4" />
            </AriaButton>
          </div>
        </div>
      )}
      <LiveRegion ref={liveRef} />
    </div>
  );
}

interface InlineEditFieldProps<Value> extends Pick<
  InlineEditBaseProps<Value>,
  | 'description'
  | 'errorMessage'
  | 'placeholder'
  | 'headingLevel'
  | 'minRows'
  | 'maxRows'
  | 'maxLength'
  | 'validate'
  | 'onSave'
> {
  value: Value;
  containerRef: RefObject<HTMLDivElement | null>;
  labelledBy: string | undefined;
  ariaLabel: string | undefined;
  isMultiline: boolean;
  blurAction: 'save' | 'cancel' | 'none';
  hasActionButtons: boolean;
  size: 'sm' | 'md';
  renderEditor: RenderEditor<Value> | undefined;
  messages: CommonMessages & typeof inlineEditStrings;
  announce: (text: string) => void;
  onSaved: (value: Value, focus: ExitFocus) => void;
  onUnchanged: (focus: ExitFocus) => void;
  onCancel: (focus: ExitFocus) => void;
}

/** The field and its buttons, mounted while editing; it starts from the current value each time. */
function InlineEditField<Value>({
  value,
  containerRef,
  labelledBy,
  ariaLabel,
  description,
  errorMessage,
  placeholder,
  headingLevel,
  isMultiline,
  minRows,
  maxRows,
  maxLength,
  validate,
  blurAction,
  hasActionButtons,
  size,
  renderEditor,
  messages,
  announce,
  onSave,
  onSaved,
  onUnchanged,
  onCancel,
}: InlineEditFieldProps<Value>) {
  const [draft, setDraft] = useState(value);
  const [saveError, setSaveError] = useState<string>();
  const [isPending, setPending] = useState(false);
  const isFocusWithinRef = useRef(false);

  const validationError = validationMessage(validate?.(draft));
  const shownError = saveError ?? validationError;

  const save = async (focus: ExitFocus) => {
    if (isPending) {
      return;
    }
    if (Object.is(draft, value)) {
      onUnchanged(focus);
      return;
    }
    if (validationError !== undefined) {
      // The field already shows it; announce it too, since pressing Enter otherwise seems to do nothing.
      announce(validationError);
      return;
    }
    let result: InlineEditSaveResult;
    try {
      const returned = onSave?.(draft);
      if (isPromise<InlineEditSaveResult>(returned)) {
        setSaveError(undefined);
        setPending(true);
        result = await returned.finally(() => {
          setPending(false);
        });
      } else {
        result = returned;
      }
    } catch (reason) {
      result = errorMessageOf(reason, messages.genericError);
    }
    if (typeof result === 'string' && result !== '') {
      setSaveError(result);
      announce(result);
      return;
    }
    // If the user moved on while the save was pending, focus stays where they took it.
    onSaved(draft, isFocusWithinRef.current ? focus : 'keep');
  };
  const saveRef = useLatest(save);

  // Saving after Enter or F2, and ending the edit when focus leaves, wait until the browser has finished the event:
  // - A field that commits on Enter or blur (NumberField commits its typed number) has reported its value by then.
  // - A field's popover (a Select's list) is portalled elsewhere in the page, but its focus event still reaches this
  //   element through React, so focus is found back inside. Switching to another window keeps the edit open.
  const afterEventRef = useRef<'save' | 'blur' | null>(null);
  const afterEvent = useDeadlineTimer(() => {
    const next = afterEventRef.current;
    afterEventRef.current = null;
    if (next === 'save') {
      void saveRef.current('restore');
    } else if (!isFocusWithinRef.current && !isPending && document.hasFocus()) {
      if (blurAction === 'save') {
        void saveRef.current('keep');
      } else {
        onCancel('keep');
      }
    }
  });

  // Enter and F2 are caught on the way down, since React Aria fields stop the keys they handle; the field still gets
  // the key. Keys from a portalled overlay (a Select's open list) are the overlay's.
  const onKeyDownCapture = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isOwnKey(event) && editKeyAction(event.nativeEvent) === 'commit') {
      // No form submit, and no new line in a text area.
      event.preventDefault();
      afterEventRef.current = 'save';
      afterEvent.start(0);
    }
  };
  // Escape on the way up, so a field that uses it first (SearchField clears, ComboBox closes its list) keeps it, and a
  // surrounding dialog doesn't close.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      event.defaultPrevented ||
      !isOwnKey(event) ||
      editKeyAction(event.nativeEvent) !== 'cancel'
    ) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (!isPending) {
      onCancel('restore');
    }
  };

  const editorProps: InlineEditEditorProps<Value> = {
    value: draft,
    onChange: (next) => {
      setDraft(next);
      setSaveError(undefined);
    },
    'aria-label': ariaLabel,
    'aria-labelledby': labelledBy,
    placeholder,
    description,
    errorMessage: shownError ?? errorMessage,
    isInvalid: shownError === undefined ? undefined : true,
    isReadOnly: isPending,
    size,
  };
  let editor: ReactNode;
  if (renderEditor) {
    editor = renderEditor(editorProps);
  } else {
    // Without `renderEditor` the value is a string (InlineEditProps requires it otherwise).
    const textProps = editorProps as unknown as InlineEditEditorProps<string>;
    editor = isMultiline ? (
      <TextArea {...textProps} minRows={minRows} maxRows={maxRows} maxLength={maxLength} />
    ) : (
      <TextField {...textProps} maxLength={maxLength} />
    );
  }

  return (
    // Not a control: it hears the keys (Enter, Escape, F2) and focus changes of the field and buttons inside it.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- see above.
    <div
      ref={containerRef}
      aria-busy={isPending || undefined}
      className="flex items-start gap-1"
      onKeyDownCapture={onKeyDownCapture}
      onKeyDown={onKeyDown}
      onFocus={() => {
        isFocusWithinRef.current = true;
      }}
      onBlur={() => {
        isFocusWithinRef.current = false;
        // A save already asked for (Enter, then the field moved focus) goes ahead instead.
        if (blurAction !== 'none' && afterEventRef.current === null) {
          afterEventRef.current = 'blur';
          afterEvent.start(0);
        }
      }}
    >
      <div
        className={cn(
          'min-w-0 flex-1',
          headingLevel !== undefined && headingFieldClasses[headingLevel],
        )}
      >
        {editor}
      </div>
      {hasActionButtons && (
        // On touch screens the buttons are the full touch size, as tall as the field: a smaller button's hit area
        // would reach past the field's end and could scroll the page sideways.
        <div className="flex shrink-0 gap-1">
          <IconButton
            icon={Check}
            aria-label={messages.save}
            variant="solid"
            tone="accent"
            size={size}
            className="pointer-coarse:size-11"
            isPending={isPending}
            onPress={() => void save('restore')}
          />
          <IconButton
            icon={X}
            aria-label={messages.cancel}
            variant="outline"
            size={size}
            className="pointer-coarse:size-11"
            isDisabled={isPending}
            onPress={() => {
              onCancel('restore');
            }}
          />
        </div>
      )}
    </div>
  );
}
