/** Strings for SlugField. */
export interface SlugFieldMessages {
  /** Under the field while the slug follows its source text. */
  slugLinked: string;
  /** Under the field once the slug has been edited by hand. */
  slugUnlinked: string;
  /** The button that makes the slug follow its source again. */
  slugReset: string;
  /** The reset button's accessible name (it should contain the visible `slugReset` text). */
  slugResetLabel: string;
  /** Shown while `validate` runs. */
  slugChecking: string;
  /** Announced when `validate` finds no problem. */
  slugAvailable: string;
}

/** English defaults of SlugField's strings. */
export const defaultSlugFieldMessages: SlugFieldMessages = {
  slugLinked: 'Follows the title',
  slugUnlinked: 'Edited by hand',
  slugReset: 'Reset',
  slugResetLabel: 'Reset to follow the title',
  slugChecking: 'Checking…',
  slugAvailable: 'Available',
};
