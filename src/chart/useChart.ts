import { Chart, type ChartConfiguration, type ChartType } from 'chart.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMediaQuery } from '../utils/useMediaQuery';
import { useThemeAttribute } from '../utils/useThemeAttribute';
import { readPalette, type ChartPalette } from './colors';
import { ensureChartsRegistered } from './setup';

/** A chart instance and the ref for its canvas. */
export interface ChartHandle<T extends ChartType> {
  canvasRef: (canvas: HTMLCanvasElement | null) => void;
  chart: Chart<T> | null;
}

/**
 * Owns a Chart.js instance on a canvas: created when the canvas mounts, updated in place when the config changes,
 * destroyed on unmount. Chart.js sizes itself with a ResizeObserver on the canvas's parent.
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
    chart.data = config.data;
    if (config.options) {
      chart.options = config.options;
    }
    chart.update();
  }, [chart, config]);

  return { canvasRef: setCanvas, chart };
}

/**
 * The palette from the current theme's tokens and the motion preference. It follows the `data-theme` attribute
 * itself, which UIProvider sets after its children render, so colours are never a theme behind.
 */
export function useChartLook(): { palette: ChartPalette; isReducedMotion: boolean } {
  const theme = useThemeAttribute();
  const isReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const { palette } = useMemo(
    () => ({ theme, palette: readPalette(document.documentElement) }),
    [theme],
  );
  return { palette, isReducedMotion };
}

/** Saves the chart as a PNG. */
export function downloadPng(chart: Chart | null, fileName: string) {
  if (!chart) {
    return;
  }
  const link = document.createElement('a');
  link.href = chart.toBase64Image('image/png');
  link.download = fileName.endsWith('.png') ? fileName : `${fileName}.png`;
  link.click();
}
