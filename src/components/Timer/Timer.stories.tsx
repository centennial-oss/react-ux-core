import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button } from '../Button';
import { Timer } from './Timer';

const MINUTE = 60_000;

const meta = {
  title: 'Feedback/Timer',
  component: Timer,
  args: { label: 'Time left', durationMs: 90 * MINUTE },
} satisfies Meta<typeof Timer>;
export default meta;
type Story = StoryObj<typeof meta>;

/** A 90-minute test countdown that warns at 10 minutes and turns to danger at 2, with pause and resume. */
export const ExamCountdown: Story = {
  tags: ['!visual'],
  render: () => {
    const [startedAt] = useState(() => Date.now());
    const [isPaused, setPaused] = useState(false);
    return (
      <div className="flex flex-col items-start gap-3">
        <Timer
          label="Time left"
          variant="badge"
          startedAt={startedAt}
          durationMs={90 * MINUTE}
          thresholds={{ warningMs: 10 * MINUTE, dangerMs: 2 * MINUTE }}
          isPaused={isPaused}
        />
        <Button
          size="sm"
          onPress={() => {
            setPaused(!isPaused);
          }}
        >
          {isPaused ? 'Resume' : 'Pause'}
        </Button>
      </div>
    );
  },
};

/** Time on a question, counting up against a 2-minute budget. */
export const QuestionTimer: Story = {
  tags: ['!visual'],
  render: () => (
    <Timer
      label="Time on this question"
      direction="up"
      thresholds={{ warningMs: 2 * MINUTE }}
      format="words"
    />
  ),
};

/** Each variant and level, held still: normal, warning, danger and expired, as inline text, badges and tiles. */
export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {(['inline', 'badge', 'tile'] as const).map((variant) => (
        <div key={variant} className="flex flex-wrap items-start gap-4">
          <Timer
            variant={variant}
            label="Time left"
            durationMs={90 * MINUTE}
            elapsedMs={42 * MINUTE}
            isPaused
          />
          <Timer
            variant={variant}
            label="Time left"
            durationMs={90 * MINUTE}
            elapsedMs={82 * MINUTE}
            thresholds={{ warningMs: 10 * MINUTE, dangerMs: 2 * MINUTE }}
            isPaused
          />
          <Timer
            variant={variant}
            label="Time left"
            durationMs={90 * MINUTE}
            elapsedMs={89 * MINUTE}
            thresholds={{ warningMs: 10 * MINUTE, dangerMs: 2 * MINUTE }}
            isPaused
          />
          <Timer variant={variant} label="Time left" endsAt={0} />
        </div>
      ))}
    </div>
  ),
};

/** Sizes, and the words format. */
export const SizesAndWords: Story = {
  render: () => (
    <div className="flex flex-wrap items-baseline gap-6">
      <Timer size="sm" label="Small" durationMs={65 * MINUTE} isPaused />
      <Timer label="Medium" durationMs={65 * MINUTE} isPaused />
      <Timer size="lg" label="Large" durationMs={65 * MINUTE} isPaused />
      <Timer label="Words" format="words" durationMs={65 * MINUTE} isPaused />
    </div>
  ),
};
