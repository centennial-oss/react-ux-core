// LogViewer's data types and the plain-text forms of a line (for copying and downloading).
import { isValidDate } from '../utils/time';
import type { Tone } from '../utils/types';
import { parseAnsi, stripAnsi, type AnsiSegment } from './ansi';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/** Every level, least to most severe. */
export const LOG_LEVELS: readonly LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

export interface LogLine {
  /** Unique and stable: it keys the row and keeps the scroll position when older lines load. */
  id: string;
  /** When it was logged: a Date, epoch milliseconds or an ISO 8601 string. */
  at?: Date | number | string;
  level?: LogLevel;
  /** Plain text; ANSI colour codes are rendered as theme colours, never as HTML. */
  message: string;
  /** Structured fields, shown in an expandable row. */
  fields?: Readonly<Record<string, unknown>>;
  /** Where it came from, such as "camera-1" or "scheduler". */
  source?: string;
}

/** Badge tone and variant per level: the two most severe levels stand out as solid badges. */
export const levelTones: Record<LogLevel, { tone: Tone; variant: 'soft' | 'solid' }> = {
  trace: { tone: 'neutral', variant: 'soft' },
  debug: { tone: 'neutral', variant: 'soft' },
  info: { tone: 'accent', variant: 'soft' },
  warn: { tone: 'warning', variant: 'soft' },
  error: { tone: 'danger', variant: 'soft' },
  fatal: { tone: 'danger', variant: 'solid' },
};

/** Error and fatal lines are the ones "Announce errors" reads out. */
export function isErrorLevel(level: LogLevel | undefined): boolean {
  return level === 'error' || level === 'fatal';
}

// Parsing is cached per line object, so scrolling and searching don't re-parse lines that haven't changed.
const segmentCache = new WeakMap<LogLine, AnsiSegment[]>();
const plainCache = new WeakMap<LogLine, string>();

/** The line's message as styled segments. */
export function lineSegments(line: LogLine): AnsiSegment[] {
  let segments = segmentCache.get(line);
  if (!segments) {
    segments = parseAnsi(line.message);
    segmentCache.set(line, segments);
  }
  return segments;
}

/** The line's message without ANSI codes: what search matches against. */
export function linePlainText(line: LogLine): string {
  let text = plainCache.get(line);
  if (text === undefined) {
    text = stripAnsi(line.message);
    plainCache.set(line, text);
  }
  return text;
}

/** The line's instant, or null when it has none (or it doesn't parse). */
export function lineDate(line: LogLine): Date | null {
  if (line.at === undefined) {
    return null;
  }
  const date = line.at instanceof Date ? line.at : new Date(line.at);
  return isValidDate(date) ? date : null;
}

/** A field value as text: strings as they are, everything else as JSON. */
export function fieldText(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
    return '';
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  try {
    return JSON.stringify(value);
  } catch {
    // Circular structures can't be shown as JSON.
    return Object.prototype.toString.call(value);
  }
}

/**
 * One line as plain text: `time LEVEL source message`, then the fields as JSON. `formatTime` formats the instant
 * (downloads use ISO 8601, copies use the displayed time).
 */
export function logLineText(line: LogLine, formatTime: (date: Date) => string): string {
  const date = lineDate(line);
  const parts = [
    date ? formatTime(date) : '',
    line.level ? line.level.toUpperCase() : '',
    line.source ?? '',
    linePlainText(line),
  ].filter((part) => part !== '');
  const text = parts.join(' ');
  return line.fields && Object.keys(line.fields).length > 0
    ? `${text} ${fieldText(line.fields)}`
    : text;
}

/** Lines as the contents of a .log file, one per line, with ISO 8601 (UTC) timestamps. */
export function logFileText(lines: readonly LogLine[]): string {
  return `${lines.map((line) => logLineText(line, (date) => date.toISOString())).join('\n')}\n`;
}
