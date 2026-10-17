import { ChevronRight, GripVertical } from 'lucide-react';
import { useId, useMemo, useRef, useState, type ReactNode, type Ref } from 'react';
import {
  Button as AriaButton,
  Collection,
  DropIndicator,
  Tree as AriaTree,
  TreeItem,
  TreeItemContent,
  useDragAndDrop,
  type DropTarget,
  type Key,
} from 'react-aria-components';
import { useEntryMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import type { IconComponent } from '../../utils/icon';
import { useControllableState } from '../../utils/useControllableState';
import type { Tone } from '../../utils/types';
import { IconButton } from '../IconButton/IconButton';
import { defaultTreeMessages } from './messages';
import type { TreeMove } from './move';
import { MAX_TREE_DEPTH, type AnyTreeNode, type TreeNode } from './types';

/** A toggle button at the end of every row, such as a layer's visibility or lock. */
export interface TreeRowToggle {
  id: string;
  /** What the toggle switches on, such as "Visible" or "Locked". With the node's label, it names the button. */
  label: string;
  /** Shown while the toggle is on. */
  icon: IconComponent;
  /** Shown while it's off. Defaults to `icon`. */
  offIcon?: IconComponent;
  /** The value for nodes `toggleValues` doesn't list. Defaults to false. */
  defaultValue?: boolean;
}

export interface TreeProps<T = unknown> {
  /** The top-level nodes. Nested `children` go up to five levels in all. */
  items: readonly TreeNode<T>[];
  /** Names the tree. */
  'aria-label': string;
  /** Shows the top-level nodes as collapsible category headings (like "INPUTS"); they count toward the five levels. */
  hasCategories?: boolean;
  /** The selected node's id. Controlled; see `defaultSelectedId`. */
  selectedId?: string | null;
  defaultSelectedId?: string | null;
  /** Called with the chosen node's id and the node. */
  onSelectionChange?: (id: string, node: AnyTreeNode<T>) => void;
  /** `leaves` makes only nodes without children selectable: pressing a parent opens or closes it. Defaults to `all`. */
  selectableNodes?: 'all' | 'leaves';
  /** The open nodes' ids. Controlled; see `defaultExpandedIds`. */
  expandedIds?: Iterable<string>;
  /** Defaults to the categories and the selected node's ancestors. */
  defaultExpandedIds?: Iterable<string>;
  onExpandedChange?: (ids: Set<string>) => void;
  /** Controls at the end of a row (for example an OverflowMenu), shown on hover, focus or selection, and always on touch. */
  renderActions?: (node: AnyTreeNode<T>) => ReactNode;
  /**
   * Nodes can be dragged to reorder them or move them into other nodes (mouse, touch, or React Aria's keyboard and
   * screen reader drag and drop from each row's handle). The tree doesn't change its own `items`: apply the move
   * from `onMove` (`moveTreeNodes` does it). Categories, disabled nodes and nodes that can't be selected don't drag.
   */
  isReorderable?: boolean;
  /** Called after a drop with the moved ids, their new parent and their position there. */
  onMove?: (move: TreeMove) => void;
  /** Whether a node takes drops inside it (becoming or staying a parent). Defaults to every node. */
  canDropInside?: (node: AnyTreeNode<T>) => boolean;
  /** Toggle buttons (`aria-pressed`) at the end of every row except categories, such as visibility and lock. */
  rowToggles?: readonly TreeRowToggle[];
  /** The toggles' values, by node id and then toggle id. Missing values use the toggle's `defaultValue`. */
  toggleValues?: Readonly<Record<string, Readonly<Record<string, boolean>>>>;
  onToggleChange?: (nodeId: string, toggleId: string, value: boolean) => void;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

const toneClasses: Record<Tone, string> = {
  neutral: 'text-fg-muted',
  accent: 'text-accent-fg',
  success: 'text-success-fg',
  warning: 'text-warning-fg',
  danger: 'text-danger-fg',
};

// Indent per level (complete class strings, so Tailwind finds them).
const indentClasses = ['ps-1', 'ps-6', 'ps-11', 'ps-16', 'ps-21'] as const;

// A before/after drop line starts where its row's chevron does: React Aria sets --tree-item-level (1-based) on it.
const dropLineClasses = {
  flat: 'ms-[calc(0.25rem_+_(var(--tree-item-level)_-_1)_*_1.25rem)]',
  categories: 'ms-[calc(0.25rem_+_(var(--tree-item-level)_-_2)_*_1.25rem)]',
};

// Shown on hover, focus or selection where there's a mouse; always on touch screens.
const revealClasses =
  '[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within/row:opacity-100';

interface IndexedNode<T> {
  node: AnyTreeNode<T>;
  ancestors: string[];
  /** The children the tree shows (none at the deepest level). */
  children: readonly AnyTreeNode<T>[];
}

/** Every node by id, with the ids of its ancestors. */
function indexNodes<T>(items: readonly AnyTreeNode<T>[]) {
  const nodes = new Map<string, IndexedNode<T>>();
  const visit = (list: readonly AnyTreeNode<T>[], ancestors: string[], depth: number) => {
    for (const node of list) {
      const children = depth < MAX_TREE_DEPTH ? (node.children ?? []) : [];
      nodes.set(node.id, { node, ancestors, children });
      visit(children, [...ancestors, node.id], depth + 1);
    }
  };
  visit(items, [], 1);
  return nodes;
}

/** How many levels a node and its shown descendants take up (1 for a leaf). */
function heightOf<T>(id: string, nodes: Map<string, IndexedNode<T>>): number {
  const children = nodes.get(id)?.children ?? [];
  return 1 + Math.max(0, ...children.map((child) => heightOf(child.id, nodes)));
}

function firstKey(keys: Iterable<Key> | 'all'): string | undefined {
  if (keys === 'all') {
    return undefined;
  }
  const [key] = keys;
  return key === undefined ? undefined : String(key);
}

/**
 * A tree of nodes for navigation or structure, like Storybook's sidebar: optional category headings, then nodes
 * nested up to five levels in all, each with its own icon, colour and badge. Arrow keys move and open or close
 * nodes, typeahead finds them, and choosing one calls `onSelectionChange` (the app decides what it means: a route,
 * a panel). Nodes can also be reordered and re-parented by drag and drop (`isReorderable`), and rows can carry
 * toggle buttons such as a layer's visibility and lock (`rowToggles`). It takes data and callbacks only.
 */
export function Tree<T = unknown>({
  items,
  'aria-label': ariaLabel,
  hasCategories = false,
  selectedId,
  defaultSelectedId = null,
  onSelectionChange,
  selectableNodes = 'all',
  expandedIds,
  defaultExpandedIds,
  onExpandedChange,
  renderActions,
  isReorderable = false,
  onMove,
  canDropInside,
  rowToggles,
  toggleValues,
  onToggleChange,
  className,
  ref,
}: TreeProps<T>) {
  const messages = useEntryMessages(defaultTreeMessages);
  const nodes = useMemo(() => indexNodes<T>(items), [items]);
  const [selected, setSelected] = useControllableState<string | null>(
    selectedId,
    defaultSelectedId,
  );
  const initialExpanded = useMemo(() => {
    if (defaultExpandedIds) {
      return new Set(defaultExpandedIds);
    }
    const open = new Set(hasCategories ? items.map((node) => node.id) : []);
    const start = selectedId ?? defaultSelectedId;
    for (const id of start === null ? [] : (nodes.get(start)?.ancestors ?? [])) {
      open.add(id);
    }
    return open;
    // Only the first render's values seed the open nodes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [expanded, setExpanded] = useControllableState<Set<string>>(
    expandedIds === undefined ? undefined : new Set(expandedIds),
    initialExpanded,
    onExpandedChange,
  );
  const [announcement, setAnnouncement] = useState('');
  /** The nodes being dragged, for checking drop targets. */
  const dragging = useRef<Set<string>>(new Set());
  const dragType = `application/x-rux-tree-${useId().replace(/[^\w-]/g, '')}`;

  // Categories, and parents when only leaves are selectable, can't be selected: pressing them opens or closes them.
  const unselectable = useMemo(() => {
    const keys: string[] = [];
    for (const [id, { node, ancestors }] of nodes) {
      const isCategory = hasCategories && ancestors.length === 0;
      const isParent = (node.children?.length ?? 0) > 0 && ancestors.length + 1 < MAX_TREE_DEPTH;
      if (isCategory || (selectableNodes === 'leaves' && isParent) || node.isDisabled === true) {
        keys.push(id);
      }
    }
    return keys;
  }, [nodes, hasCategories, selectableNodes]);

  const toggle = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpanded(next);
  };

  /** Where a drop target puts the dragged nodes, or null when the drop isn't allowed. */
  const placement = (target: DropTarget, moving: Set<string>): TreeMove | null => {
    if (target.type !== 'item' || moving.size === 0) {
      return null;
    }
    const key = String(target.key);
    const entry = nodes.get(key);
    if (!entry) {
      return null;
    }
    const parentId = target.dropPosition === 'on' ? key : (entry.ancestors.at(-1) ?? null);
    const parent = parentId === null ? undefined : nodes.get(parentId);
    const lineage = parent ? [...parent.ancestors, parentId] : [];
    // Never into a dragged node or its descendants, never a new category, never past the deepest level.
    if (
      lineage.some((id) => id !== null && moving.has(id)) ||
      (parentId === null && hasCategories)
    ) {
      return null;
    }
    if (target.dropPosition === 'on' && parent && canDropInside?.(parent.node) === false) {
      return null;
    }
    const ids = [...nodes.keys()].filter((id) => moving.has(id));
    if (ids.some((id) => lineage.length + heightOf(id, nodes) > MAX_TREE_DEPTH)) {
      return null;
    }
    const siblings = (parent ? parent.children : items).filter((node) => !moving.has(node.id));
    let index = siblings.length;
    if (target.dropPosition !== 'on') {
      const at = siblings.findIndex((node) => node.id === key);
      // Dropping beside a dragged node puts the nodes where that node was.
      const fallback = (parent ? parent.children : items).findIndex((node) => node.id === key);
      index = at < 0 ? fallback : at + (target.dropPosition === 'after' ? 1 : 0);
    }
    return { ids, parentId, index };
  };

  const { dragAndDropHooks } = useDragAndDrop({
    isDisabled: !isReorderable,
    getItems: (keys) =>
      [...keys].map((key) => {
        const label = nodes.get(String(key))?.node.label ?? String(key);
        return { 'text/plain': label, [dragType]: String(key) };
      }),
    acceptedDragTypes: [dragType],
    onDragStart: (event) => {
      dragging.current = new Set([...event.keys].map(String));
    },
    onDragEnd: () => {
      dragging.current = new Set();
    },
    getDropOperation: (target) => {
      const moving = dragging.current;
      const hasCategory = hasCategories && items.some((node) => moving.has(node.id));
      return !hasCategory && placement(target, moving) ? 'move' : 'cancel';
    },
    onMove: (event) => {
      const moving = new Set([...event.keys].map(String));
      const move = placement(event.target, moving);
      const first = move ? nodes.get(move.ids[0] ?? '') : undefined;
      if (!move || !first) {
        return;
      }
      onMove?.(move);
      const parent = move.parentId === null ? undefined : nodes.get(move.parentId);
      setAnnouncement(
        parent
          ? messages.treeMovedInto({
              item: first.node.label,
              parent: parent.node.label,
              position: move.index + 1,
            })
          : messages.treeMovedToTop({ item: first.node.label, position: move.index + 1 }),
      );
      // Open the new parent so the moved nodes stay in view.
      if (move.parentId !== null && !expanded.has(move.parentId)) {
        setExpanded(new Set([...expanded, move.parentId]));
      }
    },
    renderDropIndicator: (target) => (
      <DropIndicator
        target={target}
        className={cn(
          'relative h-0 outline-none',
          'before:absolute before:inset-x-0 before:-top-px before:h-0.5 before:rounded-full data-drop-target:before:bg-accent-solid',
          hasCategories ? dropLineClasses.categories : dropLineClasses.flat,
        )}
      />
    ),
  });

  const renderNode = (node: AnyTreeNode<T>, depth: number): ReactNode => {
    const children = nodes.get(node.id)?.children ?? [];
    const isCategory = hasCategories && depth === 1;
    const visualLevel = Math.max(0, depth - (hasCategories ? 2 : 1));
    const isPressToggle = isCategory || (selectableNodes === 'leaves' && children.length > 0);
    const canDrag = isReorderable && !unselectable.includes(node.id);
    const Icon = node.icon;
    return (
      <TreeItem
        key={node.id}
        id={node.id}
        textValue={node.label}
        hasChildItems={children.length > 0}
        onAction={
          isPressToggle && node.isDisabled !== true
            ? () => {
                toggle(node.id);
              }
            : undefined
        }
        className={cn(
          'group/row relative rounded-control text-sm outline-none select-none',
          'data-focus-visible:ring-2 data-focus-visible:ring-focus data-focus-visible:ring-inset',
          'data-dragging:opacity-50',
          isCategory && 'mt-3 first:mt-0',
        )}
      >
        <TreeItemContent>
          {({ isExpanded, hasChildItems, isSelected, isHovered, isDisabled, isDropTarget }) => (
            <div
              className={cn(
                'flex min-h-hit items-center gap-1.5 rounded-control py-1 pe-1',
                indentClasses[visualLevel] ?? indentClasses[4],
                isCategory
                  ? 'text-xs font-semibold tracking-wider text-fg-muted uppercase'
                  : isSelected
                    ? 'bg-accent-solid text-accent-on-solid'
                    : cn('text-fg', isHovered && 'bg-surface-3'),
                isDisabled && 'opacity-50',
                isDropTarget === true && 'ring-2 ring-accent-solid ring-inset',
              )}
            >
              {!canDrag && (
                // React Aria warns about draggable rows without a handle, and the tree always has drag-and-drop
                // hooks (see below), so rows that don't drag get a handle that's never shown or focused.
                <AriaButton slot="drag" excludeFromTabOrder className="hidden" />
              )}
              {canDrag && (
                <AriaButton
                  slot="drag"
                  aria-label={messages.treeDragNode({ item: node.label })}
                  className={cn(
                    'hit-area -me-1 inline-flex size-6 shrink-0 cursor-grab items-center justify-center rounded-control outline-none',
                    'data-focus-visible:focus-ring',
                    isSelected ? 'text-accent-on-solid' : 'text-fg-muted data-hovered:text-fg',
                  )}
                >
                  <GripVertical aria-hidden="true" className="size-4" />
                </AriaButton>
              )}
              {hasChildItems ? (
                <AriaButton
                  slot="chevron"
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-control outline-none',
                    'data-focus-visible:ring-2 data-focus-visible:ring-focus',
                    isSelected ? 'text-accent-on-solid' : 'text-fg-muted',
                  )}
                >
                  <ChevronRight
                    aria-hidden="true"
                    className={cn(
                      'size-4 transition-transform duration-fast motion-reduce:transition-none rtl:-scale-x-100',
                      isExpanded && 'rotate-90 rtl:-rotate-90',
                    )}
                  />
                </AriaButton>
              ) : (
                <span aria-hidden="true" className="size-6 shrink-0" />
              )}
              {Icon && (
                <Icon
                  aria-hidden="true"
                  className={cn(
                    'size-4 shrink-0',
                    isSelected ? 'text-accent-on-solid' : toneClasses[node.tone ?? 'neutral'],
                  )}
                />
              )}
              <span className="min-w-0 flex-1 truncate">{node.label}</span>
              {node.badge !== undefined && <span className="shrink-0">{node.badge}</span>}
              {rowToggles && rowToggles.length > 0 && !isCategory && (
                <span className="flex shrink-0 items-center gap-0.5">
                  {rowToggles.map((rowToggle) => {
                    const fallback = rowToggle.defaultValue ?? false;
                    const isOn = toggleValues?.[node.id]?.[rowToggle.id] ?? fallback;
                    return (
                      <IconButton
                        key={rowToggle.id}
                        icon={isOn ? rowToggle.icon : (rowToggle.offIcon ?? rowToggle.icon)}
                        aria-label={messages.treeRowToggle({
                          toggle: rowToggle.label,
                          item: node.label,
                        })}
                        size="sm"
                        isSelected={isOn}
                        isDisabled={isDisabled}
                        onChange={(value) => {
                          onToggleChange?.(node.id, rowToggle.id, value);
                        }}
                        className={cn(
                          // The icon shows the state (and aria-pressed tells it), so a pressed toggle isn't filled.
                          'size-6 data-selected:bg-transparent data-selected:text-current',
                          isSelected ? 'text-accent-on-solid' : 'text-fg-muted',
                          // A toggle away from its default (a hidden or locked layer) always shows.
                          isOn === fallback && revealClasses,
                          isOn === fallback &&
                            (isHovered || isSelected) &&
                            '[@media(hover:hover)]:opacity-100',
                        )}
                      />
                    );
                  })}
                </span>
              )}
              {renderActions && !isCategory && (
                <span
                  className={cn(
                    'flex shrink-0',
                    revealClasses,
                    (isHovered || isSelected) && '[@media(hover:hover)]:opacity-100',
                  )}
                >
                  {renderActions(node)}
                </span>
              )}
            </div>
          )}
        </TreeItemContent>
        {children.length > 0 && (
          <Collection items={children} dependencies={[nodes, toggleValues, isReorderable]}>
            {(child) => renderNode(child, depth + 1)}
          </Collection>
        )}
      </TreeItem>
    );
  };

  const tree = (
    <AriaTree
      ref={ref}
      aria-label={ariaLabel}
      items={items}
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={selected === null ? [] : [selected]}
      onSelectionChange={(keys) => {
        const id = firstKey(keys);
        const entry = id === undefined ? undefined : nodes.get(id);
        if (id !== undefined && entry) {
          setSelected(id);
          onSelectionChange?.(id, entry.node);
        }
      }}
      expandedKeys={expanded}
      onExpandedChange={(keys) => {
        setExpanded(new Set([...keys].map(String)));
      }}
      disabledKeys={unselectable}
      disabledBehavior="selection"
      // Always passed: the tree calls its drag-and-drop hooks only when this is set, so switching it on and off
      // while mounted would change its hook order. `isDisabled` on useDragAndDrop turns dragging off instead.
      dragAndDropHooks={dragAndDropHooks}
      // Rows render from the toggles and the reorder state too, so re-render them when those change.
      dependencies={[nodes, toggleValues, isReorderable]}
      className={cn('flex min-w-0 flex-col gap-0.5 outline-none', className)}
    >
      {(node) => renderNode(node, 1)}
    </AriaTree>
  );

  return (
    <>
      {tree}
      {/* A sibling, since a treegrid can't hold other elements; only reorderable trees announce moves. */}
      {isReorderable && (
        <span className="sr-only" aria-live="polite">
          {announcement}
        </span>
      )}
    </>
  );
}
