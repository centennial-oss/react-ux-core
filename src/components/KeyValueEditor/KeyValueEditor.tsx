// KeyValueEditor: rows of key/value pairs (HTTP headers, environment variables, tags, query parameters). Rows are
// added, removed and moved with buttons (keyboard and touch alike), pasting `KEY=value` lines or a .env block into a
// key splits it into rows, duplicate keys are flagged on every row that has them, and secret values can be masked.
// Wide editors show a table; narrow ones (phones) a card per row with the key above its value.
import { ArrowDown, ArrowUp, Lock, Plus, Trash2 } from 'lucide-react';
import {
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type Ref,
} from 'react';
import { MessagesContext, useEntryMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import { mergeRefs } from '../../utils/mergeRefs';
import { useControllableState } from '../../utils/useControllableState';
import { Button } from '../Button/Button';
import { ComboBox } from '../ComboBox/ComboBox';
import type { FieldBaseProps } from '../Field/Field';
import { IconButton } from '../IconButton/IconButton';
import { Option } from '../ListBox/ListBoxParts';
import { useRowLayout } from '../RowEditor/rowLayout';
import { TextField } from '../TextField/TextField';
import { defaultKeyValueEditorMessages } from './messages';
import { isKeyValuePaste, parseKeyValueText } from './parseKeyValueText';

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  /** Masks the value (with `hasSecretToggle`). */
  isSecret?: boolean;
}

export interface KeyValueEditorProps extends Omit<FieldBaseProps, 'labelPosition' | 'infoTip'> {
  value?: readonly KeyValuePair[];
  defaultValue?: readonly KeyValuePair[];
  onChange?: (value: KeyValuePair[]) => void;
  /** The key column's heading, such as "Header". Defaults to the `kvKey` message. */
  keyLabel?: string;
  /** The value column's heading. Defaults to the `value` message. */
  valueLabel?: string;
  /** Suggestions for keys, such as common header names (the key becomes a ComboBox). */
  keySuggestions?: readonly string[];
  /** Per-row validation: an error message, or undefined. */
  validate?: (pair: KeyValuePair, all: readonly KeyValuePair[]) => string | undefined;
  /** Allows two rows with the same key. Defaults to false: duplicates are flagged on every row that has them. */
  allowsDuplicateKeys?: boolean;
  /** Whether `Accept` and `accept` are different keys. Defaults to true; turn off for HTTP headers. */
  hasCaseSensitiveKeys?: boolean;
  /** Adds a per-row toggle that masks the value, with show and hide buttons. */
  hasSecretToggle?: boolean;
  /** The most rows the editor takes. */
  maxRows?: number;
  /** The add button's text. Defaults to the `kvAdd` message. */
  addLabel?: string;
  /** Makes ids for added rows. Defaults to ids unique within the editor. */
  createId?: () => string;
  /** Marks the editor invalid, showing `errorMessage` under it. */
  isInvalid?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  /** Names the editor when there's no visible label. */
  'aria-label'?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

type FocusTarget =
  | { kind: 'key'; id: string }
  | { kind: 'move'; id: string; direction: 'up' | 'down' }
  | { kind: 'add' };

/** An editor for key/value pairs with paste-to-split, duplicate checks, reordering and secret values. */
export function KeyValueEditor({
  label,
  description,
  errorMessage,
  value,
  defaultValue = [],
  onChange,
  keyLabel,
  valueLabel,
  keySuggestions,
  validate,
  allowsDuplicateKeys = false,
  hasCaseSensitiveKeys = true,
  hasSecretToggle = false,
  maxRows,
  addLabel,
  createId,
  isInvalid = false,
  isDisabled = false,
  isReadOnly = false,
  'aria-label': ariaLabel,
  className,
  ref,
}: KeyValueEditorProps) {
  const messages = useEntryMessages(defaultKeyValueEditorMessages);
  const providedMessages = useContext(MessagesContext);
  const labelId = useId();
  const descriptionId = useId();
  const errorsId = useId();
  const idPrefix = useId();
  const idCounter = useRef(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const pendingFocus = useRef<FocusTarget | null>(null);
  const [rows, setRows] = useControllableState<readonly KeyValuePair[]>(
    value,
    defaultValue,
    onChange as ((next: readonly KeyValuePair[]) => void) | undefined,
  );
  const [announcement, setAnnouncement] = useState('');
  const layout = useRowLayout();
  const { isWide, fieldLabel } = layout;
  const keyHeading = keyLabel ?? messages.kvKey;
  const valueHeading = valueLabel ?? messages.value;
  const isLocked = isDisabled || isReadOnly;
  const isFull = maxRows !== undefined && rows.length >= maxRows;
  const suggestionItems = useMemo(
    () => keySuggestions?.map((suggestion) => ({ id: suggestion })),
    [keySuggestions],
  );

  const newId = () => createId?.() ?? `${idPrefix}-${String(idCounter.current++)}`;
  const commit = (next: KeyValuePair[]) => {
    setRows(next);
  };
  const update = (id: string, patch: Partial<KeyValuePair>) => {
    commit(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  // Duplicate keys, counted by their normalised form.
  const normalizeKey = (key: string) =>
    hasCaseSensitiveKeys ? key.trim() : key.trim().toLocaleLowerCase();
  const keyCounts = new Map<string, number>();
  for (const row of rows) {
    const key = normalizeKey(row.key);
    if (key !== '') {
      keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
    }
  }
  const rowIssues = (row: KeyValuePair) => {
    const errors: string[] = [];
    let isKeyInvalid = false;
    const key = row.key.trim();
    if (key === '' && row.value !== '') {
      errors.push(messages.kvKeyRequired);
      isKeyInvalid = true;
    }
    if (!allowsDuplicateKeys && key !== '' && (keyCounts.get(normalizeKey(key)) ?? 0) > 1) {
      errors.push(messages.kvDuplicateKey({ key }));
      isKeyInvalid = true;
    }
    const custom = validate?.(row, rows);
    if (custom !== undefined) {
      errors.push(custom);
    }
    return { errors, isKeyInvalid };
  };

  const add = () => {
    if (isFull) {
      return;
    }
    const row: KeyValuePair = { id: newId(), key: '', value: '' };
    commit([...rows, row]);
    pendingFocus.current = { kind: 'key', id: row.id };
    setAnnouncement(messages.kvAdded({ index: rows.length + 1 }));
  };

  const remove = (index: number, item: string) => {
    const next = rows.filter((_, at) => at !== index);
    commit(next);
    const neighbour = next[index] ?? next[index - 1];
    pendingFocus.current = neighbour ? { kind: 'key', id: neighbour.id } : { kind: 'add' };
    setAnnouncement(messages.kvRemoved({ item }));
  };

  const move = (index: number, direction: 'up' | 'down', item: string) => {
    const to = direction === 'up' ? index - 1 : index + 1;
    const row = rows[index];
    if (!row || to < 0 || to >= rows.length) {
      return;
    }
    const next = [...rows];
    next.splice(index, 1);
    next.splice(to, 0, row);
    commit(next);
    const isAtEnd = direction === 'up' ? to === 0 : to === next.length - 1;
    pendingFocus.current = {
      kind: 'move',
      id: row.id,
      direction: isAtEnd ? (direction === 'up' ? 'down' : 'up') : direction,
    };
    setAnnouncement(messages.itemMovedTo({ item, position: to + 1, total: next.length }));
  };

  // Pasting `KEY=value` lines into a key fills this row from the first and adds rows after it for the rest.
  const pasteInto = (index: number, event: ClipboardEvent) => {
    const text = event.clipboardData.getData('text');
    if (!isKeyValuePaste(text)) {
      return;
    }
    const pairs = parseKeyValueText(text);
    const [first, ...others] = pairs;
    const row = rows[index];
    if (!first || !row) {
      return;
    }
    event.preventDefault();
    const room = maxRows === undefined ? others.length : Math.max(0, maxRows - rows.length);
    const added = others.slice(0, room).map((pair) => ({ id: newId(), ...pair }));
    commit([
      ...rows.slice(0, index),
      { ...row, key: first.key, value: first.value },
      ...added,
      ...rows.slice(index + 1),
    ]);
    const count = added.length + 1;
    const skipped = others.length - added.length;
    setAnnouncement(
      skipped > 0 && maxRows !== undefined
        ? messages.kvPastedTooMany({ count, skipped, max: maxRows })
        : messages.kvPasted({ count }),
    );
  };

  // Focus follows the action: the added row's key, the row after a removed one, or the moved row's button.
  useLayoutEffect(() => {
    const target = pendingFocus.current;
    if (!target) {
      return;
    }
    pendingFocus.current = null;
    const root = rootRef.current;
    if (target.kind === 'add') {
      root?.querySelector<HTMLElement>('[data-kv-add]')?.focus();
      return;
    }
    const row = root?.querySelector(`[data-row-id="${CSS.escape(target.id)}"]`);
    const selector =
      target.kind === 'key' ? '[data-kv-key] input' : `[data-move="${target.direction}"]`;
    row?.querySelector<HTMLElement>(selector)?.focus();
  }, [rows]);

  // Key, value, and the row's buttons.
  const columns = 'grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto]';
  const showAppError =
    isInvalid && errorMessage !== undefined && typeof errorMessage !== 'function';
  const describedBy =
    [description !== undefined ? descriptionId : undefined, showAppError ? errorsId : undefined]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <div
      ref={mergeRefs(ref, rootRef, layout.ref)}
      role="group"
      aria-labelledby={label !== undefined ? labelId : undefined}
      aria-label={label === undefined ? ariaLabel : undefined}
      aria-describedby={describedBy}
      className={cn('relative flex min-w-0 flex-col gap-3 text-sm text-fg', className)}
    >
      {label !== undefined && (
        <span id={labelId} className="font-medium">
          {label}
        </span>
      )}
      {description !== undefined && (
        <span id={descriptionId} className="-mt-2 text-xs text-fg-muted">
          {description}
        </span>
      )}
      {isWide && rows.length > 0 && (
        <div
          aria-hidden="true"
          className={cn('grid gap-3 px-1 text-xs font-medium text-fg-muted', columns)}
        >
          <span>{keyHeading}</span>
          <span>{valueHeading}</span>
        </div>
      )}
      {rows.length > 0 && (
        <ul className="flex flex-col gap-2">
          {rows.map((row, index) => {
            const key = row.key.trim();
            const rowName = key === '' ? messages.kvRow({ index: index + 1 }) : key;
            const { errors, isKeyInvalid } = rowIssues(row);
            const errorId = `${errorsId}-${String(index)}`;
            const isMasked = hasSecretToggle && row.isSecret === true;
            const errorProps = errors.length > 0 ? { 'aria-describedby': errorId } : {};
            const keyField = suggestionItems ? (
              <ComboBox
                {...fieldLabel(keyHeading)}
                {...errorProps}
                items={suggestionItems}
                allowsCustomValue
                inputValue={row.key}
                onInputChange={(text) => {
                  update(row.id, { key: text });
                }}
                isInvalid={isKeyInvalid}
                isDisabled={isDisabled}
                isReadOnly={isReadOnly}
              >
                {(item) => <Option id={item.id}>{item.id}</Option>}
              </ComboBox>
            ) : (
              <TextField
                {...fieldLabel(keyHeading)}
                {...errorProps}
                value={row.key}
                onChange={(text) => {
                  update(row.id, { key: text });
                }}
                autoComplete="off"
                isInvalid={isKeyInvalid}
                isDisabled={isDisabled}
                isReadOnly={isReadOnly}
              />
            );
            return (
              <li key={row.id} data-row-id={row.id}>
                <div
                  role="group"
                  aria-label={rowName}
                  aria-describedby={errors.length > 0 ? errorId : undefined}
                  className={cn(
                    'grid',
                    isWide
                      ? cn(columns, 'items-start gap-3 p-1')
                      : 'grid-cols-1 gap-2 rounded-card border border-border p-3',
                    !isWide && errors.length > 0 && 'border-danger-border',
                  )}
                >
                  {/* Pastes bubble here from the key's input. */}
                  <div
                    data-kv-key=""
                    className="min-w-0"
                    onPaste={(event) => {
                      if (!isLocked) {
                        pasteInto(index, event);
                      }
                    }}
                  >
                    {keyField}
                  </div>
                  {/* The masked value's show/hide buttons are named for this row. */}
                  <MessagesContext.Provider
                    value={{
                      ...providedMessages,
                      showPassword: messages.kvShowValue({ key: rowName }),
                      hidePassword: messages.kvHideValue({ key: rowName }),
                    }}
                  >
                    <TextField
                      {...fieldLabel(valueHeading)}
                      type={isMasked ? 'password' : 'text'}
                      value={row.value}
                      onChange={(text) => {
                        update(row.id, { value: text });
                      }}
                      autoComplete="off"
                      isDisabled={isDisabled}
                      isReadOnly={isReadOnly}
                    />
                  </MessagesContext.Provider>
                  {!isLocked && (
                    <div
                      className={cn(
                        'flex shrink-0 items-center gap-0.5',
                        // On cards, the buttons come last, after any errors.
                        isWide ? 'mt-0.5' : 'order-last justify-end',
                      )}
                    >
                      {hasSecretToggle && (
                        <IconButton
                          icon={Lock}
                          aria-label={messages.kvSecretToggle({ key: rowName })}
                          isSelected={row.isSecret === true}
                          onChange={(isSelected) => {
                            update(row.id, { isSecret: isSelected });
                          }}
                        />
                      )}
                      <IconButton
                        icon={ArrowUp}
                        aria-label={messages.moveUp({ item: rowName })}
                        data-move="up"
                        isDisabled={index === 0}
                        onPress={() => {
                          move(index, 'up', rowName);
                        }}
                      />
                      <IconButton
                        icon={ArrowDown}
                        aria-label={messages.moveDown({ item: rowName })}
                        data-move="down"
                        isDisabled={index === rows.length - 1}
                        onPress={() => {
                          move(index, 'down', rowName);
                        }}
                      />
                      <IconButton
                        icon={Trash2}
                        aria-label={
                          key === ''
                            ? messages.removeRow({ range: rowName })
                            : messages.kvRemove({ label: keyHeading, key })
                        }
                        onPress={() => {
                          remove(index, rowName);
                        }}
                      />
                    </div>
                  )}
                  {errors.length > 0 && (
                    <ul
                      id={errorId}
                      className="col-span-full flex flex-col text-xs font-medium text-danger-fg"
                    >
                      {errors.map((error, at) => (
                        <li key={at}>{error}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {!isReadOnly && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Button
            variant="outline"
            size="sm"
            icon={Plus}
            data-kv-add=""
            onPress={add}
            isDisabled={isDisabled || isFull}
          >
            {addLabel ?? messages.kvAdd}
          </Button>
          {maxRows !== undefined && (
            <span className="text-xs text-fg-muted">{messages.kvMaxRows({ max: maxRows })}</span>
          )}
        </div>
      )}
      {showAppError && (
        <p id={errorsId} className="text-xs font-medium text-danger-fg">
          {errorMessage}
        </p>
      )}
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}
