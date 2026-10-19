// The RichTextEditor's toolbar: a `toolbar` with roving focus (arrow keys move between buttons, Tab leaves), toggle
// buttons showing what's applied at the caret (`aria-pressed`), and every button's shortcut in its tooltip and
// `aria-keyshortcuts`. It sticks to the top while a long document scrolls the page, and scrolls sideways on phones.
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $deleteTableColumnAtSelection,
  $deleteTableRowAtSelection,
  $findTableNode,
  $insertTableColumnAtSelection,
  $insertTableRowAtSelection,
} from '@lexical/table';
import { mergeRegister } from '@lexical/utils';
import { Table2 } from 'lucide-react';
import {
  $getSelection,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_LOW,
} from 'lexical';
import { useEffect, useState, type RefObject } from 'react';
import type { Key, PressEvent } from 'react-aria-components';
import { IconButton } from '../components/IconButton/IconButton';
import { Menu, MenuItem, MenuSeparator, MenuTrigger } from '../components/Menu/Menu';
import { Separator } from '../components/Separator/Separator';
import { ToolbarFrame } from '../components/Toolbar/ToolbarFrame';
import { renderToolbarGroups } from '../components/Toolbar/toolbarGroups';
import { Tooltip } from '../components/Tooltip/Tooltip';
import { isApplePlatform } from '../utils/keyboard';
import { ShortcutButton } from '../utils/ShortcutToolbar';
import {
  $selectionFormat,
  actionLabel,
  emptyFormat,
  shortcuts,
  type EditorAction,
  type SelectionFormat,
} from './actions';
import { actionIcons } from './icons';
import type { EditorStrings } from './messages';

/** The toolbar's groups, in order; actions whose feature is off are left out. */
export const toolbarGroups: readonly (readonly EditorAction[])[] = [
  ['undo', 'redo'],
  ['bold', 'italic', 'underline', 'strike', 'code', 'link'],
  ['h1', 'h2', 'h3', 'quote', 'bullet', 'number', 'check', 'codeBlock'],
  ['image', 'table', 'divider', 'mention'],
];

/** Whether an action's button shows as pressed. */
function isPressed(action: EditorAction, format: SelectionFormat): boolean | undefined {
  switch (action) {
    case 'bold':
      return format.isBold;
    case 'italic':
      return format.isItalic;
    case 'underline':
      return format.isUnderline;
    case 'strike':
      return format.isStrike;
    case 'code':
      return format.isCode;
    case 'link':
      return format.isLink;
    case 'h1':
    case 'h2':
    case 'h3':
    case 'quote':
    case 'bullet':
    case 'number':
    case 'check':
      return format.blockType === action;
    case 'codeBlock':
      return format.blockType === 'code';
    default:
      return undefined;
  }
}

// The mention button has no command shortcut; its tooltip shows the character that starts a mention.
const mentionKeys = ['@'];

type TableCommand = 'rowBelow' | 'columnAfter' | 'deleteRow' | 'deleteColumn' | 'deleteTable';

export interface EditorToolbarProps {
  actions: readonly EditorAction[];
  onAction: (action: EditorAction) => void;
  isDisabled: boolean;
  messages: EditorStrings;
  /** Receives the Link button, which the link popover is anchored to. */
  linkButtonRef: RefObject<HTMLButtonElement | null>;
}

export function EditorToolbar({
  actions,
  onAction,
  isDisabled,
  messages,
  linkButtonRef,
}: EditorToolbarProps) {
  const [editor] = useLexicalComposerContext();
  const [format, setFormat] = useState<SelectionFormat>(emptyFormat);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isApple] = useState(isApplePlatform);

  useEffect(
    () =>
      mergeRegister(
        editor.registerUpdateListener(({ editorState }) => {
          setFormat(editorState.read($selectionFormat, { editor }));
        }),
        editor.registerCommand(
          // The replacement signals need the extension API; LexicalComposer editors still dispatch these.
          // eslint-disable-next-line @typescript-eslint/no-deprecated
          CAN_UNDO_COMMAND,
          (payload) => {
            setCanUndo(payload);
            return false;
          },
          COMMAND_PRIORITY_LOW,
        ),
        editor.registerCommand(
          // eslint-disable-next-line @typescript-eslint/no-deprecated
          CAN_REDO_COMMAND,
          (payload) => {
            setCanRedo(payload);
            return false;
          },
          COMMAND_PRIORITY_LOW,
        ),
      ),
    [editor],
  );

  const press = (action: EditorAction) => (event: PressEvent) => {
    onAction(action);
    // Mouse and touch go back to the text; keyboard users stay in the toolbar. Link and image open their own UI.
    if (event.pointerType !== 'keyboard' && action !== 'link' && action !== 'image') {
      editor.focus();
    }
  };

  const runTableCommand = (key: Key) => {
    editor.update(() => {
      switch (key as TableCommand) {
        case 'rowBelow':
          $insertTableRowAtSelection(true);
          break;
        case 'columnAfter':
          $insertTableColumnAtSelection(true);
          break;
        case 'deleteRow':
          $deleteTableRowAtSelection();
          break;
        case 'deleteColumn':
          $deleteTableColumnAtSelection();
          break;
        case 'deleteTable': {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $findTableNode(selection.anchor.getNode())?.remove();
          }
          break;
        }
      }
    });
    editor.focus();
  };

  const groups = toolbarGroups
    .map((group) => group.filter((action) => actions.includes(action)))
    .filter((group) => group.length > 0);

  const keyNames = {
    ctrl: messages.editorKeyCtrl,
    alt: messages.editorKeyAlt,
    shift: messages.editorKeyShift,
  };

  return (
    <ToolbarFrame
      aria-label={messages.editorToolbar}
      className="sticky top-0 z-10 flex min-w-0 items-center gap-0.5 overflow-x-auto rounded-t-control border-b border-border bg-surface-2 px-1.5 py-1 [scrollbar-width:thin]"
    >
      {renderToolbarGroups(groups, 'mx-1 my-2', (action) => {
        const isActionDisabled =
          isDisabled || (action === 'undo' && !canUndo) || (action === 'redo' && !canRedo);
        return (
          <ShortcutButton
            key={action}
            icon={actionIcons[action]}
            label={actionLabel(action, messages)}
            shortcut={action === 'mention' ? null : shortcuts[action]}
            keys={mentionKeys}
            isApple={isApple}
            keyNames={keyNames}
            isDisabled={isActionDisabled}
            isSelected={isPressed(action, format)}
            onPress={press(action)}
            buttonRef={
              action === 'link'
                ? (element) => {
                    linkButtonRef.current = element;
                  }
                : undefined
            }
          />
        );
      })}
      {format.isInTable && actions.includes('table') && (
        <>
          <Separator orientation="vertical" className="mx-1 my-2" />
          <MenuTrigger>
            <Tooltip content={messages.editorTableActions}>
              <IconButton
                icon={Table2}
                aria-label={messages.editorTableActions}
                size="sm"
                isDisabled={isDisabled}
              />
            </Tooltip>
            <Menu onAction={runTableCommand}>
              <MenuItem id="rowBelow">{messages.editorInsertRowBelow}</MenuItem>
              <MenuItem id="columnAfter">{messages.editorInsertColumnAfter}</MenuItem>
              <MenuSeparator />
              <MenuItem id="deleteRow" tone="danger">
                {messages.editorDeleteRow}
              </MenuItem>
              <MenuItem id="deleteColumn" tone="danger">
                {messages.editorDeleteColumn}
              </MenuItem>
              <MenuItem id="deleteTable" tone="danger">
                {messages.editorDeleteTable}
              </MenuItem>
            </Menu>
          </MenuTrigger>
        </>
      )}
    </ToolbarFrame>
  );
}
