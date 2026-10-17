// LogViewer: a virtualised log (100k+ lines) in a monospace face, with level badges, ANSI colours as theme tokens,
// following the newest line, text or /regex/ search, a level filter, expandable structured fields, loading older
// lines at the top, wrapping, plain-text copy and a .log download.

import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ArrowDown,
  ArrowDownToLine,
  ChevronDown,
  ChevronUp,
  Download,
  ListFilter,
  Megaphone,
  WrapText,
} from 'lucide-react';
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type Ref,
} from 'react';
import { Toolbar, useLocale, type Selection } from 'react-aria-components';
import { Button } from '../components/Button/Button';
import { IconButton } from '../components/IconButton/IconButton';
import { MenuButton } from '../components/Menu/MenuButtons';
import { MenuItem, MenuSection } from '../components/Menu/Menu';
import { SearchField } from '../components/SearchField/SearchField';
import { Spinner } from '../components/Spinner/Spinner';
import { Tooltip } from '../components/Tooltip/Tooltip';
import { useTimeZone } from '../provider/context';
import { cn } from '../utils/cn';
import { useDeadlineTimer } from '../utils/timers';
import { useControllableState } from '../utils/useControllableState';
import {
  isErrorLevel,
  LOG_LEVELS,
  lineDate,
  linePlainText,
  logFileText,
  logLineText,
  type LogLevel,
  type LogLine,
} from './format';
import { levelLabel, LogRow } from './LogRow';
import { useLogMessages } from './messages';
import { compileLogSearch, findMatches } from './search';

/** A row's estimated height in pixels (one line of text); real heights are measured. */
const ROW_ESTIMATE = 24;
/** How close to the bottom (in pixels) still counts as "at the newest line". */
const FOLLOW_THRESHOLD = 8;
/** At most one error announcement per this many milliseconds; errors in between are summarised. */
const ANNOUNCE_INTERVAL_MS = 3000;

export interface LogViewerProps {
  lines: readonly LogLine[];
  /** Keeps the view pinned to the newest line while true; scrolling up pauses it. Controlled. */
  isFollowing?: boolean;
  /** Whether it follows at first, uncontrolled. Defaults to true. */
  defaultFollowing?: boolean;
  onFollowingChange?: (isFollowing: boolean) => void;
  /** Text (case-insensitive) or `/regex/flags` search; matches are highlighted with next and previous. Controlled. */
  search?: string;
  defaultSearch?: string;
  onSearchChange?: (search: string) => void;
  /** The visible levels. Lines without a level always show. Controlled. */
  levels?: readonly LogLevel[];
  /** The levels visible at first, uncontrolled. Defaults to every level. */
  defaultLevels?: readonly LogLevel[];
  onLevelsChange?: (levels: LogLevel[]) => void;
  /** Called when the view is scrolled to the top, to prepend older lines (the view keeps its place). */
  onLoadOlder?: () => void;
  /** Shows that older lines are loading (and holds off further `onLoadOlder` calls). */
  isLoadingOlder?: boolean;
  /** Wraps long lines instead of scrolling sideways. Controlled; the toolbar's toggle changes it. */
  hasWrap?: boolean;
  /** Whether lines wrap at first, uncontrolled. Defaults to false. */
  defaultWrap?: boolean;
  onWrapChange?: (hasWrap: boolean) => void;
  /** Announces new error and fatal lines to screen readers (throttled). Controlled; the toolbar toggles it. */
  isAnnouncingErrors?: boolean;
  /** Whether errors are announced at first, uncontrolled. Defaults to false. */
  defaultAnnouncingErrors?: boolean;
  onAnnouncingErrorsChange?: (isAnnouncingErrors: boolean) => void;
  /** The log's maximum height, such as `30rem`. Defaults to `24rem`. */
  maxHeight?: string;
  /** IANA time zone for timestamps. Defaults to UIProvider's `timeZone`. */
  timeZone?: string;
  /** How timestamps show. Defaults to 24-hour time with milliseconds. */
  timeFormat?: Intl.DateTimeFormatOptions;
  /** The download's file name. Defaults to `log.log`. */
  downloadFileName?: string;
  /** Lines whose fields start expanded (by id), uncontrolled. */
  defaultExpandedIds?: readonly string[];
  /** Shows the toolbar (search, levels, follow, wrap, announce, download). Defaults to true. */
  hasToolbar?: boolean;
  /** Names the log. Defaults to the `logLabel` message. */
  'aria-label'?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

const defaultTimeFormat: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  fractionalSecondDigits: 3,
  hourCycle: 'h23',
};

interface MatchIndex {
  total: number;
  /** Per visible row: its match ranges and the overall index of its first match. */
  rows: Map<number, { ranges: [number, number][]; first: number }>;
  /** The visible row of each match, in order. */
  matchRows: number[];
}

const emptyMatches: MatchIndex = { total: 0, rows: new Map(), matchRows: [] };
const noRanges: readonly [number, number][] = [];

/**
 * A virtualised log viewer for streams of 100k+ lines. It follows the newest line until scrolled up, then offers
 * "Jump to latest (N new)". Search takes text or a `/regex/`, with highlighted matches and next/previous; the level
 * filter, wrap, error announcements and a .log download sit in the toolbar. The log is a `log` region with
 * `aria-live="off"`, so lines aren't read out unless "Announce errors" is on.
 */
export function LogViewer({
  lines,
  isFollowing: isFollowingProp,
  defaultFollowing = true,
  onFollowingChange,
  search: searchProp,
  defaultSearch = '',
  onSearchChange,
  levels: levelsProp,
  defaultLevels = LOG_LEVELS,
  onLevelsChange,
  onLoadOlder,
  isLoadingOlder = false,
  hasWrap: hasWrapProp,
  defaultWrap = false,
  onWrapChange,
  isAnnouncingErrors: isAnnouncingErrorsProp,
  defaultAnnouncingErrors = false,
  onAnnouncingErrorsChange,
  maxHeight = '24rem',
  timeZone,
  timeFormat = defaultTimeFormat,
  downloadFileName = 'log.log',
  defaultExpandedIds,
  hasToolbar = true,
  'aria-label': ariaLabel,
  className,
  ref,
}: LogViewerProps) {
  const messages = useLogMessages();
  const { locale } = useLocale();
  const defaultTimeZone = useTimeZone();
  const zone = timeZone ?? defaultTimeZone;

  const [isFollowing, setFollowing] = useControllableState(
    isFollowingProp,
    defaultFollowing,
    onFollowingChange,
  );
  const [search, setSearch] = useControllableState(searchProp, defaultSearch, onSearchChange);
  const [levelList, setLevelList] = useControllableState<readonly LogLevel[]>(
    levelsProp,
    defaultLevels,
    onLevelsChange as ((levels: readonly LogLevel[]) => void) | undefined,
  );
  const [isWrapped, setWrapped] = useControllableState(hasWrapProp, defaultWrap, onWrapChange);
  const [isAnnouncing, setAnnouncing] = useControllableState(
    isAnnouncingErrorsProp,
    defaultAnnouncingErrors,
    onAnnouncingErrorsChange,
  );
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set(defaultExpandedIds));

  // Lines at the visible levels.
  const levelKey = LOG_LEVELS.filter((level) => levelList.includes(level)).join(',');
  const levelSet = useMemo(
    () => new Set<string>(levelKey === '' ? [] : levelKey.split(',')),
    [levelKey],
  );
  const isAllLevels = levelSet.size === LOG_LEVELS.length;
  const visibleLines = useMemo(
    () =>
      isAllLevels
        ? lines
        : lines.filter((line) => line.level === undefined || levelSet.has(line.level)),
    [lines, levelSet, isAllLevels],
  );

  // Search: deferred, so typing stays responsive in a long log.
  const deferredSearch = useDeferredValue(search);
  const compiled = useMemo(() => compileLogSearch(deferredSearch), [deferredSearch]);
  const matchIndex = useMemo<MatchIndex>(() => {
    if (!compiled.regex) {
      return emptyMatches;
    }
    const rows = new Map<number, { ranges: [number, number][]; first: number }>();
    const matchRows: number[] = [];
    visibleLines.forEach((line, row) => {
      const ranges = findMatches(linePlainText(line), compiled.regex);
      if (ranges.length > 0) {
        rows.set(row, { ranges, first: matchRows.length });
        matchRows.push(...ranges.map(() => row));
      }
    });
    return { total: matchRows.length, rows, matchRows };
  }, [compiled, visibleLines]);
  const [currentMatchState, setCurrentMatch] = useState(0);
  // Keep the current match in range as matches come and go.
  const currentMatch =
    matchIndex.total === 0 ? -1 : Math.min(currentMatchState, matchIndex.total - 1);

  // Timestamps in the app's time zone.
  const timeFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { ...timeFormat, timeZone: zone }),
    [locale, timeFormat, zone],
  );

  // Virtualisation. TanStack Virtual returns functions the React Compiler can't memoise, so it skips this component.
  const scrollRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line react-hooks/incompatible-library -- expected; the component re-renders on scroll anyway.
  const virtualizer = useVirtualizer({
    count: visibleLines.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_ESTIMATE,
    getItemKey: (index) => visibleLines[index]?.id ?? index,
    overscan: 10,
  });
  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  // Following: pin to the bottom whenever lines arrive or rows are measured.
  const lastScrollTop = useRef(0);
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!isFollowing || !element) {
      return;
    }
    element.scrollTop = element.scrollHeight;
    lastScrollTop.current = element.scrollTop;
  }, [isFollowing, visibleLines, totalSize, isWrapped]);

  // When paused, the first visible row stays put as lines are added or removed above it (older lines loading, or a
  // capped buffer dropping its oldest lines).
  const anchor = useRef<{ key: string; delta: number } | null>(null);
  const firstId = useRef<string | undefined>(undefined);
  useLayoutEffect(() => {
    const first = visibleLines[0]?.id;
    const previous = firstId.current;
    firstId.current = first;
    const element = scrollRef.current;
    const held = anchor.current;
    if (isFollowing || previous === first || !held || !element) {
      return;
    }
    const index = visibleLines.findIndex((line) => line.id === held.key);
    const start = index < 0 ? undefined : virtualizer.measurementsCache[index]?.start;
    if (start !== undefined) {
      element.scrollTop = start + held.delta;
      lastScrollTop.current = element.scrollTop;
    }
  }, [visibleLines, isFollowing, virtualizer]);

  // "N new": lines (at the visible levels) that arrived after the newest one seen when following paused.
  const lastLineId = lines.at(-1)?.id;
  const [pausedAt, setPausedAt] = useState<string | null>(null);
  if (!isFollowing && pausedAt === null) {
    setPausedAt(lastLineId ?? '');
  } else if (isFollowing && pausedAt !== null) {
    setPausedAt(null);
  }
  const newCount = useMemo(() => {
    if (pausedAt === null) {
      return 0;
    }
    let count = 0;
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      const line = lines[index];
      if (!line || line.id === pausedAt) {
        break;
      }
      if (line.level === undefined || levelSet.has(line.level)) {
        count += 1;
      }
    }
    return count;
  }, [lines, pausedAt, levelSet]);

  const requestedOlderFor = useRef<string | undefined>(undefined);
  const onScroll = () => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }
    const top = element.scrollTop;
    const distance = element.scrollHeight - element.clientHeight - top;
    const hasMovedUp = top < lastScrollTop.current - 1;
    lastScrollTop.current = top;
    if (isFollowing && hasMovedUp && distance > FOLLOW_THRESHOLD) {
      setFollowing(false);
    } else if (!isFollowing && !hasMovedUp && distance <= FOLLOW_THRESHOLD) {
      setFollowing(true);
    }
    const item = virtualizer.getVirtualItemForOffset(top);
    anchor.current = item ? { key: String(item.key), delta: top - item.start } : null;
    const first = visibleLines[0]?.id;
    if (
      onLoadOlder &&
      !isLoadingOlder &&
      top < ROW_ESTIMATE * 2 &&
      first !== undefined &&
      requestedOlderFor.current !== first
    ) {
      requestedOlderFor.current = first;
      onLoadOlder();
    }
  };

  const jumpToLatest = () => {
    setFollowing(true);
    scrollRef.current?.focus({ preventScroll: true });
  };

  // Search navigation: move to a match, pausing following so the view stays on it.
  const searchLiveRef = useRef<HTMLSpanElement>(null);
  const goToMatch = (next: number) => {
    if (matchIndex.total === 0) {
      return;
    }
    const target = ((next % matchIndex.total) + matchIndex.total) % matchIndex.total;
    setCurrentMatch(target);
    const row = matchIndex.matchRows[target];
    if (row !== undefined) {
      setFollowing(false);
      virtualizer.scrollToIndex(row, { align: 'center' });
    }
    if (searchLiveRef.current) {
      searchLiveRef.current.textContent = messages.logMatchPosition({
        current: target + 1,
        total: matchIndex.total,
      });
    }
  };
  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      goToMatch(currentMatch + (event.shiftKey ? -1 : 1));
    }
  };

  // Announce the number of results when the search changes (not as streamed lines add matches).
  const announcedSearch = useRef('');
  useEffect(() => {
    const live = searchLiveRef.current;
    if (!live || announcedSearch.current === deferredSearch) {
      return;
    }
    announcedSearch.current = deferredSearch;
    live.textContent =
      deferredSearch === ''
        ? ''
        : compiled.isInvalid
          ? messages.logInvalidPattern
          : messages.logMatchCount({ count: matchIndex.total });
  }, [deferredSearch, compiled, matchIndex, messages]);

  // Announce new error and fatal lines while "Announce errors" is on, at most once per ANNOUNCE_INTERVAL_MS.
  const errorLiveRef = useRef<HTMLSpanElement>(null);
  const pendingErrors = useRef<LogLine[]>([]);
  const announcedThrough = useRef<string | undefined>(lastLineId);
  const flushErrors = useCallback(() => {
    const pending = pendingErrors.current;
    const live = errorLiveRef.current;
    const latest = pending.at(-1);
    if (!latest || !live) {
      return false;
    }
    pendingErrors.current = [];
    const message = linePlainText(latest);
    live.textContent =
      pending.length === 1
        ? messages.logNewError({
            level: latest.level ? levelLabel(latest.level, messages) : '',
            message,
          })
        : messages.logNewErrors({ count: pending.length, message });
    return true;
  }, [messages]);
  const announceTimer = useDeadlineTimer(() => {
    if (flushErrors()) {
      announceTimer.start(ANNOUNCE_INTERVAL_MS);
    }
  });
  useEffect(() => {
    const previous = announcedThrough.current;
    announcedThrough.current = lastLineId;
    if (!isAnnouncing || previous === lastLineId) {
      return;
    }
    const fresh: LogLine[] = [];
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      const line = lines[index];
      if (!line || line.id === previous) {
        break;
      }
      if (isErrorLevel(line.level)) {
        fresh.unshift(line);
      }
    }
    if (fresh.length === 0) {
      return;
    }
    pendingErrors.current.push(...fresh);
    if (announceTimer.remaining() === 0 && flushErrors()) {
      announceTimer.start(ANNOUNCE_INTERVAL_MS);
    }
  }, [lines, lastLineId, isAnnouncing, announceTimer, flushErrors]);

  // Copying a selection gives plain text: whole lines when it spans rows, the selected text within one row.
  const formatTime = useCallback((date: Date) => timeFormatter.format(date), [timeFormatter]);
  const onCopy = (event: ClipboardEvent<HTMLDivElement>) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      return;
    }
    const range = selection.getRangeAt(0);
    const rowOf = (node: Node) =>
      (node instanceof Element ? node : node.parentElement)?.closest<HTMLElement>('[data-log-row]');
    const startRow = rowOf(range.startContainer);
    const endRow = rowOf(range.endContainer);
    let text: string;
    if (startRow && endRow && startRow !== endRow) {
      const from = Number(startRow.dataset.index);
      const to = Number(endRow.dataset.index);
      text = visibleLines
        .slice(Math.min(from, to), Math.max(from, to) + 1)
        .map((line) => logLineText(line, formatTime))
        .join('\n');
    } else {
      text = selection.toString().replace(/[ \t]*\n[ \t\n]*/g, ' ');
    }
    event.clipboardData.setData('text/plain', text);
    event.preventDefault();
  };

  const download = () => {
    const blob = new Blob([logFileText(visibleLines)], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadFileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const toggleExpanded = useCallback((id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectedLevels: Selection = levelSet;
  const onLevelSelection = (keys: Selection) => {
    const chosen = keys === 'all' ? [...LOG_LEVELS] : LOG_LEVELS.filter((level) => keys.has(level));
    setLevelList(chosen);
  };

  const firstStart = virtualItems[0]?.start ?? 0;
  const position =
    deferredSearch === ''
      ? ''
      : compiled.isInvalid
        ? messages.logInvalidPattern
        : messages.logMatchPosition({ current: currentMatch + 1, total: matchIndex.total });

  return (
    <div
      ref={ref}
      className={cn(
        'relative flex min-w-0 max-w-full flex-col overflow-hidden rounded-card border border-border bg-surface-1',
        className,
      )}
    >
      {hasToolbar && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border p-2">
          <div className="flex min-w-0 grow basis-56 items-center gap-1">
            <SearchField
              aria-label={messages.logSearch}
              placeholder={messages.logSearchPlaceholder}
              size="sm"
              value={search}
              onChange={(value) => {
                setSearch(value);
                setCurrentMatch(0);
              }}
              onKeyDown={onSearchKeyDown}
              isInvalid={compiled.isInvalid}
              className="min-w-0 flex-1"
            />
            {position !== '' && (
              <span
                className={cn(
                  'shrink-0 px-1 text-xs whitespace-nowrap tabular-nums',
                  compiled.isInvalid ? 'text-danger-fg' : 'text-fg-muted',
                )}
              >
                {position}
              </span>
            )}
            <Tooltip content={messages.logPreviousMatch}>
              <IconButton
                icon={ChevronUp}
                size="sm"
                aria-label={messages.logPreviousMatch}
                isDisabled={matchIndex.total === 0}
                onPress={() => {
                  goToMatch(currentMatch - 1);
                }}
              />
            </Tooltip>
            <Tooltip content={messages.logNextMatch}>
              <IconButton
                icon={ChevronDown}
                size="sm"
                aria-label={messages.logNextMatch}
                isDisabled={matchIndex.total === 0}
                onPress={() => {
                  goToMatch(currentMatch + 1);
                }}
              />
            </Tooltip>
          </div>
          <Toolbar aria-label={messages.logToolbar} className="ms-auto flex items-center gap-1">
            <MenuButton
              label={
                isAllLevels
                  ? messages.logLevels
                  : messages.logLevelsFiltered({
                      count: levelSet.size,
                      total: LOG_LEVELS.length,
                    })
              }
              icon={ListFilter}
              variant="ghost"
              size="sm"
              menuLabel={messages.logLevels}
            >
              <MenuSection
                aria-label={messages.logLevels}
                selectionMode="multiple"
                selectedKeys={selectedLevels}
                onSelectionChange={onLevelSelection}
              >
                {LOG_LEVELS.map((level) => (
                  <MenuItem key={level} id={level}>
                    {levelLabel(level, messages)}
                  </MenuItem>
                ))}
              </MenuSection>
            </MenuButton>
            <Tooltip content={messages.logFollow}>
              <IconButton
                icon={ArrowDownToLine}
                size="sm"
                aria-label={messages.logFollow}
                isSelected={isFollowing}
                onChange={setFollowing}
              />
            </Tooltip>
            <Tooltip content={messages.logWrapLines}>
              <IconButton
                icon={WrapText}
                size="sm"
                aria-label={messages.logWrapLines}
                isSelected={isWrapped}
                onChange={setWrapped}
              />
            </Tooltip>
            <Tooltip content={messages.logAnnounceErrors}>
              <IconButton
                icon={Megaphone}
                size="sm"
                aria-label={messages.logAnnounceErrors}
                isSelected={isAnnouncing}
                onChange={setAnnouncing}
              />
            </Tooltip>
            <Tooltip content={messages.logDownload}>
              <IconButton
                icon={Download}
                size="sm"
                aria-label={messages.logDownload}
                isDisabled={visibleLines.length === 0}
                onPress={download}
              />
            </Tooltip>
          </Toolbar>
        </div>
      )}
      <span ref={searchLiveRef} className="sr-only" aria-live="polite" />
      <span ref={errorLiveRef} className="sr-only" aria-live="assertive" />
      <div className="relative min-h-0">
        {isLoadingOlder && (
          <div
            role="status"
            className="absolute inset-x-0 top-0 z-[1] flex items-center justify-center gap-2 bg-surface-2 py-1 text-xs text-fg-muted"
          >
            <Spinner size="sm" label={messages.logLoadingOlder} />
            <span aria-hidden="true">{messages.logLoadingOlder}</span>
          </div>
        )}
        <div
          ref={scrollRef}
          role="log"
          aria-live="off"
          aria-label={ariaLabel ?? messages.logLabel}
          // A scrollable log must be focusable so keyboard users can scroll it (and pause following).
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- see above.
          tabIndex={0}
          onScroll={onScroll}
          onCopy={onCopy}
          // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the app's maximum height.
          style={{ maxHeight }}
          className="overflow-auto font-mono text-xs outline-none focus-visible:focus-ring focus-visible:-outline-offset-2"
        >
          {visibleLines.length === 0 ? (
            <p className="m-0 px-3 py-6 text-center font-sans text-sm text-fg-muted">
              {messages.logEmpty}
            </p>
          ) : (
            <div
              // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the virtual list's total height.
              style={{ height: totalSize }}
              className={cn('relative', isWrapped ? 'w-full' : 'w-max min-w-full')}
            >
              <div
                // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: offset of the first rendered row.
                style={{ transform: `translateY(${String(firstStart)}px)` }}
                className="absolute inset-x-0 top-0"
              >
                {virtualItems.map((item) => {
                  const line = visibleLines[item.index];
                  if (!line) {
                    return null;
                  }
                  const date = lineDate(line);
                  const rowMatches = matchIndex.rows.get(item.index);
                  const current =
                    rowMatches && currentMatch >= rowMatches.first
                      ? currentMatch - rowMatches.first
                      : -1;
                  return (
                    <LogRow
                      key={item.key}
                      line={line}
                      index={item.index}
                      time={date ? timeFormatter.format(date) : ''}
                      dateTime={date?.toISOString()}
                      isWrapped={isWrapped}
                      isExpanded={expanded.has(line.id)}
                      onToggle={toggleExpanded}
                      matches={rowMatches?.ranges ?? noRanges}
                      currentMatch={rowMatches && current < rowMatches.ranges.length ? current : -1}
                      messages={messages}
                      measureRef={virtualizer.measureElement}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {!isFollowing && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
            <Button
              size="sm"
              variant="solid"
              tone="accent"
              icon={ArrowDown}
              onPress={jumpToLatest}
              className="pointer-events-auto shadow-raised"
            >
              {messages.logJumpToLatest({ count: newCount })}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
