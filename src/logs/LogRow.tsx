// One LogViewer row: time, level badge, source and the message (ANSI colours as theme tokens, search matches
// marked), with an expandable panel of structured fields.

import { ChevronRight } from 'lucide-react';
import { memo, useId, type ReactNode } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import { Badge } from '../components/Badge/Badge';
import {
  DescriptionList,
  type DescriptionItem,
} from '../components/DescriptionList/DescriptionList';
import { cn } from '../utils/cn';
import type { AnsiColor, AnsiSegment } from './ansi';
import { fieldText, levelTones, lineSegments, type LogLevel, type LogLine } from './format';
import type { LogStrings } from './messages';

const colorClasses: Record<AnsiColor, string> = {
  black: 'text-fg-muted',
  red: 'text-danger-fg',
  green: 'text-success-fg',
  yellow: 'text-warning-fg',
  blue: 'text-accent-fg',
  magenta: 'text-code-keyword',
  cyan: 'text-info-fg',
  white: 'text-fg',
};

const backgroundClasses: Record<AnsiColor, string> = {
  black: 'bg-surface-3',
  red: 'bg-danger-bg',
  green: 'bg-success-bg',
  yellow: 'bg-warning-bg',
  blue: 'bg-accent-bg',
  magenta: 'bg-surface-3',
  cyan: 'bg-info-bg',
  white: 'bg-surface-2',
};

function segmentClasses(segment: AnsiSegment): string | undefined {
  if (segment.isInverse) {
    return cn('bg-fg text-fg-inverse', segment.isBold && 'font-bold');
  }
  const classes = cn(
    segment.color !== undefined && colorClasses[segment.color],
    segment.background !== undefined && backgroundClasses[segment.background],
    segment.isBold && 'font-bold',
    segment.isDim && 'text-fg-muted',
    segment.isItalic && 'italic',
    segment.isUnderline && 'underline',
  );
  return classes === '' ? undefined : classes;
}

export function levelLabel(level: LogLevel, messages: LogStrings): string {
  switch (level) {
    case 'trace':
      return messages.logLevelTrace;
    case 'debug':
      return messages.logLevelDebug;
    case 'info':
      return messages.logLevelInfo;
    case 'warn':
      return messages.logLevelWarn;
    case 'error':
      return messages.logLevelError;
    case 'fatal':
      return messages.logLevelFatal;
  }
}

/** The message's segments, split at search matches so each match is wrapped in a `<mark>`. */
function renderMessage(
  segments: readonly AnsiSegment[],
  matches: readonly [number, number][],
  currentMatch: number,
): ReactNode[] {
  const nodes: ReactNode[] = [];
  let offset = 0;
  let matchIndex = 0;
  segments.forEach((segment, segmentIndex) => {
    const className = segmentClasses(segment);
    const end = offset + segment.text.length;
    let cursor = offset;
    while (cursor < end) {
      // Skip matches that ended before this point.
      while (matchIndex < matches.length && (matches[matchIndex]?.[1] ?? 0) <= cursor) {
        matchIndex += 1;
      }
      const match = matches[matchIndex];
      const key = `${String(segmentIndex)}-${String(cursor)}`;
      if (!match || match[0] >= end) {
        nodes.push(
          <span key={key} className={className}>
            {segment.text.slice(cursor - offset)}
          </span>,
        );
        cursor = end;
      } else if (match[0] > cursor) {
        nodes.push(
          <span key={key} className={className}>
            {segment.text.slice(cursor - offset, match[0] - offset)}
          </span>,
        );
        cursor = match[0];
      } else {
        const stop = Math.min(match[1], end);
        const isCurrent = matchIndex === currentMatch;
        nodes.push(
          <mark
            key={key}
            data-current={isCurrent || undefined}
            className={cn(
              'rounded-xs text-fg',
              isCurrent
                ? 'bg-warning-solid text-warning-on-solid outline-2 outline-warning-border'
                : 'bg-warning-bg',
            )}
          >
            <span className={isCurrent ? undefined : className}>
              {segment.text.slice(cursor - offset, stop - offset)}
            </span>
          </mark>,
        );
        cursor = stop;
      }
    }
    offset = end;
  });
  return nodes;
}

export interface LogRowProps {
  line: LogLine;
  index: number;
  /** The displayed time, or '' when the line has none. */
  time: string;
  dateTime: string | undefined;
  isWrapped: boolean;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  matches: readonly [number, number][];
  /** Which of this row's matches is the current one, or -1. */
  currentMatch: number;
  messages: LogStrings;
  measureRef: (element: HTMLElement | null) => void;
}

export const LogRow = memo(function LogRow({
  line,
  index,
  time,
  dateTime,
  isWrapped,
  isExpanded,
  onToggle,
  matches,
  currentMatch,
  messages,
  measureRef,
}: LogRowProps) {
  const fieldsId = useId();
  const messageId = useId();
  const fields = line.fields;
  const hasFields = fields !== undefined && Object.keys(fields).length > 0;
  const level = line.level;
  const items: DescriptionItem[] =
    hasFields && isExpanded
      ? Object.entries(fields).map(([key, value]) => ({
          id: key,
          label: key,
          value: fieldText(value),
        }))
      : [];

  return (
    <div
      ref={measureRef}
      data-index={index}
      data-log-row=""
      data-level={level}
      className={cn(
        'border-s-2',
        level === 'error' || level === 'fatal'
          ? 'border-danger-border'
          : level === 'warn'
            ? 'border-warning-border'
            : 'border-transparent',
        currentMatch >= 0 && 'bg-surface-2',
      )}
    >
      <div
        className={cn(
          'flex items-start gap-2 py-0.5 ps-1 pe-3 leading-5',
          isWrapped ? 'whitespace-pre-wrap' : 'whitespace-pre',
        )}
      >
        <span className="flex size-5 shrink-0 items-center justify-center select-none">
          {hasFields && (
            <AriaButton
              aria-label={messages.logShowFields}
              aria-describedby={messageId}
              aria-expanded={isExpanded}
              aria-controls={isExpanded ? fieldsId : undefined}
              onPress={() => {
                onToggle(line.id);
              }}
              className="hit-area relative inline-flex size-5 cursor-pointer items-center justify-center rounded-control text-fg-muted outline-none data-focus-visible:focus-ring data-hovered:bg-surface-3 data-hovered:text-fg"
            >
              <ChevronRight
                aria-hidden="true"
                className={cn('size-3.5 transition-transform', isExpanded && 'rotate-90')}
              />
            </AriaButton>
          )}
        </span>
        {time !== '' && (
          <time dateTime={dateTime} className="shrink-0 text-fg-muted tabular-nums">
            {time}
          </time>
        )}
        {level !== undefined && (
          <Badge
            tone={levelTones[level].tone}
            variant={levelTones[level].variant}
            className="h-5 w-14 justify-center font-mono"
          >
            {levelLabel(level, messages)}
          </Badge>
        )}
        {line.source !== undefined && line.source !== '' && (
          <span className="shrink-0 text-info-fg">{line.source}</span>
        )}
        <span
          id={messageId}
          className={cn('text-fg', isWrapped ? 'min-w-0 flex-1 [overflow-wrap:anywhere]' : '')}
        >
          {renderMessage(lineSegments(line), matches, currentMatch)}
        </span>
      </div>
      {hasFields && isExpanded && (
        <div id={fieldsId} className="ms-7 me-3 mb-2 rounded-control bg-surface-2 p-3 font-sans">
          <DescriptionList items={items} columns={2} />
        </div>
      )}
    </div>
  );
});
