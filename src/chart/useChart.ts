import { Chart, type ChartConfiguration, type ChartType } from 'chart.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toggleInSet } from '../utils/collections';
import { useControllableState } from '../utils/useControllableState';
import { useIsReducedMotion, useMediaQuery } from '../utils/useMediaQuery';
import { useThemeAttribute } from '../utils/useThemeAttribute';
import type { LegendEntry } from './ChartFrame';
import type { ChartZoomControl } from './chartOptions';
import { readPalette, type ChartPalette } from './colors';
import { ensureChartsRegistered } from './setup';

/** A chart instance and the ref for its canvas. */
export interface ChartHandle<T extends ChartType> {
  canvasRef: (canvas: HTMLCanvasElement | null) => void;
  chart: Chart<T> | null;
}

/**
 * The pixel ratio to draw at inside a CSS `zoom` (a dashboard scaled up for a wall display): the device's times the
 * zoom, so text and lines stay crisp (RESP-10). Undefined outside a zoom, leaving Chart.js its own.
 */
function zoomedPixelRatio(canvas: HTMLCanvasElement): number | undefined {
  // Browsers without `currentCSSZoom` (before 2024) report no zoom.
  const zoom = (canvas as { currentCSSZoom?: number }).currentCSSZoom ?? 1;
  return zoom === 1 ? undefined : window.devicePixelRatio * zoom;
}

/**
 * Owns a Chart.js instance on a canvas: created when the canvas mounts, updated in place when the config changes,
 * destroyed on unmount. Chart.js sizes itself with a ResizeObserver on the canvas's parent; inside a CSS `zoom` it
 * draws at the zoomed pixel ratio.
 */
export function useChart<T extends ChartType>(config: ChartConfiguration<T>): ChartHandle<T> {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [chart, setChart] = useState<Chart<T> | null>(null);
  const latest = useRef(config);
  useEffect(() => {
    latest.current = config;
  });

  useEffect(() => {
    if (!canvas) {
      return;
    }
    ensureChartsRegistered();
    const instance = new Chart<T>(canvas, latest.current);
    setChart(instance);
    return () => {
      instance.destroy();
      setChart(null);
    };
  }, [canvas]);

  useEffect(() => {
    if (!chart) {
      return;
    }
    const ratio = zoomedPixelRatio(chart.canvas);
    chart.data = config.data;
    if (config.options) {
      chart.options =
        ratio === undefined
          ? config.options
          : // The options are a plain object the chart built; Chart.js's typing just can't say so.
            // eslint-disable-next-line @typescript-eslint/no-misused-spread -- see above.
            { ...config.options, devicePixelRatio: ratio };
    }
    chart.update();
    if ((ratio ?? window.devicePixelRatio) !== chart.currentDevicePixelRatio) {
      chart.resize();
    }
  }, [chart, config]);

  return { canvasRef: setCanvas, chart };
}

/**
 * The palette from the current theme's tokens and the motion preference. It follows the `data-theme` attribute
 * itself, which UIProvider sets after its children render, so colours are never a theme behind.
 */
export function useChartLook(): { palette: ChartPalette; isReducedMotion: boolean } {
  const theme = useThemeAttribute();
  const isReducedMotion = useIsReducedMotion();
  const { palette } = useMemo(
    () => ({ theme, palette: readPalette(document.documentElement) }),
    [theme],
  );
  return { palette, isReducedMotion };
}

/**
 * Which series are hidden and which one is highlighted, controlled by the app (for a legend outside the chart, such as
 * a dashboard's consolidated legend) or kept by the chart.
 */
export interface SeriesVisibilityOptions {
  /** The ids of the hidden series, controlled. */
  hiddenSeries?: ReadonlySet<string>;
  /** The ids of the series hidden at first, uncontrolled. */
  defaultHiddenSeries?: ReadonlySet<string>;
  /** Called with the hidden series' ids when the legend shows or hides one. */
  onHiddenSeriesChange?: (ids: Set<string>) => void;
  /** The highlighted series' id, controlled (the others draw faded), or null for none. */
  highlightedSeries?: string | null;
  /** Called as the legend highlights a series (hover or focus), and with null when it stops. */
  onHighlightedSeriesChange?: (id: string | null) => void;
}

const noneHidden: ReadonlySet<string> = new Set();

/**
 * Which series are hidden and which one is highlighted (from the legend, or the app). `isDimmed` tells a series to
 * draw faded while another is highlighted; `legendProps` gives ChartFrame its legend and handlers.
 */
export function useSeriesVisibility({
  hiddenSeries,
  defaultHiddenSeries = noneHidden,
  onHiddenSeriesChange,
  highlightedSeries,
  onHighlightedSeriesChange,
}: SeriesVisibilityOptions = {}) {
  const [hidden, setHidden] = useControllableState<ReadonlySet<string>>(
    hiddenSeries,
    defaultHiddenSeries,
    onHiddenSeriesChange as ((ids: ReadonlySet<string>) => void) | undefined,
  );
  const [highlighted, setHighlighted] = useControllableState<string | null>(
    highlightedSeries,
    null,
    onHighlightedSeriesChange,
  );
  const isDimmed = useCallback(
    (id: string) => highlighted !== null && highlighted !== id,
    [highlighted],
  );
  const legendProps = (entries: readonly Omit<LegendEntry, 'isHidden'>[]) => ({
    legend: entries.map((entry) => ({ ...entry, isHidden: hidden.has(entry.id) })),
    onToggleSeries: (id: string) => {
      setHidden(toggleInSet(hidden, id));
    },
    onHighlightSeries: setHighlighted,
  });
  return { hidden, isDimmed, legendProps };
}

/** Whether a chart is zoomed in, for ChartFrame's `zoom`, and the `control` its zoomOptions report to. */
export function useChartZoom(): { isZoomed: boolean; control: ChartZoomControl } {
  const isCoarse = useMediaQuery('(pointer: coarse)');
  const [isZoomed, setZoomed] = useState(false);
  const control = useMemo(() => ({ isCoarse, setZoomed }), [isCoarse]);
  return { isZoomed, control };
}
