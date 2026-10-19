// A visually hidden live region, for announcing what a control did (a row added, a value copied) to screen readers.
// Keep it mounted from the first render: screen readers don't announce a live region that's added along with its text.

import { useCallback, useRef, type ReactNode, type Ref } from 'react';

export interface LiveRegionProps {
  /** The text to announce. Leave it out when `useAnnouncer` writes the text. */
  children?: ReactNode;
  /** `assertive` interrupts the screen reader, for failures; defaults to `polite`. */
  politeness?: 'polite' | 'assertive';
  /** Reads the whole region when part of it changes. */
  isAtomic?: boolean;
  ref?: Ref<HTMLSpanElement>;
}

/** A visually hidden `aria-live` region. */
export function LiveRegion({
  children,
  politeness = 'polite',
  isAtomic = false,
  ref,
}: LiveRegionProps) {
  return (
    <span ref={ref} className="sr-only" aria-live={politeness} aria-atomic={isAtomic || undefined}>
      {children}
    </span>
  );
}

/**
 * Announces text through a `LiveRegion` given the returned `ref` (with no children). The text is written straight to
 * the region, without a render, and the same text twice is announced twice: the region is cleared first and the text
 * comes back on the next frame, since screen readers skip a change to the text they last read.
 */
export function useAnnouncer() {
  const ref = useRef<HTMLSpanElement>(null);
  const announce = useCallback((text: string) => {
    const region = ref.current;
    if (!region) {
      return;
    }
    if (region.textContent !== text) {
      region.textContent = text;
      return;
    }
    region.textContent = '';
    requestAnimationFrame(() => {
      // A newer announcement wins.
      if (region.textContent === '') {
        region.textContent = text;
      }
    });
  }, []);
  return { ref, announce };
}
