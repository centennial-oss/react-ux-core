/** CommandPalette's and CommandPaletteTrigger's strings. */
export interface CommandPaletteMessages {
  /** The palette dialog's name. */
  commandPalette: string;
  /** The search field's name. */
  commandPaletteSearch: string;
  /** The search field's placeholder. */
  commandPalettePlaceholder: string;
  /** The heading of recently chosen items. */
  commandPaletteRecent: string;
  /** The heading of items without a `section`. */
  commandPaletteCommands: string;
  /** The heading of `loadItems` results without a `section`. */
  commandPaletteResults: string;
  /** Announced as the matches change. */
  commandPaletteResultCount: (params: { count: number }) => string;
  /** Shown when nothing matches the query. */
  commandPaletteNoResults: (params: { query: string }) => string;
  /** Shown while `loadItems` runs. */
  commandPaletteLoading: string;
  /** Key hints in the palette's footer. */
  commandPaletteMoveHint: string;
  commandPaletteRunHint: string;
  commandPaletteCloseHint: string;
  /** The trigger button's label. */
  commandPaletteTrigger: string;
}

export const defaultCommandPaletteMessages: CommandPaletteMessages = {
  commandPalette: 'Command palette',
  commandPaletteSearch: 'Search commands and pages',
  commandPalettePlaceholder: 'Type a command or search…',
  commandPaletteRecent: 'Recent',
  commandPaletteCommands: 'Commands',
  commandPaletteResults: 'Results',
  commandPaletteResultCount: ({ count }) => (count === 1 ? '1 result' : `${String(count)} results`),
  commandPaletteNoResults: ({ query }) => `No results for “${query}”`,
  commandPaletteLoading: 'Searching…',
  commandPaletteMoveHint: 'to move',
  commandPaletteRunHint: 'to run',
  commandPaletteCloseHint: 'to close',
  commandPaletteTrigger: 'Search',
};
