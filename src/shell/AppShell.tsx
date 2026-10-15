import { useId, useLayoutEffect, useMemo, useState, type ReactNode, type Ref } from 'react';

import { cn } from '../utils/cn';
import {
  ShellContext,
  useShellLayout,
  type ShellContextValue,
  type SidebarState,
} from './ShellContext';
import { useShellMessages } from './messages';

export interface AppShellProps {
  /** Usually a `Header`. Rendered in the `banner` landmark. */
  header?: ReactNode;
  /** Usually a `Sidebar` (it renders its own `navigation` landmark). */
  sidebar?: ReactNode;
  /** Usually a `BottomTabBar`; shown on phones only. */
  bottomBar?: ReactNode;
  /** Usually a `Footer`. Rendered in the `contentinfo` landmark, below the main content. */
  footer?: ReactNode;
  /** The page. Rendered in the `main` landmark, the skip link's target. */
  children: ReactNode;
  /** Controlled open state of the navigation drawer (phones, and tablets when the rail is expanded). */
  isNavOpen?: boolean;
  onNavOpenChange?: (isOpen: boolean) => void;
  className?: string;
  classNames?: { main?: string };
  ref?: Ref<HTMLDivElement>;
}

/**
 * The frame of an app: a skip link, the header, the sidebar, the main content, an optional footer and, on phones,
 * a bottom tab bar, each in its landmark. It decides the sidebar's form from the screen size (spec §5) and wires the
 * header's menu toggle and the bottom bar's More button to it. It takes data and callbacks only: no router or
 * storage.
 */
export function AppShell({
  header,
  sidebar,
  bottomBar,
  footer,
  children,
  isNavOpen: isNavOpenProp,
  onNavOpenChange,
  className,
  classNames,
  ref,
  ...rest
}: AppShellProps) {
  const messages = useShellMessages();
  const layout = useShellLayout();
  const mainId = useId();
  const [ownNavOpen, setOwnNavOpen] = useState(false);
  const [sidebarState, setSidebar] = useState<SidebarState | null>(null);
  // The drawer only exists below desktop; widening the window closes it.
  const isNavOpen = layout !== 'desktop' && (isNavOpenProp ?? ownNavOpen);
  const hasBottomBar = layout === 'phone' && bottomBar !== undefined;

  const value = useMemo<ShellContextValue>(
    () => ({
      layout,
      isNavOpen,
      setNavOpen: (isOpen) => {
        setOwnNavOpen(isOpen);
        onNavOpenChange?.(isOpen);
      },
      sidebar: sidebarState,
      setSidebar,
      mainId,
      hasBottomBar,
    }),
    [layout, isNavOpen, onNavOpenChange, sidebarState, mainId, hasBottomBar],
  );

  // Toasts sit above the bottom bar on phones (the toast region reads this variable).
  useLayoutEffect(() => {
    if (!hasBottomBar) {
      return;
    }
    const root = document.documentElement;
    root.style.setProperty('--rux-toast-bottom-offset', 'var(--spacing-bottom-bar)');
    return () => {
      root.style.removeProperty('--rux-toast-bottom-offset');
    };
  }, [hasBottomBar]);

  return (
    <ShellContext.Provider value={value}>
      <div
        {...rest}
        ref={ref}
        data-layout={layout}
        className={cn(
          'flex min-h-dvh flex-col bg-surface-1 text-fg',
          // Where sticky content inside the page sits: below the sticky header.
          header !== undefined &&
            '[--rux-sticky-top:calc(var(--spacing-header)+env(safe-area-inset-top))]',
          className,
        )}
      >
        <a
          href={`#${mainId}`}
          className="fixed start-2 top-2 z-toast -translate-y-[200%] rounded-control bg-surface-2 px-3 py-2 text-sm font-medium text-fg shadow-overlay outline-none focus:translate-y-0 focus-visible:focus-ring"
        >
          {messages.skipToContent}
        </a>
        {header !== undefined && (
          <header className="sticky top-0 z-sticky shrink-0 pt-[env(safe-area-inset-top)]">
            {header}
          </header>
        )}
        <div className="flex min-h-0 flex-1">
          {sidebar !== undefined && (
            <div
              className={cn(
                'shrink-0',
                layout !== 'phone' &&
                  'sticky top-[calc(var(--spacing-header)+env(safe-area-inset-top))] h-[calc(100dvh-var(--spacing-header)-env(safe-area-inset-top))] self-start',
              )}
            >
              {sidebar}
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col">
            <main
              id={mainId}
              tabIndex={-1}
              className={cn(
                'min-w-0 flex-1 px-4 py-4 outline-none sm:px-6 sm:py-6',
                // The last block makes room for the fixed bottom bar and the safe area below it.
                hasBottomBar &&
                  footer === undefined &&
                  'pb-[calc(var(--spacing-bottom-bar)+env(safe-area-inset-bottom)+1rem)]',
                classNames?.main,
              )}
            >
              {children}
            </main>
            {footer !== undefined && (
              <footer
                className={cn(
                  'shrink-0 border-t border-border',
                  hasBottomBar &&
                    'pb-[calc(var(--spacing-bottom-bar)+env(safe-area-inset-bottom))]',
                )}
              >
                {footer}
              </footer>
            )}
          </div>
        </div>
        {hasBottomBar && bottomBar}
      </div>
    </ShellContext.Provider>
  );
}
