import { ChevronRight } from 'lucide-react';
import { useMemo, type ReactNode, type Ref } from 'react';
import {
  Button as AriaButton,
  Collection,
  Tree as AriaTree,
  TreeItem,
  TreeItemContent,
  type Key,
} from 'react-aria-components';
import { cn } from '../../utils/cn';
import { useControllableState } from '../../utils/useControllableState';
import type { Tone } from '../../utils/types';
import { MAX_TREE_DEPTH, type AnyTreeNode, type TreeNode } from './types';

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

/** Every node by id, with the ids of its ancestors. */
function indexNodes<T>(items: readonly AnyTreeNode<T>[]) {
  const nodes = new Map<string, { node: AnyTreeNode<T>; ancestors: string[] }>();
  const visit = (list: readonly AnyTreeNode<T>[], ancestors: string[], depth: number) => {
    for (const node of list) {
      nodes.set(node.id, { node, ancestors });
      if (depth < MAX_TREE_DEPTH && node.children) {
        visit(node.children, [...ancestors, node.id], depth + 1);
      }
    }
  };
  visit(items, [], 1);
  return nodes;
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
 * a panel). It takes data and callbacks only.
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
  className,
  ref,
}: TreeProps<T>) {
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

  const renderNode = (node: AnyTreeNode<T>, depth: number): ReactNode => {
    const children = depth < MAX_TREE_DEPTH ? (node.children ?? []) : [];
    const isCategory = hasCategories && depth === 1;
    const visualLevel = Math.max(0, depth - (hasCategories ? 2 : 1));
    const isPressToggle = isCategory || (selectableNodes === 'leaves' && children.length > 0);
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
          isCategory && 'mt-3 first:mt-0',
        )}
      >
        <TreeItemContent>
          {({ isExpanded, hasChildItems, isSelected, isHovered, isDisabled }) => (
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
              )}
            >
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
              {renderActions && !isCategory && (
                <span
                  className={cn(
                    'flex shrink-0',
                    // Shown on hover, focus or selection where there's a mouse; always on touch screens.
                    '[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within/row:opacity-100',
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
          <Collection items={children}>{(child) => renderNode(child, depth + 1)}</Collection>
        )}
      </TreeItem>
    );
  };

  return (
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
      className={cn('flex min-w-0 flex-col gap-0.5 outline-none', className)}
    >
      {(node) => renderNode(node, 1)}
    </AriaTree>
  );
}
