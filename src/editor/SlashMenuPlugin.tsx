// The "/" menu: typing "/" at the start of a word lists the blocks that can be inserted, filtered by what follows
// ("/tab" → Table). Choosing one replaces the typed text with the block.
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useMemo, useState } from 'react';
import { actionLabel, type EditorAction } from './actions';
import { actionIcons } from './icons';
import type { EditorStrings } from './messages';
import { TypeaheadMenu, typeaheadAnchorClasses } from './TypeaheadMenu';

class BlockOption extends MenuOption {
  action: EditorAction;
  label: string;

  constructor(action: EditorAction, label: string) {
    super(action);
    this.action = action;
    this.label = label;
  }
}

export interface SlashMenuPluginProps {
  /** The insertable blocks, in menu order. */
  actions: readonly EditorAction[];
  onAction: (action: EditorAction) => void;
  messages: EditorStrings;
}

export function SlashMenuPlugin({ actions, onAction, messages }: SlashMenuPluginProps) {
  const [editor] = useLexicalComposerContext();
  const [query, setQuery] = useState<string | null>(null);
  const triggerFn = useBasicTypeaheadTriggerMatch('/', { minLength: 0 });

  const options = useMemo(() => {
    const search = (query ?? '').toLowerCase();
    return actions
      .map((action) => new BlockOption(action, actionLabel(action, messages)))
      .filter((option) => option.label.toLowerCase().includes(search));
  }, [actions, messages, query]);

  return (
    <LexicalTypeaheadMenuPlugin<BlockOption>
      onQueryChange={setQuery}
      onSelectOption={(option, textNode, closeMenu) => {
        editor.update(() => {
          textNode?.remove();
        });
        closeMenu();
        onAction(option.action);
      }}
      triggerFn={triggerFn}
      options={options}
      anchorClassName={typeaheadAnchorClasses}
      menuRenderFn={(anchorElementRef, itemProps) =>
        options.length === 0 ? null : (
          <TypeaheadMenu
            anchor={anchorElementRef.current}
            {...itemProps}
            label={messages.editorBlocks}
            describe={(option) => ({ label: option.label, icon: actionIcons[option.action] })}
          />
        )
      }
    />
  );
}
