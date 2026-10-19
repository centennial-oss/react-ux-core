// Defining widget types and data sources (§7.1, §7.2, §8.2): identity helpers that keep full type inference, the
// widget registry, and `widgetFromComponent`, which turns an existing component into a widget type with a pure
// `toProps` mapping (WID-04).

import { createElement, type ComponentType, type ReactNode } from 'react';
import type { ResolvedTimeRange } from '../../components/TimeRangePicker/resolveTimeRange';
import { isDevelopment, warnInDevelopment } from '../../utils/dev';
import { builtInDataShapes } from '../data/shapes';
import { readText, type DashboardStrings } from '../messages';
import type {
  AnyDataSource,
  AnyWidgetType,
  DashboardContextApi,
  DashboardMode,
  DataShapeDefinition,
  DataSourceDefinition,
  JsonObject,
  WidgetAction,
  WidgetInstance,
  WidgetRenderProps,
  WidgetSize,
  WidgetTypeDefinition,
} from '../types';

/**
 * A widget type, returned as given with its options and data types inferred, so they reach the component and editor
 * props without casts (WID-01).
 */
export function defineWidget<TOptions extends JsonObject, TData>(
  definition: WidgetTypeDefinition<TOptions, TData>,
): WidgetTypeDefinition<TOptions, TData> {
  return definition;
}

/**
 * A data source, returned as given with its parameters, data and raw types inferred (DATA-04). It must have either
 * `load`, or both `fetch` and `transform`.
 */
export function defineDataSource<TParams extends JsonObject, TData, TRaw = TData>(
  definition: DataSourceDefinition<TParams, TData, TRaw>,
): DataSourceDefinition<TParams, TData, TRaw> {
  const hasLoad = typeof definition.load === 'function';
  const hasFetch =
    typeof definition.fetch === 'function' && typeof definition.transform === 'function';
  if (hasLoad === hasFetch) {
    warnInDevelopment(
      'defineDataSource',
      `"${definition.id}" needs either load, or fetch and transform (and not both).`,
    );
  }
  return definition;
}

/** The registered widget types, by type id. */
export interface WidgetRegistry {
  /** Every type, in registration order (the picker's order within a category). */
  readonly types: readonly AnyWidgetType[];
  get: (type: string) => AnyWidgetType | undefined;
}

/**
 * A registry of widget types. All types, built-in or custom, go through it (ARCH-03, BI-14). A repeated `type` throws
 * in development and warns in production; the last one wins (WID-02).
 */
export function createWidgetRegistry(definitions: readonly AnyWidgetType[]): WidgetRegistry {
  const byType = new Map<string, AnyWidgetType>();
  for (const definition of definitions) {
    if (byType.has(definition.type)) {
      const message = `The widget type "${definition.type}" is registered twice; the last one wins.`;
      if (isDevelopment()) {
        throw new Error(`[createWidgetRegistry] ${message}`);
      }
      console.warn(`[createWidgetRegistry] ${message}`);
    }
    byType.set(definition.type, definition);
  }
  const types = [...byType.values()];
  return { types, get: (type) => byType.get(type) };
}

/** A registry from either a registry or a list of types. */
export function toWidgetRegistry(input: WidgetRegistry | readonly AnyWidgetType[]): WidgetRegistry {
  return 'get' in input ? input : createWidgetRegistry(input);
}

/** The built-in shapes with the host's, by id; a host shape replaces a built-in one of the same id. */
export function resolveDataShapes(
  extra: readonly DataShapeDefinition[] = [],
): ReadonlyMap<string, DataShapeDefinition> {
  return new Map([...builtInDataShapes, ...extra].map((shape) => [shape.id, shape]));
}

/** Data sources by id. */
export function resolveDataSources(
  sources: readonly AnyDataSource[] = [],
): ReadonlyMap<string, AnyDataSource> {
  return new Map(sources.map((source) => [source.id, source]));
}

/** What `toProps` gets besides the data and options: the widget's size, strings and surroundings. */
export interface WidgetPropsEnv {
  /** The widget's title: its instance title, or the type's name. */
  title: string;
  frameSize: WidgetSize;
  messages: DashboardStrings;
  dashboard: DashboardContextApi;
  instance: Readonly<WidgetInstance>;
  mode: DashboardMode;
  setActions: (actions: readonly WidgetAction[]) => void;
  setLegendEntries: WidgetRenderProps<JsonObject, unknown>['setLegendEntries'];
  /** The widget's interactive state, and its setter (Q3). */
  widgetState: JsonObject | undefined;
  setWidgetState: (state: JsonObject) => void;
  /** The time range the shown data was loaded for, if it depends on one (BI-01). */
  timeRange?: ResolvedTimeRange;
  /** With `hasOwnStates`, the states for the component to draw (WID-12). */
  isLoading: boolean;
  isRefreshing: boolean;
  error?: ReactNode;
  onRetry?: () => void;
  emptyState?: ReactNode;
}

/** A widget type made from an existing component (WID-04). */
export type ComponentWidgetConfig<TOptions extends JsonObject, TData, TProps extends object> = Omit<
  WidgetTypeDefinition<TOptions, TData>,
  'component' | 'dataShape'
> & {
  /** The component to render. */
  component: ComponentType<TProps>;
  /** The data shape (a definition infers the data type), its id, or null for types without data. */
  dataShape: DataShapeDefinition<TData> | string | null;
  /**
   * Maps the data, options and surroundings to the component's props. Pure. `data` is undefined only for types
   * without data, or with `hasOwnStates` while the first load is in flight or has failed.
   */
  toProps: (data: TData | undefined, options: TOptions, env: WidgetPropsEnv) => TProps;
};

/**
 * Turns an existing component into a widget type: its data shape, a pure `toProps(data, options, env)`, size defaults
 * and, optionally, an options schema that generates its Display form (WID-04, WID-05).
 */
export function widgetFromComponent<TOptions extends JsonObject, TData, TProps extends object>(
  config: ComponentWidgetConfig<TOptions, TData, TProps>,
): WidgetTypeDefinition<TOptions, TData> {
  const { component, toProps, dataShape, ...definition } = config;
  const shapeId = dataShape === null || typeof dataShape === 'string' ? dataShape : dataShape.id;
  function ComponentWidget(props: WidgetRenderProps<TOptions, TData>) {
    const { dataState } = props;
    const value =
      dataState.status === 'success'
        ? dataState.data
        : dataState.status === 'error'
          ? dataState.staleData
          : undefined;
    const title = props.instance.title ?? readText(definition.displayName, props.messages);
    return createElement(
      component,
      toProps(value, props.displayOptions, {
        title,
        frameSize: props.frameSize,
        messages: props.messages,
        dashboard: props.dashboard,
        instance: props.instance,
        mode: props.mode,
        setActions: props.setActions,
        setLegendEntries: props.setLegendEntries,
        widgetState: props.widgetState,
        setWidgetState: props.setWidgetState,
        isLoading: props.isLoading ?? false,
        isRefreshing: props.isRefreshing ?? false,
        error: props.error,
        onRetry: props.onRetry,
        emptyState: props.emptyState,
        timeRange: dataState.status === 'success' ? dataState.timeRange : undefined,
      }),
    );
  }
  ComponentWidget.displayName = `Widget(${config.type})`;
  return { ...definition, dataShape: shapeId, component: ComponentWidget };
}
