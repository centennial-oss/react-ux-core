// Moving focus to the first invalid field after a failed submit.

const FOCUSABLE =
  'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Focuses the first invalid field in the form (in document order, which follows the layout) and scrolls it to the
 * middle of the screen, clear of sticky action bars. Returns whether a field was found.
 */
export function focusFirstInvalid(root: HTMLElement | null): boolean {
  const wrapper = root?.querySelector<HTMLElement>('[data-form-field][data-invalid]');
  if (!wrapper) {
    return false;
  }
  const target =
    wrapper.querySelector<HTMLElement>('[aria-invalid="true"]') ??
    wrapper.querySelector<HTMLElement>(FOCUSABLE);
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  wrapper.scrollIntoView({ block: 'center', behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  target?.focus({ preventScroll: true });
  return true;
}
