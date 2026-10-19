// ActionBar: a floating bar of actions for the current selection in a table, list or grid. It shows how many items
// are selected, a button that clears the selection, and the actions, laid out by Toolbar: what doesn't fit moves into
// a "More actions" menu. It slides in while anything is selected and fades out after (at once with reduced motion),
// Escape inside it clears the selection, and screen readers hear the count change.
import { X } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import type { Key } from 'react-aria-components';
import { useEntryMessages } from '../../provider/context';
import { selectionStrings } from '../../provider/coreStrings';
import { cn } from '../../utils/cn';
import { TABBABLE_SELECTOR } from '../../utils/focus';
import { mergeRefs } from '../../utils/mergeRefs';
import { useLatest } from '../../utils/useLatest';
import { useIsReducedMotion } from '../../utils/useMediaQuery';
import { IconButton } from '../IconButton/IconButton';
import { LiveRegion, useAnnouncer } from '../LiveRegion/LiveRegion';
import { Toolbar, type ToolbarItem } from '../Toolbar/Toolbar';

export interface ActionBarProps {
  /** How many items are selected. The bar shows while it's above 0; screen readers hear each change. */
  selectedCount: number;
  /** Clears the selection: the clear button, and Escape while focus is in the bar. */
  onClearSelection: () => void;
  /**
   * The actions for the selected items. Those that don't fit the bar move into a "More actions" menu, lowest
   * `priority` first.
   */
  items?: readonly ToolbarItem[];
  /** Called with an item's `id` when it's chosen, in the bar or the menu. */
  onAction?: (key: Key) => void;
  /**
   * More controls in the actions toolbar, before the `items`. They always stay in the bar: without `items`, those
   * that don't fit beside the count move onto a line of their own, and wrap there.
   */
  children?: ReactNode;
  /** Names the actions toolbar. Defaults to the `selectionActions` message ("Actions for selected items"). */
  'aria-label'?: string;
  /**
   * Classes for the bar. It sticks to the bottom of its scroll container, 1rem up (above the app shell's bottom bar
   * and the safe area on phones), up to `max-w-3xl` wide: put it after the table, list or grid. For a bar fixed to
   * the viewport, pass `fixed inset-x-4`.
   */
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

const enterClasses = 'animate-[rux-toast-in_var(--duration-normal)_var(--ease-standard)]';
// A different animation from the entrance (so it starts afresh), holding its end state until the bar unmounts.
const exitClasses =
  'pointer-events-none animate-[rux-fade-out_var(--duration-normal)_var(--ease-standard)_forwards]';
// With items, the toolbar takes the space beside the count and what doesn't fit moves into its menu. With only
// controls of its own, it keeps their width (moving onto a line of its own when they don't fit beside the count) and
// wraps them on that line, so the page never scrolls sideways.
const childrenOnlyClasses = 'flex-auto flex-wrap';

/**
 * A floating bar for acting on the selected items of a table, list or grid: "3 selected", a button that clears the
 * selection, and the actions. Controlled by the app: pass the selection's size and a way to clear it, and handle the
 * actions with `onAction` (or each item's own `onAction`). When the selection empties while focus is in the bar, focus
 * goes back to where it was when the bar appeared, such as the row checkbox; if that's gone (deleted with the
 * selection), to the first control left in the list around it.
 */
export function ActionBar({
  selectedCount,
  onClearSelection,
  items,
  onAction,
  children,
  'aria-label': ariaLabel,
  className,
  ref,
}: ActionBarProps) {
  const messages = useEntryMessages(selectionStrings);
  const isOpen = selectedCount > 0;
  const isReducedMotion = useIsReducedMotion();
  const [isMounted, setMounted] = useState(isOpen);
  // The count the bar shows, kept while it slides out so it doesn't read "0 selected" on its way.
  const [shownCount, setShownCount] = useState(selectedCount);
  if (isOpen && !isMounted) {
    setMounted(true);
  }
  if (isOpen && selectedCount !== shownCount) {
    setShownCount(selectedCount);
  }
  if (!isOpen && isMounted && isReducedMotion) {
    setMounted(false);
  }

  const { ref: announcerRef, announce } = useAnnouncer();
  const lastCount = useRef(selectedCount);
  useEffect(() => {
    if (selectedCount !== lastCount.current) {
      lastCount.current = selectedCount;
      announce(messages.selectedCount({ count: selectedCount }));
    }
  }, [selectedCount, announce, messages]);

  return (
    <>
      {isMounted && (
        <Bar
          ref={ref}
          isExiting={!isOpen}
          onExited={() => {
            setMounted(false);
          }}
          onClearSelection={onClearSelection}
          count={messages.selectedCount({ count: shownCount })}
          clearLabel={messages.clearSelection}
          className={className}
        >
          <Toolbar
            aria-label={ariaLabel ?? messages.selectionActions}
            items={items}
            onAction={onAction}
            className={cn(
              'min-w-0 justify-end',
              items !== undefined && items.length > 0 ? 'flex-1' : childrenOnlyClasses,
            )}
          >
            {children}
          </Toolbar>
        </Bar>
      )}
      {/* Mounted from the first render, so screen readers announce what's written to it. */}
      <LiveRegion ref={announcerRef} />
    </>
  );
}

/** The focused element and its ancestors below `body`, nearest first. */
function focusPath(): Element[] {
  const path: Element[] = [];
  for (
    let element = document.activeElement;
    element && element !== document.body;
    element = element.parentElement
  ) {
    path.push(element);
  }
  return path;
}

function tryFocus(element: Element | null | undefined): boolean {
  if (!(element instanceof HTMLElement) || !element.isConnected) {
    return false;
  }
  element.focus();
  return document.activeElement === element;
}

/**
 * Puts focus back where it was when the bar appeared (`path`, from `focusPath`). When that element has gone, deleted
 * along with the selection say, focus goes to the first control outside the bar in its nearest ancestor still on the
 * page, such as the next row's checkbox; with no such place, to the first control near the bar itself.
 */
function returnFocus(path: readonly Element[], bar: HTMLElement) {
  if (tryFocus(path[0])) {
    return;
  }
  const barAncestors: Element[] = [];
  for (let element = bar.parentElement; element; element = element.parentElement) {
    barAncestors.push(element);
  }
  for (const ancestor of [...path, ...barAncestors]) {
    if (!ancestor.isConnected) {
      continue;
    }
    if (ancestor.matches(TABBABLE_SELECTOR) && tryFocus(ancestor)) {
      return;
    }
    for (const candidate of ancestor.querySelectorAll(TABBABLE_SELECTOR)) {
      if (!bar.contains(candidate) && tryFocus(candidate)) {
        return;
      }
    }
  }
}

interface BarProps {
  isExiting: boolean;
  onExited: () => void;
  onClearSelection: () => void;
  /** "3 selected". */
  count: string;
  clearLabel: string;
  /** The actions toolbar. */
  children: ReactNode;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/** The bar itself, mounted while it shows and while it slides out. */
function Bar({
  isExiting,
  onExited,
  onClearSelection,
  count,
  clearLabel,
  children,
  className,
  ref,
}: BarProps) {
  const countId = useId();
  const bar = useRef<HTMLDivElement | null>(null);
  /** Focus is in the bar or its overflow menu (whose events reach the bar through React's tree). */
  const hasFocus = useRef(false);
  /** Where focus was when the bar appeared, to go back to when the selection empties while focus is in the bar. */
  const returnPath = useRef<Element[]>([]);
  useLayoutEffect(() => {
    returnPath.current = focusPath();
    // Runs before the bar leaves the page (at once, with reduced motion), while focus can still be seen inside it.
    return () => {
      const element = bar.current;
      if (element && (hasFocus.current || element.contains(document.activeElement))) {
        returnFocus(returnPath.current, element);
      }
    };
  }, []);
  // While it fades out, the bar shows a stale count and actions for an empty selection: out of reach of Tab, the
  // pointer and screen readers. Focus leaves first, so it's never lost with the bar.
  useLayoutEffect(() => {
    const element = bar.current;
    if (!element) {
      return;
    }
    const hadFocus = hasFocus.current || element.contains(document.activeElement);
    element.inert = isExiting;
    if (isExiting && hadFocus) {
      returnFocus(returnPath.current, element);
    }
  }, [isExiting]);

  const onClear = useLatest(onClearSelection);
  // A native listener hears only keys pressed in the bar itself, not in its overflow menu's popover.
  const escapeRef = useCallback(
    (element: HTMLDivElement | null) => {
      bar.current = element;
      if (!element) {
        return;
      }
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && !event.defaultPrevented) {
          event.preventDefault();
          onClear.current();
        }
      };
      element.addEventListener('keydown', onKeyDown);
      return () => {
        element.removeEventListener('keydown', onKeyDown);
      };
    },
    [onClear],
  );
  const rootRef = useMemo(() => mergeRefs(ref, escapeRef), [ref, escapeRef]);

  return (
    <div
      ref={rootRef}
      role="group"
      aria-labelledby={countId}
      onFocus={() => {
        hasFocus.current = true;
      }}
      onBlur={(event) => {
        if (!(
          event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)
        )) {
          hasFocus.current = false;
        }
      }}
      onAnimationEnd={(event) => {
        if (isExiting && event.target === event.currentTarget) {
          onExited();
        }
      }}
      className={cn(
        // Above the app shell's bottom bar on phones (the offset toasts use too) and the safe area.
        'sticky bottom-[calc(var(--rux-toast-bottom-offset,0px)+env(safe-area-inset-bottom)+--spacing(4))] z-sticky mx-auto flex w-full max-w-3xl min-w-0 flex-wrap items-center gap-2 rounded-card border border-border bg-surface-1 p-1.5 shadow-overlay',
        isExiting ? exitClasses : enterClasses,
        className,
      )}
    >
      <IconButton icon={X} aria-label={clearLabel} onPress={onClearSelection} />
      <span id={countId} className="shrink-0 text-sm font-medium whitespace-nowrap text-fg">
        {count}
      </span>
      {children}
    </div>
  );
}
