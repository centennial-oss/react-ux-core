/** Strings for CopyField and CopyButton (the core `copy` and `copied` strings are shared). */
export interface CopyFieldMessages {
  /** A copy button's name for a labelled value ("Copy Webhook URL"). */
  copyNamed: (params: { label: string }) => string;
  /** Shown and announced when the clipboard refuses the copy. */
  copyFailedHelp: string;
}

/** English defaults of CopyField's and CopyButton's strings. */
export const defaultCopyFieldMessages: CopyFieldMessages = {
  copyNamed: ({ label }) => `Copy ${label}`,
  copyFailedHelp: 'Couldn’t copy. Select the text and copy it instead.',
};
