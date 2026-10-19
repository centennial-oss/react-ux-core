// What keyboard focus can reach.

/**
 * Elements that take focus from the Tab key: links, enabled form controls (not hidden inputs), editable text, and
 * anything with a tabindex other than -1.
 */
export const TABBABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

/**
 * Moves focus to `element` without scrolling, making it focusable by script first (`tabindex="-1"`, which keeps it out
 * of the Tab order) when it isn't already: a section reached from an in-page link, so Tab carries on from there and
 * screen readers read from it.
 */
export function focusTarget(element: HTMLElement): void {
  if (!element.hasAttribute('tabindex') && !element.matches(TABBABLE_SELECTOR)) {
    element.setAttribute('tabindex', '-1');
  }
  element.focus({ preventScroll: true });
}
