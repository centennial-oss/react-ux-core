import { describe, expect, it } from 'vitest';
import {
  barAnchor,
  barBox,
  BAR_HEIGHTS,
  dependencyEnds,
  dependencyPath,
  dependencyTypeFor,
  MIN_BAR_WIDTH,
} from './geometry';
import type { GanttDependencyType } from './types';

describe('barBox and barAnchor', () => {
  it('places bars along the track, at least wide enough to see', () => {
    expect(barBox({ start: 1000, end: 3000, kind: 'task' }, 0, 0.1)).toEqual({
      x: 100,
      width: 200,
    });
    expect(barBox({ start: 1000, end: 1001, kind: 'task' }, 0, 0.1)?.width).toBe(MIN_BAR_WIDTH);
    expect(barBox({ start: Number.NaN, end: 1, kind: 'task' }, 0, 0.1)).toBeNull();
  });

  it('centres a milestone’s diamond on its time', () => {
    const size = BAR_HEIGHTS.milestone;
    expect(barBox({ start: 1000, end: 1000, kind: 'milestone' }, 0, 0.1)).toEqual({
      x: 100 - size / 2,
      width: size,
    });
  });

  it('joins dependencies at the middle of a bar’s ends', () => {
    const box = { x: 100, width: 50 };
    expect(barAnchor(box, 'start', 72, 36)).toEqual({ x: 100, y: 90 });
    expect(barAnchor(box, 'finish', 72, 36)).toEqual({ x: 150, y: 90 });
  });
});

describe('dependency ends and types', () => {
  it('maps each type to the ends it joins, and back', () => {
    const types: GanttDependencyType[] = [
      'finish-to-start',
      'start-to-start',
      'finish-to-finish',
      'start-to-finish',
    ];
    for (const type of types) {
      const [from, to] = dependencyEnds(type);
      expect(dependencyTypeFor(from, to)).toBe(type);
    }
  });
});

describe('dependencyPath', () => {
  it('goes straight down and across when the successor starts later', () => {
    expect(dependencyPath({ x: 100, y: 18 }, 'finish', { x: 200, y: 90 }, 'start', 36)).toBe(
      'M100 18H110V90H200',
    );
  });

  it('doubles back along the row boundary when the successor starts earlier', () => {
    expect(dependencyPath({ x: 100, y: 18 }, 'finish', { x: 60, y: 90 }, 'start', 36)).toBe(
      'M100 18H110V72H50V90H60',
    );
  });

  it('comes into a finish from the right, and leaves a start to the left', () => {
    expect(dependencyPath({ x: 100, y: 90 }, 'start', { x: 40, y: 18 }, 'finish', 36)).toBe(
      'M100 90H90V18H40',
    );
    expect(dependencyPath({ x: 100, y: 18 }, 'start', { x: 120, y: 90 }, 'finish', 36)).toBe(
      'M100 18H90V72H130V90H120',
    );
  });
});
