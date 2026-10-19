import { useContext, useMemo } from 'react';
import { MessagesContext } from './context';
import { defaultMessages, type CoreMessages } from './messages';

/**
 * Every core UI string: the English defaults merged with any overrides passed to `UIProvider`. For apps; the
 * library's own components use `useEntryMessages` with only the strings they need, so their bundles stay small.
 */
export function useMessages(): CoreMessages {
  const provided = useContext(MessagesContext);
  return useMemo(() => ({ ...defaultMessages, ...provided }), [provided]);
}
