import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  scrollElementToTop,
  scrollIntoViewBlock,
  scrollIntoViewInline,
  scrollSpanIntoView,
} from './scroll';
import { REDUCED_MOTION_QUERY } from './useMediaQuery';

afterEach(() => {
  document.body.replaceChildren();
  window.scrollTo({ top: 0, behavior: 'instant' });
  vi.restoreAllMocks();
});

/** Makes `prefers-reduced-motion` match, as it does when the user asks for less motion. */
function preferReducedMotion() {
  const matchMedia = window.matchMedia.bind(window);
  vi.spyOn(window, 'matchMedia').mockImplementation((query) => {
    const list = matchMedia(query);
    if (query === REDUCED_MOTION_QUERY) {
      Object.defineProperty(list, 'matches', { value: true });
    }
    return list;
  });
}

/** A 100px-tall box of ten 40px rows, below the bottom of the page. */
function column(): { container: HTMLElement; row: (index: number) => HTMLElement } {
  const spacer = document.createElement('div');
  spacer.style.height = '3000px';
  const container = document.createElement('div');
  container.style.cssText = 'height: 100px; overflow-y: auto';
  const rows = Array.from({ length: 10 }, () => {
    const row = document.createElement('div');
    row.style.height = '40px';
    container.append(row);
    return row;
  });
  document.body.append(spacer, container);
  return { container, row: (index: number) => rows[index] ?? container };
}

/** A 100px-wide strip of ten 40px items, below the bottom of the page. */
function strip(dir: 'ltr' | 'rtl' = 'ltr'): {
  container: HTMLElement;
  item: (index: number) => HTMLElement;
} {
  const spacer = document.createElement('div');
  spacer.style.height = '3000px';
  const container = document.createElement('div');
  container.dir = dir;
  container.style.cssText = 'display: flex; width: 100px; overflow-x: auto';
  const items = Array.from({ length: 10 }, () => {
    const item = document.createElement('div');
    item.style.cssText = 'flex: none; width: 40px; height: 20px';
    container.append(item);
    return item;
  });
  document.body.append(spacer, container);
  const item = (index: number) => {
    const element = items[index];
    if (!element) {
      throw new Error(`No item ${String(index)}`);
    }
    return element;
  };
  return { container, item };
}

describe('scrollIntoViewInline', () => {
  it('scrolls just enough to show an item past either edge', () => {
    const { container, item } = strip();
    scrollIntoViewInline(container, item(4));
    expect(container.scrollLeft).toBe(100);
    scrollIntoViewInline(container, item(1));
    expect(container.scrollLeft).toBe(40);
    scrollIntoViewInline(container, item(2));
    expect(container.scrollLeft).toBe(40);
  });

  it('works right to left', () => {
    const { container, item } = strip('rtl');
    scrollIntoViewInline(container, item(4));
    expect(container.scrollLeft).toBe(-100);
    scrollIntoViewInline(container, item(0));
    expect(container.scrollLeft).toBe(0);
  });

  it('never scrolls the page', () => {
    const { container, item } = strip();
    scrollIntoViewInline(container, item(9));
    expect(window.scrollY).toBe(0);
    expect(container.scrollLeft).toBe(300);
  });
});

describe('scrollSpanIntoView', () => {
  it('scrolls just enough to show a span past either edge, by its offsets alone', () => {
    const { container } = strip();
    scrollSpanIntoView(container, 160, 40);
    expect(container.scrollLeft).toBe(100);
    scrollSpanIntoView(container, 40, 40);
    expect(container.scrollLeft).toBe(40);
    scrollSpanIntoView(container, 60, 40);
    expect(container.scrollLeft).toBe(40);
  });

  it('measures from the right, right to left', () => {
    const { container } = strip('rtl');
    scrollSpanIntoView(container, 160, 40);
    expect(container.scrollLeft).toBe(-100);
    scrollSpanIntoView(container, 0, 40);
    expect(container.scrollLeft).toBe(0);
  });
});

describe('scrollIntoViewBlock', () => {
  it('scrolls a box up or down just enough, and never the page', () => {
    const { container, row } = column();
    scrollIntoViewBlock(container, row(4));
    expect(container.scrollTop).toBe(100);
    scrollIntoViewBlock(container, row(1));
    expect(container.scrollTop).toBe(40);
    scrollIntoViewBlock(container, row(2));
    expect(container.scrollTop).toBe(40);
    expect(window.scrollY).toBe(0);
  });
});

describe('scrollElementToTop', () => {
  it('scrolls the page so the element sits the offset below the top', () => {
    preferReducedMotion();
    const target = document.createElement('h2');
    target.style.cssText = 'margin: 1200px 0 3000px; height: 20px';
    document.body.append(target);
    scrollElementToTop(target, { offset: 64 });
    expect(target.getBoundingClientRect().top).toBeCloseTo(64, 0);
  });

  it('scrolls a container instead, leaving the page where it is', () => {
    preferReducedMotion();
    const { container, row } = column();
    // A border above the content doesn't count.
    container.style.borderTop = '5px solid';
    scrollElementToTop(row(6), { container, offset: 10 });
    expect(container.scrollTop).toBe(230);
    expect(window.scrollY).toBe(0);
  });

  it('scrolls smoothly unless the user prefers reduced motion', () => {
    const { container, row } = column();
    const scrollTo = vi.spyOn(container, 'scrollTo');
    scrollElementToTop(row(3), { container });
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 120, behavior: 'smooth' });
    preferReducedMotion();
    scrollElementToTop(row(3), { container });
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 120, behavior: 'instant' });
  });
});
