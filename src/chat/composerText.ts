// The Composer's text helpers: finding an @-mention or /command being typed at the caret, inserting the chosen
// token, and reading back which mentions and command a message holds. Pure, so they're unit-tested on their own.
import { clamp } from '../utils/math';
import type { ChatCommand, ChatMention } from './types';

/** An @-mention or /command being typed: where its trigger character is and what follows it up to the caret. */
export interface SuggestionTrigger {
  kind: 'mention' | 'command';
  /** Index of the `@` or `/`. */
  start: number;
  query: string;
}

/** The mention or command being typed at `caret`, if any. A command only counts at the very start of the text. */
export function findSuggestionTrigger(text: string, caret: number): SuggestionTrigger | null {
  const before = text.slice(0, caret);
  const command = /^\/([\w-]*)$/.exec(before);
  if (command) {
    return { kind: 'command', start: 0, query: command[1] ?? '' };
  }
  const mention = /(?:^|\s)@([^\s@]*)$/.exec(before);
  if (mention) {
    const query = mention[1] ?? '';
    return { kind: 'mention', start: before.length - query.length - 1, query };
  }
  return null;
}

export function sameTrigger(a: SuggestionTrigger | null, b: SuggestionTrigger | null): boolean {
  return a?.kind === b?.kind && a?.start === b?.start && a?.query === b?.query;
}

/** Replaces the trigger and its query with `token` and a space; returns the new text and where the caret goes. */
export function insertToken(
  text: string,
  trigger: SuggestionTrigger,
  token: string,
): { text: string; caret: number } {
  const end = trigger.start + 1 + trigger.query.length;
  const rest = text.slice(end);
  const inserted = `${token} `;
  return {
    text: text.slice(0, trigger.start) + inserted + (rest.startsWith(' ') ? rest.slice(1) : rest),
    caret: trigger.start + inserted.length,
  };
}

/** Inserts `insert` over the selection `start`–`end`; returns the new text and the caret after it. */
export function insertAt(
  text: string,
  start: number,
  end: number,
  insert: string,
): { text: string; caret: number } {
  const from = Math.min(start, text.length);
  const to = clamp(end, from, text.length);
  return { text: text.slice(0, from) + insert + text.slice(to), caret: from + insert.length };
}

/** The ids of the chosen mentions whose `@label` is still in the text (each once, in order). */
export function mentionedIds(text: string, chosen: readonly ChatMention[]): string[] {
  const ids: string[] = [];
  for (const mention of chosen) {
    if (!ids.includes(mention.id) && text.includes(`@${mention.label}`)) {
      ids.push(mention.id);
    }
  }
  return ids;
}

/** The id of the command the text starts with ("/poll …"), if it's one of `commands`. */
export function commandIn(text: string, commands: readonly ChatCommand[]): string | undefined {
  const match = /^\/([\w-]+)(?:\s|$)/.exec(text);
  return match ? commands.find((command) => command.label === match[1])?.id : undefined;
}

/** Commands whose label starts with (then contains) the query, ignoring case. */
export function matchCommands(commands: readonly ChatCommand[], query: string): ChatCommand[] {
  const lower = query.toLowerCase();
  const starts = commands.filter((command) => command.label.toLowerCase().startsWith(lower));
  const contains = commands.filter(
    (command) =>
      !command.label.toLowerCase().startsWith(lower) && command.label.toLowerCase().includes(lower),
  );
  return [...starts, ...contains];
}
