import { useField, useSelector } from '@tanstack/react-form';
import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from '../components/Button/Button';
import { IconButton } from '../components/IconButton/IconButton';

import { cn } from '../utils/cn';
import { FieldEntry, fieldGridClasses } from './FormFields';
import { spanClass } from './FieldSlot';
import { isInputField } from './fieldIndex';
import type { AnyInputFieldConfig } from './internalTypes';
import { getAt, normalizePath } from './paths';
import { useFormRuntime } from './runtime';
import { createFieldValidators } from './validation';
import { useFormMessages } from './messages';

let nextItemKey = 0;

/** A stable React key for an array item, kept through adds, removals and moves. */
function newItemKey(): string {
  nextItemKey += 1;
  return `item-${String(nextItemKey)}`;
}

function moveInList<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  const [moved] = next.splice(from, 1);
  if (moved !== undefined) {
    next.splice(to, 0, moved);
  }
  return next;
}

interface ArrayItemProps {
  field: AnyInputFieldConfig;
  itemPath: string;
  index: number;
  total: number;
  itemKey: string;
  isLocked: boolean;
  canRemove: boolean;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
}

function ArrayItem({
  field,
  itemPath,
  index,
  total,
  itemKey,
  isLocked,
  canRemove,
  onMove,
  onRemove,
}: ArrayItemProps) {
  const { form } = useFormRuntime();
  const messages = useFormMessages();
  const headingId = useId();
  const panelId = useId();
  const [isExpanded, setExpanded] = useState(true);
  const item = useSelector(form.store, (state) => {
    const values: unknown = state.values;
    return getAt(values, itemPath);
  });
  // Open a collapsed item that holds an invalid field after a submit attempt, so focus can reach it.
  const mustShowErrors = useSelector(
    form.store,
    (state) =>
      state.submissionAttempts > 0 &&
      Object.entries(state.fieldMeta).some(
        ([name, meta]) =>
          (name.startsWith(`${itemPath}.`) || name.startsWith(`${itemPath}[`)) &&
          (meta?.errors.length ?? 0) > 0,
      ),
  );
  const isOpen = !field.isCollapsible || isExpanded || mustShowErrors;
  const position = index + 1;
  const summary: ReactNode =
    field.itemLabel?.(item as never, index) ?? messages.itemNumber({ index: position });
  const columns = field.columns ?? 1;

  return (
    <li
      data-array-item={itemKey}
      aria-labelledby={headingId}
      className="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-surface-1 p-3"
    >
      <div className="flex min-w-0 items-center gap-1">
        {field.isCollapsible === true && (
          <IconButton
            icon={ChevronDown}
            aria-label={messages.itemNumber({ index: position })}
            aria-expanded={isOpen}
            aria-controls={panelId}
            variant="ghost"
            size="sm"
            className={cn('transition-transform', !isOpen && '-rotate-90 rtl:rotate-90')}
            onPress={() => {
              setExpanded(!isOpen);
            }}
          />
        )}
        <h4 id={headingId} className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">
          {summary}
        </h4>
        <IconButton
          icon={ArrowUp}
          aria-label={messages.moveItemUp({ index: position })}
          variant="ghost"
          size="sm"
          data-action="move-up"
          isDisabled={isLocked || index === 0}
          onPress={() => {
            onMove(index, index - 1);
          }}
        />
        <IconButton
          icon={ArrowDown}
          aria-label={messages.moveItemDown({ index: position })}
          variant="ghost"
          size="sm"
          data-action="move-down"
          isDisabled={isLocked || index === total - 1}
          onPress={() => {
            onMove(index, index + 1);
          }}
        />
        <IconButton
          icon={Trash2}
          aria-label={messages.removeItem({ index: position })}
          variant="ghost"
          tone="danger"
          size="sm"
          isDisabled={isLocked || !canRemove}
          onPress={() => {
            onRemove(index);
          }}
        />
      </div>
      {/* Collapsed items stay mounted (hidden), so their fields keep validating. */}
      <div id={panelId} hidden={!isOpen} className={fieldGridClasses(columns)}>
        {(field.fields ?? []).map((child) => (
          <FieldEntry
            key={isInputField(child) ? normalizePath(child.name) : child.id}
            field={child}
            scopePath={itemPath}
            columns={columns}
          />
        ))}
      </div>
    </li>
  );
}

export interface ArrayFieldProps {
  field: AnyInputFieldConfig;
  path: string;
  columns: number;
}

/** A repeating group of fields over an array value, with keyboard-operable add, remove and reorder. */
export function ArrayField({ field, path, columns }: ArrayFieldProps) {
  const { form, status } = useFormRuntime();
  const messages = useFormMessages();
  const labelId = useId();
  const descriptionId = useId();
  const errorId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);

  const validators = useMemo(
    () =>
      createFieldValidators(
        field,
        () => form.state.values as unknown,
        () => messages,
      ),
    [field, form, messages],
  );
  const api = useField({ form, name: path, mode: 'array', validators });
  const value: unknown = api.state.value;
  const items: readonly unknown[] = Array.isArray(value) ? value : [];
  const hasAttemptedSubmit = useSelector(form.store, (state) => state.submissionAttempts > 0);
  const isDisabledByValues = useSelector(form.store, (state) => {
    const values: unknown = state.values;
    return field.isDisabled === true || (field.disabledWhen?.(values as never) ?? false);
  });

  // Keys follow the items through moves and removals; a length change from elsewhere (a reset) resyncs them.
  const [keys, setKeys] = useState<string[]>(() => items.map(() => newItemKey()));
  if (keys.length !== items.length) {
    setKeys(
      keys.length < items.length
        ? [...keys, ...items.slice(keys.length).map(() => newItemKey())]
        : keys.slice(0, items.length),
    );
  }

  const [announcement, setAnnouncement] = useState('');
  // Where focus goes after an add, removal or move; applied once the list has re-rendered.
  const focusTarget = useRef<{ key: string; selector: string } | null>(null);
  useEffect(() => {
    const target = focusTarget.current;
    if (!target) {
      return;
    }
    focusTarget.current = null;
    const item = listRef.current?.querySelector(`[data-array-item="${target.key}"]`);
    const element =
      item?.querySelector<HTMLElement>(target.selector) ??
      item?.querySelector<HTMLElement>('input, textarea, button:not([disabled])');
    (element ?? addRef.current)?.focus();
  });

  const isLocked = isDisabledByValues || status === 'submitting';
  const minItems = field.minItems ?? 0;
  const canAdd = !isLocked && (field.maxItems === undefined || items.length < field.maxItems);
  const canRemove = items.length > minItems;

  const add = () => {
    const key = newItemKey();
    setKeys([...keys, key]);
    const item =
      typeof field.newItem === 'function' ? (field.newItem as () => unknown)() : field.newItem;
    api.pushValue(item);
    focusTarget.current = { key, selector: 'input, textarea, [role="combobox"]' };
  };

  const remove = (index: number) => {
    const nextKey = keys[index + 1] ?? keys[index - 1];
    setKeys(keys.filter((_, position) => position !== index));
    api.removeValue(index);
    if (nextKey === undefined) {
      addRef.current?.focus();
    } else {
      focusTarget.current = { key: nextKey, selector: 'button[aria-label]:not([disabled])' };
    }
  };

  const move = (from: number, to: number) => {
    const key = keys[from];
    if (key === undefined || to < 0 || to >= items.length) {
      return;
    }
    setKeys(moveInList(keys, from, to));
    api.moveValue(from, to);
    setAnnouncement(messages.itemMoved({ index: to + 1, total: items.length }));
    // Keep focus on the moved item's control, or its opposite once it reaches an end.
    const isUp = to < from;
    const atEnd = isUp ? to === 0 : to === items.length - 1;
    focusTarget.current = {
      key,
      selector: `[data-action="${isUp !== atEnd ? 'move-up' : 'move-down'}"]`,
    };
  };

  const errors = hasAttemptedSubmit
    ? (api.state.meta.errors as unknown[]).filter(
        (error): error is string => typeof error === 'string' && error !== '',
      )
    : [];

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      aria-describedby={
        [field.description === undefined ? '' : descriptionId, errors.length > 0 ? errorId : '']
          .filter(Boolean)
          .join(' ') || undefined
      }
      data-form-field={path}
      data-invalid={errors.length > 0 || undefined}
      className={cn(
        'flex min-w-0 flex-col gap-3 text-sm',
        spanClass(field.colSpan ?? 'full', columns),
      )}
    >
      <div className="flex flex-col gap-1">
        <span id={labelId} className="font-medium text-fg">
          {field.label}
        </span>
        {field.description !== undefined && (
          <span id={descriptionId} className="text-fg-muted">
            {field.description}
          </span>
        )}
      </div>
      {items.length > 0 && (
        <ul ref={listRef} className="flex flex-col gap-3">
          {items.map((_, index) => {
            const key = keys[index] ?? String(index);
            return (
              <ArrayItem
                key={key}
                itemKey={key}
                field={field}
                itemPath={`${path}[${String(index)}]`}
                index={index}
                total={items.length}
                isLocked={isLocked}
                canRemove={canRemove}
                onMove={move}
                onRemove={remove}
              />
            );
          })}
        </ul>
      )}
      <div>
        <Button
          ref={addRef}
          variant="outline"
          size="sm"
          icon={Plus}
          isDisabled={!canAdd}
          onPress={add}
        >
          {field.addLabel ?? messages.addItem}
        </Button>
      </div>
      {errors.length > 0 && (
        <p id={errorId} className="text-xs font-medium text-danger-fg">
          {errors[0]}
        </p>
      )}
      <div role="status" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
