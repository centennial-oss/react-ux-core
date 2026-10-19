// AnchorNav: an "on this page" table of contents. Links come from `items` or from the headings in a container; the
// section being read is marked as the page scrolls (one IntersectionObserver, see useScrollSpy), and choosing a link
// scrolls to its section and moves focus there. A sticky sidebar or a jump-links bar, and a menu on phones.

import { ChevronDown, TableOfContents } from 'lucide-react';
import {
  memo,
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react';
import { useEntryMessages } from '../../provider/context';
import { anchorNavStrings } from '../../provider/coreStrings';
import { cn } from '../../utils/cn';
import { flattenTree, type FlatNode } from '../../utils/collections';
import { focusTarget } from '../../utils/focus';
import { mergeRefs } from '../../utils/mergeRefs';
import { isPlainClick } from '../../utils/pointer';
import { scrollElementToTop, scrollIntoViewBlock, scrollIntoViewInline } from '../../utils/scroll';
import { itemText } from '../../utils/text';
import { useControllableState } from '../../utils/useControllableState';
import { useLatest } from '../../utils/useLatest';
import { useIsPhone } from '../../utils/useMediaQuery';
import { useResizeMeasure } from '../../utils/useResizeMeasure';
import { useScrollSpy } from '../../utils/useScrollSpy';
import { Button } from '../Button/Button';
import { Menu, MenuItem, MenuTrigger } from '../Menu/Menu';
import { useHeadingLinks } from './headings';

export interface AnchorNavItem {
  /** The `id` of the section (or its heading) on the page. The link goes to `#id`. Unique. */
  id: string;
  label: ReactNode;
  /** Plain text for the phone menu's typeahead, when `label` isn't a string. */
  textValue?: string;
  /** Subsections, nested under this link in the vertical layout and in the phone menu. */
  children?: readonly AnchorNavItem[];
}

export interface AnchorNavProps extends Omit<
  HTMLAttributes<HTMLElement>,
  'className' | 'style' | 'children'
> {
  /**
   * The links, in the order their sections appear on the page. Without `items`, the links are gathered from the
   * headings inside `contentRef`.
   */
  items?: readonly AnchorNavItem[];
  /**
   * The element whose headings become the links when there are no `items`: a Markdown or Prose document, or any
   * HTML. Headings nest by level, and a heading without an id gets one from its text. The links follow changes to
   * its content.
   */
  contentRef?: RefObject<HTMLElement | null>;
  /**
   * How many levels of links to show; the top level counts as 1. Defaults to 2 for gathered headings (`h2` and `h3`
   * under Markdown's defaults) and to every level of `items`. The horizontal bar shows the top level only.
   */
  maxDepth?: number;
  /**
   * `vertical` (the default) is a sticky sidebar with nested levels; `horizontal` is a bar of jump links that sticks
   * to the top. Both become a menu button on phones.
   */
  orientation?: 'vertical' | 'horizontal';
  /** The nav's title and accessible name. Defaults to the `onThisPage` message ("On this page"). */
  label?: ReactNode;
  /** The id of the section marked current (`aria-current="location"`), controlled; null for none. */
  currentId?: string | null;
  /** The section marked current at first, uncontrolled. Defaults to none, until the page scrolls to one. */
  defaultCurrentId?: string | null;
  /**
   * Called when the section being read changes as the page scrolls, or a link is chosen, with its id (null above the
   * first section).
   */
  onCurrentIdChange?: (id: string | null) => void;
  /** The element the sections scroll in, when it isn't the page. */
  scrollRef?: RefObject<HTMLElement | null>;
  /**
   * Pixels at the top of the page (or `scrollRef`) covered by sticky headers. Sections scroll to below it and count
   * as being read only below it, and the nav sticks below it. A horizontal bar or phone menu following the page adds
   * its own height. Defaults to 0.
   */
  scrollOffset?: number;
  /** Puts the chosen section in the URL's hash (`#id`), as a new history entry. Defaults to false. */
  shouldUpdateHash?: boolean;
  className?: string;
  ref?: Ref<HTMLElement>;
}

type Orientation = NonNullable<AnchorNavProps['orientation']>;

const NO_PATH: readonly string[] = [];
const NO_ITEMS: readonly AnchorNavItem[] = [];
const heightOf = (element: HTMLElement) => element.offsetHeight;

const sideLinkClasses = [
  '-ms-px flex min-h-hit items-center border-s-2 border-transparent py-1 pe-2 text-sm [overflow-wrap:anywhere]',
  'rounded-e-control text-fg-muted outline-none hover:text-fg focus-visible:focus-ring',
  'aria-[current=location]:border-accent-solid aria-[current=location]:font-medium aria-[current=location]:text-accent-fg',
].join(' ');

/** Indents for nested levels in the sidebar, as complete class names. */
const sideDepthClasses = ['ps-3', 'ps-6', 'ps-9', 'ps-12'] as const;

const barLinkClasses = [
  'flex min-h-hit items-center border-b-2 border-transparent px-3 py-2 text-sm whitespace-nowrap',
  'rounded-t-control text-fg-muted outline-none hover:text-fg',
  // The bar scrolls, which clips anything outside it, so the focus ring sits inside the link.
  'focus-visible:focus-ring focus-visible:-outline-offset-2',
  'aria-[current=location]:border-accent-solid aria-[current=location]:font-medium aria-[current=location]:text-fg',
].join(' ');

/** Indents for nested levels in the phone menu. */
const menuDepthClasses = ['', 'ps-6', 'ps-10', 'ps-14'] as const;

function depthClass(classes: readonly string[], depth: number): string {
  return classes[Math.min(depth, classes.length - 1)] ?? '';
}

interface LinkTreeProps {
  item: AnchorNavItem;
  depth: number;
  maxDepth: number;
  /**
   * The ids from the top level down to the current section, when this link is on that path; otherwise `NO_PATH`.
   * Links off the path keep the same props, so a new current section re-renders only the links on its old and new
   * paths.
   */
  path: readonly string[];
  orientation: Orientation;
  onNavigate: (id: string) => void;
}

/** A link, and the nested list of its subsections' links. */
const LinkTree = memo(function LinkTree({
  item,
  depth,
  maxDepth,
  path,
  orientation,
  onNavigate,
}: LinkTreeProps) {
  const isCurrent = path.length === depth + 1;
  const children = depth + 1 < maxDepth ? (item.children ?? NO_ITEMS) : NO_ITEMS;
  const isBar = orientation === 'horizontal';
  return (
    <li className={isBar ? 'flex shrink-0' : 'flex flex-col'}>
      <a
        href={`#${encodeURIComponent(item.id)}`}
        aria-current={isCurrent ? 'location' : undefined}
        onClick={(event) => {
          if (isPlainClick(event)) {
            event.preventDefault();
            onNavigate(item.id);
          }
        }}
        className={
          isBar
            ? barLinkClasses
            : cn(
                sideLinkClasses,
                depthClass(sideDepthClasses, depth),
                // The way down to the current section stands out a little.
                path.length > depth + 1 && 'text-fg',
              )
        }
      >
        {item.label}
      </a>
      {children.length > 0 && (
        <ul className="flex flex-col">
          {children.map((child) => (
            <LinkTree
              key={child.id}
              item={child}
              depth={depth + 1}
              maxDepth={maxDepth}
              path={path[depth + 1] === child.id ? path : NO_PATH}
              orientation={orientation}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </li>
  );
});

/** The menu's title, which also tells AnchorNav when the menu has gone (it unmounts with the menu's popover or sheet). */
function MenuTitle({
  id,
  children,
  onUnmount,
}: {
  id: string;
  children: ReactNode;
  onUnmount: () => void;
}) {
  const onUnmountRef = useLatest(onUnmount);
  useLayoutEffect(
    () => () => {
      onUnmountRef.current();
    },
    [onUnmountRef],
  );
  return (
    <span id={id} className="text-sm font-semibold text-fg">
      {children}
    </span>
  );
}

/**
 * An "on this page" table of contents in a `nav` landmark. Its links come from `items`, or from the headings in
 * `contentRef` (such as a Markdown document). As the page, or `scrollRef`, scrolls, the section being read is marked
 * `aria-current="location"`. Choosing a link scrolls its section to the top (smoothly, unless the user prefers
 * reduced motion), clear of `scrollOffset`, moves focus to it, and with `shouldUpdateHash` puts it in the URL.
 * Vertical, it's a sticky sidebar with nested levels; horizontal, a bar of jump links. On phones both become a
 * menu button showing the current section.
 */
export function AnchorNav({
  items,
  contentRef,
  maxDepth,
  orientation = 'vertical',
  label,
  currentId,
  defaultCurrentId = null,
  onCurrentIdChange,
  scrollRef,
  scrollOffset = 0,
  shouldUpdateHash = false,
  className,
  ref,
  ...rest
}: AnchorNavProps) {
  const messages = useEntryMessages(anchorNavStrings);
  const titleId = useId();
  const menuTitleId = useId();
  const isPhone = useIsPhone();
  const isBar = isPhone || orientation === 'horizontal';
  const navRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [measureRef, barHeight] = useResizeMeasure(heightOf, Object.is, 'border-box');
  const rootRef = useMemo(() => mergeRefs(ref, navRef, measureRef), [ref, measureRef]);

  const depth = maxDepth ?? (items ? Infinity : 2);
  const gathered = useHeadingLinks(items ? undefined : contentRef, depth, navRef);
  const links: readonly AnchorNavItem[] = items ?? gathered;
  // The bar shows (and watches) the top level only; the sidebar and the phone menu, every level asked for.
  const shownDepth = isPhone ? depth : orientation === 'horizontal' ? 1 : depth;
  const flat = useMemo(() => flattenTree(links, shownDepth), [links, shownDepth]);
  const byId = useMemo(() => {
    const map = new Map<string, FlatNode<AnchorNavItem>>();
    for (const node of flat) {
      map.set(node.item.id, node);
    }
    return map;
  }, [flat]);
  // Watching starts once a bar following the page has measured itself, so the observer is made once.
  const isMeasuring = isBar && scrollRef === undefined && barHeight === undefined;
  const ids = useMemo(
    () => (isMeasuring ? NO_PATH : flat.map((node) => node.item.id)),
    [flat, isMeasuring],
  );

  const [current, setCurrent] = useControllableState(
    currentId,
    defaultCurrentId,
    onCurrentIdChange,
  );
  const path = useMemo(() => {
    const ancestors: string[] = [];
    let node = current === null ? undefined : byId.get(current);
    while (node) {
      ancestors.unshift(node.item.id);
      node = node.parentId === undefined ? undefined : byId.get(node.parentId);
    }
    return ancestors.length > 0 ? ancestors : NO_PATH;
  }, [current, byId]);

  // A bar sticks over the top of the page it follows, so sections go below it too.
  const offset =
    scrollOffset + (isBar && scrollRef === undefined && barHeight !== undefined ? barHeight : 0);
  const hold = useScrollSpy({
    ids,
    rootRef: scrollRef,
    offset,
    activeId: current,
    onChange: setCurrent,
  });

  const latest = useLatest({ current, setCurrent, offset, scrollRef, shouldUpdateHash });
  const navigate = useCallback(
    (id: string) => {
      const target = (navRef.current?.ownerDocument ?? document).getElementById(id);
      if (!target) {
        return;
      }
      const options = latest.current;
      hold();
      if (options.current !== id) {
        options.setCurrent(id);
      }
      scrollElementToTop(target, { container: options.scrollRef?.current, offset: options.offset });
      focusTarget(target);
      const hash = `#${encodeURIComponent(id)}`;
      if (options.shouldUpdateHash && window.location.hash !== hash) {
        window.history.pushState(window.history.state, '', hash);
      }
    },
    [hold, latest],
  );

  // A section chosen in the phone menu is gone to once the menu has closed, so its focus isn't taken back to the
  // menu button, and the page is free to scroll.
  const chosenRef = useRef<string | null>(null);
  const onMenuGone = useCallback(() => {
    const id = chosenRef.current;
    chosenRef.current = null;
    if (id !== null) {
      requestAnimationFrame(() => {
        navigate(id);
      });
    }
  }, [navigate]);

  // Keep the current link in view when the list scrolls on its own: sideways in the bar, or a long sidebar.
  useLayoutEffect(() => {
    const list = listRef.current;
    const link = current === null ? null : list?.querySelector('[aria-current="location"]');
    if (!list || !link) {
      return;
    }
    if (orientation === 'horizontal') {
      scrollIntoViewInline(list, link);
    } else if (navRef.current) {
      scrollIntoViewBlock(navRef.current, link);
    }
  }, [current, orientation, isPhone]);

  if (flat.length === 0) {
    return null;
  }

  const title = label ?? messages.onThisPage;
  const labelProps = rest['aria-label'] === undefined ? { 'aria-labelledby': titleId } : {};
  const currentNode = current === null ? undefined : byId.get(current);

  return (
    <nav
      ref={rootRef}
      {...labelProps}
      {...rest}
      // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: it sticks below the app's sticky headers.
      style={{
        top: scrollOffset,
        maxHeight: isBar ? undefined : `calc(100dvh - ${String(scrollOffset)}px)`,
      }}
      className={cn(
        'sticky min-w-0',
        isBar
          ? 'z-sticky border-b border-border bg-surface-1'
          : 'self-start overflow-y-auto overscroll-contain',
        className,
      )}
    >
      {isPhone ? (
        <MenuTrigger>
          <Button variant="ghost" icon={TableOfContents} className="w-full justify-start">
            <span className="flex min-w-0 flex-1 items-baseline gap-2 text-start">
              <span id={titleId} className="shrink-0 font-normal text-fg-muted">
                {title}
              </span>
              {currentNode && <span className="truncate">{currentNode.item.label}</span>}
            </span>
            <ChevronDown aria-hidden="true" className="-me-1 size-4 shrink-0" />
          </Button>
          <Menu
            aria-labelledby={menuTitleId}
            header={
              <MenuTitle id={menuTitleId} onUnmount={onMenuGone}>
                {title}
              </MenuTitle>
            }
            selectionMode="single"
            selectedKeys={current === null ? [] : [current]}
            onAction={(key) => {
              chosenRef.current = String(key);
            }}
          >
            {flat.map(({ item, depth: level }) => (
              <MenuItem
                key={item.id}
                id={item.id}
                textValue={itemText(item)}
                className={depthClass(menuDepthClasses, level)}
              >
                {item.label}
              </MenuItem>
            ))}
          </Menu>
        </MenuTrigger>
      ) : (
        <>
          <div
            id={titleId}
            className={
              orientation === 'horizontal' ? 'sr-only' : 'pb-2 text-sm font-semibold text-fg'
            }
          >
            {title}
          </div>
          <ul
            ref={listRef}
            className={
              orientation === 'horizontal'
                ? 'flex min-w-0 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
                : 'flex flex-col border-s border-border'
            }
          >
            {links.map((item) => (
              <LinkTree
                key={item.id}
                item={item}
                depth={0}
                maxDepth={shownDepth}
                path={path[0] === item.id ? path : NO_PATH}
                orientation={orientation}
                onNavigate={navigate}
              />
            ))}
          </ul>
        </>
      )}
    </nav>
  );
}
