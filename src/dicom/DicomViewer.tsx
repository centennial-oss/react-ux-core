// DicomViewer: a review viewer for DICOM image stacks (CT, MR, X-ray). Stack scrolling (wheel, drag, slider, keys)
// with neighbour prefetch, window and level (drag, keys, presets), zoom and pan (including pinch), measurements
// (length in mm, angle, elliptical and rectangular regions with mean and area), overlay text with a hide toggle,
// series thumbnails and full screen. The image isn't accessible content, so the series, slice position, window and
// measurements are also exposed as text, with a polite (debounced) live region for changes.
//
// It's a review viewer only, not a diagnostic one: diagnostic viewers carry regulatory requirements (such as FDA
// clearance or CE marking) this component doesn't meet.

import { Trash } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type Ref,
} from 'react';
import { useLocale } from 'react-aria-components';
import { Button } from '../components/Button/Button';
import { EmptyState } from '../components/EmptyState/EmptyState';
import { ErrorState } from '../components/ErrorState/ErrorState';
import { IconButton } from '../components/IconButton/IconButton';
import { Slider } from '../components/Slider/Slider';
import { Spinner } from '../components/Spinner/Spinner';
import { cn } from '../utils/cn';
import { useDebouncedCallback } from '../utils/timers';
import { useControllableState } from '../utils/useControllableState';
import { useElementWidth } from '../utils/useElementWidth';
import { mergeRefs } from '../utils/mergeRefs';
import { useIsPhone } from '../utils/useMediaQuery';
import { DicomToolbar, type DicomTool } from './DicomToolbar';
import { drawScene, frameToCanvas, type OverlayCorners } from './draw';
import { createMeasurementFormatter } from './format';
import { createImageCache, loadDicomImage, type DicomImageLoader } from './loader';
import {
  computeMeasurement,
  type DicomMeasurement,
  type DicomMeasurementDraft,
  type DicomPoint,
} from './measurements';
import { useDicomMessages } from './messages';
import { DicomParseError, type DicomImage } from './parseDicom';
import { SeriesThumbnails, type DicomSeries } from './SeriesThumbnails';
import {
  clampZoom,
  getTransform,
  initialView,
  toImage,
  zoomAt,
  type DicomView,
  type ViewportSize,
} from './viewport';
import {
  ctPresetWindows,
  defaultWindow,
  modalityRange,
  type DicomCtPreset,
  type DicomWindow,
  type DicomWindowPreset,
} from './windowLevel';

export type { DicomTool } from './DicomToolbar';
export type { DicomSeries } from './SeriesThumbnails';

const ALL_TOOLS: readonly DicomTool[] = [
  'scroll',
  'windowLevel',
  'pan',
  'zoom',
  'length',
  'angle',
  'roi',
  'rectangleRoi',
];

const MEASURE_KINDS: Partial<Record<DicomTool, DicomMeasurement['kind']>> = {
  length: 'length',
  angle: 'angle',
  roi: 'ellipse',
  rectangleRoi: 'rectangle',
};
const POINTS_NEEDED: Record<DicomMeasurement['kind'], number> = {
  length: 2,
  angle: 3,
  ellipse: 2,
  rectangle: 2,
};

/** Below this width (CSS pixels) the toolbar collapses into menus. */
const COMPACT_WIDTH = 640;
/** Pointer travel (CSS pixels) that turns a press into a drag. */
const DRAG_THRESHOLD = 4;
/** Wheel travel (pixels) per slice. */
const WHEEL_STEP = 50;
const ANNOUNCE_DELAY_MS = 400;

/** Overlay text for the image's corners, one string per line. */
export interface DicomOverlays {
  topLeft?: readonly string[];
  topRight?: readonly string[];
  bottomLeft?: readonly string[];
  bottomRight?: readonly string[];
}

export interface DicomViewerProps {
  /**
   * The stack's image ids, in order. The default loader understands `wadouri:` ids and plain URLs (including `blob:`)
   * of uncompressed DICOM Part 10 files; pass `loadImage` for anything else. Use `series` instead for several series.
   */
  imageIds?: readonly string[];
  /** Several series, shown as thumbnails to switch between. Takes the place of `imageIds`. */
  series?: readonly DicomSeries[];
  /** The shown series' `id`, controlled. */
  seriesId?: string;
  /** The series shown at first, uncontrolled. Defaults to the first. */
  defaultSeriesId?: string;
  onSeriesChange?: (seriesId: string) => void;
  /** The shown slice (0-based), controlled. */
  sliceIndex?: number;
  /** The slice shown at first (0-based), uncontrolled. Defaults to 0. */
  defaultSliceIndex?: number;
  onSliceChange?: (sliceIndex: number) => void;
  /** Window presets, in modality units. Defaults to common CT presets (Soft tissue, Lung, Bone, Brain, Abdomen); pass `[]` for none. */
  presets?: readonly DicomWindowPreset[];
  /** The pointer tools offered, in toolbar order. Defaults to all of them. */
  tools?: readonly DicomTool[];
  /** The active pointer tool, controlled. */
  tool?: DicomTool;
  /** The pointer tool active at first, uncontrolled. Defaults to the first of `tools`. */
  defaultTool?: DicomTool;
  onToolChange?: (tool: DicomTool) => void;
  /** Overlay text from the app (patient, study, series…), drawn in the image's corners. */
  overlays?: DicomOverlays;
  /** Hides the overlay text (and the viewer's own corner status), for clean screenshots. Controlled. */
  isOverlayHidden?: boolean;
  /** Whether the overlay text is hidden at first, uncontrolled. Defaults to false. */
  defaultOverlayHidden?: boolean;
  onOverlayHiddenChange?: (isHidden: boolean) => void;
  /** The measurements, controlled. */
  measurements?: readonly DicomMeasurement[];
  /** The measurements at first, uncontrolled. */
  defaultMeasurements?: readonly DicomMeasurement[];
  /** Called with every measurement whenever one is added or removed. */
  onMeasurementsChange?: (measurements: readonly DicomMeasurement[]) => void;
  /** Loads and decodes an image id. Defaults to `loadDicomImage` (wadouri: and plain URLs, uncompressed only). */
  loadImage?: DicomImageLoader;
  /** How many slices either side of the current one to load ahead. Defaults to 6. */
  prefetchCount?: number;
  /** How many decoded slices to keep in memory. Defaults to 120. */
  cacheSize?: number;
  /** Offers full screen. Defaults to true. */
  hasFullScreen?: boolean;
  /** Shows the "for review only, not for diagnostic use" notice. Defaults to true. */
  hasDisclaimer?: boolean;
  /** The image area's height on tablets and desktops (CSS), such as `36rem`. Phones use a square. Defaults to `32rem`. */
  height?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

interface Draft {
  kind: DicomMeasurement['kind'];
  imageId: string;
  points: DicomPoint[];
}

type Gesture =
  | { type: 'scroll'; startY: number; startSlice: number }
  | { type: 'windowLevel'; startX: number; startY: number; startWindow: DicomWindow; step: number }
  | { type: 'pan'; startX: number; startY: number; startView: DicomView }
  | { type: 'zoom'; startY: number; startView: DicomView; anchor: DicomPoint }
  | { type: 'measure'; startX: number; startY: number; isNewDraft: boolean }
  | {
      type: 'pinch';
      startDistance: number;
      startMid: DicomPoint;
      startView: DicomView;
    };

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function clampIndex(index: number, total: number): number {
  return Math.max(0, Math.min(total - 1, Math.round(index)));
}

/** Two pointers' distance and midpoint. */
function pinchOf(points: readonly DicomPoint[]): { distance: number; mid: DicomPoint } {
  const [a = { x: 0, y: 0 }, b = { x: 0, y: 0 }] = points;
  return {
    distance: Math.hypot(b.x - a.x, b.y - a.y) || 1,
    mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
  };
}

/**
 * A review viewer for DICOM image stacks with stack scrolling, window and level, zoom and pan, measurements, overlay
 * text, series thumbnails and full screen. Every tool works from the keyboard, and the slice position, window and
 * measurements are exposed as text. Not for diagnostic use.
 */
export function DicomViewer({
  imageIds,
  series,
  seriesId: seriesIdProp,
  defaultSeriesId,
  onSeriesChange,
  sliceIndex: sliceIndexProp,
  defaultSliceIndex = 0,
  onSliceChange,
  presets: presetsProp,
  tools = ALL_TOOLS,
  tool: toolProp,
  defaultTool,
  onToolChange,
  overlays,
  isOverlayHidden: isOverlayHiddenProp,
  defaultOverlayHidden = false,
  onOverlayHiddenChange,
  measurements: measurementsProp,
  defaultMeasurements = [],
  onMeasurementsChange,
  loadImage = loadDicomImage,
  prefetchCount = 6,
  cacheSize = 120,
  hasFullScreen = true,
  hasDisclaimer = true,
  height = '32rem',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  className,
  ref,
}: DicomViewerProps) {
  const messages = useDicomMessages();
  const { locale } = useLocale();
  const helpId = useId();
  const measurementsId = useId();
  const idPrefix = useId();
  const isPhone = useIsPhone();
  const [widthRef, width] = useElementWidth();
  const isCompact = isPhone || (width !== undefined && width < COMPACT_WIDTH);

  // Series and slice.
  const seriesList = useMemo<readonly DicomSeries[]>(
    () => series ?? [{ id: 'default', label: '', imageIds: imageIds ?? [] }],
    [series, imageIds],
  );
  const [seriesIdState, setSeriesId] = useControllableState(
    seriesIdProp,
    defaultSeriesId ?? seriesList[0]?.id ?? 'default',
    onSeriesChange,
  );
  const activeSeries = seriesList.find((entry) => entry.id === seriesIdState) ?? seriesList[0];
  const seriesId = activeSeries?.id ?? 'default';
  const stack = useMemo(() => activeSeries?.imageIds ?? [], [activeSeries]);
  const total = stack.length;
  const [sliceState, setSliceState] = useControllableState(
    sliceIndexProp,
    defaultSliceIndex,
    onSliceChange,
  );
  const sliceIndex = total === 0 ? 0 : clampIndex(sliceState, total);
  const imageId = stack[sliceIndex];

  const [tool, setTool] = useControllableState(
    toolProp,
    defaultTool ?? tools[0] ?? 'scroll',
    onToolChange,
  );
  const [isOverlayHidden, setOverlayHidden] = useControllableState(
    isOverlayHiddenProp,
    defaultOverlayHidden,
    onOverlayHiddenChange,
  );
  const [measurements, setMeasurements] = useControllableState<readonly DicomMeasurement[]>(
    measurementsProp,
    defaultMeasurements,
    onMeasurementsChange,
  );

  // Loading. The last loaded frame stays on screen while the next one loads, so scrolling doesn't flicker.
  const cache = useMemo(
    () => createImageCache(loadImage, Math.max(cacheSize, prefetchCount * 2 + 3)),
    [loadImage, cacheSize, prefetchCount],
  );
  useEffect(
    () => () => {
      cache.clear();
    },
    [cache],
  );
  const [loaded, setLoaded] = useState<{ imageId: string; image: DicomImage } | null>(null);
  const [loadError, setLoadError] = useState<{ imageId: string; error: unknown } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (imageId === undefined) {
      return;
    }
    let isCurrent = true;
    cache.load(imageId, true).then(
      (image) => {
        if (isCurrent) {
          setLoaded({ imageId, image });
          setLoadError(null);
        }
      },
      (error: unknown) => {
        if (isCurrent && !isAbort(error)) {
          setLoadError({ imageId, error });
        }
      },
    );
    return () => {
      isCurrent = false;
    };
  }, [cache, imageId, attempt]);

  // Prefetch the neighbours, nearest first, and cancel requests for slices that are now far away.
  useEffect(() => {
    if (total === 0) {
      return;
    }
    const wanted: string[] = [];
    for (let distance = 0; distance <= prefetchCount; distance++) {
      for (const index of distance === 0
        ? [sliceIndex]
        : [sliceIndex + distance, sliceIndex - distance]) {
        const id = stack[index];
        if (id !== undefined) {
          wanted.push(id);
        }
      }
    }
    cache.cancelExcept(new Set(wanted));
    for (const id of wanted) {
      void cache.load(id, true).catch(() => undefined);
    }
  }, [cache, stack, sliceIndex, total, prefetchCount]);

  const image = loaded?.image;
  const isCurrentLoaded = loaded !== null && loaded.imageId === imageId;
  const currentError = loadError !== null && loadError.imageId === imageId ? loadError.error : null;
  const isLoading = imageId !== undefined && !isCurrentLoaded && currentError === null;

  // Window and level: the user's window (kept across slices of a series) or the image's own.
  const [windowState, setWindowState] = useState<{ seriesId: string; window: DicomWindow } | null>(
    null,
  );
  const userWindow = windowState?.seriesId === seriesId ? windowState.window : null;
  const voi = userWindow ?? (image ? defaultWindow(image) : { center: 0, width: 1 });
  const [isInverted, setInverted] = useState(false);
  const [view, setView] = useState<DicomView>(initialView);

  // Measuring.
  const [draftState, setDraft] = useState<Draft | null>(null);
  const draft = draftState?.imageId === imageId && isCurrentLoaded ? draftState : null;
  const [hoverPoint, setHoverPoint] = useState<DicomPoint | null>(null);
  const [keyboardCursor, setKeyboardCursor] = useState<DicomPoint | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const measureKind = MEASURE_KINDS[tool];
  const counter = useRef(0);

  // Full screen: the whole document goes full screen (so menus and tooltips, which render at the end of the page,
  // still show) and the viewer covers it.
  const [isFullScreen, setFullScreen] = useState(false);
  useEffect(() => {
    const update = () => {
      if (document.fullscreenElement === null) {
        setFullScreen(false);
      }
    };
    document.addEventListener('fullscreenchange', update);
    return () => {
      document.removeEventListener('fullscreenchange', update);
    };
  }, []);
  const toggleFullScreen = useCallback(() => {
    if (isFullScreen) {
      setFullScreen(false);
      if (document.fullscreenElement) {
        void document.exitFullscreen().catch(() => undefined);
      }
      return;
    }
    setFullScreen(true);
    if (document.fullscreenEnabled) {
      void document.documentElement.requestFullscreen().catch(() => undefined);
    }
  }, [isFullScreen]);

  // Viewport size.
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<ViewportSize>({ width: 0, height: 0 });
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);
  const transform = useMemo(
    () => (image && size.width > 0 ? getTransform(size, image, view) : undefined),
    [image, size, view],
  );

  // Text.
  const formatter = useMemo(() => createMeasurementFormatter(messages, locale), [messages, locale]);
  const oneDecimal = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }),
    [locale],
  );
  const percent = useMemo(
    () => new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }),
    [locale],
  );
  const location =
    isCurrentLoaded && image?.slicePosition !== undefined
      ? oneDecimal.format(image.slicePosition)
      : undefined;
  const slicePosition = messages.dicomSlicePosition({
    slice: sliceIndex + 1,
    total,
    ...(location !== undefined ? { location } : {}),
  });
  const windowText = messages.dicomWindowValue({
    width: oneDecimal.format(voi.width),
    center: oneDecimal.format(voi.center),
  });
  const zoomText = messages.dicomZoomValue({ zoom: percent.format(view.zoom) });
  const seriesText =
    series !== undefined && activeSeries
      ? messages.dicomSeriesValue({ series: activeSeries.label })
      : undefined;

  // The polite live region, debounced so fast scrolling announces only where it stops.
  const [announcement, setAnnouncement] = useState('');
  const announce = useDebouncedCallback((text: string) => {
    setAnnouncement(text);
  }, ANNOUNCE_DELAY_MS);
  const hasNavigated = useRef(false);
  useEffect(() => {
    if (hasNavigated.current) {
      announce.run(slicePosition);
    }
  }, [slicePosition, announce]);

  const setSlice = useCallback(
    (index: number) => {
      if (total === 0) {
        return;
      }
      hasNavigated.current = true;
      setSliceState(clampIndex(index, total));
    },
    [total, setSliceState],
  );

  const changeWindow = (next: DicomWindow) => {
    const clamped = { center: next.center, width: Math.max(1, next.width) };
    setWindowState({ seriesId, window: clamped });
    announce.run(
      messages.dicomWindowValue({
        width: oneDecimal.format(clamped.width),
        center: oneDecimal.format(clamped.center),
      }),
    );
  };

  const changeView = (next: DicomView) => {
    setView(next);
    if (next.zoom !== view.zoom) {
      announce.run(messages.dicomZoomValue({ zoom: percent.format(next.zoom) }));
    }
  };

  const zoomBy = (factor: number, anchor?: DicomPoint) => {
    if (!image) {
      return;
    }
    changeView(zoomAt(size, image, view, clampZoom(view.zoom * factor), anchor));
  };

  const windowStep = () => {
    if (!image) {
      return 1;
    }
    const { min, max } = modalityRange(image);
    const isFloat = image.pixels instanceof Float32Array;
    return Math.max((max - min) / 200, isFloat ? 0.001 : 1);
  };

  const chooseTool = (next: DicomTool) => {
    setTool(next);
    setDraft(null);
    setKeyboardCursor(null);
  };

  const commit = (kind: DicomMeasurement['kind'], points: readonly DicomPoint[]) => {
    if (!image || imageId === undefined) {
      return;
    }
    const first = points[0];
    // Points all in one place make no measurement.
    if (!first || points.every((point) => point.x === first.x && point.y === first.y)) {
      return;
    }
    counter.current += 1;
    const base = {
      id: `${idPrefix}-${String(counter.current)}`,
      imageId,
      sliceIndex,
      ...(series !== undefined ? { seriesId } : {}),
    };
    const [a, b, c] = points;
    let shape: DicomMeasurementDraft;
    if (kind === 'angle') {
      if (!a || !b || !c) {
        return;
      }
      shape = { ...base, kind, points: [a, b, c] };
    } else {
      if (!a || !b) {
        return;
      }
      shape = { ...base, kind, points: [a, b] };
    }
    const measurement = computeMeasurement(shape, image);
    setMeasurements([...measurements, measurement]);
    announce.run(messages.dicomMeasurementAdded({ measurement: formatter.describe(measurement) }));
  };

  /** Adds a point to the measurement in progress (starting one if needed); finishes it when it has enough. */
  const placePoint = (point: DicomPoint, isKeyboard: boolean) => {
    if (!measureKind || imageId === undefined || !isCurrentLoaded) {
      return;
    }
    const points = [...(draft?.points ?? []), point];
    const needed = POINTS_NEEDED[measureKind];
    if (points.length >= needed) {
      setDraft(null);
      commit(measureKind, points);
      return;
    }
    setDraft({ kind: measureKind, imageId, points });
    if (isKeyboard) {
      announce.run(messages.dicomPointPlaced({ placed: points.length, total: needed }));
    }
  };

  const removeMeasurement = (id: string) => {
    setMeasurements(measurements.filter((measurement) => measurement.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
    }
  };

  const resetView = () => {
    changeView(initialView);
    setWindowState(null);
    setInverted(false);
  };

  // Pointer gestures.
  const pointers = useRef(new Map<number, DicomPoint>());
  const gesture = useRef<Gesture | null>(null);

  const localPoint = (event: { clientX: number; clientY: number }): DicomPoint => {
    const rect = viewportRef.current?.getBoundingClientRect();
    return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) };
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') {
      return;
    }
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // A synthetic or already-released pointer can't be captured; the gesture still works without capture.
    }
    const point = localPoint(event);
    pointers.current.set(event.pointerId, point);
    setKeyboardCursor(null);
    if (pointers.current.size === 2) {
      // A second finger: pinch to zoom and pan, whatever the tool.
      const { distance, mid } = pinchOf([...pointers.current.values()]);
      gesture.current = { type: 'pinch', startDistance: distance, startMid: mid, startView: view };
      setHoverPoint(null);
      return;
    }
    if (pointers.current.size > 2) {
      return;
    }
    if (measureKind) {
      if (!transform || !isCurrentLoaded) {
        return;
      }
      const isNewDraft = draft === null;
      if (isNewDraft) {
        setDraft({ kind: measureKind, imageId, points: [toImage(transform, point)] });
      }
      setHoverPoint(toImage(transform, point));
      gesture.current = { type: 'measure', startX: point.x, startY: point.y, isNewDraft };
      return;
    }
    switch (tool) {
      case 'windowLevel':
        gesture.current = {
          type: 'windowLevel',
          startX: point.x,
          startY: point.y,
          startWindow: voi,
          step: windowStep() / 2,
        };
        break;
      case 'pan':
        gesture.current = { type: 'pan', startX: point.x, startY: point.y, startView: view };
        break;
      case 'zoom':
        gesture.current = { type: 'zoom', startY: point.y, startView: view, anchor: point };
        break;
      default:
        gesture.current = { type: 'scroll', startY: point.y, startSlice: sliceIndex };
    }
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const point = localPoint(event);
    if (pointers.current.has(event.pointerId)) {
      pointers.current.set(event.pointerId, point);
    }
    const current = gesture.current;
    if (!current) {
      // A mouse hovering with a measurement in progress previews its next point.
      if (draft && transform && event.pointerType === 'mouse') {
        setHoverPoint(toImage(transform, point));
      }
      return;
    }
    switch (current.type) {
      case 'pinch': {
        if (!image || pointers.current.size < 2) {
          return;
        }
        const { distance, mid } = pinchOf([...pointers.current.values()]);
        const zoomed = zoomAt(
          size,
          image,
          current.startView,
          current.startView.zoom * (distance / current.startDistance),
          current.startMid,
        );
        setView({
          ...zoomed,
          panX: zoomed.panX + mid.x - current.startMid.x,
          panY: zoomed.panY + mid.y - current.startMid.y,
        });
        break;
      }
      case 'scroll': {
        // Dragging the full height of the viewport moves through the whole stack (at least 3 px per slice).
        const perSlice = Math.max(3, size.height / Math.max(total, 1));
        const delta = Math.round((point.y - current.startY) / perSlice);
        setSlice(current.startSlice + delta);
        break;
      }
      case 'windowLevel':
        setWindowState({
          seriesId,
          window: {
            width: Math.max(
              1,
              current.startWindow.width + (point.x - current.startX) * current.step,
            ),
            center: current.startWindow.center + (point.y - current.startY) * current.step,
          },
        });
        break;
      case 'pan':
        setView({
          ...current.startView,
          panX: current.startView.panX + point.x - current.startX,
          panY: current.startView.panY + point.y - current.startY,
        });
        break;
      case 'zoom':
        if (image) {
          setView(
            zoomAt(
              size,
              image,
              current.startView,
              current.startView.zoom * Math.exp(-(point.y - current.startY) / 150),
              current.anchor,
            ),
          );
        }
        break;
      case 'measure':
        if (transform) {
          setHoverPoint(toImage(transform, point));
        }
        break;
    }
  };

  const endPointer = (event: PointerEvent<HTMLDivElement>, isCancelled: boolean) => {
    const point = localPoint(event);
    pointers.current.delete(event.pointerId);
    const current = gesture.current;
    if (!current) {
      return;
    }
    if (current.type === 'pinch') {
      // Lifting one finger ends the pinch; the other doesn't start a new gesture.
      if (pointers.current.size === 0) {
        gesture.current = null;
        announce.run(messages.dicomZoomValue({ zoom: percent.format(view.zoom) }));
      }
      return;
    }
    gesture.current = null;
    if (current.type === 'windowLevel') {
      changeWindow(voi);
    } else if (current.type === 'zoom') {
      announce.run(messages.dicomZoomValue({ zoom: percent.format(view.zoom) }));
    } else if (current.type === 'measure' && transform && !isCancelled) {
      const isDrag =
        Math.hypot(point.x - current.startX, point.y - current.startY) > DRAG_THRESHOLD;
      // A tap that started a measurement only places its first point; a drag or a later tap places the next one.
      if (isDrag || !current.isNewDraft) {
        placePoint(toImage(transform, point), false);
      }
      if (event.pointerType !== 'mouse') {
        setHoverPoint(null);
      }
    }
  };

  // The wheel scrolls the stack (and zooms with Ctrl or ⌘); it needs a non-passive listener to stop the page scrolling.
  const wheelState = useRef({ accumulated: 0 });
  const wheelHandler = useRef<(event: WheelEvent) => void>(() => undefined);
  useLayoutEffect(() => {
    wheelHandler.current = (event: WheelEvent) => {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        if (tools.includes('zoom')) {
          zoomBy(Math.exp(-event.deltaY / 300), localPoint(event));
        }
        return;
      }
      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      wheelState.current.accumulated += delta;
      const steps = Math.trunc(wheelState.current.accumulated / WHEEL_STEP);
      if (steps !== 0) {
        wheelState.current.accumulated -= steps * WHEEL_STEP;
        setSlice(sliceIndex + steps);
      }
    };
  });
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) {
      return;
    }
    const listener = (event: WheelEvent) => {
      wheelHandler.current(event);
    };
    element.addEventListener('wheel', listener, { passive: false });
    return () => {
      element.removeEventListener('wheel', listener);
    };
  }, []);

  // Keyboard.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const big = event.shiftKey ? 5 : 1;
    const handled = () => {
      event.preventDefault();
      event.stopPropagation();
    };
    switch (event.key) {
      case 'PageUp':
        handled();
        setSlice(sliceIndex - (event.shiftKey ? 10 : 1));
        return;
      case 'PageDown':
        handled();
        setSlice(sliceIndex + (event.shiftKey ? 10 : 1));
        return;
      case 'Home':
        handled();
        setSlice(0);
        return;
      case 'End':
        handled();
        setSlice(total - 1);
        return;
      case '+':
      case '=':
        if (tools.includes('zoom')) {
          handled();
          zoomBy(1.25);
        }
        return;
      case '-':
      case '_':
        if (tools.includes('zoom')) {
          handled();
          zoomBy(0.8);
        }
        return;
      case '0':
        handled();
        changeView(initialView);
        return;
      case 'Escape':
        if (draft || keyboardCursor) {
          handled();
          if (draft) {
            announce.run(messages.dicomMeasurementCancelled);
          }
          setDraft(null);
          setKeyboardCursor(null);
        } else if (isFullScreen) {
          handled();
          toggleFullScreen();
        }
        return;
    }
    const arrows: Record<string, [number, number] | undefined> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const arrow = arrows[event.key];
    if (measureKind && transform && image) {
      if (arrow) {
        handled();
        // The cursor moves 4 screen pixels a press (20 with Shift), starting at the image centre.
        const start = keyboardCursor ?? { x: image.width / 2, y: image.height / 2 };
        setKeyboardCursor({
          x: Math.min(image.width, Math.max(0, start.x + (arrow[0] * 4 * big) / transform.scaleX)),
          y: Math.min(image.height, Math.max(0, start.y + (arrow[1] * 4 * big) / transform.scaleY)),
        });
        setHoverPoint(null);
      } else if (event.key === 'Enter' || event.key === ' ') {
        handled();
        const point = keyboardCursor ?? { x: image.width / 2, y: image.height / 2 };
        setKeyboardCursor(point);
        placePoint(point, true);
      }
      return;
    }
    if (!arrow) {
      return;
    }
    handled();
    const [dx, dy] = arrow;
    switch (tool) {
      case 'windowLevel': {
        const step = windowStep() * big;
        changeWindow({ width: voi.width + dx * step, center: voi.center - dy * step });
        break;
      }
      case 'pan':
        changeView({ ...view, panX: view.panX - dx * 10 * big, panY: view.panY - dy * 10 * big });
        break;
      case 'zoom':
        zoomBy(dx + -dy > 0 ? 1.1 ** big : 1 / 1.1 ** big);
        break;
      default:
        setSlice(sliceIndex + (dx + dy) * (event.shiftKey ? 10 : 1));
    }
  };

  // Drawing. The windowed frame is rendered at native size only when the image, window or inversion change; the
  // viewport redraws it scaled, with measurements and overlays, whenever anything changes.
  const frameRef = useRef<{ key: unknown[]; canvas: HTMLCanvasElement | null }>({
    key: [],
    canvas: null,
  });
  const sliceMeasurements = useMemo(
    () =>
      measurements
        .filter((measurement) => measurement.imageId === imageId)
        .map((measurement) => ({ measurement, label: formatter.label(measurement) })),
    [measurements, imageId, formatter],
  );
  const corners = useMemo<OverlayCorners | undefined>(
    () =>
      isOverlayHidden
        ? undefined
        : {
            topLeft: overlays?.topLeft ?? [],
            topRight: overlays?.topRight ?? [],
            bottomLeft: [...(overlays?.bottomLeft ?? []), slicePosition],
            bottomRight: [...(overlays?.bottomRight ?? []), windowText, zoomText],
          },
    [isOverlayHidden, overlays, slicePosition, windowText, zoomText],
  );
  const nextPoint = keyboardCursor ?? hoverPoint ?? undefined;
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context || size.width === 0) {
      return;
    }
    const pixelRatio = globalThis.devicePixelRatio || 1;
    const deviceWidth = Math.round(size.width * pixelRatio);
    const deviceHeight = Math.round(size.height * pixelRatio);
    if (canvas.width !== deviceWidth || canvas.height !== deviceHeight) {
      canvas.width = deviceWidth;
      canvas.height = deviceHeight;
    }
    const key = [image, voi.center, voi.width, isInverted];
    const cached = frameRef.current;
    if (
      image &&
      (cached.key.length !== key.length || cached.key.some((value, index) => value !== key[index]))
    ) {
      cached.canvas = frameToCanvas(image, voi, isInverted, cached.canvas ?? undefined);
      cached.key = key;
    }
    drawScene(context, {
      size,
      pixelRatio,
      frame: image ? cached.canvas : null,
      frameWidth: image?.width ?? 0,
      frameHeight: image?.height ?? 0,
      transform: transform ?? { originX: 0, originY: 0, scaleX: 1, scaleY: 1 },
      measurements: sliceMeasurements,
      selectedId: selectedId ?? undefined,
      draft: draft ?? undefined,
      nextPoint: draft || keyboardCursor ? nextPoint : undefined,
      hasCursor: keyboardCursor !== null,
      overlays: corners,
    });
  });

  const presets = useMemo(() => {
    const labels: Record<DicomCtPreset, string> = {
      softTissue: messages.dicomPresetSoftTissue,
      lung: messages.dicomPresetLung,
      bone: messages.dicomPresetBone,
      brain: messages.dicomPresetBrain,
      abdomen: messages.dicomPresetAbdomen,
    };
    const builtIn: readonly DicomWindowPreset[] = (
      Object.keys(ctPresetWindows) as DicomCtPreset[]
    ).map((id) => ({
      id,
      label: labels[id],
      windowWidth: ctPresetWindows[id].width,
      windowCenter: ctPresetWindows[id].center,
    }));
    return presetsProp ?? builtIn;
  }, [presetsProp, messages]);

  const applyPreset = (id: string) => {
    if (id === 'default') {
      setWindowState(null);
      if (image) {
        const own = defaultWindow(image);
        announce.run(
          messages.dicomWindowValue({
            width: oneDecimal.format(own.width),
            center: oneDecimal.format(own.center),
          }),
        );
      }
      return;
    }
    const preset = presets.find((candidate) => candidate.id === id);
    if (preset) {
      changeWindow({ center: preset.windowCenter, width: preset.windowWidth });
    }
  };

  const overlayLines = [
    ...(overlays?.topLeft ?? []),
    ...(overlays?.topRight ?? []),
    ...(overlays?.bottomLeft ?? []),
    ...(overlays?.bottomRight ?? []),
  ];
  const status = currentError !== null ? 'error' : isLoading ? 'loading' : 'ready';

  return (
    <div
      ref={mergeRefs(ref, widthRef)}
      role="group"
      aria-label={ariaLabelledBy === undefined ? (ariaLabel ?? messages.dicomViewer) : undefined}
      aria-labelledby={ariaLabelledBy}
      data-dicom-status={total === 0 ? 'ready' : status}
      className={cn(
        'relative flex min-w-0 flex-col gap-2 bg-surface-1',
        isFullScreen && 'fixed inset-0 z-sticky overflow-auto p-3',
        className,
      )}
    >
      <DicomToolbar
        messages={messages}
        tools={tools}
        tool={tool}
        onToolChange={chooseTool}
        presets={
          presets.length > 0
            ? [{ id: 'default', label: messages.dicomPresetDefault }, ...presets]
            : []
        }
        onPreset={applyPreset}
        isInverted={isInverted}
        onInvertedChange={setInverted}
        onResetView={resetView}
        isOverlayShown={!isOverlayHidden}
        onOverlayShownChange={(isShown) => {
          setOverlayHidden(!isShown);
        }}
        hasFullScreen={hasFullScreen}
        isFullScreen={isFullScreen}
        onFullScreenToggle={toggleFullScreen}
        isCompact={isCompact}
      />
      {series !== undefined && series.length > 1 && (
        <SeriesThumbnails
          series={series}
          seriesId={seriesId}
          onSeriesChange={(id) => {
            setSeriesId(id);
            hasNavigated.current = true;
            setSliceState(0);
            setDraft(null);
            setView(initialView);
          }}
          cache={cache}
          messages={messages}
        />
      )}
      <div
        className={cn(
          'relative w-full min-w-0',
          isFullScreen ? 'min-h-64 flex-1' : 'max-sm:aspect-square sm:h-(--dicom-height)',
        )}
        // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the image area's height from `height`.
        style={{ '--dicom-height': height } as CSSProperties}
      >
        {/*
         * A focusable image area with its own key handling (role "application", which jsx-a11y doesn't count as
         * interactive): the keys and what they do are its description.
         */}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- see above. */}
        <div
          ref={viewportRef}
          role="application"
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- see above.
          tabIndex={0}
          aria-label={messages.dicomImage}
          aria-describedby={helpId}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(event) => {
            endPointer(event, false);
          }}
          onPointerCancel={(event) => {
            endPointer(event, true);
          }}
          onPointerLeave={() => {
            if (!gesture.current) {
              setHoverPoint(null);
            }
          }}
          onBlur={() => {
            setKeyboardCursor(null);
          }}
          className={cn(
            'absolute inset-0 touch-none overflow-hidden rounded-control outline-none select-none focus-visible:focus-ring',
            measureKind ? 'cursor-crosshair' : tool === 'pan' ? 'cursor-grab' : 'cursor-default',
          )}
        >
          <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 size-full" />
        </div>
        {total === 0 && (
          <div className="absolute inset-0 flex items-center justify-center rounded-control bg-surface-2">
            <EmptyState title={messages.dicomNoImages} />
          </div>
        )}
        {currentError !== null && (
          <div className="absolute inset-0 flex items-center justify-center overflow-auto rounded-control bg-surface-2">
            <ErrorState
              title={messages.dicomLoadFailed}
              description={
                currentError instanceof DicomParseError && currentError.code === 'compressed'
                  ? messages.dicomCompressed
                  : undefined
              }
              details={currentError instanceof Error ? currentError.message : undefined}
              onRetry={() => {
                setAttempt(attempt + 1);
              }}
            />
          </div>
        )}
        {isLoading && (
          <div className="absolute end-2 top-2 flex items-center rounded-control bg-surface-2 p-1.5 shadow-raised">
            <Spinner size="sm" label={messages.loading} />
          </div>
        )}
      </div>
      {total > 1 && (
        <Slider
          label={messages.dicomSlice}
          minValue={1}
          maxValue={total}
          value={sliceIndex + 1}
          onChange={(value) => {
            setSlice(value - 1);
          }}
          isValueHidden
        />
      )}
      <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-fg-muted tabular-nums">
        {seriesText !== undefined && <span className="text-fg">{seriesText}</span>}
        {total > 0 && <span className="text-fg">{slicePosition}</span>}
        {image && <span>{windowText}</span>}
        {image && <span>{zoomText}</span>}
      </p>
      {measurements.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <p id={measurementsId} className="text-sm font-semibold text-fg">
              {messages.dicomMeasurements}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => {
                setMeasurements([]);
                setSelectedId(null);
              }}
            >
              {messages.clearAll}
            </Button>
          </div>
          <ul aria-labelledby={measurementsId} className="flex flex-col gap-0.5">
            {measurements.map((measurement) => {
              const description = formatter.describe(measurement);
              return (
                <li key={measurement.id} className="flex min-w-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-w-0 flex-1 justify-start truncate"
                    onPress={() => {
                      setSelectedId(measurement.id);
                      if (measurement.seriesId !== undefined && measurement.seriesId !== seriesId) {
                        setSeriesId(measurement.seriesId);
                      }
                      setSlice(measurement.sliceIndex);
                    }}
                  >
                    {description}
                  </Button>
                  <IconButton
                    icon={Trash}
                    size="sm"
                    aria-label={messages.dicomRemoveMeasurement({ measurement: description })}
                    onPress={() => {
                      removeMeasurement(measurement.id);
                    }}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {hasDisclaimer && <p className="text-xs text-fg-muted">{messages.dicomDisclaimer}</p>}
      <p id={helpId} className="sr-only">
        {messages.dicomKeyboardHelp}
      </p>
      {overlayLines.length > 0 && (
        <ul aria-label={messages.dicomImageInformation} className="sr-only">
          {overlayLines.map((line, index) => (
            // Overlay lines can repeat; their position identifies them.
            <li key={index}>{line}</li>
          ))}
        </ul>
      )}
      <div role="status" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
