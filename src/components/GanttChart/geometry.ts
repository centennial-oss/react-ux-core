// GanttChart's geometry: where a task's bar sits in its row, the points dependencies join, which ends of the bars a
// dependency type joins, the type a drag between two ends makes, and the elbowed arrow path between them.
import { isDated } from './schedule';
import type { GanttDependencyType, GanttTaskKind } from './types';

/** Bar heights by kind, in pixels. */
export const BAR_HEIGHTS: Readonly<Record<GanttTaskKind, number>> = {
  task: 20,
  summary: 10,
  milestone: 14,
};
/** The narrowest a task's bar is drawn, so a short task stays visible and grabbable. */
export const MIN_BAR_WIDTH = 6;

/** A bar's box along the time axis, in pixels from the track's start. */
export interface BarBox {
  x: number;
  width: number;
}

/** Where a task's bar (or a milestone's diamond, centred on its time) sits, or null without dates. */
export function barBox(
  node: { start: number; end: number; kind: GanttTaskKind },
  rangeStart: number,
  pxPerMs: number,
): BarBox | null {
  if (!isDated(node)) {
    return null;
  }
  const x = (node.start - rangeStart) * pxPerMs;
  if (node.kind === 'milestone') {
    const size = BAR_HEIGHTS.milestone;
    return { x: x - size / 2, width: size };
  }
  return { x, width: Math.max(MIN_BAR_WIDTH, (node.end - node.start) * pxPerMs) };
}

/** A bar's start or finish. */
export type BarEnd = 'start' | 'finish';

export interface Point {
  x: number;
  y: number;
}

const ENDS: Readonly<Record<GanttDependencyType, readonly [BarEnd, BarEnd]>> = {
  'finish-to-start': ['finish', 'start'],
  'start-to-start': ['start', 'start'],
  'finish-to-finish': ['finish', 'finish'],
  'start-to-finish': ['start', 'finish'],
};

/** The point of a bar's end that dependencies join: its start or finish, at the middle of row `rowTop`. */
export function barAnchor(box: BarBox, end: BarEnd, rowTop: number, rowHeight: number): Point {
  return { x: end === 'start' ? box.x : box.x + box.width, y: rowTop + rowHeight / 2 };
}

/** The predecessor's and the successor's ends that a dependency type joins. */
export function dependencyEnds(type: GanttDependencyType): readonly [BarEnd, BarEnd] {
  return ENDS[type];
}

/** The dependency type a link from one bar's end to another's makes. */
export function dependencyTypeFor(fromEnd: BarEnd, toEnd: BarEnd): GanttDependencyType {
  if (fromEnd === 'finish') {
    return toEnd === 'start' ? 'finish-to-start' : 'finish-to-finish';
  }
  return toEnd === 'start' ? 'start-to-start' : 'start-to-finish';
}

/**
 * SVG path data from the predecessor's end `from` to the successor's end `to`, in right angles: a stub out of `from`
 * (rightward from a finish, leftward from a start), and into `to` from its outside (from the left into a start, the
 * right into a finish). When the stubs face away from each other the path doubles back along the row boundary just
 * before the successor's row (`rowHeight / 2` from its middle).
 */
export function dependencyPath(
  from: Point,
  fromEnd: BarEnd,
  to: Point,
  toEnd: BarEnd,
  rowHeight: number,
  stub = 10,
): string {
  const outX = from.x + (fromEnd === 'finish' ? stub : -stub);
  const inDirection = toEnd === 'start' ? 1 : -1;
  const inX = to.x - inDirection * stub;
  const isDirect = inDirection > 0 ? outX <= inX : outX >= inX;
  if (isDirect) {
    return `M${String(from.x)} ${String(from.y)}H${String(outX)}V${String(to.y)}H${String(to.x)}`;
  }
  const towards = to.y >= from.y ? 1 : -1;
  const turnY = to.y - (towards * rowHeight) / 2;
  return (
    `M${String(from.x)} ${String(from.y)}H${String(outX)}V${String(turnY)}` +
    `H${String(inX)}V${String(to.y)}H${String(to.x)}`
  );
}
