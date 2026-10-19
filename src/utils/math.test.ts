import { describe, expect, it } from 'vitest';
import { clamp, decimalsOf, extent, mod, roundTo } from './math';

describe('clamp', () => {
  it('keeps values inside the range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(42, 0, 10)).toBe(10);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });
});

describe('extent', () => {
  it('finds the smallest and largest values', () => {
    expect(extent([3, -1, 7, 2])).toEqual([-1, 7]);
    expect(extent(new Set([4]))).toEqual([4, 4]);
  });

  it('is undefined with no values', () => {
    expect(extent([])).toBeUndefined();
  });

  it('handles series too long to spread into Math.min', () => {
    const values = Array.from({ length: 300_000 }, (_, index) => index);
    expect(extent(values)).toEqual([0, 299_999]);
  });
});

describe('decimalsOf', () => {
  it('counts decimals in plain and exponent notation', () => {
    expect(decimalsOf(5)).toBe(0);
    expect(decimalsOf(0.25)).toBe(2);
    expect(decimalsOf(1e-7)).toBe(7);
    expect(decimalsOf(2.5e-8)).toBe(9);
  });
});

describe('roundTo', () => {
  it('removes float noise', () => {
    expect(roundTo(0.1 + 0.2, 1)).toBe(0.3);
    expect(roundTo(1.005, 0)).toBe(1);
    expect(roundTo(3e-7 + 1e-7, decimalsOf(1e-7))).toBe(4e-7);
  });
});

describe('mod', () => {
  it('wraps negative values into the range', () => {
    expect(mod(-1, 8)).toBe(7);
    expect(mod(-9, 8)).toBe(7);
    expect(mod(8, 8)).toBe(0);
    expect(mod(11, 8)).toBe(3);
    expect(mod(0, 3)).toBe(0);
  });
});
