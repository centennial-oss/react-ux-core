import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import {
  ROLLOUT_STARTED_AT,
  ROLLOUT_TOTAL,
  rolloutStageAt,
  rolloutStages,
  rolloutTargets,
} from '../../../test/rollout';
import { RolloutProgress } from './RolloutProgress';
import type { RolloutStatus } from './messages';

const noop = () => undefined;

const meta = {
  title: 'Feedback/RolloutProgress',
  component: RolloutProgress,
  args: {
    title: 'Mount firmware 4.2',
    status: 'running',
    stages: rolloutStages,
    currentStageId: 'half',
    targets: rolloutTargets(120),
    timeZone: 'UTC',
    onPause: noop,
    onResume: noop,
    onRetryFailed: noop,
    onRollback: noop,
  },
  decorators: [
    (Story) => (
      <div className="max-w-3xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RolloutProgress>;
export default meta;
type Story = StoryObj<typeof meta>;

/** 120 of 312 mounts updated, two failed (listed first, with detail, in expanded groups) and two skipped. */
export const Running: Story = {};

/** Paused, with the elapsed time the app tracked. */
export const Paused: Story = {
  args: {
    status: 'paused',
    elapsedMs: 12 * 60_000 + 34_000,
    targets: rolloutTargets(120, { running: 0 }),
  },
};

/** Stopped on failures: Retry failed and Roll back are offered. */
export const Failed: Story = {
  args: {
    status: 'failed',
    currentStageId: 'all',
    targets: rolloutTargets(260, { running: 0 }),
    startedAt: ROLLOUT_STARTED_AT,
    endedAt: ROLLOUT_STARTED_AT + 18 * 60_000 + 5_000,
  },
};

/** After a confirmed rollback, while targets go back to the previous version. */
export const RollingBack: Story = {
  args: { status: 'rolling-back', currentStageId: 'all', targets: rolloutTargets(260) },
};

/** Done: every stage is complete and the elapsed time is exact. */
export const Succeeded: Story = {
  args: {
    status: 'succeeded',
    currentStageId: 'all',
    targets: rolloutTargets(ROLLOUT_TOTAL, { running: 0, retried: true }).map((target) =>
      target.status === 'running' ? { ...target, status: 'succeeded' as const } : target,
    ),
    startedAt: ROLLOUT_STARTED_AT,
    endedAt: ROLLOUT_STARTED_AT + 21 * 60_000 + 48_000,
    onPause: undefined,
    onRetryFailed: undefined,
  },
};

/** Targets without groups, as one list. */
export const Ungrouped: Story = {
  args: {
    title: 'Spectrograph config',
    stages: undefined,
    targets: rolloutTargets(30)
      .slice(0, 24)
      .map(({ group: _group, ...target }) => target),
  },
};

/**
 * All 312 targets updating every second, with working Pause, Resume, Retry failed and Roll back (which asks for
 * confirmation first).
 */
export const Live: Story = {
  tags: ['!visual'],
  render: function LiveRollout() {
    const [processed, setProcessed] = useState(0);
    const [status, setStatus] = useState<RolloutStatus>('running');
    const [retried, setRetried] = useState(false);
    const [startedAt] = useState(() => Date.now());
    useEffect(() => {
      if (status !== 'running' && status !== 'rolling-back') {
        return;
      }
      const handle = setInterval(() => {
        setProcessed((value) =>
          status === 'rolling-back' ? Math.max(0, value - 6) : Math.min(ROLLOUT_TOTAL, value + 3),
        );
      }, 1000);
      return () => {
        clearInterval(handle);
      };
    }, [status]);
    const shownStatus: RolloutStatus =
      status === 'rolling-back' && processed === 0
        ? 'rolled-back'
        : status === 'running' && processed >= ROLLOUT_TOTAL
          ? 'succeeded'
          : status;
    return (
      <RolloutProgress
        title="Mount firmware 4.2"
        status={shownStatus}
        stages={rolloutStages}
        currentStageId={rolloutStageAt(processed)}
        targets={rolloutTargets(processed, { retried })}
        startedAt={startedAt}
        onPause={() => {
          setStatus('paused');
        }}
        onResume={() => {
          setStatus('running');
        }}
        onRetryFailed={() => {
          setRetried(true);
        }}
        onRollback={() => {
          setStatus('rolling-back');
        }}
      />
    );
  },
};
