// The edit mask (EDIT-04): while a dashboard is being edited, the host's other UI is dimmed and inert, so nothing
// outside the edit session can be pressed or focused. Like a modal's "hide outside", it marks the dashboard's
// siblings at every level up to the body, and puts them back when editing ends. Layers React Aria keeps on top
// (toasts, with their Undo buttons) are left alone.

import { useLayoutEffect } from 'react';

/** Elements outside the mask's reach: React Aria's top layers and live regions. */
const KEEP = '[data-react-aria-top-layer], [aria-live]';

/** Makes everything outside `element` dimmed and inert while `isActive`. */
export function useEditMask(element: HTMLElement | null, isActive: boolean): void {
  useLayoutEffect(() => {
    if (!element || !isActive) {
      return;
    }
    const masked: { node: HTMLElement; isInertBefore: boolean; opacity: string }[] = [];
    for (
      let node: HTMLElement | null = element;
      node && node !== document.body;
      node = node.parentElement
    ) {
      const parent: HTMLElement | null = node.parentElement;
      for (const sibling of Array.from(parent?.children ?? [])) {
        if (
          sibling === node ||
          !(sibling instanceof HTMLElement) ||
          sibling.matches(KEEP) ||
          sibling.querySelector(KEEP)
        ) {
          continue;
        }
        masked.push({
          node: sibling,
          isInertBefore: sibling.inert,
          opacity: sibling.style.opacity,
        });
        sibling.inert = true;
        sibling.style.opacity = '0.4';
      }
    }
    return () => {
      for (const { node, isInertBefore, opacity } of masked) {
        node.inert = isInertBefore;
        node.style.opacity = opacity;
      }
    };
  }, [element, isActive]);
}
