// Plan helpers for PlanReview: counting a plan's actions, and turning a change's `before` and `after` values into
// the texts its structural diff compares, with unknown values and sensitive values replaced by placeholders.

import { stringifyStructural } from './diff';
import type { PlanAction } from './messages';

export type { PlanAction } from './messages';

/** One resource change in an infrastructure plan. */
export interface PlannedChange {
  id: string;
  /** The resource's address, such as `storage_bucket.images`. */
  address: string;
  /** The resource type, such as `storage_bucket`. */
  type: string;
  action: PlanAction;
  /** The current value (absent for a create). */
  before?: unknown;
  /** The planned value (absent for a delete). */
  after?: unknown;
  /** Attributes only known after apply, as dotted paths (`endpoint`, `tags.owner`, `rules.0.port`). */
  unknownAfter?: readonly string[];
  /** Attributes whose change forces the resource to be replaced, as dotted paths. */
  forcesReplacement?: readonly string[];
  /** Masks every value in this change until the user reveals them. */
  isSensitive?: boolean;
}

/** How many changes of each kind a plan holds, in the words of its summary. */
export interface PlanCounts {
  add: number;
  change: number;
  replace: number;
  destroy: number;
  read: number;
  unchanged: number;
}

/** Counts a plan's changes by action. */
export function countPlan(changes: readonly PlannedChange[]): PlanCounts {
  const counts: PlanCounts = { add: 0, change: 0, replace: 0, destroy: 0, read: 0, unchanged: 0 };
  for (const change of changes) {
    const key = (
      {
        create: 'add',
        update: 'change',
        replace: 'replace',
        delete: 'destroy',
        read: 'read',
        'no-op': 'unchanged',
      } as const
    )[change.action];
    counts[key]++;
  }
  return counts;
}

/** Whether applying the plan destroys anything (a delete, or a replace, which destroys the current resource). */
export function isDestructivePlan(changes: readonly PlannedChange[]): boolean {
  return changes.some((change) => change.action === 'delete' || change.action === 'replace');
}

// Placeholders survive JSON.stringify unescaped (private-use characters), then become unquoted text.
const UNKNOWN = '\u{E000}known-after-apply\u{E000}';
const SENSITIVE = '\u{E000}sensitive\u{E000}';
const SENSITIVE_CHANGED = '\u{E000}sensitive-changed\u{E000}';

/** A dotted path (`rules.0.port`, or `rules[0].port`) as its segments. */
function pathSegments(path: string): string[] {
  return path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter((segment) => segment !== '');
}

function isContainer(value: unknown): value is Record<string, unknown> | unknown[] {
  return value !== null && typeof value === 'object' && !(value instanceof Date);
}

/** A deep copy of plain data (objects and arrays), so placeholders can be written without touching the app's values. */
function copy(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(copy);
  }
  if (isContainer(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, copy(child)]));
  }
  return value;
}

function setPath(target: unknown, segments: readonly string[], value: unknown): unknown {
  const [head, ...rest] = segments;
  if (head === undefined) {
    return value;
  }
  const container: Record<string, unknown> | unknown[] = isContainer(target)
    ? target
    : /^\d+$/.test(head)
      ? []
      : {};
  const record = container as Record<string, unknown>;
  record[head] = setPath(record[head], rest, value);
  return container;
}

/** Replaces every leaf value with a placeholder; on the planned side, a leaf that differs gets the "changed" one. */
function maskLeaves(value: unknown, other: unknown, side: 'before' | 'after'): unknown {
  if (Array.isArray(value)) {
    return value.map((child, index) =>
      maskLeaves(child, Array.isArray(other) ? other[index] : undefined, side),
    );
  }
  if (isContainer(value)) {
    const otherRecord = isContainer(other) ? (other as Record<string, unknown>) : undefined;
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        maskLeaves(child, otherRecord?.[key], side),
      ]),
    );
  }
  if (value === UNKNOWN || value === null || value === undefined) {
    return value;
  }
  if (side === 'after' && stringifyStructural(value) !== stringifyStructural(other)) {
    return SENSITIVE_CHANGED;
  }
  return SENSITIVE;
}

/** The words that replace PlanReview's placeholders. */
export interface PlanPlaceholderText {
  knownAfterApply: string;
  sensitiveValue: string;
  sensitiveChanged: string;
}

/**
 * The texts a change's structural diff compares: `before` and `after` as sorted, pretty-printed JSON, with
 * attributes in `unknownAfter` shown as "(known after apply)" and, for a sensitive change that isn't revealed, every
 * value masked (a value that changes is masked as "(sensitive value, changed)", so the change still shows).
 */
export function planDiffTexts(
  change: PlannedChange,
  text: PlanPlaceholderText,
  { isRevealed = false }: { isRevealed?: boolean } = {},
): { before: string; after: string } {
  const hasBefore = change.before !== undefined && change.before !== null;
  const hasAfter = change.after !== undefined && change.after !== null;
  let after: unknown = hasAfter ? copy(change.after) : undefined;
  if (change.action !== 'delete') {
    for (const path of change.unknownAfter ?? []) {
      const segments = pathSegments(path);
      if (segments.length > 0) {
        after = setPath(after ?? {}, segments, UNKNOWN);
      }
    }
  }
  let before: unknown = hasBefore ? change.before : undefined;
  if (change.isSensitive === true && !isRevealed) {
    const original = before;
    before = before === undefined ? undefined : maskLeaves(before, after, 'before');
    after = after === undefined ? undefined : maskLeaves(after, original, 'after');
  }
  const render = (value: unknown) =>
    stringifyStructural(value)
      .replaceAll(JSON.stringify(UNKNOWN), text.knownAfterApply)
      .replaceAll(JSON.stringify(SENSITIVE_CHANGED), text.sensitiveChanged)
      .replaceAll(JSON.stringify(SENSITIVE), text.sensitiveValue);
  return { before: render(before), after: render(after) };
}
