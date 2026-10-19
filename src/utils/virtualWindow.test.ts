import { describe, expect, it } from 'vitest';
import { fixedSizeWindow } from './virtualWindow';

describe('fixedSizeWindow', () => {
  it('covers the items in view, plus overscan on each side', () => {
    // 40 px items, a 200 px view scrolled to item 10.
    expect(fixedSizeWindow(400, 200, 40, 100)).toEqual({ start: 10, end: 16 });
    expect(fixedSizeWindow(400, 200, 40, 100, 3)).toEqual({ start: 7, end: 19 });
  });

  it('stays inside the list', () => {
    expect(fixedSizeWindow(0, 200, 40, 100, 5)).toEqual({ start: 0, end: 11 });
    expect(fixedSizeWindow(3900, 200, 40, 100, 5)).toEqual({ start: 92, end: 100 });
    expect(fixedSizeWindow(-50, 200, 40, 3)).toEqual({ start: 0, end: 3 });
    expect(fixedSizeWindow(0, 200, 40, 0)).toEqual({ start: 0, end: 0 });
    expect(fixedSizeWindow(0, 200, 0, 10)).toEqual({ start: 0, end: 0 });
  });

  it('only moves every `step` items, so scrolling renders less often', () => {
    const at = (offset: number) => fixedSizeWindow(offset, 200, 40, 100, 0, 4);
    // Items 8 to 11 (320 to 479 px) make one window.
    expect(at(320)).toEqual(at(400));
    expect(at(320)).toEqual(at(479));
    expect(at(480)).not.toEqual(at(479));
    // The window still reaches past the view's end.
    const { end } = at(479);
    expect(end * 40).toBeGreaterThanOrEqual(479 + 200);
  });
});
