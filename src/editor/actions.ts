// The RichTextEditor's actions (the toolbar, the "/" menu and keyboard shortcuts all run these), their shortcuts,
// and what the selection currently looks like (for the toolbar's pressed states).
import { $createCodeNode, $isCodeNode } from '@lexical/code';
import { $isLinkNode } from '@lexical/link';
import {
  $isListNode,
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListNode,
  REMOVE_LIST_COMMAND,
} from '@lexical/list';
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
  type HeadingTagType,
} from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import { $findTableNode, INSERT_TABLE_COMMAND } from '@lexical/table';
import { $findMatchingParent, $getNearestNodeOfType } from '@lexical/utils';
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
  type ElementNode,
  type LexicalEditor,
  type LexicalNode,
} from 'lexical';
import type { CommandShortcut } from '../utils/keyboard';
import type { EditorFeature, EditorFeatureSet } from './features';
import { $insertDivider } from './nodes/DividerNode';
import type { EditorStrings } from './messages';

export type EditorAction =
  | 'undo'
  | 'redo'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'code'
  | 'link'
  | 'paragraph'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'quote'
  | 'bullet'
  | 'number'
  | 'check'
  | 'codeBlock'
  | 'image'
  | 'table'
  | 'divider'
  | 'mention';

/** The feature an action needs (`null`: always available). */
export const actionFeature: Record<EditorAction, EditorFeature | null> = {
  undo: null,
  redo: null,
  bold: 'bold',
  italic: 'italic',
  underline: 'underline',
  strike: 'strike',
  code: 'code',
  link: 'link',
  paragraph: null,
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  quote: 'quote',
  bullet: 'list',
  number: 'list',
  check: 'checklist',
  codeBlock: 'codeBlock',
  image: 'image',
  table: 'table',
  divider: 'divider',
  mention: 'mention',
};

export function isActionAvailable(action: EditorAction, features: EditorFeatureSet): boolean {
  const feature = actionFeature[action];
  return feature === null || features.has(feature);
}

/** An action's label. */
export function actionLabel(action: EditorAction, messages: EditorStrings): string {
  switch (action) {
    case 'undo':
      return messages.editorUndo;
    case 'redo':
      return messages.editorRedo;
    case 'bold':
      return messages.editorBold;
    case 'italic':
      return messages.editorItalic;
    case 'underline':
      return messages.editorUnderline;
    case 'strike':
      return messages.editorStrikethrough;
    case 'code':
      return messages.editorInlineCode;
    case 'link':
      return messages.editorLink;
    case 'paragraph':
      return messages.editorParagraph;
    case 'h1':
      return messages.editorHeading({ level: 1 });
    case 'h2':
      return messages.editorHeading({ level: 2 });
    case 'h3':
      return messages.editorHeading({ level: 3 });
    case 'quote':
      return messages.editorQuote;
    case 'bullet':
      return messages.editorBulletList;
    case 'number':
      return messages.editorNumberedList;
    case 'check':
      return messages.editorChecklist;
    case 'codeBlock':
      return messages.editorCodeBlock;
    case 'image':
      return messages.editorImage;
    case 'table':
      return messages.editorTable;
    case 'divider':
      return messages.editorDivider;
    case 'mention':
      return messages.editorMention;
  }
}

/** A keyboard shortcut: the platform's command key (⌘ on Apple devices, Ctrl elsewhere) plus `code`. */
export type Shortcut = CommandShortcut;

/**
 * Every action's shortcut. Bold, italic, underline, undo and redo use the standard keys; headings and lists follow
 * Google Docs. Mentions start by typing "@", and the "/" menu by typing "/".
 */
export const shortcuts: Record<Exclude<EditorAction, 'mention'>, Shortcut> = {
  undo: { code: 'KeyZ', key: 'Z' },
  redo: { code: 'KeyZ', key: 'Z', isShift: true },
  bold: { code: 'KeyB', key: 'B' },
  italic: { code: 'KeyI', key: 'I' },
  underline: { code: 'KeyU', key: 'U' },
  strike: { code: 'KeyX', key: 'X', isShift: true },
  code: { code: 'KeyE', key: 'E' },
  link: { code: 'KeyK', key: 'K' },
  paragraph: { code: 'Digit0', key: '0', isAlt: true },
  h1: { code: 'Digit1', key: '1', isAlt: true },
  h2: { code: 'Digit2', key: '2', isAlt: true },
  h3: { code: 'Digit3', key: '3', isAlt: true },
  quote: { code: 'KeyQ', key: 'Q', isAlt: true },
  number: { code: 'Digit7', key: '7', isShift: true },
  bullet: { code: 'Digit8', key: '8', isShift: true },
  check: { code: 'Digit9', key: '9', isShift: true },
  codeBlock: { code: 'KeyC', key: 'C', isAlt: true },
  image: { code: 'KeyP', key: 'P', isAlt: true },
  table: { code: 'KeyT', key: 'T', isAlt: true },
  divider: { code: 'KeyR', key: 'R', isAlt: true },
};

export type BlockType =
  'paragraph' | HeadingTagType | 'quote' | 'bullet' | 'number' | 'check' | 'code';

/** The formatting at the selection, for the toolbar's pressed states. */
export interface SelectionFormat {
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  isStrike: boolean;
  isCode: boolean;
  isLink: boolean;
  isInTable: boolean;
  blockType: BlockType;
}

export const emptyFormat: SelectionFormat = {
  isBold: false,
  isItalic: false,
  isUnderline: false,
  isStrike: false,
  isCode: false,
  isLink: false,
  isInTable: false,
  blockType: 'paragraph',
};

/** The block the selection starts in (the root or a table cell's direct child). */
function $topBlock(node: LexicalNode): ElementNode | null {
  const found = $findMatchingParent(node, (candidate) => {
    const parent = candidate.getParent();
    return parent !== null && $isRootOrShadowRoot(parent);
  });
  return found !== null && 'getChildren' in found ? (found as ElementNode) : null;
}

export function $blockType(): BlockType {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return 'paragraph';
  }
  const anchor = selection.anchor.getNode();
  const block = $topBlock(anchor);
  if ($isListNode(block)) {
    const list = $getNearestNodeOfType(anchor, ListNode) ?? block;
    return list.getListType();
  }
  if ($isHeadingNode(block)) {
    return block.getTag();
  }
  if ($isQuoteNode(block)) {
    return 'quote';
  }
  if ($isCodeNode(block)) {
    return 'code';
  }
  return 'paragraph';
}

export function $selectionFormat(): SelectionFormat {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return emptyFormat;
  }
  const node = selection.anchor.getNode();
  return {
    isBold: selection.hasFormat('bold'),
    isItalic: selection.hasFormat('italic'),
    isUnderline: selection.hasFormat('underline'),
    isStrike: selection.hasFormat('strikethrough'),
    isCode: selection.hasFormat('code'),
    isLink: $isLinkNode(node) || $findMatchingParent(node, $isLinkNode) !== null,
    isInTable: $findTableNode(node) !== null,
    blockType: $blockType(),
  };
}

function $setBlock(create: () => ElementNode): void {
  const selection = $getSelection();
  if ($isRangeSelection(selection)) {
    $setBlocksType(selection, create);
  }
}

/** Callbacks for actions that open the editor's own UI. */
export interface ActionHandlers {
  openLink: () => void;
  openImage: () => void;
}

/** Runs an action on the editor. */
export function runAction(
  editor: LexicalEditor,
  action: EditorAction,
  handlers: ActionHandlers,
): void {
  switch (action) {
    case 'undo':
      editor.dispatchCommand(UNDO_COMMAND, undefined);
      return;
    case 'redo':
      editor.dispatchCommand(REDO_COMMAND, undefined);
      return;
    case 'bold':
    case 'italic':
    case 'underline':
    case 'code':
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, action);
      return;
    case 'strike':
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
      return;
    case 'link':
      handlers.openLink();
      return;
    case 'image':
      handlers.openImage();
      return;
    case 'table':
      editor.dispatchCommand(INSERT_TABLE_COMMAND, {
        rows: '3',
        columns: '3',
        includeHeaders: { rows: true, columns: false },
      });
      return;
    case 'divider':
      editor.update($insertDivider);
      return;
    case 'mention':
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const before = selection.anchor
            .getNode()
            .getTextContent()
            .charAt(selection.anchor.offset - 1);
          selection.insertText(before === '' || /\s/.test(before) ? '@' : ' @');
        }
      });
      return;
    case 'bullet':
    case 'number':
    case 'check':
      editor.update(() => {
        if ($blockType() === action) {
          editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
        } else if (action === 'bullet') {
          editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
        } else if (action === 'number') {
          editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
        } else {
          editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
        }
      });
      return;
    case 'paragraph':
    case 'h1':
    case 'h2':
    case 'h3':
    case 'quote':
    case 'codeBlock':
      editor.update(() => {
        const current = $blockType();
        const target = action === 'codeBlock' ? 'code' : action;
        if (current === target || target === 'paragraph') {
          $setBlock(() => $createParagraphNode());
        } else if (target === 'quote') {
          $setBlock(() => $createQuoteNode());
        } else if (target === 'code') {
          $setBlock(() => $createCodeNode());
        } else {
          $setBlock(() => $createHeadingNode(target));
        }
      });
      return;
  }
}
