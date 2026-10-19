import { afterEach, describe, expect, it } from 'vitest';
import {
  capturePointer,
  isPastTapSlop,
  isPlainClick,
  pinchOf,
  pointInElement,
  swipeDirection,
} from './pointer';

afterEach(() => {
  document.body.replaceChildren();
});

describe('capturePointer', () => {
  it("doesn't throw for a pointer that isn't active", () => {
    const element = document.createElement('div');
    document.body.append(element);
    expect(() => {
      capturePointer(element, 12345);
    }).not.toThrow();
    expect(() => {
      capturePointer(null, 1);
    }).not.toThrow();
  });
});

describe('pointInElement', () => {
  it("is relative to the element's corner", () => {
    const element = document.createElement('div');
    element.style.cssText = 'position: fixed; left: 30px; top: 40px; width: 10px; height: 10px';
    document.body.append(element);
    expect(pointInElement({ clientX: 35, clientY: 50 }, element)).toEqual({ x: 5, y: 10 });
    expect(pointInElement({ clientX: 35, clientY: 50 }, null)).toEqual({ x: 35, y: 50 });
  });
});

describe('pinchOf', () => {
  it('measures the distance and midpoint of two points', () => {
    expect(
      pinchOf([
        { x: 0, y: 0 },
        { x: 6, y: 8 },
      ]),
    ).toEqual({ distance: 10, mid: { x: 3, y: 4 } });
  });

  it('never reports a distance below 1', () => {
    expect(pinchOf([{ x: 2, y: 2 }]).distance).toBe(1);
    expect(pinchOf([]).distance).toBe(1);
  });
});

describe('isPastTapSlop', () => {
  it('allows more movement for a finger than a mouse', () => {
    expect(isPastTapSlop(3, 0, 'mouse')).toBe(false);
    expect(isPastTapSlop(5, 0, 'mouse')).toBe(true);
    expect(isPastTapSlop(6, 6, 'touch')).toBe(false);
    expect(isPastTapSlop(0, 11, 'touch')).toBe(true);
    expect(isPastTapSlop(5, 0, 'pen')).toBe(false);
    expect(isPastTapSlop(5, 0, 'unknown')).toBe(true);
  });
});

describe('swipeDirection', () => {
  it('reads a long, mostly horizontal drag', () => {
    expect(swipeDirection(-80, 10, false)).toBe('next');
    expect(swipeDirection(80, -10, false)).toBe('previous');
  });

  it('flips right to left', () => {
    expect(swipeDirection(-80, 0, true)).toBe('previous');
    expect(swipeDirection(80, 0, true)).toBe('next');
  });

  it('ignores short and steep drags', () => {
    expect(swipeDirection(-50, 0, false)).toBeUndefined();
    expect(swipeDirection(-80, 60, false)).toBeUndefined();
  });
});

describe('isPlainClick', () => {
  const click = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };

  it('is a primary-button click with no modifier keys', () => {
    expect(isPlainClick(click)).toBe(true);
    expect(isPlainClick({ ...click, button: 1 })).toBe(false);
    expect(isPlainClick({ ...click, metaKey: true })).toBe(false);
    expect(isPlainClick({ ...click, ctrlKey: true })).toBe(false);
    expect(isPlainClick({ ...click, shiftKey: true })).toBe(false);
    expect(isPlainClick({ ...click, altKey: true })).toBe(false);
  });
});
