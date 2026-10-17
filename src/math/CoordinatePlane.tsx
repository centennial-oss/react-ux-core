// CoordinatePlane: functions, points, segments, vectors and polygons on a Cartesian plane, drawn as SVG with no
// dependencies. Curves are sampled adaptively (smooth where they bend, broken at discontinuities), axes tick at nice
// steps (or multiples of π), and the plane pans and zooms by pointer, pinch, wheel, keyboard and buttons. Points can
// be dragged by pointer or moved with the arrow keys, a crosshair reads (x, f(x)) on hover or touch, and a table view
// and a summary of the app's key features make the plot usable without seeing it.

import { Minus, Plus, RotateCcw, Table2 } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { useLocale } from 'react-aria-components';
import type { ChartColor } from '../chart/colors';
import { Button } from '../components/Button/Button';
import { IconButton } from '../components/IconButton/IconButton';
import { ScrollRegion } from '../components/ScrollRegion/ScrollRegion';
import { cn } from '../utils/cn';
import type { HeadingLevel } from '../utils/types';
import { MathFormula } from './MathFormula';
import { useMathMessages } from './messages';
import {
  linearScale,
  niceTicks,
  piTicks,
  polylinePath,
  sampleFunction,
  snapTo,
  ticksAtStep,
  niceStep,
  zoomRange,
  type PlotPoint,
} from './plot';

/** A function to plot. */
export interface PlotFunction {
  id: string;
  /** TeX, shown through MathFormula in the legend, summary and table, such as `y = x^2 - 2`. */
  label: string;
  /** A JavaScript function. Never a string to evaluate: apps that accept typed expressions parse them safely first. */
  fn: (x: number) => number;
  /** Defaults to the chart palette in order. */
  color?: ChartColor;
  /** Shades between the curve and the x-axis over a range, such as an integral. */
  shade?: { from: number; to: number };
  /** A dash pattern in pixels, such as `[6, 4]`. */
  dash?: readonly number[];
  /** Key features for the summary, such as "Roots at x = ±1.41; minimum at (0, −2)." */
  features?: string;
}

export interface PlanePoint {
  id: string;
  x: number;
  y: number;
  label?: string;
  /** Defaults to `neutral`, or `accent` for draggable points. */
  color?: ChartColor;
}

export interface PlaneSegment {
  id: string;
  from: readonly [number, number];
  to: readonly [number, number];
  label?: string;
  /** Draws an arrowhead at `to`. */
  isVector?: boolean;
  /** Defaults to `neutral`. */
  color?: ChartColor;
}

export interface PlanePolygon {
  id: string;
  points: readonly (readonly [number, number])[];
  label?: string;
  /** Defaults to `accent`. */
  color?: ChartColor;
}

export interface CoordinatePlaneProps {
  /** Names the plane (its heading and the plot's accessible name). */
  title: string;
  /** Keeps the title for screen readers only. */
  isTitleHidden?: boolean;
  /** Defaults to 3. */
  headingLevel?: HeadingLevel;
  description?: ReactNode;
  xRange: readonly [number, number];
  yRange: readonly [number, number];
  functions?: readonly PlotFunction[];
  /** Labelled points, for geometry and "place the vertex" exercises. */
  points?: readonly PlanePoint[];
  segments?: readonly PlaneSegment[];
  polygons?: readonly PlanePolygon[];
  /** Grid lines at the ticks. Defaults to true. */
  hasGrid?: boolean;
  /** `pi` puts x ticks at multiples of π (for trigonometry). Defaults to `decimal`. */
  xTickFormat?: 'decimal' | 'pi';
  /**
   * Points the learner can drag, or move with the arrow keys. They move on their own; an app that passes a new
   * `points` array (such as from `onPointMove`) sets their positions, so keep the array stable otherwise.
   */
  draggablePointIds?: readonly string[];
  onPointMove?: (id: string, x: number, y: number) => void;
  /**
   * The step dragged points snap to. Without it, the arrow keys move by the grid step and dragging snaps to a tenth
   * of it.
   */
  dragStep?: number;
  /** Pan and zoom (drag, pinch, wheel, keyboard and buttons). Defaults to true. */
  isInteractive?: boolean;
  /** Offers "View as table". Defaults to true when there are functions. */
  hasTableToggle?: boolean;
  /** The x step of the table view. Defaults to a nice step giving about ten rows. */
  tableStep?: number;
  /** The plot's height on tablets and desktops (CSS). Phones use a 4:3 box. Defaults to `20rem`. */
  height?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

// Static class lookups per palette colour (Tailwind needs complete class names).
const strokeClasses: Record<ChartColor, string> = {
  'chart-1': 'stroke-chart-1',
  'chart-2': 'stroke-chart-2',
  'chart-3': 'stroke-chart-3',
  'chart-4': 'stroke-chart-4',
  'chart-5': 'stroke-chart-5',
  'chart-6': 'stroke-chart-6',
  'chart-7': 'stroke-chart-7',
  'chart-8': 'stroke-chart-8',
  'chart-9': 'stroke-chart-9',
  'chart-10': 'stroke-chart-10',
  accent: 'stroke-accent-solid',
  success: 'stroke-success-solid',
  warning: 'stroke-warning-solid',
  danger: 'stroke-danger-solid',
  neutral: 'stroke-neutral-solid',
};
const fillClasses: Record<ChartColor, string> = {
  'chart-1': 'fill-chart-1',
  'chart-2': 'fill-chart-2',
  'chart-3': 'fill-chart-3',
  'chart-4': 'fill-chart-4',
  'chart-5': 'fill-chart-5',
  'chart-6': 'fill-chart-6',
  'chart-7': 'fill-chart-7',
  'chart-8': 'fill-chart-8',
  'chart-9': 'fill-chart-9',
  'chart-10': 'fill-chart-10',
  accent: 'fill-accent-solid',
  success: 'fill-success-solid',
  warning: 'fill-warning-solid',
  danger: 'fill-danger-solid',
  neutral: 'fill-neutral-solid',
};
const areaClasses: Record<ChartColor, string> = {
  'chart-1': 'fill-chart-1/20',
  'chart-2': 'fill-chart-2/20',
  'chart-3': 'fill-chart-3/20',
  'chart-4': 'fill-chart-4/20',
  'chart-5': 'fill-chart-5/20',
  'chart-6': 'fill-chart-6/20',
  'chart-7': 'fill-chart-7/20',
  'chart-8': 'fill-chart-8/20',
  'chart-9': 'fill-chart-9/20',
  'chart-10': 'fill-chart-10/20',
  accent: 'fill-accent-solid/15',
  success: 'fill-success-solid/15',
  warning: 'fill-warning-solid/15',
  danger: 'fill-danger-solid/15',
  neutral: 'fill-neutral-solid/15',
};
const backgroundClasses: Record<ChartColor, string> = {
  'chart-1': 'bg-chart-1',
  'chart-2': 'bg-chart-2',
  'chart-3': 'bg-chart-3',
  'chart-4': 'bg-chart-4',
  'chart-5': 'bg-chart-5',
  'chart-6': 'bg-chart-6',
  'chart-7': 'bg-chart-7',
  'chart-8': 'bg-chart-8',
  'chart-9': 'bg-chart-9',
  'chart-10': 'bg-chart-10',
  accent: 'bg-accent-solid',
  success: 'bg-success-solid',
  warning: 'bg-warning-solid',
  danger: 'bg-danger-solid',
  neutral: 'bg-neutral-solid',
};
const borderClasses: Record<ChartColor, string> = {
  'chart-1': 'border-chart-1',
  'chart-2': 'border-chart-2',
  'chart-3': 'border-chart-3',
  'chart-4': 'border-chart-4',
  'chart-5': 'border-chart-5',
  'chart-6': 'border-chart-6',
  'chart-7': 'border-chart-7',
  'chart-8': 'border-chart-8',
  'chart-9': 'border-chart-9',
  'chart-10': 'border-chart-10',
  accent: 'border-accent-solid',
  success: 'border-success-solid',
  warning: 'border-warning-solid',
  danger: 'border-danger-solid',
  neutral: 'border-neutral-solid',
};

const PALETTE: readonly ChartColor[] = [
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'chart-6',
  'chart-7',
  'chart-8',
  'chart-9',
  'chart-10',
];

/** A function's colour: its own, or the palette in order. */
function functionColor(fn: PlotFunction, index: number): ChartColor {
  return fn.color ?? PALETTE[index % PALETTE.length] ?? 'chart-1';
}

/** Tick labels get a halo in the plane's background colour, so they stay legible over grid lines and curves. */
const tickLabelClasses =
  'fill-fg-muted stroke-surface-2 text-[11px] tabular-nums [paint-order:stroke] [stroke-linejoin:round] [stroke-width:3px]';
const pointLabelClasses =
  'fill-fg stroke-surface-2 text-xs font-medium [paint-order:stroke] [stroke-linejoin:round] [stroke-width:3px]';

/** The size of an element in CSS pixels, kept current with a ResizeObserver. */
function useElementSize(): [
  (element: HTMLElement | null) => void,
  { width: number; height: number },
] {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const ref = useCallback((element: HTMLElement | null) => {
    if (!element) {
      return;
    }
    const measure = () => {
      const rect = element.getBoundingClientRect();
      setSize((previous) =>
        previous.width === rect.width && previous.height === rect.height
          ? previous
          : { width: rect.width, height: rect.height },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);
  return [ref, size];
}

/** Keeps a drag's pointer events coming to `element` when the pointer leaves it (if the pointer is still active). */
function capturePointer(element: Element, pointerId: number): void {
  try {
    element.setPointerCapture(pointerId);
  } catch {
    // The pointer is already gone (or the event was synthetic); the drag simply ends sooner.
  }
}

/** Digits to show for values on a grid of `step`, plus `extra`. */
function decimalsFor(step: number, extra = 0): number {
  if (!(step > 0) || !Number.isFinite(step)) {
    return 2;
  }
  return Math.min(10, Math.max(0, -Math.floor(Math.log10(step)) + extra));
}

type Range = readonly [number, number];
interface View {
  x: Range;
  y: Range;
}

/** The curves and shaded areas, memoised apart from the crosshair so hovering doesn't resample. */
function Curves({
  functions,
  view,
  width,
  height,
}: {
  functions: readonly PlotFunction[];
  view: View;
  width: number;
  height: number;
}) {
  const drawn = useMemo(() => {
    const x = linearScale(view.x, [0, width]);
    const y = linearScale(view.y, [height, 0]);
    const toPixels = (pieces: PlotPoint[][]) =>
      pieces.map((piece) => piece.map(([px, py]) => [x(px), y(py)] as const));
    const intervals = Math.max(32, Math.min(400, Math.round(width / 3)));
    return functions.map((fn, index) => {
      const pieces = sampleFunction(fn.fn, view.x[0], view.x[1], {
        yRange: view.y,
        initialIntervals: intervals,
      });
      let area: string | undefined;
      if (fn.shade) {
        const from = Math.max(Math.min(fn.shade.from, fn.shade.to), view.x[0]);
        const to = Math.min(Math.max(fn.shade.from, fn.shade.to), view.x[1]);
        if (to > from) {
          const zero = Math.min(height, Math.max(0, y(0)));
          const shadePieces = sampleFunction(fn.fn, from, to, {
            yRange: view.y,
            initialIntervals: Math.max(
              16,
              Math.round((intervals * (to - from)) / (view.x[1] - view.x[0])),
            ),
          });
          area = toPixels(shadePieces)
            .map((piece) => {
              const first = piece[0];
              const last = piece[piece.length - 1];
              if (!first || !last) {
                return '';
              }
              const clamped = piece.map(
                ([px, py]) => [px, Math.min(height + 2, Math.max(-2, py))] as const,
              );
              return `M${first[0].toFixed(2)} ${zero.toFixed(2)}${polylinePath([clamped]).replace(/^M/, 'L')}L${last[0].toFixed(2)} ${zero.toFixed(2)}Z`;
            })
            .join('');
        }
      }
      return {
        id: fn.id,
        color: functionColor(fn, index),
        path: polylinePath(toPixels(pieces)),
        area,
        dash: fn.dash?.join(' '),
      };
    });
  }, [functions, view, width, height]);

  return (
    <g>
      {drawn.map(
        (curve) =>
          curve.area !== undefined && (
            <path key={`${curve.id}-area`} d={curve.area} className={areaClasses[curve.color]} />
          ),
      )}
      {drawn.map((curve) => (
        <path
          key={curve.id}
          d={curve.path}
          fill="none"
          strokeWidth={2.25}
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray={curve.dash}
          className={strokeClasses[curve.color]}
        />
      ))}
    </g>
  );
}

/** A plane with functions, points, segments, vectors and polygons, which pans, zooms and reads values. */
export function CoordinatePlane({
  title,
  isTitleHidden = false,
  headingLevel = 3,
  description,
  xRange,
  yRange,
  functions = [],
  points = [],
  segments = [],
  polygons = [],
  hasGrid = true,
  xTickFormat = 'decimal',
  draggablePointIds = [],
  onPointMove,
  dragStep,
  isInteractive = true,
  hasTableToggle = functions.length > 0,
  tableStep,
  height = '20rem',
  className,
  ref,
}: CoordinatePlaneProps) {
  const messages = useMathMessages();
  const { locale } = useLocale();
  const titleId = useId();
  const summaryId = useId();
  const hintId = useId();
  const pointHintId = useId();
  const Heading = `h${String(headingLevel)}` as 'h3';
  const [sizeRef, { width, height: plotHeight }] = useElementSize();
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [isTable, setTable] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [crosshairX, setCrosshairX] = useState<number | null>(null);

  // The view follows the props until the user pans or zooms; new ranges from the app reset it.
  const rangeKey = `${String(xRange[0])},${String(xRange[1])},${String(yRange[0])},${String(yRange[1])}`;
  const [userView, setUserView] = useState<(View & { key: string }) | null>(null);
  const view: View = useMemo(
    () => (userView?.key === rangeKey ? userView : { x: xRange, y: yRange }),
    // xRange/yRange are captured through rangeKey, so a new array with the same numbers keeps the view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userView, rangeKey],
  );
  const isZoomed = userView?.key === rangeKey;
  const setView = useCallback(
    (update: (current: View) => View) => {
      setUserView((previous) => {
        const current = previous?.key === rangeKey ? previous : { x: xRange, y: yRange };
        return { ...update(current), key: rangeKey };
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rangeKey],
  );

  // Dragged positions, kept while `points` stays the same array. An app that updates its points from onPointMove
  // passes a new array, so its coordinates (which may differ, such as when it constrains a point) win.
  const [moved, setMoved] = useState<{
    source: readonly PlanePoint[];
    at: Record<string, [number, number]>;
  }>({ source: points, at: {} });
  const position = (point: PlanePoint): [number, number] =>
    (moved.source === points ? moved.at[point.id] : undefined) ?? [point.x, point.y];

  const x = linearScale(view.x, [0, width]);
  const y = linearScale(view.y, [plotHeight, 0]);
  const xTicks = useMemo(() => {
    const count = Math.max(2, Math.floor(width / 72));
    if (xTickFormat === 'pi') {
      const { step, ticks } = piTicks(view.x[0], view.x[1], count);
      return { step, ticks };
    }
    const { step, values } = niceTicks(view.x[0], view.x[1], count);
    return { step, ticks: values.map((value) => ({ value, label: '' })) };
  }, [view.x, width, xTickFormat]);
  const yTicks = useMemo(
    () => niceTicks(view.y[0], view.y[1], Math.max(2, Math.floor(plotHeight / 48))),
    [view.y, plotHeight],
  );
  const xFormat = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: decimalsFor(xTicks.step) }),
    [locale, xTicks.step],
  );
  const yFormat = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: decimalsFor(yTicks.step) }),
    [locale, yTicks.step],
  );
  const valueFormat = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 4 }),
    [locale],
  );
  const readoutXFormat = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: decimalsFor(xTicks.step, 2) }),
    [locale, xTicks.step],
  );
  const format = (value: number) => valueFormat.format(Object.is(value, -0) ? 0 : value);

  // Where the axes sit: through the origin, or along the nearest edge when the origin is out of view.
  const xAxisY = Math.min(plotHeight, Math.max(0, y(0)));
  const yAxisX = Math.min(width, Math.max(0, x(0)));
  const isXAxisAtBottom = xAxisY > plotHeight - 18;
  const isYAxisAtRight = yAxisX > width - 36;

  /** Data coordinates of a pointer position. */
  const toData = useCallback(
    (clientX: number, clientY: number): [number, number] => {
      const rect = surfaceRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) {
        return [0, 0];
      }
      const dataX = view.x[0] + ((clientX - rect.left) / rect.width) * (view.x[1] - view.x[0]);
      const dataY = view.y[1] - ((clientY - rect.top) / rect.height) * (view.y[1] - view.y[0]);
      return [dataX, dataY];
    },
    [view],
  );

  const zoomBy = useCallback(
    (factor: number, anchor?: [number, number]) => {
      setView((current) => ({
        x: zoomRange(current.x, factor, anchor?.[0]),
        y: zoomRange(current.y, factor, anchor?.[1]),
      }));
    },
    [setView],
  );
  const panBy = useCallback(
    (dx: number, dy: number) => {
      setView((current) => ({
        x: [current.x[0] + dx, current.x[1] + dx],
        y: [current.y[0] + dy, current.y[1] + dy],
      }));
    },
    [setView],
  );

  // Wheel zoom needs a non-passive listener to keep the page from scrolling.
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface || !isInteractive || isTable) {
      return;
    }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = surface.getBoundingClientRect();
      const fx = (event.clientX - rect.left) / rect.width;
      const fy = (event.clientY - rect.top) / rect.height;
      const factor = Math.exp(Math.max(-1, Math.min(1, event.deltaY * 0.0015)));
      setView((current) => {
        const anchorX = current.x[0] + fx * (current.x[1] - current.x[0]);
        const anchorY = current.y[1] - fy * (current.y[1] - current.y[0]);
        return {
          x: zoomRange(current.x, factor, anchorX),
          y: zoomRange(current.y, factor, anchorY),
        };
      });
    };
    surface.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      surface.removeEventListener('wheel', onWheel);
    };
  }, [isInteractive, isTable, setView]);

  // Active pointers on the plot: one mouse or pen drag pans; one finger reads values; two fingers pan and pinch.
  const pointers = useRef(new Map<number, { x: number; y: number; type: string }>());
  const onSurfacePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
      type: event.pointerType,
    });
    capturePointer(event.currentTarget, event.pointerId);
    if (event.pointerType === 'touch') {
      setCrosshairX(toData(event.clientX, event.clientY)[0]);
    }
  };
  const onSurfacePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(event.pointerId);
    const isDragging = previous !== undefined;
    if (!isDragging) {
      // Hovering with a mouse or pen reads values.
      if (event.pointerType !== 'touch') {
        setCrosshairX(toData(event.clientX, event.clientY)[0]);
      }
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const scaleX = (view.x[1] - view.x[0]) / Math.max(1, rect.width);
    const scaleY = (view.y[1] - view.y[0]) / Math.max(1, rect.height);
    const touches = [...pointers.current.entries()].filter(
      ([, pointer]) => pointer.type === 'touch',
    );
    if (event.pointerType === 'touch' && touches.length >= 2 && isInteractive) {
      const other = touches.find(([id]) => id !== event.pointerId)?.[1];
      if (other) {
        const before = Math.hypot(previous.x - other.x, previous.y - other.y);
        const after = Math.hypot(event.clientX - other.x, event.clientY - other.y);
        const midX = (event.clientX + other.x) / 2;
        const midY = (event.clientY + other.y) / 2;
        const anchor = toData(midX, midY);
        // Half the finger's movement pans (the midpoint moves half as far as one finger).
        panBy(
          (-(event.clientX - previous.x) / 2) * scaleX,
          ((event.clientY - previous.y) / 2) * scaleY,
        );
        if (before > 0 && after > 0) {
          zoomBy(before / after, anchor);
        }
      }
    } else if (event.pointerType === 'touch') {
      setCrosshairX(toData(event.clientX, event.clientY)[0]);
    } else if (isInteractive) {
      panBy(-(event.clientX - previous.x) * scaleX, (event.clientY - previous.y) * scaleY);
      setCrosshairX(null);
    }
    pointers.current.set(event.pointerId, { ...previous, x: event.clientX, y: event.clientY });
  };
  const onSurfacePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
  };

  const onSurfaceKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!isInteractive || event.target !== event.currentTarget) {
      return;
    }
    const stepX = (view.x[1] - view.x[0]) / 10;
    const stepY = (view.y[1] - view.y[0]) / 10;
    const actions: Record<string, () => void> = {
      ArrowLeft: () => {
        panBy(-stepX, 0);
      },
      ArrowRight: () => {
        panBy(stepX, 0);
      },
      ArrowUp: () => {
        panBy(0, stepY);
      },
      ArrowDown: () => {
        panBy(0, -stepY);
      },
      '+': () => {
        zoomBy(0.8);
      },
      '=': () => {
        zoomBy(0.8);
      },
      '-': () => {
        zoomBy(1.25);
      },
      '0': () => {
        setUserView(null);
      },
    };
    const action = actions[event.key];
    if (action) {
      event.preventDefault();
      action();
    }
  };

  // Moving a draggable point, by pointer or keyboard.
  const draggable = new Set(draggablePointIds);
  // The pointer dragging a point, and where it last put it (events can outpace renders).
  const drag = useRef<{ pointerId: number; at: [number, number] } | null>(null);
  const movePoint = (point: PlanePoint, nextX: number, nextY: number, shouldAnnounce: boolean) => {
    const clampedX = Math.min(view.x[1], Math.max(view.x[0], nextX));
    const clampedY = Math.min(view.y[1], Math.max(view.y[0], nextY));
    const current = drag.current?.at ?? position(point);
    if (current[0] === clampedX && current[1] === clampedY) {
      return;
    }
    if (drag.current) {
      drag.current.at = [clampedX, clampedY];
    }
    setMoved((previous) => ({
      source: points,
      at: { ...(previous.source === points ? previous.at : {}), [point.id]: [clampedX, clampedY] },
    }));
    onPointMove?.(point.id, clampedX, clampedY);
    if (shouldAnnounce) {
      setAnnouncement(
        messages.planePointMoved({
          label: point.label ?? point.id,
          x: format(clampedX),
          y: format(clampedY),
        }),
      );
    }
  };
  const onPointPointerDown = (point: PlanePoint, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) {
      return;
    }
    event.stopPropagation();
    event.preventDefault();
    event.currentTarget.focus();
    capturePointer(event.currentTarget, event.pointerId);
    drag.current = { pointerId: event.pointerId, at: position(point) };
  };
  const onPointPointerMove = (point: PlanePoint, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (drag.current?.pointerId !== event.pointerId) {
      return;
    }
    event.stopPropagation();
    const [dataX, dataY] = toData(event.clientX, event.clientY);
    movePoint(
      point,
      snapTo(dataX, dragStep ?? xTicks.step / 10),
      snapTo(dataY, dragStep ?? yTicks.step / 10),
      false,
    );
  };
  const onPointPointerUp = (point: PlanePoint, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (drag.current?.pointerId !== event.pointerId) {
      return;
    }
    event.stopPropagation();
    const [px, py] = drag.current.at;
    drag.current = null;
    setAnnouncement(
      messages.planePointMoved({ label: point.label ?? point.id, x: format(px), y: format(py) }),
    );
  };
  const onPointKeyDown = (point: PlanePoint, event: KeyboardEvent<HTMLButtonElement>) => {
    const stepX = dragStep ?? xTicks.step;
    const stepY = dragStep ?? yTicks.step;
    const [px, py] = position(point);
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-stepX, 0],
      ArrowRight: [stepX, 0],
      ArrowUp: [0, stepY],
      ArrowDown: [0, -stepY],
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      event.stopPropagation();
      movePoint(point, snapTo(px + move[0], stepX), snapTo(py + move[1], stepY), true);
    }
  };

  // The crosshair readout.
  const readout =
    crosshairX === null
      ? null
      : functions.map((fn, index) => {
          let value = Number.NaN;
          try {
            value = fn.fn(crosshairX);
          } catch {
            // A throwing function reads as undefined.
          }
          return { fn, color: functionColor(fn, index), value };
        });

  // The table view's rows.
  const tableRows = useMemo(() => {
    if (!isTable) {
      return [];
    }
    const step = tableStep ?? niceStep(view.x[1] - view.x[0], 10);
    return ticksAtStep(view.x[0], view.x[1], step).map((value) => ({
      x: value,
      values: functions.map((fn) => {
        try {
          return fn.fn(value);
        } catch {
          return Number.NaN;
        }
      }),
    }));
  }, [isTable, tableStep, view.x, functions]);

  const summary = messages.planeSummary({
    xMin: format(view.x[0]),
    xMax: format(view.x[1]),
    yMin: format(view.y[0]),
    yMax: format(view.y[1]),
    functionCount: functions.length,
    pointCount: points.length,
  });
  const hasMeasured = width > 0 && plotHeight > 0;

  return (
    <div ref={ref} className={cn('flex min-w-0 flex-col gap-3', className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className={cn('flex min-w-0 flex-col gap-0.5', isTitleHidden && 'sr-only')}>
          <Heading id={titleId} className="text-base font-semibold text-fg">
            {title}
          </Heading>
          {description !== undefined && <p className="text-sm text-fg-muted">{description}</p>}
        </div>
        <div className="ms-auto flex flex-wrap items-center gap-1">
          {isInteractive && !isTable && (
            <>
              <IconButton
                icon={Plus}
                aria-label={messages.planeZoomIn}
                variant="ghost"
                size="sm"
                onPress={() => {
                  zoomBy(0.8);
                }}
              />
              <IconButton
                icon={Minus}
                aria-label={messages.planeZoomOut}
                variant="ghost"
                size="sm"
                onPress={() => {
                  zoomBy(1.25);
                }}
              />
              {isZoomed && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={RotateCcw}
                  onPress={() => {
                    setUserView(null);
                  }}
                >
                  {messages.planeResetView}
                </Button>
              )}
            </>
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
              {messages.planeViewAsTable}
            </Button>
          )}
        </div>
      </div>

      <div id={summaryId} className="sr-only">
        <p>{summary}</p>
        {functions.map((fn) =>
          fn.features === undefined ? null : (
            <p key={fn.id}>
              <MathFormula tex={fn.label} /> {fn.features}
            </p>
          ),
        )}
      </div>

      {isTable ? (
        <ScrollRegion aria-label={messages.planeTable} maxHeight={height} className="p-0">
          <table className="w-full border-collapse text-sm tabular-nums">
            <thead className="sticky top-0 bg-surface-1">
              <tr>
                <th
                  scope="col"
                  className="border-b border-border px-3 py-2 text-start font-semibold"
                >
                  <MathFormula tex="x" />
                </th>
                {functions.map((fn) => (
                  <th
                    key={fn.id}
                    scope="col"
                    className="border-b border-border px-3 py-2 text-end font-semibold"
                  >
                    <MathFormula tex={fn.label} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => (
                <tr key={row.x} className="border-b border-border last:border-b-0">
                  <th scope="row" className="px-3 py-1.5 text-start font-normal">
                    {format(row.x)}
                  </th>
                  {row.values.map((value, index) => (
                    <td key={functions[index]?.id ?? index} className="px-3 py-1.5 text-end">
                      {Number.isFinite(value) ? format(value) : messages.planeUndefined}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollRegion>
      ) : (
        <>
          {functions.length > 0 && (
            <p className="flex min-h-6 flex-wrap items-center gap-x-4 gap-y-1 text-sm text-fg-muted">
              {readout === null ? (
                messages.planeReadoutHint
              ) : (
                <>
                  <span className="text-fg tabular-nums">
                    {messages.planeReadoutX({ x: readoutXFormat.format(crosshairX ?? 0) })}
                  </span>
                  {readout.map(({ fn, color, value }) => (
                    <span key={fn.id} className="inline-flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className={cn('size-2.5 rounded-full', backgroundClasses[color])}
                      />
                      <MathFormula tex={fn.label} className="text-fg" />
                      <span className="tabular-nums">
                        {Number.isFinite(value)
                          ? messages.planeCoordinates({
                              x: readoutXFormat.format(crosshairX ?? 0),
                              y: format(value),
                            })
                          : messages.planeUndefined}
                      </span>
                    </span>
                  ))}
                </>
              )}
            </p>
          )}
          <div
            ref={sizeRef}
            className="relative w-full min-w-0 max-sm:aspect-[4/3] sm:h-(--plane-height)"
            // The plot's height comes from the `height` prop (dynamic geometry).
            // eslint-disable-next-line no-restricted-syntax -- see above.
            style={{ '--plane-height': height } as CSSProperties}
          >
            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- a focusable group that pans and zooms (see tabIndex) */}
            <div
              ref={surfaceRef}
              role="group"
              aria-labelledby={titleId}
              aria-describedby={isInteractive ? `${summaryId} ${hintId}` : summaryId}
              // The plot takes focus so it can be panned (arrow keys) and zoomed (plus and minus) by keyboard, and
              // handles pointer drags and pinches for the same.
              // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
              tabIndex={0}
              onKeyDown={onSurfaceKeyDown}
              onPointerDown={onSurfacePointerDown}
              onPointerMove={onSurfacePointerMove}
              onPointerUp={onSurfacePointerUp}
              onPointerCancel={onSurfacePointerUp}
              onPointerLeave={(event) => {
                if (event.pointerType !== 'touch' && !pointers.current.has(event.pointerId)) {
                  setCrosshairX(null);
                }
              }}
              className={cn(
                'absolute inset-0 overflow-hidden rounded-card border border-border bg-surface-2 outline-none select-none focus-visible:focus-ring',
                // Vertical swipes still scroll the page; horizontal ones read values, two fingers pan and zoom.
                'touch-pan-y',
                isInteractive && 'cursor-grab active:cursor-grabbing',
              )}
            >
              {hasMeasured && (
                <svg
                  width={width}
                  height={plotHeight}
                  viewBox={`0 0 ${String(width)} ${String(plotHeight)}`}
                  aria-hidden="true"
                  className="block"
                >
                  {hasGrid && (
                    <g className="stroke-border" strokeWidth={1}>
                      {xTicks.ticks.map((tick) => (
                        <line
                          key={`gx${String(tick.value)}`}
                          x1={x(tick.value)}
                          x2={x(tick.value)}
                          y1={0}
                          y2={plotHeight}
                        />
                      ))}
                      {yTicks.values.map((value) => (
                        <line
                          key={`gy${String(value)}`}
                          x1={0}
                          x2={width}
                          y1={y(value)}
                          y2={y(value)}
                        />
                      ))}
                    </g>
                  )}
                  <g className="stroke-fg-muted" strokeWidth={1.25}>
                    <line x1={0} x2={width} y1={xAxisY} y2={xAxisY} />
                    <line x1={yAxisX} x2={yAxisX} y1={0} y2={plotHeight} />
                  </g>
                  {polygons.map((polygon) => {
                    const color = polygon.color ?? 'accent';
                    const d = polygon.points
                      .map(
                        ([px, py], index) =>
                          `${index === 0 ? 'M' : 'L'}${x(px).toFixed(2)} ${y(py).toFixed(2)}`,
                      )
                      .join('');
                    const cx =
                      polygon.points.reduce((sum, [px]) => sum + px, 0) /
                      Math.max(1, polygon.points.length);
                    const cy =
                      polygon.points.reduce((sum, [, py]) => sum + py, 0) /
                      Math.max(1, polygon.points.length);
                    return (
                      <g key={polygon.id}>
                        <path
                          d={`${d}Z`}
                          strokeWidth={1.75}
                          strokeLinejoin="round"
                          className={cn(areaClasses[color], strokeClasses[color])}
                        />
                        {polygon.label !== undefined && (
                          <text
                            x={x(cx)}
                            y={y(cy)}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className={pointLabelClasses}
                          >
                            {polygon.label}
                          </text>
                        )}
                      </g>
                    );
                  })}
                  <Curves functions={functions} view={view} width={width} height={plotHeight} />
                  {segments.map((segment) => {
                    const color = segment.color ?? 'neutral';
                    const x1 = x(segment.from[0]);
                    const y1 = y(segment.from[1]);
                    const x2 = x(segment.to[0]);
                    const y2 = y(segment.to[1]);
                    const angle = Math.atan2(y2 - y1, x2 - x1);
                    const head = 10;
                    const spread = Math.PI / 7;
                    const arrow = [
                      [x2, y2],
                      [x2 - head * Math.cos(angle - spread), y2 - head * Math.sin(angle - spread)],
                      [x2 - head * Math.cos(angle + spread), y2 - head * Math.sin(angle + spread)],
                    ]
                      .map(([px = 0, py = 0]) => `${px.toFixed(2)},${py.toFixed(2)}`)
                      .join(' ');
                    // A vector's line stops at the arrowhead's base, so its end stays sharp.
                    const lineEndX = segment.isVector ? x2 - head * 0.8 * Math.cos(angle) : x2;
                    const lineEndY = segment.isVector ? y2 - head * 0.8 * Math.sin(angle) : y2;
                    return (
                      <g key={segment.id}>
                        <line
                          x1={x1}
                          y1={y1}
                          x2={lineEndX}
                          y2={lineEndY}
                          strokeWidth={2}
                          strokeLinecap="round"
                          className={strokeClasses[color]}
                        />
                        {segment.isVector && (
                          <polygon points={arrow} className={fillClasses[color]} />
                        )}
                        {segment.label !== undefined && (
                          <text
                            x={(x1 + x2) / 2 + 6}
                            y={(y1 + y2) / 2 - 6}
                            className={pointLabelClasses}
                          >
                            {segment.label}
                          </text>
                        )}
                      </g>
                    );
                  })}
                  <g>
                    {xTicks.ticks.map((tick) => {
                      // The origin's 0 is labelled once, by the y-axis.
                      if (
                        Math.abs(tick.value) < xTicks.step / 1e6 &&
                        yAxisX > 0 &&
                        yAxisX < width
                      ) {
                        return null;
                      }
                      const px = x(tick.value);
                      if (px < 8 || px > width - 8) {
                        return null;
                      }
                      return (
                        <text
                          key={`tx${String(tick.value)}`}
                          x={px}
                          y={isXAxisAtBottom ? xAxisY - 6 : xAxisY + 14}
                          textAnchor="middle"
                          className={tickLabelClasses}
                        >
                          {tick.label || xFormat.format(tick.value)}
                        </text>
                      );
                    })}
                    {yTicks.values.map((value) => {
                      const py = y(value);
                      if (py < 8 || py > plotHeight - 8) {
                        return null;
                      }
                      const isOrigin = value === 0;
                      if (isOrigin && (xAxisY <= 0 || xAxisY >= plotHeight)) {
                        return null;
                      }
                      return (
                        <text
                          key={`ty${String(value)}`}
                          x={isYAxisAtRight ? yAxisX - 6 : yAxisX + 6}
                          y={isOrigin ? py + 14 : py + 4}
                          textAnchor={isYAxisAtRight ? 'end' : 'start'}
                          className={tickLabelClasses}
                        >
                          {yFormat.format(value)}
                        </text>
                      );
                    })}
                  </g>
                  {crosshairX !== null && crosshairX >= view.x[0] && crosshairX <= view.x[1] && (
                    <g>
                      <line
                        x1={x(crosshairX)}
                        x2={x(crosshairX)}
                        y1={0}
                        y2={plotHeight}
                        strokeDasharray="4 3"
                        className="stroke-fg-muted"
                      />
                      {readout?.map(
                        ({ fn, color, value }) =>
                          Number.isFinite(value) &&
                          value >= view.y[0] &&
                          value <= view.y[1] && (
                            <circle
                              key={fn.id}
                              cx={x(crosshairX)}
                              cy={y(value)}
                              r={4.5}
                              strokeWidth={2}
                              className={cn(fillClasses[color], 'stroke-surface-2')}
                            />
                          ),
                      )}
                    </g>
                  )}
                  {points.map((point) => {
                    const [px, py] = position(point);
                    const color = point.color ?? (draggable.has(point.id) ? 'accent' : 'neutral');
                    return (
                      <g key={point.id}>
                        {!draggable.has(point.id) && (
                          <circle
                            cx={x(px)}
                            cy={y(py)}
                            r={4.5}
                            strokeWidth={2}
                            className={cn(fillClasses[color], 'stroke-surface-2')}
                          />
                        )}
                        {point.label !== undefined && (
                          <text x={x(px) + 9} y={y(py) - 9} className={pointLabelClasses}>
                            {point.label}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              )}
              {hasMeasured &&
                points
                  .filter((point) => draggable.has(point.id))
                  .map((point) => {
                    const [px, py] = position(point);
                    const color = point.color ?? 'accent';
                    const label = point.label ?? point.id;
                    return (
                      <span
                        key={point.id}
                        className="absolute -translate-x-1/2 -translate-y-1/2"
                        // The point's position on the plot (dynamic geometry).
                        // eslint-disable-next-line no-restricted-syntax -- see above.
                        style={{ left: x(px), top: y(py) }}
                      >
                        <button
                          type="button"
                          aria-label={messages.planePoint({ label, x: format(px), y: format(py) })}
                          aria-describedby={pointHintId}
                          data-point-id={point.id}
                          onPointerDown={(event) => {
                            onPointPointerDown(point, event);
                          }}
                          onPointerMove={(event) => {
                            onPointPointerMove(point, event);
                          }}
                          onPointerUp={(event) => {
                            onPointPointerUp(point, event);
                          }}
                          onPointerCancel={(event) => {
                            onPointPointerUp(point, event);
                          }}
                          onKeyDown={(event) => {
                            onPointKeyDown(point, event);
                          }}
                          className={cn(
                            'hit-area block size-4 cursor-move touch-none rounded-full border-2 border-surface-2 shadow-raised outline-none focus-visible:focus-ring',
                            backgroundClasses[color],
                          )}
                        />
                      </span>
                    );
                  })}
            </div>
          </div>
          {functions.length > 0 && (
            <ul
              aria-label={messages.planeFunctions}
              className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg"
            >
              {functions.map((fn, index) => {
                const color = functionColor(fn, index);
                return (
                  <li key={fn.id} className="inline-flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'inline-block w-5 border-t-[3px]',
                        fn.dash ? 'border-dashed' : 'border-solid',
                        borderClasses[color],
                      )}
                    />
                    <MathFormula tex={fn.label} />
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
      <p id={hintId} className="sr-only">
        {messages.planeKeyboardHint}
      </p>
      <p id={pointHintId} className="sr-only">
        {messages.planePointHint}
      </p>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
