// Fuzzy matching for CommandPalette: each word of the query must match the label (in order, as a word start, a
// substring, or scattered letters) or, failing that, the keywords. Better matches score higher.

export interface FuzzyMatch {
  /** Higher is better. */
  score: number;
  /** The label's matched character positions, for highlighting (empty when only keywords matched). */
  indexes: number[];
}

function isWordStart(text: string, index: number): boolean {
  if (index === 0) {
    return true;
  }
  const previous = text.charAt(index - 1);
  const current = text.charAt(index);
  // After a non-letter or digit, or a camelCase hump ("useState" → "S").
  return (
    !/[\p{L}\p{N}]/u.test(previous) ||
    (previous === previous.toLowerCase() && current !== current.toLowerCase())
  );
}

function range(from: number, length: number): number[] {
  return Array.from({ length }, (_, offset) => from + offset);
}

/** The best place for one query word in `text` (already lower-cased in `lower`), at or after `from`. */
function matchWord(
  text: string,
  lower: string,
  word: string,
  from: number,
): { score: number; indexes: number[]; end: number } | null {
  let substring = -1;
  for (let at = lower.indexOf(word, from); at >= 0; at = lower.indexOf(word, at + 1)) {
    if (isWordStart(text, at)) {
      const bonus = at === 0 ? 2 : 0;
      return {
        score: word.length * 3 + bonus,
        indexes: range(at, word.length),
        end: at + word.length,
      };
    }
    if (substring < 0) {
      substring = at;
    }
  }
  if (substring >= 0) {
    return {
      score: word.length * 2,
      indexes: range(substring, word.length),
      end: substring + word.length,
    };
  }
  // Scattered letters, in order; spread-out matches score lower.
  const indexes: number[] = [];
  let at = from;
  for (const char of word) {
    const found = lower.indexOf(char, at);
    if (found < 0) {
      return null;
    }
    indexes.push(found);
    at = found + 1;
  }
  const first = indexes[0] ?? from;
  const spread = at - first - word.length;
  const starts = indexes.filter((index) => isWordStart(text, index)).length;
  return { score: Math.max(0.5, word.length + starts - spread * 0.1), indexes, end: at };
}

/** The query's words, lower-cased. */
export function queryWords(query: string): string[] {
  return query.toLowerCase().trim().split(/\s+/).filter(Boolean);
}

/**
 * Matches `query` against a label and its keywords, or returns null. An empty query matches everything with a
 * score of 0. Words matched in order in the label score highest; words matched in any order, or in the keywords,
 * score lower.
 */
export function fuzzyMatch(
  query: string,
  label: string,
  keywords: readonly string[] = [],
): FuzzyMatch | null {
  const words = queryWords(query);
  if (words.length === 0) {
    return { score: 0, indexes: [] };
  }
  const lower = label.toLowerCase();

  // In order, through the label.
  let from = 0;
  let score = 0;
  const indexes: number[] = [];
  const isInOrder = words.every((word) => {
    const match = matchWord(label, lower, word, from);
    if (!match) {
      return false;
    }
    score += match.score;
    indexes.push(...match.indexes);
    from = match.end;
    return true;
  });
  if (isInOrder) {
    // Shorter labels win ties.
    return { score: score - label.length * 0.01, indexes };
  }

  // In any order, each word in the label (on letters no other word took) or a keyword.
  const lowerKeywords = keywords.map((keyword) => keyword.toLowerCase());
  let anyScore = 0;
  const anyIndexes = new Set<number>();
  for (const word of words) {
    let inLabel = matchWord(label, lower, word, 0);
    while (inLabel?.indexes.some((index) => anyIndexes.has(index))) {
      inLabel = matchWord(label, lower, word, (inLabel.indexes[0] ?? label.length) + 1);
    }
    if (inLabel) {
      anyScore += inLabel.score * 0.6;
      inLabel.indexes.forEach((index) => anyIndexes.add(index));
      continue;
    }
    const keyword = lowerKeywords.find((entry) => entry.includes(word));
    if (keyword === undefined) {
      return null;
    }
    anyScore += keyword.startsWith(word) ? word.length * 1.5 : word.length;
  }
  return {
    score: anyScore - label.length * 0.01,
    indexes: [...anyIndexes].sort((a, b) => a - b),
  };
}
