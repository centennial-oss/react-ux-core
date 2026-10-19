// ListView: a list of rich rows (an icon or avatar, a label, a description, metadata and row actions) on React Aria's
// GridList, so arrow keys move between rows and into their controls, typeahead finds rows and screen readers hear a
// grid. Rows can be chosen (one or many, with checkboxes) and activated (`onAction`), grouped under sticky section
// headings, dragged into a new order, and loaded page by page. Long lists render only the rows in view.

import { GripVertical } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  type Ref,
} from 'react';
import {
  Button as AriaButton,
  Collection,
  DropIndicator,
  GridList,
  GridListHeader,
  GridListItem,
  GridListLoadMoreItem,
  GridListSection,
  ListLayout,
  Text,
  Virtualizer,
  isTextDropItem,
  useDragAndDrop,
  type DragAndDropHooks,
  type DropItem,
  type DropTarget,
  type Key,
  type Selection,
} from 'react-aria-components';
import { useEntryMessages } from '../../provider/context';
import { listViewStrings, reorderStrings } from '../../provider/coreStrings';
import { dropMove, moveIdsTo } from '../../utils/collections';
import { cn } from '../../utils/cn';
import type { IconComponent } from '../../utils/icon';
import { itemText } from '../../utils/text';
import { useControllableState } from '../../utils/useControllableState';
import { useLatest } from '../../utils/useLatest';
import { Avatar, type AvatarProps } from '../Avatar/Avatar';
import { Button } from '../Button/Button';
import { Checkbox } from '../Checkbox/Checkbox';
import { EmptyState } from '../EmptyState/EmptyState';
import { OverflowMenu } from '../Menu/MenuButtons';
import { Skeleton } from '../Skeleton/Skeleton';
import { Spinner } from '../Spinner/Spinner';

/** A row. */
export interface ListViewItem<T = unknown> {
  /** Unique across the list: the key for selection, actions and moves. */
  id: string;
  /** The row's title. */
  label: ReactNode;
  /** Plain text for typeahead, search and the row's name, when `label` isn't a string. */
  textValue?: string;
  /** A second line under the label, read as the row's description. */
  description?: ReactNode;
  /** More words to search by (TransferList). */
  keywords?: readonly string[];
  /** An icon before the text. */
  icon?: IconComponent;
  /** A person's (or team's) picture or initials before the text, instead of `icon`. Drawn only while in view. */
  avatar?: Omit<AvatarProps, 'size' | 'className' | 'ref'>;
  /** At the end of the row, before its actions: a `Badge`, a time, a count. */
  meta?: ReactNode;
  isDisabled?: boolean;
  /** The app's own data for the row. */
  data?: T;
}

/** A group of rows under a heading that sticks to the top while its rows scroll past. */
export interface ListViewSection<I extends ListViewItem = ListViewItem> {
  id: string;
  title: string;
  items: readonly I[];
}

/** A move reported by `onMove`: the dragged rows go just before or after the row they were dropped on. */
export interface ListMove {
  /** The moved rows, in list order. */
  ids: string[];
  targetId: string;
  position: 'before' | 'after';
}

/** Applies a `ListMove` to a flat list of items and returns the new list (the input isn't changed). */
export function moveListItems<I extends { id: string }>(items: readonly I[], move: ListMove): I[] {
  return moveIdsTo(items, move, (item) => item.id);
}

export interface ListViewProps<I extends ListViewItem = ListViewItem> {
  /** The rows. */
  items?: readonly I[];
  /** Rows in titled groups, instead of `items`. */
  sections?: readonly ListViewSection<I>[];
  /** Names the list. Pass this or `aria-labelledby`. */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  /** `single` / `multiple` show a checkbox on every row. Defaults to `none`. */
  selectionMode?: 'none' | 'single' | 'multiple';
  /** The chosen rows' ids, controlled. */
  selectedKeys?: ReadonlySet<string>;
  /** The rows chosen at first (uncontrolled). */
  defaultSelectedKeys?: ReadonlySet<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  /**
   * Called when a row is activated: pressed or Enter. With selection, a press activates the row while nothing is
   * chosen and toggles it once something is; Space and the checkbox always toggle.
   */
  onAction?: (id: string) => void;
  /**
   * Draws a row's content in place of its icon or avatar, label, description and metadata (KanbanBoard's cards); the
   * drag handle, checkbox and actions stay. The row is still found by typeahead through `textValue` or `label`.
   */
  renderItem?: (item: I) => ReactNode;
  /** Controls at the end of a row, such as an `IconButton` or an `OverflowMenu`. */
  renderActions?: (item: I) => ReactNode;
  /** Menu items (`MenuItem`) for a row's actions menu, opened from a "more" button at the end of the row. */
  rowActions?: (item: I) => ReactNode;
  /** Called with a `rowActions` item's key and the row. */
  onRowAction?: (key: Key, item: I) => void;
  /**
   * Rows get a drag handle and can be dragged into a new order (mouse, touch, or React Aria's keyboard and screen
   * reader drag and drop). The list doesn't change its own `items`: apply the move from `onMove` (`moveListItems`
   * does it for a flat list).
   */
  isReorderable?: boolean;
  /** Called after a drop with the moved ids and where they go. */
  onMove?: (move: ListMove) => void;
  /**
   * Drag and drop from React Aria's `useDragAndDrop`, for drags to or from other lists and drop targets (TransferList
   * uses it). Replaces the hooks `isReorderable` sets up; rows get drag handles.
   */
  dragAndDropHooks?: DragAndDropHooks;
  /**
   * Renders only the rows in view, for long lists (thousands of rows). With `maxHeight` the list scrolls inside;
   * without, it follows the page's scroll.
   */
  isVirtualized?: boolean;
  /**
   * The most the list grows to, as a CSS length, before it scrolls inside. `100%` fills a root given a height
   * (through `className`). Without it, the list is as tall as its rows and scrolls with the page.
   */
  maxHeight?: string;
  /** `compact` rows suit dense data; `regular` suits avatars and descriptions. Defaults to `regular`. */
  density?: 'compact' | 'regular';
  /**
   * `list` draws rows as one bordered list, divided by lines. `cards` draws each row as a card of its own, spaced
   * apart on the background of whatever holds the list (KanbanBoard's columns). Defaults to `list`.
   */
  variant?: 'list' | 'cards';
  /**
   * Asks for more rows: from the "Load more" button under the list (also the way to retry a failed load), and when
   * the end of the list scrolls into view. Scrolling asks once for each set of rows.
   */
  onLoadMore?: () => void;
  /** Whether there are more rows to load. */
  hasMore?: boolean;
  /** More rows are on their way: the button and a row at the end show a spinner, and scrolling doesn't ask. */
  isLoadingMore?: boolean;
  /** Asks for more when the end of the list scrolls into view, as well as from the button. Defaults to true. */
  shouldLoadOnScroll?: boolean;
  /** The first rows are loading: placeholder rows show instead of the empty state. */
  isLoading?: boolean;
  /** Shown when there are no rows. Defaults to an EmptyState saying "No items". */
  emptyState?: ReactNode;
  isDisabled?: boolean;
  className?: string;
  /** The root element. */
  ref?: Ref<HTMLDivElement>;
}

const listMessages = { ...reorderStrings, ...listViewStrings };

type Variant = 'list' | 'cards';
type Density = 'compact' | 'regular';

const rowDensityClasses: Record<Variant, Record<Density, string>> = {
  list: {
    compact: 'items-center min-h-hit gap-2 px-2 py-1',
    regular: 'items-center min-h-12 gap-2 px-3 py-2 sm:gap-3',
  },
  // A card's controls sit at its top, beside the first line, however tall its content.
  cards: {
    compact: 'items-start gap-2 p-2',
    regular: 'items-start gap-2 p-3',
  },
};

/**
 * React Aria's ListLayout, starting over only when the width changes. Rows stack down, so a new height moves none of
 * them; and a list without a height of its own (scrolling with the page) changes height as its rows are measured, so
 * starting over then would estimate them again, change the height back, and never settle (with sections it does).
 */
class ListViewLayout<T> extends ListLayout<T> {
  protected override shouldInvalidateEverything(
    context: Parameters<ListLayout<T>['update']>[0],
  ): boolean {
    return super.shouldInvalidateEverything({
      ...context,
      sizeChanged: context.widthChanged === true,
    });
  }
}

// Estimated heights (px) for virtualization; rows are measured once drawn.
const rowEstimates: Record<Variant, Record<Density, number>> = {
  list: { compact: 45, regular: 57 },
  cards: { compact: 54, regular: 70 },
};
const HEADING_ESTIMATE = 33;
const LOADER_SIZE = 48;
// Cards: the space between them (gap-2) and around them, room for the focus ring (p-1).
const CARD_GAP = 8;
const CARD_PADDING = 4;

// Every row and heading draws a top border and the content is pulled up 1px, so the first one's border sits under
// the list's own border and every boundary is a single line (rows can't know their position when virtualized).
const separatorClasses = 'border-t border-border';

const headingClasses = cn(
  'flex min-h-8 items-center bg-surface-2 px-3 py-1.5 text-xs font-semibold text-fg-muted',
  separatorClasses,
);

// The virtualizer positions each view in a wrapper with inline styles. A heading's wrapper sticks to the top of the
// scroll area instead, inside its section's wrapper (which is as tall as the section), so it stays in view while the
// section's rows scroll past and is pushed out by the next section.
const stickyVirtualHeadingClasses = cn(
  '[&_[role=presentation]:has(>[data-list-heading])]:sticky!',
  '[&_[role=presentation]:has(>[data-list-heading])]:-top-px!',
  '[&_[role=presentation]:has(>[data-list-heading])]:z-[2]!',
);

interface RowContext {
  selectionMode: 'none' | 'single' | 'multiple';
  density: Density;
  variant: Variant;
  hasDragHandle: boolean;
  renderItem?: (item: ListViewItem) => ReactNode;
  renderActions?: (item: ListViewItem) => ReactNode;
  rowActions?: (item: ListViewItem) => ReactNode;
  onRowAction?: (key: Key, item: ListViewItem) => void;
  messages: typeof listMessages & { moreActions: string };
}

// Rows are cached by React Aria's collection (rendered again only when their item changes), so their content reads
// the list's settings from context instead of closing over them.
const ListRowContext = createContext<RowContext | null>(null);

/** A row's content: handle, checkbox, picture, text, metadata and actions. */
function RowContent({ item }: { item: ListViewItem }) {
  const context = useContext(ListRowContext);
  if (!context) {
    return null;
  }
  const {
    selectionMode,
    density,
    hasDragHandle,
    renderItem,
    renderActions,
    rowActions,
    onRowAction,
    messages,
  } = context;
  const text = itemText(item);
  const Icon = item.icon;
  return (
    <>
      {hasDragHandle && (
        <AriaButton
          slot="drag"
          aria-label={messages.dragItem({ item: text })}
          className="hit-area -ms-1 inline-flex size-6 shrink-0 cursor-grab items-center justify-center rounded-control text-fg-muted outline-none data-focus-visible:focus-ring data-hovered:text-fg"
        >
          <GripVertical aria-hidden="true" className="size-4" />
        </AriaButton>
      )}
      {selectionMode !== 'none' && <Checkbox slot="selection" className="shrink-0" />}
      {renderItem ? (
        <span className="flex min-w-0 flex-1 flex-col">{renderItem(item)}</span>
      ) : (
        <>
          {item.avatar ? (
            <Avatar
              {...item.avatar}
              size={density === 'compact' ? 'xs' : 'md'}
              className="shrink-0"
            />
          ) : (
            Icon && <Icon aria-hidden="true" className="size-4 shrink-0 text-fg-muted" />
          )}
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="min-w-0 font-medium break-words text-fg">{item.label}</span>
            {item.description !== undefined && (
              <Text slot="description" className="line-clamp-2 min-w-0 text-xs text-fg-muted">
                {item.description}
              </Text>
            )}
          </span>
          {item.meta !== undefined && (
            <span className="flex shrink-0 items-center text-xs text-fg-muted">{item.meta}</span>
          )}
        </>
      )}
      {(renderActions !== undefined || rowActions !== undefined) && (
        <span className="flex shrink-0 items-center gap-0.5">
          {renderActions?.(item)}
          {rowActions && (
            <OverflowMenu
              size="sm"
              aria-label={messages.listItemActions({ item: text })}
              onAction={(key) => {
                onRowAction?.(key, item);
              }}
            >
              {rowActions(item)}
            </OverflowMenu>
          )}
        </span>
      )}
    </>
  );
}

const rowStateClasses =
  'data-focus-visible:ring-2 data-focus-visible:ring-focus data-dragging:opacity-50 data-disabled:opacity-50';

const rowClasses: Record<Variant, string> = {
  list: cn(
    'group/row relative flex min-w-0 items-center bg-surface-1 text-sm text-fg outline-none',
    separatorClasses,
    'data-selected:bg-accent-bg data-hovered:bg-surface-2 data-selected:data-hovered:bg-accent-bg',
    'data-focus-visible:ring-inset',
    rowStateClasses,
  ),
  cards: cn(
    'group/row relative flex min-w-0 rounded-card border border-border bg-surface-2 text-sm text-fg shadow-raised outline-none',
    'data-hovered:border-border-strong data-selected:border-accent-border data-selected:bg-accent-bg',
    rowStateClasses,
  ),
};

/**
 * A function that draws one row in a variant's style. Each is made once, at module level, so the collection's cache
 * isn't defeated by a new function every render.
 */
function rowRenderer(variant: Variant) {
  return function renderRow(item: ListViewItem) {
    return (
      <GridListItem
        id={item.id}
        textValue={itemText(item)}
        isDisabled={item.isDisabled}
        className={rowClasses[variant]}
      >
        {({ allowsDragging }) => (
          <DensityRow item={item} allowsDragging={allowsDragging === true} />
        )}
      </GridListItem>
    );
  };
}

const rowRenderers: Record<Variant, (item: ListViewItem) => ReactNode> = {
  list: rowRenderer('list'),
  cards: rowRenderer('cards'),
};

/** Applies the density padding (from context) around a row's content. */
function DensityRow({ item, allowsDragging }: { item: ListViewItem; allowsDragging: boolean }) {
  const context = useContext(ListRowContext);
  return (
    <span
      className={cn(
        'flex min-w-0 flex-1',
        rowDensityClasses[context?.variant ?? 'list'][context?.density ?? 'regular'],
        allowsDragging && 'ps-2',
      )}
    >
      <RowContent item={item} />
    </span>
  );
}

/**
 * The line drawn where dragged rows will land (ListView, TransferList and KanbanBoard). Between cards, which sit apart
 * in a flex column (not virtualized), it's pulled into the gap so showing it moves nothing: centred in the 8px gap, or
 * in the 4px padding before the first card and after the last.
 */
export function renderListDropIndicator(target: DropTarget) {
  return <DropIndicator target={target} className={dropIndicatorClasses} />;
}

const dropIndicatorClasses = cn(
  'h-0.5 bg-transparent data-drop-target:bg-accent-solid',
  '[[data-list-variant=cards]>&]:-my-1.25',
  '[[data-list-variant=cards]>&:first-child]:-mt-1 [[data-list-variant=cards]>&:first-child]:-mb-1.5',
  '[[data-list-variant=cards]>&:last-child]:-mt-1.5 [[data-list-variant=cards]>&:last-child]:-mb-1',
);

/**
 * The ids a drop carries under a drag type private to one component (TransferList, KanbanBoard), whose `getItems`
 * puts each dragged row's id under that type.
 */
export async function droppedIds(items: readonly DropItem[], type: string): Promise<string[]> {
  return Promise.all(
    items
      .filter((item) => isTextDropItem(item) && item.types.has(type))
      .map((item) =>
        // Filtered to text items above.
        (item as Extract<DropItem, { kind: 'text' }>).getText(type),
      ),
  );
}

/** Loading placeholder rows, for the first load. */
function LoadingRows({ label }: { label: string }) {
  return (
    <div className="flex flex-col">
      <span className="sr-only">{label}</span>
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          aria-hidden="true"
          className={cn('flex items-center gap-3 px-3 py-3', row > 0 && separatorClasses)}
        >
          <Skeleton shape="circle" width="2rem" />
          <span className="flex flex-1 flex-col gap-1.5">
            <Skeleton width="40%" />
            <Skeleton width="70%" />
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * A list of rich rows: an icon or avatar, a label, a description, metadata and actions. Rows can be chosen (one or
 * many, with checkboxes), activated (`onAction`), grouped under sticky headings (`sections`), dragged into order
 * (`isReorderable`) and loaded page by page (`onLoadMore`). `isVirtualized` renders only the rows in view, for lists
 * of thousands. It takes data and callbacks only.
 */
export function ListView<I extends ListViewItem = ListViewItem>({
  items,
  sections,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  selectionMode = 'none',
  selectedKeys,
  defaultSelectedKeys,
  onSelectionChange,
  onAction,
  renderItem,
  renderActions,
  rowActions,
  onRowAction,
  isReorderable = false,
  onMove,
  dragAndDropHooks,
  isVirtualized = false,
  maxHeight,
  density = 'regular',
  variant = 'list',
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  shouldLoadOnScroll = true,
  isLoading = false,
  emptyState,
  isDisabled = false,
  className,
  ref,
}: ListViewProps<I>) {
  const messages = useEntryMessages(listMessages);
  const [selected, setSelected] = useControllableState<ReadonlySet<string>>(
    selectedKeys,
    defaultSelectedKeys ?? new Set<string>(),
    onSelectionChange as ((keys: ReadonlySet<string>) => void) | undefined,
  );

  // Every row, in order, across sections.
  const allItems = useMemo(
    () => (sections ? sections.flatMap((section) => section.items) : (items ?? [])),
    [items, sections],
  );
  const disabledKeys = useMemo(
    () => (isDisabled ? allItems.map((item) => item.id) : undefined),
    [isDisabled, allItems],
  );

  // Rows by id, built the first time a drag needs one (most lists are never dragged).
  const index = useRef<{ source: readonly I[]; byId: Map<string, I> } | null>(null);
  const itemById = (id: string) => {
    if (index.current?.source !== allItems) {
      index.current = { source: allItems, byId: new Map(allItems.map((item) => [item.id, item])) };
    }
    return index.current.byId.get(id);
  };

  // React Aria builds the hooks from these options on every render, so the handlers see the current props.
  const { dragAndDropHooks: reorderHooks } = useDragAndDrop({
    isDisabled: !isReorderable || isDisabled,
    getItems: (keys) =>
      [...keys].map((key) => {
        const item = itemById(String(key));
        return { 'text/plain': item ? itemText(item) : String(key) };
      }),
    onReorder: (event) => {
      // The moved ids in list order, whatever order they were chosen in.
      const ids = allItems.flatMap((item) => (event.keys.has(item.id) ? [item.id] : []));
      onMove?.(dropMove(event.target, ids));
    },
    renderDropIndicator: renderListDropIndicator,
  });
  const hooks = dragAndDropHooks ?? (isReorderable ? reorderHooks : undefined);
  const hasDragHandle = hooks?.useDraggableCollectionState !== undefined;

  // Infinite loading. React Aria's sentinel reports the end in view whenever the collection changes, so it asks at
  // most once for each set of rows (a new page, or a new first page after a search, asks again) and never while
  // rows are loading. A failed load leaves the rows as they were: the button retries. The callback and the load-more
  // item keep their identity between renders, so the sentinel isn't rebuilt (and asked) on every render.
  const canLoadMore = hasMore && onLoadMore !== undefined;
  const askedFor = useRef<readonly ListViewItem[] | null>(null);
  const loadState = useLatest({ allItems, hasMore, isLoading, isLoadingMore, onLoadMore });
  const askOnScroll = useCallback(() => {
    const state = loadState.current;
    if (
      !state.hasMore ||
      state.isLoading ||
      state.isLoadingMore ||
      askedFor.current === state.allItems
    ) {
      return;
    }
    askedFor.current = state.allItems;
    state.onLoadMore?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadState is a ref (useLatest), the same every render.
  }, []);
  // A list in a scroll box uses React Aria's sentinel, with the box as its root. A list scrolling with the page watches
  // the viewport itself: there React Aria's sentinel takes the root element, as tall as the whole page, for the scroll
  // area, so the end always counts as in view. React Aria's item still draws the spinner row.
  const isPageScrolled = maxHeight === undefined;
  const loadsOnScroll = canLoadMore && shouldLoadOnScroll && !isLoading;
  const pageEnd = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const end = pageEnd.current;
    if (!loadsOnScroll || !isPageScrolled || !end) {
      return;
    }
    // Rebuilt when the rows or the loading state change, so a new page asks again if the end is still in view.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          askOnScroll();
        }
      },
      // One viewport ahead, as React Aria's sentinel does.
      { rootMargin: '0px 0px 100% 0px' },
    );
    observer.observe(end);
    return () => {
      observer.disconnect();
    };
  }, [loadsOnScroll, isPageScrolled, askOnScroll, allItems, isLoadingMore]);
  const loadMoreItem = useMemo(
    () =>
      loadsOnScroll ? (
        <GridListLoadMoreItem
          onLoadMore={isPageScrolled ? undefined : askOnScroll}
          isLoading={isLoadingMore}
          className={cn('flex items-center justify-center py-3', separatorClasses)}
        >
          <Spinner size="sm" label={messages.loading} />
        </GridListLoadMoreItem>
      ) : null,
    [loadsOnScroll, isPageScrolled, isLoadingMore, askOnScroll, messages.loading],
  );

  const rowContext = useMemo<RowContext>(
    () => ({
      selectionMode,
      density,
      variant,
      hasDragHandle,
      renderItem: renderItem as RowContext['renderItem'],
      renderActions: renderActions as RowContext['renderActions'],
      rowActions: rowActions as RowContext['rowActions'],
      onRowAction: onRowAction as RowContext['onRowAction'],
      messages,
    }),
    [
      selectionMode,
      density,
      variant,
      hasDragHandle,
      renderItem,
      renderActions,
      rowActions,
      onRowAction,
      messages,
    ],
  );
  const isCards = variant === 'cards';
  const layoutOptions = useMemo(
    () => ({
      estimatedRowSize: rowEstimates[variant][density],
      estimatedHeadingSize: HEADING_ESTIMATE,
      loaderSize: LOADER_SIZE,
      gap: isCards ? CARD_GAP : 0,
      padding: isCards ? CARD_PADDING : 0,
    }),
    [variant, density, isCards],
  );
  const renderRow = rowRenderers[variant];

  const onSelection = (keys: Selection) => {
    if (keys === 'all') {
      setSelected(
        new Set(allItems.filter((item) => item.isDisabled !== true).map((item) => item.id)),
      );
      return;
    }
    setSelected(new Set([...keys].map(String)));
  };

  const rows = sections ? (
    <Collection items={sections} dependencies={[isVirtualized]}>
      {(section) => (
        // Virtualized, a section fills its wrapper (as tall as the section), so its heading can stick throughout.
        <GridListSection
          id={section.id}
          className={cn(
            isCards && !isVirtualized ? 'flex flex-col gap-2' : 'block',
            isVirtualized && 'h-full',
          )}
        >
          <GridListHeader
            data-list-heading=""
            // A stuck heading's top border hides under the list's own (see separatorClasses).
            className={cn(headingClasses, !isVirtualized && 'sticky -top-px z-[2]')}
          >
            {section.title}
          </GridListHeader>
          <Collection items={section.items}>{renderRow}</Collection>
        </GridListSection>
      )}
    </Collection>
  ) : (
    <Collection items={items ?? []}>{renderRow}</Collection>
  );

  const list = (
    <GridList
      // GridList calls its drag-and-drop hooks only when they're passed, so it starts over when that changes.
      key={hooks ? 'dnd' : 'plain'}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      selectionMode={selectionMode}
      selectedKeys={selected}
      onSelectionChange={onSelection}
      onAction={
        onAction
          ? (key) => {
              onAction(String(key));
            }
          : undefined
      }
      disabledKeys={disabledKeys}
      dragAndDropHooks={hooks}
      renderEmptyState={() =>
        isLoading ? (
          <LoadingRows label={messages.loading} />
        ) : (
          (emptyState ?? <EmptyState title={messages.listEmpty} />)
        )
      }
      data-list-variant={variant}
      // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the app's maximum height.
      style={maxHeight === undefined ? undefined : { maxHeight }}
      className={cn(
        // Fills a root given a height of its own (flex-1); otherwise it's as tall as its rows, up to `maxHeight`.
        'relative min-h-0 min-w-0 flex-1 rounded-control outline-none',
        isCards
          ? // Cards sit apart, with room for their focus rings (the virtualizer lays them out the same way).
            cn('bg-transparent', !isVirtualized && 'flex flex-col gap-2 p-1')
          : // The content's first border sits under the list's own (see separatorClasses).
            'block border border-border bg-surface-1 [&>*:first-child]:-mt-px',
        // Only a list with a height of its own scrolls inside. Otherwise it clips (to its rounded border) without
        // becoming a scroll container, which would hold its sticky headings and count its load-more sentinel as
        // always in view; it scrolls with the page instead. Important, over the virtualizer's inline overflow.
        maxHeight === undefined ? 'overflow-clip!' : 'overflow-auto overscroll-contain',
        'data-focus-visible:focus-ring data-drop-target:ring-2 data-drop-target:ring-accent-solid data-drop-target:ring-inset',
        isVirtualized && stickyVirtualHeadingClasses,
      )}
    >
      {rows}
      {loadMoreItem}
    </GridList>
  );

  return (
    <div ref={ref} className={cn('relative flex min-w-0 flex-col gap-2', className)}>
      <ListRowContext.Provider value={rowContext}>
        {isVirtualized ? (
          <Virtualizer layout={ListViewLayout} layoutOptions={layoutOptions}>
            {list}
          </Virtualizer>
        ) : (
          list
        )}
      </ListRowContext.Provider>
      {loadsOnScroll && isPageScrolled && (
        <div
          ref={pageEnd}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        />
      )}
      {canLoadMore && !isLoading && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" isPending={isLoadingMore} onPress={onLoadMore}>
            {messages.loadMore}
          </Button>
        </div>
      )}
    </div>
  );
}
