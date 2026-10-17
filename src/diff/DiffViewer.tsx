// DiffViewer: what changes between two texts (a live and a proposed configuration, two revisions of a document), as a
// line diff with word-level highlights, line numbers from both sides, and unchanged runs collapsed around each hunk.
// Split side by side on wide containers and unified on narrow ones; it scrolls inside itself, never the page.

import { ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react';
import {
  Fragment,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import { Button as AriaButton } from 'react-aria-components';
import {
  highlightCode,
  type CodeHighlighter,
  type CodeLanguage,
  type CodeToken,
  type CodeTokenType,
} from '../code/tokenize';
import { IconButton } from '../components/IconButton/IconButton';
import { Tooltip } from '../components/Tooltip/Tooltip';
import { cn } from '../utils/cn';
import { useElementWidth } from '../utils/useElementWidth';
import {
  buildHunks,
  diffLines,
  splitLines,
  structuralNormalize,
  wordDiffRanges,
  type DiffChange,
  type DiffLayout,
  type DiffLine,
  type DiffRange,
} from './diff';
import { useDiffMessages, type DiffStrings } from './messages';

/** Containers at least this wide (48rem) show the split layout by default. */
const SPLIT_MIN_WIDTH = 768;

const tokenClasses: Record<CodeTokenType, string | undefined> = {
  plain: undefined,
  keyword: 'text-code-keyword',
  string: 'text-code-string',
  number: 'text-code-number',
  comment: 'text-code-comment italic',
  punct: 'text-code-punct',
  property: 'text-code-property',
};

const lineClasses: Record<DiffChange, string> = {
  equal: '',
  added: 'bg-success-bg',
  removed: 'bg-danger-bg',
};

const signClasses: Record<DiffChange, string> = {
  equal: 'text-code-comment',
  added: 'text-success-fg',
  removed: 'text-danger-fg',
};

/** Changed words: an underline and an outline, so they don't rely on colour. */
const changedWordClasses: Record<Exclude<DiffChange, 'equal'>, string> = {
  added:
    'rounded-xs underline decoration-success-fg decoration-2 underline-offset-[3px] ring-1 ring-inset ring-success-border',
  removed:
    'rounded-xs underline decoration-danger-fg decoration-2 underline-offset-[3px] ring-1 ring-inset ring-danger-border',
};

const signs: Record<DiffChange, string> = { equal: ' ', added: '+', removed: '−' };

const numberWidthClasses = ['w-[4ch]', 'w-[5ch]', 'w-[6ch]', 'w-[7ch]', 'w-[8ch]'] as const;

export type DiffLayoutMode = 'split' | 'unified';

export interface DiffViewerProps {
  before: string;
  after: string;
  /** Colours tokens with CodeBlock's highlighter. Defaults to `text` (no colours), or `json` in structural mode. */
  language?: CodeLanguage;
  /** Defaults to `split` on containers at least 48rem wide and `unified` on narrower ones. */
  layout?: DiffLayoutMode;
  /** Unchanged lines shown around each change; longer runs collapse into "Show N lines". Defaults to 3. */
  context?: number;
  /**
   * Compares parsed data structurally (object keys sorted, then pretty-printed), so reordered keys aren't changes.
   * Parses JSON by default; pass `parse` for other formats, such as a YAML parser. Falls back to a text diff, with a
   * note, when either side can't be parsed.
   */
  isStructural?: boolean;
  /** Parses each side in structural mode. Defaults to `JSON.parse`. */
  parse?: (text: string) => unknown;
  /** Names the old side, such as "Live". Defaults to the `diffBefore` message. */
  beforeLabel?: string;
  /** Names the new side, such as "Proposed". Defaults to the `diffAfter` message. */
  afterLabel?: string;
  /** Highlights changed words within changed lines. Defaults to true. */
  hasWordDiff?: boolean;
  /** Scrolls inside past this height, such as `24rem`. */
  maxHeight?: string;
  /** Replaces the built-in highlighter, as CodeBlock's `highlight` does. */
  highlight?: CodeHighlighter;
  /** Names the diff. Defaults to the `diffLabel` message ("Changes from Before to After"). */
  'aria-label'?: string;
  className?: string;
  ref?: Ref<HTMLElement>;
}

/** One line as shown: its diff line, its syntax tokens, and the ranges of changed words. */
interface ShownLine {
  line: DiffLine;
  tokens: CodeToken[] | undefined;
  ranges: readonly DiffRange[] | undefined;
}

/** Splits a line into pieces with one token type and one changed state each. */
function linePieces(
  text: string,
  tokens: readonly CodeToken[] | undefined,
  ranges: readonly DiffRange[] | undefined,
): { text: string; type: CodeTokenType; isChanged: boolean }[] {
  const tokenList =
    tokens?.map((token) => token.text).join('') === text
      ? tokens
      : [{ type: 'plain' as const, text }];
  const pieces: { text: string; type: CodeTokenType; isChanged: boolean }[] = [];
  let offset = 0;
  let rangeIndex = 0;
  for (const token of tokenList) {
    let start = 0;
    while (start < token.text.length) {
      const at = offset + start;
      while (ranges && rangeIndex < ranges.length && (ranges[rangeIndex]?.[1] ?? 0) <= at) {
        rangeIndex++;
      }
      const range = ranges?.[rangeIndex];
      const isChanged = range !== undefined && range[0] <= at;
      // The piece ends at the token's end or the next range boundary, whichever comes first.
      const boundary = range === undefined ? Infinity : isChanged ? range[1] : range[0];
      const end = Math.min(token.text.length, boundary - offset);
      pieces.push({ text: token.text.slice(start, end), type: token.type, isChanged });
      start = end;
    }
    offset += token.text.length;
  }
  return pieces;
}

function LineContent({ shown, className }: { shown: ShownLine; className?: string }) {
  const { line } = shown;
  const pieces = linePieces(line.text, shown.tokens, shown.ranges);
  return (
    <span className={cn('min-w-0 flex-1 pe-3', className)}>
      {pieces.length === 0
        ? '\n'
        : pieces.map((piece, index) => (
            <span
              key={index}
              className={cn(
                tokenClasses[piece.type],
                piece.isChanged && line.type !== 'equal' && changedWordClasses[line.type],
              )}
            >
              {piece.text}
            </span>
          ))}
    </span>
  );
}

/** The +, − or blank mark, hidden from screen readers, with "added" or "removed" read instead. */
function LineSign({ type, messages }: { type: DiffChange; messages: DiffStrings }) {
  return (
    <>
      <span
        aria-hidden="true"
        className={cn('w-[2ch] shrink-0 text-center select-none', signClasses[type])}
      >
        {signs[type]}
      </span>
      {type !== 'equal' && (
        <span className="sr-only">
          {type === 'added' ? messages.lineAdded : messages.lineRemoved}{' '}
        </span>
      )}
    </>
  );
}

function LineNumber({ number, widthClass }: { number: number | undefined; widthClass: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('shrink-0 ps-2 pe-1 text-end text-code-comment select-none', widthClass)}
    >
      {number}
    </span>
  );
}

/** The changed-word ranges of each changed line, pairing a change's removed lines with its added lines in order. */
function wordRanges(lines: readonly DiffLine[]): Map<number, readonly DiffRange[]> {
  const ranges = new Map<number, readonly DiffRange[]>();
  let index = 0;
  while (index < lines.length) {
    if (lines[index]?.type === 'equal') {
      index++;
      continue;
    }
    const removed: number[] = [];
    const added: number[] = [];
    while (index < lines.length && lines[index]?.type !== 'equal') {
      (lines[index]?.type === 'removed' ? removed : added).push(index);
      index++;
    }
    for (let pair = 0; pair < Math.min(removed.length, added.length); pair++) {
      const beforeIndex = removed[pair] ?? 0;
      const afterIndex = added[pair] ?? 0;
      const result = wordDiffRanges(lines[beforeIndex]?.text ?? '', lines[afterIndex]?.text ?? '');
      if (result) {
        ranges.set(beforeIndex, result.before);
        ranges.set(afterIndex, result.after);
      }
    }
  }
  return ranges;
}

type Segment = { kind: 'hunk'; index: number } | { kind: 'gap'; index: number };

/** A line diff with word highlights, collapsed context, hunk navigation, and split or unified layout. */
export function DiffViewer({
  before,
  after,
  language,
  layout: layoutProp,
  context = 3,
  isStructural = false,
  parse,
  beforeLabel,
  afterLabel,
  hasWordDiff = true,
  maxHeight,
  highlight = highlightCode,
  'aria-label': ariaLabel,
  className,
  ref,
}: DiffViewerProps) {
  const messages = useDiffMessages();
  const oldLabel = beforeLabel ?? messages.diffBefore;
  const newLabel = afterLabel ?? messages.diffAfter;

  // Structural mode compares normalised JSON; it falls back to the texts as given when a side doesn't parse.
  const prepared = useMemo(() => {
    const normal = (text: string) => text.replace(/\r\n?/g, '\n');
    if (isStructural) {
      const oldText = structuralNormalize(before, parse);
      const newText = structuralNormalize(after, parse);
      if (oldText !== null && newText !== null) {
        return {
          before: oldText,
          after: newText,
          language: language === 'text' ? ('text' as const) : ('json' as const),
          isFallback: false,
        };
      }
    }
    return {
      before: normal(before),
      after: normal(after),
      language: language ?? 'text',
      isFallback: isStructural,
    };
  }, [before, after, isStructural, parse, language]);

  const diff: DiffLayout = useMemo(
    () => buildHunks(diffLines(prepared.before, prepared.after), context),
    [prepared, context],
  );
  const tokens = useMemo(() => {
    if (prepared.language === 'text') {
      return undefined;
    }
    return {
      before: highlight(prepared.before, prepared.language),
      after: highlight(prepared.after, prepared.language),
    };
  }, [prepared, highlight]);
  const ranges = useMemo(
    () => (hasWordDiff ? wordRanges(diff.lines) : new Map<number, readonly DiffRange[]>()),
    [diff, hasWordDiff],
  );

  const shownLine = (index: number): ShownLine => {
    const line = diff.lines[index] ?? { type: 'equal' as const, text: '' };
    const lineTokens =
      line.type === 'removed'
        ? tokens?.before[(line.beforeNumber ?? 0) - 1]
        : tokens?.after[(line.afterNumber ?? 0) - 1];
    return { line, tokens: lineTokens, ranges: ranges.get(index) };
  };

  // Expanded gaps, reset when the diff changes (React's "adjust state when a prop changes" pattern).
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set());
  const [currentHunk, setCurrentHunk] = useState(-1);
  const [announcement, setAnnouncement] = useState('');
  const [shownDiff, setShownDiff] = useState(diff);
  if (shownDiff !== diff) {
    setShownDiff(diff);
    setExpanded(new Set());
    setCurrentHunk(-1);
    setAnnouncement('');
  }

  const [measureRef, width] = useElementWidth();
  const layout =
    layoutProp ?? (width !== undefined && width >= SPLIT_MIN_WIDTH ? 'split' : 'unified');

  // The scroll area takes focus only when it scrolls, so keyboard users can scroll it.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isScrollable, setScrollable] = useState(false);
  useLayoutEffect(() => {
    const area = scrollRef.current;
    if (!area) {
      return;
    }
    const measure = () => {
      setScrollable(area.scrollWidth > area.clientWidth || area.scrollHeight > area.clientHeight);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(area);
    const content = area.firstElementChild;
    if (content) {
      observer.observe(content);
    }
    return () => {
      observer.disconnect();
    };
  }, []);

  const hunkRefs = useRef(new Map<number, HTMLElement>());
  const goToHunk = (index: number) => {
    const hunk = diff.hunks[index];
    if (!hunk) {
      return;
    }
    setCurrentHunk(index);
    setAnnouncement(
      messages.hunkAnnouncement({
        index: index + 1,
        total: diff.hunks.length,
        line: hunk.afterCount > 0 ? hunk.afterStart : hunk.beforeStart,
      }),
    );
    const header = hunkRefs.current.get(index);
    const area = scrollRef.current;
    if (!header || !area) {
      return;
    }
    if (area.scrollHeight > area.clientHeight) {
      area.scrollTop += header.getBoundingClientRect().top - area.getBoundingClientRect().top;
    } else {
      header.scrollIntoView({ block: 'nearest' });
    }
  };

  const maxNumber = Math.max(splitLines(prepared.before).length, splitLines(prepared.after).length);
  const widthClass =
    numberWidthClasses[
      Math.min(numberWidthClasses.length - 1, Math.max(0, String(maxNumber).length - 2))
    ] ?? 'w-[4ch]';
  const hasChanges = diff.hunks.length > 0;

  const segments: Segment[] = [
    ...diff.hunks.map((hunk, index) => ({ kind: 'hunk' as const, index, start: hunk.start })),
    ...diff.gaps.map((gap, index) => ({ kind: 'gap' as const, index, start: gap.start })),
  ].sort((a, b) => a.start - b.start);

  const indices = (start: number, end: number) =>
    Array.from({ length: end - start }, (_, offset) => start + offset);

  const renderUnified = (lineIndices: readonly number[]) =>
    lineIndices.map((index) => {
      const shown = shownLine(index);
      return (
        <div key={index} className={cn('flex', lineClasses[shown.line.type])}>
          <LineNumber number={shown.line.beforeNumber} widthClass={widthClass} />
          <LineNumber number={shown.line.afterNumber} widthClass={widthClass} />
          <LineSign type={shown.line.type} messages={messages} />
          <LineContent shown={shown} />
        </div>
      );
    });

  const renderSplitCell = (index: number | undefined, side: 'before' | 'after') => {
    if (index === undefined) {
      return <div className="min-w-0 bg-surface-2" />;
    }
    const shown = shownLine(index);
    return (
      <div className={cn('flex min-w-0', lineClasses[shown.line.type])}>
        <LineNumber
          number={side === 'before' ? shown.line.beforeNumber : shown.line.afterNumber}
          widthClass={widthClass}
        />
        <LineSign type={shown.line.type} messages={messages} />
        <LineContent shown={shown} className="whitespace-pre-wrap [overflow-wrap:anywhere]" />
      </div>
    );
  };

  const renderSplit = (lineIndices: readonly number[]) => {
    const rows: ReactNode[] = [];
    // A change's removed lines sit beside its added lines, pair by pair.
    let removed: number[] = [];
    let added: number[] = [];
    const flush = () => {
      for (let pair = 0; pair < Math.max(removed.length, added.length); pair++) {
        rows.push(
          <div
            key={removed[pair] ?? added[pair]}
            className="grid grid-cols-2 divide-x divide-border"
          >
            {renderSplitCell(removed[pair], 'before')}
            {renderSplitCell(added[pair], 'after')}
          </div>,
        );
      }
      removed = [];
      added = [];
    };
    for (const index of lineIndices) {
      const type = diff.lines[index]?.type;
      if (type === 'removed') {
        removed.push(index);
      } else if (type === 'added') {
        added.push(index);
      } else {
        flush();
        rows.push(
          <div key={index} className="grid grid-cols-2 divide-x divide-border">
            {renderSplitCell(index, 'before')}
            {renderSplitCell(index, 'after')}
          </div>,
        );
      }
    }
    flush();
    return rows;
  };

  const renderLines = (lineIndices: readonly number[]) =>
    layout === 'split' ? renderSplit(lineIndices) : renderUnified(lineIndices);

  const summary = hasChanges
    ? messages.diffSummary({ added: diff.added, removed: diff.removed, hunks: diff.hunks.length })
    : messages.noDifferences;
  const summaryLabel = hasChanges
    ? messages.diffSummaryLabel({
        added: diff.added,
        removed: diff.removed,
        hunks: diff.hunks.length,
      })
    : messages.noDifferences;

  return (
    <figure
      ref={ref}
      aria-label={ariaLabel ?? messages.diffLabel({ before: oldLabel, after: newLabel })}
      className={cn(
        'relative m-0 flex min-w-0 max-w-full flex-col overflow-hidden rounded-control border border-border bg-code-bg text-code-fg',
        className,
      )}
    >
      <div
        ref={measureRef}
        className="flex min-h-10 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border ps-3 pe-1 py-1"
      >
        <span role="status" className="font-mono text-sm font-medium text-fg">
          <span aria-hidden="true">{summary}</span>
          <span className="sr-only">{summaryLabel}</span>
        </span>
        {layout === 'unified' && (
          <span className="flex min-w-0 flex-wrap gap-x-3 font-mono text-xs text-fg-muted">
            <span>
              <span aria-hidden="true" className="text-danger-fg">
                −{' '}
              </span>
              {oldLabel}
            </span>
            <span>
              <span aria-hidden="true" className="text-success-fg">
                +{' '}
              </span>
              {newLabel}
            </span>
          </span>
        )}
        {diff.hunks.length > 1 && (
          <span className="ms-auto flex items-center gap-1">
            <Tooltip content={messages.previousHunk}>
              <IconButton
                icon={ChevronUp}
                size="sm"
                aria-label={messages.previousHunk}
                isDisabled={currentHunk <= 0}
                onPress={() => {
                  goToHunk(currentHunk - 1);
                }}
              />
            </Tooltip>
            <Tooltip content={messages.nextHunk}>
              <IconButton
                icon={ChevronDown}
                size="sm"
                aria-label={messages.nextHunk}
                isDisabled={currentHunk >= diff.hunks.length - 1}
                onPress={() => {
                  goToHunk(currentHunk + 1);
                }}
              />
            </Tooltip>
          </span>
        )}
        <span className="sr-only" aria-live="polite">
          {announcement}
        </span>
      </div>
      {prepared.isFallback && (
        <p className="border-b border-border px-3 py-2 text-sm text-warning-fg bg-warning-bg">
          {messages.structuralFallback}
        </p>
      )}
      {layout === 'split' && (
        <div
          aria-hidden="true"
          className="grid grid-cols-2 divide-x divide-border border-b border-border font-mono text-xs text-fg-muted"
        >
          <span className="truncate px-3 py-1">
            <span className="text-danger-fg">− </span>
            {oldLabel}
          </span>
          <span className="truncate px-3 py-1">
            <span className="text-success-fg">+ </span>
            {newLabel}
          </span>
        </div>
      )}
      <div
        ref={scrollRef}
        // A scrollable area must be focusable so keyboard users can scroll it (WCAG 2.1.1); the figure names it.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={isScrollable ? 0 : undefined}
        // Dynamic geometry: the app's maximum height.
        // eslint-disable-next-line no-restricted-syntax
        style={maxHeight === undefined ? undefined : { maxHeight }}
        className="relative min-h-0 overflow-auto outline-none focus-visible:focus-ring"
      >
        <div
          className={cn(
            'py-1 font-mono text-xs leading-relaxed sm:text-sm',
            layout === 'unified' ? 'w-max min-w-full whitespace-pre' : 'w-full',
          )}
        >
          {segments.map((segment) => {
            if (segment.kind === 'hunk') {
              const hunk = diff.hunks[segment.index];
              if (!hunk) {
                return null;
              }
              const isCurrent = segment.index === currentHunk;
              return (
                <Fragment key={`hunk-${segment.index}`}>
                  <div
                    ref={(element) => {
                      if (element) {
                        hunkRefs.current.set(segment.index, element);
                      } else {
                        hunkRefs.current.delete(segment.index);
                      }
                    }}
                    data-hunk={segment.index}
                    data-current={isCurrent || undefined}
                    className={cn(
                      'border-y border-border px-3 py-0.5',
                      isCurrent ? 'bg-accent-bg text-accent-fg' : 'bg-surface-2 text-fg-muted',
                    )}
                  >
                    <span className="sr-only">
                      {messages.hunkPosition({
                        index: segment.index + 1,
                        total: diff.hunks.length,
                      })}{' '}
                    </span>
                    {messages.hunkRange(hunk)}
                  </div>
                  {renderLines(indices(hunk.start, hunk.end))}
                </Fragment>
              );
            }
            const gap = diff.gaps[segment.index];
            if (!gap) {
              return null;
            }
            const count = gap.end - gap.start;
            const isExpanded = expanded.has(gap.start);
            return (
              <Fragment key={`gap-${gap.start}`}>
                <AriaButton
                  data-gap={gap.start}
                  aria-expanded={isExpanded}
                  onPress={() => {
                    const next = new Set(expanded);
                    if (isExpanded) {
                      next.delete(gap.start);
                    } else {
                      next.add(gap.start);
                    }
                    setExpanded(next);
                  }}
                  className={cn(
                    'hit-area flex w-full cursor-pointer items-center gap-2 bg-surface-2 px-3 py-1 font-sans text-xs text-accent-fg',
                    'data-hovered:underline data-focus-visible:focus-ring',
                  )}
                >
                  <ChevronsUpDown aria-hidden="true" className="size-4 shrink-0" />
                  {isExpanded
                    ? messages.hideUnchangedLines({ count })
                    : messages.showUnchangedLines({ count })}
                </AriaButton>
                {isExpanded && renderLines(indices(gap.start, gap.end))}
              </Fragment>
            );
          })}
        </div>
      </div>
    </figure>
  );
}
