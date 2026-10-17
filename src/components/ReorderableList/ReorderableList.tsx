// ReorderableList: put items in order (a quiz's ordering question, a ranked list, a priority queue). Rows drag by
// their handle (mouse, touch, or React Aria's keyboard and screen reader drag and drop) and move with up and down
// buttons, which are the simplest path on touch screens and for switch users. Each move is announced; feedback marks
// rows after an answer is checked.

import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react';
import { useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type Ref } from 'react';
import {
  Button as AriaButton,
  DropIndicator,
  GridList,
  GridListItem,
  useDragAndDrop,
} from 'react-aria-components';
import { useMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import type { IconComponent } from '../../utils/icon';
import { useControllableState } from '../../utils/useControllableState';
import {
  OptionFeedbackContent,
  optionFeedbackClasses,
  type OptionFeedback,
} from '../Field/OptionFeedback';
import { IconButton } from '../IconButton/IconButton';

export interface ReorderableItem {
  id: string;
  /** The visible content. */
  label: ReactNode;
  /** Plain text for typeahead and announcements, when `label` isn't a string. */
  textValue?: string;
  description?: ReactNode;
  icon?: IconComponent;
  isDisabled?: boolean;
}

export interface ReorderableListProps {
  items: readonly ReorderableItem[];
  /** The order, as item ids, controlled. */
  value?: readonly string[];
  /** The initial order, uncontrolled. Defaults to the order of `items`. */
  defaultValue?: readonly string[];
  onChange?: (value: string[]) => void;
  /** The visible label. Without one, pass `aria-label`. */
  label?: ReactNode;
  'aria-label'?: string;
  /** Help text under the list. */
  description?: ReactNode;
  /** Shows each item's position ("1", "2", …) at the start of its row. Defaults to true. */
  hasPositionNumbers?: boolean;
  /** Per-item feedback after checking an answer, by item id. */
  feedback?: Readonly<Record<string, OptionFeedback>>;
  /** Hides the handles and move buttons, keeping the numbers: the order can't change. */
  isReadOnly?: boolean;
  isDisabled?: boolean;
  /** Defaults to `md`. */
  size?: 'sm' | 'md';
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

function textOf(item: ReorderableItem): string {
  return item.textValue ?? (typeof item.label === 'string' ? item.label : item.id);
}

const rowSizeClasses = {
  sm: 'min-h-hit gap-2 px-2 py-1 text-sm',
  md: 'min-h-12 gap-3 px-3 py-2 text-sm',
};

/** Items to put in order by dragging or with move buttons, each move announced. */
export function ReorderableList({
  items,
  value,
  defaultValue,
  onChange,
  label,
  'aria-label': ariaLabel,
  description,
  hasPositionNumbers = true,
  feedback,
  isReadOnly = false,
  isDisabled = false,
  size = 'md',
  className,
  ref,
}: ReorderableListProps) {
  const messages = useMessages();
  const labelId = useId();
  const descriptionId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const [order, setOrder] = useControllableState<readonly string[]>(
    value,
    defaultValue ?? items.map((item) => item.id),
    onChange as ((next: readonly string[]) => void) | undefined,
  );
  const [announcement, setAnnouncement] = useState('');
  /** After a button move, the button to put focus on (the other one, when the moved item reaches an end). */
  const pendingFocus = useRef<{ id: string; direction: 'up' | 'down' } | null>(null);

  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  // The order, keeping any items it doesn't list at the end.
  const ordered = useMemo(() => {
    const listed = order.flatMap((id) => {
      const item = byId.get(id);
      return item ? [item] : [];
    });
    const rest = items.filter((item) => !order.includes(item.id));
    return [...listed, ...rest];
  }, [order, byId, items]);
  const isLocked = isReadOnly || isDisabled;

  const commit = (next: ReorderableItem[], moved: ReorderableItem) => {
    setOrder(next.map((item) => item.id));
    setAnnouncement(
      messages.itemMovedTo({
        item: textOf(moved),
        position: next.indexOf(moved) + 1,
        total: next.length,
      }),
    );
  };

  const move = (item: ReorderableItem, direction: 'up' | 'down') => {
    const from = ordered.indexOf(item);
    const to = direction === 'up' ? from - 1 : from + 1;
    if (from < 0 || to < 0 || to >= ordered.length) {
      return;
    }
    const next = [...ordered];
    next.splice(from, 1);
    next.splice(to, 0, item);
    commit(next, item);
    const isAtEnd = direction === 'up' ? to === 0 : to === next.length - 1;
    pendingFocus.current = {
      id: item.id,
      direction: isAtEnd ? (direction === 'up' ? 'down' : 'up') : direction,
    };
  };

  // Focus follows the moved item: stay on its button, or the other one once it reaches an end.
  useLayoutEffect(() => {
    const target = pendingFocus.current;
    if (!target) {
      return;
    }
    pendingFocus.current = null;
    listRef.current
      ?.querySelector<HTMLElement>(
        `[data-item-id="${CSS.escape(target.id)}"] [data-move="${target.direction}"]`,
      )
      ?.focus();
  }, [order]);

  // GridList drops the aria-describedby it's given, so the description is linked on the element directly. This runs
  // after every render, since GridList re-renders the element's attributes.
  const hasDescription = description !== undefined;
  useLayoutEffect(() => {
    const grid = listRef.current;
    if (!grid) {
      return;
    }
    const ids = (grid.getAttribute('aria-describedby') ?? '').split(' ').filter((id) => id !== '');
    const others = ids.filter((id) => id !== descriptionId);
    const next = hasDescription ? [...others, descriptionId] : others;
    if (next.length > 0) {
      grid.setAttribute('aria-describedby', next.join(' '));
    } else {
      grid.removeAttribute('aria-describedby');
    }
  });

  const { dragAndDropHooks } = useDragAndDrop({
    isDisabled: isLocked,
    getItems: (keys) =>
      [...keys].map((key) => {
        const item = byId.get(String(key));
        return { 'text/plain': item ? textOf(item) : String(key) };
      }),
    onReorder: (event) => {
      const moving = ordered.filter((item) => event.keys.has(item.id));
      const remaining = ordered.filter((item) => !event.keys.has(item.id));
      const targetIndex = remaining.findIndex((item) => item.id === event.target.key);
      const insertAt = event.target.dropPosition === 'after' ? targetIndex + 1 : targetIndex;
      const next = [...remaining.slice(0, insertAt), ...moving, ...remaining.slice(insertAt)];
      const first = moving[0];
      if (first) {
        commit(next, first);
      }
    },
    renderDropIndicator: (target) => (
      <DropIndicator
        target={target}
        className="h-0.5 rounded-full data-drop-target:bg-accent-solid"
      />
    ),
  });

  return (
    <div ref={ref} className={cn('flex min-w-0 flex-col gap-1.5 text-sm text-fg', className)}>
      {label !== undefined && (
        <span id={labelId} className="font-medium text-fg">
          {label}
        </span>
      )}
      <GridList
        ref={listRef}
        aria-labelledby={label !== undefined ? labelId : undefined}
        aria-label={label === undefined ? ariaLabel : undefined}
        items={ordered}
        // Always passed: GridList calls its drag-and-drop hooks only when this is set, so switching it on and off while
        // mounted would change its hook order. `isDisabled` on useDragAndDrop locks dragging instead.
        dragAndDropHooks={dragAndDropHooks}
        disabledKeys={isDisabled ? ordered.map((item) => item.id) : undefined}
        // Rows render from the order and feedback, so re-render them when those change.
        dependencies={[ordered, feedback, isLocked, hasPositionNumbers]}
        className="flex min-w-0 flex-col gap-1.5 outline-none"
      >
        {(item) => {
          const index = ordered.indexOf(item);
          const itemFeedback = feedback?.[item.id];
          const text = textOf(item);
          const Icon = item.icon;
          return (
            <GridListItem
              id={item.id}
              textValue={text}
              isDisabled={item.isDisabled}
              data-item-id={item.id}
              className={cn(
                'group/row relative flex min-w-0 items-center rounded-control border border-border bg-surface-1 text-fg outline-none',
                'data-focus-visible:ring-2 data-focus-visible:ring-focus data-focus-visible:ring-inset',
                'data-dragging:opacity-50 data-disabled:opacity-50',
                rowSizeClasses[size],
                optionFeedbackClasses(itemFeedback),
                itemFeedback && size === 'md' && 'py-2',
              )}
            >
              {!isLocked && (
                <AriaButton
                  slot="drag"
                  aria-label={messages.dragItem({ item: text })}
                  className="hit-area -ms-1 inline-flex size-6 shrink-0 cursor-grab items-center justify-center rounded-control text-fg-muted outline-none data-focus-visible:focus-ring data-hovered:text-fg"
                >
                  <GripVertical aria-hidden="true" className="size-4" />
                </AriaButton>
              )}
              {hasPositionNumbers && (
                <span
                  aria-hidden="true"
                  className="w-5 shrink-0 text-end font-semibold text-fg-muted tabular-nums"
                >
                  {index + 1}
                </span>
              )}
              {Icon && <Icon aria-hidden="true" className="size-4 shrink-0 text-fg-muted" />}
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="min-w-0 break-words">{item.label}</span>
                {item.description !== undefined && (
                  <span className="text-xs text-fg-muted">{item.description}</span>
                )}
                {itemFeedback && (
                  <span className="text-xs">
                    <OptionFeedbackContent feedback={itemFeedback} />
                  </span>
                )}
              </span>
              {!isLocked && (
                <span className="flex shrink-0 gap-0.5">
                  <IconButton
                    icon={ArrowUp}
                    size="sm"
                    aria-label={messages.moveUp({ item: text })}
                    data-move="up"
                    isDisabled={index === 0 || item.isDisabled}
                    onPress={() => {
                      move(item, 'up');
                    }}
                  />
                  <IconButton
                    icon={ArrowDown}
                    size="sm"
                    aria-label={messages.moveDown({ item: text })}
                    data-move="down"
                    isDisabled={index === ordered.length - 1 || item.isDisabled}
                    onPress={() => {
                      move(item, 'down');
                    }}
                  />
                </span>
              )}
            </GridListItem>
          );
        }}
      </GridList>
      {description !== undefined && (
        <span id={descriptionId} className="text-xs text-fg-muted">
          {description}
        </span>
      )}
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}
