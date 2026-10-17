// SplitView: two or more panes side by side (or stacked top to bottom) with handles between them that resize the
// panes by mouse, touch or keyboard. Below a container width the last pane moves into a Drawer, or every pane stacks.

import {
  Children,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { useLocale } from 'react-aria-components';
import { useEntryMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import { useControllableState } from '../../utils/useControllableState';
import { Drawer } from '../Drawer/Drawer';
import { defaultSplitViewMessages } from './messages';
import {
  dragPair,
  fitToMinimums,
  lengthToPx,
  minToPercent,
  normalizeSizes,
  pairRange,
  stepPair,
  withPair,
  type FontSizes,
  type PairLimits,
} from './sizes';
import { useElementSize } from './useElementSize';

export interface SplitViewProps {
  /** `horizontal` puts the panes side by side; `vertical` stacks them top to bottom. Defaults to `horizontal`. */
  orientation?: 'horizontal' | 'vertical';
  /** Two or more panes, in order. The last one is the secondary pane (the detail in a list and detail view). */
  children: ReactNode;
  /** The panes' sizes in percent (they're scaled to add up to 100). Controlled; see `defaultSizes`. */
  sizes?: readonly number[];
  /** The starting sizes, uncontrolled. Defaults to equal sizes. */
  defaultSizes?: readonly number[];
  /** Called with the new sizes while a handle moves, for the app to keep (for example in local storage). */
  onSizesChange?: (sizes: number[]) => void;
  /** Each pane's smallest size: a number is a percentage, a string a CSS length (`240px`, `16rem`, `20em`, `30%`). */
  minSizes?: readonly (number | string)[];
  /**
   * Panes that can collapse to nothing: dragging past half their minimum, stepping below it, Home or End, or Enter
   * or a double-click on a neighbouring handle collapses (and restores) them.
   */
  collapsibleIndexes?: readonly number[];
  /** Below this container width (a CSS length), the panes stop sitting side by side. Defaults to `48rem`. */
  stackBelow?: string;
  /**
   * What happens to the secondary (last) pane below `stackBelow`: `drawer` (default) moves it into a Drawer that
   * `isSecondaryOpen` opens, `stack` stacks every pane top to bottom.
   */
  secondaryPresentation?: 'drawer' | 'stack';
  /** Whether the secondary pane's drawer is open (narrow containers only). Controlled; see `defaultSecondaryOpen`. */
  isSecondaryOpen?: boolean;
  defaultSecondaryOpen?: boolean;
  /** Called when the drawer opens or closes (for example dismissed with Escape or a swipe). */
  onSecondaryOpenChange?: (isOpen: boolean) => void;
  /** Called when the container crosses `stackBelow`, so the app can show a button that opens the drawer. */
  onStackedChange?: (isStacked: boolean) => void;
  /** Names for the panes: they name the handles ("Resize Planets") and the secondary pane's drawer. */
  paneLabels?: readonly string[];
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/** A keyboard step, in percent. */
const STEP = 5;

const separatorClasses = {
  horizontal: 'w-px cursor-col-resize self-stretch',
  vertical: 'h-px cursor-row-resize',
};

const gripClasses = {
  horizontal: 'h-8 w-1.5',
  vertical: 'h-1.5 w-8',
};

/** Reads the font sizes that `rem` and `em` lengths resolve against. */
function fontSizesOf(element: HTMLElement | null): FontSizes {
  const root = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const own = element ? parseFloat(getComputedStyle(element).fontSize) || root : root;
  return { root, own };
}

/**
 * Two or more resizable panes for master–detail lists, inspectors, editors with previews and log panes. Each
 * handle is a focusable `separator`: drag it (mouse or touch), use the arrow keys (5% steps), Home and End, and
 * Enter or a double-click to collapse and restore a collapsible neighbour. Sizes are reported for the app to keep.
 * It adapts to its container's width: below `stackBelow` the last pane becomes a Drawer (or the panes stack).
 */
export function SplitView({
  orientation = 'horizontal',
  children,
  sizes: sizesProp,
  defaultSizes,
  onSizesChange,
  minSizes,
  collapsibleIndexes,
  stackBelow = '48rem',
  secondaryPresentation = 'drawer',
  isSecondaryOpen,
  defaultSecondaryOpen = false,
  onSecondaryOpenChange,
  onStackedChange,
  paneLabels,
  className,
  ref,
}: SplitViewProps) {
  const messages = useEntryMessages(defaultSplitViewMessages);
  const { direction } = useLocale();
  const panes = Children.toArray(children);
  const count = panes.length;
  const baseId = useId();
  const isHorizontal = orientation === 'horizontal';

  const [sizeRef, size, element] = useElementSize();
  const setRoot = useCallback(
    (node: HTMLDivElement | null) => {
      const cleanupSize = sizeRef(node);
      const cleanupRef = typeof ref === 'function' ? ref(node) : undefined;
      if (ref && typeof ref === 'object') {
        ref.current = node;
      }
      return () => {
        cleanupSize?.();
        if (typeof cleanupRef === 'function') {
          cleanupRef();
        } else if (typeof ref === 'function') {
          ref(null);
        } else if (ref) {
          ref.current = null;
        }
      };
    },
    [sizeRef, ref],
  );

  // Font sizes change rarely; re-read them when the container resizes (a zoom or a theme change resizes it too).
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `size` is there to re-read them on resize
  const fonts = useMemo(() => fontSizesOf(element), [element, size]);
  const stackPx = lengthToPx(stackBelow, size?.width, fonts) ?? 0;
  const isStacked = size !== undefined && count > 1 && size.width < stackPx;

  const onStackedChangeRef = useRef(onStackedChange);
  useEffect(() => {
    onStackedChangeRef.current = onStackedChange;
  }, [onStackedChange]);
  const isMeasured = size !== undefined;
  useEffect(() => {
    if (isMeasured) {
      onStackedChangeRef.current?.(isStacked);
    }
  }, [isStacked, isMeasured]);

  const [rawSizes, setRawSizes] = useControllableState<readonly number[]>(
    sizesProp,
    normalizeSizes(defaultSizes, count),
    onSizesChange as ((next: readonly number[]) => void) | undefined,
  );
  const [secondaryOpen, setSecondaryOpen] = useControllableState(
    isSecondaryOpen,
    defaultSecondaryOpen,
    onSecondaryOpenChange,
  );

  const axisPx = isHorizontal ? size?.width : size?.height;
  const mins = useMemo(
    () => panes.map((_, index) => minToPercent(minSizes?.[index], axisPx, fonts)),
    // Only the count of panes matters here, not their content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count, minSizes, axisPx, fonts],
  );
  const sizes = useMemo(
    () => fitToMinimums(normalizeSizes(rawSizes, count), mins),
    [rawSizes, count, mins],
  );
  const collapsible = new Set(collapsibleIndexes);
  /** Each collapsed pane's size before it collapsed, to restore it. */
  const restoreSizes = useRef(new Map<number, number>());
  const drag = useRef<{
    pointerId: number;
    index: number;
    start: number;
    startSizes: number[];
    axisPx: number;
  } | null>(null);

  const limitsAt = (index: number): PairLimits => ({
    minBefore: mins[index] ?? 0,
    minAfter: mins[index + 1] ?? 0,
    isBeforeCollapsible: collapsible.has(index),
    isAfterCollapsible: collapsible.has(index + 1),
  });

  const commit = (next: number[]) => {
    next.forEach((value, index) => {
      const previous = sizes[index] ?? 0;
      if (value === 0 && previous > 0) {
        restoreSizes.current.set(index, previous);
      }
    });
    setRawSizes(next.map((value) => Math.round(value * 100) / 100));
  };

  const paneName = (index: number) =>
    paneLabels?.[index] ?? messages.splitViewPane({ position: index + 1 });
  const paneId = (index: number) => `${baseId}-pane-${String(index)}`;

  /** Collapses the collapsible neighbour of a handle (the pane after it first), or restores it. */
  const toggleCollapse = (index: number) => {
    const target = collapsible.has(index + 1) ? index + 1 : collapsible.has(index) ? index : null;
    if (target === null) {
      return;
    }
    const other = target === index ? index + 1 : index;
    const total = (sizes[index] ?? 0) + (sizes[index + 1] ?? 0);
    const current = sizes[target] ?? 0;
    let targetSize = 0;
    if (current === 0) {
      const remembered = restoreSizes.current.get(target) ?? total / 2;
      const room = total - (mins[other] ?? 0);
      targetSize = Math.min(Math.max(remembered, mins[target] ?? 0), Math.max(room, 0));
    }
    const next = [...sizes];
    next[target] = targetSize;
    next[other] = total - targetSize;
    commit(next);
  };

  const onKeyDown = (index: number) => (event: KeyboardEvent<HTMLDivElement>) => {
    const before = sizes[index] ?? 0;
    const total = before + (sizes[index + 1] ?? 0);
    const limits = limitsAt(index);
    const range = pairRange(total, limits);
    const isRtl = direction === 'rtl';
    // The keys that grow the pane before the handle: right (left in RTL) when side by side, down when stacked.
    const grow = isHorizontal ? (isRtl ? 'ArrowLeft' : 'ArrowRight') : 'ArrowDown';
    const shrink = isHorizontal ? (isRtl ? 'ArrowRight' : 'ArrowLeft') : 'ArrowUp';
    let next: number | null = null;
    switch (event.key) {
      case grow:
        next = stepPair(before, before + STEP, total, limits);
        break;
      case shrink:
        next = stepPair(before, before - STEP, total, limits);
        break;
      case 'Home':
        next = range.min;
        break;
      case 'End':
        next = range.max;
        break;
      case 'Enter':
        event.preventDefault();
        toggleCollapse(index);
        return;
      default:
        return;
    }
    event.preventDefault();
    if (next !== before) {
      commit(withPair(sizes, index, next));
    }
  };

  const onPointerDown = (index: number) => (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !element) {
      return;
    }
    event.preventDefault();
    event.currentTarget.focus();
    try {
      // Keeps the moves coming while the pointer is off the thin handle.
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // The pointer is already gone (or was synthetic); the drag still follows moves over the handle.
    }
    const rect = element.getBoundingClientRect();
    drag.current = {
      pointerId: event.pointerId,
      index,
      start: isHorizontal ? event.clientX : event.clientY,
      startSizes: [...sizes],
      axisPx: (isHorizontal ? rect.width : rect.height) || 1,
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (current?.pointerId !== event.pointerId) {
      return;
    }
    const { index, startSizes } = current;
    let delta = (isHorizontal ? event.clientX : event.clientY) - current.start;
    if (isHorizontal && direction === 'rtl') {
      delta = -delta;
    }
    const before = startSizes[index] ?? 0;
    const total = before + (startSizes[index + 1] ?? 0);
    const next = dragPair(before + (delta / current.axisPx) * 100, total, limitsAt(index));
    if (Math.abs(next - (sizes[index] ?? 0)) > 0.01) {
      commit(withPair(sizes, index, next));
    }
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId === event.pointerId) {
      drag.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    }
  };

  const isDrawer = isStacked && secondaryPresentation === 'drawer';
  const lastIndex = count - 1;

  let content: ReactNode;
  if (isStacked) {
    const stacked = isDrawer ? panes.slice(0, lastIndex) : panes;
    content = (
      <>
        {stacked.map((pane, index) => (
          <div
            // Panes have no ids of their own; their order is their identity.
            key={index}
            id={paneId(index)}
            className={cn('min-w-0', isDrawer ? 'min-h-0 flex-1 overflow-auto' : 'flex-none')}
          >
            {pane}
          </div>
        ))}
        {isDrawer && (
          <Drawer
            title={paneLabels?.[lastIndex] ?? messages.splitViewDetails}
            isOpen={secondaryOpen}
            onOpenChange={setSecondaryOpen}
          >
            {panes[lastIndex]}
          </Drawer>
        )}
      </>
    );
  } else {
    content = panes.map((pane, index) => {
      const paneSize = sizes[index] ?? 0;
      const isCollapsed = paneSize === 0;
      const total = paneSize + (sizes[index + 1] ?? 0);
      const range = pairRange(total, limitsAt(index));
      return (
        <div key={index} className="contents">
          <div
            id={paneId(index)}
            hidden={isCollapsed}
            className="min-h-0 min-w-0 overflow-auto"
            // eslint-disable-next-line no-restricted-syntax -- each pane's share of the space comes from its size
            style={{ flex: `${String(paneSize)} 1 0px` }}
          >
            {pane}
          </div>
          {index < lastIndex && (
            // A focusable separator is a widget (a window splitter), so it takes focus and keys.
            // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
            <div
              role="separator"
              // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
              tabIndex={0}
              aria-orientation={isHorizontal ? 'vertical' : 'horizontal'}
              aria-valuenow={Math.round(paneSize)}
              aria-valuemin={Math.round(range.min)}
              aria-valuemax={Math.round(range.max)}
              aria-controls={paneId(index)}
              aria-label={messages.splitViewResize({ pane: paneName(index) })}
              onKeyDown={onKeyDown(index)}
              onPointerDown={onPointerDown(index)}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onDoubleClick={() => {
                toggleCollapse(index);
              }}
              className={cn(
                'group/handle hit-area z-sticky shrink-0 touch-none bg-border outline-none select-none',
                'transition-colors duration-fast hover:bg-accent-solid focus-visible:bg-accent-solid active:bg-accent-solid',
                'focus-visible:focus-ring',
                separatorClasses[orientation],
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'absolute top-1/2 left-1/2 -translate-1/2 rounded-full border border-border-strong bg-surface-2',
                  'group-hover/handle:border-accent-solid group-focus-visible/handle:border-accent-solid',
                  gripClasses[orientation],
                )}
              />
            </div>
          )}
        </div>
      );
    });
  }

  return (
    <div
      ref={setRoot}
      data-stacked={isStacked || undefined}
      className={cn(
        'flex h-full min-h-0 w-full min-w-0',
        isStacked
          ? cn('flex-col', !isDrawer && 'overflow-auto')
          : isHorizontal
            ? 'flex-row'
            : 'flex-col',
        className,
      )}
    >
      {content}
    </div>
  );
}
