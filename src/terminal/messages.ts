// The terminal entry point's strings: their types and English defaults, merged with the app's overrides.
import type { CommonMessages } from '../provider/coreStrings';
import { useEntryMessages } from '../provider/context';

export interface TerminalMessages {
  /** The terminal's name when it has no `title`. */
  terminalLabel: string;
  /** The name of the terminal's keyboard input. */
  terminalInput: string;
  /** How to leave the terminal, which keeps Tab for itself. Matches the Ctrl+Shift+Esc shortcut. */
  terminalFocusHint: string;
  /** Opens and closes the search bar; also the search field's label. */
  terminalSearch: string;
  terminalFindNext: string;
  terminalFindPrevious: string;
  /** The search position, for example "2 of 7". */
  terminalSearchResult: (params: { index: number; count: number }) => string;
  /** Too many matches to number them (more than the highlight limit). */
  terminalSearchManyResults: string;
  terminalNoMatches: string;
  terminalFullScreen: string;
  terminalExitFullScreen: string;
  /** Connection statuses, shown in the header and announced. */
  terminalConnecting: string;
  terminalConnected: string;
  terminalDisconnected: string;
  terminalConnectionError: string;
  terminalReconnect: string;
  /** The confirmation before pasting text with line breaks. */
  terminalPasteTitle: string;
  terminalPasteBody: (params: { lines: number }) => string;
  terminalPasteConfirm: string;
  /** Names the preview of the text about to be pasted. */
  terminalPastePreview: string;
}

export const defaultTerminalMessages: TerminalMessages = {
  terminalLabel: 'Terminal',
  terminalInput: 'Terminal input',
  terminalFocusHint: 'Press Ctrl+Shift+Esc to leave the terminal.',
  terminalSearch: 'Search the terminal',
  terminalFindNext: 'Next match',
  terminalFindPrevious: 'Previous match',
  terminalSearchResult: ({ index, count }) => `${String(index)} of ${String(count)}`,
  terminalSearchManyResults: 'Many matches',
  terminalNoMatches: 'No matches',
  terminalFullScreen: 'Full screen',
  terminalExitFullScreen: 'Exit full screen',
  terminalConnecting: 'Connecting…',
  terminalConnected: 'Connected',
  terminalDisconnected: 'Disconnected',
  terminalConnectionError: 'Connection failed',
  terminalReconnect: 'Reconnect',
  terminalPasteTitle: 'Paste several lines?',
  terminalPasteBody: ({ lines }) =>
    `This text has ${String(lines)} lines. Each line break may run a command.`,
  terminalPasteConfirm: 'Paste',
  terminalPastePreview: 'Text to paste',
};

/** The strings `/terminal` components read: the core strings and `/terminal`'s own. */
export type TerminalStrings = CommonMessages & TerminalMessages;

/** `/terminal`'s strings, with the app's overrides from `UIProvider`. */
export function useTerminalMessages(): TerminalStrings {
  return useEntryMessages(defaultTerminalMessages);
}
