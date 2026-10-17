// Terminal: an xterm.js terminal themed from the CCUX tokens, for shells over a socket (exec into a container, SSH,
// serial consoles) or read-only streaming output. It fits its container, copies on select, confirms multi-line
// pastes, searches its scrollback, goes full screen, and shows the connection's status with a reconnect button.
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon, type ISearchOptions } from '@xterm/addon-search';
import { Terminal as XTerm } from '@xterm/xterm';
import { ChevronDown, ChevronUp, Maximize2, Minimize2, RefreshCw, Search } from 'lucide-react';
import { useEffect, useId, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { Button } from '../components/Button/Button';
import { ConfirmDialog } from '../components/ConfirmDialog/ConfirmDialog';
import { IconButton } from '../components/IconButton/IconButton';
import { ScrollRegion } from '../components/ScrollRegion/ScrollRegion';
import { SearchField } from '../components/SearchField/SearchField';
import { StatusDot } from '../components/StatusDot/StatusDot';
import { Tooltip } from '../components/Tooltip/Tooltip';
import { cn } from '../utils/cn';
import { mergeRefs } from '../utils/mergeRefs';
import { createDeadlineTimer } from '../utils/timers';
import type { Tone } from '../utils/types';
import { useThemeAttribute } from '../utils/useThemeAttribute';
import { useTerminalMessages, type TerminalStrings } from './messages';
import { readTerminalLook, type TerminalLook } from './theme';

/** Imperative control of a Terminal, through `handleRef`. */
export interface TerminalHandle {
  /** Writes output (text with ANSI escape codes) to the terminal. Writes before it's ready are kept and replayed. */
  write: (data: string) => void;
  /** Clears the scrollback and the screen, keeping the cursor's line. */
  clear: () => void;
  /** Moves keyboard focus into the terminal. */
  focus: () => void;
}

export type TerminalConnectionStatus = 'connecting' | 'open' | 'closed' | 'error';

export interface TerminalConnection {
  status: TerminalConnectionStatus;
  /** Shows a Reconnect button while the status is `closed` or `error`. */
  onReconnect?: () => void;
}

export interface TerminalProps {
  /** Called with the user's keystrokes (and confirmed pastes) to send over the app's socket. Omit for read-only output. */
  onData?: (data: string) => void;
  /** Called with the terminal's size in characters when it first fits its container and whenever that changes. */
  onResize?: (size: { cols: number; rows: number }) => void;
  /** Receives `write`, `clear` and `focus`. */
  handleRef?: Ref<TerminalHandle>;
  /** Shown in the header and names the terminal. Defaults to the `terminalLabel` message. */
  title?: string;
  /** In CSS pixels. Defaults to 14. */
  fontSize?: number;
  /** The connection behind the terminal: its status is shown in the header and announced. Input is paused unless it's `open`. */
  connection?: TerminalConnection;
  /** Lines kept above the screen. Defaults to 5000. */
  scrollback?: number;
  /** Shows the search button. Defaults to true. */
  hasSearch?: boolean;
  /** Shows the full-screen button. Defaults to true. */
  hasFullScreen?: boolean;
  /** The terminal area's height (CSS). Defaults to `20rem`. Full screen fills the viewport. */
  height?: string;
  className?: string;
  /** The root `section`. */
  ref?: Ref<HTMLElement>;
}

interface Instance {
  term: XTerm;
  fit: FitAddon;
  search: SearchAddon;
  look: TerminalLook;
}

const statusTones: Record<TerminalConnectionStatus, Tone> = {
  connecting: 'accent',
  open: 'success',
  closed: 'neutral',
  error: 'danger',
};

function statusLabel(status: TerminalConnectionStatus, messages: TerminalStrings): string {
  switch (status) {
    case 'connecting':
      return messages.terminalConnecting;
    case 'open':
      return messages.terminalConnected;
    case 'closed':
      return messages.terminalDisconnected;
    case 'error':
      return messages.terminalConnectionError;
  }
}

const tabbableSelector =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex], [contenteditable="true"]';

/** Focuses the first tabbable element after `area` in the page, or `fallback` when there's none. */
function focusAfter(area: HTMLElement, fallback: HTMLElement | null) {
  const next = [...document.querySelectorAll<HTMLElement>(tabbableSelector)].find(
    (element) =>
      element.tabIndex >= 0 &&
      !area.contains(element) &&
      (area.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0 &&
      element.closest('[inert]') === null &&
      element.getClientRects().length > 0,
  );
  (next ?? fallback)?.focus();
}

/** Splits pasted text into lines, ignoring one trailing line break (pasting "ls\n" is still a single command). */
function countLines(text: string): number {
  return text.replace(/\r\n?/g, '\n').replace(/\n$/, '').split('\n').length;
}

function searchOptions(look: TerminalLook, isIncremental: boolean): ISearchOptions {
  return {
    incremental: isIncremental,
    decorations: {
      ...look.search,
      matchOverviewRuler: look.search.matchBorder,
      activeMatchColorOverviewRuler: look.search.activeMatchBorder,
    },
  };
}

/**
 * A terminal (xterm.js) for a shell over the app's socket, or read-only output. Screen-reader mode is on. Tab stays
 * in the terminal while it takes input, so a hint below it gives the way out: Ctrl+Shift+Esc moves focus to what
 * follows it. Apps import xterm's stylesheet (`@xterm/xterm/css/xterm.css`).
 */
export function Terminal({
  onData,
  onResize,
  handleRef,
  title,
  fontSize = 14,
  connection,
  scrollback = 5000,
  hasSearch = true,
  hasFullScreen = true,
  height = '20rem',
  className,
  ref,
}: TerminalProps) {
  const messages = useTerminalMessages();
  const theme = useThemeAttribute();
  const titleId = useId();
  const hintId = useId();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLElement | null>(null);
  const areaRef = useRef<HTMLDivElement | null>(null);
  const instance = useRef<Instance | null>(null);
  const pendingWrites = useRef<string[]>([]);
  const [pendingPaste, setPendingPaste] = useState<string | null>(null);
  const [isFullScreen, setFullScreen] = useState(false);
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ index: number; count: number } | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const canType = onData !== undefined;
  const isInteractive = canType && (connection === undefined || connection.status === 'open');

  // The latest props and state for xterm's listeners, which are attached once per terminal.
  const latest = useRef({ onData, onResize, isInteractive, isFullScreen, fontSize, scrollback });
  useEffect(() => {
    latest.current = { onData, onResize, isInteractive, isFullScreen, fontSize, scrollback };
  });

  // Create the terminal when its container mounts; dispose of it on unmount.
  useEffect(() => {
    if (!container) {
      return;
    }
    const look = readTerminalLook(container);
    const term = new XTerm({
      screenReaderMode: true,
      // Search highlights are decorations, which xterm still calls a proposed API.
      allowProposedApi: true,
      disableStdin: !latest.current.isInteractive,
      fontSize: latest.current.fontSize,
      fontFamily: look.fontFamily,
      theme: look.theme,
      scrollback: latest.current.scrollback,
      cursorBlink: false,
      // Dim text and app-chosen colours still reach AA against the background.
      minimumContrastRatio: 4.5,
    });
    const fit = new FitAddon();
    const search = new SearchAddon();
    term.loadAddon(fit);
    term.loadAddon(search);
    term.open(container);
    instance.current = { term, fit, search, look };

    let reported = '';
    const report = ({ cols, rows }: { cols: number; rows: number }) => {
      const size = `${String(cols)}x${String(rows)}`;
      if (size !== reported) {
        reported = size;
        latest.current.onResize?.({ cols, rows });
      }
    };
    const refit = () => {
      if (container.clientWidth > 0 && container.clientHeight > 0) {
        fit.fit();
      }
    };
    refit();
    report(term);
    for (const data of pendingWrites.current) {
      term.write(data);
    }
    pendingWrites.current = [];

    // Copy on select, once the selection settles (dragging changes it many times).
    const copyTimer = createDeadlineTimer(() => {
      if (!term.hasSelection()) {
        return;
      }
      try {
        void navigator.clipboard.writeText(term.getSelection()).catch(() => undefined);
      } catch {
        // No clipboard (an insecure context): the selection can still be copied with the keyboard or menu.
      }
    });

    const disposables = [
      term.onData((data) => {
        if (latest.current.isInteractive) {
          latest.current.onData?.(data);
        }
      }),
      term.onResize(report),
      term.onSelectionChange(() => {
        copyTimer.start(150);
      }),
      search.onDidChangeResults(({ resultIndex, resultCount }) => {
        setResults({ index: resultIndex, count: resultCount });
      }),
    ];

    term.attachCustomKeyEventHandler((event) => {
      if (event.key === 'Escape' && event.ctrlKey && event.shiftKey) {
        if (event.type === 'keydown') {
          const area = areaRef.current;
          const root = rootRef.current;
          const firstButton = root?.querySelector<HTMLElement>('header button') ?? root ?? null;
          if (latest.current.isFullScreen || !area) {
            firstButton?.focus();
          } else {
            focusAfter(area, firstButton);
          }
        }
        return false;
      }
      // Read-only: Tab moves focus as it does everywhere else.
      return !(event.key === 'Tab' && !latest.current.isInteractive);
    });

    // Text with line breaks waits for confirmation; the capture listener runs before xterm's own.
    const onPaste = (event: ClipboardEvent) => {
      const text = event.clipboardData?.getData('text/plain') ?? '';
      if (latest.current.isInteractive && countLines(text) > 1) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setPendingPaste(text);
      }
    };
    container.addEventListener('paste', onPaste, true);

    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(refit);
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      copyTimer.clear();
      container.removeEventListener('paste', onPaste, true);
      for (const disposable of disposables) {
        disposable.dispose();
      }
      instance.current = null;
      term.dispose();
    };
  }, [container]);

  // Colours follow the theme live.
  useEffect(() => {
    const current = instance.current;
    if (!current || !container) {
      return;
    }
    current.look = readTerminalLook(container);
    current.term.options.theme = current.look.theme;
    current.term.options.fontFamily = current.look.fontFamily;
  }, [theme, container]);

  useEffect(() => {
    const current = instance.current;
    if (current) {
      current.term.options.disableStdin = !isInteractive;
    }
  }, [isInteractive, container]);

  useEffect(() => {
    const current = instance.current;
    if (current && current.term.options.fontSize !== fontSize) {
      current.term.options.fontSize = fontSize;
      current.fit.fit();
    }
  }, [fontSize, container]);

  // xterm's input names itself; use the app's language, and point it at the way out.
  useEffect(() => {
    const textarea = instance.current?.term.textarea;
    if (!textarea) {
      return;
    }
    textarea.setAttribute('aria-label', messages.terminalInput);
    if (canType) {
      textarea.setAttribute('aria-describedby', hintId);
    } else {
      textarea.removeAttribute('aria-describedby');
    }
  }, [messages.terminalInput, hintId, canType, container]);

  // The search field takes focus when the search opens.
  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

  useImperativeHandle(
    handleRef,
    () => ({
      write: (data) => {
        if (instance.current) {
          instance.current.term.write(data);
        } else {
          pendingWrites.current.push(data);
        }
      },
      clear: () => {
        // After the writes already queued, so output and clearing keep their order.
        const term = instance.current?.term;
        term?.write('', () => {
          term.clear();
        });
      },
      focus: () => {
        instance.current?.term.focus();
      },
    }),
    [],
  );

  const find = (direction: 'next' | 'previous', term = query, isIncremental = false) => {
    const current = instance.current;
    if (!current || term === '') {
      return;
    }
    const options = searchOptions(current.look, isIncremental);
    if (direction === 'next') {
      current.search.findNext(term, options);
    } else {
      current.search.findPrevious(term, options);
    }
  };

  const closeSearch = () => {
    instance.current?.search.clearDecorations();
    setSearchOpen(false);
    setQuery('');
    setResults(null);
    instance.current?.term.focus();
  };

  let resultText = '';
  if (results && query !== '') {
    if (results.count === 0) {
      resultText = messages.terminalNoMatches;
    } else if (results.index < 0) {
      resultText = messages.terminalSearchManyResults;
    } else {
      resultText = messages.terminalSearchResult({
        index: results.index + 1,
        count: results.count,
      });
    }
  }

  const label = title ?? messages.terminalLabel;
  const status = connection?.status;
  const fullScreenLabel = isFullScreen
    ? messages.terminalExitFullScreen
    : messages.terminalFullScreen;

  return (
    <section
      ref={mergeRefs(ref, rootRef)}
      aria-labelledby={titleId}
      tabIndex={-1}
      data-connection-status={status}
      className={cn(
        'flex min-w-0 flex-col overflow-hidden border border-border bg-surface-2 outline-none',
        isFullScreen ? 'fixed inset-0 z-overlay rounded-none' : 'rounded-card',
        className,
      )}
    >
      <header className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-3 py-1.5">
        <span id={titleId} className="min-w-0 truncate text-sm font-semibold text-fg">
          {label}
        </span>
        {status !== undefined && connection && (
          <span role="status" className="inline-flex items-center gap-2">
            <StatusDot tone={statusTones[status]} label={statusLabel(status, messages)} size="sm" />
          </span>
        )}
        {connection?.onReconnect && (status === 'closed' || status === 'error') && (
          <Button
            size="sm"
            variant="outline"
            icon={RefreshCw}
            onPress={() => {
              connection.onReconnect?.();
            }}
          >
            {messages.terminalReconnect}
          </Button>
        )}
        <div className="ms-auto flex items-center gap-1">
          {hasSearch && (
            <Tooltip content={messages.terminalSearch}>
              <IconButton
                icon={Search}
                aria-label={messages.terminalSearch}
                size="sm"
                isSelected={isSearchOpen}
                onChange={(isSelected) => {
                  if (isSelected) {
                    setSearchOpen(true);
                  } else {
                    closeSearch();
                  }
                }}
              />
            </Tooltip>
          )}
          {hasFullScreen && (
            <Tooltip content={fullScreenLabel}>
              <IconButton
                icon={isFullScreen ? Minimize2 : Maximize2}
                aria-label={fullScreenLabel}
                size="sm"
                onPress={() => {
                  setFullScreen(!isFullScreen);
                }}
              />
            </Tooltip>
          )}
        </div>
      </header>
      {isSearchOpen && (
        <div className="flex min-w-0 flex-wrap items-center gap-2 border-b border-border px-3 py-1.5">
          <SearchField
            aria-label={messages.terminalSearch}
            size="sm"
            className="min-w-0 flex-1 basis-40"
            value={query}
            inputRef={searchInputRef}
            onChange={(value) => {
              setQuery(value);
              if (value === '') {
                instance.current?.search.clearDecorations();
                setResults(null);
              } else {
                find('next', value, true);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                find(event.shiftKey ? 'previous' : 'next');
              } else if (event.key === 'Escape' && query === '') {
                // The field clears itself on Escape; Escape on an empty field closes the search.
                closeSearch();
              }
            }}
          />
          <div className="flex items-center gap-1">
            <span aria-live="polite" className="min-w-16 text-xs text-fg-muted tabular-nums">
              {resultText}
            </span>
            <Tooltip content={messages.terminalFindPrevious}>
              <IconButton
                icon={ChevronUp}
                aria-label={messages.terminalFindPrevious}
                size="sm"
                isDisabled={query === ''}
                onPress={() => {
                  find('previous');
                }}
              />
            </Tooltip>
            <Tooltip content={messages.terminalFindNext}>
              <IconButton
                icon={ChevronDown}
                aria-label={messages.terminalFindNext}
                size="sm"
                isDisabled={query === ''}
                onPress={() => {
                  find('next');
                }}
              />
            </Tooltip>
          </div>
        </div>
      )}
      <div
        ref={areaRef}
        className={cn('min-h-0 bg-code-bg p-2', isFullScreen ? 'flex-1' : 'h-(--terminal-height)')}
        // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the terminal's height.
        style={{ '--terminal-height': height } as React.CSSProperties}
      >
        <div ref={setContainer} className="size-full" />
      </div>
      {canType && (
        <p id={hintId} className="border-t border-border px-3 py-1 text-xs text-fg-muted">
          {messages.terminalFocusHint}
        </p>
      )}
      <ConfirmDialog
        isOpen={pendingPaste !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setPendingPaste(null);
          }
        }}
        title={messages.terminalPasteTitle}
        body={
          pendingPaste !== null && (
            <div className="flex flex-col gap-3">
              <p>{messages.terminalPasteBody({ lines: countLines(pendingPaste) })}</p>
              <ScrollRegion aria-label={messages.terminalPastePreview} maxHeight="10rem">
                <pre className="font-mono text-xs whitespace-pre-wrap">{pendingPaste}</pre>
              </ScrollRegion>
            </div>
          )
        }
        confirmLabel={messages.terminalPasteConfirm}
        onConfirm={() => {
          const current = instance.current;
          if (current && pendingPaste !== null) {
            current.term.paste(pendingPaste);
            current.term.focus();
          }
        }}
      />
    </section>
  );
}
