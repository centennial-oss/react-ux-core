import { Clock, Lock, TriangleAlert } from 'lucide-react';
import { useId, type ReactNode, type Ref } from 'react';
import { Focusable, useLocale } from 'react-aria-components';
import { Button } from '../../components/Button/Button';
import { IconButton } from '../../components/IconButton/IconButton';
import { MenuItem, MenuSeparator } from '../../components/Menu/Menu';
import { OverflowMenu } from '../../components/Menu/MenuButtons';
import { formatRelativeTime } from '../../components/RelativeTime/RelativeTime';
import { Spinner } from '../../components/Spinner/Spinner';
import { Tooltip } from '../../components/Tooltip/Tooltip';
import { cn } from '../../utils/cn';
import type { IconComponent } from '../../utils/icon';
import { useNow } from '../../utils/timers';
import type { HeadingLevel } from '../../utils/types';
import { useDashboardMessages } from '../messages';
import type { DashboardMode, WidgetAction } from '../types';

export interface WidgetFrameProps {
  /** The widget's title: its heading, and the accessible name of its region (WID-07). */
  title: string;
  /** Keeps the title for screen readers only; the region stays labelled. */
  isTitleHidden?: boolean;
  icon?: IconComponent;
  /** In edit mode the body ignores the pointer (WID-11) and setup issues and locks show. Defaults to `view`. */
  mode?: DashboardMode;
  /** The single action menu's items: standard, the widget type's and the host's, in that order (WID-08). */
  actions?: readonly WidgetAction[];
  /** When the data last arrived, shown at the top of the menu (WID-09). */
  updatedAt?: Date;
  /** Data is reloading with the earlier data still shown (WID-09). */
  isRefreshing?: boolean;
  /** A refresh failed and the earlier data is still shown (DATA-09): the indicator retries. */
  onRefreshErrorRetry?: () => void;
  /** Shows a lock in edit mode (EDIT-21). */
  isLocked?: boolean;
  /** The widget's options or data binding are incomplete (WID-10): edit mode shows a button that opens Configure. */
  hasSetupIssue?: boolean;
  onConfigure?: () => void;
  /** Accents the frame, as when the consolidated legend highlights a series it shows (CTX-12). */
  isHighlighted?: boolean;
  /** Explains something about the widget beside its title, such as its own time range (CTX-06). */
  titleNote?: string;
  /** Defaults to 3. */
  headingLevel?: HeadingLevel;
  children?: ReactNode;
  className?: string;
  ref?: Ref<HTMLElement>;
}

/**
 * The chrome around a dashboard widget: a labelled region with its title, a single action menu (refresh, configure,
 * expand and the edit actions, plus the widget type's and the host's), a subtle refreshing indicator, and in edit mode
 * its lock and setup status. The body takes the rest of the frame.
 */
export function WidgetFrame({
  title,
  isTitleHidden = false,
  icon: Icon,
  mode = 'view',
  actions = [],
  updatedAt,
  isRefreshing = false,
  onRefreshErrorRetry,
  isLocked = false,
  hasSetupIssue = false,
  onConfigure,
  isHighlighted = false,
  titleNote,
  headingLevel = 3,
  children,
  className,
  ref,
}: WidgetFrameProps) {
  const messages = useDashboardMessages();
  const { locale } = useLocale();
  const titleId = useId();
  const Heading = `h${String(headingLevel)}` as 'h3';
  const isEditing = mode === 'edit';
  const now = useNow();

  const groups = [
    actions.filter((action) => action.tone !== 'danger'),
    actions.filter((action) => action.tone === 'danger'),
  ].filter((group) => group.length > 0);

  return (
    <section
      ref={ref}
      aria-labelledby={titleId}
      data-highlighted={isHighlighted || undefined}
      className={cn(
        'flex size-full min-h-0 min-w-0 flex-col overflow-hidden rounded-card border bg-surface-2 text-fg shadow-raised',
        isHighlighted ? 'border-accent-border ring-2 ring-accent-solid' : 'border-border',
        className,
      )}
    >
      <div
        className={cn(
          'flex min-h-11 shrink-0 items-center gap-1.5 py-1 ps-3 pe-1',
          // Room for the grid's drag handle, which sits over the header's start in edit mode.
          isEditing && 'ps-12',
        )}
      >
        {Icon && <Icon aria-hidden="true" className="size-4 shrink-0 text-fg-muted" />}
        <Heading
          id={titleId}
          className={cn(
            'min-w-0 truncate text-[calc(0.875rem*var(--dashboard-scale,1))] font-semibold',
            isTitleHidden && 'sr-only',
          )}
        >
          {title}
        </Heading>
        {titleNote !== undefined && (
          <Tooltip content={titleNote}>
            <Focusable>
              <span
                role="img"
                aria-label={titleNote}
                className="inline-flex shrink-0 rounded-control text-fg-muted outline-none hit-area data-focus-visible:focus-ring"
              >
                <Clock aria-hidden="true" className="size-3.5" />
              </span>
            </Focusable>
          </Tooltip>
        )}
        {isRefreshing && <Spinner size="sm" label={messages.refreshing} className="shrink-0" />}
        {onRefreshErrorRetry && (
          <Tooltip content={messages.widgetRefreshFailed}>
            <IconButton
              variant="ghost"
              size="sm"
              tone="danger"
              icon={TriangleAlert}
              aria-label={`${messages.widgetRefreshFailed} ${messages.retry}`}
              onPress={onRefreshErrorRetry}
              className="shrink-0"
            />
          </Tooltip>
        )}
        <span className="flex-1" />
        {isEditing && isLocked && (
          <span className="flex shrink-0 items-center gap-1 text-xs text-fg-muted">
            <Lock aria-hidden="true" className="size-3.5" />
            {messages.locked}
          </span>
        )}
        {isEditing && hasSetupIssue && onConfigure && (
          <Button
            variant="soft"
            tone="warning"
            size="sm"
            icon={TriangleAlert}
            onPress={onConfigure}
          >
            {messages.needsSetup}
          </Button>
        )}
        {groups.length > 0 && (
          <OverflowMenu
            size="sm"
            aria-label={messages.widgetActions({ title })}
            onAction={(key) => {
              actions.find((action) => action.id === key)?.onAction();
            }}
            disabledKeys={actions.filter((action) => action.isDisabled).map((action) => action.id)}
            className="shrink-0"
          >
            {updatedAt !== undefined && (
              <MenuItem id="__updated" isDisabled textValue={messages.updatedAt({ time: '' })}>
                {messages.updatedAt({ time: formatRelativeTime(updatedAt, now, locale) })}
              </MenuItem>
            )}
            {groups.map((group, index) => [
              index > 0 || updatedAt !== undefined ? (
                <MenuSeparator key={`separator-${String(index)}`} />
              ) : null,
              ...group.map((action) => (
                <MenuItem
                  key={action.id}
                  id={action.id}
                  icon={action.icon}
                  tone={action.tone ?? 'neutral'}
                >
                  {action.label}
                </MenuItem>
              )),
            ])}
          </OverflowMenu>
        )}
      </div>
      <div
        // In edit mode the content ignores the pointer and focus, so drags and resizes are never swallowed (WID-11).
        inert={isEditing || undefined}
        className="relative flex min-h-0 min-w-0 flex-1 flex-col"
      >
        {children}
      </div>
    </section>
  );
}
