// The layout direction an element actually has.

/**
 * Whether an element lays out right to left: its computed CSS `direction`, which follows `dir` attributes and the
 * `rtl:` classes. Use it for pointer positions and arrow keys, which must match what's drawn; the UIProvider locale's
 * direction can differ from the page's.
 */
export function isRightToLeft(element: Element | null | undefined): boolean {
  return element ? getComputedStyle(element).direction === 'rtl' : false;
}
