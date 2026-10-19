// ContextMenuTrigger: opens a Menu where the user right-clicks inside an area, long-presses it on a touch screen, or
// presses Shift+F10 or the context menu key while focus is inside it. The menu is anchored to an invisible point at
// the pointer (or under the focused element), so it opens where the user asked, and on phones it's a bottom sheet
// like every other menu. The point lives on the page's body: inside the area, a transformed or contained ancestor
// (an animation, a drawer, Storybook's docs page) would move it away from the pointer.

import {
  Children,
  isValidElement,
  cloneElement,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  type Ref,
} from 'react';
import { createPortal } from 'react-dom';
import { Button as AriaButton, useLocale } from 'react-aria-components';
import { useCommonMessages } from '../../provider/context';
import { mergeRefs } from '../../utils/mergeRefs';
import { useDeadlineTimer } from '../../utils/timers';
import { useControllableState } from '../../utils/useControllableState';
import { useLatest } from '../../utils/useLatest';
import { MenuTrigger } from '../Menu/Menu';

/** How long a touch must be held to open the menu, in milliseconds. */
const LONG_PRESS_MS = 500;
/** How far a held touch may move (in pixels) before it counts as a scroll instead. */
const LONG_PRESS_SLOP = 10;
/** Text fields keep the browser's own menu (spelling, paste, autofill). */
const NATIVE_MENU_TARGETS =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

/** The props ContextMenuTrigger adds to its target. */
export interface ContextMenuTargetProps {
  onContextMenu?: (event: MouseEvent<HTMLElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
  onPointerDown?: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove?: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp?: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel?: (event: PointerEvent<HTMLElement>) => void;
  ref?: Ref<HTMLElement>;
}

export interface ContextMenuTriggerProps {
  /**
   * The area (its first child: one element, or a component that passes the handlers and `ref` above to one) and the
   * `Menu` (its second child).
   */
  children: [ReactElement<ContextMenuTargetProps>, ReactElement];
  /** Controlled open state. Opened this way, without a pointer, the menu sits at the area's start corner. */
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  /** Leaves the browser's own context menu in place. */
  isDisabled?: boolean;
  /** Accessible name for the menu. Defaults to the Menu's `aria-label`, then the `moreActions` message. */
  menuLabel?: string;
}

interface Point {
  x: number;
  y: number;
}

/** The element a keyboard user is on: the focused element, or the cell or option it points at as active. */
function keyboardAnchor(fallback: Element): Element {
  const focused = document.activeElement ?? fallback;
  const activeId = focused.getAttribute('aria-activedescendant');
  return (activeId ? document.getElementById(activeId) : null) ?? focused;
}

/**
 * Opens a `Menu` at the pointer when the user right-clicks inside an area, long-presses it on a touch screen, or
 * presses Shift+F10 or the context menu key while focus is inside it (the menu then opens under the focused element,
 * or under the item its `aria-activedescendant` points at). Pairs the area (its first child) with the `Menu` (its
 * second child), like `MenuTrigger`. Text fields inside the area keep the browser's own menu. Keyboard and screen
 * reader users should also reach the same actions another way, such as a "More actions" menu button.
 */
export function ContextMenuTrigger({
  children,
  isOpen: isOpenProp,
  onOpenChange,
  isDisabled = false,
  menuLabel,
}: ContextMenuTriggerProps) {
  const messages = useCommonMessages();
  const { direction } = useLocale();
  const [target, menu] = Children.toArray(children) as [
    ReactElement<ContextMenuTargetProps>,
    ReactElement<{ 'aria-label'?: string }>,
  ];
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [point, setPoint] = useState<Point | null>(null);
  const [isOpen, setOpen] = useControllableState(isOpenProp, false, onOpenChange);
  const isOpenRef = useLatest(isOpen);
  const press = useRef<(Point & { pointerId: number }) | null>(null);

  const openAt = (at: Point) => {
    setPoint(at);
    if (!isOpenRef.current) {
      isOpenRef.current = true;
      setOpen(true);
    }
  };

  const longPress = useDeadlineTimer(() => {
    const start = press.current;
    press.current = null;
    if (start) {
      openAt(start);
    }
  });

  const isNativeTarget = (element: EventTarget | null) =>
    element instanceof Element && element.closest(NATIVE_MENU_TARGETS) !== null;

  if (!isValidElement(target)) {
    return null;
  }
  const ref = mergeRefs(target.props.ref, setTargetElement);

  // Opened by the app without a pointer: anchor to the area's start corner.
  let anchor = point;
  if (anchor === null && isOpen && targetElement) {
    const rect = targetElement.getBoundingClientRect();
    anchor = { x: direction === 'rtl' ? rect.right : rect.left, y: rect.top };
  }

  const theirs = target.props;
  const cancelLongPress = () => {
    press.current = null;
    longPress.clear();
  };
  const openAtKeyboardAnchor = (currentTarget: Element) => {
    const rect = keyboardAnchor(currentTarget).getBoundingClientRect();
    openAt({ x: direction === 'rtl' ? rect.right : rect.left, y: rect.bottom });
  };
  // The target's own handlers run first; one that calls `preventDefault` keeps the menu closed.
  const ownProps: ContextMenuTargetProps = isDisabled
    ? { ref }
    : {
        ref,
        onContextMenu: (event) => {
          theirs.onContextMenu?.(event);
          if (event.defaultPrevented || isNativeTarget(event.target)) {
            return;
          }
          event.preventDefault();
          cancelLongPress();
          // A context menu key press arrives with no pointer position: anchor it like Shift+F10.
          if (event.clientX === 0 && event.clientY === 0) {
            openAtKeyboardAnchor(event.currentTarget);
          } else {
            openAt({ x: event.clientX, y: event.clientY });
          }
        },
        onKeyDown: (event) => {
          theirs.onKeyDown?.(event);
          const isMenuKey = event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey);
          if (event.defaultPrevented || !isMenuKey || isNativeTarget(event.target)) {
            return;
          }
          event.preventDefault();
          openAtKeyboardAnchor(event.currentTarget);
        },
        // iOS doesn't fire `contextmenu` for a long press, so touch holds are timed here (Android fires both; the
        // second open only moves the anchor).
        onPointerDown: (event) => {
          theirs.onPointerDown?.(event);
          if (event.pointerType !== 'touch' || isNativeTarget(event.target)) {
            return;
          }
          press.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
          longPress.start(LONG_PRESS_MS);
        },
        onPointerMove: (event) => {
          theirs.onPointerMove?.(event);
          const start = press.current;
          if (
            start?.pointerId === event.pointerId &&
            Math.hypot(event.clientX - start.x, event.clientY - start.y) > LONG_PRESS_SLOP
          ) {
            cancelLongPress();
          }
        },
        onPointerUp: (event) => {
          theirs.onPointerUp?.(event);
          cancelLongPress();
        },
        onPointerCancel: (event) => {
          theirs.onPointerCancel?.(event);
          cancelLongPress();
        },
      };

  return (
    <>
      {/* eslint-disable-next-line react-hooks/refs -- the handlers read refs only when events run, not in render. */}
      {cloneElement(target, ownProps)}
      {isOpen && anchor !== null && (
        <MenuTrigger
          // A context menu opens right at its point (no gap) and isn't announced as a popup button.
          trigger="contextMenu"
          isOpen
          onOpenChange={(next) => {
            if (!next) {
              isOpenRef.current = false;
              setPoint(null);
              setOpen(false);
            }
          }}
        >
          {createPortal(
            <AriaButton
              excludeFromTabOrder
              aria-label={menuLabel ?? menu.props['aria-label'] ?? messages.moreActions}
              className="pointer-events-none fixed size-0 opacity-0"
              // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the point the menu opens at.
              style={{ left: anchor.x, top: anchor.y }}
            />,
            document.body,
          )}
          {menu}
        </MenuTrigger>
      )}
    </>
  );
}
