// CodeBlock: a block of code (a JSON document, a configuration file, a shell session) with syntax colours, an
// optional title bar, copy and wrap buttons, line numbers and highlighted lines. Long lines scroll inside the block,
// never the page; the scroll area takes keyboard focus only when it actually scrolls.

import { Check, Copy, WrapText } from 'lucide-react';
import { useId, useMemo, useState, type ReactNode, type Ref } from 'react';
import { IconButton } from '../components/IconButton/IconButton';
import { LiveRegion } from '../components/LiveRegion/LiveRegion';
import { Tooltip } from '../components/Tooltip/Tooltip';
import { cn } from '../utils/cn';
import { useDeadlineTimer } from '../utils/timers';
import { useControllableState } from '../utils/useControllableState';
import { useIsOverflowing } from '../utils/useIsOverflowing';
import { useCodeMessages } from './messages';
import {
  highlightCode,
  type CodeHighlighter,
  type CodeLanguage,
  type CodeTokenType,
} from './tokenize';

const tokenClasses: Record<CodeTokenType, string | undefined> = {
  plain: undefined,
  keyword: 'text-code-keyword',
  string: 'text-code-string',
  number: 'text-code-number',
  comment: 'text-code-comment italic',
  punct: 'text-code-punct',
  property: 'text-code-property',
};

export interface CodeBlockProps {
  code: string;
  /** Defaults to `text` (no colours). */
  language?: CodeLanguage;
  /** A title bar, such as a file name ("mars.json"). It also names the block. */
  title?: ReactNode;
  /** Shows a copy-to-clipboard button. Defaults to true. */
  hasCopyButton?: boolean;
  /** Shows line numbers (hidden from screen readers). Defaults to false. */
  hasLineNumbers?: boolean;
  /** 1-based lines to highlight, such as the statement under discussion. */
  highlightedLines?: readonly number[];
  /** Wraps long lines instead of scrolling sideways. Controlled; the toolbar's toggle changes it. */
  isWrapped?: boolean;
  /** Whether lines wrap at first, uncontrolled. Defaults to false. */
  defaultWrapped?: boolean;
  onWrappedChange?: (isWrapped: boolean) => void;
  /** Shows the wrap toggle. Defaults to true. */
  hasWrapToggle?: boolean;
  /** Scrolls inside past this height, such as `24rem`. */
  maxHeight?: string;
  /** Replaces the built-in highlighter, for example with a fuller one. */
  highlight?: CodeHighlighter;
  /** Names the block when there's no `title`. */
  'aria-label'?: string;
  className?: string;
  ref?: Ref<HTMLElement>;
}

/** Code with syntax colours, copy and wrap, line numbers and highlighted lines, scrolling inside itself. */
export function CodeBlock({
  code,
  language = 'text',
  title,
  hasCopyButton = true,
  hasLineNumbers = false,
  highlightedLines = [],
  isWrapped: isWrappedProp,
  defaultWrapped = false,
  onWrappedChange,
  hasWrapToggle = true,
  maxHeight,
  highlight = highlightCode,
  'aria-label': ariaLabel,
  className,
  ref,
}: CodeBlockProps) {
  const messages = useCodeMessages();
  const titleId = useId();
  const [isWrapped, setWrapped] = useControllableState(
    isWrappedProp,
    defaultWrapped,
    onWrappedChange,
  );
  const lines = useMemo(() => highlight(code, language), [highlight, code, language]);
  const highlighted = useMemo(() => new Set(highlightedLines), [highlightedLines]);
  const digits = String(lines.length).length;

  // The scroll area takes focus only when it scrolls, so keyboard users can scroll it.
  const [scrollRef, isScrollable] = useIsOverflowing({ shouldObserveContent: true });

  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const resetCopy = useDeadlineTimer(() => {
    setCopyState('idle');
  });
  const copy = () => {
    navigator.clipboard.writeText(code).then(
      () => {
        setCopyState('copied');
        resetCopy.start(2000);
      },
      () => {
        setCopyState('failed');
        resetCopy.start(4000);
      },
    );
  };
  const copyLabel = copyState === 'copied' ? messages.copied : messages.copy;
  const hasToolbar = title !== undefined || hasCopyButton || hasWrapToggle;

  return (
    <figure
      ref={ref}
      aria-labelledby={title !== undefined ? titleId : undefined}
      aria-label={title === undefined ? ariaLabel : undefined}
      className={cn(
        'm-0 flex min-w-0 max-w-full flex-col overflow-hidden rounded-control border border-border bg-code-bg text-code-fg',
        className,
      )}
    >
      {hasToolbar && (
        <div className="flex min-h-10 items-center gap-1 border-b border-border ps-3 pe-1">
          <div id={titleId} className="min-w-0 flex-1 truncate font-mono text-xs text-fg-muted">
            {title}
          </div>
          {hasWrapToggle && (
            <Tooltip content={messages.wrapLines}>
              <IconButton
                icon={WrapText}
                size="sm"
                aria-label={messages.wrapLines}
                isSelected={isWrapped}
                onChange={setWrapped}
              />
            </Tooltip>
          )}
          {hasCopyButton && (
            <Tooltip content={copyLabel}>
              <IconButton
                icon={copyState === 'copied' ? Check : Copy}
                size="sm"
                aria-label={copyLabel}
                onPress={copy}
              />
            </Tooltip>
          )}
          <LiveRegion>
            {copyState === 'copied'
              ? messages.copied
              : copyState === 'failed'
                ? messages.codeCopyFailed
                : ''}
          </LiveRegion>
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
        className="min-h-0 overflow-auto outline-none focus-visible:focus-ring"
      >
        <pre
          // Prose styles plain <pre> elements; this one draws its own box.
          data-code-block=""
          className={cn(
            'm-0 py-2 font-mono text-xs leading-relaxed sm:text-sm',
            isWrapped
              ? 'whitespace-pre-wrap [overflow-wrap:anywhere]'
              : 'w-max min-w-full whitespace-pre',
          )}
        >
          <code>
            {lines.map((tokens, index) => {
              const number = index + 1;
              const isHighlighted = highlighted.has(number);
              return (
                <span
                  key={number}
                  className={cn(
                    'flex border-s-2 pe-3',
                    isHighlighted
                      ? 'border-code-highlight-border bg-code-highlight'
                      : 'border-transparent',
                  )}
                >
                  {hasLineNumbers && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        'shrink-0 ps-2 pe-3 text-end text-code-comment select-none',
                        digits <= 2 ? 'w-[4ch]' : digits === 3 ? 'w-[5ch]' : 'w-[6ch]',
                      )}
                    >
                      {number}
                    </span>
                  )}
                  <span className={cn('min-w-0 flex-1', !hasLineNumbers && 'ps-3')}>
                    {tokens.length === 0
                      ? '\n'
                      : tokens.map((token, tokenIndex) => (
                          <span key={tokenIndex} className={tokenClasses[token.type]}>
                            {token.text}
                          </span>
                        ))}
                  </span>
                </span>
              );
            })}
          </code>
        </pre>
      </div>
    </figure>
  );
}
