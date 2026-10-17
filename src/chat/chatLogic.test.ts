import { describe, expect, it } from 'vitest';
import {
  commandIn,
  findSuggestionTrigger,
  insertAt,
  insertToken,
  matchCommands,
  mentionedIds,
} from './composerText';
import {
  emojiKey,
  normalizeEmojiData,
  searchEmoji,
  withSkinTone,
  type EmojiSourceEntry,
} from './emojiData';
import { moveInSections } from './EmojiPicker';
import { buildRows, dayKey, daysBetween, plainExcerpt } from './rows';
import type { ChatMessage } from './types';

const MINUTE = 60_000;
const base = Date.UTC(2026, 9, 16, 9, 0, 0);
const ada = { id: 'ada', name: 'Ada' };
const grace = { id: 'grace', name: 'Grace' };

function message(
  id: string,
  author: typeof ada,
  minutes: number,
  extra: Partial<ChatMessage> = {},
) {
  return { id, author, at: base + minutes * MINUTE, body: id, ...extra } satisfies ChatMessage;
}

describe('buildRows', () => {
  it('groups by author within five minutes, with day separators and the unread divider', () => {
    const rows = buildRows(
      [
        message('a', ada, -24 * 60),
        message('b', ada, 0),
        message('c', ada, 4),
        message('d', ada, 10),
        message('e', grace, 11),
        message('f', grace, 12),
        message('g', grace, 13, { isSystem: true }),
        message('h', grace, 14),
      ],
      { timeZone: 'UTC', firstUnreadId: 'f', hasOlder: true },
    );
    expect(rows.map((row) => row.kind)).toEqual([
      'older',
      'day',
      'message',
      'day',
      'message',
      'message',
      'message',
      'message',
      'unread',
      'message',
      'message',
      'message',
    ]);
    const starts = rows.flatMap((row) =>
      row.kind === 'message'
        ? [`${row.key}:${row.isGroupStart ? 'S' : '-'}${row.isGroupEnd ? 'E' : '-'}`]
        : [],
    );
    // b and c group; d is too late; e starts Grace's group; the divider breaks it before f; system messages stand alone.
    expect(starts).toEqual(['a:SE', 'b:S-', 'c:-E', 'd:SE', 'e:SE', 'f:SE', 'g:SE', 'h:SE']);
  });

  it('reads days in the time zone', () => {
    const late = new Date(Date.UTC(2026, 9, 16, 23, 30));
    expect(dayKey(late, 'UTC')).toBe('2026-10-16');
    expect(dayKey(late, 'Asia/Tokyo')).toBe('2026-10-17');
    expect(daysBetween('2026-10-15', '2026-10-16')).toBe(1);
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1);
  });

  it('makes plain excerpts of Markdown', () => {
    expect(plainExcerpt('**Bold** and [a link](https://example.com)\n\n`code`')).toBe(
      'Bold and a link code',
    );
    expect(plainExcerpt('x'.repeat(300), 10)).toBe(`${'x'.repeat(9)}…`);
  });
});

describe('composer text', () => {
  it('finds mentions and commands at the caret', () => {
    expect(findSuggestionTrigger('Hi @ad', 6)).toEqual({ kind: 'mention', start: 3, query: 'ad' });
    expect(findSuggestionTrigger('@', 1)).toEqual({ kind: 'mention', start: 0, query: '' });
    expect(findSuggestionTrigger('mail@example', 12)).toBeNull();
    expect(findSuggestionTrigger('/we', 3)).toEqual({ kind: 'command', start: 0, query: 'we' });
    expect(findSuggestionTrigger('a /we', 5)).toBeNull();
    expect(findSuggestionTrigger('Hi @ad there', 12)).toBeNull();
  });

  it('inserts tokens and reports mentions and commands', () => {
    const trigger = { kind: 'mention' as const, start: 3, query: 'ad' };
    expect(insertToken('Hi @ad', trigger, '@Ada')).toEqual({ text: 'Hi @Ada ', caret: 8 });
    expect(insertToken('Hi @ad tonight', trigger, '@Ada')).toEqual({
      text: 'Hi @Ada tonight',
      caret: 8,
    });
    expect(insertAt('ab', 1, 1, '🔭')).toEqual({ text: 'a🔭b', caret: 3 });
    const chosen = [
      { id: 'ada', label: 'Ada' },
      { id: 'grace', label: 'Grace' },
      { id: 'ada', label: 'Ada' },
    ];
    expect(mentionedIds('@Ada and @Ada', chosen)).toEqual(['ada']);
    const commands = [
      { id: 'w', label: 'weather' },
      { id: 'p', label: 'poll' },
    ];
    expect(commandIn('/poll Which target?', commands)).toBe('p');
    expect(commandIn('/pollx', commands)).toBeUndefined();
    expect(matchCommands(commands, 'l').map((command) => command.id)).toEqual(['p']);
    expect(matchCommands(commands, 'P').map((command) => command.id)).toEqual(['p']);
  });
});

describe('emoji data', () => {
  const source: EmojiSourceEntry[] = [
    {
      unicode: '👍',
      label: 'thumbs up',
      hexcode: '1F44D',
      group: 1,
      tags: ['+1', 'thumb', 'yes'],
      skins: [
        { unicode: '👍🏻', hexcode: '1F44D-1F3FB' },
        { unicode: '👍🏼', hexcode: '1F44D-1F3FC' },
        { unicode: '👍🏽', hexcode: '1F44D-1F3FD' },
        { unicode: '👍🏾', hexcode: '1F44D-1F3FE' },
        { unicode: '👍🏿', hexcode: '1F44D-1F3FF' },
      ],
    },
    { unicode: '👎', label: 'thumbs down', hexcode: '1F44E', group: 1, tags: ['thumb'] },
    { unicode: '❤️', label: 'red heart', hexcode: '2764-FE0F', group: 8, tags: ['heart'] },
    { unicode: '🏻', label: 'light skin tone', hexcode: '1F3FB', group: 2 },
    { unicode: '🇦', label: 'regional indicator A', hexcode: '1F1E6' },
  ];
  const data = normalizeEmojiData(source);

  it('drops components and ungrouped entries and indexes skins', () => {
    expect(data.entries.map((entry) => entry.emoji)).toEqual(['👍', '👎', '❤️']);
    expect(data.byEmoji.get(emojiKey('👍🏽'))?.label).toBe('thumbs up');
    expect(data.byEmoji.get(emojiKey('❤'))?.label).toBe('red heart');
  });

  it('applies skin tones', () => {
    const thumbs = data.entries[0];
    expect(thumbs && withSkinTone(thumbs, 1)).toBe('👍');
    expect(thumbs && withSkinTone(thumbs, 4)).toBe('👍🏽');
    const heart = data.entries[2];
    expect(heart && withSkinTone(heart, 6)).toBe('❤️');
  });

  it('searches names and keywords by word prefix', () => {
    expect(searchEmoji(data, 'thumb').map((entry) => entry.emoji)).toEqual(['👍', '👎']);
    expect(searchEmoji(data, 'thumbs d').map((entry) => entry.emoji)).toEqual(['👎']);
    expect(searchEmoji(data, 'heart').map((entry) => entry.emoji)).toEqual(['❤️']);
    expect(searchEmoji(data, '   ')).toEqual([]);
  });
});

describe('emoji grid navigation', () => {
  // Two sections: 10 cells (rows of 8 and 2), then 3 cells.
  const sizes = [10, 0, 3];
  it('moves by cell and row and crosses sections', () => {
    expect(moveInSections(sizes, 0, 'ArrowRight')).toBe(1);
    expect(moveInSections(sizes, 0, 'ArrowLeft')).toBe(0);
    expect(moveInSections(sizes, 1, 'ArrowDown')).toBe(9);
    expect(moveInSections(sizes, 5, 'ArrowDown')).toBe(9);
    expect(moveInSections(sizes, 9, 'ArrowDown')).toBe(11);
    expect(moveInSections(sizes, 8, 'ArrowDown')).toBe(10);
    expect(moveInSections(sizes, 12, 'ArrowDown')).toBeUndefined();
    expect(moveInSections(sizes, 12, 'ArrowUp')).toBe(9);
    expect(moveInSections(sizes, 10, 'ArrowUp')).toBe(8);
    expect(moveInSections(sizes, 9, 'ArrowUp')).toBe(1);
    expect(moveInSections(sizes, 3, 'Home')).toBe(0);
    expect(moveInSections(sizes, 3, 'End')).toBe(7);
    expect(moveInSections(sizes, 8, 'End')).toBe(9);
    expect(moveInSections(sizes, 3, 'End', true)).toBe(12);
  });
});
