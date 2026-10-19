// The RichTextEditor's behaviour plugins: keeping `value` and the document in step, enforcing the features
// (formatting, paste, drop), keyboard shortcuts and the editable state.
import { $isCodeNode } from '@lexical/code';
import { $isListItemNode, $isListNode, ListNode } from '@lexical/list';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { DRAG_DROP_PASTE } from '@lexical/rich-text';
import { $findMatchingParent, mergeRegister } from '@lexical/utils';
import {
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  CLEAR_HISTORY_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  INDENT_CONTENT_COMMAND,
  KEY_DOWN_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  PASTE_COMMAND,
  TextNode,
  type LexicalEditor,
  type TextFormatType,
} from 'lexical';
import { useEffect, type RefObject } from 'react';
import { isApplePlatform, matchesCommandShortcut } from '../utils/keyboard';
import { useLatest } from '../utils/useLatest';
import { shortcuts, type EditorAction } from './actions';
import { registerCodeHighlighting } from './codeHighlight';
import type { EditorFeature, EditorFeatureSet } from './features';
import { $exportValue, $importValue, $nodesFromHtml, type EditorCodec } from './value';

/** Tags updates that load `value`, so they aren't reported back through `onChange`. */
export const IMPORT_TAG = 'ccux-import';

const formatFeatures: Record<TextFormatType, EditorFeature | null> = {
  bold: 'bold',
  italic: 'italic',
  underline: 'underline',
  strikethrough: 'strike',
  code: 'code',
  highlight: null,
  subscript: null,
  superscript: null,
  lowercase: null,
  uppercase: null,
  capitalize: null,
};
const allFormats = Object.keys(formatFeatures) as TextFormatType[];

function isFormatAllowed(format: TextFormatType, features: EditorFeatureSet): boolean {
  const feature = formatFeatures[format];
  return feature !== null && features.has(feature);
}

/** Loads a value into the editor (JSON through Lexical's parser, the others through the importers). */
export function loadValue(editor: LexicalEditor, value: string, codec: EditorCodec): void {
  if (codec.format === 'json' && value.trim() !== '') {
    try {
      editor.setEditorState(editor.parseEditorState(value), { tag: IMPORT_TAG });
      return;
    } catch (error) {
      console.error(error);
    }
  }
  editor.update(
    () => {
      $importValue(editor, codec.format === 'json' ? '' : value, codec);
    },
    { tag: IMPORT_TAG },
  );
}

/**
 * Keeps the document and `value` in step: a new `value` from the app is loaded (unless it's the value the editor
 * just reported, which would loop), and each edit reports the document in the editor's format.
 */
export function ValuePlugin({
  value,
  codec,
  onChange,
  lastValueRef,
}: {
  value: string | undefined;
  codec: EditorCodec;
  onChange: (value: string) => void;
  lastValueRef: RefObject<string>;
}) {
  const [editor] = useLexicalComposerContext();
  const onChangeRef = useLatest(onChange);

  useEffect(() => {
    if (value === undefined || value === lastValueRef.current) {
      return;
    }
    lastValueRef.current = value;
    loadValue(editor, value, codec);
    editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
  }, [editor, value, codec, lastValueRef]);

  useEffect(
    () =>
      editor.registerUpdateListener(({ dirtyElements, dirtyLeaves, tags }) => {
        if (tags.has(IMPORT_TAG) || (dirtyElements.size === 0 && dirtyLeaves.size === 0)) {
          return;
        }
        const next = editor.read(() => $exportValue(editor, codec));
        if (next !== lastValueRef.current) {
          lastValueRef.current = next;
          onChangeRef.current(next);
        }
      }),
    [editor, codec, lastValueRef, onChangeRef],
  );
  return null;
}

/**
 * Holds the document to the features: formatting that's off can't be applied (shortcuts included), pasted HTML is
 * sanitised to the features, pasted inline styles are dropped, and dropped or pasted image files go to `onImageFiles`.
 * Also colours code blocks, and gives checklists group semantics (their items are checkboxes, which a list can't
 * hold).
 */
export function PolicyPlugin({
  features,
  onImageFiles,
}: {
  features: EditorFeatureSet;
  onImageFiles?: (files: File[]) => void;
}) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    const cleanups = [
      registerCodeHighlighting(editor),
      editor.registerNodeTransform(TextNode, (node) => {
        for (const format of allFormats) {
          if (node.hasFormat(format) && !isFormatAllowed(format, features)) {
            node.toggleFormat(format);
          }
        }
        if (node.getStyle() !== '') {
          node.setStyle('');
        }
      }),
      editor.registerCommand(
        FORMAT_TEXT_COMMAND,
        (format) => !isFormatAllowed(format, features),
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        PASTE_COMMAND,
        (event) => {
          if (!(event instanceof ClipboardEvent) || event.clipboardData === null) {
            return false;
          }
          const html = event.clipboardData.getData('text/html');
          if (html === '') {
            // Plain text and files: Lexical's own handling (files arrive as DRAG_DROP_PASTE).
            return false;
          }
          const text = event.clipboardData.getData('text/plain');
          event.preventDefault();
          editor.update(
            () => {
              const selection = $getSelection();
              if (!$isRangeSelection(selection)) {
                return;
              }
              if ($findMatchingParent(selection.anchor.getNode(), $isCodeNode) !== null) {
                selection.insertRawText(text);
                return;
              }
              selection.insertNodes($nodesFromHtml(editor, html, features));
            },
            { tag: 'paste' },
          );
          return true;
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand(
        DRAG_DROP_PASTE,
        (files) => {
          const images = files.filter((file) => file.type.startsWith('image/'));
          if (images.length > 0 && features.has('image') && onImageFiles !== undefined) {
            onImageFiles(images);
          }
          // Files are never inserted any other way.
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
    ];
    if (editor.hasNodes([ListNode])) {
      cleanups.push(
        editor.registerMutationListener(ListNode, (mutations) => {
          editor.getEditorState().read(() => {
            for (const [key, mutation] of mutations) {
              const node = $getNodeByKey(key);
              const element = editor.getElementByKey(key);
              if (mutation === 'destroyed' || !$isListNode(node) || element === null) {
                continue;
              }
              if (node.getListType() === 'check') {
                element.setAttribute('role', 'group');
              } else {
                element.removeAttribute('role');
              }
            }
          });
        }),
      );
    }
    return mergeRegister(...cleanups);
  }, [editor, features, onImageFiles]);
  return null;
}

/**
 * Runs the editor's keyboard shortcuts (bold, italic, underline, undo and redo are Lexical's own). The command key
 * with ] and [ indents and outdents (Tab is left to move focus, so the keyboard is never trapped), and with
 * checklists, the command key and Enter ticks or unticks the item at the caret.
 */
export function ShortcutsPlugin({
  actions,
  onAction,
}: {
  actions: readonly EditorAction[];
  onAction: (action: EditorAction) => void;
}) {
  const [editor] = useLexicalComposerContext();
  const onActionRef = useLatest(onAction);

  useEffect(() => {
    const isApple = isApplePlatform();
    const native = new Set<EditorAction>(['bold', 'italic', 'underline', 'undo', 'redo']);
    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event) => {
        if (
          actions.includes('check') &&
          event.key === 'Enter' &&
          (isApple ? event.metaKey : event.ctrlKey) &&
          !event.altKey &&
          !event.shiftKey
        ) {
          // Command listeners run inside an update, so the selection can be read and changed here.
          const selection = $getSelection();
          const item = $isRangeSelection(selection)
            ? $findMatchingParent(selection.anchor.getNode(), $isListItemNode)
            : null;
          const list = item?.getParent();
          if (item === null || !$isListNode(list) || list.getListType() !== 'check') {
            return false;
          }
          event.preventDefault();
          item.toggleChecked();
          return true;
        }
        const isCommand =
          (isApple ? event.metaKey : event.ctrlKey) && !event.altKey && !event.shiftKey;
        if (isCommand && (event.code === 'BracketRight' || event.code === 'BracketLeft')) {
          event.preventDefault();
          editor.dispatchCommand(
            event.code === 'BracketRight' ? INDENT_CONTENT_COMMAND : OUTDENT_CONTENT_COMMAND,
            undefined,
          );
          return true;
        }
        for (const action of actions) {
          if (action === 'mention' || native.has(action)) {
            continue;
          }
          if (matchesCommandShortcut(event, shortcuts[action], isApple)) {
            event.preventDefault();
            onActionRef.current(action);
            return true;
          }
        }
        return false;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor, actions, onActionRef]);
  return null;
}

/** Follows the field's disabled and read-only state. */
export function EditablePlugin({ isEditable }: { isEditable: boolean }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editor.setEditable(isEditable);
  }, [editor, isEditable]);
  return null;
}
