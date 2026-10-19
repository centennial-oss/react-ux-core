import { describe, expect, it } from 'vitest';
import { heatColor, heatLegendStops, resolveHeatScale, type HeatLook } from './heat';

const ramp = (name: string) =>
  [1, 2, 3, 4, 5, 6, 7].map((step) => `#${name}${String(step).repeat(4)}`);

const look: HeatLook = {
  ramps: { accent: ramp('a0'), success: ramp('b0'), danger: ramp('c0'), neutral: ramp('d0') },
  text: '#000000',
  inverseText: '#ffffff',
  mutedText: '#555555',
  border: '#777777',
  surface: '#ffffff',
  font: 'system-ui',
};

describe('heat scales', () => {
  it('fills the scale from the data', () => {
    expect(resolveHeatScale([3, 9, 6])).toMatchObject({ min: 3, max: 9, midpoint: 6 });
  });

  it('draws the top of the ramp for the highest value and the bottom for the lowest', () => {
    const scale = resolveHeatScale([0, 10]);
    expect(heatColor(0, scale, look)).toBe(look.ramps.accent[0]);
    expect(heatColor(10, scale, look)).toBe(look.ramps.accent[6]);
  });

  it('draws the bottom of a sequential ramp when every value is equal (no range)', () => {
    const scale = resolveHeatScale([0, 0, 0], { min: 0 });
    expect(heatColor(0, scale, look)).toBe(look.ramps.accent[0]);
    expect(heatColor(5, resolveHeatScale([5]), look)).toBe(look.ramps.accent[0]);
  });

  it('draws the midpoint of a diverging ramp when there is no range', () => {
    const scale = resolveHeatScale([70], { type: 'diverging', midpoint: 70 });
    expect(heatColor(70, scale, look)).toBe(look.ramps.success[0]);
    const below = resolveHeatScale([70], { type: 'diverging', min: 70, max: 90, midpoint: 70 });
    expect(heatColor(60, below, look)).toBe(look.ramps.danger[0]);
  });

  it('has one legend entry when there is no range', () => {
    expect(heatLegendStops(resolveHeatScale([0, 0]), look)).toEqual([look.ramps.accent[0]]);
    expect(heatLegendStops(resolveHeatScale([0, 10]), look)).toHaveLength(7);
  });
});
