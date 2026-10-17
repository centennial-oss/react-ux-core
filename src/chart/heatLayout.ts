// Sizing for a heatmap's compact layout (CalendarHeatmap's default, FR-014): square cells sized to fit the plot's
// width between a minimum and the regular size, and column labels thinned so they never overlap.

export type HeatCellSize = 'fit' | 'sm' | 'md' | 'lg';

/** The gap between cells, in CSS pixels. */
export const HEAT_GAP = 1;

/** Fixed cell sizes, in CSS pixels. `lg` is the regular heatmap's cell width. */
const FIXED: Record<Exclude<HeatCellSize, 'fit'>, number> = { sm: 12, md: 18, lg: 28 };

/**
 * A cell's size in CSS pixels. `fit` shares the plot's width between the columns, between 10 px (so a year fits on
 * a desktop) and the regular 28 px; on touch screens between 24 px (the minimum target size) and 44 px, the touch
 * target size. Fixed sizes never go below 24 px on touch screens either. Until the width is known, cells are the
 * regular size.
 */
export function heatCellSize({
  size,
  width,
  columns,
  labelWidth,
  isCoarse,
}: {
  size: HeatCellSize;
  width: number | undefined;
  columns: number;
  labelWidth: number;
  isCoarse: boolean;
}): number {
  const min = isCoarse ? 24 : 10;
  const max = isCoarse ? 44 : FIXED.lg;
  if (size !== 'fit') {
    return Math.max(FIXED[size], min);
  }
  if (width === undefined || columns === 0) {
    return max;
  }
  const share = Math.floor((width - labelWidth - columns * HEAT_GAP) / columns);
  return Math.min(max, Math.max(min, share));
}

/** A rough width for a short label in 12 px text, in CSS pixels, with a little space after it. */
export function labelSpace(text: string): number {
  return Math.ceil(text.length * 6.5) + 8;
}

/** The row-label column's width for these labels in 12 px text (generously, for wide letters): 36 px to 192 px. */
export function rowLabelWidth(labels: readonly string[]): number {
  const longest = labels.reduce((most, label) => Math.max(most, label.length), 0);
  return Math.min(192, Math.max(36, Math.ceil(longest * 7.5) + 12));
}

/**
 * Which columns show their label, from the latest back: a label shows when it fits before the next shown label (or
 * the plot's end). `texts[i]` is the column's candidate label, or undefined for none.
 */
export function visibleColumnLabels(
  texts: readonly (string | undefined)[],
  cell: number,
): boolean[] {
  const shown = texts.map(() => false);
  let next = texts.length;
  for (let index = texts.length - 1; index >= 0; index--) {
    const text = texts[index];
    if (text === undefined) {
      continue;
    }
    if ((next - index) * (cell + HEAT_GAP) >= labelSpace(text)) {
      shown[index] = true;
      next = index;
    }
  }
  return shown;
}

/** Shows every nth row label so 12 px labels don't overlap on small cells. */
export function rowLabelEvery(cell: number): number {
  return Math.max(1, Math.ceil(14 / (cell + HEAT_GAP)));
}
