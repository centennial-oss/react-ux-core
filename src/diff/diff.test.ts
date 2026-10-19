import { describe, expect, it } from 'vitest';
import { observatoryLive, observatoryProposed, observatoryReordered } from '../../test/diff';
import {
  buildHunks,
  diffLines,
  diffSequences,
  diffWords,
  splitLines,
  structuralNormalize,
  wordDiffRanges,
} from './diff';
import { countPlan, isDestructivePlan, planDiffTexts, type PlannedChange } from './plan';

/** A small deterministic pseudo-random generator (a linear congruential one), for repeatable fuzzing. */
function generator(seed: number) {
  let state = seed;
  return (limit: number) => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state % limit;
  };
}

/** The length of a longest common subsequence, by dynamic programming: the reference for the diff's minimality. */
function lcsLength(a: readonly string[], b: readonly string[]): number {
  // One flat table of (a.length + 1) × (b.length + 1) cells.
  const width = b.length + 1;
  const table = new Array<number>((a.length + 1) * width).fill(0);
  const at = (i: number, j: number) => table[i * width + j] ?? 0;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      table[i * width + j] =
        a[i - 1] === b[j - 1] ? at(i - 1, j - 1) + 1 : Math.max(at(i - 1, j), at(i, j - 1));
    }
  }
  return at(a.length, b.length);
}

describe('diffSequences', () => {
  it('finds a shortest edit script that rebuilds both sides', () => {
    const random = generator(42);
    for (let round = 0; round < 300; round++) {
      const a = Array.from({ length: random(25) }, () => 'abcd'[random(4)] ?? 'a');
      const b = Array.from({ length: random(25) }, () => 'abcd'[random(4)] ?? 'a');
      const edits = diffSequences(a, b);
      expect(edits.filter((edit) => edit.type !== 'added').map((edit) => edit.item)).toEqual(a);
      expect(edits.filter((edit) => edit.type !== 'removed').map((edit) => edit.item)).toEqual(b);
      expect(edits.filter((edit) => edit.type === 'equal')).toHaveLength(lcsLength(a, b));
    }
  });

  it('handles empty sides', () => {
    expect(diffSequences([], [])).toEqual([]);
    expect(diffSequences(['a'], []).map((edit) => edit.type)).toEqual(['removed']);
    expect(diffSequences([], ['a', 'b']).map((edit) => edit.type)).toEqual(['added', 'added']);
  });
});

describe('diffLines', () => {
  it('numbers lines on each side and puts removals before additions', () => {
    expect(diffLines('a\nb\nc\n', 'a\nB\nc\nd\n')).toEqual([
      { type: 'equal', text: 'a', beforeNumber: 1, afterNumber: 1 },
      { type: 'removed', text: 'b', beforeNumber: 2 },
      { type: 'added', text: 'B', afterNumber: 2 },
      { type: 'equal', text: 'c', beforeNumber: 3, afterNumber: 3 },
      { type: 'added', text: 'd', afterNumber: 4 },
    ]);
  });

  it('treats a final newline and CRLF line breaks as plain line ends', () => {
    expect(splitLines('a\r\nb\r\n')).toEqual(['a', 'b']);
    expect(splitLines('')).toEqual([]);
    expect(diffLines('a\r\nb', 'a\nb\n').every((line) => line.type === 'equal')).toBe(true);
  });
});

describe('diffWords', () => {
  it('marks the changed words and keeps the rest', () => {
    expect(diffWords('"exposure": 60,', '"exposure": 90,')).toEqual([
      { type: 'equal', text: '"exposure": ' },
      { type: 'removed', text: '60' },
      { type: 'added', text: '90' },
      { type: 'equal', text: ',' },
    ]);
  });

  it('joins changes separated only by whitespace', () => {
    expect(diffWords('one two three', 'uno dos three')).toEqual([
      { type: 'removed', text: 'one two' },
      { type: 'added', text: 'uno dos' },
      { type: 'equal', text: ' three' },
    ]);
  });

  it('gives character ranges, or null when lines share too little', () => {
    expect(wordDiffRanges('filter: V', 'filter: R')).toEqual({ before: [[8, 9]], after: [[8, 9]] });
    expect(wordDiffRanges('telescope', 'camera array')).toBeNull();
  });
});

describe('structuralNormalize', () => {
  it('sorts keys recursively, so reordered keys compare equal', () => {
    expect(structuralNormalize('{"b":1,"a":{"d":2,"c":[3,1]}}')).toBe(
      '{\n  "a": {\n    "c": [\n      3,\n      1\n    ],\n    "d": 2\n  },\n  "b": 1\n}',
    );
    expect(structuralNormalize(observatoryProposed)).toBe(
      structuralNormalize(observatoryReordered),
    );
  });

  it('returns null for text it cannot parse, and takes another parser', () => {
    expect(structuralNormalize('{ nope')).toBeNull();
    expect(structuralNormalize('')).toBe('');
    const parseLines = (text: string) =>
      Object.fromEntries(text.split('\n').map((line) => line.split('='))) as Record<string, string>;
    expect(structuralNormalize('b=2\na=1', parseLines)).toBe('{\n  "a": "1",\n  "b": "2"\n}');
  });
});

describe('buildHunks', () => {
  it('makes three hunks of a 400-line config with three changes, collapsing the rest', () => {
    const layout = buildHunks(diffLines(observatoryLive, observatoryProposed), 3);
    expect(splitLines(observatoryLive).length).toBeGreaterThanOrEqual(400);
    expect(layout.hunks).toHaveLength(3);
    expect(layout.added).toBe(4);
    expect(layout.removed).toBe(4);
    expect(layout.gaps).toHaveLength(4);
    const first = layout.hunks[0];
    expect(first && first.end - first.start).toBe(8);
    expect(first?.beforeCount).toBe(7);
    expect(first?.afterCount).toBe(7);
  });

  it('joins hunks separated by one unchanged line, and has none without changes', () => {
    const before = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'].join('\n');
    const after = ['A', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'I'].join('\n');
    expect(buildHunks(diffLines(before, after), 3).hunks).toHaveLength(1);
    const separate = buildHunks(diffLines(before, after), 2);
    expect(separate.hunks).toHaveLength(2);
    expect(separate.gaps).toEqual([{ start: 4, end: 7 }]);
    const same = buildHunks(diffLines(before, before), 3);
    expect(same.hunks).toEqual([]);
    expect(same.gaps).toEqual([{ start: 0, end: 9 }]);
  });

  it('gives a new file the header range of an empty side', () => {
    const [hunk] = buildHunks(diffLines('', 'a\nb'), 3).hunks;
    expect(hunk).toMatchObject({ beforeStart: 0, beforeCount: 0, afterStart: 1, afterCount: 2 });
  });
});

describe('plan helpers', () => {
  const text = {
    knownAfterApply: '(known after apply)',
    sensitiveValue: '(sensitive value)',
    sensitiveChanged: '(sensitive value, changed)',
  };

  it('counts actions and spots destructive plans', () => {
    const changes: PlannedChange[] = [
      { id: '1', address: 'a.one', type: 'a', action: 'create' },
      { id: '2', address: 'a.two', type: 'a', action: 'replace' },
      { id: '3', address: 'a.three', type: 'a', action: 'no-op' },
    ];
    expect(countPlan(changes)).toEqual({
      add: 1,
      change: 0,
      replace: 1,
      destroy: 0,
      read: 0,
      unchanged: 1,
    });
    expect(isDestructivePlan(changes)).toBe(true);
    expect(isDestructivePlan(changes.slice(0, 1))).toBe(false);
  });

  it('shows unknown values unquoted as "(known after apply)"', () => {
    const texts = planDiffTexts(
      {
        id: '1',
        address: 'storage_bucket.images',
        type: 'storage_bucket',
        action: 'create',
        after: { name: 'images', tags: { owner: 'ada' } },
        unknownAfter: ['id', 'tags.arn'],
      },
      text,
    );
    expect(texts.before).toBe('');
    expect(texts.after).toContain('"id": (known after apply)');
    expect(texts.after).toContain('"arn": (known after apply)');
  });

  it('masks sensitive values, marking the ones that change, until revealed', () => {
    const change: PlannedChange = {
      id: '1',
      address: 'database_user.reducer',
      type: 'database_user',
      action: 'update',
      before: { name: 'reducer', password: 'old' },
      after: { name: 'reducer', password: 'new' },
      isSensitive: true,
    };
    const masked = planDiffTexts(change, text);
    expect(masked.before).not.toContain('old');
    expect(masked.after).not.toContain('new');
    expect(masked.before).toContain('"password": (sensitive value)');
    expect(masked.after).toContain('"password": (sensitive value, changed)');
    expect(masked.after).toContain('"name": (sensitive value)');
    expect(planDiffTexts(change, text, { isRevealed: true }).after).toContain('"password": "new"');
  });
});
