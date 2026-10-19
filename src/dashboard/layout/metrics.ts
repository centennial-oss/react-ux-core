// Grid settings and the sizing algorithm (§5.1, §5.3, §6): pure functions, like the rest of the layout engine. The
// grid component measures its container and passes the numbers in; nothing here reads the DOM.

import { clamp } from '../../utils/math';
import { layoutRows, MAX_COLUMNS, type Compaction, type GridRect } from './engine';

/** How rows get their height: fill the screen with `rowsPerScreen` rows, fit the whole page, or a fixed height. */
export type RowSizing = 'fitRows' | 'fitPage' | 'fixed';

/** Spacing: `auto` is compact on small or low screens (RESP-11), regular otherwise. */
export type GridDensity = 'auto' | 'regular' | 'compact';

/** A breakpoint: from `minWidth` of container width up, the grid has `columns` columns (RESP-01). */
export interface GridBreakpoint {
  id: string;
  /** A CSS length in `px` or `rem`, or pixels. */
  minWidth: string | number;
  /** A count, the page's own column count (`canonical`), or half of it rounded up (`half`). */
  columns: number | 'canonical' | 'half';
  /** Overrides the grid's row sizing at this breakpoint. */
  rowSizing?: RowSizing;
}

/** The grid's settings (§5.1). Lengths are CSS lengths in `px` or `rem`. */
export interface GridSpec {
  /** The canonical column count, 1–48. Defaults to 12. */
  columns: number;
  /** Defaults to `fitRows`. */
  rowSizing: RowSizing;
  /** Rows that fill the visible height with `fitRows`, 1–48. Defaults to 12. */
  rowsPerScreen: number;
  /** The row height with `fixed` (and when stacked), at least 1.5rem. Defaults to 4rem. */
  rowHeight: string;
  /** The floor for `fitRows` and `fitPage`; below it the grid scrolls. Defaults to 3rem. */
  minRowHeight: string;
  /** An optional ceiling for `fitRows` and `fitPage`. */
  maxRowHeight?: string;
  /** Space between cells. Defaults to 0.75rem, or 0.5rem when compact. */
  gap?: string;
  /** Space around the grid. Defaults to 0.75rem, or 0.5rem when compact. */
  padding?: string;
  /** Defaults to `auto`. */
  density: GridDensity;
  /** Defaults to `vertical`. */
  compaction: Compaction;
  /** The narrowest legible column, at least 1rem; narrower grids drop to fewer columns. Defaults to 3.5rem. */
  minColumnWidth: string;
  /** From narrowest to widest. Defaults to `stack`, `half` and `full` (§6.1). */
  breakpoints: readonly GridBreakpoint[];
  /** `auto` scales content up on wide containers (RESP-07); a number (0.75–3) fixes it; `none` is 1. */
  contentScale: 'auto' | 'none' | number;
  /** Caps the grid's width and centres it (RESP-09). */
  maxContentWidth?: string;
}

/** The default breakpoints (§6.1): stacked under 42rem, half the columns under 64rem, then all of them. */
export const DEFAULT_BREAKPOINTS: readonly GridBreakpoint[] = [
  { id: 'stack', minWidth: 0, columns: 1, rowSizing: 'fixed' },
  { id: 'half', minWidth: '42rem', columns: 'half', rowSizing: 'fixed' },
  { id: 'full', minWidth: '64rem', columns: 'canonical' },
];

/** The default grid settings (§5.1). */
export const DEFAULT_GRID_SPEC: GridSpec = {
  columns: 12,
  rowSizing: 'fitRows',
  rowsPerScreen: 12,
  rowHeight: '4rem',
  minRowHeight: '3rem',
  density: 'auto',
  compaction: 'vertical',
  minColumnWidth: '3.5rem',
  breakpoints: DEFAULT_BREAKPOINTS,
  contentScale: 'auto',
};

const REM = 16;

/**
 * A CSS length in pixels: a number, or a string in `px` or `rem` (`em` counts as `rem`). Other units can't be
 * resolved without the DOM, so they give `undefined`.
 */
export function cssLengthToPx(value: string | number | undefined, remPx = REM): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  const match = /^\s*(-?\d*\.?\d+)\s*(px|r?em)?\s*$/.exec(value ?? '');
  if (!match) {
    return undefined;
  }
  const amount = Number(match[1]);
  return match[2] === 'rem' || match[2] === 'em' ? amount * remPx : amount;
}

/** A problem found while merging grid settings: the setting and why its value was replaced. */
export interface GridSpecIssue {
  setting: string;
  message: string;
}

const ROW_SIZINGS: readonly RowSizing[] = ['fitRows', 'fitPage', 'fixed'];
const DENSITIES: readonly GridDensity[] = ['auto', 'regular', 'compact'];
const COMPACTIONS: readonly Compaction[] = ['vertical', 'none'];

/**
 * Grid settings merged field by field (later levels win: props, then dashboard, then page; GRID-01), with invalid
 * values replaced by the nearest allowed value or the default (GRID-02). The issues list what was replaced, for a
 * development warning; nothing throws.
 */
export function mergeGridSpec(...levels: (Partial<GridSpec> | undefined)[]): {
  spec: GridSpec;
  issues: GridSpecIssue[];
} {
  const merged: GridSpec = { ...DEFAULT_GRID_SPEC };
  for (const level of levels) {
    for (const [key, value] of Object.entries(level ?? {}) as [string, unknown][]) {
      if (value !== undefined) {
        (merged as unknown as Record<string, unknown>)[key] = value;
      }
    }
  }
  const issues: GridSpecIssue[] = [];
  const report = (setting: string, message: string) => {
    issues.push({ setting, message });
  };
  const count = (setting: 'columns' | 'rowsPerScreen', min: number, max: number) => {
    const value = merged[setting];
    const fixed = Number.isFinite(value)
      ? clamp(Math.round(value), min, max)
      : DEFAULT_GRID_SPEC[setting];
    if (fixed !== value) {
      report(
        setting,
        `${String(value)} is outside ${String(min)}–${String(max)}; using ${String(fixed)}.`,
      );
      merged[setting] = fixed;
    }
  };
  count('columns', 1, Math.min(48, MAX_COLUMNS));
  count('rowsPerScreen', 1, 48);
  const length = (
    setting:
      | 'rowHeight'
      | 'minRowHeight'
      | 'maxRowHeight'
      | 'gap'
      | 'padding'
      | 'minColumnWidth'
      | 'maxContentWidth',
    minPx: number,
  ) => {
    const value = merged[setting];
    if (value === undefined) {
      return;
    }
    const px = cssLengthToPx(value);
    if (px === undefined) {
      report(setting, `"${value}" isn't a length in px or rem; using the default.`);
      const fallback = DEFAULT_GRID_SPEC[setting];
      if (fallback === undefined) {
        Reflect.deleteProperty(merged, setting);
      } else {
        merged[setting] = fallback;
      }
    } else if (px < minPx) {
      report(setting, `"${value}" is below the minimum; using ${String(minPx)}px.`);
      merged[setting] = `${String(minPx)}px`;
    }
  };
  length('rowHeight', 24);
  length('minRowHeight', 24);
  length('maxRowHeight', 24);
  length('gap', 0);
  length('padding', 0);
  length('minColumnWidth', 16);
  length('maxContentWidth', 0);
  const choice = <K extends 'rowSizing' | 'density' | 'compaction'>(
    setting: K,
    allowed: readonly GridSpec[K][],
  ) => {
    const value: unknown = merged[setting];
    if (!allowed.includes(value as GridSpec[K])) {
      report(setting, `"${String(value)}" isn't one of ${allowed.join(', ')}.`);
      merged[setting] = DEFAULT_GRID_SPEC[setting];
    }
  };
  choice('rowSizing', ROW_SIZINGS);
  choice('density', DENSITIES);
  choice('compaction', COMPACTIONS);
  // Values come from documents and props, so anything can arrive here.
  const scale: unknown = merged.contentScale;
  if (typeof scale === 'number') {
    const fixed = Number.isFinite(scale) ? clamp(scale, 0.75, 3) : 1;
    if (fixed !== scale) {
      report('contentScale', `${String(scale)} is outside 0.75–3; using ${String(fixed)}.`);
      merged.contentScale = fixed;
    }
  } else if (scale !== 'auto' && scale !== 'none') {
    report('contentScale', `"${String(scale)}" isn't auto, none or a number.`);
    merged.contentScale = 'auto';
  }
  if (!Array.isArray(merged.breakpoints) || merged.breakpoints.length === 0) {
    report('breakpoints', 'There are no breakpoints; using the defaults.');
    merged.breakpoints = DEFAULT_BREAKPOINTS;
  }
  return { spec: merged, issues };
}

/** The size of the grid's container and the screen, in CSS pixels. */
export interface GridViewport {
  /** The container's width, padding included. */
  width: number;
  /** The container's visible height (its client height, GRID-10). */
  height: number;
  /** The window's size, for `density: 'auto'`. Defaults to the container's. */
  viewportWidth?: number;
  viewportHeight?: number;
  /** Pixels per rem. Defaults to 16. */
  remPx?: number;
}

/** The resolved grid (§5.3 step 5): what to lay widgets out with. */
export interface GridMetrics {
  /** The active breakpoint's id. */
  breakpoint: string;
  /** The active column count. */
  columns: number;
  /** Whether the grid has a single column: widgets stack full width with their stacked heights (RESP-14). */
  isStacked: boolean;
  rowSizing: RowSizing;
  columnWidth: number;
  rowHeight: number;
  gap: number;
  padding: number;
  /** The content scale (RESP-07). */
  scale: number;
  /** The grid's width: the container's, capped by `maxContentWidth` (RESP-09). */
  width: number;
  /** The grid's height for the layout's rows (GRID-11): no empty rows below the last widget. */
  height: number;
  /** The layout is taller than the container, so the grid scrolls vertically. */
  isScrolling: boolean;
}

function breakpointColumns(breakpoint: GridBreakpoint, canonical: number): number {
  if (breakpoint.columns === 'canonical') {
    return canonical;
  }
  if (breakpoint.columns === 'half') {
    return Math.ceil(canonical / 2);
  }
  return clamp(
    Number.isFinite(breakpoint.columns) ? Math.round(breakpoint.columns) : canonical,
    1,
    canonical,
  );
}

/** The content scale for a grid `width` pixels wide (RESP-07). */
export function contentScaleFor(
  spec: Pick<GridSpec, 'contentScale'>,
  width: number,
  remPx = REM,
): number {
  if (spec.contentScale === 'none') {
    return 1;
  }
  if (typeof spec.contentScale === 'number') {
    return clamp(spec.contentScale, 0.75, 3);
  }
  return clamp(width / (120 * remPx), 1, 2);
}

/** The grid's height in pixels for `rows` rows: padding, rows and the gaps between them. */
export function gridHeight(
  metrics: Pick<GridMetrics, 'rowHeight' | 'gap' | 'padding'>,
  rows: number,
): number {
  return 2 * metrics.padding + rows * metrics.rowHeight + Math.max(0, rows - 1) * metrics.gap;
}

/**
 * The grid's resolved columns, sizes and scale for a container (§5.3), from merged settings (`mergeGridSpec`) and
 * the layout shown, whose height in rows `fitPage` divides by.
 */
export function resolveGridMetrics(
  spec: GridSpec,
  viewport: GridViewport,
  layout: readonly GridRect[],
): GridMetrics {
  const remPx = viewport.remPx ?? REM;
  const px = (value: string | undefined, fallback: string) =>
    cssLengthToPx(value, remPx) ?? cssLengthToPx(fallback, remPx) ?? 0;
  const capPx =
    spec.maxContentWidth === undefined ? undefined : cssLengthToPx(spec.maxContentWidth, remPx);
  const width = Math.max(0, capPx === undefined ? viewport.width : Math.min(viewport.width, capPx));
  const height = Math.max(0, viewport.height);
  const scale = contentScaleFor(spec, width, remPx);

  // Spacing (RESP-11), scaled with the content.
  const isCompact =
    spec.density === 'compact' ||
    (spec.density === 'auto' &&
      ((viewport.viewportHeight ?? height) < 50 * remPx ||
        (viewport.viewportWidth ?? width) < 85 * remPx));
  const defaultSpace = isCompact ? '0.5rem' : '0.75rem';
  const gap = px(spec.gap, defaultSpace) * scale;
  const padding = px(spec.padding, defaultSpace) * scale;

  // Step 1: the breakpoint for the container's width. Step 2: fewer columns while they'd be too narrow.
  const breakpoints = [...spec.breakpoints].sort(
    (a, b) => (cssLengthToPx(a.minWidth, remPx) ?? 0) - (cssLengthToPx(b.minWidth, remPx) ?? 0),
  );
  let index = 0;
  breakpoints.forEach((breakpoint, at) => {
    if ((cssLengthToPx(breakpoint.minWidth, remPx) ?? 0) <= width) {
      index = at;
    }
  });
  const minColumnWidth = px(spec.minColumnWidth, DEFAULT_GRID_SPEC.minColumnWidth);
  const widthOf = (columns: number) => (width - 2 * padding - (columns - 1) * gap) / columns;
  const fallback: GridBreakpoint = { id: 'stack', minWidth: 0, columns: 1, rowSizing: 'fixed' };
  const at = (position: number): GridBreakpoint => breakpoints[position] ?? fallback;
  let columns = breakpointColumns(at(index), spec.columns);
  while (index > 0 && widthOf(columns) < minColumnWidth) {
    index -= 1;
    columns = breakpointColumns(at(index), spec.columns);
  }
  const breakpoint = at(index);
  const rowSizing = breakpoint.rowSizing ?? spec.rowSizing;

  // Step 3: the row height.
  const rows = layoutRows(layout);
  const fixed = px(spec.rowHeight, DEFAULT_GRID_SPEC.rowHeight) * scale;
  let rowHeight = fixed;
  if (rowSizing !== 'fixed' && height > 0) {
    const divisor = rowSizing === 'fitPage' ? Math.max(1, rows) : spec.rowsPerScreen;
    const fit = (height - 2 * padding - (divisor - 1) * gap) / divisor;
    const min = px(spec.minRowHeight, DEFAULT_GRID_SPEC.minRowHeight);
    const max =
      spec.maxRowHeight === undefined ? Number.POSITIVE_INFINITY : px(spec.maxRowHeight, '0');
    rowHeight = clamp(fit, min, Math.max(min, max));
  }
  const metrics = {
    breakpoint: breakpoint.id,
    columns,
    isStacked: columns === 1,
    rowSizing,
    columnWidth: Math.max(0, widthOf(columns)),
    rowHeight,
    gap,
    padding,
    scale,
    width,
  };
  const contentHeight = gridHeight(metrics, rows);
  // Half a pixel of slack: fit modes divide the height exactly, give or take rounding.
  return {
    ...metrics,
    height: contentHeight,
    isScrolling: height > 0 && contentHeight > height + 0.5,
  };
}
