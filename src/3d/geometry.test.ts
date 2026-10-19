import { describe, expect, it } from 'vitest';
import { detectFormat, fitDistance, formatLength, niceCeil } from './geometry';

describe('detectFormat', () => {
  it('reads the extension, ignoring case, query and hash', () => {
    expect(detectFormat('/models/rocket.STL')).toBe('stl');
    expect(detectFormat('https://example.com/a/chair.glb?v=2#top')).toBe('glb');
    expect(detectFormat('scene.gltf')).toBe('gltf');
    expect(detectFormat('bracket.obj')).toBe('obj');
  });

  it('returns null for other files and blob URLs', () => {
    expect(detectFormat('model.fbx')).toBeNull();
    expect(detectFormat('blob:https://example.com/1234-5678')).toBeNull();
  });
});

describe('niceCeil', () => {
  it('rounds up to 1, 2 or 5 times a power of ten', () => {
    expect(niceCeil(0.3)).toBe(0.5);
    expect(niceCeil(1)).toBe(1);
    expect(niceCeil(1.2)).toBe(2);
    expect(niceCeil(37)).toBe(50);
    expect(niceCeil(192)).toBe(200);
    expect(niceCeil(0)).toBe(1);
  });
});

describe('fitDistance', () => {
  it('backs off further for narrow viewports', () => {
    const wide = fitDistance(10, 45, 2);
    const narrow = fitDistance(10, 45, 0.5);
    expect(narrow).toBeGreaterThan(wide);
    // The sphere fits the vertical field of view with a 10% margin.
    expect(wide).toBeCloseTo((10 / Math.sin((22.5 * Math.PI) / 180)) * 1.1);
  });
});

describe('formatLength', () => {
  it('formats with the unit and sensible precision', () => {
    expect(formatLength(42.345, 'mm', 'en-US')).toBe('42.3 mm');
    expect(formatLength(1.2345, 'in', 'en-US')).toBe('1.23 in');
    expect(formatLength(1234.5, 'cm', 'en-US')).toBe('1,235 cm');
    expect(formatLength(3.5, undefined, 'de-DE')).toBe('3,5');
  });
});
