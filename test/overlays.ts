import { expect } from 'vitest';

/**
 * Waits for an overlay to finish arriving: a popover's fade-in, or a sheet's slide-in (phones, and drawers), and focus
 * moving in. Interact with an overlay only once it has settled. Colour checks need full opacity, and a sheet slides in
 * by scrolling its own container: focusing a field in it before it has arrived scrolls that container too, and React
 * Aria can then see the sheet leave the screen and close it, taking its content (and any element a test holds) away.
 */
export async function settleOverlay(dialog: HTMLElement) {
  await expect.poll(() => document.querySelector('[data-entering]')).toBeNull();
  if (dialog.closest('[data-position]')) {
    await expect.poll(() => dialog.closest('[data-expanded]')).not.toBeNull();
  }
  await expect.poll(() => dialog.contains(document.activeElement)).toBe(true);
  return dialog;
}

/**
 * Waits for every closing overlay to finish leaving. A sheet or popover on its way out still covers the page, so a
 * click on something beneath it lands on the overlay instead.
 */
export async function settleExit() {
  await expect.poll(() => document.querySelector('[data-exiting]')).toBeNull();
}
