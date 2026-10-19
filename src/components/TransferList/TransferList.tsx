// TransferList: choose items by moving them between two lists, "available" and "chosen" (a dual list box). Each side
// has a select-all checkbox, a count and a search field over a virtualized ListView; buttons between them move the
// chosen rows or every shown row either way, and rows drag between the lists (and, with `isReorderable`, into order
// in the chosen list). The value is the chosen ids, in order.

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import {
  useDeferredValue,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react';
import { useDragAndDrop, useFilter, type DragAndDropHooks, type Key } from 'react-aria-components';
import { useEntryMessages } from '../../provider/context';
import { transferStrings } from '../../provider/coreStrings';
import { dropMove, moveIdsTo, type IdMove } from '../../utils/collections';
import { cn } from '../../utils/cn';
import type { IconComponent } from '../../utils/icon';
import { itemText } from '../../utils/text';
import { useControllableState } from '../../utils/useControllableState';
import { Checkbox } from '../Checkbox/Checkbox';
import { IconButton } from '../IconButton/IconButton';
import {
  ListView,
  droppedIds,
  renderListDropIndicator,
  type ListViewItem,
} from '../ListView/ListView';
import { LiveRegion, useAnnouncer } from '../LiveRegion/LiveRegion';
import { SearchField } from '../SearchField/SearchField';
import { Tooltip } from '../Tooltip/Tooltip';

export interface TransferListProps<I extends ListViewItem = ListViewItem> {
  /** Every item, on either side. The available list keeps this order. */
  items: readonly I[];
  /** The chosen items' ids, in order, controlled. */
  value?: readonly string[];
  /** The ids chosen at first (uncontrolled). */
  defaultValue?: readonly string[];
  onChange?: (value: string[]) => void;
  /** The visible label. Without one, pass `aria-label`. */
  label?: ReactNode;
  'aria-label'?: string;
  /** Help text under the label. */
  description?: ReactNode;
  /** The available list's title. Defaults to the `transferAvailable` message ("Available"). */
  availableLabel?: string;
  /** The chosen list's title. Defaults to the `transferChosen` message ("Chosen"). */
  chosenLabel?: string;
  /** Shows a search field over each list, filtering it by label, `textValue` and `keywords`. Defaults to true. */
  isSearchable?: boolean;
  /** Chosen items can be dragged into order. */
  isReorderable?: boolean;
  /** Each list's height, as a CSS length. Defaults to `18rem`. */
  listHeight?: string;
  /** Defaults to `compact`. */
  density?: 'compact' | 'regular';
  isDisabled?: boolean;
  className?: string;
  /** The root element. */
  ref?: Ref<HTMLDivElement>;
}

type Side = 'available' | 'chosen';

const other = (side: Side): Side => (side === 'available' ? 'chosen' : 'available');

/** An arrow that points from one list to the other: sideways (mirrored right to left), or down and up when stacked. */
function directed(Icon: IconComponent): IconComponent {
  function DirectedIcon({ className, ...props }: ComponentProps<IconComponent>) {
    return (
      <Icon
        {...props}
        className={cn(className, 'rtl:-scale-x-100 @max-xl:rotate-90 @max-xl:rtl:scale-x-100')}
      />
    );
  }
  return DirectedIcon;
}

const moveIcons = {
  chosen: { one: directed(ChevronRight), all: directed(ChevronsRight) },
  available: { one: directed(ChevronLeft), all: directed(ChevronsLeft) },
};

interface TransferDragOptions {
  side: Side;
  /** The drag type private to this TransferList, so its rows don't drop into another one. */
  dragType: string;
  isDisabled: boolean;
  textOf: (id: string) => string;
  /** Moves rows dropped here from the other side; `at` places them among the chosen list's rows. */
  onMove: (from: Side, ids: readonly string[], at?: Omit<IdMove, 'ids'>) => void;
  /** Reorders rows dropped within this side (the chosen list, when reorderable). */
  onReorder?: (move: IdMove) => void;
}

/**
 * Drag and drop for one side: its rows drag out, and rows from the other side drop in. React Aria offers only the
 * drops a handler takes, and tells drags within a list from drags between lists, so a side never takes its own rows
 * back unless it reorders. The available list takes drops on the list itself: its rows keep the items' order, so
 * there's no place between them to offer. The chosen list also takes drops between its rows.
 */
function useTransferDrag({
  side,
  dragType,
  isDisabled,
  textOf,
  onMove,
  onReorder,
}: TransferDragOptions): DragAndDropHooks {
  const from = other(side);
  return useDragAndDrop({
    isDisabled,
    getItems: (keys) =>
      [...keys].map((key) => ({ [dragType]: String(key), 'text/plain': textOf(String(key)) })),
    acceptedDragTypes: [dragType],
    getDropOperation: () => 'move',
    onRootDrop: (event) => {
      void droppedIds(event.items, dragType).then((ids) => {
        onMove(from, ids);
      });
    },
    onInsert:
      side === 'chosen'
        ? (event) => {
            const { targetId, position } = dropMove(event.target);
            void droppedIds(event.items, dragType).then((ids) => {
              onMove(from, ids, { targetId, position });
            });
          }
        : undefined,
    onReorder: onReorder
      ? (event) => {
          onReorder(dropMove(event.target, event.keys));
        }
      : undefined,
    renderDropIndicator: renderListDropIndicator,
  }).dragAndDropHooks;
}

/** A side's rows that can be chosen and moved (not disabled), and the selected ones among them. */
interface SideSummary {
  movableIds: string[];
  selectedIds: string[];
}

/** One pass over a side's shown rows. */
function summarize(shown: readonly ListViewItem[], selected: ReadonlySet<string>): SideSummary {
  const movableIds: string[] = [];
  const selectedIds: string[] = [];
  for (const item of shown) {
    if (item.isDisabled === true) {
      continue;
    }
    movableIds.push(item.id);
    if (selected.has(item.id)) {
      selectedIds.push(item.id);
    }
  }
  return { movableIds, selectedIds };
}

interface PaneProps<I extends ListViewItem> {
  side: Side;
  title: string;
  /** The items on this side, before the search. */
  items: readonly I[];
  search: string;
  onSearchChange: (search: string) => void;
  selected: ReadonlySet<string>;
  onSelectionChange: (keys: Set<string>) => void;
  hooks: DragAndDropHooks;
  isSearchable: boolean;
  listHeight: string;
  density: 'compact' | 'regular';
  isDisabled: boolean;
  listRef: RefObject<HTMLDivElement | null>;
  messages: typeof transferStrings;
  /** The items shown after the search. */
  shown: readonly I[];
  summary: SideSummary;
}

/** One side: title, select-all, count, search and list. */
function Pane<I extends ListViewItem>({
  side,
  title,
  items,
  search,
  onSearchChange,
  selected,
  onSelectionChange,
  hooks,
  isSearchable,
  listHeight,
  density,
  isDisabled,
  listRef,
  messages,
  shown,
  summary,
}: PaneProps<I>) {
  const titleId = useId();
  const { movableIds, selectedIds } = summary;
  const selectedCount = selectedIds.length;
  const isAll = movableIds.length > 0 && selectedCount === movableIds.length;
  return (
    <div
      data-side={side}
      className="flex min-w-0 flex-col gap-2 rounded-card border border-border bg-surface-1 p-2"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 ps-1">
        <Checkbox
          aria-label={messages.transferSelectAll({ list: title })}
          isSelected={isAll}
          isIndeterminate={selectedCount > 0 && !isAll}
          isDisabled={isDisabled || movableIds.length === 0}
          onChange={(isSelected) => {
            onSelectionChange(isSelected ? new Set(movableIds) : new Set());
          }}
        />
        <span id={titleId} className="min-w-0 flex-1 font-semibold break-words text-fg">
          {title}
        </span>
        <span className="text-xs text-fg-muted tabular-nums">
          {messages.transferSelectedCount({ count: selectedCount, total: items.length })}
        </span>
      </div>
      {isSearchable && (
        <SearchField
          aria-label={messages.transferSearch({ list: title })}
          size="sm"
          value={search}
          onChange={onSearchChange}
          isDisabled={isDisabled}
        />
      )}
      {/* eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the app's list height. */}
      <div ref={listRef} className="flex min-h-0 flex-col" style={{ height: listHeight }}>
        <ListView
          aria-labelledby={titleId}
          items={shown}
          selectionMode="multiple"
          selectedKeys={selected}
          onSelectionChange={onSelectionChange}
          dragAndDropHooks={hooks}
          isVirtualized
          // It fills the box above, and scrolls inside it.
          maxHeight={listHeight}
          density={density}
          isDisabled={isDisabled}
          className="min-h-0 flex-1"
        />
      </div>
    </div>
  );
}

/**
 * Two lists, available and chosen, with buttons to move the selected rows or every shown row either way, a search
 * field and select-all over each, and drag and drop between them. The value is the chosen ids, in order; `isReorderable`
 * lets users drag them into order. Both lists render only the rows in view, so thousands of items stay fast.
 */
export function TransferList<I extends ListViewItem = ListViewItem>({
  items,
  value,
  defaultValue,
  onChange,
  label,
  'aria-label': ariaLabel,
  description,
  availableLabel,
  chosenLabel,
  isSearchable = true,
  isReorderable = false,
  listHeight = '18rem',
  density = 'compact',
  isDisabled = false,
  className,
  ref,
}: TransferListProps<I>) {
  const messages = useEntryMessages(transferStrings);
  const labelId = useId();
  const descriptionId = useId();
  const dragType = `application/x-rux-transfer-${useId().replace(/[^\w-]/g, '')}`;
  const [chosenIds, setChosenIds] = useControllableState<readonly string[]>(
    value,
    defaultValue ?? [],
    onChange as ((next: readonly string[]) => void) | undefined,
  );
  const titles: Record<Side, string> = {
    available: availableLabel ?? messages.transferAvailable,
    chosen: chosenLabel ?? messages.transferChosen,
  };

  // The two sides: the available list keeps `items`' order, the chosen list the value's.
  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const sides = useMemo(() => {
    const chosenSet = new Set(chosenIds);
    return {
      available: items.filter((item) => !chosenSet.has(item.id)),
      chosen: chosenIds.flatMap((id) => {
        const item = byId.get(id);
        return item ? [item] : [];
      }),
    };
  }, [items, byId, chosenIds]);

  const [searches, setSearches] = useState<Record<Side, string>>({ available: '', chosen: '' });
  // Typing stays responsive while thousands of rows filter.
  const deferredSearches = useDeferredValue(searches);
  const { contains } = useFilter({ sensitivity: 'base' });
  const filter = (list: readonly I[], search: string) => {
    const query = search.trim();
    if (query === '') {
      return list;
    }
    return list.filter(
      (item) =>
        contains(itemText(item), query) ||
        (typeof item.description === 'string' && contains(item.description, query)) ||
        (item.keywords?.some((word) => contains(word, query)) ?? false),
    );
  };
  const shownAvailable = useMemo(
    () => filter(sides.available, deferredSearches.available),
    // `filter` only reads `contains`, which changes with the locale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sides.available, deferredSearches.available, contains],
  );
  const shownChosen = useMemo(
    () => filter(sides.chosen, deferredSearches.chosen),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sides.chosen, deferredSearches.chosen, contains],
  );
  const shown: Record<Side, readonly I[]> = { available: shownAvailable, chosen: shownChosen };

  const [selections, setSelections] = useState<Record<Side, ReadonlySet<string>>>({
    available: new Set(),
    chosen: new Set(),
  });
  // What each side can move, worked out once per change to its rows or selection, not on every render.
  const availableSummary = useMemo(
    () => summarize(shownAvailable, selections.available),
    [shownAvailable, selections.available],
  );
  const chosenSummary = useMemo(
    () => summarize(shownChosen, selections.chosen),
    [shownChosen, selections.chosen],
  );
  const summaries: Record<Side, SideSummary> = {
    available: availableSummary,
    chosen: chosenSummary,
  };
  const { ref: announcerRef, announce } = useAnnouncer();
  const listRefs: Record<Side, RefObject<HTMLDivElement | null>> = {
    available: useRef<HTMLDivElement>(null),
    chosen: useRef<HTMLDivElement>(null),
  };
  /** After a button move, the list to put focus in if the button pressed can no longer take it. */
  const pendingFocus = useRef<{ button: Element; side: Side } | null>(null);

  /** Moves `ids` from `from` to the other side; `at` places them in the chosen list (default: at its end). */
  const move = (
    from: Side,
    ids: readonly string[],
    at?: { targetId: string; position: 'before' | 'after' },
  ) => {
    const moving = new Set(ids);
    if (moving.size === 0) {
      return;
    }
    if (from === 'available') {
      const kept = chosenIds.filter((id) => !moving.has(id));
      const added = sides.available.filter((item) => moving.has(item.id)).map((item) => item.id);
      const appended = [...kept, ...added];
      setChosenIds(at ? moveIdsTo(appended, { ...at, ids: added }, (id) => id) : appended);
    } else {
      setChosenIds(chosenIds.filter((id) => !moving.has(id)));
    }
    setSelections((current) => ({
      ...current,
      [from]: new Set([...current[from]].filter((id) => !moving.has(id))),
    }));
    announce(messages.transferMoved({ count: moving.size, list: titles[other(from)] }));
  };

  // Focus stays in the component after a move: on the button, or in the source list once the button disables.
  useLayoutEffect(() => {
    const target = pendingFocus.current;
    if (!target) {
      return;
    }
    pendingFocus.current = null;
    if (target.button.matches(':disabled')) {
      listRefs[target.side].current?.querySelector<HTMLElement>('[role="grid"]')?.focus();
    }
  });

  // Drag and drop: rows drag to the other list (and within the chosen one when reorderable).
  const dragOptions = {
    dragType,
    isDisabled,
    textOf: (id: string) => {
      const item = byId.get(id);
      return item ? itemText(item) : id;
    },
    onMove: move,
  };
  const hooks: Record<Side, DragAndDropHooks> = {
    available: useTransferDrag({ ...dragOptions, side: 'available' }),
    chosen: useTransferDrag({
      ...dragOptions,
      side: 'chosen',
      onReorder: isReorderable
        ? (reorder) => {
            setChosenIds(moveIdsTo(chosenIds, reorder, (id) => id));
          }
        : undefined,
    }),
  };

  const moveButton = (from: Side, scope: 'one' | 'all') => {
    const to = other(from);
    const ids = scope === 'one' ? summaries[from].selectedIds : summaries[from].movableIds;
    const text =
      scope === 'one'
        ? messages.transferMove({ list: titles[to] })
        : messages.transferMoveAll({ list: titles[to] });
    return (
      <Tooltip content={text} placement="top">
        <IconButton
          icon={moveIcons[to][scope]}
          aria-label={text}
          variant="outline"
          size="sm"
          isDisabled={isDisabled || ids.length === 0}
          data-move={`${scope}-${to}`}
          onPress={(event) => {
            pendingFocus.current = { button: event.target, side: from };
            move(from, ids);
          }}
        />
      </Tooltip>
    );
  };

  const pane = (side: Side) => (
    <Pane<I>
      side={side}
      title={titles[side]}
      items={sides[side]}
      shown={shown[side]}
      summary={summaries[side]}
      search={searches[side]}
      onSearchChange={(search) => {
        setSearches((current) => ({ ...current, [side]: search }));
      }}
      selected={selections[side]}
      onSelectionChange={(keys: Set<Key>) => {
        setSelections((current) => ({ ...current, [side]: new Set([...keys].map(String)) }));
      }}
      hooks={hooks[side]}
      isSearchable={isSearchable}
      listHeight={listHeight}
      density={density}
      isDisabled={isDisabled}
      listRef={listRefs[side]}
      messages={messages}
    />
  );

  return (
    <div
      ref={ref}
      role="group"
      aria-labelledby={label !== undefined ? labelId : undefined}
      aria-label={label === undefined ? ariaLabel : undefined}
      aria-describedby={description !== undefined ? descriptionId : undefined}
      className={cn('@container flex min-w-0 flex-col gap-1.5 text-sm text-fg', className)}
    >
      {label !== undefined && (
        <span id={labelId} className="font-medium text-fg">
          {label}
        </span>
      )}
      {description !== undefined && (
        <span id={descriptionId} className="text-xs text-fg-muted">
          {description}
        </span>
      )}
      <div className="grid min-w-0 gap-2 @xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] @xl:gap-3">
        {pane('available')}
        <div className="flex items-center justify-center gap-1 @xl:flex-col">
          {moveButton('available', 'one')}
          {moveButton('available', 'all')}
          {moveButton('chosen', 'one')}
          {moveButton('chosen', 'all')}
        </div>
        {pane('chosen')}
      </div>
      <LiveRegion ref={announcerRef} />
    </div>
  );
}
