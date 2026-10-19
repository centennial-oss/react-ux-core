import { useId, useMemo, type ReactNode } from 'react';
import type { TimeRange } from '../../components/TimeRangePicker/resolveTimeRange';
import { useTimeZone } from '../../provider/context';
import { cn } from '../../utils/cn';
import type { HeadingLevel } from '../../utils/types';
import { useElementSize } from '../../utils/useElementSize';
import { DashboardContextProvider, type WidgetErrorHandler } from '../context/DashboardContexts';
import type {
  AnyDataSource,
  DataRequest,
  DataShapeDefinition,
  DataSourceDefinition,
  JsonObject,
  JsonValue,
  WidgetInstance,
  WidgetTypeDefinition,
} from '../types';
import { resolveDataShapes } from '../widgets/define';
import { WidgetView } from '../WidgetFrame/WidgetView';

export interface DashboardWidgetProps<TOptions extends JsonObject, TData> {
  /** The widget type to draw, such as `timeSeriesChartWidget`, or a custom one. */
  type: WidgetTypeDefinition<TOptions, TData>;
  /** Display options over the type's defaults. */
  displayOptions?: Partial<TOptions>;
  /** The widget's title: its heading and its region's name. Defaults to the type's name. */
  title?: string;
  isTitleHidden?: boolean;
  /** Where the data comes from: a data source definition… */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any parameter and raw types.
  dataSource?: DataSourceDefinition<any, TData, any>;
  /** …with these parameters… */
  params?: JsonObject;
  /** …or a bare loader. */
  load?: (request: DataRequest<JsonObject>) => Promise<TData>;
  /** The time range the loader receives. */
  timeRange?: TimeRange;
  /** Filter values the loader receives (as a dashboard's filters). */
  filterValues?: Readonly<Record<string, JsonValue>>;
  /** IANA time zone for the time range. Defaults to the provider's. */
  timeZone?: string;
  /** Passed to the loader untouched (CTX-16). */
  runtimeContext?: unknown;
  /** Extra data shapes, for custom widget types. */
  dataShapes?: readonly DataShapeDefinition[];
  /** Reloads this often, at least every 15 seconds. */
  refreshIntervalMs?: number;
  onWidgetError?: WidgetErrorHandler;
  /** Maps a load error to what the widget shows. */
  formatError?: (error: unknown) => ReactNode;
  /** The widget's height (CSS). Defaults to `20rem`, or its content's height for types stacked by content. */
  height?: string;
  /** Defaults to 3. */
  headingLevel?: HeadingLevel;
  className?: string;
}

const viewScope = { breakpoint: 'full', mode: 'view', scale: 1 } as const;

/**
 * Any widget type, outside a dashboard (DATA-18): the same frame, states and data loading, fed by a data source or a
 * bare `load` function, with an optional time range and filters.
 */
export function DashboardWidget<TOptions extends JsonObject, TData>({
  type,
  displayOptions,
  title,
  isTitleHidden,
  dataSource,
  params,
  load,
  timeRange,
  filterValues,
  timeZone: timeZoneProp,
  runtimeContext,
  dataShapes,
  refreshIntervalMs,
  onWidgetError,
  formatError,
  height,
  headingLevel,
  className,
}: DashboardWidgetProps<TOptions, TData>) {
  const id = useId();
  const providerZone = useTimeZone();
  const timeZone = timeZoneProp ?? providerZone;
  const shapes = useMemo(() => resolveDataShapes(dataShapes), [dataShapes]);
  const sources = useMemo(
    () =>
      new Map<string, AnyDataSource>(
        dataSource ? [[dataSource.id, dataSource as AnyDataSource]] : [],
      ),
    [dataSource],
  );
  const instance = useMemo((): WidgetInstance => {
    const widget: WidgetInstance = {
      id,
      type: type.type,
      layout: { w: type.defaultSize.w, h: type.defaultSize.h },
      options: displayOptions as JsonObject | undefined,
    };
    if (title !== undefined) {
      widget.title = title;
    }
    if (isTitleHidden) {
      widget.isTitleHidden = true;
    }
    if (dataSource) {
      widget.data = params ? { sourceId: dataSource.id, params } : { sourceId: dataSource.id };
    } else if (load) {
      widget.load = load;
    }
    return widget;
  }, [id, type, displayOptions, title, isTitleHidden, dataSource, params, load]);

  // One observer on the widget's box gives the widget its size (GRID-13).
  const [sizeRef, size] = useElementSize({ box: 'border' });
  const isContentHeight = height === undefined && type.stackedHeight === 'content';
  const cell = useMemo(
    () => ({
      w: type.defaultSize.w,
      h: type.defaultSize.h,
      width: size?.width ?? 0,
      height: size?.height ?? 0,
      scale: 1,
    }),
    [type.defaultSize.w, type.defaultSize.h, size?.width, size?.height],
  );

  return (
    <DashboardContextProvider
      timeRange={timeRange}
      timeZone={timeZone}
      filterValues={filterValues}
      dataSources={sources}
      dataShapes={shapes}
      context={runtimeContext}
      refreshIntervalMs={refreshIntervalMs}
      onWidgetError={onWidgetError}
      formatError={formatError}
    >
      <div
        ref={sizeRef}
        // Dynamic geometry: the widget's height.
        // eslint-disable-next-line no-restricted-syntax -- see above.
        style={{ height: isContentHeight ? undefined : (height ?? '20rem') }}
        className={cn('flex min-w-0 flex-col', className)}
      >
        <WidgetView
          instance={instance}
          definition={type}
          cell={cell}
          scope={viewScope}
          headingLevel={headingLevel}
        />
      </div>
    </DashboardContextProvider>
  );
}
