import { describe, expect, it } from 'vitest';
import type { GridRect } from './engine';
import {
  contentScaleFor,
  cssLengthToPx,
  DEFAULT_GRID_SPEC,
  gridHeight,
  mergeGridSpec,
  resolveGridMetrics,
  type GridSpec,
} from './metrics';

const rows = (count: number): GridRect[] => [{ x: 0, y: 0, w: 12, h: count }];
const spec = (overrides: Partial<GridSpec> = {}) => mergeGridSpec(overrides).spec;

/** The metrics for a window `width` × `height` with `chrome` pixels of host header above the grid. */
const at = (
  width: number,
  height: number,
  layout = rows(12),
  overrides: Partial<GridSpec> = {},
  chrome = 0,
) =>
  resolveGridMetrics(
    spec(overrides),
    { width, height: height - chrome, viewportWidth: width, viewportHeight: height },
    layout,
  );

describe('cssLengthToPx', () => {
  it('reads px, rem and plain numbers', () => {
    expect(cssLengthToPx('12px')).toBe(12);
    expect(cssLengthToPx('3.5rem')).toBe(56);
    expect(cssLengthToPx('2rem', 10)).toBe(20);
    expect(cssLengthToPx(40)).toBe(40);
    expect(cssLengthToPx('8')).toBe(8);
  });

  it('gives undefined for units it can’t resolve without the DOM', () => {
    expect(cssLengthToPx('10vh')).toBeUndefined();
    expect(cssLengthToPx('auto')).toBeUndefined();
    expect(cssLengthToPx(Number.NaN)).toBeUndefined();
  });
});

describe('mergeGridSpec (GRID-01, GRID-02)', () => {
  it('overrides field by field, later levels winning', () => {
    const { spec: merged, issues } = mergeGridSpec(
      { columns: 16, rowsPerScreen: 10 },
      { columns: 24 },
      { rowSizing: 'fixed', columns: undefined },
    );
    expect(merged).toMatchObject({
      columns: 24,
      rowsPerScreen: 10,
      rowSizing: 'fixed',
      compaction: 'vertical',
    });
    expect(issues).toEqual([]);
  });

  it('clamps invalid values and reports them without throwing', () => {
    const { spec: merged, issues } = mergeGridSpec({
      columns: 100,
      rowsPerScreen: 0,
      rowHeight: '10px',
      minColumnWidth: '1vw',
      contentScale: 9,
      rowSizing: 'sideways' as never,
      breakpoints: [],
    });
    expect(merged).toMatchObject({
      columns: 48,
      rowsPerScreen: 1,
      rowHeight: '24px',
      minColumnWidth: DEFAULT_GRID_SPEC.minColumnWidth,
      contentScale: 3,
      rowSizing: 'fitRows',
    });
    expect(merged.breakpoints.length).toBe(3);
    expect(issues.map((issue) => issue.setting)).toEqual([
      'columns',
      'rowsPerScreen',
      'rowHeight',
      'minColumnWidth',
      'rowSizing',
      'contentScale',
      'breakpoints',
    ]);
  });
});

describe('resolveGridMetrics at the reference viewports (TEST-02)', () => {
  it('stacks on a 360 px phone', () => {
    const metrics = at(360, 800);
    expect(metrics).toMatchObject({
      breakpoint: 'stack',
      columns: 1,
      isStacked: true,
      rowSizing: 'fixed',
    });
    expect(metrics.rowHeight).toBe(64);
  });

  it('halves the columns on a tablet in portrait', () => {
    expect(at(768, 1024)).toMatchObject({ breakpoint: 'half', columns: 6, rowSizing: 'fixed' });
  });

  it('uses the canonical layout from 1024 px (tablet landscape)', () => {
    expect(at(1024, 768)).toMatchObject({ breakpoint: 'full', columns: 12, rowSizing: 'fitRows' });
  });

  it('keeps rows at least 48 px and scrolls on a small laptop with host chrome (acceptance 3)', () => {
    const metrics = at(1280, 720, rows(12), {}, 160);
    // Compact spacing below 1360 px wide (RESP-11).
    expect(metrics.gap).toBe(8);
    expect(metrics.rowHeight).toBe(48);
    expect(metrics.isScrolling).toBe(true);
    expect(metrics.width).toBe(1280);
  });

  it('fills the height with rowsPerScreen rows on a standard laptop', () => {
    const metrics = at(1440, 900);
    expect(metrics.gap).toBe(12);
    expect(gridHeight(metrics, 12)).toBeCloseTo(900);
    expect(metrics.isScrolling).toBe(false);
  });

  it('fits 8 rows of 24 columns exactly at 1920×1080 (acceptance 2)', () => {
    const metrics = at(1920, 1080, rows(8), {
      columns: 24,
      rowSizing: 'fitRows',
      rowsPerScreen: 8,
    });
    expect(metrics.columns).toBe(24);
    expect(gridHeight(metrics, 8)).toBeCloseTo(1080);
    // A 12-column widget spans half the content width.
    const span = 12 * metrics.columnWidth + 11 * metrics.gap;
    expect(span).toBeCloseTo((metrics.width - 2 * metrics.padding - metrics.gap) / 2);
    expect(metrics.scale).toBe(1);
  });

  it('scales content between 1920 and 3840 px (RESP-07, acceptance 4)', () => {
    expect(at(2560, 1440).scale).toBeCloseTo(2560 / 1920);
    const uhd = at(3840, 2160);
    expect(uhd.scale).toBe(2);
    expect(uhd.gap).toBe(24);
    expect(at(1366, 768).scale).toBe(1);
  });

  it('never squeezes rows below the minimum', () => {
    for (const [width, height] of [
      [1366, 768],
      [1440, 900],
      [1920, 1080],
    ] as const) {
      expect(at(width, height, rows(12), {}, 160).rowHeight).toBeGreaterThanOrEqual(48);
    }
  });
});

describe('resolveGridMetrics row sizing', () => {
  it('fits the whole page with fitPage', () => {
    const metrics = at(1440, 900, rows(6), { rowSizing: 'fitPage' });
    expect(gridHeight(metrics, 6)).toBeCloseTo(900);
  });

  it('uses the fixed row height times the scale', () => {
    expect(at(1440, 900, rows(4), { rowSizing: 'fixed', rowHeight: '5rem' }).rowHeight).toBe(80);
    expect(at(3840, 2160, rows(4), { rowSizing: 'fixed', rowHeight: '5rem' }).rowHeight).toBe(160);
  });

  it('caps rows at maxRowHeight', () => {
    expect(at(1440, 2000, rows(12), { maxRowHeight: '6rem' }).rowHeight).toBe(96);
  });

  it('counts only the layout’s rows in its height (GRID-11)', () => {
    const metrics = at(1440, 900, rows(3));
    expect(metrics.height).toBeCloseTo(gridHeight(metrics, 3));
    expect(metrics.height).toBeLessThan(900);
  });

  it('falls back to the fixed height before the container is measured', () => {
    expect(resolveGridMetrics(spec(), { width: 1440, height: 0 }, rows(4)).rowHeight).toBe(64);
  });
});

describe('resolveGridMetrics columns and width', () => {
  it('steps down to fewer columns when columns would be too narrow (§5.3 step 2)', () => {
    const metrics = at(1100, 900, rows(4), { minColumnWidth: '6rem' });
    expect(metrics.columns).toBe(6);
    expect(metrics.breakpoint).toBe('half');
  });

  it('caps the width and scales from the capped width (RESP-09)', () => {
    const metrics = at(3840, 2160, rows(4), { maxContentWidth: '1600px' });
    expect(metrics.width).toBe(1600);
    expect(metrics.scale).toBe(1);
  });

  it('uses custom breakpoints by container width (RESP-01)', () => {
    const custom = {
      breakpoints: [
        { id: 'narrow', minWidth: 0, columns: 2 },
        { id: 'wide', minWidth: '50rem', columns: 'canonical' as const },
      ],
    };
    expect(at(700, 900, rows(4), custom)).toMatchObject({ breakpoint: 'narrow', columns: 2 });
    expect(at(900, 900, rows(4), custom)).toMatchObject({ breakpoint: 'wide', columns: 12 });
  });

  it('uses compact spacing when asked, and fixed or no scaling', () => {
    expect(at(1920, 1080, rows(4), { density: 'compact' }).gap).toBe(8);
    expect(contentScaleFor({ contentScale: 'none' }, 3840)).toBe(1);
    expect(contentScaleFor({ contentScale: 1.5 }, 800)).toBe(1.5);
  });
});
