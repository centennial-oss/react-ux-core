import { Download, Maximize2, Minimize2, RotateCcw, Table2 } from 'lucide-react';
import { useCallback, useEffect, useId, useState, type ReactNode, type Ref } from 'react';
import { Button } from '../components/Button/Button';
import { EmptyState } from '../components/EmptyState/EmptyState';
import { ErrorState } from '../components/ErrorState/ErrorState';
import { IconButton } from '../components/IconButton/IconButton';
import { MenuItem } from '../components/Menu/Menu';
import { MenuButton } from '../components/Menu/MenuButtons';
import { Skeleton } from '../components/Skeleton/Skeleton';

import { cn } from '../utils/cn';
import type { HeadingLevel } from '../utils/types';
import { useIsPhone, useMediaQuery } from '../utils/useMediaQuery';
import { DataTable } from '../table/DataTable';
import type { DataTableColumn } from '../table/types';
import { useChartMessages } from './messages';

/** A legend entry: a series that can be shown, hidden and highlighted. */
export interface LegendEntry {
  id: string;
  label: string;
  color: string;
  isHidden: boolean;
}

/** The chart's data as a table, for "View as table" and CSV. */
export interface ChartTable {
  columns: readonly DataTableColumn<Record<string, unknown>>[];
  rows: readonly Record<string, unknown>[];
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
  /** The plot's height on tablets and desktops (CSS), such as `18rem`. Phones use a 4:3 box. Defaults to `18rem`. */
  height?: string;
  className?: string;
}

interface ChartFrameProps extends ChartFrameOptions {
  summary: string;
  legend: readonly LegendEntry[];
  onToggleSeries: (id: string) => void;
  onHighlightSeries: (id: string | null) => void;
  isEmpty: boolean;
  table: () => ChartTable;
  onExportPng: () => void;
  onExportCsv: () => void;
  isZoomed?: boolean;
  onResetZoom?: () => void;
  canvasRef: Ref<HTMLCanvasElement>;
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
  className,
  summary,
  legend,
  onToggleSeries,
  onHighlightSeries,
  isEmpty,
  table,
  onExportPng,
  onExportCsv,
  isZoomed = false,
  onResetZoom,
  canvasRef,
}: ChartFrameProps) {
  const messages = useChartMessages();
  const titleId = useId();
  const summaryId = useId();
  const isPhone = useIsPhone();
  const isPortrait = useMediaQuery('(orientation: portrait)');
  const [isTable, setTable] = useState(false);
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  const [isFullScreen, setFullScreen] = useState(false);
  const Heading = `h${String(headingLevel)}` as 'h3';

  useEffect(() => {
    const update = () => {
      setFullScreen(document.fullscreenElement !== null && document.fullscreenElement === frame);
    };
    document.addEventListener('fullscreenchange', update);
    return () => {
      document.removeEventListener('fullscreenchange', update);
    };
  }, [frame]);

  const toggleFullScreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void frame?.requestFullscreen();
    }
  }, [frame]);

  const hasError = error !== undefined && error !== null && error !== false;
  const showData = !isLoading && !hasError && !isEmpty;

  let body: ReactNode;
  if (hasError) {
    body = <ErrorState title={messages.loadFailed} description={error} onRetry={onRetry} />;
  } else if (isLoading) {
    body = <Skeleton shape="rect" className="w-full flex-1" />;
  } else if (isEmpty) {
    body = emptyState ?? <EmptyState title={messages.noData} />;
  } else if (isTable) {
    const data = table();
    body = (
      <DataTable
        aria-labelledby={titleId}
        rows={data.rows}
        columns={data.columns}
        getRowId={(row) => String(row.__key)}
        density="compact"
        maxHeight={isFullScreen ? undefined : height}
        hasStickyFirstColumn
      />
    );
  }

  return (
    <div
      ref={setFrame}
      className={cn(
        'flex min-w-0 flex-col gap-3 bg-surface-1',
        isFullScreen && 'h-full overflow-auto p-4',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className={cn('flex min-w-0 flex-col gap-0.5', isTitleHidden && 'sr-only')}>
          <Heading id={titleId} className="text-base font-semibold text-fg">
            {title}
          </Heading>
          {description !== undefined && <p className="text-sm text-fg-muted">{description}</p>}
        </div>
        {showData && (
          <div className="ms-auto flex flex-wrap items-center gap-1">
            {isZoomed && onResetZoom && (
              <Button variant="ghost" size="sm" icon={RotateCcw} onPress={onResetZoom}>
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
                onAction={(key) => {
                  if (key === 'png') {
                    onExportPng();
                  } else {
                    onExportCsv();
                  }
                }}
              >
                <MenuItem id="png">{messages.exportPng}</MenuItem>
                <MenuItem id="csv">{messages.exportCsv}</MenuItem>
              </MenuButton>
            )}
            {hasFullScreen && typeof document !== 'undefined' && document.fullscreenEnabled && (
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
      <div
        className={cn(
          'relative w-full min-w-0',
          isFullScreen ? 'min-h-0 flex-1' : 'max-sm:aspect-[4/3] sm:h-(--chart-height)',
          (body !== undefined || !showData) && 'hidden',
        )}
        // The plot's height comes from the `height` prop (dynamic geometry).
        // eslint-disable-next-line no-restricted-syntax -- see above.
        style={{ '--chart-height': height } as React.CSSProperties}
      >
        <canvas ref={canvasRef} role="img" aria-labelledby={titleId} aria-describedby={summaryId}>
          {summary}
        </canvas>
      </div>
      {body !== undefined && (
        <div
          className={cn(
            'w-full min-w-0',
            // States fill the plot's space, and a taller one (an error with Retry) can grow past it.
            !isTable &&
              cn(
                'flex flex-col justify-center',
                isFullScreen ? 'min-h-0 flex-1' : 'max-sm:aspect-[4/3] sm:min-h-(--chart-height)',
              ),
          )}
          // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the plot's height.
          style={{ '--chart-height': height } as React.CSSProperties}
        >
          {body}
        </div>
      )}
      {showData && legend.length > 1 && !isTable && (
        <ul aria-label={messages.chartSeries} className="flex flex-wrap gap-x-3 gap-y-1">
          {legend.map((entry) => (
            <li key={entry.id}>
              <Button
                variant="ghost"
                size="sm"
                aria-pressed={!entry.isHidden}
                onPress={() => {
                  onToggleSeries(entry.id);
                }}
                onHoverStart={() => {
                  onHighlightSeries(entry.id);
                }}
                onHoverEnd={() => {
                  onHighlightSeries(null);
                }}
                onFocus={() => {
                  onHighlightSeries(entry.id);
                }}
                onBlur={() => {
                  onHighlightSeries(null);
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
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
