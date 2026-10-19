import { createContext, useContext } from 'react';
import { useIsPhone, useMediaQuery } from '../utils/useMediaQuery';

/** The shell's layout by viewport width: phone under 640 px, tablet 640–1024 px (both orientations), desktop above. */
export type ShellLayout = 'phone' | 'tablet' | 'desktop';

export function useShellLayout(): ShellLayout {
  const isPhone = useIsPhone();
  const isDesktop = useMediaQuery('(min-width: 1024.02px)');
  return isPhone ? 'phone' : isDesktop ? 'desktop' : 'tablet';
}

/** What the sidebar tells the shell, so the header's menu toggle can drive it. */
export interface SidebarState {
  isCollapsed: boolean;
  onCollapsedChange?: (isCollapsed: boolean) => void;
}

export interface ShellContextValue {
  layout: ShellLayout;
  /** The sidebar as a drawer: on phones, and on tablets when the rail is expanded. */
  isNavOpen: boolean;
  setNavOpen: (isOpen: boolean) => void;
  /** Set while a Sidebar is rendered. */
  sidebar: SidebarState | null;
  setSidebar: (sidebar: SidebarState | null) => void;
  /** The id of the main content, the skip link's target. */
  mainId: string;
  /** Whether the phone bottom tab bar is shown. */
  hasBottomBar: boolean;
}

export const ShellContext = createContext<ShellContextValue | null>(null);

/** The surrounding AppShell's state, or null outside one (shell parts also work on their own). */
export function useShell(): ShellContextValue | null {
  return useContext(ShellContext);
}

/**
 * What the header's menu toggle does here: open the drawer (phone, tablet) or collapse and expand the sidebar
 * (desktop). Null when there's nothing to toggle.
 */
export function useNavToggle(): {
  isExpanded: boolean;
  label: 'open' | 'close' | 'collapse' | 'expand';
  toggle: () => void;
} | null {
  const shell = useShell();
  if (!shell?.sidebar) {
    return null;
  }
  const { layout, isNavOpen, setNavOpen, sidebar } = shell;
  if (layout === 'desktop') {
    const { onCollapsedChange } = sidebar;
    if (!onCollapsedChange) {
      return null;
    }
    return {
      isExpanded: !sidebar.isCollapsed,
      label: sidebar.isCollapsed ? 'expand' : 'collapse',
      toggle: () => {
        onCollapsedChange(!sidebar.isCollapsed);
      },
    };
  }
  return {
    isExpanded: isNavOpen,
    label: isNavOpen ? 'close' : 'open',
    toggle: () => {
      setNavOpen(!isNavOpen);
    },
  };
}
