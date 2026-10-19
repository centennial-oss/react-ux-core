// SankeyChart: flows between stages, such as energy from sources to uses or a budget from income to spending. Nodes
// stand in columns from left to right, as tall as the larger of what flows in and out, and each flow is a band as wide
// as its value, in its source's (or target's) colour. Hovering or tapping a band or node highlights its flows and names them with
// their values. The layout (sankeyLayout.ts) has no dependencies. The summary gives the total and the largest flow;
// the table lists every flow with its share of its source's outflow.

import { useMemo, useState, type CSSProperties, type PointerEvent } from 'react';
import { useLocale } from 'react-aria-components';
import type { DataTableColumn } from '../table/types';
import { cn } from '../utils/cn';
import { useIsPhone } from '../utils/useMediaQuery';
import { useElementSize, type ElementSize } from '../utils/useElementSize';
import { clamp } from '../utils/math';
import { escapeXml } from '../utils/text';
import { ChartFrame, type ChartFrameOptions, type ChartTable } from './ChartFrame';
import { withAlpha, type ChartColor } from './colors';
import { formatPercent, formatValue } from './format';
import { useChartMessages } from './messages';
import { sankeyStrings } from './plotStrings';
import { sankeyLayout, sankeyLinkPath, type SankeyLinkInput } from './sankeyLayout';
import { downloadSvgAsPng } from './svgImage';
import { numberColumn, withUnit } from './tableColumns';
import { useChartLook } from './useChart';

export interface SankeyNode {
  id: string;
  label: string;
  /** Defaults to the next palette colour. Flows take their source's colour (or target's, with `linkColor`). */
  color?: ChartColor;
}

/** A flow of `value` from the `source` node to the `target` node. */
export type SankeyLink = SankeyLinkInput;

export interface SankeyChartProps extends ChartFrameOptions {
  nodes: readonly SankeyNode[];
  /** The flows. Each should go from an earlier stage to a later one; cycles are drawn as far as they can be. */
  links: readonly SankeyLink[];
  /** The values' unit ("TWh"). */
  unit?: string;
  /** Colours each flow by its `source` node (the default) or its `target` node. */
  linkColor?: 'source' | 'target';
}

const NODE_WIDTH = 12;

type Hovered = { kind: 'node'; id: string } | { kind: 'link'; index: number };

/** The plot's size before it's measured. */
const noSize: ElementSize = { width: 0, height: 0 };

/**
 * A Sankey diagram: flows between nodes in columns, each band as wide as its value. It has a title, a generated
 * summary, "View as table" (one row per flow), PNG and CSV export, and full screen.
 */
export function SankeyChart({
  nodes,
  links,
  unit,
  linkColor = 'source',
  height = '18rem',
  ...frame
}: SankeyChartProps) {
  const messages = useChartMessages(sankeyStrings);
  const { locale } = useLocale();
  const { palette } = useChartLook();
  const isNarrow = useIsPhone();
  const [boxRef, measured] = useElementSize({ box: 'border' });
  const size = measured ?? noSize;
  const [hovered, setHovered] = useState<Hovered | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const nodeIds = useMemo(() => nodes.map((node) => node.id), [nodes]);
  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const labelOf = (id: string) => byId.get(id)?.label ?? id;
  // Room for labels above the first node and below the last.
  const padding = 4;
  const layout = useMemo(
    () =>
      sankeyLayout(nodeIds, links, size.width, Math.max(0, size.height - padding * 2), {
        nodeWidth: NODE_WIDTH,
        nodePadding: isNarrow ? 8 : 12,
      }),
    [nodeIds, links, size.width, size.height, isNarrow],
  );
  // The flows themselves, without the box: the summary and table don't wait for the plot to be measured.
  const flows = useMemo(() => sankeyLayout(nodeIds, links, 1, 1).links, [nodeIds, links]);
  const colorOf = (id: string) => {
    const index = nodeIds.indexOf(id);
    return palette.series(byId.get(id)?.color, Math.max(0, index));
  };

  const isLinkActive = (link: { index: number; source: string; target: string }) =>
    hovered === null ||
    (hovered.kind === 'link'
      ? hovered.index === link.index
      : hovered.id === link.source || hovered.id === link.target);
  const isNodeActive = (id: string) =>
    hovered === null ||
    (hovered.kind === 'node'
      ? hovered.id === id
      : flows.some(
          (link) => link.index === hovered.index && (link.source === id || link.target === id),
        ));

  const valueText = (value: number) => formatValue(value, locale, unit);
  const linkText = (link: { source: string; target: string; value: number }) =>
    messages.sankeyFlow({
      source: labelOf(link.source),
      target: labelOf(link.target),
      value: valueText(link.value),
    });

  const show = (event: PointerEvent<SVGElement>, next: Hovered, text: string) => {
    const box = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    setHovered(next);
    setTooltip({
      x: box ? event.clientX - box.left : 0,
      y: box ? event.clientY - box.top : 0,
      text,
    });
  };
  const hide = () => {
    setHovered(null);
    setTooltip(null);
  };

  const summary = useMemo(() => {
    if (flows.length === 0) {
      return messages.noData;
    }
    const targets = new Set(flows.map((link) => link.target));
    const total = flows
      .filter((link) => !targets.has(link.source))
      .reduce((sum, link) => sum + link.value, 0);
    const used = new Set(flows.flatMap((link) => [link.source, link.target]));
    const largest = flows.reduce((best, link) => (link.value > best.value ? link : best));
    return [
      messages.sankeySummary({
        nodes: used.size,
        flows: flows.length,
        total: formatValue(total, locale, unit),
      }),
      messages.sankeyLargest({
        source: byId.get(largest.source)?.label ?? largest.source,
        target: byId.get(largest.target)?.label ?? largest.target,
        value: formatValue(largest.value, locale, unit),
      }),
    ].join(' ');
  }, [flows, messages, locale, unit, byId]);

  const table = (): ChartTable => {
    const outflow = new Map<string, number>();
    for (const link of flows) {
      outflow.set(link.source, (outflow.get(link.source) ?? 0) + link.value);
    }
    const columns: DataTableColumn<Record<string, unknown>>[] = [
      {
        id: 'source',
        header: messages.sankeySource,
        isRowHeader: true,
        isSortable: true,
        value: (row) => row.source,
      },
      {
        id: 'target',
        header: messages.sankeyTarget,
        isSortable: true,
        mobile: true,
        value: (row) => row.target,
      },
      numberColumn(
        'value',
        withUnit(messages.sankeyValue, unit),
        (value) => formatValue(value, locale),
        { isSortable: true, mobile: true },
      ),
      numberColumn('share', messages.sankeyShare, (value) => formatPercent(value, locale), {
        isSortable: true,
      }),
    ];
    return {
      columns,
      rows: flows.map((link) => ({
        __key: link.index,
        source: labelOf(link.source),
        target: labelOf(link.target),
        value: link.value,
        share: (link.value / (outflow.get(link.source) ?? link.value)) * 100,
      })),
    };
  };

  const labelX = (node: { x: number; column: number }) =>
    node.column === layout.columns - 1 ? node.x - 6 : node.x + NODE_WIDTH + 6;
  const labelAnchor = (node: { column: number }) =>
    node.column === layout.columns - 1 && layout.columns > 1 ? 'end' : 'start';
  const [fontSize, ...fontRest] = palette.font.split(' ');
  const fontFamily = fontRest.join(' ');

  const toSvg = () => {
    const width = Math.max(1, Math.round(size.width));
    const svgHeight = Math.max(1, Math.round(size.height)) + 32;
    const parts = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${String(width)}" height="${String(svgHeight)}" font-family="${escapeXml(fontFamily)}" font-size="12">`,
      `<rect width="100%" height="100%" fill="${palette.surface}"/>`,
      `<text x="4" y="20" font-size="14" font-weight="600" fill="${palette.text}">${escapeXml(frame.title)}</text>`,
      `<g transform="translate(0 ${String(32 + padding)})">`,
    ];
    for (const link of layout.links) {
      parts.push(
        `<path d="${sankeyLinkPath(link)}" fill="none" stroke="${withAlpha(colorOf(link[linkColor]), 0.35)}" stroke-width="${String(Math.max(1, link.width))}"/>`,
      );
    }
    for (const node of layout.nodes) {
      parts.push(
        `<rect x="${String(node.x)}" y="${String(node.y)}" width="${String(NODE_WIDTH)}" height="${String(node.height)}" fill="${colorOf(node.id)}"/>`,
        `<text x="${String(labelX(node))}" y="${String(node.y + node.height / 2)}" dominant-baseline="middle" text-anchor="${labelAnchor(node)}" fill="${palette.text}">${escapeXml(`${labelOf(node.id)} ${formatValue(node.value, locale)}`)}</text>`,
      );
    }
    parts.push('</g></svg>');
    return { svg: parts.join(''), width, height: svgHeight };
  };

  return (
    <ChartFrame
      {...frame}
      height={height}
      summary={summary}
      isEmpty={flows.length === 0}
      table={table}
      exportPng={(name) => {
        downloadSvgAsPng(toSvg(), name);
      }}
      defaultExportName="sankey"
      plot={({ titleId, summaryId }) => (
        <div
          ref={boxRef}
          className="relative w-full min-w-0 max-sm:aspect-[4/3] sm:h-(--chart-height)"
          // Dynamic geometry: the plot's height from the `height` prop.
          // eslint-disable-next-line no-restricted-syntax
          style={{ '--chart-height': height } as CSSProperties}
        >
          {size.width > 0 && (
            <svg
              role="img"
              aria-labelledby={titleId}
              aria-describedby={summaryId}
              width={size.width}
              height={size.height}
              className="absolute inset-0 overflow-visible"
              fontFamily={fontFamily}
              fontSize={Number.parseFloat(fontSize ?? '12')}
              onPointerLeave={hide}
            >
              <g transform={`translate(0 ${String(padding)})`}>
                {layout.links.map((link) => (
                  <path
                    key={link.index}
                    d={sankeyLinkPath(link)}
                    fill="none"
                    stroke={withAlpha(colorOf(link[linkColor]), isLinkActive(link) ? 0.4 : 0.1)}
                    strokeWidth={Math.max(1, link.width)}
                    data-link={link.index}
                    onPointerMove={(event) => {
                      show(event, { kind: 'link', index: link.index }, linkText(link));
                    }}
                    onPointerDown={(event) => {
                      show(event, { kind: 'link', index: link.index }, linkText(link));
                    }}
                  />
                ))}
                {layout.nodes.map((node) => {
                  const text = messages.sankeyNode({
                    label: labelOf(node.id),
                    value: valueText(node.value),
                  });
                  return (
                    <g key={node.id} data-node={node.id}>
                      <rect
                        x={node.x}
                        y={node.y}
                        width={NODE_WIDTH}
                        height={node.height}
                        rx={2}
                        fill={withAlpha(colorOf(node.id), isNodeActive(node.id) ? 1 : 0.35)}
                        onPointerMove={(event) => {
                          show(event, { kind: 'node', id: node.id }, text);
                        }}
                        onPointerDown={(event) => {
                          show(event, { kind: 'node', id: node.id }, text);
                        }}
                      />
                      <text
                        x={labelX(node)}
                        y={node.y + node.height / 2}
                        dominantBaseline="middle"
                        textAnchor={labelAnchor(node)}
                        fill={palette.text}
                        // A halo in the surface colour keeps the label readable over the bands.
                        stroke={palette.surface}
                        strokeWidth={3}
                        paintOrder="stroke"
                        className="pointer-events-none"
                      >
                        {labelOf(node.id)}
                        <tspan fill={palette.mutedText} dx={4}>
                          {formatValue(node.value, locale)}
                        </tspan>
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          )}
          {tooltip && (
            <span
              aria-hidden="true"
              className={cn(
                'pointer-events-none absolute z-10 w-max max-w-[min(16rem,100%)] -translate-x-1/2 rounded-control bg-fg px-2 py-1 text-xs text-fg-inverse shadow-overlay',
                tooltip.y >= 36 ? '-translate-y-full' : 'translate-y-4',
              )}
              // Dynamic geometry: by the pointer, kept inside the plot's width.
              // eslint-disable-next-line no-restricted-syntax
              style={{
                left: clamp(tooltip.x, 72, Math.max(72, size.width - 72)),
                top: tooltip.y >= 36 ? tooltip.y - 8 : tooltip.y,
              }}
            >
              {tooltip.text}
            </span>
          )}
        </div>
      )}
    />
  );
}
