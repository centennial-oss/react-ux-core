// Contiguous numeric tiers: rows of `from → to → value`, each starting where the previous ends; the last may be open.

/** One tier. `to` is null for an open-ended last tier ("500 and above"). */
export interface Tier<V = number> {
  from: number;
  to: number | null;
  value: V;
}

export type Tiers<V = number> = readonly Tier<V>[];

/** A problem with one tier. */
export type TierIssue =
  | { kind: 'endNotAfterStart' }
  | { kind: 'notContiguous'; expectedFrom: number }
  | { kind: 'openNotLast' }
  | { kind: 'openNotAllowed' };

export interface TierValidation {
  /** Issues by tier index. */
  rows: ReadonlyMap<number, readonly TierIssue[]>;
  isValid: boolean;
}

/**
 * Checks tiers: each ends above where it starts, starts where the previous one ends (so they neither overlap nor
 * leave gaps), and only the last is open-ended (when `allowsOpenEnd`, the default).
 */
export function validateTiers<V>(
  tiers: Tiers<V>,
  { allowsOpenEnd = true }: { allowsOpenEnd?: boolean } = {},
): TierValidation {
  const issues = new Map<number, TierIssue[]>();
  const add = (index: number, issue: TierIssue) => {
    issues.set(index, [...(issues.get(index) ?? []), issue]);
  };
  tiers.forEach((tier, index) => {
    const isLast = index === tiers.length - 1;
    if (tier.to === null) {
      if (!isLast) {
        add(index, { kind: 'openNotLast' });
      } else if (!allowsOpenEnd) {
        add(index, { kind: 'openNotAllowed' });
      }
    } else if (!(tier.to > tier.from)) {
      add(index, { kind: 'endNotAfterStart' });
    }
    const previous = index > 0 ? tiers[index - 1] : undefined;
    if (previous?.to != null && tier.from !== previous.to) {
      add(index, { kind: 'notContiguous', expectedFrom: previous.to });
    }
  });
  return { rows: issues, isValid: issues.size === 0 };
}

/**
 * The tiers with one more at the end, starting at the last tier's upper bound and open-ended. A last tier that was
 * open-ended is closed at its own start, so the user sets its end.
 */
export function appendTier<V>(tiers: Tiers<V>, value: V, firstFrom = 0): Tier<V>[] {
  const last = tiers.at(-1);
  if (!last) {
    return [{ from: firstFrom, to: null, value }];
  }
  const from = last.to ?? last.from;
  return [...tiers.slice(0, -1), { ...last, to: from }, { from, to: null, value }];
}
