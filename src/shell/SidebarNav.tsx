import { ChevronDown } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import {
  Button as AriaButton,
  Link as AriaLink,
  Menu as AriaMenu,
  MenuTrigger,
  Popover as AriaPopover,
  type LinkProps as AriaLinkProps,
  type MenuItemProps as AriaMenuItemProps,
} from 'react-aria-components';
import { MenuItem } from '../components/Menu/Menu';
import { popoverClasses } from '../components/Overlay/styles';
import { Tooltip } from '../components/Tooltip/Tooltip';
import { useLinkComponent } from '../provider/context';
import type { LinkComponentType } from '../provider/link';
import { cn } from '../utils/cn';
import { containsId } from './navigation';
import type { NavItem, NavSection } from './types';
import { useShellMessages } from './messages';

type LinkRender = NonNullable<AriaLinkProps['render']>;
type MenuItemRender = NonNullable<AriaMenuItemProps['render']>;

function linkRenderer(LinkComponent: LinkComponentType): LinkRender {
  return (props) => ('href' in props ? <LinkComponent {...props} /> : <span {...props} />);
}

function menuItemRenderer(LinkComponent: LinkComponentType): MenuItemRender {
  return (props) => ('href' in props ? <LinkComponent {...props} /> : <div {...props} />);
}

const rowClasses = [
  'flex min-h-hit w-full min-w-0 items-center gap-3 rounded-control px-3 py-2 text-sm outline-none',
  'text-fg-muted data-hovered:bg-surface-3 data-hovered:text-fg data-pressed:bg-surface-4',
  'data-focus-visible:focus-ring',
  'aria-[current=page]:bg-accent-bg aria-[current=page]:font-medium aria-[current=page]:text-accent-fg',
].join(' ');

function ItemBadge({ badge, isCompact = false }: { badge: ReactNode; isCompact?: boolean }) {
  if (badge === undefined || badge === null || badge === false) {
    return null;
  }
  return (
    <span
      className={cn(
        'inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-accent-solid px-1.5 text-xs leading-5 font-medium text-accent-on-solid tabular-nums',
        isCompact && 'absolute -end-1 -top-1 min-w-4 px-1 text-[0.625rem] leading-4',
      )}
    >
      {badge}
    </span>
  );
}

interface ListProps {
  sections: readonly NavSection[];
  activeId: string | undefined;
  /** Called after a link is pressed, for example to close the drawer. */
  onNavigate?: () => void;
}

/** The full navigation: sections of links, with expandable children. */
export function ExpandedNav({ sections, activeId, onNavigate }: ListProps) {
  return (
    <div className="flex flex-col gap-4">
      {sections.map((section) => (
        <ExpandedSection
          key={section.id}
          section={section}
          activeId={activeId}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

function ExpandedSection({
  section,
  activeId,
  onNavigate,
}: {
  section: NavSection;
  activeId: string | undefined;
  onNavigate?: () => void;
}) {
  const headingId = useId();
  return (
    <div className="flex flex-col gap-1">
      {section.title !== undefined && (
        <p id={headingId} className="px-3 pb-1 text-xs font-semibold text-fg-muted">
          {section.title}
        </p>
      )}
      <ul
        aria-labelledby={section.title !== undefined ? headingId : undefined}
        className="flex flex-col gap-0.5"
      >
        {section.items.map((item) => (
          <ExpandedItem key={item.id} item={item} activeId={activeId} onNavigate={onNavigate} />
        ))}
      </ul>
    </div>
  );
}

function ExpandedItem({
  item,
  activeId,
  onNavigate,
  depth = 0,
}: {
  item: NavItem;
  activeId: string | undefined;
  onNavigate?: () => void;
  depth?: number;
}) {
  const messages = useShellMessages();
  const LinkComponent = useLinkComponent();
  const childrenId = useId();
  const children = item.children ?? [];
  const hasChildren = children.length > 0;
  // Open while it holds the current page, unless the user closed it; the user can also open any other.
  const [toggled, setToggled] = useState<boolean | null>(null);
  const isOpen = toggled ?? containsId(item, activeId);
  const Icon = item.icon;
  return (
    <li className="flex flex-col gap-0.5">
      <div className="flex items-center gap-0.5">
        <AriaLink
          href={item.href}
          aria-current={item.id === activeId ? 'page' : undefined}
          render={linkRenderer(LinkComponent)}
          onPress={onNavigate}
          className={cn(rowClasses, depth > 0 && 'ps-11')}
        >
          {Icon && <Icon aria-hidden="true" className="size-5 shrink-0" />}
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          <ItemBadge badge={item.badge} />
        </AriaLink>
        {hasChildren && (
          <AriaButton
            aria-label={messages.subPages({ label: item.label })}
            aria-expanded={isOpen}
            aria-controls={childrenId}
            onPress={() => {
              setToggled(!isOpen);
            }}
            className="flex min-h-hit min-w-hit shrink-0 items-center justify-center self-stretch rounded-control text-fg-muted outline-none data-focus-visible:focus-ring data-hovered:bg-surface-3 data-hovered:text-fg"
          >
            <ChevronDown
              aria-hidden="true"
              className={cn(
                'size-4 transition-transform duration-fast motion-reduce:transition-none',
                isOpen && 'rotate-180',
              )}
            />
          </AriaButton>
        )}
      </div>
      {hasChildren && (
        <ul id={childrenId} hidden={!isOpen} className="flex flex-col gap-0.5">
          {children.map((child) => (
            <ExpandedItem
              key={child.id}
              item={child}
              activeId={activeId}
              onNavigate={onNavigate}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

const railClasses = [
  'relative flex size-11 items-center justify-center rounded-control outline-none',
  'text-fg-muted data-hovered:bg-surface-3 data-hovered:text-fg data-pressed:bg-surface-4',
  'data-focus-visible:focus-ring data-pressed:text-fg',
].join(' ');
const railCurrentClasses = 'bg-accent-bg text-accent-fg';

/** The icon rail: one icon per top-level item, named by a tooltip; children open in a flyout menu. */
export function RailNav({ sections, activeId }: ListProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      {sections.map((section, index) => (
        <ul
          key={section.id}
          aria-label={section.title}
          className={cn(
            'flex flex-col items-center gap-1',
            index > 0 && 'border-t border-border pt-3',
          )}
        >
          {section.items.map((item) => (
            <li key={item.id}>
              <RailItem item={item} activeId={activeId} />
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}

function FallbackIcon({ label }: { label: string }) {
  return (
    <span aria-hidden="true" className="text-sm font-semibold">
      {label.slice(0, 1).toLocaleUpperCase()}
    </span>
  );
}

function RailItem({ item, activeId }: { item: NavItem; activeId: string | undefined }) {
  const LinkComponent = useLinkComponent();
  const children = item.children ?? [];
  const isCurrent = containsId(item, activeId);
  const Icon = item.icon;
  const icon = Icon ? (
    <Icon aria-hidden="true" className="size-5" />
  ) : (
    <FallbackIcon label={item.label} />
  );
  if (children.length === 0) {
    return (
      <Tooltip content={item.label} placement="end">
        <AriaLink
          href={item.href}
          aria-current={item.id === activeId ? 'page' : undefined}
          render={linkRenderer(LinkComponent)}
          className={cn(railClasses, isCurrent && railCurrentClasses)}
        >
          {icon}
          {/* Named by its content (label and badge), so the visible badge is part of the name. */}
          <span className="sr-only">{item.label}</span>
          <ItemBadge badge={item.badge} isCompact />
        </AriaLink>
      </Tooltip>
    );
  }
  // The flyout lists the item itself first, then its children, all as links.
  const entries = [item, ...children];
  return (
    <MenuTrigger>
      <Tooltip content={item.label} placement="end">
        <AriaButton className={cn(railClasses, isCurrent && railCurrentClasses)}>
          {icon}
          <span className="sr-only">{item.label}</span>
          <ItemBadge badge={item.badge} isCompact />
        </AriaButton>
      </Tooltip>
      <AriaPopover placement="end top" offset={8} className={cn('max-h-[60vh]', popoverClasses)}>
        <AriaMenu
          aria-label={item.label}
          className="flex min-w-48 flex-col gap-0.5 p-1 text-sm outline-none"
        >
          {entries.map((entry) => (
            <MenuItem
              key={entry.id}
              id={entry.id}
              href={entry.href}
              icon={entry === item ? undefined : entry.icon}
              textValue={entry.label}
              render={menuItemRenderer(LinkComponent)}
              className={entry.id === activeId ? 'font-medium text-accent-fg' : undefined}
            >
              {entry.label}
            </MenuItem>
          ))}
        </AriaMenu>
      </AriaPopover>
    </MenuTrigger>
  );
}
