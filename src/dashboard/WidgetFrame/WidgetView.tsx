// The widget runtime (§7): one widget instance drawn by its registered type inside a WidgetFrame, with its options
// migrated and defaulted, its data loaded, its states drawn (or handed to the component, WID-12), its render errors
// contained (WID-13), and its single action menu assembled (WID-08). Shared by the dashboard and DashboardWidget.

import { Copy, Maximize2, Minimize2, Move, RefreshCw, Settings2, Trash2 } from 'lucide-react';
import {
  memo,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import { useLocale } from 'react-aria-components';
import { formatTimeRange } from '../../components/TimeRangePicker/labels';
import { errorMessageOf } from '../../utils/errors';
import type { HeadingLevel } from '../../utils/types';
import {
  contextApi,
  DashboardActionsContext,
  DashboardFiltersContext,
  DashboardLegendContext,
  DashboardRuntimeContext,
  DashboardTimeContext,
  DashboardWidgetStateContext,
  WidgetScopeContext,
  type WidgetScope,
} from '../context/DashboardContexts';
import { useWidgetData } from '../data/useWidgetData';
import { useWidgetState } from '../data/widgetState';
import { readText, useDashboardMessages } from '../messages';
import type {
  AnyWidgetType,
  DashboardLegendEntry,
  JsonObject,
  WidgetAction,
  WidgetInstance,
  WidgetRenderProps,
  WidgetSize,
} from '../types';
import { resolveOptions } from '../widgets/options';
import { WidgetFrame } from './WidgetFrame';
import {
  WidgetCrashed,
  WidgetEmpty,
  WidgetError,
  WidgetErrorBoundary,
  WidgetLoading,
  WidgetPlaceholder,
  WidgetUnconfigured,
  WidgetUnknownType,
} from './WidgetStates';

/** The frame's header height and borders, taken off the cell to give the widget its content size (GRID-13). */
const CHROME_HEIGHT = 46;
const CHROME_WIDTH = 2;
const DEFAULT_MIN_PIXEL_SIZE = { width: 200, height: 120 };

/** The widget's content size in a cell of `cell` pixels, with its size class (RESP-13). */
export function contentSize(
  cell: Omit<WidgetSize, 'sizeClass'>,
  minPixelSize: { width: number; height: number } = DEFAULT_MIN_PIXEL_SIZE,
): WidgetSize {
  const width = Math.max(0, cell.width - CHROME_WIDTH);
  const height = Math.max(0, cell.height - CHROME_HEIGHT * cell.scale);
  const sizeClass =
    width < minPixelSize.width * cell.scale || height < minPixelSize.height * cell.scale
      ? 'compact'
      : width >= 720 * cell.scale && height >= 420 * cell.scale
        ? 'large'
        : 'regular';
  return { w: cell.w, h: cell.h, width, height, sizeClass, scale: cell.scale };
}

const memoized = new WeakMap<object, ComponentType<WidgetRenderProps<JsonObject, unknown>>>();

/** A widget type's component, memoized once per component, so unchanged props never re-render it. */
function memoizedComponent(
  definition: AnyWidgetType,
): ComponentType<WidgetRenderProps<JsonObject, unknown>> {
  const component = definition.component as ComponentType<WidgetRenderProps<JsonObject, unknown>>;
  let wrapped = memoized.get(component);
  if (!wrapped) {
    wrapped = memo(component);
    memoized.set(component, wrapped);
  }
  return wrapped;
}

/** Whether two action lists are the same items, so a widget re-setting the same actions doesn't re-render. */
function sameActions(a: readonly WidgetAction[], b: readonly WidgetAction[]): boolean {
  return (
    a.length === b.length &&
    a.every((action, index) => {
      const other = b[index];
      return (
        other?.id === action.id &&
        other.label === action.label &&
        other.onAction === action.onAction &&
        other.isDisabled === action.isDisabled &&
        other.icon === action.icon
      );
    })
  );
}

export interface WidgetEditActions {
  onDuplicate?: () => void;
  onRemove?: () => void;
  onMoveResize?: () => void;
}

export interface WidgetViewProps {
  instance: Readonly<WidgetInstance>;
  /** The registered type, or undefined for an unknown type (WID-19). */
  definition: AnyWidgetType | undefined;
  /** The cell's size in grid units and pixels, and the scale. */
  cell: Omit<WidgetSize, 'sizeClass'>;
  scope: Omit<WidgetScope, 'widgetId'>;
  /** False until the widget comes near the viewport: its first load waits (WID-16). Defaults to true. */
  isEnabled?: boolean;
  getPriority?: () => number;
  /** Opens the configure dialog; Configure shows only with it (PERM-04). */
  onConfigure?: () => void;
  /** Edit-mode actions; locked widgets get none of them (EDIT-21). */
  editActions?: WidgetEditActions;
  isExpanded?: boolean;
  onExpandChange?: (isExpanded: boolean) => void;
  /** Actions the host adds (`widgetActions`). */
  hostActions?: readonly WidgetAction[];
  /** In edit mode, draws a placeholder instead of the widget (WID-11). Defaults to `live`. */
  editPreview?: 'live' | 'placeholder';
  headingLevel?: HeadingLevel;
  className?: string;
}

/** One widget instance, drawn by its type in a frame. */
export const WidgetView = memo(function WidgetView({
  instance,
  definition,
  cell,
  scope,
  isEnabled = true,
  getPriority,
  onConfigure,
  editActions,
  isExpanded = false,
  onExpandChange,
  hostActions,
  editPreview = 'live',
  headingLevel = 3,
  className,
}: WidgetViewProps) {
  const messages = useDashboardMessages();
  const { locale } = useLocale();
  const dashboard = use(DashboardRuntimeContext);
  const actions = use(DashboardActionsContext);
  const time = use(DashboardTimeContext);
  const filters = use(DashboardFiltersContext);
  const capabilities = definition?.capabilities;
  // Legend hovers change often: only widgets that show legends read them.
  const legend =
    capabilities?.canPublishLegend === true || capabilities?.isLegend === true
      ? use(DashboardLegendContext)
      : undefined;

  const options = useMemo(
    () => (definition ? resolveOptions(definition, instance) : {}),
    [definition, instance],
  );
  const dataShape = definition?.dataShape ?? null;
  const data = useWidgetData({
    instance,
    dataShape,
    alsoAccepts: definition?.alsoAccepts,
    options,
    isEnabled,
    getPriority,
  });
  const size = useMemo(
    () => contentSize(cell, definition?.minPixelSize),
    [cell, definition?.minPixelSize],
  );
  const widgetScope = useMemo(
    (): WidgetScope => ({ widgetId: instance.id, ...scope }),
    [instance.id, scope],
  );
  const context = useMemo(
    () => contextApi(widgetScope, actions, time, filters, legend),
    [widgetScope, actions, time, filters, legend],
  );
  const [widgetState, setWidgetState] = useWidgetState(
    use(DashboardWidgetStateContext),
    instance.id,
  );
  const [typeActions, setTypeActionsState] = useState<readonly WidgetAction[]>([]);
  const setActions = useCallback((next: readonly WidgetAction[]) => {
    setTypeActionsState((current) => (sameActions(current, next) ? current : next));
  }, []);
  // Legend entries go to the page for types that publish them (CTX-11), and leave with the widget.
  const canPublish = capabilities?.canPublishLegend === true;
  const { publishLegend } = actions;
  const widgetId = instance.id;
  const setLegendEntries = useCallback(
    (entries: readonly Omit<DashboardLegendEntry, 'widgetId'>[]) => {
      if (canPublish) {
        publishLegend(
          widgetId,
          entries.map((entry) => ({ ...entry, widgetId })),
        );
      }
    },
    [canPublish, publishLegend, widgetId],
  );
  useEffect(
    () => () => {
      publishLegend(widgetId, null);
    },
    [publishLegend, widgetId],
  );
  // A crash resets when the widget is reloaded.
  const [crashCount, setCrashCount] = useState(0);

  const title =
    instance.title ?? (definition ? readText(definition.displayName, messages) : instance.type);
  const isEditing = scope.mode === 'edit';
  const isBound = dataShape !== null && !data.isUnconfigured;
  const optionsValidation = useMemo(
    () => definition?.validateOptions?.(options),
    [definition, options],
  );
  const isDataRequired = definition?.isDataRequired ?? dataShape !== null;
  const isUnconfigured =
    definition !== undefined &&
    ((isDataRequired && data.isUnconfigured) || optionsValidation?.isValid === false);

  const menu = useMemo((): WidgetAction[] => {
    const items: WidgetAction[] = [];
    if (definition && isBound) {
      items.push({
        id: 'refresh',
        label: messages.refresh,
        icon: RefreshCw,
        onAction: () => {
          actions.requestRefresh(instance.id);
        },
      });
    }
    if (definition && onConfigure) {
      items.push({
        id: 'configure',
        label: messages.configure,
        icon: Settings2,
        onAction: onConfigure,
      });
    }
    if (onExpandChange) {
      items.push({
        id: 'expand',
        label: isExpanded ? messages.collapse : messages.expand,
        icon: isExpanded ? Minimize2 : Maximize2,
        onAction: () => {
          onExpandChange(!isExpanded);
        },
      });
    }
    if (isEditing && editActions) {
      if (editActions.onDuplicate) {
        items.push({
          id: 'duplicate',
          label: messages.duplicate,
          icon: Copy,
          onAction: editActions.onDuplicate,
        });
      }
      if (editActions.onMoveResize) {
        items.push({
          id: 'moveResize',
          label: messages.moveResize,
          icon: Move,
          onAction: editActions.onMoveResize,
        });
      }
    }
    items.push(...typeActions, ...(hostActions ?? []));
    if (isEditing && editActions?.onRemove) {
      items.push({
        id: 'remove',
        label: messages.remove,
        icon: Trash2,
        tone: 'danger',
        onAction: editActions.onRemove,
      });
    }
    return items;
  }, [
    definition,
    isBound,
    onConfigure,
    onExpandChange,
    isExpanded,
    isEditing,
    editActions,
    typeActions,
    hostActions,
    messages,
    actions,
    instance.id,
  ]);

  const state = data.state;
  const describeError = (error: unknown): { description?: ReactNode; details?: ReactNode } => {
    const technical = errorMessageOf(error, messages.genericError);
    const formatted = dashboard?.formatError?.(error);
    return formatted !== undefined && formatted !== null
      ? { description: formatted, details: technical }
      : {
          description: messages.genericError,
          details: technical === messages.genericError ? undefined : technical,
        };
  };
  const emptyMessage =
    typeof options.emptyMessage === 'string' ? options.emptyMessage : messages.noData;
  const Widget = definition ? memoizedComponent(definition) : undefined;

  let body: ReactNode;
  if (!definition || !Widget) {
    body = (
      <WidgetUnknownType messages={messages} type={instance.type} headingLevel={headingLevel} />
    );
  } else if (isEditing && editPreview === 'placeholder') {
    body = (
      <WidgetPlaceholder
        icon={definition.icon}
        title={title}
        size={messages.widgetSize({ width: cell.w, height: cell.h })}
      />
    );
  } else if (isUnconfigured) {
    body = (
      <WidgetUnconfigured
        messages={messages}
        onConfigure={onConfigure}
        headingLevel={headingLevel}
      />
    );
  } else {
    const hasData =
      state.status === 'success' || (state.status === 'error' && state.staleData !== undefined);
    const ownStates = definition.hasOwnStates === true;
    const renderWidget = () => (
      <Widget
        instance={instance}
        displayOptions={options}
        dataState={state}
        frameSize={size}
        mode={scope.mode}
        dashboard={context}
        setActions={setActions}
        setLegendEntries={setLegendEntries}
        widgetState={widgetState}
        setWidgetState={setWidgetState}
        messages={messages}
        {...(ownStates && {
          isLoading: state.status === 'loading' || state.status === 'idle',
          isRefreshing: state.status === 'success' && state.isRefreshing,
          error:
            state.status === 'error' && !hasData
              ? describeError(state.error).description
              : undefined,
          onRetry: data.retry,
          emptyState: <WidgetEmpty title={emptyMessage} headingLevel={headingLevel} />,
        })}
      />
    );
    let content: ReactNode;
    if (
      ownStates ||
      dataShape === null ||
      (hasData && !(state.status === 'success' && state.isEmpty))
    ) {
      content = renderWidget();
    } else if (state.status === 'error') {
      content = (
        <WidgetError
          messages={messages}
          {...describeError(state.error)}
          onRetry={state.retry}
          headingLevel={headingLevel}
        />
      );
    } else if (state.status === 'success') {
      content = <WidgetEmpty title={emptyMessage} headingLevel={headingLevel} />;
    } else {
      content = <WidgetLoading />;
    }
    body = (
      <WidgetErrorBoundary
        key={crashCount}
        onError={(error) => {
          dashboard?.onWidgetError?.(error, {
            widgetId: instance.id,
            type: instance.type,
            phase: 'render',
          });
        }}
        fallback={(error) => (
          <WidgetCrashed
            messages={messages}
            details={errorMessageOf(error, messages.genericError)}
            onReload={() => {
              setCrashCount((count) => count + 1);
            }}
            headingLevel={headingLevel}
          />
        )}
      >
        {content}
      </WidgetErrorBoundary>
    );
  }

  const ownRange = instance.time?.mode === 'override' ? instance.time.range : undefined;
  const titleNote = useMemo(() => {
    if (!ownRange) {
      return undefined;
    }
    const range = formatTimeRange(ownRange, {
      messages,
      locale,
      timeZone: time.timeZone,
      now: time.now,
    });
    return messages.widgetOwnTimeRange({ range });
  }, [ownRange, messages, locale, time.timeZone, time.now]);

  const highlightedKey = legend?.highlighted ?? null;
  const isHighlighted =
    highlightedKey !== null &&
    (legend?.keysByWidget.get(instance.id)?.has(highlightedKey) ?? false);

  return (
    <WidgetScopeContext value={widgetScope}>
      <WidgetFrame
        title={title}
        isTitleHidden={instance.isTitleHidden}
        icon={definition?.icon}
        mode={scope.mode}
        actions={menu}
        updatedAt={state.status === 'success' ? state.updatedAt : undefined}
        isRefreshing={state.status === 'success' && state.isRefreshing}
        onRefreshErrorRetry={
          state.status === 'error' && state.staleData !== undefined ? state.retry : undefined
        }
        isLocked={instance.isLocked}
        hasSetupIssue={isUnconfigured}
        onConfigure={onConfigure}
        isHighlighted={isHighlighted}
        titleNote={titleNote}
        headingLevel={headingLevel}
        className={className}
      >
        {body}
      </WidgetFrame>
    </WidgetScopeContext>
  );
});
