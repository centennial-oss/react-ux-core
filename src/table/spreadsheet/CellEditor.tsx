// The editor inside the cell being edited: a plain input for text, numbers and dates, and a combo box (type to filter,
// arrow keys and Enter to choose) for choices. Enter keeps the edit and moves down (Shift+Enter up), Tab keeps it and
// moves across, Escape cancels. When typing started the edit, the arrow keys keep it and move too, as in other
// spreadsheets; after Enter, F2 or a double-click they move the caret instead.

import { useLayoutEffect, useRef, type KeyboardEvent } from 'react';
import {
  ComboBox as AriaComboBox,
  Input,
  ListBox,
  Popover as AriaPopover,
} from 'react-aria-components';
import { listBoxClasses, Option } from '../../components/ListBox/ListBoxParts';
import { popoverClasses } from '../../components/Overlay/styles';
import { cn } from '../../utils/cn';
import type { ColumnFormat } from './values';

/** Where the selection goes after an edit is kept: `right` is the next column and `left` the previous one. */
export type EditorMove = 'down' | 'up' | 'right' | 'left' | 'none';

export interface CellEditorProps {
  format: ColumnFormat;
  text: string;
  onTextChange: (text: string) => void;
  /** Keeps the edit (with `text` when given, such as a chosen option), then moves. */
  onCommit: (move: EditorMove, text?: string) => void;
  onCancel: () => void;
  /** Focus left the editor: keep the edit if it's valid, otherwise drop it. */
  onBlur: () => void;
  /** Typing started the edit, so the arrow keys keep it and move. */
  isReplacing: boolean;
  error: string | undefined;
  errorId: string;
  /** The editor's accessible name ("Port, row 12"). */
  label: string;
  align: 'start' | 'center' | 'end';
  /** Text direction, for which arrow key moves where. */
  isRtl: boolean;
}

const inputClasses =
  'absolute inset-0 z-[2] size-full min-w-0 bg-surface-2 px-2 text-sm text-fg outline-none ring-2 ring-accent-solid ring-inset aria-invalid:ring-danger-solid';

const alignClasses = { start: 'text-start', center: 'text-center', end: 'text-end' } as const;

export function CellEditor({
  format,
  text,
  onTextChange,
  onCommit,
  onCancel,
  onBlur,
  isReplacing,
  error,
  errorId,
  label,
  align,
  isRtl,
}: CellEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus on mount with the caret at the end (after the typed character, or after the existing text).
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (input) {
      input.focus({ preventScroll: true });
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }, []);

  const isChoice = format.type === 'enum';

  /** The choice to keep: the highlighted option, or the only one matching what's typed. */
  const chosen = (input: HTMLInputElement): string | undefined => {
    const id = input.getAttribute('aria-activedescendant');
    const key = id ? document.getElementById(id)?.dataset.key : undefined;
    if (key !== undefined) {
      return format.optionLabels.get(key);
    }
    const typed = text.trim().toLowerCase();
    if (typed === '') {
      return undefined;
    }
    const options = format.column.options ?? [];
    const starting = options.filter((option) => option.label.toLowerCase().startsWith(typed));
    const containing = options.filter((option) => option.label.toLowerCase().includes(typed));
    const only = starting.length === 1 ? starting : containing;
    return only.length === 1 ? only[0]?.label : undefined;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Keys stay with the editor; the grid only hears about them through the callbacks.
    event.stopPropagation();
    const input = event.currentTarget;
    const isListOpen = input.getAttribute('aria-expanded') === 'true';
    const commit = (move: EditorMove) => {
      event.preventDefault();
      onCommit(move, isChoice ? chosen(input) : undefined);
    };
    switch (event.key) {
      case 'Enter':
        commit(event.shiftKey ? 'up' : 'down');
        return;
      case 'Tab':
        commit(event.shiftKey ? 'left' : 'right');
        return;
      case 'Escape':
        if (!isListOpen) {
          event.preventDefault();
          onCancel();
        }
        return;
      case 'ArrowUp':
      case 'ArrowDown':
        if (isReplacing && !isChoice) {
          commit(event.key === 'ArrowUp' ? 'up' : 'down');
        }
        return;
      case 'ArrowLeft':
      case 'ArrowRight':
        if (isReplacing && !event.shiftKey) {
          commit((event.key === 'ArrowRight') !== isRtl ? 'right' : 'left');
        }
        return;
    }
  };

  const errorTip =
    error === undefined ? null : (
      <span
        id={errorId}
        role="alert"
        className="pointer-events-none absolute start-0 top-full z-[3] mt-0.5 w-max max-w-64 rounded-control bg-danger-solid px-2 py-1 text-xs whitespace-normal text-danger-on-solid shadow-overlay"
      >
        {error}
      </span>
    );

  const inputProps = {
    'aria-label': label,
    'aria-invalid': error !== undefined || undefined,
    'aria-describedby': error === undefined ? undefined : errorId,
    autoComplete: 'off',
    spellCheck: format.type === 'text',
    inputMode:
      format.type === 'number'
        ? ('decimal' as const)
        : format.type === 'date'
          ? ('numeric' as const)
          : undefined,
    placeholder: format.type === 'date' ? '2026-10-17' : undefined,
    onKeyDown,
    onBlur,
    className: cn(inputClasses, alignClasses[align]),
  };

  if (isChoice) {
    const options = format.column.options ?? [];
    // The choices matching what's typed; all of them while the text is still the cell's own choice.
    const typed = text.trim().toLowerCase();
    const shown =
      !isReplacing && options.some((option) => option.label === text)
        ? options
        : options
            .filter((option) => option.label.toLowerCase().includes(typed))
            .sort(
              (a, b) =>
                Number(!a.label.toLowerCase().startsWith(typed)) -
                Number(!b.label.toLowerCase().startsWith(typed)),
            );
    return (
      <>
        <AriaComboBox
          aria-label={label}
          items={shown}
          inputValue={text}
          onInputChange={onTextChange}
          allowsCustomValue
          menuTrigger="focus"
          defaultFilter={() => true}
          onChange={(key) => {
            // A pointer choice; keyboard choices go through Enter and Tab above.
            if (key !== null) {
              onCommit('none', format.optionLabels.get(String(key)));
            }
          }}
          className="contents"
        >
          <Input ref={inputRef} {...inputProps} />
          <AriaPopover
            placement="bottom start"
            offset={2}
            className={cn('max-h-64 min-w-48', popoverClasses)}
          >
            <ListBox className={listBoxClasses}>
              {(option: { id: string; label: string }) => (
                <Option id={option.id}>{option.label}</Option>
              )}
            </ListBox>
          </AriaPopover>
        </AriaComboBox>
        {errorTip}
      </>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        {...inputProps}
        value={text}
        onChange={(event) => {
          onTextChange(event.target.value);
        }}
      />
      {errorTip}
    </>
  );
}
