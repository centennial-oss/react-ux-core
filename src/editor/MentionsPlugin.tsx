// @-mentions: typing "@" and a name asks `loadMentions` for matches (debounced, and the previous request is aborted)
// and lists them at the caret. Choosing one inserts a mention node.
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDebouncedCallback } from '../utils/timers';
import type { EditorStrings } from './messages';
import { $createMentionNode } from './nodes/MentionNode';
import { TypeaheadMenu, typeaheadAnchorClasses } from './TypeaheadMenu';

/** A person (or anything else) that can be mentioned. */
export interface EditorMentionOption {
  id: string;
  label: string;
  avatarSrc?: string;
}

/** Finds mention options for a query. Abort the work when `signal` aborts. Same shape as the chat Composer's. */
export type EditorMentionLoader = (
  query: string,
  signal: AbortSignal,
) => Promise<readonly EditorMentionOption[]>;

class MentionOption extends MenuOption {
  person: EditorMentionOption;

  constructor(person: EditorMentionOption) {
    super(person.id);
    this.person = person;
  }
}

const DEBOUNCE_MS = 150;

export interface MentionsPluginProps {
  loadMentions: EditorMentionLoader;
  messages: EditorStrings;
}

export function MentionsPlugin({ loadMentions, messages }: MentionsPluginProps) {
  const [editor] = useLexicalComposerContext();
  const [query, setQuery] = useState<string | null>(null);
  const [results, setResults] = useState<{
    query: string;
    people: readonly EditorMentionOption[];
  } | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const triggerFn = useBasicTypeaheadTriggerMatch('@', { minLength: 0, maxLength: 40 });

  const { run: runSearch, cancel: cancelSearch } = useDebouncedCallback((text: string) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    loadMentions(text, controller.signal).then(
      (people) => {
        if (!controller.signal.aborted) {
          setResults({ query: text, people });
        }
      },
      () => {
        if (!controller.signal.aborted) {
          setResults({ query: text, people: [] });
        }
      },
    );
  }, DEBOUNCE_MS);

  useEffect(() => {
    if (query === null) {
      cancelSearch();
      controllerRef.current?.abort();
      return;
    }
    runSearch(query);
  }, [query, runSearch, cancelSearch]);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    [],
  );

  const options = useMemo(
    () => (results?.people ?? []).map((person) => new MentionOption(person)),
    [results],
  );
  const isLoading = query !== null && results?.query !== query;

  return (
    <LexicalTypeaheadMenuPlugin<MentionOption>
      onQueryChange={setQuery}
      onSelectOption={(option, textNode, closeMenu) => {
        editor.update(() => {
          const mention = $createMentionNode(option.person.id, option.person.label);
          if (textNode !== null) {
            textNode.replace(mention);
          }
          mention.select();
        });
        closeMenu();
      }}
      onClose={() => {
        setResults(null);
      }}
      triggerFn={triggerFn}
      options={options}
      anchorClassName={typeaheadAnchorClasses}
      menuRenderFn={(anchorElementRef, itemProps) => (
        <TypeaheadMenu
          anchor={anchorElementRef.current}
          {...itemProps}
          label={messages.editorPeople}
          describe={(option) => ({
            label: option.person.label,
            imageSrc: option.person.avatarSrc,
          })}
          status={
            options.length > 0 ? undefined : isLoading ? messages.loading : messages.editorNoPeople
          }
        />
      )}
    />
  );
}
