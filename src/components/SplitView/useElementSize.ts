import { useCallback, useState } from 'react';

export interface ElementSize {
  width: number;
  height: number;
}

/**
 * The element and its size in CSS pixels, kept current with a ResizeObserver (like `useElementWidth`, with the
 * height too, and the element itself for reading its font size). Both are `undefined` until it's measured.
 */
export function useElementSize(): [
  (element: HTMLElement | null) => (() => void) | undefined,
  ElementSize | undefined,
  HTMLElement | null,
] {
  const [size, setSize] = useState<ElementSize | undefined>(undefined);
  const [element, setElement] = useState<HTMLElement | null>(null);
  const ref = useCallback((node: HTMLElement | null) => {
    setElement(node);
    if (!node) {
      return;
    }
    const rect = node.getBoundingClientRect();
    setSize({ width: rect.width, height: rect.height });
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, []);
  return [ref, size, element];
}
