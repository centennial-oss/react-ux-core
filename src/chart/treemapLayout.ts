// The squarified treemap layout (Bruls, Huizing and van Wijk, 2000): values become rectangles with areas in
// proportion, laid in rows along the shorter side of the space left, each row kept while adding a value makes its
// worst aspect ratio no worse. No dependencies.

/** A rectangle in the layout's units (CSS pixels, for Treemap). */
export interface TreemapRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The worst (largest) aspect ratio in a row of areas laid along a side of length `side`. */
function worstRatio(row: readonly number[], side: number): number {
  let sum = 0;
  let max = 0;
  let min = Number.POSITIVE_INFINITY;
  for (const area of row) {
    sum += area;
    max = Math.max(max, area);
    min = Math.min(min, area);
  }
  if (sum <= 0 || side <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  const sideSquared = side * side;
  const sumSquared = sum * sum;
  return Math.max((sideSquared * max) / sumSquared, sumSquared / (sideSquared * min));
}

/**
 * Lays `values` out in `rect` as squarified rectangles, returned in the same order as the values. Larger values are
 * placed first (from the top-left corner); zero, negative and non-finite values get empty rectangles at the corner.
 */
export function squarify(values: readonly number[], rect: TreemapRect): TreemapRect[] {
  const result: TreemapRect[] = values.map(() => ({ x: rect.x, y: rect.y, width: 0, height: 0 }));
  const order = values
    .map((value, index) => ({ value, index }))
    .filter((entry) => Number.isFinite(entry.value) && entry.value > 0)
    .sort((a, b) => b.value - a.value || a.index - b.index);
  const total = order.reduce((sum, entry) => sum + entry.value, 0);
  if (total <= 0 || rect.width <= 0 || rect.height <= 0) {
    return result;
  }
  const scale = (rect.width * rect.height) / total;
  const free = { ...rect };

  /** Places a row along the shorter side of the free space and takes its strip off. */
  const place = (row: readonly { area: number; index: number }[], isLast: boolean) => {
    const sum = row.reduce((total, entry) => total + entry.area, 0);
    const isColumn = free.width >= free.height;
    // The strip's thickness; the last row takes exactly what's left, so rounding never leaves a sliver.
    const thickness = isLast
      ? isColumn
        ? free.width
        : free.height
      : sum / (isColumn ? free.height : free.width);
    let offset = 0;
    row.forEach((entry, position) => {
      const length =
        position === row.length - 1
          ? (isColumn ? free.height : free.width) - offset
          : entry.area / thickness;
      result[entry.index] = isColumn
        ? { x: free.x, y: free.y + offset, width: thickness, height: length }
        : { x: free.x + offset, y: free.y, width: length, height: thickness };
      offset += length;
    });
    if (isColumn) {
      free.x += thickness;
      free.width -= thickness;
    } else {
      free.y += thickness;
      free.height -= thickness;
    }
  };

  let row: { area: number; index: number }[] = [];
  order.forEach((entry, position) => {
    const area = entry.value * scale;
    const side = Math.min(free.width, free.height);
    const areas = row.map((item) => item.area);
    if (row.length === 0 || worstRatio([...areas, area], side) <= worstRatio(areas, side)) {
      row.push({ area, index: entry.index });
    } else {
      place(row, false);
      row = [{ area, index: entry.index }];
    }
    if (position === order.length - 1) {
      place(row, true);
    }
  });
  return result;
}
