import type { Chart } from 'chart.js';
import { ChartLine, Download, Image, Maximize2, Minimize2, RotateCcw, Table2 } from 'lucide-react';
import { useEffect, useId, useState, type ReactNode, type Ref } from 'react';
import { Button } from '../components/Button/Button';
import { EmptyState } from '../components/EmptyState/EmptyState';
import { ErrorState } from '../components/ErrorState/ErrorState';
import { IconButton } from '../components/IconButton/IconButton';
import { MenuItem } from '../components/Menu/Menu';
import { MenuButton } from '../components/Menu/MenuButtons';
import { Skeleton } from '../components/Skeleton/Skeleton';

import { cn } from '../utils/cn';
import { saveUrl, withExtension } from '../utils/download';
import type { IconComponent } from '../utils/icon';
import { useFullScreen } from '../utils/useFullScreen';
import { useLatest } from '../utils/useLatest';
import type { HeadingLevel } from '../utils/types';
import { useIsPhone, useMediaQuery } from '../utils/useMediaQuery';
import { downloadCsv, toCsv } from '../table/csv';
import { DataTable } from '../table/DataTable';
import type { DataTableColumn } from '../table/types';
import type { ChartZoomControl } from './chartOptions';
import { useChartMessages } from './messages';

/** A legend entry: a series that can be shown, hidden and highlighted. */
export interface LegendEntry {
  id: string;
  label: string;
  color: string;
  isHidden: boolean;
  /** A value shown after the label, such as the series' latest value. */
  value?: string;
}

/** The chart's data as a table, for "View as table" and CSV. */
export interface ChartTable {
  columns: readonly DataTableColumn<Record<string, unknown>>[];
  rows: readonly Record<string, unknown>[];
}

/** One of the toolbar's actions, for a host that shows them in its own menu (`onActionsChange`). */
export interface ChartFrameAction {
  id: 'resetZoom' | 'table' | 'exportPng' | 'exportCsv';
  label: string;
  icon: IconComponent;
  onAction: () => void;
}

/** States and features every chart shares. */
export interface ChartFrameOptions {
  /** Names the chart (its heading and the canvas's accessible name). */
  title: string;
  description?: ReactNode;
  /** Defaults to 3. */
  headingLevel?: HeadingLevel;
  /** Keeps the title for screen readers only (when the surrounding card already shows it). */
  isTitleHidden?: boolean;
  isLoading?: boolean;
  /** Loading failed: an error state, with Retry when `onRetry` is given. */
  error?: ReactNode;
  onRetry?: () => void;
  /** Shown when there's no data. Defaults to "No data". */
  emptyState?: ReactNode;
  /** Offers "View as table". Defaults to true. */
  hasTableToggle?: boolean;
  /** Offers PNG and CSV export, saved under this name. */
  exportFileName?: string;
  /** Offers full screen. Defaults to true. */
  hasFullScreen?: boolean;
  /**
   * The plot's height on tablets and desktops (CSS), such as `18rem`. Phones use a 4:3 box. `100%` fills the
   * container's height on every device instead (a dashboard widget's frame). Defaults to `18rem`.
   */
  height?: string;
  /**
   * Shows the legend of series (when there's more than one). Turn it off when a legend outside the chart drives it,
   * such as a dashboard's consolidated legend; the summary stays. Defaults to true.
   */
  hasLegend?: boolean;
  /**
   * Shows the toolbar: Reset zoom, View as table, Export and Full screen. Defaults to true. Turn it off when a host
   * shows the actions in its own menu (`onActionsChange`); the title stays for screen readers.
   */
  hasToolbar?: boolean;
  /**
   * Called with the toolbar's actions whenever they change (Reset zoom while zoomed, the table toggle, the exports), so
   * a host can offer them in its single action menu, such as a dashboard widget's (WID-08).
   */
  onActionsChange?: (actions: readonly ChartFrameAction[]) => void;
  className?: string;
}

interface ChartFrameProps extends ChartFrameOptions {
  summary: string;
  /** The series, shown as a legend when there's more than one. */
  legend?: readonly LegendEntry[];
  onToggleSeries?: (id: string) => void;
  onHighlightSeries?: (id: string | null) => void;
  isEmpty: boolean;
  /** The data, for the table view and CSV export. */
  table: () => ChartTable;
  /** The Chart.js chart: exported as a PNG, and zoomed out by Reset zoom. */
  chart?: Chart | null;
  /** Saves the plot as a PNG named `fileName`, for charts drawn without Chart.js (see downloadSvgAsPng). */
  exportPng?: (fileName: string) => void;
  /** The exports' file name when there's no `exportFileName`. Defaults to `chart`. */
  defaultExportName?: string;
  /** The chart's zoom (useChartZoom): Reset zoom shows while it's zoomed in. */
  zoom?: { isZoomed: boolean; control: ChartZoomControl };
  /** The canvas a Chart.js chart draws on. */
  canvasRef?: Ref<HTMLCanvasElement>;
  /** Draws the plot itself instead of a canvas (Heatmap), named by the title and described by the summary. */
  plot?: (ids: { titleId: string; summaryId: string }) => ReactNode;
  /** Controls laid over the canvas (event markers, a live chart's pause chip), positioned in its box. */
  overlay?: ReactNode;
  /** More toolbar controls, before the frame's own (a live chart's pause button). */
  actions?: ReactNode;
  /** Shown just above the plot (not in the table view), such as a candlestick chart's crosshair readout. */
  plotHeader?: ReactNode;
  /** Draws the table view instead of a data table from `table` (which CSV export still uses), such as a nested list. */
  renderTable?: () => ReactNode;
}

/** The frame around a chart: heading, legend, toolbar, states, table view and full screen. */
export function ChartFrame({
  title,
  description,
  headingLevel = 3,
  isTitleHidden = false,
  isLoading = false,
  error,
  onRetry,
  emptyState,
  hasTableToggle = true,
  exportFileName,
  hasFullScreen = true,
  height = '18rem',
  hasLegend = true,
  hasToolbar = true,
  onActionsChange,
  className,
  summary,
  legend = [],
  onToggleSeries,
  onHighlightSeries,
  isEmpty,
  table,
  chart,
  exportPng,
  defaultExportName = 'chart',
  zoom,
  canvasRef,
  plot,
  overlay,
  actions,
  plotHeader,
  renderTable,
}: ChartFrameProps) {
  const messages = useChartMessages();
  const titleId = useId();
  const summaryId = useId();
  const isPhone = useIsPhone();
  const isPortrait = useMediaQuery('(orientation: portrait)');
  const [isTable, setTable] = useState(false);
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  const Heading = `h${String(headingLevel)}` as 'h3';

  const { isFullScreen, canFullScreen, toggle: toggleFullScreen } = useFullScreen(frame);

  const exportAs = (key: React.Key) => {
    const name = exportFileName ?? defaultExportName;
    if (key === 'csv') {
      const data = table();
      downloadCsv(toCsv(data.rows, data.columns), name);
    } else if (exportPng) {
      exportPng(name);
    } else if (chart) {
      saveUrl(chart.toBase64Image('image/png'), withExtension(name, '.png'));
    }
  };

  const resetZoom = () => {
    chart?.resetZoom();
    zoom?.control.setZoomed(false);
  };

  const hasError = error !== undefined && error !== null && error !== false;
  const showData = !isLoading && !hasError && !isEmpty;
  const isFill = height === '100%';
  // Filling a container or the screen, the plot takes the space left; otherwise its height (a 4:3 box on phones).
  const plotSize = isFullScreen || isFill ? 'min-h-0 flex-1' : undefined;

  // The toolbar's actions, for a host's own menu: reported when they change, and cleared on unmount.
  const latest = useLatest({ onActionsChange, resetZoom, exportAs });
  const isZoomed = zoom?.isZoomed === true;
  const hasExport = exportFileName !== undefined;
  const hasActionsListener = onActionsChange !== undefined;
  useEffect(() => {
    const report = latest.current.onActionsChange;
    if (!report) {
      return;
    }
    const list: ChartFrameAction[] = [];
    if (showData) {
      if (isZoomed) {
        list.push({
          id: 'resetZoom',
          label: messages.resetZoom,
          icon: RotateCcw,
          onAction: () => {
            latest.current.resetZoom();
          },
        });
      }
      if (hasTableToggle) {
        list.push({
          id: 'table',
          label: isTable ? messages.viewAsChart : messages.viewAsTable,
          icon: isTable ? ChartLine : Table2,
          onAction: () => {
            setTable((current) => !current);
          },
        });
      }
      if (hasExport) {
        for (const [id, label, icon] of [
          ['exportPng', messages.exportPng, Image],
          ['exportCsv', messages.exportCsv, Download],
        ] as const) {
          list.push({
            id,
            label: `${messages.export}: ${label}`,
            icon,
            onAction: () => {
              latest.current.exportAs(id === 'exportPng' ? 'png' : 'csv');
            },
          });
        }
      }
    }
    report(list);
  }, [
    hasActionsListener,
    showData,
    isZoomed,
    isTable,
    hasTableToggle,
    hasExport,
    messages,
    latest,
  ]);
  useEffect(
    () => () => {
      latest.current.onActionsChange?.([]);
    },
    [latest],
  );

  let body: ReactNode;
  if (hasError) {
    body = <ErrorState title={messages.loadFailed} description={error} onRetry={onRetry} />;
  } else if (isLoading) {
    body = <Skeleton shape="rect" className="w-full flex-1" />;
  } else if (isEmpty) {
    body = emptyState ?? <EmptyState title={messages.noData} />;
  } else if (isTable && renderTable) {
    body = renderTable();
  } else if (isTable) {
    const data = table();
    body = (
      <DataTable
        aria-labelledby={titleId}
        rows={data.rows}
        columns={data.columns}
        getRowId={(row) => String(row.__key)}
        density="compact"
        maxHeight={isFullScreen || isFill ? undefined : height}
        hasStickyFirstColumn
      />
    );
  }

  return (
    <div
      ref={setFrame}
      className={cn(
        'flex min-w-0 flex-col gap-3 bg-surface-1',
        isFill && 'h-full min-h-0',
        isFullScreen && 'h-full overflow-auto p-4',
        className,
      )}
    >
      <div
        className={cn(
          'flex flex-wrap items-start justify-between gap-2',
          // Nothing shows in it: out of the layout, so it leaves no gap.
          !hasToolbar && isTitleHidden && 'sr-only',
        )}
      >
        <div className={cn('flex min-w-0 flex-col gap-0.5', isTitleHidden && 'sr-only')}>
          <Heading id={titleId} className="text-base font-semibold text-fg">
            {title}
          </Heading>
          {description !== undefined && <p className="text-sm text-fg-muted">{description}</p>}
        </div>
        {showData && hasToolbar && (
          <div className="ms-auto flex flex-wrap items-center gap-1">
            {actions}
            {zoom?.isZoomed && (
              <Button variant="ghost" size="sm" icon={RotateCcw} onPress={resetZoom}>
                {messages.resetZoom}
              </Button>
            )}
            {hasTableToggle && (
              <Button
                variant="ghost"
                size="sm"
                icon={Table2}
                aria-pressed={isTable}
                onPress={() => {
                  setTable(!isTable);
                }}
              >
                {messages.viewAsTable}
              </Button>
            )}
            {exportFileName !== undefined && (
              <MenuButton
                label={messages.export}
                icon={Download}
                variant="ghost"
                size="sm"
                onAction={exportAs}
              >
                <MenuItem id="png">{messages.exportPng}</MenuItem>
                <MenuItem id="csv">{messages.exportCsv}</MenuItem>
              </MenuButton>
            )}
            {hasFullScreen && canFullScreen && (
              <IconButton
                icon={isFullScreen ? Minimize2 : Maximize2}
                aria-label={isFullScreen ? messages.exitFullScreen : messages.fullScreen}
                variant="ghost"
                size="sm"
                onPress={toggleFullScreen}
              />
            )}
          </div>
        )}
      </div>
      {isFullScreen && isPhone && isPortrait && (
        <p className="text-sm text-fg-muted">{messages.rotateForWiderChart}</p>
      )}
      <p id={summaryId} className="sr-only">
        {summary}
      </p>
      {plotHeader !== undefined && showData && !isTable && plotHeader}
      {plot !== undefined && showData && body === undefined && (
        <div className="w-full min-w-0">{plot({ titleId, summaryId })}</div>
      )}
      <div
        className={cn(
          'relative w-full min-w-0',
          plotSize ?? 'max-sm:aspect-[4/3] sm:h-(--chart-height)',
          (body !== undefined || !showData || plot !== undefined) && 'hidden',
        )}
        // The plot's height comes from the `height` prop (dynamic geometry).
        // eslint-disable-next-line no-restricted-syntax -- see above.
        style={{ '--chart-height': height } as React.CSSProperties}
      >
        <canvas ref={canvasRef} role="img" aria-labelledby={titleId} aria-describedby={summaryId}>
          {summary}
        </canvas>
        {overlay}
      </div>
      {body !== undefined && (
        <div
          className={cn(
            'w-full min-w-0',
            // States fill the plot's space, and a taller one (an error with Retry) can grow past it.
            !isTable &&
              cn(
                'flex flex-col justify-center',
                isFill && 'overflow-auto',
                plotSize ?? 'max-sm:aspect-[4/3] sm:min-h-(--chart-height)',
              ),
            // Filling a container, the table scrolls inside it.
            isTable && isFill && 'min-h-0 flex-1 overflow-auto',
          )}
          // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the plot's height.
          style={{ '--chart-height': height } as React.CSSProperties}
        >
          {body}
        </div>
      )}
      {showData && hasLegend && legend.length > 1 && !isTable && (
        <ul aria-label={messages.chartSeries} className="flex flex-wrap gap-x-3 gap-y-1">
          {legend.map((entry) => (
            <li key={entry.id}>
              <Button
                variant="ghost"
                size="sm"
                aria-pressed={!entry.isHidden}
                onPress={() => {
                  onToggleSeries?.(entry.id);
                }}
                onHoverStart={() => {
                  onHighlightSeries?.(entry.id);
                }}
                onHoverEnd={() => {
                  onHighlightSeries?.(null);
                }}
                onFocus={() => {
                  onHighlightSeries?.(entry.id);
                }}
                onBlur={() => {
                  onHighlightSeries?.(null);
                }}
                className={cn(entry.isHidden && 'text-fg-muted line-through')}
              >
                <span
                  aria-hidden="true"
                  className="inline-block size-3 shrink-0 rounded-full"
                  // eslint-disable-next-line no-restricted-syntax -- the series' colour from the theme tokens.
                  style={{ backgroundColor: entry.color }}
                />
                {entry.label}
                {entry.value !== undefined && (
                  <span className="font-normal text-fg-muted tabular-nums">{entry.value}</span>
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
