// MarkdownEditor's formatting toolbar: a `toolbar` with roving focus (arrow keys move between buttons, Tab leaves),
// each button's shortcut in its tooltip and `aria-keyshortcuts`. Pressing a button edits the text and puts the caret
// back in it, so typing carries on where the syntax went in. It scrolls sideways when it doesn't fit.
import {
  Bold,
  Code,
  Heading,
  ImagePlus,
  Italic,
  Link,
  List,
  ListChecks,
  ListOrdered,
  SquareCode,
  TextQuote,
} from 'lucide-react';
import { useState, type ReactNode, type Ref } from 'react';
import { FileTrigger, InputContext } from 'react-aria-components';
import { ToolbarFrame } from '../components/Toolbar/ToolbarFrame';
import { renderToolbarGroups } from '../components/Toolbar/toolbarGroups';
import type { IconComponent } from '../utils/icon';
import { isApplePlatform } from '../utils/keyboard';
import { ShortcutButton } from '../utils/ShortcutToolbar';
import type { MarkdownEditorMessages } from './editorMessages';
import { commandShortcuts, type MarkdownCommand } from './markdownCommands';

/** The toolbar's groups, in order. */
const groups: readonly (readonly MarkdownCommand[])[] = [
  ['bold', 'italic', 'code', 'link'],
  ['heading', 'quote', 'bulletList', 'numberedList', 'taskList', 'codeBlock'],
  ['image'],
];

const icons: Record<MarkdownCommand, IconComponent> = {
  bold: Bold,
  italic: Italic,
  code: Code,
  link: Link,
  heading: Heading,
  quote: TextQuote,
  bulletList: List,
  numberedList: ListOrdered,
  taskList: ListChecks,
  codeBlock: SquareCode,
  image: ImagePlus,
};

/** A command's button label. */
export function commandLabel(command: MarkdownCommand, messages: MarkdownEditorMessages): string {
  const labels: Record<MarkdownCommand, string> = {
    bold: messages.markdownEditorBold,
    italic: messages.markdownEditorItalic,
    code: messages.markdownEditorCode,
    link: messages.markdownEditorLink,
    heading: messages.markdownEditorHeading,
    quote: messages.markdownEditorQuote,
    bulletList: messages.markdownEditorBulletedList,
    numberedList: messages.markdownEditorNumberedList,
    taskList: messages.markdownEditorTaskList,
    codeBlock: messages.markdownEditorCodeBlock,
    image: messages.markdownEditorImage,
  };
  return labels[command];
}

export interface MarkdownToolbarProps {
  onCommand: (command: MarkdownCommand) => void;
  /** With uploads, the image button opens a file picker that calls this instead of inserting `![alt](url)`. */
  onImageFiles?: (files: File[]) => void;
  /** The file picker's hidden input, so the image shortcut can open it too. */
  fileInputRef: Ref<HTMLInputElement>;
  isDisabled: boolean;
  messages: MarkdownEditorMessages;
}

export function MarkdownToolbar({
  onCommand,
  onImageFiles,
  fileInputRef,
  isDisabled,
  messages,
}: MarkdownToolbarProps) {
  const [isApple] = useState(isApplePlatform);
  const keyNames = {
    ctrl: messages.markdownEditorKeyCtrl,
    alt: messages.markdownEditorKeyAlt,
    shift: messages.markdownEditorKeyShift,
  };
  // With uploads, the image button opens a file picker instead of running its command.
  const wrapUpload = (button: ReactNode) => (
    <FileTrigger
      ref={fileInputRef}
      acceptedFileTypes={['image/*']}
      allowsMultiple
      onSelect={(files) => {
        if (files) {
          onImageFiles?.(Array.from(files));
        }
      }}
    >
      {button}
    </FileTrigger>
  );

  return (
    // The field around the toolbar gives React Aria inputs its textarea's props; the file picker's input isn't it.
    <InputContext.Provider value={null}>
      <ToolbarFrame
        aria-label={messages.markdownEditorToolbar}
        className="flex min-w-0 shrink-0 items-center gap-0.5 overflow-x-auto border-b border-border bg-surface-1 px-1.5 py-1 [scrollbar-width:thin]"
      >
        {renderToolbarGroups(groups, 'mx-1 my-1.5', (command) => {
          const isUpload = command === 'image' && onImageFiles !== undefined;
          return (
            <ShortcutButton
              key={command}
              icon={icons[command]}
              label={commandLabel(command, messages)}
              shortcut={commandShortcuts[command]}
              isApple={isApple}
              keyNames={keyNames}
              isDisabled={isDisabled}
              onPress={
                isUpload
                  ? undefined
                  : () => {
                      onCommand(command);
                    }
              }
              wrap={isUpload ? wrapUpload : undefined}
            />
          );
        })}
      </ToolbarFrame>
    </InputContext.Provider>
  );
}
