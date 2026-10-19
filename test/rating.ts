// Helpers for Rating and RatingDisplay tests.

/** How many of a rating's icons are filled, counting a part-filled icon as its fraction. */
export function filledIcons(row: Element): number {
  return [...row.querySelectorAll<HTMLElement>(':scope > span')].reduce((sum, slot) => {
    const clip = slot.querySelector<HTMLElement>(':scope > span');
    if (clip) {
      return sum + clip.getBoundingClientRect().width / slot.getBoundingClientRect().width;
    }
    // A full icon is drawn filled alone, without the outline under it.
    return sum + (slot.querySelector('svg.fill-current') ? 1 : 0);
  }, 0);
}
