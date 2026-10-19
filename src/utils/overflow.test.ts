import { describe, expect, it } from 'vitest';
import { overflowByPriority, type OverflowEntry } from './overflow';

const row = (sizes: readonly number[], priorities: readonly number[] = []): OverflowEntry[] =>
  sizes.map((size, index) => ({ size, priority: priorities[index] ?? 0 }));

describe('overflowByPriority', () => {
  it('hides nothing when everything fits, gaps and separators included', () => {
    expect(overflowByPriority(row([40, 40, 40]), 120)).toEqual([]);
    expect(overflowByPriority(row([40, 40, 40]), 128, { gap: 4, moreSize: 40 })).toEqual([]);
    // Sub-pixel rounding doesn't count as overflow.
    expect(overflowByPriority(row([40.2, 40.2]), 80)).toEqual([]);
    expect(
      overflowByPriority(
        [
          { size: 40, priority: 0, segment: 0 },
          { size: 40, priority: 0, segment: 1 },
        ],
        89,
        { separatorSize: 9 },
      ),
    ).toEqual([]);
    expect(overflowByPriority([], 0)).toEqual([]);
  });

  it('hides from the end when priorities tie, making room for the more trigger', () => {
    // 5 × 40 = 200 doesn't fit 170; with a 40 px trigger, three items (120 + 40) do.
    expect(overflowByPriority(row([40, 40, 40, 40, 40]), 170, { moreSize: 40 })).toEqual([3, 4]);
  });

  it('hides the lowest priorities first, wherever they are', () => {
    expect(overflowByPriority(row([40, 40, 40, 40], [2, 0, 1, 3]), 130, { moreSize: 40 })).toEqual([
      1, 2,
    ]);
  });

  it('counts the gaps between items and before the trigger', () => {
    // Four 40 px items with 4 px gaps need 172; the trigger adds 4 + 40, so two items stay in 140 (84 + 4 + 40).
    expect(overflowByPriority(row([40, 40, 40, 40]), 140, { gap: 4, moreSize: 40 })).toEqual([
      2, 3,
    ]);
  });

  it('drops the separator of a group that has gone, and keeps one between visible groups', () => {
    const entries: OverflowEntry[] = [
      { size: 40, priority: 0, segment: 0 },
      { size: 40, priority: 0, segment: 0 },
      { size: 40, priority: 0, segment: 1 },
      { size: 40, priority: 0, segment: 2 },
    ];
    // All: 160 + two separators (20) = 180. Hiding the last item drops its separator: 120 + 10 + trigger 40 = 170.
    expect(overflowByPriority(entries, 170, { moreSize: 40, separatorSize: 10 })).toEqual([3]);
    // Hiding the middle group's only item leaves one separator between the first and last groups.
    const middleFirst = entries.map((entry, index) => ({
      ...entry,
      priority: index === 2 ? 0 : 1,
    }));
    expect(overflowByPriority(middleFirst, 170, { moreSize: 40, separatorSize: 10 })).toEqual([2]);
  });

  it('hides everything when not even one item fits beside the trigger', () => {
    expect(overflowByPriority(row([80, 80]), 100, { moreSize: 40 })).toEqual([0, 1]);
  });
});
