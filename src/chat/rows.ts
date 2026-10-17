// MessageList's rows: messages, grouped by author, with day separators and a "New messages" divider. Pure, so it's
// unit-tested on its own.
import type { ChatMessage } from './types';

/** Messages from one author within this many milliseconds of the previous one share a header. */
export const GROUP_WINDOW_MS = 5 * 60_000;

export type ChatRow =
  | { kind: 'older'; key: string }
  | { kind: 'day'; key: string; day: string; date: Date }
  | { kind: 'unread'; key: string }
  | {
      kind: 'message';
      key: string;
      message: ChatMessage;
      date: Date;
      /** The first message of a group (shows the avatar, name and time). */
      isGroupStart: boolean;
      /** The last message of a group. */
      isGroupEnd: boolean;
    };

export function toDate(at: Date | number | string): Date {
  return at instanceof Date ? at : new Date(at);
}

const dayFormatters = new Map<string, Intl.DateTimeFormat>();

/** The calendar day of `date` in `timeZone`, as `YYYY-MM-DD`. */
export function dayKey(date: Date, timeZone: string): string {
  let formatter = dayFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    dayFormatters.set(timeZone, formatter);
  }
  const parts = formatter.formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** Whole days from day `from` to day `to` (both `YYYY-MM-DD`). */
export function daysBetween(from: string, to: string): number {
  const utc = (key: string) => {
    const [year = 0, month = 1, day = 1] = key.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((utc(to) - utc(from)) / 86_400_000);
}

export interface BuildRowsOptions {
  timeZone: string;
  firstUnreadId?: string;
  hasOlder?: boolean;
  groupWindowMs?: number;
}

/** The list's rows, oldest first. */
export function buildRows(
  messages: readonly ChatMessage[],
  { timeZone, firstUnreadId, hasOlder = false, groupWindowMs = GROUP_WINDOW_MS }: BuildRowsOptions,
): ChatRow[] {
  const rows: ChatRow[] = [];
  if (hasOlder) {
    rows.push({ kind: 'older', key: 'chat-older' });
  }
  let previous: { message: ChatMessage; date: Date; day: string } | undefined;
  let lastMessageRow: Extract<ChatRow, { kind: 'message' }> | undefined;
  for (const message of messages) {
    const date = toDate(message.at);
    const day = dayKey(date, timeZone);
    const isNewDay = previous?.day !== day;
    if (isNewDay) {
      rows.push({ kind: 'day', key: `chat-day-${day}`, day, date });
    }
    const isUnread = message.id === firstUnreadId;
    if (isUnread) {
      rows.push({ kind: 'unread', key: 'chat-unread' });
    }
    const continues =
      previous !== undefined &&
      !isNewDay &&
      !isUnread &&
      !message.isSystem &&
      !previous.message.isSystem &&
      previous.message.author.id === message.author.id &&
      date.getTime() - previous.date.getTime() <= groupWindowMs &&
      date.getTime() >= previous.date.getTime();
    if (!continues && lastMessageRow) {
      lastMessageRow.isGroupEnd = true;
    }
    lastMessageRow = {
      kind: 'message',
      key: message.id,
      message,
      date,
      isGroupStart: !continues,
      isGroupEnd: false,
    };
    rows.push(lastMessageRow);
    previous = { message, date, day };
  }
  if (lastMessageRow) {
    lastMessageRow.isGroupEnd = true;
  }
  return rows;
}

/** A string body as plain text for announcements: Markdown markers dropped, whitespace collapsed, kept short. */
export function plainExcerpt(text: string, max = 200): string {
  const plain = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_~`>#]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > max ? `${plain.slice(0, max - 1).trimEnd()}…` : plain;
}
