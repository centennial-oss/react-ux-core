// The /diff entry point's strings (DiffViewer and PlanReview), with English defaults and the hook that merges the
// app's overrides from UIProvider.
import type { CommonMessages } from '../provider/coreStrings';
import { useEntryMessages } from '../provider/context';

/** A plan change's action, as PlanReview's `PlannedChange.action`. */
export type PlanAction = 'create' | 'update' | 'replace' | 'delete' | 'read' | 'no-op';

export interface DiffMessages {
  /** DiffViewer's default side labels. */
  diffBefore: string;
  diffAfter: string;
  /** Names a diff when it has no `aria-label`, for example "Changes from Live to Proposed". */
  diffLabel: (params: { before: string; after: string }) => string;
  /** The visible summary, for example "+12 −3 in 2 hunks". */
  diffSummary: (params: { added: number; removed: number; hunks: number }) => string;
  /** The summary read by screen readers, for example "12 lines added and 3 removed, in 2 hunks". */
  diffSummaryLabel: (params: { added: number; removed: number; hunks: number }) => string;
  /** Shown when both sides are the same. */
  noDifferences: string;
  /** Buttons that move between hunks. */
  previousHunk: string;
  nextHunk: string;
  /** Announced after moving to a hunk, for example "Hunk 2 of 3, from line 40". */
  hunkAnnouncement: (params: { index: number; total: number; line: number }) => string;
  /** A hunk's header: the lines it covers on each side, as in a unified diff. */
  hunkRange: (params: {
    beforeStart: number;
    beforeCount: number;
    afterStart: number;
    afterCount: number;
  }) => string;
  /** Read before a hunk's header, for example "Hunk 1 of 3". */
  hunkPosition: (params: { index: number; total: number }) => string;
  /** The toggle for collapsed unchanged lines. */
  showUnchangedLines: (params: { count: number }) => string;
  hideUnchangedLines: (params: { count: number }) => string;
  /** Read before each added or removed line (the + and − marks are hidden from screen readers). */
  lineAdded: string;
  lineRemoved: string;
  /** Shown when structural mode can't parse a side and falls back to a text diff. */
  structuralFallback: string;

  /** PlanReview's default title. */
  planTitle: string;
  /** The whole summary as one sentence, read by screen readers and used in the apply dialog. */
  planSummary: (params: {
    add: number;
    change: number;
    replace: number;
    destroy: number;
    read: number;
  }) => string;
  /** The summary's visible counts. */
  planToAdd: (params: { count: number }) => string;
  planToChange: (params: { count: number }) => string;
  planToReplace: (params: { count: number }) => string;
  planToDestroy: (params: { count: number }) => string;
  planToRead: (params: { count: number }) => string;
  /** Shown when the plan has no changes. */
  planNoChanges: string;
  /** Each change's action, spelled out beside its address. */
  planWill: Record<PlanAction, string>;
  /** The action filter's options. */
  planActionNames: Record<PlanAction, string>;
  planFilterAction: string;
  planFilterType: string;
  planAllActions: string;
  planAllTypes: string;
  /** Announced as filters change, for example "Showing 12 of 40 changes". */
  planShowing: (params: { shown: number; total: number }) => string;
  planNoMatches: string;
  /** Marks a change that replaces its resource because of these attributes. */
  planForcesReplacement: string;
  planReplacementCause: (params: { count: number }) => string;
  /** Stands in for a value only known once the plan is applied. */
  planKnownAfterApply: string;
  /** Stands in for a sensitive value, and for one that changes. */
  planSensitiveValue: string;
  planSensitiveChanged: string;
  /** Marks a change with sensitive values, and the toggle that shows them. */
  planSensitive: string;
  planShowSensitive: string;
  planHideSensitive: string;
  /** The diff's side labels for a change. */
  planBefore: string;
  planAfter: string;
  /** Title of the warnings banner. */
  planWarnings: (params: { count: number }) => string;
  /** The apply button and its confirmation. */
  planApply: string;
  planApplyTitle: string;
  planApplyConsequence: (params: { destroy: number; replace: number }) => string;
  /** The word typed to confirm a destructive apply. */
  planConfirmText: string;
}

const plural = (count: number, one: string, other: string) => (count === 1 ? one : other);

export const defaultDiffMessages: DiffMessages = {
  diffBefore: 'Before',
  diffAfter: 'After',
  diffLabel: ({ before, after }) => `Changes from ${before} to ${after}`,
  diffSummary: ({ added, removed, hunks }) =>
    `+${added} −${removed} in ${hunks} ${plural(hunks, 'hunk', 'hunks')}`,
  diffSummaryLabel: ({ added, removed, hunks }) =>
    `${added} ${plural(added, 'line', 'lines')} added and ${removed} removed, in ${hunks} ${plural(hunks, 'hunk', 'hunks')}`,
  noDifferences: 'No differences',
  previousHunk: 'Previous hunk',
  nextHunk: 'Next hunk',
  hunkAnnouncement: ({ index, total, line }) => `Hunk ${index} of ${total}, from line ${line}`,
  hunkRange: ({ beforeStart, beforeCount, afterStart, afterCount }) =>
    `@@ -${beforeStart},${beforeCount} +${afterStart},${afterCount} @@`,
  hunkPosition: ({ index, total }) => `Hunk ${index} of ${total}`,
  showUnchangedLines: ({ count }) => `Show ${count} unchanged ${plural(count, 'line', 'lines')}`,
  hideUnchangedLines: ({ count }) => `Hide ${count} unchanged ${plural(count, 'line', 'lines')}`,
  lineAdded: 'added',
  lineRemoved: 'removed',
  structuralFallback: 'Couldn’t read this as structured data, so it’s compared as text.',

  planTitle: 'Planned changes',
  planSummary: ({ add, change, replace, destroy, read }) =>
    [
      `${add} to add`,
      `${change} to change`,
      ...(replace > 0 ? [`${replace} to replace`] : []),
      `${destroy} to destroy`,
      ...(read > 0 ? [`${read} to read`] : []),
    ].join(', ') + '.',
  planToAdd: ({ count }) => `${count} to add`,
  planToChange: ({ count }) => `${count} to change`,
  planToReplace: ({ count }) => `${count} to replace`,
  planToDestroy: ({ count }) => `${count} to destroy`,
  planToRead: ({ count }) => `${count} to read`,
  planNoChanges: 'No changes. The infrastructure already matches the configuration.',
  planWill: {
    create: 'will be created',
    update: 'will be updated in place',
    replace: 'will be replaced',
    delete: 'will be destroyed',
    read: 'will be read',
    'no-op': 'won’t change',
  },
  planActionNames: {
    create: 'Create',
    update: 'Update',
    replace: 'Replace',
    delete: 'Destroy',
    read: 'Read',
    'no-op': 'No change',
  },
  planFilterAction: 'Action',
  planFilterType: 'Type',
  planAllActions: 'All actions',
  planAllTypes: 'All types',
  planShowing: ({ shown, total }) =>
    `Showing ${shown} of ${total} ${plural(total, 'change', 'changes')}`,
  planNoMatches: 'No changes match these filters.',
  planForcesReplacement: 'Forces replacement',
  planReplacementCause: ({ count }) =>
    `${plural(count, 'This attribute forces', 'These attributes force')} replacement:`,
  planKnownAfterApply: '(known after apply)',
  planSensitiveValue: '(sensitive value)',
  planSensitiveChanged: '(sensitive value, changed)',
  planSensitive: 'Sensitive',
  planShowSensitive: 'Show sensitive values',
  planHideSensitive: 'Hide sensitive values',
  planBefore: 'Current',
  planAfter: 'Planned',
  planWarnings: ({ count }) => plural(count, 'Warning', `${count} warnings`),
  planApply: 'Apply',
  planApplyTitle: 'Apply these changes?',
  planApplyConsequence: ({ destroy, replace }) =>
    destroy > 0 && replace > 0
      ? `This destroys ${destroy} ${plural(destroy, 'resource', 'resources')} and replaces ${replace}. It can’t be undone.`
      : destroy > 0
        ? `This destroys ${destroy} ${plural(destroy, 'resource', 'resources')}. It can’t be undone.`
        : `This replaces ${replace} ${plural(replace, 'resource', 'resources')}, destroying the current ${plural(replace, 'one', 'ones')}. It can’t be undone.`,
  planConfirmText: 'apply',
};

/** The strings `/diff` components read: the core strings and `/diff`'s own. */
export type DiffStrings = CommonMessages & DiffMessages;

/** `/diff`'s strings, with the app's overrides from `UIProvider`. */
export function useDiffMessages(): DiffStrings {
  return useEntryMessages(defaultDiffMessages);
}
