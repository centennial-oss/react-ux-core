// Player keyboard shortcuts, handled on the player's root so they work wherever focus is inside it, except where a
// control needs the key itself: Space and Enter on buttons and menu items, arrows on other sliders and in lists, and
// everything in text fields.

import type { KeyboardEvent } from 'react';
import { isRightToLeft } from '../../utils/direction';

export type MediaKeyAction =
  | { type: 'toggle' }
  | { type: 'seek'; delta: number }
  | { type: 'mute' }
  | { type: 'fullscreen' }
  | { type: 'captions' };

/** Seconds an arrow key seeks, and with Shift. */
export const ARROW_SEEK = 5;
export const SHIFT_ARROW_SEEK = 30;

/** Marks the elements whose arrow keys seek media (the seek slider, the waveform). */
export const SEEK_ATTRIBUTE = 'data-media-seek';

function isEditable(target: HTMLElement): boolean {
  return (
    target.isContentEditable ||
    (target instanceof HTMLInputElement && target.type !== 'range') ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

/** The action for a key press inside a player, or null when the focused control should keep the key. */
export function mediaKeyAction(event: KeyboardEvent<HTMLElement>): MediaKeyAction | null {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
    return null;
  }
  const target = event.target as HTMLElement;
  if (isEditable(target) || target.closest('[role="menu"], [role="listbox"], [role="dialog"]')) {
    return null;
  }
  const isControl = target.closest('button, a[href], [role="button"], [role="menuitem"]') !== null;
  const isSlider = target instanceof HTMLInputElement && target.type === 'range';
  const isSeek = target.closest(`[${SEEK_ATTRIBUTE}]`) !== null;
  switch (event.key) {
    case ' ':
    case 'k':
    case 'K':
      return isControl && event.key === ' ' ? null : { type: 'toggle' };
    case 'ArrowLeft':
    case 'ArrowRight': {
      if (isSlider && !isSeek) {
        return null;
      }
      const isRtl = isRightToLeft(target);
      const forward = (event.key === 'ArrowRight') !== isRtl;
      const size = event.shiftKey ? SHIFT_ARROW_SEEK : ARROW_SEEK;
      return { type: 'seek', delta: forward ? size : -size };
    }
    case 'm':
    case 'M':
      return { type: 'mute' };
    case 'f':
    case 'F':
      return { type: 'fullscreen' };
    case 'c':
    case 'C':
      return { type: 'captions' };
    default:
      return null;
  }
}
