// RolloutProgress: a staged rollout across many targets (firmware to a fleet, config to points of presence). A header
// with the overall progress ("120 of 312 · 3 failed"), the elapsed time and the controls (pause, resume, retry failed,
// roll back after a confirmation); a stage stepper; and the targets, filterable by status and grouped (by region,
// site…) in collapsible sections, failed targets first with their detail. Rows are memoised, so a rollout of hundreds
// of targets updating every second only re-renders the rows that changed. Status and stage changes are announced
// politely; new failures assertively, but at most once per interval, batched.
import { Check, Pause, Play, RotateCw, Undo2 } from 'lucide-react';
import { memo, useEffect, useId, useMemo, useRef, useState, type ReactNode, type Ref } from 'react';
import { useLocale } from 'react-aria-components';
import { useEntryMessages, useTimeZone } from '../../provider/context';
import { cn } from '../../utils/cn';
import { useDeadlineTimer } from '../../utils/timers';
import type { HeadingLevel, Tone } from '../../utils/types';
import { Badge } from '../Badge/Badge';
import { Button } from '../Button/Button';
import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog';
import { Disclosure } from '../Disclosure/Disclosure';
import { Option } from '../ListBox/ListBoxParts';
import { ProgressBar } from '../ProgressBar/ProgressBar';
import { ScrollRegion } from '../ScrollRegion/ScrollRegion';
import { Select } from '../Select/Select';
import { StatusDot } from '../StatusDot/StatusDot';
import { Heading } from '../Text/Text';
import { formatClock } from '../Timer/Timer';
import { useTimer } from '../Timer/useTimer';
import {
  defaultRolloutProgressMessages,
  type RolloutStatus,
  type RolloutTargetStatus,
} from './messages';

export type { RolloutStatus, RolloutTargetStatus };

export interface RolloutTarget {
  /** Unique within the rollout. */
  id: string;
  label: string;
  /** Groups targets into collapsible sections, such as a region or site. */
  group?: string;
  status: RolloutTargetStatus;
  /** More about the target's state, such as the error of a failed target. */
  detail?: ReactNode;
  /** When the target last changed state: a Date, epoch milliseconds or an ISO 8601 string. */
  at?: Date | number | string;
}

export interface RolloutStage {
  id: string;
  label: string;
  /** Share of targets, such as 1, 10, 50, 100. */
  percent?: number;
}

export interface RolloutProgressProps {
  title: ReactNode;
  status: RolloutStatus;
  stages?: readonly RolloutStage[];
  currentStageId?: string;
  targets: readonly RolloutTarget[];
  /** Shows Pause while running. */
  onPause?: () => void;
  /** Shows Resume while paused. */
  onResume?: () => void;
  /** Shows Roll back, which asks for confirmation (ConfirmDialog) before calling. A promise keeps the dialog pending. */
  onRollback?: () => Promise<void> | void;
  /** Shows Retry failed while targets have failed. */
  onRetryFailed?: () => void;
  /** When the rollout started; the elapsed time counts up from it while running or rolling back. */
  startedAt?: Date | number | string;
  /** When a finished rollout ended, so its elapsed time is exact. */
  endedAt?: Date | number | string;
  /** The elapsed time so far, when the app tracks it (it continues from here while running). */
  elapsedMs?: number;
  /** The level of the title heading; group headings are one below. Defaults to 2. */
  headingLevel?: HeadingLevel;
  /** The tallest the target list grows before it scrolls, as a CSS length. Defaults to `28rem`. */
  targetsMaxHeight?: string;
  /** The shortest time between two failure announcements; failures in between are batched. Defaults to 10 s. */
  failureAnnounceIntervalMs?: number;
  /** IANA time zone for target times. Defaults to UIProvider's `timeZone`. */
  timeZone?: string;
  className?: string;
  ref?: Ref<HTMLElement>;
}

type StatusFilter = 'all' | RolloutTargetStatus;
type StageState = 'done' | 'current' | 'upcoming';

const targetStatuses: readonly RolloutTargetStatus[] = [
  'failed',
  'running',
  'pending',
  'succeeded',
  'skipped',
];

const targetTones: Record<RolloutTargetStatus, Tone> = {
  pending: 'neutral',
  running: 'accent',
  succeeded: 'success',
  failed: 'danger',
  skipped: 'neutral',
};

const statusTones: Record<RolloutStatus, Tone> = {
  running: 'accent',
  paused: 'neutral',
  succeeded: 'success',
  failed: 'danger',
  'rolling-back': 'warning',
  'rolled-back': 'neutral',
};

const progressTones: Record<RolloutStatus, 'accent' | 'success' | 'warning' | 'danger'> = {
  running: 'accent',
  paused: 'accent',
  succeeded: 'success',
  failed: 'danger',
  'rolling-back': 'warning',
  'rolled-back': 'warning',
};

const stageClasses: Record<StageState, string> = {
  done: 'border-success-border bg-success-bg text-success-fg',
  current: 'border-accent-solid bg-accent-solid text-accent-on-solid',
  upcoming: 'border-border bg-surface-1 text-fg-muted',
};

function toTime(value: Date | number | string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? undefined : time;
}

function isSameTarget(a: RolloutTarget, b: RolloutTarget): boolean {
  return (
    a === b ||
    (a.id === b.id &&
      a.label === b.label &&
      a.status === b.status &&
      a.detail === b.detail &&
      toTime(a.at) === toTime(b.at))
  );
}

interface TargetRowProps {
  target: RolloutTarget;
  statusText: string;
  formatTime: (time: number) => string;
}

/** One target. Memoised on its fields, so an app that rebuilds every target object each tick stays cheap. */
const TargetRow = memo(
  function TargetRow({ target, statusText, formatTime }: TargetRowProps) {
    const at = toTime(target.at);
    return (
      <li
        data-target={target.id}
        data-status={target.status}
        className="flex flex-col gap-0.5 border-b border-border py-2 last:border-b-0"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5">
          <span className="min-w-0 flex-1 truncate font-medium">{target.label}</span>
          <StatusDot tone={targetTones[target.status]} size="sm" label={statusText} />
          {at !== undefined && (
            <time
              dateTime={new Date(at).toISOString()}
              className="text-xs text-fg-muted tabular-nums"
            >
              {formatTime(at)}
            </time>
          )}
        </div>
        {target.detail !== undefined && (
          <div
            className={cn(
              'min-w-0 text-xs wrap-anywhere',
              target.status === 'failed' ? 'text-danger-fg' : 'text-fg-muted',
            )}
          >
            {target.detail}
          </div>
        )}
      </li>
    );
  },
  (previous, next) =>
    previous.statusText === next.statusText &&
    previous.formatTime === next.formatTime &&
    isSameTarget(previous.target, next.target),
);

interface GroupView {
  key: string;
  name: string;
  done: number;
  total: number;
  failed: number;
  rows: RolloutTarget[];
}

function isSameRows(a: readonly RolloutTarget[], b: readonly RolloutTarget[]): boolean {
  return (
    a === b ||
    (a.length === b.length && a.every((target, index) => isSameTarget(target, b[index] ?? target)))
  );
}

interface TargetListProps {
  rows: readonly RolloutTarget[];
  statusTexts: Record<RolloutTargetStatus, string>;
  formatTime: (time: number) => string;
}

function TargetList({ rows, statusTexts, formatTime }: TargetListProps) {
  return (
    <ul className="flex flex-col">
      {rows.map((target) => (
        <TargetRow
          key={target.id}
          target={target}
          statusText={statusTexts[target.status]}
          formatTime={formatTime}
        />
      ))}
    </ul>
  );
}

interface TargetGroupProps extends TargetListProps {
  name: string;
  summary: string;
  hasFailures: boolean;
  isDefaultExpanded: boolean;
  headingLevel: HeadingLevel;
}

/** A collapsible group of targets. Memoised, so groups where nothing changed skip re-rendering. */
const TargetGroup = memo(
  function TargetGroup({
    name,
    summary,
    hasFailures,
    isDefaultExpanded,
    headingLevel,
    ...list
  }: TargetGroupProps) {
    return (
      <Disclosure
        headingLevel={headingLevel}
        defaultExpanded={isDefaultExpanded}
        title={
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span>{name}</span>
            <span
              className={cn(
                'text-xs tabular-nums',
                hasFailures ? 'font-medium text-danger-fg' : 'text-fg-muted',
              )}
            >
              {summary}
            </span>
          </span>
        }
        classNames={{ panel: 'pb-1' }}
      >
        <TargetList {...list} />
      </Disclosure>
    );
  },
  (previous, next) =>
    previous.name === next.name &&
    previous.summary === next.summary &&
    previous.hasFailures === next.hasFailures &&
    previous.headingLevel === next.headingLevel &&
    previous.statusTexts === next.statusTexts &&
    previous.formatTime === next.formatTime &&
    isSameRows(previous.rows, next.rows),
);

interface StatusFilterProps {
  value: StatusFilter;
  onChange: (value: StatusFilter) => void;
  counts: Record<RolloutTargetStatus, number>;
  total: number;
  label: string;
  allLabel: (params: { count: number }) => string;
  optionLabel: (params: { status: string; count: number }) => string;
  statusTexts: Record<RolloutTargetStatus, string>;
}

/** The status filter, with a count per status. Re-renders only when a count or the choice changes. */
const StatusFilterSelect = memo(
  function StatusFilterSelect({
    value,
    onChange,
    counts,
    total,
    label,
    allLabel,
    optionLabel,
    statusTexts,
  }: StatusFilterProps) {
    const options = [
      { id: 'all' as const, label: allLabel({ count: total }) },
      ...targetStatuses.map((status) => ({
        id: status,
        label: optionLabel({ status: statusTexts[status], count: counts[status] }),
      })),
    ];
    return (
      <Select
        label={label}
        size="sm"
        items={options}
        value={value}
        onChange={(next) => {
          onChange(next);
        }}
        className="w-full sm:w-60"
      >
        {(option) => <Option id={option.id}>{option.label}</Option>}
      </Select>
    );
  },
  (previous, next) =>
    previous.value === next.value &&
    previous.onChange === next.onChange &&
    previous.total === next.total &&
    previous.label === next.label &&
    previous.allLabel === next.allLabel &&
    previous.optionLabel === next.optionLabel &&
    previous.statusTexts === next.statusTexts &&
    targetStatuses.every((status) => previous.counts[status] === next.counts[status]),
);

/** The elapsed time, counting up while the rollout runs and frozen otherwise. */
function ElapsedTime({
  startedAt,
  elapsedMs,
  isRunning,
  label,
}: {
  startedAt: number | undefined;
  elapsedMs: number | undefined;
  isRunning: boolean;
  label: string;
}) {
  const labelId = useId();
  const state = useTimer({ direction: 'up', startedAt, elapsedMs, isPaused: !isRunning });
  return (
    <span className="inline-flex items-baseline gap-1.5 text-sm">
      <span id={labelId} className="text-fg-muted">
        {label}
      </span>
      <span
        role="timer"
        aria-live="off"
        aria-labelledby={labelId}
        className="font-medium tabular-nums"
      >
        {formatClock(state.elapsedMs, false)}
      </span>
    </span>
  );
}

/**
 * A staged rollout's progress: overall bar, elapsed time, controls, a stage stepper and the targets (filterable,
 * grouped, failed first). Rollback goes through a confirmation; failures are announced, throttled.
 */
export function RolloutProgress({
  title,
  status,
  stages,
  currentStageId,
  targets,
  onPause,
  onResume,
  onRollback,
  onRetryFailed,
  startedAt,
  endedAt,
  elapsedMs,
  headingLevel = 2,
  targetsMaxHeight = '28rem',
  failureAnnounceIntervalMs = 10_000,
  timeZone,
  className,
  ref,
}: RolloutProgressProps) {
  const messages = useEntryMessages(defaultRolloutProgressMessages);
  const { locale } = useLocale();
  const defaultTimeZone = useTimeZone();
  const zone = timeZone ?? defaultTimeZone;
  const titleId = useId();
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [isConfirmOpen, setConfirmOpen] = useState(false);

  const formatTime = useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      timeZone: zone,
    });
    return (time: number) => format.format(time);
  }, [locale, zone]);

  const statusTexts = useMemo(
    () =>
      Object.fromEntries(
        targetStatuses.map((value) => [value, messages.rolloutTargetStatus({ status: value })]),
      ) as Record<RolloutTargetStatus, string>,
    [messages],
  );

  const view = useMemo(() => {
    const counts: Record<RolloutTargetStatus, number> = {
      pending: 0,
      running: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
    };
    const groups = new Map<string, GroupView>();
    const groupOf = (target: RolloutTarget) => {
      const key = target.group ?? '';
      let group = groups.get(key);
      if (!group) {
        group = { key, name: target.group ?? '', done: 0, total: 0, failed: 0, rows: [] };
        groups.set(key, group);
      }
      return group;
    };
    for (const target of targets) {
      counts[target.status] += 1;
      const group = groupOf(target);
      group.total += 1;
      if (target.status === 'succeeded' || target.status === 'skipped') {
        group.done += 1;
      } else if (target.status === 'failed') {
        group.failed += 1;
      }
    }
    // Failed targets first (keeping the given order otherwise), then only those the filter shows.
    const ordered = [
      ...targets.filter((target) => target.status === 'failed'),
      ...targets.filter((target) => target.status !== 'failed'),
    ];
    for (const target of ordered) {
      if (filter === 'all' || target.status === filter) {
        groupOf(target).rows.push(target);
      }
    }
    const sections = [...groups.values()].filter((group) => group.rows.length > 0);
    // Groups with failures first; targets without a group last.
    sections.sort(
      (a, b) =>
        Number(b.failed > 0) - Number(a.failed > 0) || Number(a.key === '') - Number(b.key === ''),
    );
    return {
      counts,
      done: counts.succeeded + counts.skipped,
      hasGroups: targets.some((target) => target.group !== undefined),
      sections,
    };
  }, [targets, filter]);

  const statusText = messages.rolloutStatus({ status });
  const total = targets.length;

  // Polite announcements of status and stage changes ("adjust state while rendering", so nothing is announced on
  // mount).
  const [announced, setAnnounced] = useState({ status, stageId: currentStageId });
  const [politeText, setPoliteText] = useState('');
  if (announced.status !== status || announced.stageId !== currentStageId) {
    const parts: string[] = [];
    if (announced.status !== status) {
      parts.push(messages.rolloutStatusChanged({ status: statusText }));
    }
    const stage = stages?.find((candidate) => candidate.id === currentStageId);
    if (announced.stageId !== currentStageId && stage) {
      parts.push(messages.rolloutStageStarted({ stage: stage.label }));
    }
    setAnnounced({ status, stageId: currentStageId });
    if (parts.length > 0) {
      setPoliteText(parts.join('. '));
    }
  }

  // Assertive failure announcements: a new failure is announced at once, unless one was announced less than the
  // interval ago; then it waits, batched with any others, until the interval has passed.
  const knownFailedRef = useRef<Set<string> | null>(null);
  const pendingFailuresRef = useRef<string[]>([]);
  const isFlushScheduledRef = useRef(false);
  const lastFailureAnnouncementRef = useRef(-Infinity);
  const [failureText, setFailureText] = useState('');
  const failureTimer = useDeadlineTimer(() => {
    isFlushScheduledRef.current = false;
    const pending = pendingFailuresRef.current;
    if (pending.length === 0) {
      return;
    }
    pendingFailuresRef.current = [];
    lastFailureAnnouncementRef.current = Date.now();
    setFailureText(
      messages.rolloutTargetsFailed({
        count: pending.length,
        names: new Intl.ListFormat(locale, { type: 'conjunction' }).format(pending.slice(0, 3)),
      }),
    );
  });
  useEffect(() => {
    const failed = targets.filter((target) => target.status === 'failed');
    const known = knownFailedRef.current;
    knownFailedRef.current = new Set(failed.map((target) => target.id));
    if (known === null) {
      return;
    }
    const fresh = failed.filter((target) => !known.has(target.id));
    if (fresh.length === 0) {
      return;
    }
    pendingFailuresRef.current.push(...fresh.map((target) => target.label));
    if (!isFlushScheduledRef.current) {
      isFlushScheduledRef.current = true;
      failureTimer.start(
        Math.max(0, lastFailureAnnouncementRef.current + failureAnnounceIntervalMs - Date.now()),
      );
    }
  }, [targets, failureTimer, failureAnnounceIntervalMs]);

  const startedMs = toTime(startedAt);
  const endedMs = toTime(endedAt);
  const isActive = status === 'running' || status === 'rolling-back';
  const shownElapsed =
    elapsedMs ??
    (startedMs !== undefined && endedMs !== undefined ? endedMs - startedMs : undefined);
  const hasElapsed = startedMs !== undefined || shownElapsed !== undefined;

  const canPause = status === 'running' && onPause !== undefined;
  const canResume = status === 'paused' && onResume !== undefined;
  const canRetry =
    view.counts.failed > 0 &&
    onRetryFailed !== undefined &&
    status !== 'rolling-back' &&
    status !== 'rolled-back';
  const canRollback =
    onRollback !== undefined && status !== 'rolling-back' && status !== 'rolled-back';

  const currentStageIndex = stages?.findIndex((stage) => stage.id === currentStageId) ?? -1;
  const stageState = (index: number): StageState =>
    status === 'succeeded' || index < currentStageIndex
      ? 'done'
      : index === currentStageIndex
        ? 'current'
        : 'upcoming';
  const percentFormat = new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
  });

  return (
    <section
      ref={ref}
      aria-labelledby={titleId}
      data-status={status}
      className={cn(
        'flex min-w-0 flex-col gap-4 rounded-card border border-border bg-surface-1 p-4 text-sm text-fg',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Heading id={titleId} level={headingLevel} size="md">
            {title}
          </Heading>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Badge variant="soft" tone={statusTones[status]}>
              {statusText}
            </Badge>
            {hasElapsed && (
              <ElapsedTime
                startedAt={startedMs}
                elapsedMs={shownElapsed}
                isRunning={isActive && endedMs === undefined}
                label={messages.rolloutElapsed}
              />
            )}
          </div>
        </div>
        {(canPause || canResume || canRetry || canRollback) && (
          <div className="flex flex-wrap gap-2">
            {canPause && (
              <Button size="sm" variant="outline" icon={Pause} onPress={onPause}>
                {messages.rolloutPause}
              </Button>
            )}
            {canResume && (
              <Button size="sm" variant="outline" icon={Play} onPress={onResume}>
                {messages.rolloutResume}
              </Button>
            )}
            {canRetry && (
              <Button size="sm" variant="outline" icon={RotateCw} onPress={onRetryFailed}>
                {messages.rolloutRetryFailed({ count: view.counts.failed })}
              </Button>
            )}
            {canRollback && (
              <Button
                size="sm"
                variant="outline"
                tone="danger"
                icon={Undo2}
                onPress={() => {
                  setConfirmOpen(true);
                }}
              >
                {messages.rolloutRollback}
              </Button>
            )}
          </div>
        )}
      </div>

      <ProgressBar
        aria-labelledby={titleId}
        value={view.done}
        minValue={0}
        maxValue={Math.max(1, total)}
        valueLabel={messages.rolloutProgress({
          done: view.done,
          total,
          failed: view.counts.failed,
        })}
        tone={progressTones[status]}
      />

      {stages && stages.length > 0 && (
        <ol aria-label={messages.rolloutStages} className="flex flex-wrap items-center gap-y-2">
          {stages.map((stage, index) => {
            const state = stageState(index);
            return (
              <li
                key={stage.id}
                aria-current={state === 'current' ? 'step' : undefined}
                className="flex items-center"
              >
                {index > 0 && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'h-px w-3 sm:w-6',
                      state === 'upcoming' ? 'bg-border-strong' : 'bg-success-solid',
                    )}
                  />
                )}
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap',
                    stageClasses[state],
                  )}
                >
                  {state === 'done' && <Check aria-hidden="true" className="size-3.5" />}
                  <span>{stage.label}</span>
                  {stage.percent !== undefined && (
                    <span className="tabular-nums">
                      {percentFormat.format(stage.percent / 100)}
                    </span>
                  )}
                  <span className="sr-only">{messages.rolloutStageState({ state })}</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="flex min-w-0 flex-col gap-2">
        <StatusFilterSelect
          value={filter}
          onChange={setFilter}
          counts={view.counts}
          total={total}
          label={messages.rolloutFilter}
          allLabel={messages.rolloutFilterAll}
          optionLabel={messages.rolloutFilterOption}
          statusTexts={statusTexts}
        />
        <ScrollRegion
          aria-label={messages.rolloutTargets}
          maxHeight={targetsMaxHeight}
          className="px-3 py-1"
        >
          {view.sections.length === 0 ? (
            <p className="py-2 text-fg-muted">{messages.noResults}</p>
          ) : view.hasGroups ? (
            <div className="flex flex-col divide-y divide-border">
              {view.sections.map((group) => (
                <TargetGroup
                  key={group.key}
                  name={group.name === '' ? messages.rolloutUngrouped : group.name}
                  summary={messages.rolloutGroupSummary({
                    done: group.done,
                    total: group.total,
                    failed: group.failed,
                  })}
                  hasFailures={group.failed > 0}
                  isDefaultExpanded={group.failed > 0 || view.sections.length === 1}
                  headingLevel={Math.min(6, headingLevel + 1) as HeadingLevel}
                  rows={group.rows}
                  statusTexts={statusTexts}
                  formatTime={formatTime}
                />
              ))}
            </div>
          ) : (
            <TargetList
              rows={view.sections[0]?.rows ?? []}
              statusTexts={statusTexts}
              formatTime={formatTime}
            />
          )}
        </ScrollRegion>
      </div>

      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {politeText}
      </span>
      <span className="sr-only" aria-live="assertive" aria-atomic="true">
        {failureText}
      </span>

      {onRollback !== undefined && (
        <ConfirmDialog
          isOpen={isConfirmOpen}
          onOpenChange={setConfirmOpen}
          tone="danger"
          title={messages.rolloutRollbackTitle}
          body={messages.rolloutRollbackBody({ done: view.done })}
          confirmLabel={messages.rolloutRollbackConfirm}
          onConfirm={onRollback}
        />
      )}
    </section>
  );
}
