import { useContext, useLayoutEffect, useRef, type ReactNode, type Ref } from 'react';
import {
  SelectionIndicator,
  Tab as AriaTab,
  TabList as AriaTabList,
  TabListStateContext,
  TabPanel as AriaTabPanel,
  Tabs as AriaTabs,
  type Key,
  type TabListProps as AriaTabListProps,
  type TabPanelProps as AriaTabPanelProps,
  type TabProps as AriaTabProps,
  type TabsProps as AriaTabsProps,
} from 'react-aria-components';
import { useLinkComponent } from '../../provider/context';
import { cn } from '../../utils/cn';
import type { IconComponent } from '../../utils/icon';
import { disabledClasses } from '../../utils/stateClasses';
import { prefersReducedMotion } from '../../utils/useMediaQuery';

type ReplacedProps = 'className' | 'style' | 'children' | 'render';

export interface TabsProps extends Omit<AriaTabsProps, ReplacedProps | 'orientation'> {
  /** A `TabList` and one `TabPanel` per tab. */
  children: ReactNode;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/**
 * Tabs switch between panels of related content. Controlled with `selectedKey` / `onSelectionChange` (for example to
 * keep the tab in the URL) or uncontrolled with `defaultSelectedKey`. Arrow keys, Home and End move between tabs;
 * `keyboardActivation="manual"` makes arrow keys move focus only, with Enter or Space selecting.
 */
export function Tabs({ className, ...rest }: TabsProps) {
  return <AriaTabs {...rest} className={cn('flex min-w-0 flex-col', className)} />;
}

/** A tab list needs an accessible name: `aria-label`, or `aria-labelledby` pointing at a visible heading. */
type TabListLabelProps =
  | { 'aria-label': string; 'aria-labelledby'?: string }
  | { 'aria-label'?: string; 'aria-labelledby': string };

interface TabListOwnProps<T extends object> extends Omit<
  AriaTabListProps<T>,
  ReplacedProps | 'aria-label' | 'aria-labelledby'
> {
  /** The `Tab`s, or a function that renders one per entry of `items`. */
  children: ReactNode | ((item: T) => ReactNode);
  /**
   * Controls at the end of the row, outside the scrolling tab list, for example an `OverflowMenu` of page actions.
   */
  actions?: ReactNode;
  /** Classes for the row that holds the tab list and `actions`. */
  className?: string;
  /** The row that holds the tab list and `actions`. Other props (`aria-*`, `data-*`) go on the tab list itself. */
  ref?: Ref<HTMLDivElement>;
}

export type TabListProps<T extends object = object> = TabListOwnProps<T> & TabListLabelProps;

/** How far past the edge a tab scrolled into view lands, so the neighbouring tab peeks out as a scroll hint. */
const SCROLL_PEEK = 24;

/**
 * The row of tabs. When the tabs don't fit, the list scrolls sideways (by touch, trackpad, or arrow keys) with the
 * scrollbar hidden, and the selected tab is kept scrolled into view whenever the selection changes.
 */
export function TabList<T extends object = object>({
  actions,
  className,
  ref,
  children,
  ...rest
}: TabListProps<T>) {
  // Null while React Aria builds the collection in its hidden pass; only the real render gets the row and actions.
  const state = useContext(TabListStateContext);
  const selectedKey = state?.selectedKey ?? null;
  const listRef = useRef<HTMLDivElement>(null);
  /** The selected key last scrolled into view (undefined before the first time). */
  const scrolledKey = useRef<Key | null | undefined>(undefined);

  // Runs after every render but acts only once per selection change, after the selected tab exists in the DOM (the
  // collection fills in a render after the selection is known). The user's own scrolling is left alone otherwise.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || selectedKey === null || selectedKey === scrolledKey.current) {
      return;
    }
    const tab = list.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    if (!tab) {
      return;
    }
    const isFirst = scrolledKey.current === undefined;
    scrolledKey.current = selectedKey;
    const listRect = list.getBoundingClientRect();
    const tabRect = tab.getBoundingClientRect();
    let delta = 0;
    if (tabRect.left < listRect.left) {
      delta = tabRect.left - listRect.left - SCROLL_PEEK;
    } else if (tabRect.right > listRect.right) {
      delta = tabRect.right - listRect.right + SCROLL_PEEK;
    }
    if (delta !== 0) {
      list.scrollBy({
        left: delta,
        behavior: isFirst || prefersReducedMotion() ? 'instant' : 'smooth',
      });
    }
  });

  if (!state) {
    return <AriaTabList {...rest}>{children}</AriaTabList>;
  }

  return (
    <div ref={ref} className={cn('flex min-w-0 items-stretch border-b border-border', className)}>
      <AriaTabList
        {...rest}
        ref={listRef}
        className={cn(
          'flex min-w-0 flex-1 overflow-x-auto overscroll-x-contain',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        )}
      >
        {children}
      </AriaTabList>
      {actions !== undefined && (
        <div className="flex shrink-0 items-center gap-1 ps-2">{actions}</div>
      )}
    </div>
  );
}

export interface TabProps extends Omit<AriaTabProps, ReplacedProps | 'id'> {
  /** Matches the `id` of this tab's `TabPanel`, and is the key used by `selectedKey`. */
  id: Key;
  /** The tab's label. */
  children: ReactNode;
  icon?: IconComponent;
  /** A count or short status after the label, for example `badge={12}`. It's part of the tab's accessible name. */
  badge?: ReactNode;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

const tabClasses = [
  'group/tab relative flex min-h-hit min-w-hit shrink-0 cursor-pointer items-center justify-center gap-2 px-3 py-2',
  'text-sm font-medium whitespace-nowrap text-fg-muted outline-none select-none',
  'transition-colors duration-(--duration-fast) ease-standard',
  'data-hovered:text-fg data-pressed:text-fg data-selected:text-fg',
  // The list scrolls, which clips anything outside it, so the focus ring sits inside the tab.
  'data-focus-visible:focus-ring data-focus-visible:-outline-offset-2 rounded-control',
  disabledClasses,
].join(' ');

/** A tab in a `TabList`. With `href` it's a link (rendered through `UIProvider`'s `LinkComponent`). */
export function Tab({ icon: Icon, badge, children, className, ...rest }: TabProps) {
  const LinkComponent = useLinkComponent();
  return (
    <AriaTab
      {...rest}
      className={cn(tabClasses, className)}
      render={(domProps) =>
        'href' in domProps ? <LinkComponent {...domProps} /> : <div {...domProps} />
      }
    >
      {Icon && <Icon aria-hidden="true" className="size-4 shrink-0" />}
      <span>{children}</span>
      {badge !== undefined && (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-surface-3 px-1.5 text-xs text-fg-muted group-data-selected/tab:bg-accent-bg group-data-selected/tab:text-accent-fg">
          {badge}
        </span>
      )}
      {/* The selected tab's underline. A border (not a fill) so it stays visible in forced-colours mode. */}
      <SelectionIndicator className="absolute start-0 bottom-0 h-0 w-full border-b-2 border-accent-solid transition-[translate,width] duration-(--duration-normal) ease-standard" />
    </AriaTab>
  );
}

export interface TabPanelProps extends Omit<AriaTabPanelProps, ReplacedProps | 'id'> {
  /** Matches the `id` of the panel's `Tab`. */
  id: Key;
  children: ReactNode;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/**
 * The content for one tab. Only the selected panel is mounted, unless `shouldForceMount` keeps the others mounted
 * (hidden and inert), for example to preserve form state.
 */
export function TabPanel({ className, ...rest }: TabPanelProps) {
  return (
    <AriaTabPanel
      {...rest}
      className={cn(
        'min-w-0 rounded-control pt-4 text-fg outline-none data-focus-visible:focus-ring data-inert:hidden',
        className,
      )}
    />
  );
}
