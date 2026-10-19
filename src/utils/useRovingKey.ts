// Roving focus over elements marked with `data-key` inside a container, for grids whose cells are drawn by position
// (ScheduleTimeline's lanes and items, EventCalendar's days and events): one Tab stop that follows focus, moving focus
// by key, and putting focus back on an element after an edit re-renders it somewhere else.

import { useEffect, useRef, useState, type RefObject } from 'react';

export interface RovingKey {
  /** The key focus was last on (the Tab stop), or null before anything was focused. */
  activeKey: string | null;
  setActiveKey: (key: string) => void;
  /** The element with this `data-key`, if it's rendered. */
  elementFor: (key: string) => HTMLElement | null;
  /** Makes `key` the Tab stop and focuses its element. */
  focusKey: (key: string) => void;
  /**
   * Focuses `key`'s element after the next render that has it, such as after a keyboard move re-renders an item in
   * another row.
   */
  restoreFocusTo: (key: string) => void;
}

export function useRovingKey(containerRef: RefObject<HTMLElement | null>): RovingKey {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const restoreTo = useRef<string | null>(null);
  const elementFor = (key: string) =>
    containerRef.current?.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`) ?? null;

  // No dependency list: the element may only appear after the app applies the change, in any later render.
  useEffect(() => {
    const key = restoreTo.current;
    if (key === null) {
      return;
    }
    const element = elementFor(key);
    if (element) {
      restoreTo.current = null;
      if (document.activeElement !== element) {
        element.focus();
      }
    }
  });

  return {
    activeKey,
    setActiveKey,
    elementFor,
    focusKey: (key) => {
      setActiveKey(key);
      elementFor(key)?.focus();
    },
    restoreFocusTo: (key) => {
      restoreTo.current = key;
    },
  };
}
