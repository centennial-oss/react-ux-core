import { render, screen, within } from '@testing-library/react';
import { Profiler, useEffect, useState, type ProfilerOnRenderCallback } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { rolloutStages, rolloutTargets } from '../../../test/rollout';
import type { Messages } from '../../provider/messages';
import { UIProvider } from '../../provider/UIProvider';
import type { RolloutProgressMessages } from './messages';
import { RolloutProgress, type RolloutProgressProps, type RolloutTarget } from './RolloutProgress';

const hasTouch = navigator.maxTouchPoints > 0;

const base: RolloutProgressProps = {
  title: 'Mount firmware 4.2',
  status: 'running',
  stages: rolloutStages,
  currentStageId: 'half',
  targets: rolloutTargets(120),
  timeZone: 'UTC',
};

function rows(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>('li[data-target]'));
}

describe('RolloutProgress', () => {
  it('shows the overall progress, status and stages', () => {
    render(<RolloutProgress {...base} />);
    expect(
      screen.getByRole('region', { name: 'Mount firmware 4.2' }).getAttribute('data-status'),
    ).toBe('running');
    expect(screen.getByRole('heading', { level: 2, name: 'Mount firmware 4.2' })).toBeVisible();
    const progress = screen.getByRole('progressbar', { name: 'Mount firmware 4.2' });
    expect(progress).toHaveAttribute('aria-valuetext', '118 of 312 · 2 failed');
    expect(screen.getByText('Running')).toBeVisible();

    const stages = within(screen.getByRole('list', { name: 'Stages' })).getAllByRole('listitem');
    expect(stages.map((stage) => stage.textContent)).toEqual([
      expect.stringContaining('Canary1%Done'),
      expect.stringContaining('Early10%Done'),
      expect.stringContaining('Half50%Current stage'),
      expect.stringContaining('Everything100%Upcoming'),
    ]);
    expect(stages[2]).toHaveAttribute('aria-current', 'step');
  });

  it('groups targets, with failing groups first and expanded, and failed targets first with detail', () => {
    const { container } = render(<RolloutProgress {...base} />);
    const groups = screen.getAllByRole('button', { expanded: true });
    expect(groups).toHaveLength(1);
    expect(groups[0]?.textContent).toContain('Sutherland');
    expect(groups[0]?.textContent).toContain('18 of 52 · 2 failed');
    expect(screen.getByRole('button', { name: /^Mauna Kea/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    const [first, second, third] = rows(container);
    expect(first).toHaveAttribute('data-status', 'failed');
    expect(first?.textContent).toContain('Checksum mismatch');
    expect(second).toHaveAttribute('data-status', 'failed');
    expect(third).not.toHaveAttribute('data-status', 'failed');
  });

  it('filters targets by status', async () => {
    const { container } = render(<RolloutProgress {...base} />);
    expect(rows(container)).toHaveLength(312);
    await userEvent.click(screen.getByRole('button', { name: /Show/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Failed (2)' }));
    await expect.poll(() => rows(container).length).toBe(2);
    expect(screen.getAllByRole('button', { expanded: true })).toHaveLength(1);
  });

  it('pauses, resumes and retries failed targets', async () => {
    const onPause = vi.fn();
    const onResume = vi.fn();
    const onRetryFailed = vi.fn();
    const { rerender } = render(
      <RolloutProgress
        {...base}
        onPause={onPause}
        onResume={onResume}
        onRetryFailed={onRetryFailed}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(onPause).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: 'Retry failed (2)' }));
    expect(onRetryFailed).toHaveBeenCalledOnce();
    rerender(
      <RolloutProgress
        {...base}
        status="paused"
        onPause={onPause}
        onResume={onResume}
        onRetryFailed={onRetryFailed}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Pause' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Resume' }));
    expect(onResume).toHaveBeenCalledOnce();
  });

  it('rolls back only after confirmation, then shows the rolling-back state', async () => {
    const onRollback = vi.fn();
    const { rerender } = render(<RolloutProgress {...base} onRollback={onRollback} />);
    await userEvent.click(screen.getByRole('button', { name: 'Roll back' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Roll back this rollout?' });
    expect(dialog.textContent).toContain('The 118 targets already updated');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await expect.poll(() => screen.queryByRole('alertdialog')).toBeNull();
    expect(onRollback).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Roll back' }));
    const again = await screen.findByRole('alertdialog');
    await userEvent.click(within(again).getByRole('button', { name: 'Roll back' }));
    expect(onRollback).toHaveBeenCalledOnce();
    await expect.poll(() => screen.queryByRole('alertdialog')).toBeNull();

    rerender(<RolloutProgress {...base} status="rolling-back" onRollback={onRollback} />);
    expect(screen.getByText('Rolling back')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Roll back' })).toBeNull();
  });

  it.runIf(hasTouch)('opens the rollback confirmation with a touch tap', async () => {
    render(<RolloutProgress {...base} onRollback={vi.fn()} />);
    const button = screen.getByRole('button', { name: 'Roll back' });
    button.setAttribute('data-testid', 'rollback');
    await commands.tap('[data-testid="rollback"]');
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
  });

  it('shows the exact elapsed time of a finished rollout', () => {
    render(
      <RolloutProgress {...base} status="succeeded" startedAt={0} endedAt={21 * 60_000 + 48_000} />,
    );
    expect(screen.getByRole('timer', { name: 'Elapsed' }).textContent).toBe('21:48');
  });

  it('announces status changes politely, and failures assertively but throttled', async () => {
    const targets = (failed: number): RolloutTarget[] =>
      Array.from({ length: 6 }, (_, index) => ({
        id: `m${String(index)}`,
        label: `Mount ${String(index)}`,
        status: index < failed ? 'failed' : 'running',
      }));
    const props = { ...base, stages: undefined, failureAnnounceIntervalMs: 400 };
    const { container, rerender } = render(<RolloutProgress {...props} targets={targets(0)} />);
    const polite = container.querySelector('[aria-live="polite"]');
    const assertive = container.querySelector('[aria-live="assertive"]');
    expect(polite?.textContent).toBe('');
    expect(assertive?.textContent).toBe('');

    rerender(<RolloutProgress {...props} status="paused" targets={targets(0)} />);
    expect(polite?.textContent).toBe('Rollout status: Paused');

    rerender(<RolloutProgress {...props} targets={targets(1)} />);
    await expect.poll(() => assertive?.textContent).toBe('Mount 0 failed');
    // Two more failures right after: held back, then announced together once the interval has passed.
    rerender(<RolloutProgress {...props} targets={targets(2)} />);
    rerender(<RolloutProgress {...props} targets={targets(3)} />);
    expect(assertive?.textContent).toBe('Mount 0 failed');
    await expect
      .poll(() => assertive?.textContent, { timeout: 2000 })
      .toBe('2 targets failed: Mount 1 and Mount 2');
  });

  it('re-renders only the rows that changed when one target updates', () => {
    const durations: number[] = [];
    const onRender: ProfilerOnRenderCallback = (_id, phase, actualDuration) => {
      if (phase === 'update') {
        durations.push(actualDuration);
      }
    };
    const initial = rolloutTargets(120);
    const view = (targets: RolloutTarget[]) => (
      <Profiler id="rollout" onRender={onRender}>
        <RolloutProgress {...base} targets={targets} />
      </Profiler>
    );
    const { container, rerender } = render(view(initial));
    const measure = (targets: RolloutTarget[]) => {
      rerender(view(targets));
      return durations[durations.length - 1] ?? 0;
    };
    const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
    const oneChanged: number[] = [];
    const rebuilt: number[] = [];
    const allChanged: number[] = [];
    for (let round = 0; round < 3; round += 1) {
      // Every target changes.
      const all = initial.map((target) => ({ ...target, at: 1000 * (round + 1), detail: round }));
      allChanged.push(measure(all));
      // One target finishes; the rest are the same objects.
      const one = all.map((target, index) =>
        index === 130 + round ? { ...target, status: 'succeeded' as const } : target,
      );
      oneChanged.push(measure(one));
      // The app rebuilds every object, but only one target's fields changed.
      rebuilt.push(
        measure(
          one.map((target, index) =>
            index === 140 + round ? { ...target, status: 'succeeded' as const } : { ...target },
          ),
        ),
      );
    }
    expect(sum(oneChanged)).toBeLessThan(sum(allChanged) / 2);
    expect(sum(rebuilt)).toBeLessThan(sum(allChanged) / 2);
    expect(rows(container)).toHaveLength(312);
  });

  it('stays responsive while 312 targets update every 100 ms', async () => {
    function Ticking() {
      const [processed, setProcessed] = useState(60);
      useEffect(() => {
        const handle = setInterval(() => {
          setProcessed((value) => Math.min(312, value + 3));
        }, 100);
        return () => {
          clearInterval(handle);
        };
      }, []);
      return <RolloutProgress {...base} targets={rolloutTargets(processed)} />;
    }
    render(<Ticking />);
    const progress = screen.getByRole('progressbar', { name: 'Mount firmware 4.2' });
    const startValue = progress.getAttribute('aria-valuenow');
    const maunaKea = screen.getByRole('button', { name: /^Mauna Kea/ });
    // Clicked on the element itself: the button's name holds live counts, so a locator built from it goes stale
    // between ticks.
    maunaKea.click();
    await expect.poll(() => maunaKea.getAttribute('aria-expanded')).toBe('true');
    maunaKea.click();
    await expect.poll(() => maunaKea.getAttribute('aria-expanded')).toBe('false');
    // The updates kept coming meanwhile.
    await expect.poll(() => progress.getAttribute('aria-valuenow')).not.toBe(startValue);
  });

  it('fits a phone without horizontal page scroll', () => {
    render(
      <div className="w-[360px] p-2">
        <RolloutProgress {...base} onPause={vi.fn()} onRetryFailed={vi.fn()} onRollback={vi.fn()} />
      </div>,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });

  it('takes the app’s strings from UIProvider', () => {
    const overrides: Partial<RolloutProgressMessages> = {
      rolloutStatus: ({ status }) => `[${status}]`,
      rolloutProgress: ({ done, total }) => `${String(done)}/${String(total)}`,
    };
    // Until RolloutProgressMessages joins the Messages union, the overrides need widening.
    render(
      <UIProvider messages={overrides as unknown as Partial<Messages>}>
        <RolloutProgress {...base} />
      </UIProvider>,
    );
    expect(screen.getByText('[running]')).toBeVisible();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '118/312');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <RolloutProgress
        {...base}
        startedAt={0}
        elapsedMs={65_000}
        status="paused"
        onResume={vi.fn()}
        onRetryFailed={vi.fn()}
        onRollback={vi.fn()}
      />,
    );
    await expectNoAxeViolations(container);
  });
});
