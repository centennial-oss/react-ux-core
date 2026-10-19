import { ChevronRight, Ellipsis } from 'lucide-react';
import { useId, useRef, type HTMLAttributes, type ReactNode, type Ref } from 'react';
import {
  Breadcrumb as AriaBreadcrumb,
  Breadcrumbs as AriaBreadcrumbs,
  Link as AriaLink,
  type LinkProps as AriaLinkProps,
  type MenuItemProps as AriaMenuItemProps,
} from 'react-aria-components';
import { useEntryMessages, useLinkComponent } from '../../provider/context';
import { breadcrumbStrings } from '../../provider/coreStrings';
import type { LinkComponentType } from '../../provider/link';
import { cn } from '../../utils/cn';
import { IconButton } from '../IconButton/IconButton';
import { Menu, MenuItem, MenuTrigger } from '../Menu/Menu';
import { useCollapsedRange } from './useCollapsedRange';

export interface BreadcrumbItem {
  /** Unique within the trail. */
  id: string;
  label: ReactNode;
  /** Where the item links to, through `UIProvider`'s `LinkComponent`. The last item is the current page and isn't a link. */
  href?: string;
  /** Plain text for the collapsed menu's typeahead, when `label` isn't a string. */
  textValue?: string;
}

export interface BreadcrumbsProps extends Omit<
  HTMLAttributes<HTMLElement>,
  'className' | 'style' | 'children'
> {
  /** The trail from the top level down to the current page (the last item). */
  items: readonly BreadcrumbItem[];
  className?: string;
  ref?: Ref<HTMLElement>;
}

// Shared by the visible trail and the invisible measuring copy, so both lay out to the same widths.
const itemClasses = 'flex min-w-0 items-center';
const labelClasses = 'flex min-w-0 items-center rounded-control px-0.5 text-sm whitespace-nowrap';
const separatorClasses = 'mx-1 size-4 shrink-0 text-fg-muted rtl:rotate-180';
const currentClasses = 'font-medium text-fg';
/** The menu trigger is a small IconButton (size-8). */
const menuTriggerSize = 'size-8';

const linkClasses = [
  'hit-area cursor-pointer text-fg-muted underline-offset-2 outline-none',
  'data-hovered:text-fg data-hovered:underline data-pressed:text-fg data-focus-visible:focus-ring',
].join(' ');

type LinkRender = NonNullable<AriaLinkProps['render']>;
type MenuItemRender = NonNullable<AriaMenuItemProps['render']>;

function linkRenderer(LinkComponent: LinkComponentType): LinkRender {
  return (domProps) =>
    'href' in domProps ? <LinkComponent {...domProps} /> : <span {...domProps} />;
}

function menuItemRenderer(LinkComponent: LinkComponentType): MenuItemRender {
  return (domProps) =>
    'href' in domProps ? <LinkComponent {...domProps} /> : <div {...domProps} />;
}

const SeparatorIcon = () => <ChevronRight aria-hidden="true" className={separatorClasses} />;

/**
 * The trail of pages leading to the current one, in a `nav` landmark. Every item with an `href` is a link through
 * `UIProvider`'s `LinkComponent`; the last item is the current page (`aria-current="page"`). When the trail doesn't
 * fit, the middle items collapse into a menu (whose items are links too), keeping the first item and as many of the
 * items nearest the current page as fit.
 */
export function Breadcrumbs({ items, className, ...rest }: BreadcrumbsProps) {
  const messages = useEntryMessages(breadcrumbStrings);
  const LinkComponent = useLinkComponent();
  const menuKey = useId();
  const listRef = useRef<HTMLOListElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const measured = useCollapsedRange(listRef, measureRef, items);
  // After `items` change, a stale range can point past the end for one render (it's re-measured before paint).
  const collapsed = measured && measured.end < items.length ? measured : null;
  const lastIndex = items.length - 1;
  const renderLink = linkRenderer(LinkComponent);

  const crumb = (item: BreadcrumbItem, index: number) => {
    const isCurrent = index === lastIndex;
    return (
      <AriaBreadcrumb key={item.id} id={item.id} className={itemClasses}>
        {isCurrent || item.href !== undefined ? (
          // React Aria marks the last item's link as the current page (and not pressable); it gets no href.
          <AriaLink
            href={isCurrent ? undefined : item.href}
            className={cn(labelClasses, isCurrent ? currentClasses : linkClasses)}
            render={renderLink}
          >
            <span className="truncate">{item.label}</span>
          </AriaLink>
        ) : (
          <span className={cn(labelClasses, 'text-fg-muted')}>
            <span className="truncate">{item.label}</span>
          </span>
        )}
        {!isCurrent && <SeparatorIcon />}
      </AriaBreadcrumb>
    );
  };

  const first = items[0];
  const trailing = collapsed ? items.slice(collapsed.end) : items.slice(1);
  const trailingStart = collapsed ? collapsed.end : 1;

  return (
    // `aria-label` can be overridden, for example to tell apart a second trail on the same page.
    <nav aria-label={messages.breadcrumbs} {...rest} className={cn('relative min-w-0', className)}>
      <AriaBreadcrumbs
        ref={listRef}
        className="flex min-w-0 items-center"
        // The nav carries the label; React Aria would also label the list with its own (untranslated) string.
        render={({ 'aria-label': _ariaLabel, ...props }) => <ol {...props} />}
      >
        {first !== undefined && crumb(first, 0)}
        {collapsed && (
          <AriaBreadcrumb id={menuKey} className="flex shrink-0 items-center">
            <MenuTrigger>
              <IconButton icon={Ellipsis} size="sm" aria-label={messages.showHiddenBreadcrumbs} />
              <Menu>
                {items.slice(collapsed.start, collapsed.end).map((item) => (
                  <MenuItem
                    key={item.id}
                    id={item.id}
                    href={item.href}
                    isDisabled={item.href === undefined}
                    textValue={item.textValue}
                    render={menuItemRenderer(LinkComponent)}
                  >
                    {item.label}
                  </MenuItem>
                ))}
              </Menu>
            </MenuTrigger>
            <SeparatorIcon />
          </AriaBreadcrumb>
        )}
        {trailing.map((item, offset) => crumb(item, trailingStart + offset))}
      </AriaBreadcrumbs>

      {/* An invisible copy of the whole trail at natural width, measured to decide what to collapse. */}
      <div
        aria-hidden="true"
        className="pointer-events-none invisible absolute inset-x-0 top-0 h-0 overflow-hidden"
      >
        <div ref={measureRef} className="flex w-max items-center">
          {items.map((item, index) => (
            <span key={item.id} className={cn(itemClasses, 'shrink-0')}>
              <span className={cn(labelClasses, index === lastIndex && currentClasses)}>
                {item.label}
              </span>
              {index !== lastIndex && <SeparatorIcon />}
            </span>
          ))}
          <span className={cn(itemClasses, 'shrink-0')}>
            <span className={cn(menuTriggerSize, 'shrink-0')} />
            <SeparatorIcon />
          </span>
        </div>
      </div>
    </nav>
  );
}
