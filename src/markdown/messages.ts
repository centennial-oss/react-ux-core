// English defaults of the markdown entry point's strings (see `Messages` in provider/messages.ts).
import { useEntryMessages } from '../provider/context';
import type { CoreMessages, MarkdownMessages } from '../provider/messages';
import { defaultCodeMessages } from '../code/messages';
import { defaultMarkdownEditorMessages, type MarkdownEditorMessages } from './editorMessages';

export const defaultMarkdownMessages: MarkdownMessages = {
  opensInNewTab: '(opens in a new tab)',
  codeBlockLabel: ({ language }) => (language ? `${language} code` : 'Code'),
  markdownTable: 'Table',
};

// One object for the hook's defaults, so its merge with the app's overrides is memoized.
const entryDefaults = {
  ...defaultCodeMessages,
  ...defaultMarkdownMessages,
  ...defaultMarkdownEditorMessages,
};

/** `/markdown`'s strings (and `/code`'s, for its code blocks), with the app's overrides from `UIProvider`. */
export function useMarkdownMessages(): CoreMessages & MarkdownMessages & MarkdownEditorMessages {
  return useEntryMessages(entryDefaults);
}
