import { describe, expect, it } from 'vitest';
import {
  arcPath,
  centreValue,
  effectiveScale,
  positionToAngle,
  positionToValue,
  snapToStep,
  valueToPosition,
} from './knobMath';

const linear = { minValue: -50, maxValue: 50, scale: 'linear' as const };
const log = { minValue: 20, maxValue: 20000, scale: 'log' as const };

describe('knobMath', () => {
  it('maps values to positions linearly', () => {
    expect(valueToPosition(0, linear)).toBe(0.5);
    expect(valueToPosition(-100, linear)).toBe(0);
    expect(positionToValue(0.75, linear)).toBe(25);
    expect(centreValue(linear)).toBe(0);
  });

  it('maps values to positions logarithmically', () => {
    expect(valueToPosition(20, log)).toBe(0);
    expect(valueToPosition(20000, log)).toBeCloseTo(1);
    expect(valueToPosition(632.455532, log)).toBeCloseTo(0.5);
    expect(positionToValue(1 / 3, log)).toBeCloseTo(200);
    expect(effectiveScale({ minValue: 0, maxValue: 10, scale: 'log' })).toBe('linear');
  });

  it('snaps to the step without float noise', () => {
    expect(snapToStep(0.30000000000000004, 0, 1, 0.1)).toBe(0.3);
    expect(snapToStep(7.4, 0, 10, 0.5)).toBe(7.5);
    expect(snapToStep(9.9, 0, 9.5, 1)).toBe(9);
    expect(snapToStep(12, 0, 10, 1)).toBe(10);
    expect(snapToStep(3.14159, 0, 10, 0)).toBe(3.14159);
  });

  it('draws the arc over 270°', () => {
    expect(positionToAngle(0)).toBe(-135);
    expect(positionToAngle(0.5)).toBe(0);
    expect(positionToAngle(1)).toBe(135);
    expect(arcPath(0, 1, 40)).toMatch(/A 40 40 0 1 1/);
    expect(arcPath(0.5, 0.6, 40)).toMatch(/A 40 40 0 0 1/);
  });
});
