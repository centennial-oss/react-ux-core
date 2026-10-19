// TagField's rules as plain functions: splitting typed text at delimiters, adding tags against the duplicate, limit
// and suggestion-list rules, and stable keys for tags that may repeat.

import { clamp } from '../../utils/math';
import { splitText } from '../../utils/text';

/** Why a tag wasn't added. */
export type TagRefusalReason = 'duplicate' | 'limit' | 'notInList';

export interface TagRefusal {
  tag: string;
  reason: TagRefusalReason;
}

export interface TagRules {
  allowsDuplicates: boolean;
  maxItems: number | undefined;
  /** Only these tags are accepted, by their lower-case text, and added as written here. */
  allowed: ReadonlyMap<string, string> | undefined;
}

export interface AddedTags {
  tags: string[];
  added: string[];
  refused: TagRefusal[];
}

/** Line breaks always end a pasted tag, whatever the delimiters. */
const LINE_BREAKS = ['\n', '\r'];

/** Pasted text as tags: split at the delimiters and line breaks, trimmed, blanks dropped. */
export function splitPasted(text: string, delimiters: readonly string[]): string[] {
  return splitText(text, [...delimiters, ...LINE_BREAKS]);
}

/**
 * Typed text split at its last delimiter: the finished tags before it, and the text after it (still being typed).
 * `null` when the text has no delimiter.
 */
export function splitTyped(
  text: string,
  delimiters: readonly string[],
): { finished: string[]; rest: string } | null {
  let cut = -1;
  let cutLength = 0;
  for (const delimiter of delimiters) {
    const at = delimiter === '' ? -1 : text.lastIndexOf(delimiter);
    if (at > cut) {
      cut = at;
      cutLength = delimiter.length;
    }
  }
  if (cut < 0) {
    return null;
  }
  return {
    finished: splitText(text.slice(0, cut), delimiters),
    rest: text.slice(cut + cutLength).trimStart(),
  };
}

/** The lower-case lookup `TagRules.allowed` expects. */
export function allowedTags(suggestions: readonly string[]): Map<string, string> {
  return new Map(suggestions.map((tag) => [tag.toLocaleLowerCase(), tag]));
}

/**
 * `tags` with `candidates` inserted at `index` (the end by default), in order, skipping each one the rules refuse:
 * one not in the allowed list, a duplicate (of a tag already there or added just before), or one past `maxItems`.
 */
export function addTags(
  tags: readonly string[],
  candidates: readonly string[],
  rules: TagRules,
  index = tags.length,
): AddedTags {
  const seen = new Set(tags);
  const added: string[] = [];
  const refused: TagRefusal[] = [];
  for (const candidate of candidates) {
    const tag = rules.allowed ? rules.allowed.get(candidate.toLocaleLowerCase()) : candidate;
    if (tag === undefined) {
      refused.push({ tag: candidate, reason: 'notInList' });
    } else if (!rules.allowsDuplicates && seen.has(tag)) {
      refused.push({ tag, reason: 'duplicate' });
    } else if (rules.maxItems !== undefined && tags.length + added.length >= rules.maxItems) {
      refused.push({ tag, reason: 'limit' });
    } else {
      added.push(tag);
      seen.add(tag);
    }
  }
  const at = clamp(index, 0, tags.length);
  return { tags: [...tags.slice(0, at), ...added, ...tags.slice(at)], added, refused };
}

/** A key for each tag that stays the same while tags move: the tag itself, or its text and count when it repeats. */
export function tagKeys(tags: readonly string[]): string[] {
  const counts = new Map<string, number>();
  return tags.map((tag) => {
    const count = counts.get(tag) ?? 0;
    counts.set(tag, count + 1);
    return count === 0 ? tag : `${tag}\u0000${String(count)}`;
  });
}
