// Strings for `/editor` (RichTextEditor), with English defaults and the hook its components read them through.
import type { CommonMessages } from '../provider/coreStrings';
import { useEntryMessages } from '../provider/context';

/** Strings for `/editor`. Override any of them through `UIProvider`'s `messages`. */
export interface EditorMessages {
  /** Names the formatting toolbar. */
  editorToolbar: string;
  /** Toolbar buttons and slash-menu items. */
  editorUndo: string;
  editorRedo: string;
  editorBold: string;
  editorItalic: string;
  editorUnderline: string;
  editorStrikethrough: string;
  editorInlineCode: string;
  editorLink: string;
  editorParagraph: string;
  /** A heading level, for example "Heading 2". */
  editorHeading: (params: { level: number }) => string;
  editorQuote: string;
  editorBulletList: string;
  editorNumberedList: string;
  editorChecklist: string;
  editorCodeBlock: string;
  editorImage: string;
  editorTable: string;
  editorDivider: string;
  editorMention: string;
  /** Table menu (shown while the caret is in a table) and its items. */
  editorTableActions: string;
  editorInsertRowBelow: string;
  editorInsertColumnAfter: string;
  editorDeleteRow: string;
  editorDeleteColumn: string;
  editorDeleteTable: string;
  /** Names of modifier keys in shortcut hints on Windows and Linux (macOS shows ⌘ ⌥ ⇧). */
  editorKeyCtrl: string;
  editorKeyAlt: string;
  editorKeyShift: string;
  /** Link popover. */
  editorLinkTitle: string;
  editorLinkUrl: string;
  editorLinkInvalid: string;
  editorLinkOpen: string;
  editorLinkRemove: string;
  /** Image dialog. */
  editorImageTitle: string;
  editorImageEditTitle: string;
  editorImageChoose: string;
  editorImageUrl: string;
  editorImageAlt: string;
  editorImageAltDescription: string;
  editorImageAltRequired: string;
  editorImageUrlRequired: string;
  editorImageInsert: string;
  editorImageUploading: string;
  editorImageUploadFailed: string;
  /** Names the "/" menu of blocks.  */
  editorBlocks: string;
  /** Mention menu: its name and its empty state. */
  editorPeople: string;
  editorNoPeople: string;
}

export const defaultEditorMessages: EditorMessages = {
  editorToolbar: 'Formatting',
  editorUndo: 'Undo',
  editorRedo: 'Redo',
  editorBold: 'Bold',
  editorItalic: 'Italic',
  editorUnderline: 'Underline',
  editorStrikethrough: 'Strikethrough',
  editorInlineCode: 'Inline code',
  editorLink: 'Link',
  editorParagraph: 'Text',
  editorHeading: ({ level }) => `Heading ${level}`,
  editorQuote: 'Quote',
  editorBulletList: 'Bulleted list',
  editorNumberedList: 'Numbered list',
  editorChecklist: 'Checklist',
  editorCodeBlock: 'Code block',
  editorImage: 'Image',
  editorTable: 'Table',
  editorDivider: 'Divider',
  editorMention: 'Mention someone',
  editorTableActions: 'Table actions',
  editorInsertRowBelow: 'Insert row below',
  editorInsertColumnAfter: 'Insert column after',
  editorDeleteRow: 'Delete row',
  editorDeleteColumn: 'Delete column',
  editorDeleteTable: 'Delete table',
  editorKeyCtrl: 'Ctrl',
  editorKeyAlt: 'Alt',
  editorKeyShift: 'Shift',
  editorLinkTitle: 'Link',
  editorLinkUrl: 'Web address',
  editorLinkInvalid: 'Enter a web address (https://…), an email link (mailto:…) or a path (/…).',
  editorLinkOpen: 'Open link',
  editorLinkRemove: 'Remove link',
  editorImageTitle: 'Insert image',
  editorImageEditTitle: 'Image description',
  editorImageChoose: 'Choose image',
  editorImageUrl: 'Image address',
  editorImageAlt: 'Alt text',
  editorImageAltDescription:
    'Describe the image for people who can’t see it. Screen readers read this aloud.',
  editorImageAltRequired: 'Describe the image before inserting it.',
  editorImageUrlRequired: 'Enter an image address (https://…).',
  editorImageInsert: 'Insert',
  editorImageUploading: 'Uploading image…',
  editorImageUploadFailed: 'The image couldn’t be uploaded. Try again.',
  editorBlocks: 'Insert block',
  editorPeople: 'People',
  editorNoPeople: 'No matches',
};

/** The strings `/editor` components read: the core strings and `/editor`'s own. */
export type EditorStrings = CommonMessages & EditorMessages;

/** `/editor`'s strings, with the app's overrides from `UIProvider`. */
export function useEditorMessages(): EditorStrings {
  return useEntryMessages(defaultEditorMessages);
}
