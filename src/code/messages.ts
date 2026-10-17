// English defaults of the code entry point's strings (see `Messages` in provider/messages.ts).
import { useEntryMessages } from '../provider/context';
import type { CodeMessages, CoreMessages } from '../provider/messages';

export const defaultCodeMessages: CodeMessages = {
  wrapLines: 'Wrap lines',
  codeCopyFailed: 'Couldn’t copy. Select the code and copy it instead.',
};

/** The strings `/code` components read: the core strings and `/code`'s own. */
export type CodeStrings = CoreMessages & CodeMessages;

/** `/code`'s strings, with the app's overrides from `UIProvider`. */
export function useCodeMessages(): CodeStrings {
  return useEntryMessages(defaultCodeMessages);
}
