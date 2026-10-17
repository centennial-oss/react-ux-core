import { describe, expect, it } from 'vitest';
import {
  dragPair,
  fitToMinimums,
  lengthToPx,
  minToPercent,
  normalizeSizes,
  pairRange,
  stepPair,
  withPair,
} from './sizes';

const fonts = { root: 16, own: 20 };
const limits = {
  minBefore: 20,
  minAfter: 30,
  isBeforeCollapsible: false,
  isAfterCollapsible: false,
};

describe('SplitView sizes', () => {
  it('resolves CSS lengths to pixels', () => {
    expect(lengthToPx('240px', 1000, fonts)).toBe(240);
    expect(lengthToPx('12rem', 1000, fonts)).toBe(192);
    expect(lengthToPx('2em', 1000, fonts)).toBe(40);
    expect(lengthToPx('30%', 1000, fonts)).toBe(300);
    expect(lengthToPx('30%', undefined, fonts)).toBeUndefined();
    expect(lengthToPx('48', 1000, fonts)).toBe(48);
    expect(lengthToPx('auto', 1000, fonts)).toBeUndefined();
  });

  it('turns minimums into percentages of the container', () => {
    expect(minToPercent(25, 800, fonts)).toBe(25);
    expect(minToPercent('200px', 800, fonts)).toBe(25);
    expect(minToPercent('12rem', undefined, fonts)).toBe(0);
    expect(minToPercent(undefined, 800, fonts)).toBe(0);
  });

  it('normalizes sizes to add up to 100, or splits equally when they don’t fit', () => {
    expect(normalizeSizes([1, 3], 2)).toEqual([25, 75]);
    expect(normalizeSizes([50], 2)).toEqual([50, 50]);
    expect(normalizeSizes(undefined, 4)).toEqual([25, 25, 25, 25]);
  });

  it('raises panes to their minimums from the others, leaving collapsed panes collapsed', () => {
    expect(fitToMinimums([10, 90], [30, 0])).toEqual([30, 70]);
    expect(fitToMinimums([0, 100], [30, 0])).toEqual([0, 100]);
    const fitted = fitToMinimums([10, 45, 45], [40, 0, 0]);
    expect(fitted[0]).toBe(40);
    expect((fitted[1] ?? 0) + (fitted[2] ?? 0)).toBeCloseTo(60);
  });

  it('limits a drag to the minimums, collapsing past half of a collapsible pane’s minimum', () => {
    expect(dragPair(10, 100, limits)).toBe(20);
    expect(dragPair(90, 100, limits)).toBe(70);
    expect(dragPair(50, 100, limits)).toBe(50);
    const collapsible = { ...limits, isBeforeCollapsible: true, isAfterCollapsible: true };
    expect(dragPair(9, 100, collapsible)).toBe(0);
    expect(dragPair(15, 100, collapsible)).toBe(20);
    expect(dragPair(90, 100, collapsible)).toBe(100);
    expect(pairRange(100, limits)).toEqual({ min: 20, max: 70 });
    expect(pairRange(100, collapsible)).toEqual({ min: 0, max: 100 });
  });

  it('steps by keyboard, collapsing one step past a minimum and reopening at it', () => {
    const collapsible = { ...limits, isAfterCollapsible: true };
    expect(stepPair(50, 55, 100, limits)).toBe(55);
    expect(stepPair(70, 75, 100, limits)).toBe(70);
    expect(stepPair(70, 75, 100, collapsible)).toBe(100);
    expect(stepPair(100, 95, 100, collapsible)).toBe(70);
    expect(stepPair(0, 5, 100, { ...limits, isBeforeCollapsible: true })).toBe(20);
    expect(withPair([30, 30, 40], 1, 10)).toEqual([30, 10, 60]);
  });
});
