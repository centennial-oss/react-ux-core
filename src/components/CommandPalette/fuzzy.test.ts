import { describe, expect, it } from 'vitest';
import { demoCommands } from '../../../test/commandPalette';
import { fuzzyMatch } from './fuzzy';

function best(query: string): string[] {
  return demoCommands
    .flatMap((item) => {
      const match = fuzzyMatch(query, item.label, item.keywords);
      return match ? [{ label: item.label, score: match.score }] : [];
    })
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.label);
}

describe('fuzzyMatch', () => {
  it('matches everything with an empty query', () => {
    expect(fuzzyMatch('  ', 'Mars')).toEqual({ score: 0, indexes: [] });
  });

  it('matches query words in order, preferring word starts', () => {
    expect(fuzzyMatch('mars m', 'Mars › Moons')?.indexes).toEqual([0, 1, 2, 3, 7]);
    expect(fuzzyMatch('mars m', 'Mars')).toBeNull();
    expect(best('mars m')[0]).toBe('Mars › Moons');
  });

  it('matches scattered letters', () => {
    expect(fuzzyMatch('obsv', 'Observatories')?.indexes).toEqual([0, 1, 2, 5]);
    expect(fuzzyMatch('xyz', 'Observatories')).toBeNull();
  });

  it('matches camelCase humps as word starts', () => {
    const hump = fuzzyMatch('s', 'useState');
    const plain = fuzzyMatch('s', 'usage');
    expect(hump?.indexes).toEqual([3]);
    expect(hump?.score).toBeGreaterThan(plain?.score ?? 0);
  });

  it('matches words in any order, and keywords, scoring them lower', () => {
    const outOfOrder = fuzzyMatch('moons mars', 'Mars › Moons');
    expect(outOfOrder?.indexes).toEqual([0, 1, 2, 3, 7, 8, 9, 10, 11]);
    expect(outOfOrder?.score).toBeLessThan(fuzzyMatch('mars moons', 'Mars › Moons')?.score ?? 0);
    expect(fuzzyMatch('phobos', 'Mars › Moons', ['phobos', 'deimos'])).toEqual({
      score: expect.any(Number) as number,
      indexes: [],
    });
    expect(best('dark')).toEqual(['Switch theme']);
  });
});
