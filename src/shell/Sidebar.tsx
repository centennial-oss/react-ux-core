import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { useLayoutEffect, useMemo, type ReactNode, type Ref } from 'react';
import { IconButton } from '../components/IconButton/IconButton';
import { SheetSurface } from '../components/Overlay/SheetSurface';
import { Tooltip } from '../components/Tooltip/Tooltip';

import { cn } from '../utils/cn';
import { findActiveId } from './navigation';
import { useShell } from './ShellContext';
import { ExpandedNav, RailNav } from './SidebarNav';
import type { IsActive, NavItem, NavSection } from './types';
import { useShellMessages } from './messages';

export interface SidebarProps {
  /** Navigation sections, each with an optional heading. */
  sections?: readonly NavSection[];
  /** Items for a sidebar without sections (one unnamed section). */
  items?: readonly NavItem[];
  /** The current location, from the app's router. The best-matching item is marked as the current page. */
  currentPath?: string;
  /** Decides the current item instead of `currentPath`. */
  isActive?: IsActive;
  /** The icon rail on desktop. Controlled: the app keeps (and persists) it. */
  isCollapsed?: boolean;
  /** Shows a collapse button, and lets the header's menu toggle collapse and expand the sidebar on desktop. */
  onCollapsedChange?: (isCollapsed: boolean) => void;
  /** Shown at the top of the phone drawer, usually the brand. */
  drawerHeader?: ReactNode;
  /** Shown below the navigation (hidden in the icon rail). */
  footer?: ReactNode;
  /** Names the navigation landmark. Defaults to the `mainNavigation` message ("Main"). */
  'aria-label'?: string;
  className?: string;
  ref?: Ref<HTMLElement>;
}

/**
 * The app's main navigation. Expanded, it lists every item with expandable children; as an icon rail it shows one
 * icon per item, named by a tooltip, with children in a flyout. Inside an AppShell it follows the screen size
 * (spec §5): an off-canvas drawer on phones, the rail on tablets (opening as a drawer), and the app's choice of
 * expanded or rail on desktop.
 */
export function Sidebar({
  sections: givenSections,
  items,
  currentPath,
  isActive,
  isCollapsed = false,
  onCollapsedChange,
  drawerHeader,
  footer,
  'aria-label': ariaLabel,
  className,
  ref,
  ...rest
}: SidebarProps) {
  const messages = useShellMessages();
  const shell = useShell();
  const sections = useMemo(
    () => givenSections ?? [{ id: 'main', items: items ?? [] }],
    [givenSections, items],
  );
  const activeId = useMemo(
    () =>
      findActiveId(
        sections.flatMap((section) => section.items),
        currentPath,
        isActive,
      ),
    [sections, currentPath, isActive],
  );

  const setSidebar = shell?.setSidebar;
  useLayoutEffect(() => {
    setSidebar?.({ isCollapsed, onCollapsedChange });
  }, [setSidebar, isCollapsed, onCollapsedChange]);
  useLayoutEffect(
    () => () => {
      setSidebar?.(null);
    },
    [setSidebar],
  );

  const layout = shell?.layout ?? 'desktop';
  const label = ariaLabel ?? messages.mainNavigation;
  const isRail = layout === 'tablet' || (layout === 'desktop' && isCollapsed);
  const hasDrawer = shell !== null && layout !== 'desktop';
  const closeDrawer = () => {
    shell?.setNavOpen(false);
  };

  const collapseButton = layout === 'desktop' && onCollapsedChange && (
    <Tooltip
      content={isCollapsed ? messages.expandSidebar : messages.collapseSidebar}
      placement="end"
    >
      <IconButton
        icon={isCollapsed ? PanelLeftOpen : PanelLeftClose}
        aria-label={isCollapsed ? messages.expandSidebar : messages.collapseSidebar}
        onPress={() => {
          onCollapsedChange(!isCollapsed);
        }}
        className="rtl:-scale-x-100"
      />
    </Tooltip>
  );

  return (
    <>
      {layout !== 'phone' && (
        <nav
          {...rest}
          ref={ref}
          aria-label={label}
          data-collapsed={isRail || undefined}
          className={cn(
            'flex h-full min-h-0 flex-col border-e border-border bg-surface-1',
            isRail ? 'w-sidebar-rail' : 'w-sidebar',
            className,
          )}
        >
          <div className={cn('min-h-0 flex-1 overflow-y-auto py-3', isRail ? 'px-2' : 'px-3')}>
            {isRail ? (
              <RailNav sections={sections} activeId={activeId} />
            ) : (
              <ExpandedNav sections={sections} activeId={activeId} />
            )}
          </div>
          {(footer !== undefined || collapseButton) && (
            <div
              className={cn(
                'flex shrink-0 items-center gap-2 border-t border-border py-2',
                isRail ? 'flex-col px-2' : 'px-3',
              )}
            >
              {!isRail && footer !== undefined && <div className="min-w-0 flex-1">{footer}</div>}
              {collapseButton}
            </div>
          )}
        </nav>
      )}
      {hasDrawer && (
        <SheetSurface
          position="start"
          aria-label={label}
          isOpen={shell.isNavOpen}
          onOpenChange={shell.setNavOpen}
          className="w-[min(20rem,100vw-3rem)]"
        >
          <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
            <div className="min-w-0 flex-1">{drawerHeader}</div>
            <IconButton icon={X} aria-label={messages.closeNavigation} onPress={closeDrawer} />
          </div>
          <nav aria-label={label} className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            <ExpandedNav sections={sections} activeId={activeId} onNavigate={closeDrawer} />
          </nav>
          {footer !== undefined && (
            <div className="shrink-0 border-t border-border px-3 py-2">{footer}</div>
          )}
        </SheetSurface>
      )}
    </>
  );
}
