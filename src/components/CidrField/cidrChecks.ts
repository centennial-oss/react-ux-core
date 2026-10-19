// CidrList's checks: each entry parsed, and the duplicates and overlaps between entries, found with one sort and a
// sweep (blocks either nest or are disjoint, so every overlap is one block inside another).

import { splitText } from '../../utils/text';
import { compareCidrs, parseCidr, type Cidr, type CidrFamily, type CidrParseResult } from './cidr';

/** A problem one entry has with another. */
export interface CidrEntryIssue {
  /** `duplicate`: the same block; `coveredBy`: inside the other; `covers`: holds the other. */
  kind: 'duplicate' | 'coveredBy' | 'covers';
  /** The other entry's index and canonical text. */
  otherIndex: number;
  other: string;
}

export interface CidrEntryCheck {
  result: CidrParseResult;
  issues: CidrEntryIssue[];
}

export interface CidrListCheck {
  entries: CidrEntryCheck[];
  /** Pairs of entries where one block holds the other (duplicates not included). */
  overlapCount: number;
  /** Pairs of identical entries. */
  duplicateCount: number;
  invalidCount: number;
}

/** Parses every entry and finds duplicates and overlaps between the valid ones. */
export function checkCidrEntries(
  entries: readonly string[],
  family: CidrFamily = 'both',
  shouldCheckOverlaps = true,
): CidrListCheck {
  const checks: CidrEntryCheck[] = entries.map((entry) => ({
    result: parseCidr(entry, { family }),
    issues: [],
  }));
  let overlapCount = 0;
  let duplicateCount = 0;
  const invalidCount = checks.filter((check) => !check.result.isValid).length;
  if (!shouldCheckOverlaps) {
    return { entries: checks, overlapCount, duplicateCount, invalidCount };
  }

  const valid = checks
    .flatMap((check, index) => (check.result.isValid ? [{ index, cidr: check.result.cidr }] : []))
    .sort((a, b) => compareCidrs(a.cidr, b.cidr) || a.index - b.index);
  const addIssue = (index: number, issue: CidrEntryIssue) => {
    checks[index]?.issues.push(issue);
  };
  const isSame = (a: Cidr, b: Cidr) => a.prefix === b.prefix && a.network === b.network;

  for (const [at, outer] of valid.entries()) {
    const last = outer.cidr.network + outer.cidr.size - 1n;
    for (let next = at + 1; next < valid.length; next++) {
      const inner = valid[next];
      if (inner === undefined) {
        break;
      }
      if (inner.cidr.family !== outer.cidr.family || inner.cidr.network > last) {
        break;
      }
      if (isSame(outer.cidr, inner.cidr)) {
        duplicateCount++;
        addIssue(outer.index, {
          kind: 'duplicate',
          otherIndex: inner.index,
          other: inner.cidr.text,
        });
        addIssue(inner.index, {
          kind: 'duplicate',
          otherIndex: outer.index,
          other: outer.cidr.text,
        });
      } else {
        overlapCount++;
        addIssue(outer.index, { kind: 'covers', otherIndex: inner.index, other: inner.cidr.text });
        addIssue(inner.index, {
          kind: 'coveredBy',
          otherIndex: outer.index,
          other: outer.cidr.text,
        });
      }
    }
  }
  for (const check of checks) {
    check.issues.sort((a, b) => a.otherIndex - b.otherIndex);
  }
  return { entries: checks, overlapCount, duplicateCount, invalidCount };
}

/** Splits pasted text into entries: one per line, comma, semicolon or run of spaces. */
export function splitCidrText(text: string): string[] {
  return splitText(text, /[\s,;]+/);
}
