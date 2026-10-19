import { Maximize, RotateCcw, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import {
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { Toolbar as AriaToolbar, useLocale } from 'react-aria-components';
import { ErrorState } from '../../components/ErrorState/ErrorState';
import { IconButton } from '../../components/IconButton/IconButton';
import { Tooltip } from '../../components/Tooltip/Tooltip';
import { cn } from '../../utils/cn';
import { numberFormat } from '../../utils/intl';
import { clamp, mod } from '../../utils/math';
import {
  capturePointer,
  isPastTapSlop,
  pinchOf,
  pointInElement,
  swipeDirection,
} from '../../utils/pointer';
import { useDebouncedCallback } from '../../utils/timers';
import { useElementSize } from '../../utils/useElementSize';
import { useWheel } from '../../utils/useWheel';
import {
  clampPan,
  fitZoom,
  panLimits,
  toImagePoint,
  viewTransform,
  zoomAt,
  type ImageRotation,
  type ImageView,
  type Point,
  type Size,
} from './geometry';
import { useMediaImageMessages } from './messages';
import type { ImageFit, MediaImage } from './types';

/** The default most the image zooms in, as a scale of its own pixels (8 = 800%). */
const DEFAULT_MAX_ZOOM = 8;
/** Each zoom button press or +/− key zooms by this factor. */
const STEP_ZOOM = 1.25;
/** An arrow key pans by this fraction of the frame (three times as far with Shift). */
const PAN_STEP = 0.1;
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_DISTANCE = 24;
const ANNOUNCE_DELAY_MS = 300;

/** A pointer on the image, for components built on the viewer. */
export interface StagePointer {
  /** Where the pointer is, as fractions of the image's width and height (outside 0–1 when off the image). */
  point: Point;
  /** The element the press started on (for hit-testing overlay content). */
  target: Element | null;
  pointerType: string;
}

/**
 * Lets a component built on the viewer (such as ImageAnnotator) take over pointer and key input. Two-finger pinches
 * always zoom; a gesture that was taken over is cancelled when a second finger lands.
 */
export interface StageInteraction {
  /** A single pointer pressed. Return true to take over the gesture (the viewer won't pan). */
  onPointerDown?: (pointer: StagePointer) => boolean;
  onPointerMove?: (pointer: StagePointer) => void;
  onPointerUp?: (pointer: StagePointer & { isTap: boolean }) => void;
  onPointerCancel?: () => void;
  /** A tap the viewer would otherwise use. Return true if handled, so it doesn't count towards a double tap. */
  onTap?: (pointer: StagePointer) => boolean;
  /** A key pressed on the image. Return true if handled; the viewer then ignores it. */
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => boolean;
}

/** Reads the viewer's current view, for components built on it. */
export interface ImageViewerApi {
  /** The image point at the centre of the frame (fractions, clamped to the image), or null before it loads. */
  getCentre: () => Point | null;
  /** How far the view is zoomed relative to the fitted view (1 = fitted). */
  getZoomRatio: () => number;
}

export interface ImageViewerProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'className' | 'style' | 'children' | 'role'
> {
  image: MediaImage;
  /** Shows the zoom, rotate and reset toolbar. Defaults to true. */
  hasControls?: boolean;
  /** The least zoom, as a scale of the image's own pixels (0.5 = 50%). Never above the fitted zoom. */
  minZoom?: number;
  /** The most zoom, as a scale of the image's own pixels. Defaults to 8 (800%). */
  maxZoom?: number;
  /** How the image first fits the frame. Defaults to `fit`. */
  fit?: ImageFit;
  /** The frame's height, as a CSS length. Defaults to `24rem`. */
  height?: string;
  /** Called with the zoom (1 = 100%) whenever it changes. */
  onZoomChange?: (zoom: number) => void;
  /** Names the viewer. Defaults to the `imageViewer` message. */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/** The viewer with the hooks that Lightbox and ImageAnnotator build on. */
export interface ImageViewerBaseProps extends ImageViewerProps {
  /** Content drawn over the image in its own coordinates (100% × 100% is the whole image); it zooms with it. */
  overlay?: ReactNode;
  interaction?: StageInteraction;
  /** Extra toolbar items before and after the view controls. */
  toolbarStart?: ReactNode;
  toolbarEnd?: ReactNode;
  /** A horizontal swipe on an image that can't pan sideways. */
  onSwipe?: (direction: 'previous' | 'next') => void;
  /** Fills its parent's height instead of using `height`. */
  isFill?: boolean;
  /** Focuses the image when it mounts. */
  shouldAutoFocus?: boolean;
  /** An id of extra help text describing the image area. */
  helpId?: string;
  /** Classes for the image area, such as a cursor for a drawing tool. */
  stageClassName?: string;
  apiRef?: Ref<ImageViewerApi>;
}

type Gesture =
  | {
      type: 'pan';
      start: Point;
      startView: ImageView;
      target: Element | null;
      pointerType: string;
      isMoved: boolean;
      canPanX: boolean;
    }
  | { type: 'claimed'; start: Point; target: Element | null; pointerType: string; isMoved: boolean }
  | { type: 'pinch'; startDistance: number; startMid: Point; startView: ImageView };

interface LoadState {
  src: string;
  attempt: number;
  status: 'loaded' | 'error';
  natural?: Size;
}

const nextRotation = (rotation: ImageRotation, delta: number) =>
  mod(rotation + delta, 360) as ImageRotation;

/** ImageViewer plus the hooks used by Lightbox and ImageAnnotator. */
export function ImageViewerBase({
  image,
  hasControls = true,
  minZoom,
  maxZoom = DEFAULT_MAX_ZOOM,
  fit = 'fit',
  height = '24rem',
  onZoomChange,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  className,
  ref,
  overlay,
  interaction,
  toolbarStart,
  toolbarEnd,
  onSwipe,
  isFill = false,
  shouldAutoFocus = false,
  helpId: extraHelpId,
  stageClassName,
  apiRef,
  ...rest
}: ImageViewerBaseProps) {
  const messages = useMediaImageMessages();
  const { locale, direction } = useLocale();
  const helpId = useId();
  const percent = numberFormat(locale, { style: 'percent', maximumFractionDigits: 0 });
  const stageRef = useRef<HTMLDivElement>(null);
  const [frameRef, frame] = useElementSize();

  // Loading, per source and retry attempt.
  const [attempt, setAttempt] = useState(0);
  const [loadState, setLoadState] = useState<LoadState | null>(null);
  const status =
    loadState?.src === image.src && loadState.attempt === attempt ? loadState.status : 'loading';
  const natural = status === 'loaded' ? loadState?.natural : undefined;
  const imageWidth = natural?.width ?? image.width;
  const imageHeight = natural?.height ?? image.height;
  // The view: rotation, plus a zoom and pan once the user has moved away from the fitted view.
  const [rotation, setRotation] = useState<ImageRotation>(0);
  const [custom, setCustom] = useState<Omit<ImageView, 'rotation'> | null>(null);
  // A new image starts at its fitted view.
  const [viewSrc, setViewSrc] = useState(image.src);
  if (viewSrc !== image.src) {
    setViewSrc(image.src);
    setCustom(null);
    setRotation(0);
  }

  const ready = useMemo(
    () =>
      frame !== undefined &&
      frame.width > 0 &&
      frame.height > 0 &&
      imageWidth !== undefined &&
      imageHeight !== undefined &&
      imageWidth > 0 &&
      imageHeight > 0
        ? { frame, image: { width: imageWidth, height: imageHeight } }
        : null,
    [frame, imageWidth, imageHeight],
  );
  const baseZoom = ready ? fitZoom(ready.frame, ready.image, rotation, fit) : 1;
  const minAllowed = Math.min(minZoom ?? baseZoom, baseZoom);
  const maxAllowed = Math.max(maxZoom, baseZoom);
  const view: ImageView =
    ready && custom
      ? clampPan(
          { ...custom, zoom: clamp(custom.zoom, minAllowed, maxAllowed), rotation },
          ready.frame,
          ready.image,
        )
      : { zoom: baseZoom, panX: 0, panY: 0, rotation };

  // The latest view, for handlers that run more than once between renders (wheel, pointer moves).
  const liveView = useRef(view);
  useLayoutEffect(() => {
    liveView.current = view;
  });

  const hasInteracted = useRef(false);
  const changeView = (next: ImageView) => {
    hasInteracted.current = true;
    liveView.current = next;
    setCustom({ zoom: next.zoom, panX: next.panX, panY: next.panY });
    setRotation(next.rotation);
  };

  // Zoom level: shown in the toolbar, reported, and announced (debounced, so a pinch announces where it stops).
  const zoomText = messages.imageZoomLevel({ zoom: percent.format(view.zoom) });
  const [announcement, setAnnouncement] = useState('');
  const announce = useDebouncedCallback((text: string) => {
    setAnnouncement(text);
  }, ANNOUNCE_DELAY_MS);
  useEffect(() => {
    if (hasInteracted.current) {
      announce.run(zoomText);
    }
  }, [zoomText, announce]);
  const onZoomChangeRef = useRef(onZoomChange);
  useEffect(() => {
    onZoomChangeRef.current = onZoomChange;
  }, [onZoomChange]);
  useEffect(() => {
    onZoomChangeRef.current?.(view.zoom);
  }, [view.zoom]);

  useImperativeHandle(
    apiRef,
    () => ({
      getCentre: () => {
        if (!ready) {
          return null;
        }
        const centre = toImagePoint(
          { x: ready.frame.width / 2, y: ready.frame.height / 2 },
          liveView.current,
          ready.frame,
          ready.image,
        );
        return { x: clamp(centre.x, 0, 1), y: clamp(centre.y, 0, 1) };
      },
      getZoomRatio: () => liveView.current.zoom / baseZoom,
    }),
    [ready, baseZoom],
  );

  const centre = (): Point => ({
    x: (ready?.frame.width ?? 0) / 2,
    y: (ready?.frame.height ?? 0) / 2,
  });

  const zoomTo = (zoom: number, anchor: Point = centre()) => {
    if (!ready) {
      return;
    }
    const current = liveView.current;
    const next = clamp(zoom, minAllowed, maxAllowed);
    if (Math.abs(next - current.zoom) > 1e-9) {
      changeView(zoomAt(current, next, anchor, ready.frame, ready.image));
    }
  };

  const reset = () => {
    hasInteracted.current = true;
    setCustom(null);
    setRotation(0);
  };

  const rotateBy = (delta: number) => {
    const current = liveView.current;
    const turned = nextRotation(current.rotation, delta);
    hasInteracted.current = true;
    setRotation(turned);
    if (custom === null || Math.abs(current.zoom - baseZoom) < 1e-6) {
      // Still at the fitted view: refit for the new orientation.
      setCustom(null);
      return;
    }
    // Turn the pan with the image, so the point in the middle of the frame stays there.
    const radians = (delta * Math.PI) / 180;
    const cos = Math.round(Math.cos(radians));
    const sin = Math.round(Math.sin(radians));
    setCustom({
      zoom: current.zoom,
      panX: current.panX * cos - current.panY * sin,
      panY: current.panX * sin + current.panY * cos,
    });
  };

  /** Pans by a screen offset; returns false when the image can't move that way. */
  const panBy = (dx: number, dy: number): boolean => {
    if (!ready) {
      return false;
    }
    const current = liveView.current;
    const next = clampPan(
      { ...current, panX: current.panX + dx, panY: current.panY + dy },
      ready.frame,
      ready.image,
    );
    if (Math.abs(next.panX - current.panX) < 0.5 && Math.abs(next.panY - current.panY) < 0.5) {
      return false;
    }
    changeView(next);
    return true;
  };

  /** Double-click or double-tap: to 100% at the point, or back to the fitted view from 100%. */
  const toggleActualSize = (anchor: Point) => {
    const current = liveView.current;
    if (Math.abs(current.zoom - 1) < 0.01) {
      if (Math.abs(baseZoom - 1) < 0.01) {
        zoomTo(2, anchor);
      } else {
        hasInteracted.current = true;
        setCustom(null);
      }
      return;
    }
    zoomTo(1, anchor);
  };

  // Pointer gestures: drag to pan, pinch to zoom, double-tap to toggle 100%.
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<Gesture | null>(null);
  const lastTap = useRef<{ time: number; point: Point } | null>(null);
  const [isGesturing, setGesturing] = useState(false);

  const localPoint = (event: { clientX: number; clientY: number }): Point =>
    pointInElement(event, stageRef.current);
  const stagePointer = (
    point: Point,
    target: Element | null,
    pointerType: string,
  ): StagePointer => ({
    point: ready ? toImagePoint(point, liveView.current, ready.frame, ready.image) : point,
    target,
    pointerType,
  });

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!ready || (event.pointerType === 'mouse' && event.button !== 0)) {
      return;
    }
    capturePointer(event.currentTarget, event.pointerId);
    const point = localPoint(event);
    pointers.current.set(event.pointerId, point);
    if (pointers.current.size === 2) {
      // A second finger: pinch to zoom, whatever the first finger was doing.
      if (gesture.current?.type === 'claimed') {
        interaction?.onPointerCancel?.();
      }
      const { distance, mid } = pinchOf([...pointers.current.values()]);
      gesture.current = {
        type: 'pinch',
        startDistance: distance,
        startMid: mid,
        startView: liveView.current,
      };
      lastTap.current = null;
      setGesturing(true);
      return;
    }
    if (pointers.current.size > 2) {
      return;
    }
    const target = event.target instanceof Element ? event.target : null;
    if (interaction?.onPointerDown?.(stagePointer(point, target, event.pointerType))) {
      gesture.current = {
        type: 'claimed',
        start: point,
        target,
        pointerType: event.pointerType,
        isMoved: false,
      };
      return;
    }
    gesture.current = {
      type: 'pan',
      start: point,
      startView: liveView.current,
      target,
      pointerType: event.pointerType,
      isMoved: false,
      canPanX: panLimits(liveView.current, ready.frame, ready.image).x > 0,
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!ready || !pointers.current.has(event.pointerId)) {
      return;
    }
    const point = localPoint(event);
    pointers.current.set(event.pointerId, point);
    const current = gesture.current;
    if (!current) {
      return;
    }
    if (current.type === 'pinch') {
      if (pointers.current.size < 2) {
        return;
      }
      const { distance, mid } = pinchOf([...pointers.current.values()]);
      const zoom = clamp(
        current.startView.zoom * (distance / current.startDistance),
        minAllowed,
        maxAllowed,
      );
      const zoomed = zoomAt(current.startView, zoom, current.startMid, ready.frame, ready.image);
      changeView(
        clampPan(
          {
            ...zoomed,
            panX: zoomed.panX + mid.x - current.startMid.x,
            panY: zoomed.panY + mid.y - current.startMid.y,
          },
          ready.frame,
          ready.image,
        ),
      );
      return;
    }
    const dx = point.x - current.start.x;
    const dy = point.y - current.start.y;
    if (!current.isMoved && isPastTapSlop(dx, dy, current.pointerType)) {
      current.isMoved = true;
      if (current.type === 'pan') {
        setGesturing(true);
      }
    }
    if (current.type === 'claimed') {
      interaction?.onPointerMove?.(stagePointer(point, current.target, current.pointerType));
      return;
    }
    if (!current.isMoved) {
      return;
    }
    const limits = panLimits(current.startView, ready.frame, ready.image);
    if (limits.x > 0 || limits.y > 0) {
      changeView(
        clampPan(
          {
            ...current.startView,
            panX: current.startView.panX + dx,
            panY: current.startView.panY + dy,
          },
          ready.frame,
          ready.image,
        ),
      );
    }
  };

  const handleTap = (point: Point, target: Element | null, pointerType: string, time: number) => {
    if (interaction?.onTap?.(stagePointer(point, target, pointerType))) {
      lastTap.current = null;
      return;
    }
    const previous = lastTap.current;
    if (
      previous &&
      time - previous.time < DOUBLE_TAP_MS &&
      Math.hypot(point.x - previous.point.x, point.y - previous.point.y) < DOUBLE_TAP_DISTANCE
    ) {
      lastTap.current = null;
      toggleActualSize(point);
      return;
    }
    lastTap.current = { time, point };
  };

  const endPointer = (event: PointerEvent<HTMLDivElement>, isCancelled: boolean) => {
    if (!pointers.current.delete(event.pointerId)) {
      return;
    }
    const current = gesture.current;
    if (!current) {
      return;
    }
    if (current.type === 'pinch') {
      // Lifting one finger ends the pinch; the other doesn't start a new gesture.
      if (pointers.current.size === 0) {
        gesture.current = null;
        setGesturing(false);
      }
      return;
    }
    gesture.current = null;
    setGesturing(false);
    const point = localPoint(event);
    if (current.type === 'claimed') {
      if (isCancelled) {
        interaction?.onPointerCancel?.();
      } else {
        interaction?.onPointerUp?.({
          ...stagePointer(point, current.target, current.pointerType),
          isTap: !current.isMoved,
        });
      }
      return;
    }
    if (isCancelled) {
      return;
    }
    if (!current.isMoved) {
      handleTap(point, current.target, current.pointerType, event.timeStamp);
      return;
    }
    const dx = point.x - current.start.x;
    const dy = point.y - current.start.y;
    // A long horizontal drag on an image that can't pan sideways is a swipe.
    const swipe =
      onSwipe && !current.canPanX ? swipeDirection(dx, dy, direction === 'rtl') : undefined;
    if (swipe) {
      onSwipe?.(swipe);
    }
  };

  // The wheel zooms at the pointer. It needs a non-passive listener to stop the page scrolling, and it lets the page
  // scroll once the image can't zoom any further that way.
  const isError = status === 'error';
  useWheel(
    stageRef,
    (event) => {
      if (!ready) {
        return;
      }
      const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? ready.frame.height : 1;
      // Trackpad pinches arrive as wheel events with ctrlKey; they're small, so they get a bigger factor.
      const factor = Math.exp(-event.deltaY * scale * (event.ctrlKey ? 0.01 : 0.002));
      const current = liveView.current;
      const next = clamp(current.zoom * factor, minAllowed, maxAllowed);
      if (event.ctrlKey) {
        // Stop the browser zooming the page.
        event.preventDefault();
      }
      if (Math.abs(next - current.zoom) < 1e-9) {
        return;
      }
      event.preventDefault();
      changeView(zoomAt(current, next, localPoint(event), ready.frame, ready.image));
    },
    // The image area remounts after a failed load is retried.
    isError,
  );

  useEffect(() => {
    if (shouldAutoFocus) {
      stageRef.current?.focus();
    }
  }, [shouldAutoFocus]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (interaction?.onKeyDown?.(event)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (!ready || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    const step = (event.shiftKey ? 3 : 1) * PAN_STEP;
    switch (event.key) {
      case '+':
      case '=':
        zoomTo(liveView.current.zoom * STEP_ZOOM);
        break;
      case '-':
      case '_':
        zoomTo(liveView.current.zoom / STEP_ZOOM);
        break;
      case '0':
        reset();
        break;
      case 'r':
        rotateBy(90);
        break;
      case 'R':
        rotateBy(-90);
        break;
      // An arrow the image can't pan with is left for the page (the lightbox uses it to change image).
      case 'ArrowLeft':
        if (!panBy(ready.frame.width * step, 0)) {
          return;
        }
        break;
      case 'ArrowRight':
        if (!panBy(-ready.frame.width * step, 0)) {
          return;
        }
        break;
      case 'ArrowUp':
        if (!panBy(0, ready.frame.height * step)) {
          return;
        }
        break;
      case 'ArrowDown':
        if (!panBy(0, -ready.frame.height * step)) {
          return;
        }
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
  };

  const limits = ready ? panLimits(view, ready.frame, ready.image) : { x: 0, y: 0 };
  const canPan = limits.x > 0 || limits.y > 0;

  return (
    <div
      {...rest}
      ref={ref}
      role="group"
      aria-label={ariaLabelledBy === undefined ? (ariaLabel ?? messages.imageViewer) : undefined}
      aria-labelledby={ariaLabelledBy}
      data-status={status}
      className={cn('relative flex min-w-0 flex-col gap-2', isFill && 'h-full min-h-0', className)}
    >
      <div
        ref={frameRef}
        className={cn(
          'relative w-full min-w-0 overflow-hidden rounded-control bg-surface-3',
          isFill ? 'min-h-0 flex-1' : 'h-(--rux-image-height)',
        )}
        // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the frame's height from `height`.
        style={{ '--rux-image-height': height } as CSSProperties}
      >
        {status === 'error' ? (
          <div className="absolute inset-0 flex items-center justify-center overflow-auto">
            <ErrorState
              title={messages.imageLoadError}
              description={image.alt}
              onRetry={() => {
                setAttempt((current) => current + 1);
              }}
            />
          </div>
        ) : (
          <>
            {/*
             * A focusable image area with its own key handling (role "application", which jsx-a11y doesn't count as
             * interactive): it's named by the alt text, and the keys and gestures are its description.
             */}
            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- see above. */}
            <div
              ref={stageRef}
              role="application"
              // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- see above.
              tabIndex={0}
              aria-label={image.alt}
              aria-roledescription={messages.imageZoomable}
              aria-describedby={extraHelpId ? `${helpId} ${extraHelpId}` : helpId}
              aria-busy={status === 'loading' || undefined}
              data-gesture={isGesturing || undefined}
              onKeyDown={onKeyDown}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={(event) => {
                endPointer(event, false);
              }}
              onPointerCancel={(event) => {
                endPointer(event, true);
              }}
              className={cn(
                // touch-none: the page mustn't scroll or zoom under a pan or pinch.
                'absolute inset-0 touch-none overflow-hidden outline-none select-none',
                'after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit]',
                'focus-visible:after:ring-2 focus-visible:after:ring-focus focus-visible:after:ring-inset',
                canPan ? (isGesturing ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default',
                stageClassName,
              )}
            >
              <div
                data-image-layer=""
                className={cn(
                  'absolute top-0 left-0 origin-top-left',
                  // Promoted to its own layer only mid-gesture, so it's redrawn sharp when the gesture ends.
                  isGesturing && 'will-change-transform',
                  !ready && 'invisible',
                )}
                // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: one transform on one element moves and zooms the image (and its overlay) smoothly; the variables let overlay markers keep their size.
                style={
                  ready
                    ? ({
                        width: ready.image.width,
                        height: ready.image.height,
                        transform: viewTransform(view, ready.frame, ready.image),
                        '--rux-image-scale': view.zoom,
                        '--rux-image-rotation': view.rotation,
                      } as CSSProperties)
                    : undefined
                }
              >
                <img
                  key={attempt}
                  src={image.src}
                  alt=""
                  draggable={false}
                  decoding="async"
                  onLoad={(event) => {
                    const element = event.currentTarget;
                    setLoadState({
                      src: image.src,
                      attempt,
                      status: 'loaded',
                      natural: { width: element.naturalWidth, height: element.naturalHeight },
                    });
                  }}
                  onError={() => {
                    setLoadState({ src: image.src, attempt, status: 'error' });
                  }}
                  className={cn(
                    'pointer-events-none block max-w-none select-none',
                    ready && 'size-full',
                  )}
                />
                {status === 'loaded' && ready && overlay}
              </div>
            </div>
          </>
        )}
      </div>
      {hasControls && !isError && (
        <AriaToolbar
          aria-label={messages.imageControls}
          className="flex flex-wrap items-center gap-1"
        >
          {toolbarStart}
          <Tooltip content={messages.imageZoomOut}>
            <IconButton
              icon={ZoomOut}
              aria-label={messages.imageZoomOut}
              size="sm"
              isDisabled={!ready || view.zoom <= minAllowed + 1e-6}
              onPress={() => {
                zoomTo(liveView.current.zoom / STEP_ZOOM);
              }}
            />
          </Tooltip>
          <span className="min-w-12 text-center text-sm text-fg-muted tabular-nums">
            {zoomText}
          </span>
          <Tooltip content={messages.imageZoomIn}>
            <IconButton
              icon={ZoomIn}
              aria-label={messages.imageZoomIn}
              size="sm"
              isDisabled={!ready || view.zoom >= maxAllowed - 1e-6}
              onPress={() => {
                zoomTo(liveView.current.zoom * STEP_ZOOM);
              }}
            />
          </Tooltip>
          <Tooltip content={messages.imageRotateLeft}>
            <IconButton
              icon={RotateCcw}
              aria-label={messages.imageRotateLeft}
              size="sm"
              isDisabled={!ready}
              onPress={() => {
                rotateBy(-90);
              }}
            />
          </Tooltip>
          <Tooltip content={messages.imageRotateRight}>
            <IconButton
              icon={RotateCw}
              aria-label={messages.imageRotateRight}
              size="sm"
              isDisabled={!ready}
              onPress={() => {
                rotateBy(90);
              }}
            />
          </Tooltip>
          <Tooltip content={messages.imageResetView}>
            <IconButton
              icon={Maximize}
              aria-label={messages.imageResetView}
              size="sm"
              isDisabled={!ready}
              onPress={reset}
            />
          </Tooltip>
          {toolbarEnd}
        </AriaToolbar>
      )}
      <p id={helpId} className="sr-only">
        {messages.imageViewerHelp}
      </p>
      <div role="status" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}

/**
 * Shows one image that can be zoomed (wheel, pinch, double-click or double-tap for 100%, + and −), panned (drag or
 * arrow keys), rotated in quarter turns and reset (0). The image moves as a single transformed element, so even a
 * very large photo zooms smoothly on a phone. Zoom changes are announced, and a broken image shows an ErrorState
 * with its alt text.
 */
export function ImageViewer(props: ImageViewerProps) {
  return <ImageViewerBase {...props} />;
}
