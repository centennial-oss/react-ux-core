// ScrollRegion: a labelled block that scrolls inside a maximum height, for long text a page shows in place (an
// agreement, a log excerpt). It takes keyboard focus so it can be scrolled without a mouse.
import type { ReactNode, Ref } from 'react';
import { cn } from '../../utils/cn';

export interface ScrollRegionProps {
  /** Names the region for assistive technology, for example "Terms of service". */
  'aria-label': string;
  /** The tallest it grows before it scrolls, as a CSS length. Defaults to `20rem`. */
  maxHeight?: string;
  children: ReactNode;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/** A focusable, labelled region that scrolls its content within `maxHeight`. */
export function ScrollRegion({
  'aria-label': ariaLabel,
  maxHeight = '20rem',
  children,
  className,
  ref,
}: ScrollRegionProps) {
  return (
    <div
      ref={ref}
      role="region"
      aria-label={ariaLabel}
      // A scrollable region must be focusable so keyboard users can scroll it (WCAG 2.1.1). It's a named region,
      // so screen readers say what it is when it takes focus.
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      // Dynamic geometry: the maximum height is the app's value, so it can't be a class.
      // eslint-disable-next-line no-restricted-syntax
      style={{ maxHeight }}
      className={cn(
        'min-w-0 overflow-y-auto overscroll-contain rounded-control border border-border bg-surface-1 p-4 text-fg outline-none focus-visible:focus-ring',
        className,
      )}
    >
      {children}
    </div>
  );
}
