// CommandPalette: one place to jump anywhere or run an action. A modal search field over a list of commands, with
// fuzzy matching, recent items, async results from the app, and a global shortcut (⌘K / Ctrl+K).

import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Autocomplete,
  Dialog as AriaDialog,
  Header,
  Input,
  ListBox,
  ListBoxItem,
  ListBoxSection,
  Modal,
  ModalOverlay,
  TextField,
  type Key,
  type ListBoxItemProps,
} from 'react-aria-components';
import { useEntryMessages, useLinkComponent } from '../../provider/context';
import type { LinkComponentType } from '../../provider/link';
import { cn } from '../../utils/cn';
import type { IconComponent } from '../../utils/icon';
import { focusedSurfaceClasses } from '../../utils/stateClasses';
import { useDebouncedCallback } from '../../utils/timers';
import { useControllableState } from '../../utils/useControllableState';
import { useIsPhone } from '../../utils/useMediaQuery';
import { IconButton } from '../IconButton/IconButton';
import { Kbd } from '../Kbd/Kbd';
import { LiveRegion } from '../LiveRegion/LiveRegion';
import { SpinnerIcon } from '../Spinner/SpinnerIcon';
import { fuzzyMatch, type FuzzyMatch } from './fuzzy';
import { defaultCommandPaletteMessages } from './messages';
import { isApplePlatform, matchesShortcut, parseShortcut, useGlobalShortcut } from './shortcut';

export interface CommandItem {
  id: string;
  label: string;
  /** Group heading, such as "Pages" or "Actions". Items without one go under "Commands" (or "Results"). */
  section?: string;
  description?: ReactNode;
  icon?: IconComponent;
  /** Other words that find the item (they match, but aren't highlighted). */
  keywords?: readonly string[];
  /** Keys shown at the end of the row, such as `['⌘', 'S']`. Only shown; the app binds them. */
  shortcut?: readonly string[];
  /** Navigates here when chosen, through `UIProvider`'s `LinkComponent`. */
  href?: string;
  /** Runs when chosen (after the palette closes). */
  onAction?: () => void;
}

export interface CommandPaletteProps {
  items: readonly CommandItem[];
  /**
   * Async results for a query (records, resources), merged after the matching items under their own sections. Called
   * once typing pauses (`loadDelay`); the signal aborts when the query changes or the palette closes.
   */
  loadItems?: (query: string, signal: AbortSignal) => Promise<readonly CommandItem[]>;
  /** How long typing must pause before `loadItems` runs, in milliseconds. Defaults to 200. */
  loadDelay?: number;
  /** Whether the palette is open. Controlled; see `defaultOpen`. */
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  /**
   * The global shortcut that opens (and closes) the palette, such as `mod+k` (⌘K on Apple devices, Ctrl+K
   * elsewhere) or `/`. Defaults to `mod+k`; `null` turns it off. Without Ctrl or ⌘ it's ignored while typing.
   */
  shortcut?: string | null;
  /** The most recently chosen item ids, newest first, shown under "Recent" before a query. Controlled. */
  recentIds?: readonly string[];
  defaultRecentIds?: readonly string[];
  /** Called with the new recent ids after an item is chosen, for the app to keep. */
  onRecentChange?: (ids: string[]) => void;
  /** How many recent items to keep. Defaults to 5. */
  maxRecent?: number;
  placeholder?: string;
  /** Names the palette. Defaults to "Command palette". */
  'aria-label'?: string;
  className?: string;
}

interface Row {
  /** Unique in the list (recent rows repeat an item's id, so they're prefixed). */
  key: string;
  item: CommandItem;
  match: FuzzyMatch | null;
}

interface Group {
  id: string;
  title: string;
  rows: Row[];
}

const RECENT_PREFIX = 'recent:';

// Key caps in the footer hints: symbols and the conventional key name, not translated text.
const ESCAPE_KEY = 'Esc';

const optionClasses = [
  'group/option relative flex min-h-hit cursor-default items-center gap-3 rounded-control px-3 py-2 text-fg outline-none select-none',
  focusedSurfaceClasses,
  'data-focus-visible:ring-2 data-focus-visible:ring-focus data-focus-visible:ring-inset',
].join(' ');

type OptionRender = NonNullable<ListBoxItemProps['render']>;

function optionRenderer(LinkComponent: LinkComponentType): OptionRender {
  return (domProps) =>
    'href' in domProps ? <LinkComponent {...domProps} /> : <div {...domProps} />;
}

/** The label with its matched characters marked. */
function highlight(label: string, indexes: readonly number[]): ReactNode {
  if (indexes.length === 0) {
    return label;
  }
  const marked = new Set(indexes);
  const parts: ReactNode[] = [];
  let run = '';
  let isRunMarked = false;
  const flush = (end: number) => {
    if (run !== '') {
      parts.push(
        isRunMarked ? (
          <mark key={end} className="bg-transparent font-semibold text-accent-fg">
            {run}
          </mark>
        ) : (
          run
        ),
      );
    }
  };
  // Match positions are UTF-16 offsets (from indexOf), so walk the label the same way.
  for (let index = 0; index < label.length; index += 1) {
    const isMarked = marked.has(index);
    if (isMarked !== isRunMarked) {
      flush(index);
      run = '';
      isRunMarked = isMarked;
    }
    run += label.charAt(index);
  }
  flush(label.length);
  return parts;
}

/** Groups items by section, keeping the order sections first appear in. */
function groupBySection(rows: readonly Row[], fallback: string, idPrefix: string): Group[] {
  const groups = new Map<string, Group>();
  for (const row of rows) {
    const title = row.item.section ?? fallback;
    const group = groups.get(title) ?? { id: `${idPrefix}${title}`, title, rows: [] };
    group.rows.push(row);
    groups.set(title, group);
  }
  return [...groups.values()];
}

/**
 * A command palette: press ⌘K / Ctrl+K (or a `CommandPaletteTrigger`) to open a search over the app's pages and
 * actions. Matching is fuzzy over labels and keywords, with matched letters highlighted; recent items come first
 * before a query, and `loadItems` adds async results (records, resources) under their own sections. Arrow keys
 * move, Enter runs (an item's `onAction`, or its `href` through the app's router), Escape closes. It's a modal
 * dialog with a combobox and a listbox, and a full-screen sheet on phones.
 */
export function CommandPalette({
  items,
  loadItems,
  loadDelay = 200,
  isOpen,
  defaultOpen = false,
  onOpenChange,
  shortcut = 'mod+k',
  recentIds,
  defaultRecentIds,
  onRecentChange,
  maxRecent = 5,
  placeholder,
  'aria-label': ariaLabel,
  className,
}: CommandPaletteProps) {
  const messages = useEntryMessages(defaultCommandPaletteMessages);
  const [open, setOpen] = useControllableState(isOpen, defaultOpen, onOpenChange);
  const [recent, setRecent] = useControllableState<readonly string[]>(
    recentIds,
    defaultRecentIds ?? [],
    onRecentChange as ((ids: readonly string[]) => void) | undefined,
  );
  useGlobalShortcut(shortcut, () => {
    setOpen(!open);
  });
  // Async items chosen earlier, so they can show under "Recent" when the query no longer finds them.
  const known = useRef(new Map<string, CommandItem>());

  const run = (item: CommandItem) => {
    known.current.set(item.id, item);
    setRecent([item.id, ...recent.filter((id) => id !== item.id)].slice(0, maxRecent));
    setOpen(false);
    item.onAction?.();
  };

  return (
    <ModalOverlay
      isDismissable
      isOpen={open}
      onOpenChange={setOpen}
      className={cn(
        'fixed inset-0 z-modal flex h-(--visual-viewport-height) items-start justify-center bg-scrim sm:p-4 sm:pt-[12vh]',
        'data-entering:animate-[rux-fade-in_var(--duration-normal)_var(--ease-standard)]',
        'data-exiting:animate-[rux-fade-out_var(--duration-fast)_var(--ease-standard)]',
      )}
    >
      <Modal
        className={cn(
          'flex h-full w-full flex-col bg-surface-2 text-fg shadow-overlay outline-none',
          'sm:h-auto sm:max-h-[min(36rem,76vh)] sm:max-w-xl sm:rounded-card',
          'data-entering:animate-[rux-pop-in_var(--duration-normal)_var(--ease-standard)]',
          'data-exiting:animate-[rux-pop-out_var(--duration-fast)_var(--ease-standard)]',
          className,
        )}
      >
        <AriaDialog
          aria-label={ariaLabel ?? messages.commandPalette}
          className="relative flex min-h-0 flex-1 flex-col outline-none"
        >
          {({ close }) => (
            <PaletteBody
              items={items}
              loadItems={loadItems}
              loadDelay={loadDelay}
              shortcut={shortcut}
              recent={recent}
              known={known.current}
              placeholder={placeholder}
              onRun={run}
              onClose={close}
            />
          )}
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}

interface PaletteBodyProps {
  items: readonly CommandItem[];
  loadItems: CommandPaletteProps['loadItems'];
  loadDelay: number;
  shortcut: string | null;
  recent: readonly string[];
  known: Map<string, CommandItem>;
  placeholder: string | undefined;
  onRun: (item: CommandItem) => void;
  onClose: () => void;
}

/** The palette's content, mounted while it's open (so each opening starts with an empty query). */
function PaletteBody({
  items,
  loadItems,
  loadDelay,
  shortcut,
  recent,
  known,
  placeholder,
  onRun,
  onClose,
}: PaletteBodyProps) {
  const messages = useEntryMessages(defaultCommandPaletteMessages);
  const LinkComponent = useLinkComponent();
  const isPhone = useIsPhone();
  const [query, setQuery] = useState('');
  const [loaded, setLoaded] = useState<{ query: string; items: readonly CommandItem[] } | null>(
    null,
  );
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'error'>('idle');
  const controller = useRef<AbortController | null>(null);
  const parsedShortcut = useMemo(
    () => (shortcut === null ? null : parseShortcut(shortcut)),
    [shortcut],
  );

  const load = useDebouncedCallback((text: string) => {
    if (!loadItems) {
      return;
    }
    const current = new AbortController();
    controller.current = current;
    loadItems(text, current.signal).then(
      (result) => {
        if (!current.signal.aborted) {
          setLoaded({ query: text, items: result });
          setLoadState('idle');
        }
      },
      () => {
        if (!current.signal.aborted) {
          setLoaded(null);
          setLoadState('error');
        }
      },
    );
  }, loadDelay);

  // Closing the palette aborts a load in flight.
  useEffect(
    () => () => {
      controller.current?.abort();
    },
    [],
  );

  const onQueryChange = (text: string) => {
    setQuery(text);
    controller.current?.abort();
    controller.current = null;
    setLoaded(null);
    if (loadItems && text.trim() !== '') {
      setLoadState('loading');
      load.run(text);
    } else {
      load.cancel();
      setLoadState('idle');
    }
  };

  const hasQuery = query.trim() !== '';
  const groups = useMemo((): Group[] => {
    if (!hasQuery) {
      const byId = new Map([...known, ...items.map((item) => [item.id, item] as const)]);
      const recentRows = recent.flatMap((id) => {
        const item = byId.get(id);
        return item ? [{ key: `${RECENT_PREFIX}${id}`, item, match: null }] : [];
      });
      const recentGroup: Group[] =
        recentRows.length > 0
          ? [{ id: 'recent', title: messages.commandPaletteRecent, rows: recentRows }]
          : [];
      const rows = items.map((item) => ({ key: item.id, item, match: null }));
      return [...recentGroup, ...groupBySection(rows, messages.commandPaletteCommands, 'items:')];
    }
    const matched = items.flatMap((item, index) => {
      const match = fuzzyMatch(query, item.label, item.keywords);
      return match ? [{ row: { key: item.id, item, match }, index }] : [];
    });
    matched.sort((a, b) => b.row.match.score - a.row.match.score || a.index - b.index);
    // Sections in order of their best match (the rows are sorted, so that's the order they first appear in).
    const itemGroups = groupBySection(
      matched.map(({ row }) => row),
      messages.commandPaletteCommands,
      'items:',
    );
    const seen = new Set(items.map((item) => item.id));
    const asyncRows = (loaded?.query === query ? loaded.items : [])
      .filter((item) => !seen.has(item.id))
      .map((item) => ({ key: item.id, item, match: fuzzyMatch(query, item.label, item.keywords) }));
    return [...itemGroups, ...groupBySection(asyncRows, messages.commandPaletteResults, 'loaded:')];
  }, [hasQuery, query, items, loaded, recent, known, messages]);

  const rowsByKey = useMemo(
    () => new Map(groups.flatMap((group) => group.rows.map((row) => [row.key, row] as const))),
    [groups],
  );
  const resultCount = hasQuery ? rowsByKey.size : 0;
  const renderOption = optionRenderer(LinkComponent);
  const isApple = isApplePlatform();

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      // ⌘K inside the palette closes it (the field keeps its keys from reaching the page's shortcut listener).
      onKeyDownCapture={(event) => {
        if (parsedShortcut && matchesShortcut(event.nativeEvent, parsedShortcut, isApple)) {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <Autocomplete inputValue={query} onInputChange={onQueryChange}>
        <TextField
          aria-label={messages.commandPaletteSearch}
          // The palette opens to type a query, so the field takes focus (focus moving into an opened dialog).
          // eslint-disable-next-line jsx-a11y/no-autofocus -- see above
          autoFocus
          className="flex shrink-0 items-center gap-2 border-b border-border px-4 pt-[env(safe-area-inset-top)] sm:pt-0"
        >
          <Search aria-hidden="true" className="size-5 shrink-0 text-fg-muted" />
          <Input
            role="combobox"
            aria-expanded="true"
            aria-haspopup="listbox"
            placeholder={placeholder ?? messages.commandPalettePlaceholder}
            className="h-14 min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-fg-muted"
          />
          {loadState === 'loading' && <SpinnerIcon className="size-4 shrink-0 text-fg-muted" />}
          {isPhone && (
            <IconButton icon={X} size="sm" aria-label={messages.close} onPress={onClose} />
          )}
        </TextField>
        {/* The listbox scrolls itself, so its box stays inside the dialog; the loading row stays in view below it. */}
        <div className="flex min-h-0 flex-1 flex-col">
          <ListBox
            aria-label={messages.commandPalette}
            onAction={(key: Key) => {
              const row = rowsByKey.get(String(key));
              if (row) {
                onRun(row.item);
              }
            }}
            renderEmptyState={() =>
              loadState === 'loading' ? null : (
                <div className="px-3 py-6 text-center text-sm text-fg-muted">
                  {hasQuery ? messages.commandPaletteNoResults({ query: query.trim() }) : null}
                </div>
              )
            }
            className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain p-2 text-sm outline-none"
          >
            {groups.map((group) => (
              <ListBoxSection key={group.id} id={group.id} className="flex flex-col gap-0.5">
                <Header className="px-3 pt-2 pb-1 text-xs font-semibold text-fg-muted">
                  {group.title}
                </Header>
                {group.rows.map(({ key, item, match }) => {
                  const Icon = item.icon;
                  return (
                    <ListBoxItem
                      key={key}
                      id={key}
                      textValue={item.label}
                      href={item.href}
                      render={renderOption}
                      className={optionClasses}
                    >
                      {Icon ? (
                        <Icon aria-hidden="true" className="size-4 shrink-0 text-fg-muted" />
                      ) : (
                        <span aria-hidden="true" className="size-4 shrink-0" />
                      )}
                      {/* Named by all its text (label and description), which axe needs to match what's shown. */}
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate">
                          {highlight(item.label, match?.indexes ?? [])}
                        </span>
                        {item.description !== undefined && (
                          <span className="truncate text-xs text-fg-muted">{item.description}</span>
                        )}
                      </span>
                      {item.shortcut && item.shortcut.length > 0 && (
                        <span className="flex shrink-0 gap-1 pointer-coarse:hidden">
                          {item.shortcut.map((keyLabel, index) => (
                            // Keys can repeat (⇧ ⇧), so their place is their identity.
                            <Kbd key={`${String(index)}${keyLabel}`}>{keyLabel}</Kbd>
                          ))}
                        </span>
                      )}
                    </ListBoxItem>
                  );
                })}
              </ListBoxSection>
            ))}
          </ListBox>
          {loadState === 'loading' && (
            <div className="flex min-h-hit shrink-0 items-center gap-3 px-5 py-2 text-sm text-fg-muted">
              <SpinnerIcon className="size-4 shrink-0" />
              {messages.commandPaletteLoading}
            </div>
          )}
          {loadState === 'error' && (
            <div className="shrink-0 px-5 py-2 text-sm text-danger-fg">{messages.loadError}</div>
          )}
        </div>
      </Autocomplete>
      <div className="hidden shrink-0 items-center gap-4 border-t border-border px-4 py-2 text-xs text-fg-muted sm:flex pointer-coarse:hidden">
        <span className="flex items-center gap-1.5">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
          {messages.commandPaletteMoveHint}
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>↵</Kbd>
          {messages.commandPaletteRunHint}
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>{ESCAPE_KEY}</Kbd>
          {messages.commandPaletteCloseHint}
        </span>
      </div>
      <LiveRegion isAtomic>
        {hasQuery && loadState !== 'loading'
          ? messages.commandPaletteResultCount({ count: resultCount })
          : ''}
      </LiveRegion>
    </div>
  );
}
