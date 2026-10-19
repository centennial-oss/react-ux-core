// A dashboard page: its widgets on a DashboardGrid, each drawn by WidgetView. Items carry their widget instance, so
// the grid's render function never changes with the widgets, and an edit re-renders only the widgets it touched.

import { memo, useCallback, useMemo, type ReactNode, type Ref } from 'react';
import {
  DashboardGrid,
  type DashboardGridHandle,
  type DashboardGridItem,
} from '../DashboardGrid/DashboardGrid';
import type { DashboardGridItemEnv } from '../DashboardGrid/GridCell';
import { widgetLimits } from '../document/document';
import type { LayoutEntry } from '../layout/engine';
import type { GridSpec } from '../layout/metrics';
import { readText, useDashboardMessages } from '../messages';
import type { DashboardMode, DashboardPage, WidgetAction, WidgetInstance } from '../types';
import type { WidgetRegistry } from '../widgets/define';
import { WidgetView, type WidgetEditActions } from '../WidgetFrame/WidgetView';

/** A grid item with the widget it draws. */
interface WidgetItem extends DashboardGridItem {
  instance: WidgetInstance;
}

/** What the page's widgets can ask of the shell. Its identity never changes. */
export interface PageWidgetActions {
  configure: (widgetId: string) => void;
  duplicate: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

interface GridWidgetProps {
  instance: WidgetInstance;
  env: DashboardGridItemEnv;
  registry: WidgetRegistry;
  actions: PageWidgetActions;
  canConfigure: boolean;
  canEditLayout: boolean;
  editPreview: 'live' | 'placeholder';
  widgetActions?: (instance: WidgetInstance) => WidgetAction[];
}

/** One widget in its cell, with what the shell offers it. */
const GridWidget = memo(function GridWidget({
  instance,
  env,
  registry,
  actions,
  canConfigure,
  canEditLayout,
  editPreview,
  widgetActions,
}: GridWidgetProps) {
  const definition = registry.get(instance.type);
  const { breakpoint, mode, isInViewport, onMoveResize } = env;
  const { scale } = env.cell;
  const scope = useMemo(() => ({ breakpoint, mode, scale }), [breakpoint, mode, scale]);
  const getPriority = useCallback(() => (isInViewport() ? 1 : 0), [isInViewport]);
  const widgetId = instance.id;
  const isLocked = instance.isLocked === true;
  // Locked widgets can't be removed or moved (EDIT-21); unknown types can be, but not configured (WID-19).
  const editActions = useMemo(
    (): WidgetEditActions | undefined =>
      mode === 'edit' && canEditLayout
        ? {
            onDuplicate: definition
              ? () => {
                  actions.duplicate(widgetId);
                }
              : undefined,
            onRemove: isLocked
              ? undefined
              : () => {
                  actions.remove(widgetId);
                },
            onMoveResize: isLocked ? undefined : onMoveResize,
          }
        : undefined,
    [mode, canEditLayout, definition, isLocked, actions, widgetId, onMoveResize],
  );
  const onConfigure = useMemo(
    () =>
      canConfigure && definition
        ? () => {
            actions.configure(widgetId);
          }
        : undefined,
    [canConfigure, definition, actions, widgetId],
  );
  const hostActions = useMemo(() => widgetActions?.(instance), [widgetActions, instance]);
  return (
    <WidgetView
      instance={instance}
      definition={definition}
      cell={env.cell}
      scope={scope}
      isEnabled={env.isNearViewport}
      getPriority={getPriority}
      onConfigure={onConfigure}
      editActions={editActions}
      isExpanded={env.isExpanded}
      onExpandChange={env.onExpandChange}
      hostActions={hostActions}
      editPreview={editPreview}
    />
  );
});

export interface DashboardPageViewProps {
  page: DashboardPage;
  grid: GridSpec;
  registry: WidgetRegistry;
  mode: DashboardMode;
  /** Configure is offered (PERM-04). */
  canConfigure: boolean;
  /** Widgets can be added, moved, resized, duplicated and removed. */
  canEditLayout: boolean;
  editPreview: 'live' | 'placeholder';
  widgetActions?: (instance: WidgetInstance) => WidgetAction[];
  actions: PageWidgetActions;
  onLayoutChange: (layout: LayoutEntry[]) => void;
  emptyState?: ReactNode;
  handleRef?: Ref<DashboardGridHandle>;
  className?: string;
}

/** The page's grid of widgets. */
export function DashboardPageView({
  page,
  grid,
  registry,
  mode,
  canConfigure,
  canEditLayout,
  editPreview,
  widgetActions,
  actions,
  onLayoutChange,
  emptyState,
  handleRef,
  className,
}: DashboardPageViewProps) {
  const messages = useDashboardMessages();
  const items = useMemo(
    () =>
      page.widgets.map((instance): WidgetItem => {
        const definition = registry.get(instance.type);
        const limits = widgetLimits(definition);
        const item: WidgetItem = {
          id: instance.id,
          label:
            instance.title ??
            (definition ? readText(definition.displayName, messages) : instance.type),
          layout: instance.layout,
          instance,
        };
        if (definition) {
          item.kind = readText(definition.displayName, messages);
          item.stackedHeight = definition.stackedHeight;
        }
        if (limits?.minW !== undefined || limits?.minH !== undefined) {
          item.minSize = { w: limits.minW ?? 2, h: limits.minH ?? 2 };
        }
        if (limits?.maxW !== undefined || limits?.maxH !== undefined) {
          item.maxSize = { w: limits.maxW ?? grid.columns, h: limits.maxH ?? 48 };
        }
        if (instance.isLocked) {
          item.isLocked = true;
        }
        if (instance.isResizable === false) {
          item.isResizable = false;
        }
        return item;
      }),
    [page.widgets, registry, messages, grid.columns],
  );
  // The shell owns the layout: the grid shows the stored positions (unplaced widgets are auto-placed, GRID-06).
  const layout = useMemo(
    () =>
      page.widgets.flatMap((widget): LayoutEntry[] => {
        const { x, y, w, h } = widget.layout;
        return x === undefined || y === undefined ? [] : [{ id: widget.id, x, y, w, h }];
      }),
    [page.widgets],
  );
  const renderItem = useCallback(
    (item: WidgetItem, env: DashboardGridItemEnv) => (
      <GridWidget
        instance={item.instance}
        env={env}
        registry={registry}
        actions={actions}
        canConfigure={canConfigure}
        canEditLayout={canEditLayout}
        editPreview={editPreview}
        widgetActions={widgetActions}
      />
    ),
    [registry, actions, canConfigure, canEditLayout, editPreview, widgetActions],
  );
  return (
    <DashboardGrid
      aria-label={messages.dashboardPage({ title: page.title })}
      items={items}
      renderItem={renderItem}
      grid={grid}
      isEditable={mode === 'edit' && canEditLayout}
      layout={layout}
      onLayoutChange={onLayoutChange}
      emptyState={emptyState}
      handleRef={handleRef}
      height="100%"
      className={className}
    />
  );
}
