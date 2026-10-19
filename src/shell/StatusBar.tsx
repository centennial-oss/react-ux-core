import { useId, useState, type Ref } from 'react';
import { Button as AriaButton, useLocale } from 'react-aria-components';
import { Button } from '../components/Button/Button';
import { Popover, PopoverTrigger } from '../components/Popover/Popover';
import { RelativeTime } from '../components/RelativeTime/RelativeTime';
import { StatusDot } from '../components/StatusDot/StatusDot';
import { useTimeZone } from '../provider/context';

import { cn } from '../utils/cn';
import { dateTimeFormat } from '../utils/intl';
import { hoverSurfaceClasses } from '../utils/stateClasses';
import { toEpochMs } from '../utils/time';
import type { Tone } from '../utils/types';
import { useShell, useShellLayout } from './ShellContext';
import type { Severity, StatusAlert, StatusCategory } from './types';
import { useShellMessages, type ShellStrings } from './messages';

const severityTone: Record<Severity, Tone> = {
  ok: 'success',
  warning: 'warning',
  error: 'danger',
  unknown: 'neutral',
};

const severityRank: Record<Severity, number> = { ok: 0, unknown: 1, warning: 2, error: 3 };

/** The worst of the severities (error, then warning, then unknown, then ok). */
export function worstSeverity(severities: readonly Severity[]): Severity {
  return severities.reduce<Severity>(
    (worst, next) => (severityRank[next] > severityRank[worst] ? next : worst),
    'ok',
  );
}

function severityLabel(messages: ShellStrings, severity: Severity): string {
  return {
    ok: messages.severityOk,
    warning: messages.severityWarning,
    error: messages.severityError,
    unknown: messages.severityUnknown,
  }[severity];
}

/** Alerts worst first, then newest first. */
export function sortAlerts(alerts: readonly StatusAlert[]): StatusAlert[] {
  const time = (alert: StatusAlert) => (alert.at === undefined ? 0 : toEpochMs(alert.at));
  return [...alerts].sort(
    (a, b) => severityRank[b.severity] - severityRank[a.severity] || time(b) - time(a),
  );
}

function alertCount(category: StatusCategory): number {
  return category.alerts.reduce((total, alert) => total + (alert.count ?? 1), 0);
}

export interface StatusBarProps {
  categories: readonly StatusCategory[];
  /** When the statuses were last updated. */
  updatedAt?: Date | number | string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/**
 * A row of status categories (for example Meters, Billing, Integrations), each a button showing its severity that
 * opens a list of its alerts. On phones it collapses to one dot with the worst severity, which opens every list in
 * a sheet.
 */
export function StatusBar({ categories, updatedAt, className, ref }: StatusBarProps) {
  const messages = useShellMessages();
  const shell = useShell();
  const ownLayout = useShellLayout();
  const isPhone = (shell?.layout ?? ownLayout) === 'phone';
  const worst = worstSeverity(categories.map((category) => category.severity));
  // Announce when things get worse (not on every update): the live region below speaks the new overall status.
  const [previousWorst, setPreviousWorst] = useState(worst);
  const [announcement, setAnnouncement] = useState('');
  if (worst !== previousWorst) {
    setPreviousWorst(worst);
    if (severityRank[worst] > severityRank[previousWorst]) {
      setAnnouncement(messages.overallStatus({ severity: severityLabel(messages, worst) }));
    }
  }
  const liveRegion = (
    <span role="status" className="sr-only">
      {announcement}
    </span>
  );
  if (categories.length === 0) {
    return liveRegion;
  }
  if (isPhone) {
    // Worst first in the sheet.
    const ordered = [...categories].sort(
      (a, b) => severityRank[b.severity] - severityRank[a.severity],
    );
    const label = messages.overallStatus({ severity: severityLabel(messages, worst) });
    return (
      <div ref={ref} className={className}>
        {liveRegion}
        <PopoverTrigger>
          <AriaButton
            aria-label={label}
            className={cn(
              'hit-area flex size-9 items-center justify-center rounded-control outline-none data-focus-visible:focus-ring',
              hoverSurfaceClasses,
            )}
          >
            <StatusDot tone={severityTone[worst]} label={label} isLabelHidden />
          </AriaButton>
          <Popover aria-label={messages.status}>
            <div className="flex flex-col gap-4">
              {ordered.map((category) => (
                <CategoryAlerts key={category.id} category={category} />
              ))}
              <AsOf updatedAt={updatedAt} />
            </div>
          </Popover>
        </PopoverTrigger>
      </div>
    );
  }
  return (
    <div
      ref={ref}
      role="group"
      aria-label={messages.status}
      className={cn('flex min-w-0 items-center gap-1', className)}
    >
      {liveRegion}
      {categories.map((category) => {
        const severity = severityLabel(messages, category.severity);
        const count = alertCount(category);
        const Icon = category.icon;
        return (
          <PopoverTrigger key={category.id}>
            <AriaButton
              aria-label={messages.statusCategory({ label: category.label, severity, count })}
              className={cn(
                'hit-area flex h-8 items-center gap-1.5 rounded-control px-2 text-sm text-fg outline-none data-focus-visible:focus-ring',
                hoverSurfaceClasses,
              )}
            >
              <StatusDot tone={severityTone[category.severity]} label={severity} isLabelHidden />
              {Icon && <Icon aria-hidden="true" className="size-4 text-fg-muted" />}
              <span className="hidden lg:inline">{category.label}</span>
              {count > 0 && (
                // The count is in the button's name already; shown as generated content, it isn't visible text
                // that the name would have to repeat word for word (WCAG 2.5.3).
                <span
                  aria-hidden="true"
                  data-count={count}
                  className="text-xs font-medium text-fg-muted tabular-nums before:content-[attr(data-count)]"
                />
              )}
            </AriaButton>
            <Popover aria-label={category.label}>
              <div className="flex w-80 max-w-full flex-col gap-3">
                <CategoryAlerts category={category} />
                <AsOf updatedAt={updatedAt} />
              </div>
            </Popover>
          </PopoverTrigger>
        );
      })}
    </div>
  );
}

function AsOf({ updatedAt }: { updatedAt: Date | number | string | undefined }) {
  const messages = useShellMessages();
  const { locale } = useLocale();
  const timeZone = useTimeZone();
  if (updatedAt === undefined) {
    return null;
  }
  const time = dateTimeFormat(locale, { timeStyle: 'short', timeZone }).format(
    toEpochMs(updatedAt),
  );
  return <p className="text-xs text-fg-muted">{messages.asOf({ time })}</p>;
}

function CategoryAlerts({ category }: { category: StatusCategory }) {
  const messages = useShellMessages();
  const headingId = useId();
  const severity = severityLabel(messages, category.severity);
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h2 id={headingId} className="flex items-center gap-2 text-sm font-semibold">
        <StatusDot tone={severityTone[category.severity]} label={severity} isLabelHidden />
        {category.label}
        <span className="sr-only">{severity}</span>
      </h2>
      {category.alerts.length === 0 ? (
        <p className="text-sm text-fg-muted">{messages.noAlerts}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {sortAlerts(category.alerts).map((alert) => (
            <AlertLine key={alert.id} alert={alert} />
          ))}
        </ul>
      )}
    </section>
  );
}

function AlertLine({ alert }: { alert: StatusAlert }) {
  const messages = useShellMessages();
  return (
    <li className="flex items-start gap-2 py-2 text-sm">
      <span className="pt-1">
        <StatusDot
          tone={severityTone[alert.severity]}
          label={severityLabel(messages, alert.severity)}
          isLabelHidden
          size="sm"
        />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-fg">
          {alert.text}
          {alert.count !== undefined && (
            <span className="ms-1.5 text-xs font-medium text-fg-muted tabular-nums">
              {`×${String(alert.count)}`}
            </span>
          )}
        </span>
        {alert.at !== undefined && (
          <span className="text-xs text-fg-muted">
            <RelativeTime value={alert.at} />
          </span>
        )}
      </div>
      {alert.action && (
        <Button size="sm" variant="link" onPress={alert.action.onPress} className="shrink-0">
          {alert.action.label}
        </Button>
      )}
    </li>
  );
}
