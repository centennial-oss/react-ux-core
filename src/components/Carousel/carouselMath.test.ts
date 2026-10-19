import { describe, expect, it } from 'vitest';
import {
  canMove,
  isTooFarToSlide,
  lastStart,
  loopWindowStart,
  positionOfIndex,
  slidesNear,
  slotOf,
  snapCount,
  snapOfIndex,
  startOfSnap,
  stepPosition,
  type CarouselLayout,
} from './carouselMath';

function layout(overrides: Partial<CarouselLayout> = {}): CarouselLayout {
  return { count: 8, columns: 1, isLooping: false, moveBy: 'slide', ...overrides };
}

describe('stops', () => {
  it('stops at every slide that can start a full view', () => {
    const slides = layout({ columns: 3 });
    expect(canMove(slides)).toBe(true);
    expect(lastStart(slides)).toBe(5);
    expect(snapCount(slides)).toBe(6);
    expect(snapCount(layout({ columns: 3, isLooping: true }))).toBe(8);
  });

  it('stops at every page, the last ending at the last slide unless looping', () => {
    const pages = layout({ count: 10, columns: 3, moveBy: 'page' });
    expect(snapCount(pages)).toBe(4);
    expect([0, 1, 2, 3].map((snap) => startOfSnap(pages, snap))).toEqual([0, 3, 6, 7]);
    const looping = { ...pages, isLooping: true };
    expect([0, 1, 2, 3].map((snap) => startOfSnap(looping, snap))).toEqual([0, 3, 6, 9]);
  });

  it('has one stop when every slide fits', () => {
    const fits = layout({ count: 2, columns: 3 });
    expect(canMove(fits)).toBe(false);
    expect(snapCount(fits)).toBe(1);
    expect(lastStart(fits)).toBe(0);
  });

  it('finds the stop showing a slide, rounding between pages either way', () => {
    const pages = layout({ count: 10, columns: 3, moveBy: 'page' });
    expect(snapOfIndex(pages, 4)).toBe(1);
    expect(snapOfIndex(pages, 4, true)).toBe(2);
    expect(snapOfIndex(pages, 8)).toBe(3);
    expect(snapOfIndex(layout({ columns: 3 }), 7)).toBe(5);
    expect(snapOfIndex({ ...pages, isLooping: true }, 9, true)).toBe(3);
  });
});

describe('stepPosition', () => {
  it('stops at the ends without looping', () => {
    const slides = layout();
    expect(stepPosition(slides, 0, -1)).toBe(0);
    expect(stepPosition(slides, 6, 1)).toBe(7);
    expect(stepPosition(slides, 7, 1)).toBe(7);
    expect(stepPosition(slides, 2, 3)).toBe(5);
  });

  it('counts on past the ends when looping', () => {
    const slides = layout({ isLooping: true });
    expect(stepPosition(slides, 7, 1)).toBe(8);
    expect(stepPosition(slides, 0, -1)).toBe(-1);
    expect(stepPosition(slides, -1, -1)).toBe(-2);
  });

  it('moves by pages, from between pages to the nearest page that way', () => {
    const pages = layout({ count: 10, columns: 3, moveBy: 'page' });
    expect(stepPosition(pages, 0, 1)).toBe(3);
    expect(stepPosition(pages, 6, 1)).toBe(7);
    expect(stepPosition(pages, 7, -1)).toBe(6);
    expect(stepPosition(pages, 4, 1)).toBe(6);
    expect(stepPosition(pages, 4, -1)).toBe(3);
  });

  it('moves by pages round a loop, the short last page included', () => {
    const pages = layout({ columns: 3, moveBy: 'page', isLooping: true });
    expect(stepPosition(pages, 6, 1)).toBe(8);
    expect(stepPosition(pages, 8, -1)).toBe(6);
    expect(stepPosition(pages, 0, -1)).toBe(-2);
    expect(stepPosition(pages, 1, -1)).toBe(0);
  });

  it("doesn't move when everything fits, or for no steps", () => {
    expect(stepPosition(layout({ count: 2, columns: 2 }), 0, 1)).toBe(0);
    expect(stepPosition(layout(), 3, 0)).toBe(3);
  });
});

describe('positionOfIndex', () => {
  it('goes the shortest way round a loop', () => {
    const slides = layout({ isLooping: true });
    expect(positionOfIndex(slides, 0, 7)).toBe(-1);
    expect(positionOfIndex(slides, 7, 0)).toBe(8);
    expect(positionOfIndex(slides, 16, 3)).toBe(19);
    expect(positionOfIndex(slides, 16, 0)).toBe(16);
  });

  it('stops at the last full view without looping', () => {
    expect(positionOfIndex(layout({ columns: 3 }), 0, 7)).toBe(5);
    expect(positionOfIndex(layout({ count: 2, columns: 3 }), 0, 1)).toBe(0);
  });
});

describe('looping slots', () => {
  const slides = layout({ count: 5, columns: 2, isLooping: true });

  it('puts the spare slots around the move, or ahead of or behind a drag', () => {
    // A move from 0 to 1 fills slots 0 to 2; the other two go one each side.
    expect(loopWindowStart(slides, 0, 1)).toBe(-1);
    expect(loopWindowStart(slides, 0, 0, true)).toBe(0);
    expect(loopWindowStart(slides, 0, 0, false)).toBe(-3);
  });

  it('draws each slide once, in its copy inside the window', () => {
    expect([0, 1, 2, 3, 4].map((slide) => slotOf(slides, slide, -1))).toEqual([0, 1, 2, 3, -1]);
    expect([0, 1, 2, 3, 4].map((slide) => slotOf(slides, slide, 4))).toEqual([5, 6, 7, 8, 4]);
    expect(slotOf(layout(), 3, -10)).toBe(3);
  });

  it('knows a move too far to fill', () => {
    expect(isTooFarToSlide(slides, 0, 3)).toBe(false);
    expect(isTooFarToSlide(slides, 0, 4)).toBe(true);
  });
});

describe('slidesNear', () => {
  it('draws a view either side, and every slide a sliding move passes', () => {
    const slides = layout({ count: 20, columns: 2 });
    expect(slidesNear(slides, 4, 4, 0, false)).toEqual([2, 3, 4, 5, 6, 7]);
    expect(slidesNear(slides, 4, 10, 0, false)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    expect(slidesNear(slides, 0, 0, 0, false)).toEqual([0, 1, 2, 3]);
  });

  it('keeps the slides a jump left, but not those it skipped', () => {
    const slides = layout({ count: 100, columns: 1 });
    expect(slidesNear(slides, 2, 50, 0, true)).toEqual([1, 2, 3, 49, 50, 51]);
  });

  it('draws each looping slide once, inside the window', () => {
    const slides = layout({ count: 5, columns: 1, isLooping: true });
    expect(slidesNear(slides, 0, 0, -2, false)).toEqual([0, 1, 4]);
    expect(slidesNear(slides, 0, 0, 0, false)).toEqual([0, 1]);
  });
});
