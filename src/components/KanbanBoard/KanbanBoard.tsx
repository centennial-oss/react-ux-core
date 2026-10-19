// KanbanBoard: columns (statuses) of cards, each column a ListView of cards. Cards drag within and between columns by
// mouse, touch and React Aria's keyboard and screen reader drag and drop, or move from their actions menu's "Move to"
// items; the app applies each move (`onMove`; `moveKanbanItems` does it for a flat list) and screen readers hear it.
// Column headings show a count against an optional work-in-progress limit and collapse the column to a strip; lanes
// split the board into rows (by assignee or priority); selected cards move together from an ActionBar. Columns scroll
// sideways when they don't fit, and long columns can render only the cards in view.

import { FoldHorizontal, Plus, UnfoldHorizontal } from 'lucide-react';
import { memo, useEffect, useId, useMemo, useRef, useState, type ReactNode, type Ref } from 'react';
import { useDragAndDrop, type Key } from 'react-aria-components';
import { useEntryMessages } from '../../provider/context';
import { kanbanStrings } from '../../provider/coreStrings';
import { dropMove, toggleInSet } from '../../utils/collections';
import { cn } from '../../utils/cn';
import { itemText } from '../../utils/text';
import type { HeadingLevel } from '../../utils/types';
import { useControllableState } from '../../utils/useControllableState';
import { useLatest } from '../../utils/useLatest';
import { ActionBar } from '../ActionBar/ActionBar';
import { Badge } from '../Badge/Badge';
import { Button } from '../Button/Button';
import { IconButton } from '../IconButton/IconButton';
import { ListView, droppedIds, renderListDropIndicator } from '../ListView/ListView';
import { LiveRegion, useAnnouncer } from '../LiveRegion/LiveRegion';
import { MenuItem, MenuSection, MenuSeparator } from '../Menu/Menu';
import { MenuButton } from '../Menu/MenuButtons';
import {
  cardsIn,
  cellKey,
  groupCards,
  type CardGroups,
  type KanbanColumn,
  type KanbanItem,
  type KanbanLane,
  type KanbanMove,
} from './kanbanItems';

export interface KanbanBoardProps<I extends KanbanItem = KanbanItem> {
  /** The columns, in order. */
  columns: readonly KanbanColumn[];
  /** Every card, controlled. Each column (and lane) lists its cards in this order. */
  items: readonly I[];
  /** Splits the board into rows: each card goes in the lane its `laneId` names. */
  lanes?: readonly KanbanLane[];
  /** Names the board. Pass this or `aria-labelledby`. */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  /**
   * Called when cards are dragged or moved from a menu, with where they go. The board doesn't change its own `items`:
   * apply the move (`moveKanbanItems` does it for a flat list). Without it, cards can't move.
   */
  onMove?: (move: KanbanMove) => void;
  /**
   * Draws a card's content: its title, assignee Avatar, Badges, due date. Defaults to the item's avatar or icon,
   * label, description and meta. Keep it stable (a module-level function, or `useCallback`) on large boards.
   */
  renderItem?: (item: I) => ReactNode;
  /** Controls at the end of a card, such as an `IconButton`. */
  renderActions?: (item: I) => ReactNode;
  /** Menu items (`MenuItem`) for a card's actions menu, above its "Move to" items. */
  rowActions?: (item: I) => ReactNode;
  /** Called with a `rowActions` item's key and the card. */
  onRowAction?: (key: Key, item: I) => void;
  /** Called when a card is activated: pressed, or Enter (open its details). */
  onAction?: (id: string) => void;
  /** `single` / `multiple` show a checkbox on every card, and an ActionBar while any are chosen. Defaults to `none`. */
  selectionMode?: 'none' | 'single' | 'multiple';
  /** The chosen cards' ids, controlled. */
  selectedKeys?: ReadonlySet<string>;
  /** The cards chosen at first (uncontrolled). */
  defaultSelectedKeys?: ReadonlySet<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  /** Controls for the chosen cards, in the ActionBar after its "Move to" menu. */
  bulkActions?: (selectedKeys: ReadonlySet<string>) => ReactNode;
  /** The open columns' ids, controlled. Collapsed columns show as a narrow strip. */
  expandedIds?: Iterable<string>;
  /** The columns open at first (uncontrolled). Defaults to all of them; columns added later start open. */
  defaultExpandedIds?: Iterable<string>;
  /** Called with the new set of open columns when one collapses or expands. */
  onExpandedChange?: (ids: Set<string>) => void;
  /** Shows an add button under each column (in each lane) and is called with where the new card goes. */
  onAdd?: (draft: { columnId: string; laneId?: string }) => void;
  /** The add button's text. Defaults to the `kanbanAddCard` message ("Add card"). */
  addLabel?: string;
  /** Renders only the cards in view in each column, for boards of thousands of cards. */
  isVirtualized?: boolean;
  /** How tall each column's list of cards grows before it scrolls inside, as a CSS length. Defaults to `32rem`. */
  maxHeight?: string;
  /** `compact` cards suit dense boards. Defaults to `regular`. */
  density?: 'compact' | 'regular';
  /** The cards are loading: columns show placeholders instead of their empty state. */
  isLoading?: boolean;
  /** Shown in a column (or lane) with no cards. Defaults to the `kanbanEmpty` message ("No cards"). */
  emptyState?: ReactNode;
  /** The column and lane headings' level. Defaults to 3. */
  headingLevel?: HeadingLevel;
  isDisabled?: boolean;
  className?: string;
  /** The root element. */
  ref?: Ref<HTMLDivElement>;
}

type Messages = typeof kanbanStrings;

const EMPTY_KEYS: ReadonlySet<string> = new Set();
// Keys of the "Move to" menu items, apart from the app's own.
const MOVE_TO_COLUMN = 'rux-kanban-column:';
const MOVE_TO_LANE = 'rux-kanban-lane:';

// A column is 18rem, or narrower than the board so the next one peeks in (and the board scrolls sideways to it).
const columnWidthClasses = 'w-[min(18rem,calc(100cqw-3rem))] shrink-0';
const collapsedWidthClasses = 'w-11 shrink-0';
const columnFrameClasses = 'rounded-card border border-border bg-surface-1';

/** The count, against the work-in-progress limit if there is one: shown short, read in full. */
function CountBadge({
  count,
  limit,
  messages,
}: {
  count: number;
  limit?: number;
  messages: Messages;
}) {
  if (limit === undefined) {
    return (
      <Badge>
        <span aria-hidden="true">{count}</span>
        <span className="sr-only">{messages.kanbanCount({ count })}</span>
      </Badge>
    );
  }
  const isOver = count > limit;
  return (
    <Badge tone={isOver ? 'danger' : count === limit ? 'warning' : 'neutral'}>
      <span aria-hidden="true">{messages.kanbanLimitShort({ count, limit })}</span>
      <span className="sr-only">
        {isOver
          ? messages.kanbanOverLimit({ count, limit })
          : messages.kanbanLimit({ count, limit })}
      </span>
    </Badge>
  );
}

interface ColumnHeadProps {
  column: KanbanColumn;
  count: number;
  titleId: string;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  headingLevel: HeadingLevel;
  messages: Messages;
}

/** A column's heading, count and collapse button; collapsed, a narrow strip with the title written downwards. */
function ColumnHead({
  column,
  count,
  titleId,
  isExpanded,
  onToggle,
  headingLevel,
  messages,
}: ColumnHeadProps) {
  const Heading = `h${headingLevel}` as const;
  const toggle = (
    <IconButton
      icon={isExpanded ? FoldHorizontal : UnfoldHorizontal}
      size="sm"
      aria-label={
        isExpanded
          ? messages.kanbanCollapse({ column: column.title })
          : messages.kanbanExpand({ column: column.title })
      }
      aria-expanded={isExpanded}
      onPress={() => {
        onToggle(column.id);
      }}
    />
  );
  const title = (
    <Heading
      className={cn(
        'min-w-0 text-sm font-semibold break-words text-fg',
        isExpanded ? 'flex-1' : '[writing-mode:vertical-rl]',
      )}
    >
      <span id={titleId}>{column.title}</span>
    </Heading>
  );
  const badge = <CountBadge count={count} limit={column.limit} messages={messages} />;
  return isExpanded ? (
    <div className="flex min-w-0 items-center gap-2 ps-1">
      {title}
      {badge}
      {toggle}
    </div>
  ) : (
    <div className="flex flex-col items-center gap-2">
      {toggle}
      {badge}
      {title}
    </div>
  );
}

/** What every list of cards shares, kept in one object so a list renders again only when its own cards change. */
interface SharedListProps<I extends KanbanItem> {
  selectionMode: 'none' | 'single' | 'multiple';
  renderItem?: (item: I) => ReactNode;
  renderActions?: (item: I) => ReactNode;
  rowActions?: (item: I) => ReactNode;
  onRowAction: (key: Key, item: I) => void;
  onAction?: (id: string) => void;
  onCellSelection: (keys: Set<string>, columnId: string, laneId?: string) => void;
  onAdd?: (columnId: string, laneId?: string) => void;
  addLabel: string;
  canMove: boolean;
  requestMove: (move: KanbanMove) => void;
  textOf: (id: string) => string;
  /** The drag type private to this board, so its cards don't drop into another one. */
  dragType: string;
  isVirtualized: boolean;
  maxHeight: string;
  density: 'compact' | 'regular';
  isLoading: boolean;
  emptyState: ReactNode;
  isDisabled: boolean;
}

interface CardListProps<I extends KanbanItem> {
  columnId: string;
  laneId?: string;
  cards: readonly I[];
  /** The chosen cards among these. */
  selected: ReadonlySet<string>;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  shared: SharedListProps<I>;
}

/** One column's cards (in one lane): a ListView of cards that takes drops from the board's other lists. */
function CardListInner<I extends KanbanItem>({
  columnId,
  laneId,
  cards,
  selected,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  shared,
}: CardListProps<I>) {
  const { dragType, canMove, requestMove, textOf, onCellSelection, onAdd } = shared;
  const moveHere = (move: Omit<KanbanMove, 'columnId' | 'laneId'>) => {
    requestMove(laneId === undefined ? { ...move, columnId } : { ...move, columnId, laneId });
  };
  // React Aria builds the hooks from these options on every render, so the handlers see the current props. It calls
  // onReorder for drops from this list and onInsert for drops from another, between cards; onRootDrop for drops on
  // the list itself (an empty column).
  const { dragAndDropHooks } = useDragAndDrop({
    isDisabled: !canMove,
    getItems: (keys) =>
      [...keys].map((key) => ({ [dragType]: String(key), 'text/plain': textOf(String(key)) })),
    acceptedDragTypes: [dragType],
    getDropOperation: () => 'move',
    onReorder: (event) => {
      moveHere(dropMove(event.target, event.keys));
    },
    onInsert: (event) => {
      const { targetId, position } = dropMove(event.target);
      void droppedIds(event.items, dragType).then((ids) => {
        moveHere({ ids, targetId, position });
      });
    },
    onRootDrop: (event) => {
      void droppedIds(event.items, dragType).then((ids) => {
        moveHere({ ids });
      });
    },
    renderDropIndicator: renderListDropIndicator,
  });
  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-1">
      <ListView<I>
        variant="cards"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        items={cards}
        selectionMode={shared.selectionMode}
        selectedKeys={selected}
        onSelectionChange={(keys) => {
          onCellSelection(keys, columnId, laneId);
        }}
        onAction={shared.onAction}
        renderItem={shared.renderItem}
        renderActions={shared.renderActions}
        rowActions={shared.rowActions}
        onRowAction={shared.onRowAction}
        dragAndDropHooks={canMove ? dragAndDropHooks : undefined}
        isVirtualized={shared.isVirtualized}
        maxHeight={shared.maxHeight}
        density={shared.density}
        isLoading={shared.isLoading}
        emptyState={shared.emptyState}
        isDisabled={shared.isDisabled}
      />
      {onAdd && (
        <Button
          variant="ghost"
          size="sm"
          icon={Plus}
          isDisabled={shared.isDisabled}
          onPress={() => {
            onAdd(columnId, laneId);
          }}
          className="justify-start text-fg-muted"
        >
          {shared.addLabel}
        </Button>
      )}
    </div>
  );
}

// A list renders again only when its cards, its selection or the shared settings change.
const CardList = memo(CardListInner) as typeof CardListInner;

/** The menu items that move a card to another column (and lane): its actions menu's, after the app's own. */
function moveSections(
  item: KanbanItem,
  columns: readonly KanbanColumn[],
  lanes: readonly KanbanLane[] | undefined,
  messages: Messages,
) {
  const toColumns = columns.filter((column) => column.id !== item.columnId);
  const toLanes = lanes?.filter((lane) => lane.id !== item.laneId) ?? [];
  return (
    <>
      {toColumns.length > 0 && (
        <MenuSection title={messages.kanbanMoveTo}>
          {toColumns.map((column) => (
            <MenuItem key={column.id} id={MOVE_TO_COLUMN + column.id}>
              {column.title}
            </MenuItem>
          ))}
        </MenuSection>
      )}
      {toLanes.length > 0 && (
        <MenuSection title={messages.kanbanMoveToLane}>
          {toLanes.map((lane) => (
            <MenuItem key={lane.id} id={MOVE_TO_LANE + lane.id}>
              {lane.title}
            </MenuItem>
          ))}
        </MenuSection>
      )}
    </>
  );
}

/** The card with this id, through the index `groupCards` made. */
function itemAt<I extends KanbanItem>(
  items: readonly I[],
  groups: CardGroups<I>,
  id: string,
): I | undefined {
  const index = groups.indexById.get(id);
  return index === undefined ? undefined : items[index];
}

/** The cards grouped into their lists, worked out once per `items` and keeping the lists a move didn't change. */
function useCardGroups<I extends KanbanItem>(items: readonly I[], hasLanes: boolean) {
  const [grouped, setGrouped] = useState(() => ({
    items,
    hasLanes,
    groups: groupCards(items, hasLanes),
  }));
  if (grouped.items === items && grouped.hasLanes === hasLanes) {
    return grouped.groups;
  }
  const groups = groupCards(items, hasLanes, grouped.groups);
  setGrouped({ items, hasLanes, groups });
  return groups;
}

/**
 * A board of columns holding cards, for tasks moving through statuses. Cards drag within and between columns (mouse,
 * touch, keyboard and screen reader drag and drop) or move from their actions menu, and the app applies each move from
 * `onMove`. Columns show their count against a work-in-progress limit and collapse; `lanes` splits the board into rows;
 * chosen cards move together from an ActionBar. `isVirtualized` keeps boards of thousands of cards fast.
 */
export function KanbanBoard<I extends KanbanItem = KanbanItem>({
  columns,
  items,
  lanes,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  onMove,
  renderItem,
  renderActions,
  rowActions,
  onRowAction,
  onAction,
  selectionMode = 'none',
  selectedKeys,
  defaultSelectedKeys,
  onSelectionChange,
  bulkActions,
  expandedIds,
  defaultExpandedIds,
  onExpandedChange,
  onAdd,
  addLabel,
  isVirtualized = false,
  maxHeight = '32rem',
  density = 'regular',
  isLoading = false,
  emptyState,
  headingLevel = 3,
  isDisabled = false,
  className,
  ref,
}: KanbanBoardProps<I>) {
  const messages = useEntryMessages(kanbanStrings);
  const baseId = useId();
  const dragType = `application/x-rux-kanban-${baseId.replace(/[^\w-]/g, '')}`;
  const groups = useCardGroups(items, lanes !== undefined);
  const canMove = onMove !== undefined && !isDisabled;

  const [selected, setSelected] = useControllableState<ReadonlySet<string>>(
    selectedKeys,
    defaultSelectedKeys ?? EMPTY_KEYS,
    onSelectionChange as ((keys: ReadonlySet<string>) => void) | undefined,
  );

  // Collapsed columns. Uncontrolled, the board keeps the collapsed ones, so a column added later starts open.
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => {
    if (defaultExpandedIds === undefined) {
      return EMPTY_KEYS;
    }
    const open = new Set(defaultExpandedIds);
    return new Set(columns.flatMap((column) => (open.has(column.id) ? [] : [column.id])));
  });
  const controlledExpanded = useMemo(
    () => (expandedIds === undefined ? undefined : new Set(expandedIds)),
    [expandedIds],
  );
  const isExpanded = (id: string) =>
    controlledExpanded ? controlledExpanded.has(id) : !collapsed.has(id);

  const { ref: announcerRef, announce } = useAnnouncer();
  const boardRef = useRef<HTMLDivElement>(null);
  /** A card moved from its menu, to focus where it lands. */
  const pendingFocus = useRef<string | null>(null);

  // Handlers read the current props through this, so they keep their identity and the lists don't render again.
  const latest = useLatest({
    items,
    groups,
    columns,
    lanes,
    selected,
    setSelected,
    selectionMode,
    onMove,
    onRowAction,
    onAdd,
    messages,
    collapsed,
    controlledExpanded,
    onExpandedChange,
    announce,
  });

  const handlers = useMemo(() => {
    const itemOf = (id: string) => {
      const { items: current, groups: currentGroups } = latest.current;
      return itemAt(current, currentGroups, id);
    };
    const textOf = (id: string) => {
      const item = itemOf(id);
      return item ? itemText(item) : id;
    };

    const requestMove = (move: KanbanMove) => {
      const {
        groups: current,
        onMove: apply,
        columns: all,
        lanes: rows,
        messages: strings,
      } = latest.current;
      // The moved cards in board order, whatever order they were chosen or dragged in.
      const ids = [...new Set(move.ids)]
        .filter((id) => current.indexById.has(id))
        .sort((a, b) => (current.indexById.get(a) ?? 0) - (current.indexById.get(b) ?? 0));
      const [first] = ids;
      if (!apply || first === undefined) {
        return;
      }
      apply({ ...move, ids });
      const column =
        all.find((candidate) => candidate.id === move.columnId)?.title ?? move.columnId;
      const lane =
        move.laneId === undefined
          ? undefined
          : rows?.find((candidate) => candidate.id === move.laneId)?.title;
      latest.current.announce(
        strings.kanbanMoved({
          count: ids.length,
          item: textOf(first),
          column: lane === undefined ? column : strings.kanbanCell({ column, lane }),
        }),
      );
    };

    const onRowAction = (key: Key, item: I) => {
      const id = String(key);
      if (id.startsWith(MOVE_TO_COLUMN)) {
        pendingFocus.current = item.id;
        requestMove({ ids: [item.id], columnId: id.slice(MOVE_TO_COLUMN.length) });
      } else if (id.startsWith(MOVE_TO_LANE)) {
        pendingFocus.current = item.id;
        requestMove({
          ids: [item.id],
          columnId: item.columnId,
          laneId: id.slice(MOVE_TO_LANE.length),
        });
      } else {
        latest.current.onRowAction?.(key, item);
      }
    };

    const onCellSelection = (keys: Set<string>, columnId: string, laneId?: string) => {
      const { selected: current, setSelected: set, selectionMode: mode } = latest.current;
      if (mode === 'single' && keys.size > 0) {
        set(keys);
        return;
      }
      // A list reports only its own cards: keep the other lists' choices.
      const next = new Set(keys);
      for (const id of current) {
        const item = itemOf(id);
        if (item?.columnId !== columnId || (laneId !== undefined && item.laneId !== laneId)) {
          next.add(id);
        }
      }
      set(next);
    };

    const onAddCard = (columnId: string, laneId?: string) => {
      latest.current.onAdd?.(laneId === undefined ? { columnId } : { columnId, laneId });
    };

    const toggleColumn = (id: string) => {
      const {
        columns: all,
        collapsed: shut,
        controlledExpanded: open,
        onExpandedChange: report,
      } = latest.current;
      const isOpen = (columnId: string) => (open ? open.has(columnId) : !shut.has(columnId));
      const wasOpen = isOpen(id);
      if (!open) {
        setCollapsed(toggleInSet(shut, id, wasOpen));
      }
      report?.(
        new Set(
          all.flatMap((column) =>
            (column.id === id ? !wasOpen : isOpen(column.id)) ? [column.id] : [],
          ),
        ),
      );
    };

    return { textOf, requestMove, onRowAction, onCellSelection, onAddCard, toggleColumn };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- latest is a ref (useLatest), the same every render.
  }, []);
  const { requestMove, toggleColumn } = handlers;

  // After a move from a card's menu, focus follows the card to its new list (the menu's trigger went with it). On
  // the next frame: the list it left moves focus to a neighbour first, as it does when a focused row goes.
  useEffect(() => {
    const id = pendingFocus.current;
    if (id === null) {
      return;
    }
    pendingFocus.current = null;
    const frame = requestAnimationFrame(() => {
      boardRef.current
        ?.querySelector<HTMLElement>(`[role="row"][data-key="${CSS.escape(id)}"]`)
        ?.focus();
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [groups]);

  // The card actions menu: the app's items, then "Move to" its other columns and lanes.
  const cardActions = useMemo(() => {
    if (!canMove) {
      return rowActions;
    }
    return (item: I) => (
      <>
        {rowActions && (
          <>
            {rowActions(item)}
            <MenuSeparator />
          </>
        )}
        {moveSections(item, columns, lanes, messages)}
      </>
    );
  }, [canMove, rowActions, columns, lanes, messages]);

  const shared = useMemo<SharedListProps<I>>(
    () => ({
      selectionMode,
      renderItem,
      renderActions,
      rowActions: cardActions,
      onRowAction: handlers.onRowAction,
      onAction,
      onCellSelection: handlers.onCellSelection,
      onAdd: onAdd ? handlers.onAddCard : undefined,
      addLabel: addLabel ?? messages.kanbanAddCard,
      canMove,
      requestMove: handlers.requestMove,
      textOf: handlers.textOf,
      dragType,
      isVirtualized,
      maxHeight,
      density,
      isLoading,
      emptyState: emptyState ?? (
        <p className="px-2 py-3 text-center text-xs text-fg-muted">{messages.kanbanEmpty}</p>
      ),
      isDisabled,
    }),
    [
      selectionMode,
      renderItem,
      renderActions,
      cardActions,
      handlers,
      onAction,
      onAdd,
      addLabel,
      messages,
      canMove,
      dragType,
      isVirtualized,
      maxHeight,
      density,
      isLoading,
      emptyState,
      isDisabled,
    ],
  );

  // Each list's chosen cards, in one pass over the selection. Lists with none share one empty set.
  const selectedByCell = useMemo(() => {
    const byCell = new Map<string, Set<string>>();
    let count = 0;
    for (const id of selected) {
      const item = itemAt(items, groups, id);
      if (!item) {
        continue;
      }
      count += 1;
      const key = cellKey(item.columnId, lanes === undefined ? undefined : item.laneId);
      const set = byCell.get(key);
      if (set) {
        set.add(id);
      } else {
        byCell.set(key, new Set([id]));
      }
    }
    return { byCell, count };
  }, [selected, groups, items, lanes]);
  const selectedIn = (columnId: string, laneId?: string): ReadonlySet<string> =>
    selectedByCell.byCell.get(cellKey(columnId, laneId)) ?? EMPTY_KEYS;

  const Heading = `h${headingLevel}` as const;
  const titleId = (index: number) => `${baseId}-column-${String(index)}`;

  const head = (column: KanbanColumn, index: number, count: number) => (
    <ColumnHead
      column={column}
      count={count}
      titleId={titleId(index)}
      isExpanded={isExpanded(column.id)}
      onToggle={toggleColumn}
      headingLevel={headingLevel}
      messages={messages}
    />
  );

  const columnCount = (column: KanbanColumn) =>
    lanes === undefined
      ? cardsIn(groups, column.id).length
      : lanes.reduce((sum, lane) => sum + cardsIn(groups, column.id, lane.id).length, 0);

  const board =
    lanes === undefined ? (
      columns.map((column, index) => {
        const isOpen = isExpanded(column.id);
        const cards = cardsIn(groups, column.id);
        return (
          <div
            key={column.id}
            role="group"
            aria-labelledby={titleId(index)}
            data-column={column.id}
            className={cn(
              'flex snap-start flex-col gap-2 p-2',
              columnFrameClasses,
              isOpen ? columnWidthClasses : collapsedWidthClasses,
            )}
          >
            {head(column, index, cards.length)}
            {isOpen && (
              <CardList<I>
                columnId={column.id}
                cards={cards}
                selected={selectedIn(column.id)}
                aria-labelledby={titleId(index)}
                shared={shared}
              />
            )}
          </div>
        );
      })
    ) : (
      <div className="flex w-max min-w-full shrink-0 flex-col gap-3">
        <div className="flex gap-3">
          {columns.map((column, index) => (
            <div
              key={column.id}
              data-column={column.id}
              className={cn(
                'snap-start p-2',
                columnFrameClasses,
                isExpanded(column.id) ? columnWidthClasses : collapsedWidthClasses,
              )}
            >
              {head(column, index, columnCount(column))}
            </div>
          ))}
        </div>
        {lanes.map((lane, laneIndex) => {
          const laneTitleId = `${baseId}-lane-${String(laneIndex)}`;
          const laneCount = columns.reduce(
            (sum, column) => sum + cardsIn(groups, column.id, lane.id).length,
            0,
          );
          return (
            <div
              key={lane.id}
              role="group"
              aria-labelledby={laneTitleId}
              data-lane={lane.id}
              className="flex flex-col gap-1.5"
            >
              {/* The lane's heading stays in view while the board scrolls sideways. */}
              <div className="sticky start-0 flex w-fit max-w-[calc(100cqw-1rem)] items-center gap-2 px-1">
                <Heading className="min-w-0 text-sm font-semibold break-words text-fg">
                  <span id={laneTitleId}>{lane.title}</span>
                </Heading>
                <CountBadge count={laneCount} messages={messages} />
              </div>
              <div className="flex gap-3">
                {columns.map((column) =>
                  isExpanded(column.id) ? (
                    <div
                      key={column.id}
                      data-column={column.id}
                      className={cn('p-1', columnFrameClasses, columnWidthClasses)}
                    >
                      <CardList<I>
                        columnId={column.id}
                        laneId={lane.id}
                        cards={cardsIn(groups, column.id, lane.id)}
                        selected={selectedIn(column.id, lane.id)}
                        aria-label={messages.kanbanCell({
                          column: column.title,
                          lane: lane.title,
                        })}
                        shared={shared}
                      />
                    </div>
                  ) : (
                    <div
                      key={column.id}
                      aria-hidden="true"
                      className={cn(columnFrameClasses, collapsedWidthClasses)}
                    />
                  ),
                )}
              </div>
            </div>
          );
        })}
      </div>
    );

  return (
    <div
      ref={ref}
      role="group"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={cn('@container flex min-w-0 flex-col gap-2 text-sm text-fg', className)}
    >
      <div
        ref={boardRef}
        className={cn(
          // Columns that don't fit scroll sideways, snapping to a column's start on narrow boards. Relative, so the
          // visually hidden text in columns out of view scrolls (and clips) with them rather than widening the page.
          'relative flex min-w-0 items-start gap-3 overflow-x-auto overscroll-x-contain p-1',
          'snap-x snap-mandatory @2xl:snap-none',
        )}
      >
        {board}
      </div>
      {selectionMode !== 'none' && (
        <ActionBar
          selectedCount={selectedByCell.count}
          onClearSelection={() => {
            setSelected(new Set());
          }}
        >
          {canMove && (
            <MenuButton
              label={messages.kanbanMoveTo}
              variant="ghost"
              onAction={(key) => {
                requestMove({ ids: [...selected], columnId: String(key) });
                setSelected(new Set());
              }}
            >
              {columns.map((column) => (
                <MenuItem key={column.id} id={column.id}>
                  {column.title}
                </MenuItem>
              ))}
            </MenuButton>
          )}
          {bulkActions?.(selected)}
        </ActionBar>
      )}
      <LiveRegion ref={announcerRef} />
    </div>
  );
}
