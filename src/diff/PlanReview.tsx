// PlanReview: an infrastructure plan (Terraform-style resource changes, a CDN or DNS change set) reviewed before it's
// applied. A summary with destroys stressed, filters by action and type, each change expanding to a structural diff
// with unknown and sensitive values marked, and Apply behind a confirmation that asks for a typed word when the plan
// destroys or replaces anything.

import { Eye, EyeOff } from 'lucide-react';
import { useId, useMemo, useState, type ReactNode, type Ref } from 'react';
import { Badge } from '../components/Badge/Badge';
import { Banner } from '../components/Banner/Banner';
import { Button } from '../components/Button/Button';
import { Code } from '../components/Code/Code';
import { ConfirmDialog } from '../components/ConfirmDialog/ConfirmDialog';
import { DialogTrigger } from '../components/Dialog/Dialog';
import { Disclosure } from '../components/Disclosure/Disclosure';
import { Option } from '../components/ListBox/ListBoxParts';
import { Select } from '../components/Select/Select';
import { Heading } from '../components/Text/Text';
import { cn } from '../utils/cn';
import type { HeadingLevel, Tone } from '../utils/types';
import { DiffViewer } from './DiffViewer';
import { useDiffMessages, type DiffStrings, type PlanAction } from './messages';
import { countPlan, isDestructivePlan, planDiffTexts, type PlannedChange } from './plan';

const ACTIONS: readonly PlanAction[] = ['create', 'update', 'replace', 'delete', 'read', 'no-op'];
const ALL = '\u0000all';

/** The plan's conventional marks, hidden from screen readers (the action is spelled out beside them). */
const actionMarks: Record<PlanAction, string> = {
  create: '+',
  update: '~',
  replace: '−/+',
  delete: '−',
  read: '<=',
  'no-op': '·',
};

const actionClasses: Record<PlanAction, string> = {
  create: 'text-success-fg',
  update: 'text-warning-fg',
  replace: 'font-semibold text-danger-fg',
  delete: 'font-semibold text-danger-fg',
  read: 'text-info-fg',
  'no-op': 'text-fg-muted',
};

export interface PlanReviewProps {
  changes: readonly PlannedChange[];
  /** The heading above the summary. Defaults to the `planTitle` message ("Planned changes"). */
  title?: ReactNode;
  /** The title's heading level. Defaults to 2; each change's heading is one level below. */
  headingLevel?: Exclude<HeadingLevel, 6>;
  /**
   * Applies the plan, after the user confirms. While its promise is pending the dialog shows progress; a rejection
   * shows its message in the dialog. Without it there's no Apply button.
   */
  onApply?: () => void | Promise<void>;
  /** Requires typing a word (the `planConfirmText` message, "apply") when anything is destroyed or replaced. Defaults to true. */
  shouldConfirmDestructive?: boolean;
  /** Overrides the word typed to confirm a destructive apply. */
  confirmText?: string;
  /** Ids of the changes expanded at first, such as the replacements. */
  defaultExpandedIds?: readonly string[];
  /** Warnings from the planner, shown above the changes. */
  warnings?: readonly ReactNode[];
  className?: string;
  ref?: Ref<HTMLElement>;
}

/** Reviews a plan of resource changes: summary, filters, a structural diff per change, and a confirmed Apply. */
export function PlanReview({
  changes,
  title,
  headingLevel = 2,
  onApply,
  shouldConfirmDestructive = true,
  confirmText,
  defaultExpandedIds = [],
  warnings = [],
  className,
  ref,
}: PlanReviewProps) {
  const messages = useDiffMessages();
  const titleId = useId();
  const counts = useMemo(() => countPlan(changes), [changes]);
  const isDestructive = useMemo(() => isDestructivePlan(changes), [changes]);
  const summary = messages.planSummary(counts);
  const hasChanges = changes.some((change) => change.action !== 'no-op');

  const [actionFilter, setActionFilter] = useState<string>(ALL);
  const [typeFilter, setTypeFilter] = useState<string>(ALL);
  const presentActions = ACTIONS.filter((action) =>
    changes.some((change) => change.action === action),
  );
  const types = useMemo(() => [...new Set(changes.map((change) => change.type))].sort(), [changes]);
  const shown = changes.filter(
    (change) =>
      (actionFilter === ALL || change.action === actionFilter) &&
      (typeFilter === ALL || change.type === typeFilter),
  );

  const countBadges: { key: string; text: string; tone: Tone; isStressed?: boolean }[] = [
    { key: 'add', text: messages.planToAdd({ count: counts.add }), tone: 'success' },
    { key: 'change', text: messages.planToChange({ count: counts.change }), tone: 'warning' },
    ...(counts.replace > 0
      ? [
          {
            key: 'replace',
            text: messages.planToReplace({ count: counts.replace }),
            tone: 'danger' as const,
            isStressed: true,
          },
        ]
      : []),
    {
      key: 'destroy',
      text: messages.planToDestroy({ count: counts.destroy }),
      tone: counts.destroy > 0 ? 'danger' : 'neutral',
      isStressed: counts.destroy > 0,
    },
    ...(counts.read > 0
      ? [
          {
            key: 'read',
            text: messages.planToRead({ count: counts.read }),
            tone: 'neutral' as const,
          },
        ]
      : []),
  ];

  return (
    <section
      ref={ref}
      aria-labelledby={titleId}
      className={cn('flex min-w-0 flex-col gap-4 text-fg', className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <Heading level={headingLevel} id={titleId}>
            {title ?? messages.planTitle}
          </Heading>
          {hasChanges ? (
            <p role="status" className="m-0">
              <span className="sr-only">{summary}</span>
              <span aria-hidden="true" className="flex flex-wrap gap-2">
                {countBadges.map((badge) => (
                  <Badge
                    key={badge.key}
                    size="md"
                    variant={badge.isStressed === true ? 'solid' : 'soft'}
                    tone={badge.tone}
                    className={badge.isStressed === true ? 'font-semibold' : undefined}
                  >
                    {badge.text}
                  </Badge>
                ))}
              </span>
            </p>
          ) : (
            <p role="status" className="m-0 text-sm text-fg-muted">
              {messages.planNoChanges}
            </p>
          )}
        </div>
        {onApply && hasChanges && (
          <DialogTrigger>
            <Button tone={isDestructive ? 'danger' : 'accent'}>{messages.planApply}</Button>
            <ConfirmDialog
              title={messages.planApplyTitle}
              body={summary}
              consequence={
                isDestructive
                  ? messages.planApplyConsequence({
                      destroy: counts.destroy,
                      replace: counts.replace,
                    })
                  : undefined
              }
              tone={isDestructive ? 'danger' : 'neutral'}
              confirmLabel={messages.planApply}
              confirmText={
                isDestructive && shouldConfirmDestructive
                  ? (confirmText ?? messages.planConfirmText)
                  : undefined
              }
              onConfirm={onApply}
            />
          </DialogTrigger>
        )}
      </div>

      {warnings.length > 0 && (
        <Banner tone="warning" title={messages.planWarnings({ count: warnings.length })}>
          {warnings.length === 1 ? (
            warnings[0]
          ) : (
            <ul className="m-0 list-disc ps-5">
              {warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          )}
        </Banner>
      )}

      {changes.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label={messages.planFilterAction}
              value={actionFilter}
              onChange={(key) => {
                setActionFilter(key);
              }}
            >
              <Option id={ALL}>{messages.planAllActions}</Option>
              {presentActions.map((action) => (
                <Option key={action} id={action}>
                  {messages.planActionNames[action]}
                </Option>
              ))}
            </Select>
            <Select
              label={messages.planFilterType}
              value={typeFilter}
              onChange={(key) => {
                setTypeFilter(key);
              }}
            >
              <Option id={ALL}>{messages.planAllTypes}</Option>
              {types.map((type) => (
                <Option key={type} id={type}>
                  {type}
                </Option>
              ))}
            </Select>
          </div>
          <p aria-live="polite" className="m-0 text-sm text-fg-muted">
            {messages.planShowing({ shown: shown.length, total: changes.length })}
          </p>
          {shown.length === 0 ? (
            <p className="m-0 text-sm">{messages.planNoMatches}</p>
          ) : (
            <ul className="m-0 flex list-none flex-col divide-y divide-border rounded-card border border-border bg-surface-1 p-0">
              {shown.map((change) => (
                <li key={change.id} data-action={change.action} className="min-w-0 px-3">
                  <PlanChangeItem
                    change={change}
                    messages={messages}
                    defaultExpanded={defaultExpandedIds.includes(change.id)}
                    headingLevel={(headingLevel + 1) as HeadingLevel}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function PlanChangeItem({
  change,
  messages,
  headingLevel,
  defaultExpanded,
}: {
  change: PlannedChange;
  messages: DiffStrings;
  headingLevel: HeadingLevel;
  defaultExpanded: boolean;
}) {
  const [isExpanded, setExpanded] = useState(defaultExpanded);
  const [isRevealed, setRevealed] = useState(false);
  const forces = change.action === 'replace' ? (change.forcesReplacement ?? []) : [];
  const isSensitive = change.isSensitive === true;
  const texts = useMemo(
    () =>
      isExpanded
        ? planDiffTexts(
            change,
            {
              knownAfterApply: messages.planKnownAfterApply,
              sensitiveValue: messages.planSensitiveValue,
              sensitiveChanged: messages.planSensitiveChanged,
            },
            { isRevealed },
          )
        : undefined,
    [change, messages, isExpanded, isRevealed],
  );

  return (
    <Disclosure
      headingLevel={headingLevel}
      isExpanded={isExpanded}
      onExpandedChange={setExpanded}
      title={
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
          <span
            aria-hidden="true"
            className={cn('w-[3ch] shrink-0 font-mono', actionClasses[change.action])}
          >
            {actionMarks[change.action]}
          </span>
          <span className="min-w-0 font-mono [overflow-wrap:anywhere]">{change.address}</span>
          <span className={cn('text-sm', actionClasses[change.action])}>
            {messages.planWill[change.action]}
          </span>
          {forces.length > 0 && (
            <Badge tone="danger" variant="outline">
              {messages.planForcesReplacement}
            </Badge>
          )}
          {isSensitive && <Badge tone="neutral">{messages.planSensitive}</Badge>}
        </span>
      }
    >
      <div className="flex min-w-0 flex-col gap-3">
        {forces.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className="m-0 font-medium text-danger-fg">
              {messages.planReplacementCause({ count: forces.length })}
            </p>
            <ul className="m-0 flex list-none flex-wrap gap-1 p-0">
              {forces.map((path) => (
                <li key={path}>
                  <Code>{path}</Code>
                </li>
              ))}
            </ul>
          </div>
        )}
        {isSensitive && (
          <div>
            <Button
              variant="outline"
              size="sm"
              icon={isRevealed ? EyeOff : Eye}
              onPress={() => {
                setRevealed(!isRevealed);
              }}
            >
              {isRevealed ? messages.planHideSensitive : messages.planShowSensitive}
            </Button>
          </div>
        )}
        {texts && (
          <DiffViewer
            before={texts.before}
            after={texts.after}
            language="json"
            beforeLabel={messages.planBefore}
            afterLabel={messages.planAfter}
            aria-label={change.address}
            maxHeight="28rem"
          />
        )}
      </div>
    </Disclosure>
  );
}
