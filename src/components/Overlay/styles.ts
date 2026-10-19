// Shared overlay styling. Every class is a complete static string (Tailwind scans for them).

/**
 * The surface of an anchored popover (menus, selects, popovers, date pickers). It's at least as wide as its trigger but
 * never wider than the page less React Aria's 12 px edge padding on each side (percentages here are of the page,
 * the popover's containing block), so a full-width trigger can't push it past the screen edge.
 */
export const popoverClasses = [
  'z-dropdown max-w-[calc(100%-24px)] min-w-[min(var(--trigger-width),calc(100%-24px))] overflow-auto rounded-card border border-border bg-surface-2 text-fg shadow-overlay outline-none',
  'data-entering:animate-[rux-pop-in_var(--duration-fast)_var(--ease-standard)]',
  'data-exiting:animate-[rux-pop-out_var(--duration-fast)_var(--ease-standard)]',
].join(' ');

/** The arrow of a popover with `hasArrow`. */
export const arrowClasses =
  'block fill-surface-2 stroke-border group-data-[placement=bottom]/popover:rotate-180 group-data-[placement=left]/popover:-rotate-90 group-data-[placement=right]/popover:rotate-90';
