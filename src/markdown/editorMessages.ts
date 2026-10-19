// MarkdownEditor's strings. They live beside the `/markdown` entry's other strings and are merged into its hook
// (`useMarkdownMessages`); the interface joins the `Messages` union in provider/messages.ts.

export interface MarkdownEditorMessages {
  /** The tab that shows the editor, in the tabs layout. */
  markdownEditorWrite: string;
  /** The tab, or the side-by-side pane's heading, that shows the rendered Markdown. */
  markdownEditorPreview: string;
  /** Names the Write / Preview tab list. */
  markdownEditorView: string;
  /** Names the formatting toolbar. */
  markdownEditorToolbar: string;
  markdownEditorBold: string;
  markdownEditorItalic: string;
  markdownEditorCode: string;
  markdownEditorLink: string;
  /** The heading button, which cycles a line through #, ## and ### and back to plain text. */
  markdownEditorHeading: string;
  markdownEditorQuote: string;
  markdownEditorBulletedList: string;
  markdownEditorNumberedList: string;
  markdownEditorTaskList: string;
  markdownEditorCodeBlock: string;
  markdownEditorImage: string;
  /** The Control key in shortcut hints on Windows, Linux and Android (Apple devices show ⌘). */
  markdownEditorKeyCtrl: string;
  /** The Alt key in shortcut hints (Apple devices show ⌥). */
  markdownEditorKeyAlt: string;
  /** The Shift key in shortcut hints (Apple devices show ⇧). */
  markdownEditorKeyShift: string;
  /** Inserted where a link's or an image's address goes, selected so typing replaces it. */
  markdownEditorUrlPlaceholder: string;
  /** The editor's description for screen readers: what Tab does, and how to leave the editor. */
  markdownEditorKeyboardHelp: string;
  /** Shown under the editor while Tab and Shift+Tab indent and outdent (the caret is in a list). */
  markdownEditorTabIndents: string;
  /** Shown under the editor after Escape, while the next Tab moves on instead of indenting. */
  markdownEditorTabMovesFocus: string;
  /** The preview of an empty document. */
  markdownEditorEmptyPreview: string;
  /** The placeholder inserted (as an image's alt text) while an image uploads. */
  markdownEditorUploading: (values: { name: string }) => string;
  /** Announced when an image couldn't be uploaded. */
  markdownEditorUploadFailed: (values: { name: string }) => string;
}

export const defaultMarkdownEditorMessages: MarkdownEditorMessages = {
  markdownEditorWrite: 'Write',
  markdownEditorPreview: 'Preview',
  markdownEditorView: 'View',
  markdownEditorToolbar: 'Formatting',
  markdownEditorBold: 'Bold',
  markdownEditorItalic: 'Italic',
  markdownEditorCode: 'Code',
  markdownEditorLink: 'Link',
  markdownEditorHeading: 'Heading',
  markdownEditorQuote: 'Quote',
  markdownEditorBulletedList: 'Bulleted list',
  markdownEditorNumberedList: 'Numbered list',
  markdownEditorTaskList: 'Task list',
  markdownEditorCodeBlock: 'Code block',
  markdownEditorImage: 'Image',
  markdownEditorKeyCtrl: 'Ctrl',
  markdownEditorKeyAlt: 'Alt',
  markdownEditorKeyShift: 'Shift',
  markdownEditorUrlPlaceholder: 'url',
  markdownEditorKeyboardHelp:
    'Markdown. In a list, Tab and Shift+Tab indent and outdent. Press Escape, then Tab, to leave the editor.',
  markdownEditorTabIndents: 'Tab indents. Press Esc, then Tab, to move on.',
  markdownEditorTabMovesFocus: 'Tab now moves to the next control.',
  markdownEditorEmptyPreview: 'Nothing to preview yet.',
  markdownEditorUploading: ({ name }) => `Uploading ${name}…`,
  markdownEditorUploadFailed: ({ name }) => `Couldn’t upload ${name}. Try again.`,
};
