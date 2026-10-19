// Which of a Toolbar's items fit in its bar, and which move into the "More actions" menu.
import { useLayoutEffect, useMemo, useRef, useState, type RefCallback } from 'react';
import { overflowByPriority } from '../../utils/overflow';
import { useLatest } from '../../utils/useLatest';
import type { ButtonSize } from '../Button/Button.styles';
import type { ToolbarItem } from './Toolbar';

type Orientation = 'horizontal' | 'vertical';

const EMPTY: ReadonlySet<string> = new Set();

/** What an item's size depends on: the button size, whether it shows an icon, text or both, and its text. */
function shapeOf(item: ToolbarItem, size: ButtonSize): string {
  const content = item.isIconOnly === true ? 'icon' : item.icon === undefined ? 'text' : 'both';
  return `${size}\u0000${content}\u0000${item.label}`;
}

function sameSet(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  return a.size === b.size && [...a].every((id) => b.has(id));
}

/**
 * How much an ancestor's transform (an overlay scaling in, say) shrinks or grows the area: its drawn size over its
 * layout size, or 1 when there's no transform. `offsetWidth` is whole pixels, so differences under 1% are rounding.
 */
function scaleOf(drawn: number, layout: number): number {
  const scale = layout > 0 ? drawn / layout : 0;
  return Math.abs(scale - 1) < 0.01 ? 1 : scale;
}

/** The margins along the toolbar, which a separator has. */
function marginsOf(element: HTMLElement, isVertical: boolean): number {
  const style = getComputedStyle(element);
  return isVertical
    ? parseFloat(style.marginTop) + parseFloat(style.marginBottom)
    : parseFloat(style.marginLeft) + parseFloat(style.marginRight);
}

export interface ToolbarOverflow {
  /** For the element that holds the items and the "More actions" button. */
  ref: RefCallback<HTMLDivElement>;
  /** The ids of the items in the menu. */
  hidden: ReadonlySet<string>;
}

/**
 * Works out which items fit from their sizes, kept as each is shown, so only the shown items are measured. One
 * ResizeObserver watches the items' area and each shown item: the fit is checked again when the area resizes or an
 * item does (a web font arriving, a new `size`), and when the items' ids, text, priorities or groups change, never
 * merely because the parent passed a new array. Sizes are layout sizes, so an overlay's opening scale doesn't change
 * them. While an item has never been measured, every item shows.
 *
 * Keyboard focus stays in the toolbar: on an item that moves into the menu, it goes to "More actions"; on "More
 * actions" when it goes because everything fits, it goes to the last item.
 */
export function useToolbarOverflow(
  items: readonly ToolbarItem[],
  orientation: Orientation,
  size: ButtonSize,
): ToolbarOverflow {
  const isVertical = orientation === 'vertical';
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [hidden, setHidden] = useState<ReadonlySet<string>>(EMPTY);
  /** Each item's size along the toolbar and the shape it was measured with; the menu button's and a separator's. */
  const cache = useRef({
    sizes: new Map<string, number>(),
    shapes: new Map<string, string>(),
    more: 0,
    separator: 0,
  });
  const watcher = useRef<{ observer: ResizeObserver; watched: Set<Element> } | null>(null);
  const pendingFocus = useRef<'more' | 'last' | null>(null);
  const signature = useMemo(
    () =>
      items
        .map((item) =>
          [item.id, shapeOf(item, size), item.priority ?? 0, item.group ?? ''].join('\u0000'),
        )
        .join('\u0001'),
    [items, size],
  );

  const measure = useLatest(() => {
    if (!element || items.length === 0) {
      return;
    }
    const areaRect = element.getBoundingClientRect();
    const drawn = isVertical ? areaRect.height : areaRect.width;
    const scale = scaleOf(drawn, isVertical ? element.offsetHeight : element.offsetWidth);
    if (scale === 0) {
      // Not laid out (inside something hidden): nothing to measure.
      return;
    }
    const along = (node: HTMLElement) => {
      const rect = node.getBoundingClientRect();
      return (isVertical ? rect.height : rect.width) / scale;
    };

    const { sizes, shapes } = cache.current;
    const nodes = element.querySelectorAll<HTMLElement>('[data-toolbar-item]');
    const shown = new Set<string>();
    let crossSize = 0;
    for (const node of nodes) {
      const id = node.dataset.toolbarItem ?? '';
      sizes.set(id, along(node));
      shown.add(id);
      crossSize ||= isVertical ? node.offsetWidth : node.offsetHeight;
    }
    const watch = watcher.current;
    if (watch) {
      for (const node of nodes) {
        if (!watch.watched.has(node)) {
          watch.observer.observe(node);
          watch.watched.add(node);
        }
      }
      for (const node of watch.watched) {
        if (!node.isConnected) {
          watch.observer.unobserve(node);
          watch.watched.delete(node);
        }
      }
    }
    // A separator is a div with the separator role when vertical, an hr when horizontal.
    const separator = element.querySelector<HTMLElement>('[role="separator"], hr');
    if (separator) {
      cache.current.separator = along(separator) + marginsOf(separator, isVertical);
    }
    const more = element.querySelector<HTMLElement>('[data-toolbar-more]');
    if (more) {
      cache.current.more = along(more);
    }

    // A hidden item whose text or look has changed since it was measured has to be shown to be measured again.
    const ids = new Set<string>();
    let isUnmeasured = false;
    for (const item of items) {
      ids.add(item.id);
      const shape = shapeOf(item, size);
      if (shown.has(item.id)) {
        shapes.set(item.id, shape);
      } else if (shapes.get(item.id) !== shape) {
        sizes.delete(item.id);
      }
      isUnmeasured ||= !sizes.has(item.id);
    }
    if (sizes.size > ids.size) {
      for (const id of sizes.keys()) {
        if (!ids.has(id)) {
          sizes.delete(id);
          shapes.delete(id);
        }
      }
    }
    if (isUnmeasured) {
      setHidden(EMPTY);
      return;
    }

    const style = getComputedStyle(element);
    const groups = new Map<string | undefined, number>();
    const overflowing = overflowByPriority(
      items.map((item) => {
        if (!groups.has(item.group)) {
          groups.set(item.group, groups.size);
        }
        return {
          size: sizes.get(item.id) ?? 0,
          priority: item.priority ?? 0,
          segment: groups.get(item.group),
        };
      }),
      drawn / scale,
      {
        gap: parseFloat(isVertical ? style.rowGap : style.columnGap) || 0,
        // Before the "More actions" button has shown, it's as wide as the item buttons are tall (it's square).
        moreSize: cache.current.more || crossSize,
        separatorSize: cache.current.separator,
      },
    );
    const next: ReadonlySet<string> =
      overflowing.length === 0
        ? EMPTY
        : new Set(overflowing.map((index) => items[index]?.id ?? ''));
    if (sameSet(next, hidden)) {
      return;
    }
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && element.contains(focused)) {
      const focusedId = focused.closest<HTMLElement>('[data-toolbar-item]')?.dataset.toolbarItem;
      if (focusedId !== undefined && next.has(focusedId)) {
        pendingFocus.current = 'more';
      } else if (next.size === 0 && focused.closest('[data-toolbar-more]')) {
        pendingFocus.current = 'last';
      }
    }
    setHidden((current) => (sameSet(current, next) ? current : next));
  });

  // One observer for the area and the shown items; `measure` adds and drops the items as they come and go.
  useLayoutEffect(() => {
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(() => {
      measure.current();
    });
    observer.observe(element);
    watcher.current = { observer, watched: new Set([element]) };
    return () => {
      observer.disconnect();
      watcher.current = null;
    };
  }, [element, measure]);

  useLayoutEffect(() => {
    measure.current();
  }, [element, signature, hidden, isVertical, measure]);

  // After the items change places, focus goes where `measure` decided.
  useLayoutEffect(() => {
    const target = pendingFocus.current;
    pendingFocus.current = null;
    if (!element || target === null) {
      return;
    }
    const node =
      target === 'more'
        ? element.querySelector<HTMLElement>('[data-toolbar-more] button')
        : Array.from(element.querySelectorAll<HTMLElement>('[data-toolbar-item]'))
            .at(-1)
            ?.querySelector<HTMLElement>('button');
    node?.focus();
  }, [element, hidden]);

  return { ref: setElement, hidden };
}
