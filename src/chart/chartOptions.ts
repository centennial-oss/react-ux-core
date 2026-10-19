// The Chart.js options the canvas charts share: sizing and motion, the themed tooltip, value and category axes, and
// zoom. Each returns a fresh object, so a chart can add to it.

import type { Chart, ChartType, TooltipCallbacks } from 'chart.js';
import { withAlpha, type ChartPalette } from './colors';
import { valueAxisBounds, valueAxisTitle, type ValueAxisOptions } from './valueAxis';

/**
 * Fills the frame's box, animates unless motion is reduced, and turns the built-in legend off (ChartFrame draws
 * one), with the chart's own `plugins` options.
 */
export function baseOptions<P extends object>(
  isReducedMotion: boolean,
  plugins: P,
  duration = 250,
) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    // Chart.js's auto padding (half the widest line) is measured before a dataset's options resolve, so it's 0 on
    // the first update after new data and 1 px after: the plot's width flipped with the order of updates.
    layout: { autoPadding: false },
    animation: isReducedMotion ? (false as const) : { duration },
    plugins: { legend: { display: false }, ...plugins },
  };
}

/** The theme's text colour and font for everything a chart draws (labels its axes don't style themselves). */
export function themeText(palette: ChartPalette) {
  return { color: palette.text, font: { family: palette.font.replace(/^\d+px /, '') } };
}

/** The tooltip in the theme's colours, with the chart's own text. */
export function tooltipOptions<T extends ChartType>(
  palette: ChartPalette,
  callbacks: Partial<TooltipCallbacks<T>>,
) {
  return {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderWidth: 1,
    titleColor: palette.text,
    bodyColor: palette.text,
    callbacks,
  };
}

/** An axis's theme: grid lines and border in the grid colour, unrotated ticks in the muted text colour. */
export function axisLook(palette: ChartPalette, ticks: object) {
  return {
    grid: { color: palette.grid },
    border: { color: palette.grid },
    ticks: { color: palette.mutedText, maxRotation: 0, ...ticks },
  };
}

export interface ValueScaleOptions {
  /** The most labelled ticks. */
  maxTicksLimit: number;
  /** A tick's label, given its index among `count` ticks (see `logTickLabel`). */
  format: (value: number, index: number, count: number) => string;
  /** The axis's range and title. */
  axis?: ValueAxisOptions;
  /** Values the axis stretches to show (thresholds, band edges, whiskers). */
  references?: readonly number[];
  /** A logarithmic axis (label its ticks with `logTickLabel`). */
  isLog?: boolean;
  /** More tick options. */
  ticks?: object;
  /** More grid options. */
  grid?: object;
}

/** A linear or logarithmic value axis with its range, title and formatted ticks. */
export function valueScale(
  palette: ChartPalette,
  { maxTicksLimit, format, axis, references, isLog = false, ticks, grid }: ValueScaleOptions,
) {
  const look = axisLook(palette, {
    maxTicksLimit,
    callback: (value: number | string, index: number, all: readonly unknown[]) =>
      format(Number(value), index, all.length),
    ...ticks,
  });
  return {
    type: isLog ? ('logarithmic' as const) : ('linear' as const),
    ...valueAxisBounds(axis, references),
    title: valueAxisTitle(axis?.title, palette.mutedText),
    ...look,
    grid: { ...look.grid, ...grid },
  };
}

/** A category axis: no grid lines, every label shown in the text colour unless `ticks` says otherwise. */
export function categoryScale(palette: ChartPalette, ticks?: object) {
  return {
    grid: { display: false },
    border: { color: palette.grid },
    ticks: { color: palette.text, autoSkip: false, ...ticks },
  };
}

/** What zoomOptions reports to: from useChartZoom. */
export interface ChartZoomControl {
  /** A touch screen: pan instead of drag. */
  isCoarse: boolean;
  setZoomed: (isZoomed: boolean) => void;
}

export interface ZoomOptions {
  control: ChartZoomControl;
  palette: ChartPalette;
  mode: 'x' | 'xy';
  isZoomable: boolean;
  /** Drag (with a mouse) selects a range to zoom to. */
  hasDrag: boolean;
  /** How far zooming may go, by scale id. */
  limits: object;
  /** Called with the time range zoomed to. */
  onRangeSelect?: (start: Date, end: Date) => void;
}

/**
 * chartjs-plugin-zoom's options: pinch and pan on touch screens, Ctrl+wheel, and drag with a mouse when `hasDrag`.
 * Zooming tells `control` whether the chart is zoomed, for Reset zoom.
 */
export function zoomOptions({
  control,
  palette,
  mode,
  isZoomable,
  hasDrag,
  limits,
  onRangeSelect,
}: ZoomOptions) {
  return {
    limits,
    pan: { enabled: isZoomable && control.isCoarse, mode },
    zoom: {
      mode,
      pinch: { enabled: isZoomable },
      wheel: { enabled: isZoomable, modifierKey: 'ctrl' as const },
      drag: {
        enabled: isZoomable && hasDrag && !control.isCoarse,
        backgroundColor: withAlpha(palette.series('accent', 0), 0.15),
      },
      onZoomComplete: ({ chart }: { chart: Chart }) => {
        const isZoomed = chart.isZoomedOrPanned();
        control.setZoomed(isZoomed);
        const scale = chart.scales.x;
        if (onRangeSelect && scale && isZoomed) {
          onRangeSelect(new Date(scale.min), new Date(scale.max));
        }
      },
    },
  };
}
