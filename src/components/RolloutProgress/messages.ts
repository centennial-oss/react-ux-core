/** A rollout's overall state. */
export type RolloutStatus =
  'running' | 'paused' | 'succeeded' | 'failed' | 'rolling-back' | 'rolled-back';

/** One target's state. */
export type RolloutTargetStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped';

/** RolloutProgress's strings. */
export interface RolloutProgressMessages {
  /** The rollout's status in words, such as "Rolling back". */
  rolloutStatus: (params: { status: RolloutStatus }) => string;
  /** A target's status in words, such as "Failed". */
  rolloutTargetStatus: (params: { status: RolloutTargetStatus }) => string;
  /** The overall progress, such as "120 of 312 · 3 failed". */
  rolloutProgress: (params: { done: number; total: number; failed: number }) => string;
  /** Labels the elapsed time. */
  rolloutElapsed: string;
  /** Names the list of stages. */
  rolloutStages: string;
  /** A stage's state for screen readers. */
  rolloutStageState: (params: { state: 'done' | 'current' | 'upcoming' }) => string;
  rolloutPause: string;
  rolloutResume: string;
  /** The button that retries every failed target. */
  rolloutRetryFailed: (params: { count: number }) => string;
  /** The button that starts a rollback (after confirmation). */
  rolloutRollback: string;
  rolloutRollbackTitle: string;
  /** What a rollback does, in the confirmation. `done` counts targets already updated. */
  rolloutRollbackBody: (params: { done: number }) => string;
  /** The confirmation's confirm button. */
  rolloutRollbackConfirm: string;
  /** Labels the status filter. */
  rolloutFilter: string;
  /** The filter option that shows every target. */
  rolloutFilterAll: (params: { count: number }) => string;
  /** A filter option, such as "Failed (3)". `status` is already in words. */
  rolloutFilterOption: (params: { status: string; count: number }) => string;
  /** Names the target list. */
  rolloutTargets: string;
  /** The heading of targets without a group, when others have one. */
  rolloutUngrouped: string;
  /** A group's summary beside its name, such as "48 of 52 · 1 failed". */
  rolloutGroupSummary: (params: { done: number; total: number; failed: number }) => string;
  /** Announced (politely) when the rollout's status changes. `status` is already in words. */
  rolloutStatusChanged: (params: { status: string }) => string;
  /** Announced (politely) when a new stage starts. */
  rolloutStageStarted: (params: { stage: string }) => string;
  /** Announced (assertively, at most once per interval) when targets fail. `names` lists up to three. */
  rolloutTargetsFailed: (params: { count: number; names: string }) => string;
}

const statusWords: Record<RolloutStatus, string> = {
  running: 'Running',
  paused: 'Paused',
  succeeded: 'Succeeded',
  failed: 'Failed',
  'rolling-back': 'Rolling back',
  'rolled-back': 'Rolled back',
};

const targetStatusWords: Record<RolloutTargetStatus, string> = {
  pending: 'Pending',
  running: 'Updating',
  succeeded: 'Updated',
  failed: 'Failed',
  skipped: 'Skipped',
};

const stageStateWords = { done: 'Done', current: 'Current stage', upcoming: 'Upcoming' };

export const defaultRolloutProgressMessages: RolloutProgressMessages = {
  rolloutStatus: ({ status }) => statusWords[status],
  rolloutTargetStatus: ({ status }) => targetStatusWords[status],
  rolloutProgress: ({ done, total, failed }) =>
    failed > 0
      ? `${String(done)} of ${String(total)} · ${String(failed)} failed`
      : `${String(done)} of ${String(total)}`,
  rolloutElapsed: 'Elapsed',
  rolloutStages: 'Stages',
  rolloutStageState: ({ state }) => stageStateWords[state],
  rolloutPause: 'Pause',
  rolloutResume: 'Resume',
  rolloutRetryFailed: ({ count }) => `Retry failed (${String(count)})`,
  rolloutRollback: 'Roll back',
  rolloutRollbackTitle: 'Roll back this rollout?',
  rolloutRollbackBody: ({ done }) =>
    done === 1
      ? 'The target already updated goes back to its previous version.'
      : `The ${String(done)} targets already updated go back to their previous version.`,
  rolloutRollbackConfirm: 'Roll back',
  rolloutFilter: 'Show',
  rolloutFilterAll: ({ count }) => `All (${String(count)})`,
  rolloutFilterOption: ({ status, count }) => `${status} (${String(count)})`,
  rolloutTargets: 'Targets',
  rolloutUngrouped: 'Other',
  rolloutGroupSummary: ({ done, total, failed }) =>
    failed > 0
      ? `${String(done)} of ${String(total)} · ${String(failed)} failed`
      : `${String(done)} of ${String(total)}`,
  rolloutStatusChanged: ({ status }) => `Rollout status: ${status}`,
  rolloutStageStarted: ({ stage }) => `Stage started: ${stage}`,
  rolloutTargetsFailed: ({ count, names }) =>
    count === 1 ? `${names} failed` : `${String(count)} targets failed: ${names}`,
};
