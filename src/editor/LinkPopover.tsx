// Adding, changing and removing a link. It opens from the toolbar's Link button (or the shortcut) with the address of
// the link at the caret, shows that link as a real one (through `UIProvider`'s LinkComponent) so it can be opened,
// and applies to the selection the editor had when it opened. With nothing selected, the address becomes the text.
import { $createLinkNode, $toggleLink } from '@lexical/link';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ExternalLink } from 'lucide-react';
import {
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  $setSelection,
  type BaseSelection,
} from 'lexical';
import { useState, type RefObject } from 'react';
import { Button } from '../components/Button/Button';
import { ButtonGroup } from '../components/ButtonGroup/ButtonGroup';
import { Popover } from '../components/Popover/Popover';
import { TextField } from '../components/TextField/TextField';
import type { EditorStrings } from './messages';
import { isSafeUrl } from './sanitize';

/** What the popover edits: the link at the caret (if any) and the selection to apply it to. */
export interface LinkTarget {
  url: string | null;
  selection: BaseSelection | null;
}

export interface LinkPopoverProps {
  target: LinkTarget | null;
  onClose: () => void;
  triggerRef: RefObject<HTMLElement | null>;
  messages: EditorStrings;
}

export function LinkPopover({ target, onClose, triggerRef, messages }: LinkPopoverProps) {
  return (
    <Popover
      isOpen={target !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}
      triggerRef={triggerRef}
      placement="bottom start"
      aria-label={messages.editorLinkTitle}
    >
      {target !== null && <LinkForm target={target} onClose={onClose} messages={messages} />}
    </Popover>
  );
}

function LinkForm({
  target,
  onClose,
  messages,
}: {
  target: LinkTarget;
  onClose: () => void;
  messages: EditorStrings;
}) {
  const [editor] = useLexicalComposerContext();
  const [url, setUrl] = useState(target.url ?? 'https://');
  const [isInvalid, setInvalid] = useState(false);

  const apply = (href: string | null) => {
    editor.update(() => {
      if (target.selection !== null) {
        $setSelection(target.selection.clone());
      }
      const selection = $getSelection();
      if (
        href !== null &&
        target.url === null &&
        $isRangeSelection(selection) &&
        selection.isCollapsed()
      ) {
        selection.insertNodes([$createLinkNode(href).append($createTextNode(href))]);
      } else {
        $toggleLink(href);
      }
    });
    onClose();
    editor.focus();
  };

  return (
    <form
      className="flex w-80 max-w-full flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const href = url.trim();
        if (!isSafeUrl(href) || href === 'https://') {
          setInvalid(true);
          return;
        }
        apply(href);
      }}
    >
      <TextField
        type="url"
        label={messages.editorLinkUrl}
        value={url}
        onChange={(next) => {
          setUrl(next);
          setInvalid(false);
        }}
        isInvalid={isInvalid}
        validationBehavior="aria"
        errorMessage={messages.editorLinkInvalid}
        // The popover opens to type an address, so the field takes focus.
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
      />
      {target.url !== null && isSafeUrl(target.url) && (
        <Button
          href={target.url}
          target="_blank"
          rel="noopener noreferrer"
          variant="link"
          size="sm"
          icon={ExternalLink}
          className="self-start"
        >
          {messages.editorLinkOpen}
        </Button>
      )}
      <ButtonGroup layout={target.url !== null ? 'between' : 'end'}>
        {target.url !== null && (
          <Button
            variant="ghost"
            tone="danger"
            onPress={() => {
              apply(null);
            }}
          >
            {messages.editorLinkRemove}
          </Button>
        )}
        <span className="flex gap-2">
          <Button variant="outline" onPress={onClose}>
            {messages.cancel}
          </Button>
          <Button type="submit" tone="accent">
            {messages.save}
          </Button>
        </span>
      </ButtonGroup>
    </form>
  );
}
