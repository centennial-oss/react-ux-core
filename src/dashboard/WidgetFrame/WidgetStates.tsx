// What a widget frame shows in place of the widget (§7.4): not set up, loading, empty, failed, crashed, an unknown
// type, and the lightweight edit-mode placeholder (WID-11). Each fills the frame's body.

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Bug, CircleHelp, Settings2, RotateCw } from 'lucide-react';
import { Button } from '../../components/Button/Button';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { ErrorState } from '../../components/ErrorState/ErrorState';
import { Skeleton } from '../../components/Skeleton/Skeleton';
import type { IconComponent } from '../../utils/icon';
import type { HeadingLevel } from '../../utils/types';
import type { DashboardStrings } from '../messages';

// States without a control are clipped; those with one (Configure, Retry) scroll, the control giving keyboard access.
const bodyClasses = 'flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden';
const scrollingBodyClasses =
  'flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto';
// States sit inside a widget's region, under its title.
const stateHeading = (level: HeadingLevel) => Math.min(level + 1, 6) as HeadingLevel;

/** A placeholder in the frame's shape while the first load runs, or before the widget comes into view (WID-16). */
export function WidgetLoading() {
  return (
    <div aria-hidden="true" className="flex min-h-0 flex-1 flex-col gap-2 p-3">
      <Skeleton shape="text" width="40%" />
      <Skeleton shape="rect" className="min-h-0 w-full flex-1" />
    </div>
  );
}

/** A widget that isn't set up yet: Configure for editors, a neutral note for viewers. */
export function WidgetUnconfigured({
  messages,
  onConfigure,
  headingLevel,
}: {
  messages: DashboardStrings;
  onConfigure?: () => void;
  headingLevel: HeadingLevel;
}) {
  return (
    <div className={onConfigure ? scrollingBodyClasses : bodyClasses}>
      <EmptyState
        icon={Settings2}
        headingLevel={stateHeading(headingLevel)}
        title={messages.unconfiguredTitle}
        hint={onConfigure ? messages.unconfiguredEditorHint : messages.unconfiguredViewerHint}
        action={
          onConfigure ? (
            <Button variant="outline" size="sm" icon={Settings2} onPress={onConfigure}>
              {messages.configure}
            </Button>
          ) : undefined
        }
        className="py-4"
      />
    </div>
  );
}

/** Loaded, with nothing to show. */
export function WidgetEmpty({
  title,
  headingLevel,
}: {
  title: ReactNode;
  headingLevel: HeadingLevel;
}) {
  return (
    <div className={bodyClasses}>
      <EmptyState headingLevel={stateHeading(headingLevel)} title={title} className="py-4" />
    </div>
  );
}

/** The load failed: the message, Retry, and the technical details collapsed (DATA-13). */
export function WidgetError({
  messages,
  description,
  details,
  onRetry,
  headingLevel,
}: {
  messages: DashboardStrings;
  description?: ReactNode;
  details?: ReactNode;
  onRetry: () => void;
  headingLevel: HeadingLevel;
}) {
  return (
    <div className={scrollingBodyClasses}>
      <ErrorState
        headingLevel={stateHeading(headingLevel)}
        title={messages.widgetLoadFailed}
        description={description}
        details={details}
        onRetry={onRetry}
        className="py-4"
      />
    </div>
  );
}

/** The widget's render threw: isolated, with Reload widget (WID-13). */
export function WidgetCrashed({
  messages,
  details,
  onReload,
  headingLevel,
}: {
  messages: DashboardStrings;
  details?: ReactNode;
  onReload: () => void;
  headingLevel: HeadingLevel;
}) {
  return (
    <div className={scrollingBodyClasses}>
      <ErrorState
        icon={Bug}
        headingLevel={stateHeading(headingLevel)}
        title={messages.widgetCrashed}
        description={messages.widgetCrashedHint}
        details={details}
        className="py-4"
      />
      <Button variant="outline" size="sm" icon={RotateCw} onPress={onReload} className="mb-4">
        {messages.reloadWidget}
      </Button>
    </div>
  );
}

/** A widget whose type isn't registered: named, with its settings kept (WID-19). */
export function WidgetUnknownType({
  messages,
  type,
  headingLevel,
}: {
  messages: DashboardStrings;
  type: string;
  headingLevel: HeadingLevel;
}) {
  return (
    <div className={bodyClasses}>
      <EmptyState
        icon={CircleHelp}
        headingLevel={stateHeading(headingLevel)}
        title={messages.unknownWidgetType({ type })}
        hint={messages.unknownWidgetTypeHint}
        className="py-4"
      />
    </div>
  );
}

/** The edit-mode placeholder for heavy widgets (WID-11): the type's icon, the title and the size. */
export function WidgetPlaceholder({
  icon: Icon,
  title,
  size,
}: {
  icon?: IconComponent;
  title: string;
  size: string;
}) {
  return (
    <div className="m-2 flex min-h-0 flex-1 flex-col items-center justify-center gap-1 rounded-control border border-dashed border-border-strong bg-surface-1 p-2 text-center">
      {Icon && <Icon aria-hidden="true" className="size-6 text-fg-muted" />}
      <span className="max-w-full truncate text-sm font-medium">{title}</span>
      <span className="text-xs text-fg-muted tabular-nums">{size}</span>
    </div>
  );
}

interface WidgetErrorBoundaryProps {
  /** Called once per crash, with React's component stack. */
  onError: (error: unknown, info: ErrorInfo) => void;
  /** What to show instead of the crashed widget; `reset` renders it again. */
  fallback: (error: unknown, reset: () => void) => ReactNode;
  children: ReactNode;
}

interface WidgetErrorBoundaryState {
  error: { value: unknown } | null;
}

/** Contains a widget's render errors, so one widget can't take down the others or the shell (WID-13). */
export class WidgetErrorBoundary extends Component<
  WidgetErrorBoundaryProps,
  WidgetErrorBoundaryState
> {
  override state: WidgetErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): WidgetErrorBoundaryState {
    return { error: { value: error } };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    this.props.onError(error, info);
  }

  private readonly reset = () => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    return this.state.error
      ? this.props.fallback(this.state.error.value, this.reset)
      : this.props.children;
  }
}
