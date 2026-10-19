import { afterEach, describe, expect, it, vi } from 'vitest';
import { fitCanvas } from './fitCanvas';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fitCanvas', () => {
  it('sizes the backing store at the device pixel ratio', () => {
    vi.stubGlobal('devicePixelRatio', 2);
    const canvas = document.createElement('canvas');
    expect(fitCanvas(canvas, 100.4, 50)).toBe(2);
    expect([canvas.width, canvas.height]).toEqual([201, 100]);
  });

  it('leaves an already fitted canvas alone, so it is not cleared', () => {
    vi.stubGlobal('devicePixelRatio', 1);
    const canvas = document.createElement('canvas');
    canvas.width = 30;
    canvas.height = 20;
    const setWidth = vi.spyOn(canvas, 'width', 'set');
    expect(fitCanvas(canvas, 30, 20)).toBe(1);
    expect(setWidth).not.toHaveBeenCalled();
  });

  it('treats a missing ratio as 1', () => {
    vi.stubGlobal('devicePixelRatio', 0);
    const canvas = document.createElement('canvas');
    expect(fitCanvas(canvas, 10, 10)).toBe(1);
  });
});
