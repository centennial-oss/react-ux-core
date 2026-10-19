/** Colour role of a component: every component that has a tone uses this set. */
export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

/** Tone for status and feedback components (banners, toasts), where "info" replaces "accent". */
export type FeedbackTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export type Size = 'sm' | 'md' | 'lg';

/** Heading level for components that render a heading, so they fit the page's outline. */
export type HeadingLevel = 2 | 3 | 4 | 5 | 6;

/** A required accessible name: `aria-label`, or `aria-labelledby` pointing at a visible label. */
export type AccessibleNameProps =
  | { 'aria-label': string; 'aria-labelledby'?: string }
  | { 'aria-label'?: string; 'aria-labelledby': string };
