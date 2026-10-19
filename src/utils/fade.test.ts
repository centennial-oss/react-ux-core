import { describe, expect, it } from 'vitest';
import { fadedOpacity } from './fade';

describe('fadedOpacity', () => {
  it('fades from the base opacity to nothing, and never above the base', () => {
    expect(fadedOpacity(0.4, 0)).toBe(0.4);
    expect(fadedOpacity(0.4, 50)).toBeCloseTo(0.2);
    expect(fadedOpacity(0.4, 100)).toBe(0);
    expect(fadedOpacity(0.4, -20)).toBe(0.4);
    expect(fadedOpacity(0.4, 250)).toBe(0);
  });
});
