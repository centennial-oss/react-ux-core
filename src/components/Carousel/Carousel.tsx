// A slide carousel on the WAI-ARIA carousel pattern: a labelled region of slides, previous and next buttons, dots or
// thumbnails, swipes, mouse drags and arrow keys, optional looping, several slides per view, and autoplay that
// pauses on hover and while the page is hidden, and stops when keyboard focus comes in. No dependencies: one CSS
// transform moves the whole track, and a drag writes that transform's offset straight to the element, so nothing
// re-renders per frame. The slides and the picker are memoized, so hover, focus and drag state don't render them.

import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import {
  Children,
  memo,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import { useEntryMessages } from '../../provider/context';
import { carouselStrings } from '../../provider/coreStrings';
import { cn } from '../../utils/cn';
import { isRightToLeft } from '../../utils/direction';
import { TABBABLE_SELECTOR } from '../../utils/focus';
import type { IconComponent } from '../../utils/icon';
import { isFormControlTarget } from '../../utils/keyboard';
import { clamp, mod } from '../../utils/math';
import { mergeRefs } from '../../utils/mergeRefs';
import { capturePointer, isPastTapSlop, swipeDirection } from '../../utils/pointer';
import { useDeadlineTimer } from '../../utils/timers';
import { useControllableState } from '../../utils/useControllableState';
import { useLatest } from '../../utils/useLatest';
import { prefersReducedMotion } from '../../utils/useMediaQuery';
import { useIsPageHidden } from '../../utils/usePageVisibility';
import { useResizeMeasure } from '../../utils/useResizeMeasure';
import { IconButton } from '../IconButton/IconButton';
import type { Columns, GridColumns, Space } from '../Layout/Layout';
import { columnClasses, gapClasses, slideClasses, trackClasses } from './Carousel.styles';
import {
  canMove,
  isTooFarToSlide,
  lastStart,
  loopWindowStart,
  positionOfIndex,
  slidesNear,
  slotOf,
  snapCount,
  snapOfIndex,
  startOfSnap,
  stepPosition,
  type CarouselLayout,
  type CarouselMoveBy,
} from './carouselMath';
import { CarouselPicker } from './CarouselPicker';

export type { CarouselMoveBy } from './carouselMath';

const DEFAULT_INTERVAL_MS = 5000;
/** An `items` carousel jumps, rather than slides past every slide between, when moving further than this many views. */
const FAR_VIEWS = 3;
/** Dragging past either end moves the slides this many times less than the pointer. */
const RUBBER_BAND = 3;

/** Widgets inside slides that use the arrow keys themselves. */
const ARROW_KEY_WIDGETS =
  '[role="listbox"], [role="toolbar"], [role="tablist"], [role="radiogroup"], [role="slider"], [role="spinbutton"], [role="menu"], [role="menubar"], [role="grid"], [role="tree"], [role="treegrid"]';

/**
 * Widgets inside slides that are dragged themselves, so a drag on them is theirs. Others are found as they go: a
 * widget that claims its pointer (its pointer-down handler calls `preventDefault`, as React Aria's sliders do, or it
 * captures the pointer) keeps the drag too.
 */
const DRAG_WIDGETS =
  '[role="slider"], [role="application"], [role="scrollbar"], [draggable="true"], input[type="range"]';

/**
 * The event React Aria dispatches on the element it's about to put focus back on (closing a dialog, say), which an
 * ancestor can cancel to put focus somewhere else.
 */
const RESTORE_FOCUS_EVENT = 'react-aria-focus-scope-restore';

// The arrows point the way the slides go: mirrored right to left.
const PreviousIcon: IconComponent = ({ className, ...props }) => (
  <ChevronLeft {...props} className={cn('rtl:-scale-x-100', className)} />
);
const NextIcon: IconComponent = ({ className, ...props }) => (
  <ChevronRight {...props} className={cn('rtl:-scale-x-100', className)} />
);

/** How many slides are in view, from the custom property the column classes set. */
function readColumns(element: HTMLElement): number {
  const value = Number(getComputedStyle(element).getPropertyValue('--rux-carousel-columns'));
  return Number.isFinite(value) && value >= 1 ? Math.round(value) : 1;
}

/** The carousel needs an accessible name: `aria-label`, or `aria-labelledby` pointing at a visible heading. */
type CarouselLabelProps =
  | { 'aria-label': string; 'aria-labelledby'?: string }
  | { 'aria-label'?: string; 'aria-labelledby': string };

/** Slides as children: each child is a slide. */
interface CarouselSlidesProps {
  items?: never;
  /** The slides: each child is one. */
  children: ReactNode;
  /** Draws a slide's thumbnail for the picker, in place of dots: an image, usually. Gets the slide's index. */
  renderThumbnail?: (index: number) => ReactNode;
}

/** Slides from `items`, each rendered by the `children` function. */
interface CarouselItemsProps<T> {
  /**
   * The data for each slide. Only the slides near the view are rendered, so a long list stays light; children
   * slides, by contrast, render once they first come near and then stay.
   */
  items: readonly T[];
  /** Renders a slide. */
  children: (item: T, index: number) => ReactNode;
  /** Draws a slide's thumbnail for the picker, in place of dots: an image, usually. */
  renderThumbnail?: (item: T, index: number) => ReactNode;
}

interface CarouselBaseProps extends Omit<
  HTMLAttributes<HTMLElement>,
  'className' | 'style' | 'children' | 'aria-label' | 'aria-labelledby' | 'aria-roledescription'
> {
  /** The first slide in view, controlled. */
  index?: number;
  /** The first slide in view at first, uncontrolled. Defaults to 0. */
  defaultIndex?: number;
  /** Called with the first slide in view whenever it changes. */
  onIndexChange?: (index: number) => void;
  /** Slides in view at once: a fixed count, or counts by the carousel's own width (as Grid's). Defaults to 1. */
  columns?: Columns | GridColumns;
  /** The space between slides. Defaults to `md`. */
  gap?: Space;
  /** Whether the arrows, keys, swipes and autoplay move one slide or a page (the slides in view). Defaults to `slide`. */
  moveBy?: CarouselMoveBy;
  /** Moving on from the last slide comes back round to the first, and back from the first to the last. Defaults to false. */
  isLooping?: boolean;
  /**
   * Moves on by itself every `autoPlayIntervalMs`, with a button to stop and start it. It pauses while the pointer is
   * over the carousel and while the page is hidden; keyboard focus coming into the carousel, or dragging the slides,
   * stops it. Starts stopped when the user prefers reduced motion. Defaults to false.
   */
  shouldAutoPlay?: boolean;
  /** Whether autoplay is running, controlled; shows the autoplay button too. */
  isPlaying?: boolean;
  /** Called when the autoplay button, keyboard focus or a drag starts or stops autoplay. */
  onPlayingChange?: (isPlaying: boolean) => void;
  /** Milliseconds each view stays before autoplay moves on. Defaults to 5000. */
  autoPlayIntervalMs?: number;
  /** Shows dots (or thumbnails, with `renderThumbnail`) to jump to any slide. Defaults to true. */
  hasPicker?: boolean;
  className?: string;
  ref?: Ref<HTMLElement>;
}

export type CarouselProps<T = unknown> = CarouselBaseProps &
  CarouselLabelProps &
  (CarouselSlidesProps | CarouselItemsProps<T>);

/** Where the track is: the first slide in view (looping, it counts on past the ends), and where it was before. */
interface Motion {
  position: number;
  /** Where the last move started; the slides it passed, or jumped from, stay drawn until the next move. */
  from: number;
  /** Jumps without sliding: the first render, a resize, or a move too far to slide. */
  isInstant: boolean;
  /** The index this motion shows, to tell a new index (which slides) from a new layout (which jumps). */
  index: number;
}

interface DragState {
  pointerId: number;
  pointerType: string;
  /** The pointer-down, to see afterwards whether something inside claimed the pointer. */
  down: PointerEvent;
  startX: number;
  startY: number;
  isDragging: boolean;
  isRtl: boolean;
  /** One slide's width plus the gap, in CSS pixels. */
  stride: number;
  /** The current offset, in CSS pixels along the screen. */
  offset: number;
}

interface CarouselSlideProps {
  slide: number;
  slot: number;
  isInView: boolean;
  label: string;
  roleDescription: string;
  /** A children slide. */
  child?: ReactNode;
  /** An `items` slide's item, drawn by `render`. */
  item?: unknown;
  render?: (item: never, index: number) => ReactNode;
}

/** One slide, rendered again only when it moves, comes into or leaves the view, or its content changes. */
const CarouselSlide = memo(function CarouselSlide({
  slide,
  slot,
  isInView,
  label,
  roleDescription,
  child,
  item,
  render,
}: CarouselSlideProps) {
  return (
    <div
      data-slide={slide}
      role="group"
      aria-roledescription={roleDescription}
      aria-label={label}
      aria-hidden={isInView ? undefined : true}
      inert={!isInView}
      // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: where the slide is.
      style={{ '--rux-carousel-slot': slot } as CSSProperties}
      className={slideClasses}
    >
      {render ? render(item as never, slide) : child}
    </div>
  );
});

// Two signatures, so each form types its own functions (TypeScript can't tell which `renderThumbnail` a union means).
/**
 * Slides of any content with previous and next buttons, dots or thumbnails, swipes, mouse drags and the arrow keys,
 * following the WAI-ARIA carousel pattern. Shows one slide or several at once (by its own width), moves a slide or a
 * page at a time, and can loop. Slides out of view are inert and hidden from assistive technology; a polite live
 * region reads the new slides as they come into view, except while autoplay runs.
 */
export function Carousel<T>(
  props: CarouselBaseProps & CarouselLabelProps & CarouselItemsProps<T>,
): ReactElement;
/** A carousel of its children: each child is a slide. */
export function Carousel(
  props: CarouselBaseProps & CarouselLabelProps & CarouselSlidesProps,
): ReactElement;
export function Carousel<T = unknown>(props: CarouselProps<T>): ReactElement {
  const {
    items,
    children,
    renderThumbnail,
    index: indexProp,
    defaultIndex = 0,
    onIndexChange,
    columns: columnsProp = 1,
    gap = 'md',
    moveBy = 'slide',
    isLooping = false,
    shouldAutoPlay = false,
    isPlaying: isPlayingProp,
    onPlayingChange,
    autoPlayIntervalMs = DEFAULT_INTERVAL_MS,
    hasPicker = true,
    onKeyDown: onKeyDownProp,
    onFocus: onFocusProp,
    onBlur: onBlurProp,
    onPointerEnter: onPointerEnterProp,
    onPointerLeave: onPointerLeaveProp,
    className,
    ref,
    ...rest
  } = props;
  const messages = useEntryMessages(carouselStrings);
  const viewportId = useId();
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const playButtonRef = useRef<HTMLButtonElement>(null);
  const previousRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  // Read once per new children, not on every render.
  const slides = useMemo(
    () => (items === undefined ? Children.toArray(children) : undefined),
    [items, children],
  );
  const count = items?.length ?? slides?.length ?? 0;
  // The column classes set how many slides are in view, which is read from the track. It's read again when the track
  // resizes (the carousel's width, and so its breakpoints, changed) or the empty probe one column wide inside it does
  // (the columns or the gap changed at the same width).
  const [measureRef, measuredColumns] = useResizeMeasure(
    readColumns,
    Object.is,
    'content-box',
    true,
  );
  const trackRefs = useMemo(() => mergeRefs(trackRef, measureRef), [measureRef]);
  const columns =
    measuredColumns ?? (typeof columnsProp === 'number' ? columnsProp : (columnsProp.base ?? 1));
  const layout: CarouselLayout = {
    count,
    columns,
    isLooping: isLooping && count > columns,
    moveBy,
  };
  const isMovable = canMove(layout);

  const [indexState, setIndex] = useControllableState(indexProp, defaultIndex, onIndexChange);
  const index = clamp(
    Number.isFinite(indexState) ? Math.trunc(indexState) : 0,
    0,
    Math.max(0, count - 1),
  );
  const [motion, setMotion] = useState<Motion>(() => {
    const start = layout.isLooping ? index : positionOfIndex(layout, 0, index);
    return { position: start, from: start, isInstant: true, index };
  });
  /** A move from `start` to `end` that slides, unless it can't, or it's an `items` carousel moving too far. */
  const motionTo = (start: number, end: number, endIndex: number, canSlide: boolean): Motion => {
    const isTooFar = layout.isLooping && isTooFarToSlide(layout, start, end);
    const isInstant =
      !canSlide || isTooFar || (items !== undefined && Math.abs(end - start) > FAR_VIEWS * columns);
    // A loop too short to draw both ends of the move draws only where it ends.
    return { position: end, from: isTooFar ? end : start, isInstant, index: endIndex };
  };
  // Follow a new index (from the app, or the app turning a change down) by sliding to it, and a new layout (columns,
  // slide count, looping) by jumping.
  const resting = positionOfIndex(layout, motion.position, index);
  if (resting !== motion.position || motion.index !== index) {
    setMotion(motionTo(motion.position, resting, index, motion.index !== index));
  }
  const { position, from } = motion;
  const firstIndex = layout.isLooping ? mod(position, count) : position;
  /** Whether slide `slide` is in view. */
  const isInView = (slide: number) => {
    const offset = layout.isLooping ? mod(slide - position, count) : slide - position;
    return offset >= 0 && offset < columns;
  };
  /** The thumbnail last chosen, shown as current while it's in view (with several slides in view). */
  const [chosen, setChosen] = useState<number | null>(null);
  const currentSlide = chosen !== null && chosen < count && isInView(chosen) ? chosen : firstIndex;

  const [isDragging, setDragging] = useState(false);
  /** While dragging: which way, so a looping carousel draws its spare slides on that side. */
  const [dragForward, setDragForward] = useState<boolean>();
  const drag = useRef<DragState | null>(null);
  /** Stops following the dragging pointer on the window. */
  const stopFollowing = useRef<(() => void) | null>(null);
  const isClickSuppressed = useRef(false);

  // Autoplay.
  const hasAutoPlay = shouldAutoPlay || isPlayingProp !== undefined;
  // Autoplay starts stopped for someone who prefers reduced motion (the slides' own movement is instant for them).
  const [isPlayingAtFirst] = useState(() => shouldAutoPlay && !prefersReducedMotion());
  const [isPlaying, setPlaying] = useControllableState(
    isPlayingProp,
    isPlayingAtFirst,
    onPlayingChange,
  );
  const [isHovered, setHovered] = useState(false);
  /** Focus is inside, anywhere but the autoplay button (which has to work while autoplay runs). */
  const [isFocusInside, setFocusInside] = useState(false);
  const isPageHidden = useIsPageHidden();
  const isAutoPlaying = hasAutoPlay && isPlaying && isMovable;
  const isRotating = isAutoPlaying && !isHovered && !isFocusInside && !isPageHidden && !isDragging;

  /** Moves the track to `next` and reports the new first slide; `chosenSlide` is the thumbnail that asked. */
  const move = (next: number, chosenSlide: number | null = null) => {
    setChosen(chosenSlide);
    if (next === position || !isMovable) {
      return;
    }
    const nextIndex = layout.isLooping ? mod(next, count) : next;
    const active = document.activeElement;
    if (
      (active === previousRef.current && stepPosition(layout, next, -1) === next) ||
      (active === nextRef.current && stepPosition(layout, next, 1) === next)
    ) {
      // The arrow with focus is about to be disabled at an end, and the browser would drop focus: keep it in the
      // carousel, where the arrow keys still work.
      viewportRef.current?.focus();
    }
    setMotion(motionTo(position, next, nextIndex, true));
    if (nextIndex !== index) {
      setIndex(nextIndex);
    }
  };
  const step = (steps: number) => {
    move(stepPosition(layout, position, steps));
  };
  const canGoBack = stepPosition(layout, position, -1) !== position;
  const canGoOn = stepPosition(layout, position, 1) !== position;

  // The picker's choices, as functions that keep their identity, so the memoized picker isn't rendered for nothing.
  const choices = useLatest({
    snap: (snap: number) => {
      move(positionOfIndex(layout, position, startOfSnap(layout, snap)));
    },
    // A thumbnail already in view becomes current; any other brings its slide into view first.
    slide: (slide: number) => {
      if (isInView(slide)) {
        setChosen(slide);
      } else {
        move(
          positionOfIndex(layout, position, startOfSnap(layout, snapOfIndex(layout, slide))),
          slide,
        );
      }
    },
  });
  const [onChooseSnap] = useState(() => (snap: number) => {
    choices.current.snap(snap);
  });
  const [onChooseSlide] = useState(() => (slide: number) => {
    choices.current.slide(slide);
  });
  const thumbnailOf = useMemo(() => {
    if (!renderThumbnail) {
      return undefined;
    }
    if (items) {
      const render = renderThumbnail as (item: T, index: number) => ReactNode;
      return (slide: number) => render(items[slide] as T, slide);
    }
    const render = renderThumbnail as (index: number) => ReactNode;
    return (slide: number) => render(slide);
  }, [renderThumbnail, items]);

  const timer = useDeadlineTimer(() => {
    // Without looping, autoplay comes back to the start after the end.
    if (canGoOn) {
      step(1);
    } else {
      move(positionOfIndex(layout, position, 0));
    }
  });
  useEffect(() => {
    if (isRotating) {
      timer.start(autoPlayIntervalMs);
    } else {
      timer.clear();
    }
    // Each move starts the interval again.
  }, [isRotating, autoPlayIntervalMs, position, timer]);

  // Which slides to draw, and where. Looping, each slide is drawn once, in the `count` slots around the view.
  const isForward = dragForward ?? position >= from;
  const windowStart = layout.isLooping
    ? loopWindowStart(layout, from, position, isDragging ? isForward : undefined)
    : 0;
  const near = useMemo(
    () =>
      slidesNear(
        { count, columns, isLooping: layout.isLooping, moveBy },
        from,
        position,
        windowStart,
        motion.isInstant,
      ),
    [count, columns, layout.isLooping, moveBy, from, position, windowStart, motion.isInstant],
  );
  // Children slides render the first time they come near the view, and then stay (so images load lazily), while
  // there's still a child for them.
  const [reached, setReached] = useState<ReadonlySet<number>>(() => new Set());
  const hasStale = useMemo(() => [...reached].some((slide) => slide >= count), [reached, count]);
  if (slides && (hasStale || near.some((slide) => !reached.has(slide)))) {
    setReached(new Set([...reached, ...near].filter((slide) => slide < count)));
  }
  /**
   * The slide focus left the carousel from (for a dialog opened from it, say), kept drawn until focus comes back, so
   * focus put back on it can follow the view even if the view has moved far away meanwhile.
   */
  const [heldSlide, setHeldSlide] = useState<number | null>(null);
  const drawn = useMemo(() => {
    const all = new Set(slides ? [...reached, ...near] : near);
    if (heldSlide !== null) {
      all.add(heldSlide);
    }
    return [...all].filter((slide) => slide < count).sort((a, b) => a - b);
  }, [slides, reached, near, heldSlide, count]);

  /** Focuses the first control in the slide first in view, or else the slides themselves. */
  const focusInView = useLatest(() => {
    const first = trackRef.current?.querySelector(`[data-slide="${String(firstIndex)}"]`);
    (first?.querySelector<HTMLElement>(TABBABLE_SELECTOR) ?? viewportRef.current)?.focus();
  });

  // Focus in a slide that leaves the view would be lost. It moves with the view instead, where the arrow keys still
  // work.
  useLayoutEffect(() => {
    const active = document.activeElement;
    if (active && trackRef.current?.contains(active) && active.closest('[inert]')) {
      focusInView.current();
    }
  }, [position, focusInView]);

  // Focus put back on a slide that has left the view (closing a dialog opened from it, after browsing elsewhere) goes
  // to the slide now in view.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) {
      return;
    }
    const onRestore = (event: Event) => {
      if (event.target instanceof Element && event.target.closest('[inert]')) {
        event.preventDefault();
        focusInView.current();
      }
    };
    track.addEventListener(RESTORE_FOCUS_EVENT, onRestore);
    return () => {
      track.removeEventListener(RESTORE_FOCUS_EVENT, onRestore);
    };
  }, [focusInView]);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    onKeyDownProp?.(event);
    isClickSuppressed.current = false;
    const target = event.target;
    if (
      event.defaultPrevented ||
      !isMovable ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      isFormControlTarget(target) ||
      (target instanceof Element && target.closest(ARROW_KEY_WIDGETS))
    ) {
      return;
    }
    // The slides run the way the page's text does, as the CSS that moves them sees it.
    const isRtl = isRightToLeft(event.currentTarget);
    switch (event.key) {
      case isRtl ? 'ArrowRight' : 'ArrowLeft':
        step(-1);
        break;
      case isRtl ? 'ArrowLeft' : 'ArrowRight':
        step(1);
        break;
      case 'Home':
        move(positionOfIndex(layout, position, 0));
        break;
      case 'End':
        move(positionOfIndex(layout, position, startOfSnap(layout, snapCount(layout) - 1)));
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  const setDragOffset = (offset: number) => {
    trackRef.current?.style.setProperty('--rux-carousel-drag', `${String(offset)}px`);
  };

  // A pointer that goes down on the slides is followed on the window (it can leave the carousel before it has moved
  // far enough to count as a drag), and captured once it's dragging, so it's no longer a press on what it started on.
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    isClickSuppressed.current = false;
    const { target } = event;
    if (
      !isMovable ||
      (event.pointerType === 'mouse' && event.button !== 0) ||
      isFormControlTarget(target) ||
      (target instanceof Element && target.closest(DRAG_WIDGETS)) ||
      (drag.current?.isDragging && drag.current.pointerId !== event.pointerId)
    ) {
      return;
    }
    stopFollowing.current?.();
    drag.current = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      down: event.nativeEvent,
      startX: event.clientX,
      startY: event.clientY,
      isDragging: false,
      isRtl: isRightToLeft(event.currentTarget),
      stride: event.currentTarget.clientWidth / columns,
      offset: 0,
    };
    const onMove = (moveEvent: PointerEvent) => {
      dragHandlers.current.move(moveEvent);
    };
    const onUp = (upEvent: PointerEvent) => {
      dragHandlers.current.end(upEvent, false);
    };
    const onCancel = (cancelEvent: PointerEvent) => {
      dragHandlers.current.end(cancelEvent, true);
    };
    // Capturing, so nothing inside can stop these on their way.
    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', onUp, true);
    window.addEventListener('pointercancel', onCancel, true);
    stopFollowing.current = () => {
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', onCancel, true);
      stopFollowing.current = null;
    };
  };

  const onPointerMove = (event: PointerEvent) => {
    const current = drag.current;
    if (current?.pointerId !== event.pointerId) {
      return;
    }
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    if (!current.isDragging) {
      if (!isPastTapSlop(dx, dy, current.pointerType)) {
        return;
      }
      const { target } = event;
      if (
        Math.abs(dy) > Math.abs(dx) ||
        current.down.defaultPrevented ||
        (target instanceof Element &&
          target !== current.down.target &&
          target.hasPointerCapture(event.pointerId))
      ) {
        // A vertical drag scrolls the page instead; a widget that claimed the pointer when it went down (or captured
        // it since) is dragging itself.
        stopFollowing.current?.();
        drag.current = null;
        return;
      }
      current.isDragging = true;
      capturePointer(viewportRef.current, event.pointerId);
      if (current.pointerType === 'mouse') {
        window.getSelection()?.removeAllRanges();
      }
      setDragging(true);
      setMotion((previous) => ({ ...previous, from: previous.position, isInstant: false }));
    }
    // Towards the next slides is positive. The drag goes up to a view each way (looping, as far as there are slides
    // to fill it); without looping it stretches past the ends, a third as far as the pointer.
    const toward = current.isRtl ? dx : -dx;
    let moved: number;
    if (layout.isLooping) {
      const view = Math.min(columns, count - columns) * current.stride;
      moved = clamp(toward, -view, view);
    } else {
      const view = columns * current.stride;
      const ahead = Math.min(view, (lastStart(layout) - position) * current.stride);
      const behind = Math.min(view, position * current.stride);
      moved = toward;
      if (moved > ahead) {
        moved = Math.min(ahead + (moved - ahead) / RUBBER_BAND, ahead + current.stride / 2);
      } else if (moved < -behind) {
        moved = Math.max(-behind + (moved + behind) / RUBBER_BAND, -behind - current.stride / 2);
      }
    }
    current.offset = current.isRtl ? moved : -moved;
    setDragOffset(current.offset);
    if (moved !== 0 && moved > 0 !== dragForward) {
      setDragForward(moved > 0);
    }
  };

  const endDrag = (event: PointerEvent, isCancelled: boolean) => {
    const current = drag.current;
    if (current?.pointerId !== event.pointerId) {
      return;
    }
    stopFollowing.current?.();
    drag.current = null;
    if (!current.isDragging) {
      return;
    }
    // A mouse drag ends with a click on whatever is under the pointer; it isn't one.
    isClickSuppressed.current = current.pointerType !== 'touch';
    setDragOffset(0);
    setDragging(false);
    setDragForward(undefined);
    if (isCancelled) {
      return;
    }
    if (isAutoPlaying) {
      setPlaying(false);
    }
    const toward = (current.isRtl ? current.offset : -current.offset) / current.stride;
    let steps = Math.round(toward / (moveBy === 'page' ? columns : 1));
    if (steps === 0) {
      const swipe = swipeDirection(
        event.clientX - current.startX,
        event.clientY - current.startY,
        current.isRtl,
      );
      steps = swipe === 'next' ? 1 : swipe === 'previous' ? -1 : 0;
    }
    step(steps);
  };

  const dragHandlers = useLatest({ move: onPointerMove, end: endDrag });
  useEffect(
    () => () => {
      stopFollowing.current?.();
    },
    [],
  );

  const onFocus = (event: FocusEvent<HTMLElement>) => {
    onFocusProp?.(event);
    setHeldSlide(null);
    const isPlayButton = event.target === playButtonRef.current;
    setFocusInside(!isPlayButton);
    // As in the WAI-ARIA pattern, keyboard focus coming into the carousel stops autoplay until it's started again.
    if (!isPlayButton && isAutoPlaying && event.target.matches(':focus-visible')) {
      setPlaying(false);
    }
  };
  const onBlur = (event: FocusEvent<HTMLElement>) => {
    onBlurProp?.(event);
    if (!(
      event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)
    )) {
      setFocusInside(false);
      const slide = event.target.closest('[data-slide]');
      setHeldSlide(
        slide && trackRef.current?.contains(slide)
          ? Number(slide.getAttribute('data-slide'))
          : null,
      );
    }
  };

  return (
    // The carousel's own keys work wherever focus is inside it, as in the WAI-ARIA carousel pattern.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- see above.
    <section
      {...rest}
      ref={ref}
      aria-roledescription={messages.carousel}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      onPointerEnter={(event) => {
        onPointerEnterProp?.(event);
        if (event.pointerType === 'mouse') {
          setHovered(true);
        }
      }}
      onPointerLeave={(event) => {
        onPointerLeaveProp?.(event);
        setHovered(false);
      }}
      className={cn('@container flex min-w-0 flex-col gap-3', className)}
    >
      {/* Swipes and mouse drags move the slides; vertical swipes still scroll the page, and pinches zoom it. */}
      <div
        ref={viewportRef}
        id={viewportId}
        tabIndex={-1}
        aria-live={isAutoPlaying && !isFocusInside ? 'off' : 'polite'}
        aria-atomic="false"
        // Listening as the event comes down, as buttons and links in the slides stop it going up.
        onPointerDownCapture={onPointerDown}
        onClickCapture={(event) => {
          if (isClickSuppressed.current) {
            isClickSuppressed.current = false;
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onDragStart={(event) => {
          // Images and links would start the browser's own drag instead.
          if (isMovable) {
            event.preventDefault();
          }
        }}
        className={cn(
          // Clipped sideways only, so shadows and focus rings above and below the slides still show.
          'min-w-0 overflow-x-clip outline-none focus-visible:focus-ring',
          columnClasses(columnsProp),
          gapClasses[gap],
          isMovable && 'touch-pan-y touch-pinch-zoom',
          isDragging && 'cursor-grabbing select-none',
        )}
      >
        <div
          ref={trackRefs}
          data-dragging={isDragging || undefined}
          data-instant={motion.isInstant || undefined}
          // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: where the track is.
          style={{ '--rux-carousel-position': position } as CSSProperties}
          className={trackClasses}
        >
          {/* First, as the column count is read again when it resizes. */}
          <div aria-hidden className="col-start-1 row-start-1 h-0" />
          {drawn.map((slide) => {
            const slot = slotOf(layout, slide, windowStart);
            return (
              <CarouselSlide
                key={slide}
                slide={slide}
                slot={slot}
                isInView={slot >= position && slot < position + columns}
                label={messages.carouselSlideLabel({ position: slide + 1, total: count })}
                roleDescription={messages.carouselSlide}
                child={slides?.[slide]}
                item={items?.[slide]}
                render={items ? (children as (item: never, index: number) => ReactNode) : undefined}
              />
            );
          })}
        </div>
      </div>
      {isMovable && (
        // Inset a little, so the arrows' focus rings and touch targets stay inside the carousel's width.
        <div className="flex min-w-0 items-center gap-2 px-1">
          {hasAutoPlay && (
            <IconButton
              ref={playButtonRef}
              icon={isPlaying ? Pause : Play}
              aria-label={isPlaying ? messages.carouselPause : messages.carouselPlay}
              variant="outline"
              onPress={() => {
                setPlaying(!isPlaying);
              }}
            />
          )}
          <IconButton
            ref={previousRef}
            icon={PreviousIcon}
            aria-label={messages.carouselPrevious}
            aria-controls={viewportId}
            variant="outline"
            isDisabled={!canGoBack}
            onPress={() => {
              step(-1);
            }}
          />
          <div className="min-w-0 flex-1">
            {hasPicker && (
              <CarouselPicker
                count={count}
                snaps={snapCount(layout)}
                currentSnap={snapOfIndex(layout, firstIndex)}
                currentSlide={currentSlide}
                firstIndex={firstIndex}
                moveBy={moveBy}
                thumbnailOf={thumbnailOf}
                messages={messages}
                onChooseSnap={onChooseSnap}
                onChooseSlide={onChooseSlide}
              />
            )}
          </div>
          <IconButton
            ref={nextRef}
            icon={NextIcon}
            aria-label={messages.carouselNext}
            aria-controls={viewportId}
            variant="outline"
            isDisabled={!canGoOn}
            onPress={() => {
              step(1);
            }}
          />
        </div>
      )}
    </section>
  );
}
