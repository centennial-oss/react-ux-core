// Treemap (FR-056): a hierarchy as nested rectangles with areas in proportion to their values, laid out by the
// squarified algorithm (treemapLayout.ts, no dependencies). Each level shows its children, and each child's own
// children inside it under a header when there's room. Rectangles are coloured by palette slot, by an explicit
// colour, or by a second metric (`colorValue`, such as % change) on a heat scale; labels show when they fit, and a
// tooltip gives the value and share. Pressing a group drills into it (animated, unless motion is reduced), with a
// breadcrumb trail back. The rectangles are a keyboard tree (`role="tree"`): arrows move, Enter drills in or presses,
// Backspace goes back up. The table view is a nested list of the whole hierarchy.

import { ChevronRight } from 'lucide-react';
import {
  Fragment,
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useLocale } from 'react-aria-components';
import { Button } from '../components/Button/Button';
import { ScrollRegion } from '../components/ScrollRegion/ScrollRegion';
import { downloadCsv, toCsv } from '../table/csv';
import type { DataTableColumn } from '../table/types';
import { cn } from '../utils/cn';
import { ChartFrame, type ChartFrameOptions, type ChartTable } from './ChartFrame';
import type { ChartColor } from './colors';
import { formatPercent, formatValue } from './format';
import { contrast, heatColor, resolveHeatScale, textOn, useHeatLook, type HeatScale } from './heat';
import { useChartMessages } from './messages';
import { downloadSvgAsPng } from './svgImage';
import { squarify, type TreemapRect } from './treemapLayout';
import { useChartLook } from './useChart';

/** A node in the hierarchy. */
export interface TreemapNode {
  id: string;
  label: string;
  /** A leaf's value. A node with children takes its children's total instead. */
  value: number;
  children?: readonly TreemapNode[];
  /** A palette slot or tone. Defaults to the palette colour of the top-level group it's in. */
  color?: ChartColor;
  /** Colours the node by a second metric (such as % change) on the heat scale, instead of the palette. */
  colorValue?: number;
}

export interface TreemapProps extends ChartFrameOptions {
  /** The root: its children fill the plot. */
  data: TreemapNode;
  /**
   * The heat scale for nodes with a `colorValue`. Defaults to a diverging scale around 0 when the values have both
   * signs, and a sequential one otherwise.
   */
  colorScale?: HeatScale;
  /** The values' unit ("USD"). */
  unit?: string;
  /** Drills into a node with children when it's pressed, with breadcrumbs back. Defaults to true. */
  isDrillable?: boolean;
  /** Called with a node's id when it's pressed (a click, a tap, or Enter), whether or not it drills in. */
  onNodePress?: (id: string) => void;
  /** Formats a `colorValue` in names, tooltips and the table, such as "+12%". Defaults to a plain number. */
  formatColorValue?: (value: number) => string;
  /** Names `colorValue` in the table view and CSV, such as "Change". */
  colorValueLabel?: string;
  /** The level to open on: node ids from one of the root's children down, such as `['account-a']`. */
  defaultPath?: readonly string[];
}

/** A rectangle on screen: a node at depth 1 (a child of the level shown) or 2 (a grandchild, inside its parent). */
interface Tile {
  node: TreemapNode;
  rect: TreemapRect;
  depth: 1 | 2;
  /** The depth-1 tile it's inside. */
  parentId?: string;
  /** Its position among its siblings (from 1) and their count. */
  position: number;
  siblings: number;
  /** The depth-1 group it belongs to, for its palette colour. */
  group: number;
  /** A depth-1 tile drawn with its children inside, under a header. */
  isOpen: boolean;
}

const HEADER = 24;
const noPath: readonly string[] = [];
const INSET = 2;

/** Each node's value: a leaf's own, a group's children's total. */
function nodeValues(root: TreemapNode): Map<string, number> {
  const values = new Map<string, number>();
  const visit = (node: TreemapNode): number => {
    const value =
      node.children && node.children.length > 0
        ? node.children.reduce((sum, child) => sum + visit(child), 0)
        : Math.max(0, Number.isFinite(node.value) ? node.value : 0);
    values.set(node.id, value);
    return value;
  };
  visit(root);
  return values;
}

function hasChildren(node: TreemapNode): boolean {
  return node.children !== undefined && node.children.length > 0;
}

/** The nodes from the root down the path (ids below the root), stopping where an id isn't found. */
function resolvePath(root: TreemapNode, path: readonly string[]): TreemapNode[] {
  const nodes = [root];
  for (const id of path) {
    const next = nodes.at(-1)?.children?.find((child) => child.id === id);
    if (!next || !hasChildren(next)) {
      break;
    }
    nodes.push(next);
  }
  return nodes;
}

function countLeaves(node: TreemapNode): number {
  return hasChildren(node)
    ? (node.children ?? []).reduce((sum, child) => sum + countLeaves(child), 0)
    : 1;
}

/** The tiles for a level: its children by value, and their children inside the ones with room for them. */
function layoutLevel(
  view: TreemapNode,
  values: ReadonlyMap<string, number>,
  width: number,
  height: number,
): Tile[] {
  const byValue = (nodes: readonly TreemapNode[]) =>
    [...nodes].sort((a, b) => (values.get(b.id) ?? 0) - (values.get(a.id) ?? 0));
  const children = byValue(view.children ?? []);
  const rects = squarify(
    children.map((child) => values.get(child.id) ?? 0),
    { x: 0, y: 0, width, height },
  );
  const tiles: Tile[] = [];
  children.forEach((child, index) => {
    const rect = rects[index] ?? { x: 0, y: 0, width: 0, height: 0 };
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }
    const grandchildren = byValue(child.children ?? []);
    const isOpen = grandchildren.length > 0 && rect.width >= 64 && rect.height >= HEADER + 28;
    tiles.push({
      node: child,
      rect,
      depth: 1,
      position: index + 1,
      siblings: children.length,
      group: index,
      isOpen,
    });
    if (!isOpen) {
      return;
    }
    const inner = {
      x: rect.x + INSET,
      y: rect.y + HEADER,
      width: rect.width - INSET * 2,
      height: rect.height - HEADER - INSET,
    };
    const innerRects = squarify(
      grandchildren.map((grandchild) => values.get(grandchild.id) ?? 0),
      inner,
    );
    grandchildren.forEach((grandchild, position) => {
      const innerRect = innerRects[position];
      if (innerRect && innerRect.width > 0 && innerRect.height > 0) {
        tiles.push({
          node: grandchild,
          rect: innerRect,
          depth: 2,
          parentId: child.id,
          position: position + 1,
          siblings: grandchildren.length,
          group: index,
          isOpen: false,
        });
      }
    });
  });
  return tiles;
}

/** The plot box's size, kept current with a ResizeObserver. */
function useBoxSize(): [(element: HTMLElement | null) => void, { width: number; height: number }] {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const ref = useCallback((element: HTMLElement | null) => {
    if (!element) {
      return;
    }
    const measure = () => {
      const box = element.getBoundingClientRect();
      setSize((previous) =>
        previous.width === box.width && previous.height === box.height
          ? previous
          : { width: box.width, height: box.height },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);
  return [ref, size];
}

const escapeXml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A hierarchy as nested rectangles, with drill-down, a keyboard tree, a summary and a nested-list table view. */
export function Treemap({
  data,
  colorScale,
  unit,
  isDrillable = true,
  onNodePress,
  formatColorValue,
  colorValueLabel,
  defaultPath = noPath,
  exportFileName,
  height = '18rem',
  ...frame
}: TreemapProps) {
  const messages = useChartMessages();
  const { locale } = useLocale();
  const { palette, isReducedMotion } = useChartLook();
  const look = useHeatLook();
  const baseId = useId();
  const values = useMemo(() => nodeValues(data), [data]);
  const [requestedPath, setPath] = useState<readonly string[]>(defaultPath);
  const trail = useMemo(() => resolvePath(data, requestedPath), [data, requestedPath]);
  // The path that resolves (ids that no longer exist, after the data changes, are dropped).
  const path = useMemo(() => trail.slice(1).map((node) => node.id), [trail]);
  const view = trail.at(-1) ?? data;
  const viewTotal = values.get(view.id) ?? 0;
  const [boxRef, size] = useBoxSize();
  const tiles = useMemo(
    () => layoutLevel(view, values, size.width, size.height),
    [view, values, size.width, size.height],
  );

  const scale = useMemo(() => {
    const colorValues = tiles.flatMap((tile) =>
      tile.node.colorValue === undefined ? [] : [tile.node.colorValue],
    );
    if (colorValues.length === 0) {
      return undefined;
    }
    const isBothSigns =
      colorValues.some((value) => value < 0) && colorValues.some((value) => value > 0);
    const extent = Math.max(...colorValues.map(Math.abs));
    return resolveHeatScale(
      colorValues,
      colorScale ??
        (isBothSigns ? { type: 'diverging', midpoint: 0, min: -extent, max: extent } : {}),
    );
  }, [tiles, colorScale]);

  const formatColor = useCallback(
    (value: number) => (formatColorValue ? formatColorValue(value) : formatValue(value, locale)),
    [formatColorValue, locale],
  );
  const share = (node: TreemapNode, total: number) =>
    formatPercent(total > 0 ? ((values.get(node.id) ?? 0) / total) * 100 : 0, locale);
  const nameOf = (node: TreemapNode, total = viewTotal) => {
    const name = messages.treemapNode({
      label: node.label,
      value: formatValue(values.get(node.id) ?? 0, locale, unit),
      share: share(node, total),
    });
    return node.colorValue === undefined
      ? name
      : messages.treemapNodeWithColor({ name, colorValue: formatColor(node.colorValue) });
  };
  const background = (tile: Tile) => {
    if (tile.node.color !== undefined) {
      return palette.series(tile.node.color, 0);
    }
    if (tile.node.colorValue !== undefined && scale) {
      return heatColor(tile.node.colorValue, scale, look);
    }
    return palette.series(undefined, tile.group);
  };

  // Keyboard focus: one tile is the tab stop (roving tabindex).
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isFocusWithin, setFocusWithin] = useState(false);
  const treeRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const active = tiles.find((tile) => tile.node.id === activeId) ?? tiles[0];
  // A drill waiting to animate and, when it came from the keyboard or a press inside, to move focus.
  const pending = useRef<{ direction: 'in' | 'out'; rect?: TreemapRect; id?: string } | null>(null);

  const focusTile = (id: string) => {
    setActiveId(id);
    treeRef.current?.querySelector<HTMLElement>(`[data-node="${CSS.escape(id)}"]`)?.focus();
  };

  const drillTo = (next: readonly string[], from?: Tile) => {
    if (next.length > path.length) {
      pending.current = { direction: 'in', rect: from?.rect };
    } else {
      pending.current = { direction: 'out', id: path[next.length] };
    }
    setHoveredId(null);
    setPath(next);
  };

  // After a drill: animate from the pressed tile (or back to the one left), and put focus on the new level.
  useLayoutEffect(() => {
    const drill = pending.current;
    if (!drill) {
      return;
    }
    pending.current = null;
    const target =
      drill.direction === 'out' ? tiles.find((tile) => tile.node.id === drill.id) : tiles[0];
    if (target) {
      setActiveId(target.node.id);
    }
    const container = treeRef.current;
    if (container?.contains(document.activeElement) || document.activeElement === document.body) {
      const element = target
        ? container?.querySelector<HTMLElement>(`[data-node="${CSS.escape(target.node.id)}"]`)
        : undefined;
      element?.focus();
    }
    const layer = layerRef.current;
    const rect = drill.direction === 'in' ? drill.rect : target?.rect;
    if (!layer || !rect || isReducedMotion || size.width <= 0 || size.height <= 0) {
      return;
    }
    const sx = rect.width / size.width;
    const sy = rect.height / size.height;
    // Drilling in grows the level from the pressed tile; going up shrinks the old level into its tile.
    const transform =
      drill.direction === 'in'
        ? `translate(${String(rect.x)}px, ${String(rect.y)}px) scale(${String(sx)}, ${String(sy)})`
        : `scale(${String(1 / sx)}, ${String(1 / sy)}) translate(${String(-rect.x)}px, ${String(-rect.y)}px)`;
    layer.style.transition = 'none';
    layer.style.transformOrigin = '0 0';
    layer.style.transform = transform;
    layer.style.opacity = drill.direction === 'in' ? '0.4' : '0';
    // Apply the start state before transitioning from it.
    layer.getBoundingClientRect();
    layer.style.transition = 'transform 280ms ease-out, opacity 280ms ease-out';
    layer.style.transform = '';
    layer.style.opacity = '';
  }, [tiles, isReducedMotion, size.width, size.height]);

  const press = (tile: Tile) => {
    onNodePress?.(tile.node.id);
    if (isDrillable && hasChildren(tile.node)) {
      drillTo(
        tile.depth === 1 ? [...path, tile.node.id] : [...path, tile.parentId ?? '', tile.node.id],
        tile,
      );
    }
  };

  // Visual order for the arrow keys: each top-level tile, then the tiles inside it.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!active) {
      return;
    }
    const index = tiles.indexOf(active);
    let next: Tile | undefined;
    switch (event.key) {
      case 'ArrowDown':
        next = tiles[index + 1];
        break;
      case 'ArrowUp':
        next = tiles[index - 1];
        break;
      case 'ArrowRight':
        next = active.isOpen ? tiles[index + 1] : undefined;
        break;
      case 'ArrowLeft':
        next =
          active.depth === 2 ? tiles.find((tile) => tile.node.id === active.parentId) : undefined;
        break;
      case 'Home':
        next = tiles[0];
        break;
      case 'End':
        next = tiles.at(-1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        press(active);
        return;
      case 'Backspace':
        if (path.length > 0) {
          event.preventDefault();
          drillTo(path.slice(0, -1));
        }
        return;
      default:
        return;
    }
    event.preventDefault();
    if (next) {
      focusTile(next.node.id);
    }
  };

  const summary = (() => {
    if (viewTotal <= 0) {
      return messages.noData;
    }
    const parts = [
      messages.treemapSummary({
        label: view.label,
        count: countLeaves(view),
        total: formatValue(viewTotal, locale, unit),
      }),
    ];
    const largest = [...(view.children ?? [])].sort(
      (a, b) => (values.get(b.id) ?? 0) - (values.get(a.id) ?? 0),
    )[0];
    if (largest) {
      parts.push(
        messages.treemapLargest({
          label: largest.label,
          value: formatValue(values.get(largest.id) ?? 0, locale, unit),
          share: share(largest, viewTotal),
        }),
      );
    }
    return parts.join(' ');
  })();

  const rootTotal = values.get(data.id) ?? 0;
  const hasColorValues = useMemo(() => {
    const visit = (node: TreemapNode): boolean =>
      node.colorValue !== undefined || (node.children ?? []).some(visit);
    return (data.children ?? []).some(visit);
  }, [data]);

  const table = (): ChartTable => {
    const rows: Record<string, unknown>[] = [];
    const visit = (node: TreemapNode, labels: readonly string[]) => {
      for (const child of node.children ?? []) {
        const names = [...labels, child.label];
        rows.push({
          __key: child.id,
          item: names.join(' / '),
          value: values.get(child.id) ?? 0,
          share: rootTotal > 0 ? ((values.get(child.id) ?? 0) / rootTotal) * 100 : 0,
          colorValue: child.colorValue ?? null,
        });
        visit(child, names);
      }
    };
    visit(data, []);
    const columns: DataTableColumn<Record<string, unknown>>[] = [
      { id: 'item', header: messages.treemapItem, isRowHeader: true, value: (row) => row.item },
      {
        id: 'value',
        header: unit ? `${messages.treemapValue} (${unit})` : messages.treemapValue,
        align: 'end',
        mobile: true,
        value: (row) => row.value,
        cell: ({ value }) => (typeof value === 'number' ? formatValue(value, locale) : ''),
      },
      {
        id: 'share',
        header: messages.treemapShare,
        align: 'end',
        value: (row) => row.share,
        cell: ({ value }) => (typeof value === 'number' ? formatPercent(value, locale) : ''),
      },
      ...(hasColorValues
        ? [
            {
              id: 'colorValue',
              header: colorValueLabel ?? messages.treemapColorValue,
              align: 'end' as const,
              value: (row: Record<string, unknown>) => row.colorValue,
              cell: ({ value }: { value: unknown }) =>
                typeof value === 'number' ? formatColor(value) : '',
            },
          ]
        : []),
    ];
    return { columns, rows };
  };

  // The table view: the whole hierarchy as a nested list, each item with its value and share of the total.
  const renderList = (node: TreemapNode, isTop: boolean) => (
    <ul className={cn('flex flex-col gap-1', !isTop && 'mt-1 border-s border-border ps-4')}>
      {[...(node.children ?? [])]
        .sort((a, b) => (values.get(b.id) ?? 0) - (values.get(a.id) ?? 0))
        .map((child) => (
          <li key={child.id} className="text-sm text-fg">
            <span className="font-medium">{child.label}</span>{' '}
            <span className="text-fg-muted tabular-nums">
              {formatValue(values.get(child.id) ?? 0, locale, unit)}, {share(child, rootTotal)}
              {child.colorValue !== undefined && <>, {formatColor(child.colorValue)}</>}
            </span>
            {hasChildren(child) && renderList(child, false)}
          </li>
        ))}
    </ul>
  );

  const toSvg = () => {
    const width = Math.max(1, Math.round(size.width));
    const svgHeight = Math.max(1, Math.round(size.height)) + 32;
    const parts = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${String(width)}" height="${String(svgHeight)}" font-family="${escapeXml(look.font)}" font-size="12">`,
      `<rect width="100%" height="100%" fill="${look.surface}"/>`,
      `<text x="4" y="20" font-size="14" font-weight="600" fill="${look.text}">${escapeXml(frame.title)}</text>`,
    ];
    for (const tile of tiles) {
      const fill = tile.isOpen ? look.surface : background(tile);
      const { x, y, width: w, height: h } = tile.rect;
      parts.push(
        `<rect x="${String(x + 1)}" y="${String(y + 33)}" width="${String(Math.max(0, w - 2))}" height="${String(Math.max(0, h - 2))}" fill="${fill}" stroke="${look.border}" stroke-width="${tile.isOpen ? '1' : '0'}"/>`,
      );
      if (w >= 44 && h >= 22) {
        parts.push(
          `<text x="${String(x + 6)}" y="${String(y + 33 + 16)}" fill="${tile.isOpen ? look.text : textOn(fill, look)}">${escapeXml(tile.node.label)}</text>`,
        );
      }
    }
    parts.push('</svg>');
    return { svg: parts.join(''), width, height: svgHeight };
  };

  const tooltipTile = tiles.find(
    (tile) => tile.node.id === (hoveredId ?? (isFocusWithin ? active?.node.id : undefined)),
  );

  const renderTile = (tile: Tile, offset: { x: number; y: number }): ReactNode => {
    const { node, rect } = tile;
    const isActive = tile === active;
    const fill = tile.isOpen ? undefined : background(tile);
    const color = fill === undefined ? undefined : textOn(fill, look);
    // Small text that wouldn't reach 4.5:1 on the tile's colour sits on a chip.
    const isChipped = fill !== undefined && color !== undefined && contrast(color, fill) < 4.5;
    const isLabelled = rect.width >= 44 && rect.height >= 22;
    const isPressable = (isDrillable && hasChildren(node)) || onNodePress !== undefined;
    const groupId = `${baseId}-${node.id}`;
    const value = formatValue(values.get(node.id) ?? 0, locale, unit);
    const textClass = isChipped
      ? 'w-fit max-w-full truncate rounded-[2px] bg-surface-1 px-0.5 text-fg'
      : 'max-w-full truncate';
    const item = (
      // The tree handles the keyboard for every tile (arrows, Home, End, Enter, Space, Backspace).
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events
      <div
        key={node.id}
        role="treeitem"
        aria-label={nameOf(node)}
        aria-level={tile.depth}
        aria-posinset={tile.position}
        aria-setsize={tile.siblings}
        aria-expanded={tile.isOpen ? true : undefined}
        // The tiles inside an open group are drawn over it, in a group of their own that this item owns.
        aria-owns={tile.isOpen ? groupId : undefined}
        // Selection follows focus: the focused tile is the one the tooltip and Enter act on.
        aria-selected={isActive}
        data-node={node.id}
        tabIndex={isActive ? 0 : -1}
        onFocus={() => {
          setActiveId(node.id);
        }}
        onClick={() => {
          setActiveId(node.id);
          press(tile);
        }}
        onPointerEnter={() => {
          setHoveredId(node.id);
        }}
        onPointerLeave={() => {
          setHoveredId((current) => (current === node.id ? null : current));
        }}
        // Dynamic geometry and data: the tile's place in the layout and its colour.
        // eslint-disable-next-line no-restricted-syntax
        style={{
          left: rect.x - offset.x,
          top: rect.y - offset.y,
          width: rect.width,
          height: rect.height,
          backgroundColor: fill,
          color,
        }}
        className={cn(
          'group/tile absolute overflow-hidden border border-surface-1 outline-none',
          tile.isOpen
            ? // An open group shows focus by filling its frame (the header and the edges around its tiles).
              'rounded-[4px] bg-surface-2 text-fg focus-visible:bg-accent-solid focus-visible:text-accent-on-solid'
            : // A two-tone ring inside the tile, visible on every colour and never clipped at the plot's edge.
              'rounded-[3px] focus-visible:shadow-[inset_0_0_0_2px_var(--color-surface-1)] focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-focus',
          isPressable && 'cursor-pointer',
        )}
      >
        {tile.isOpen ? (
          <span
            aria-hidden="true"
            data-node-header={node.id}
            className="flex h-6 items-center gap-1 truncate px-1.5 text-xs font-semibold"
          >
            <span className="truncate">{node.label}</span>{' '}
            <span className="shrink-0 font-normal text-fg-muted tabular-nums group-focus-visible/tile:text-accent-on-solid">
              {value}
            </span>
          </span>
        ) : (
          isLabelled && (
            <span
              aria-hidden="true"
              className="flex flex-col items-start gap-px p-1 text-xs leading-tight font-medium"
            >
              <span className={textClass}>{node.label}</span>
              {rect.height >= 40 && (
                <>
                  {' '}
                  <span className={cn(textClass, 'font-normal tabular-nums')}>{value}</span>
                </>
              )}
            </span>
          )
        )}
      </div>
    );
    if (!tile.isOpen) {
      return item;
    }
    const inner = {
      x: rect.x + INSET,
      y: rect.y + HEADER,
      width: rect.width - INSET * 2,
      height: rect.height - HEADER - INSET,
    };
    return (
      <Fragment key={node.id}>
        {item}
        <div
          id={groupId}
          role="group"
          className="absolute"
          // Dynamic geometry: the open group's inner area.
          // eslint-disable-next-line no-restricted-syntax
          style={{
            left: inner.x - offset.x,
            top: inner.y - offset.y,
            width: inner.width,
            height: inner.height,
          }}
        >
          {tiles
            .filter((child) => child.parentId === node.id)
            .map((child) => renderTile(child, inner))}
        </div>
      </Fragment>
    );
  };

  return (
    <ChartFrame
      {...frame}
      height={height}
      exportFileName={exportFileName}
      summary={summary}
      isEmpty={rootTotal <= 0}
      legend={[]}
      onToggleSeries={() => undefined}
      onHighlightSeries={() => undefined}
      table={table}
      renderTable={() => (
        <ScrollRegion aria-label={frame.title} maxHeight={height}>
          {renderList(data, true)}
        </ScrollRegion>
      )}
      onExportPng={() => {
        downloadSvgAsPng(toSvg(), exportFileName ?? 'treemap');
      }}
      onExportCsv={() => {
        const result = table();
        downloadCsv(toCsv(result.rows, result.columns), exportFileName ?? 'treemap');
      }}
      plot={({ titleId, summaryId }) => (
        <div className="flex min-w-0 flex-col gap-2">
          {path.length > 0 && (
            <ol
              aria-label={messages.treemapLevels}
              className="flex min-w-0 flex-wrap items-center gap-x-1 text-sm"
            >
              {trail.map((node, index) => (
                <li key={node.id} className="flex min-w-0 items-center gap-1">
                  {index > 0 && (
                    <ChevronRight
                      aria-hidden="true"
                      className="size-4 shrink-0 text-fg-muted rtl:rotate-180"
                    />
                  )}
                  {index === trail.length - 1 ? (
                    <span aria-current="location" className="truncate font-medium text-fg">
                      {node.label}
                    </span>
                  ) : (
                    <Button
                      variant="link"
                      size="sm"
                      onPress={() => {
                        drillTo(path.slice(0, index));
                      }}
                    >
                      {node.label}
                    </Button>
                  )}
                </li>
              ))}
            </ol>
          )}
          <div
            ref={boxRef}
            className="relative w-full min-w-0 max-sm:aspect-[4/3] sm:h-(--chart-height)"
            // Dynamic geometry: the plot's height from the `height` prop.
            // eslint-disable-next-line no-restricted-syntax
            style={{ '--chart-height': height } as CSSProperties}
          >
            <div className="absolute inset-0 overflow-hidden rounded-[4px]">
              <div
                ref={(element) => {
                  treeRef.current = element;
                  layerRef.current = element;
                }}
                role="tree"
                // Focus sits on one tile at a time (roving tabindex); the tree itself isn't a tab stop.
                tabIndex={-1}
                aria-labelledby={titleId}
                aria-describedby={summaryId}
                onKeyDown={onKeyDown}
                onFocus={() => {
                  setFocusWithin(true);
                }}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setFocusWithin(false);
                  }
                }}
                className="absolute inset-0"
              >
                {tiles
                  .filter((tile) => tile.depth === 1)
                  .map((tile) => renderTile(tile, { x: 0, y: 0 }))}
              </div>
            </div>
            {tooltipTile && (
              <span
                aria-hidden="true"
                className={cn(
                  'pointer-events-none absolute z-10 w-max max-w-[min(16rem,100%)] -translate-x-1/2 rounded-control bg-fg px-2 py-1 text-xs text-fg-inverse shadow-overlay rtl:translate-x-1/2',
                  tooltipTile.rect.y >= 32 ? '-translate-y-full' : '',
                )}
                // Dynamic geometry: over the tile, kept inside the plot's width.
                // eslint-disable-next-line no-restricted-syntax
                style={{
                  left: Math.min(
                    Math.max(tooltipTile.rect.x + tooltipTile.rect.width / 2, 72),
                    Math.max(72, size.width - 72),
                  ),
                  top: tooltipTile.rect.y >= 32 ? tooltipTile.rect.y - 4 : tooltipTile.rect.y + 28,
                }}
              >
                {nameOf(tooltipTile.node)}
              </span>
            )}
          </div>
        </div>
      )}
    />
  );
}
