import { describe, expect, it } from 'vitest';
import { contrastRatio, hexChannels, relativeLuminance } from './color';

describe('hexChannels', () => {
  it('reads #rrggbb', () => {
    expect(hexChannels('#0a80ff')).toEqual([10, 128, 255]);
  });
});

describe('relativeLuminance', () => {
  it('runs from black to white', () => {
    expect(relativeLuminance([0, 0, 0])).toBe(0);
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1);
    expect(relativeLuminance([128, 128, 128])).toBeCloseTo(0.2159, 4);
  });
});

describe('contrastRatio', () => {
  it('matches WCAG examples in either order', () => {
    const black = relativeLuminance([0, 0, 0]);
    const white = relativeLuminance([255, 255, 255]);
    expect(contrastRatio(black, white)).toBeCloseTo(21);
    expect(contrastRatio(white, black)).toBeCloseTo(21);
    expect(contrastRatio(white, white)).toBe(1);
    expect(
      contrastRatio(relativeLuminance(hexChannels('#767676')), relativeLuminance([255, 255, 255])),
    ).toBeCloseTo(4.54, 2);
  });
});
