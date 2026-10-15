import { render, screen, within } from '@testing-library/react';
import { CircleHelp, LayoutDashboard, MapPin, Receipt } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { IconButton } from '../components/IconButton/IconButton';
import { MenuItem } from '../components/Menu/Menu';
import type { LinkComponentProps } from '../provider/link';
import { UIProvider } from '../provider/UIProvider';
import { AppShell } from './AppShell';
import { BottomTabBar } from './BottomTabBar';
import { Footer } from './Footer';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import type { NavSection } from './types';
import { UserMenu } from './UserMenu';

const layout = window.innerWidth < 640 ? 'phone' : window.innerWidth > 1024 ? 'desktop' : 'tablet';

const sections: NavSection[] = [
  {
    id: 'main',
    items: [
      { id: 'home', label: 'Dashboard', icon: LayoutDashboard, href: '/' },
      {
        id: 'sites',
        label: 'Sites',
        icon: MapPin,
        href: '/sites',
        children: [{ id: 'map', label: 'Site map', href: '/sites/map' }],
      },
    ],
  },
  {
    id: 'billing',
    title: 'Billing',
    items: [{ id: 'invoices', label: 'Invoices', icon: Receipt, href: '/invoices' }],
  },
];

function Shell({
  currentPath = '/sites/map',
  onCollapsedChange,
  linkComponent,
  children = <p>Page</p>,
}: {
  currentPath?: string;
  onCollapsedChange?: (isCollapsed: boolean) => void;
  linkComponent?: (props: LinkComponentProps) => ReactNode;
  children?: ReactNode;
}) {
  const [isCollapsed, setCollapsed] = useState(false);
  return (
    <UIProvider LinkComponent={linkComponent} timeZone="America/Denver">
      <AppShell
        header={
          <Header
            brand={<span>Gridline</span>}
            actions={<IconButton icon={CircleHelp} aria-label="Help" />}
            compactActions={<MenuItem id="help">Help</MenuItem>}
            userMenu={
              <UserMenu name="Ada Lovelace" secondary="Acme · Admin">
                <MenuItem id="sign-out">Sign out</MenuItem>
              </UserMenu>
            }
          />
        }
        sidebar={
          <Sidebar
            sections={sections}
            currentPath={currentPath}
            isCollapsed={isCollapsed}
            onCollapsedChange={(next) => {
              setCollapsed(next);
              onCollapsedChange?.(next);
            }}
          />
        }
        bottomBar={
          <BottomTabBar
            items={[
              { id: 'home', label: 'Dashboard', icon: LayoutDashboard, href: '/' },
              { id: 'sites', label: 'Sites', icon: MapPin, href: '/sites' },
            ]}
            currentPath={currentPath}
            hasMoreButton
          />
        }
        footer={
          <Footer version="2.4.0" links={[{ id: 'privacy', label: 'Privacy', href: '/privacy' }]} />
        }
      >
        {children}
      </AppShell>
    </UIProvider>
  );
}

async function openDrawer() {
  await userEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
  return screen.findByRole('dialog', { name: 'Main' });
}

describe('AppShell', () => {
  it('has landmarks and a skip link to the main content', async () => {
    render(<Shell />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    const main = screen.getByRole('main');
    const skip = screen.getByRole('link', { name: 'Skip to content' });
    expect(skip).toHaveAttribute('href', `#${main.id}`);
    // It's the first stop for keyboard users, and shows while focused.
    await userEvent.tab();
    expect(skip).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(main).toHaveFocus();
    // The sidebar's landmark is inline except on phones, where it lives in the drawer.
    expect(screen.queryByRole('navigation', { name: 'Main' }) !== null).toBe(layout !== 'phone');
  });

  it('marks the current page in the navigation', async () => {
    render(<Shell />);
    const nav =
      layout === 'phone' ? await openDrawer() : screen.getByRole('navigation', { name: 'Main' });
    if (layout === 'tablet') {
      // The icon rail: the parent of the current page is highlighted, and its children are in a flyout.
      expect(within(nav).getByRole('button', { name: 'Sites' })).toBeInTheDocument();
      expect(within(nav).getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute(
        'aria-current',
      );
      return;
    }
    expect(within(nav).getByRole('link', { name: 'Site map' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: 'Sites' })).not.toHaveAttribute('aria-current');
    // The parent holding the current page starts open.
    expect(within(nav).getByRole('button', { name: 'Sites pages' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('opens and closes a parent’s children', async () => {
    render(<Shell currentPath="/" />);
    const nav =
      layout === 'phone' ? await openDrawer() : screen.getByRole('navigation', { name: 'Main' });
    if (layout === 'tablet') {
      await userEvent.click(within(nav).getByRole('button', { name: 'Sites' }));
      const flyout = await screen.findByRole('menu', { name: 'Sites' });
      expect(within(flyout).getByRole('menuitem', { name: 'Site map' })).toHaveAttribute(
        'href',
        '/sites/map',
      );
      return;
    }
    const toggle = within(nav).getByRole('button', { name: 'Sites pages' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(nav).queryByRole('link', { name: 'Site map' })).toBeNull();
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(within(nav).getByRole('link', { name: 'Site map' })).toBeVisible();
  });

  it('drives the sidebar from the header’s menu toggle', async () => {
    const onCollapsedChange = vi.fn();
    render(<Shell onCollapsedChange={onCollapsedChange} />);
    if (layout === 'desktop') {
      const toggle = screen.getByRole('button', { name: 'Collapse sidebar', expanded: true });
      await userEvent.click(toggle);
      expect(onCollapsedChange).toHaveBeenLastCalledWith(true);
      const nav = screen.getByRole('navigation', { name: 'Main' });
      expect(nav).toHaveAttribute('data-collapsed');
      // The rail names each icon.
      expect(within(nav).getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
      // The sidebar's own button does the same as the header's toggle.
      await userEvent.click(within(nav).getByRole('button', { name: 'Expand sidebar' }));
      expect(onCollapsedChange).toHaveBeenLastCalledWith(false);
      return;
    }
    const drawer = await openDrawer();
    await userEvent.click(within(drawer).getByRole('button', { name: 'Close navigation' }));
    await expect.poll(() => screen.queryByRole('dialog', { name: 'Main' })).toBeNull();
  });

  it('closes the drawer after navigating', async () => {
    if (layout === 'desktop') {
      return;
    }
    const linkComponent = ({ href, onClick, children, ...props }: LinkComponentProps) => (
      <a
        {...props}
        href={href}
        onClick={(event) => {
          onClick?.(event);
          event.preventDefault();
        }}
      >
        {children}
      </a>
    );
    render(<Shell linkComponent={linkComponent} />);
    const drawer = await openDrawer();
    await userEvent.click(within(drawer).getByRole('link', { name: 'Invoices' }));
    await expect.poll(() => screen.queryByRole('dialog', { name: 'Main' })).toBeNull();
  });

  it('shows the bottom tab bar on phones, whose More opens the drawer', async () => {
    render(<Shell currentPath="/sites" />);
    const bar = screen.queryByRole('navigation', { name: 'Quick navigation' });
    if (layout !== 'phone') {
      expect(bar).toBeNull();
      return;
    }
    const tabs = within(screen.getByRole('navigation', { name: 'Quick navigation' }));
    expect(tabs.getByRole('link', { name: 'Sites' })).toHaveAttribute('aria-current', 'page');
    await userEvent.click(tabs.getByRole('button', { name: 'More' }));
    expect(await screen.findByRole('dialog', { name: 'Main' })).toBeInTheDocument();
  });

  it('moves header actions into the user menu on phones', async () => {
    render(<Shell />);
    const help = screen.queryByRole('button', { name: 'Help' });
    expect(help !== null).toBe(layout !== 'phone');
    await userEvent.click(screen.getByRole('button', { name: 'Account: Ada Lovelace' }));
    const menu = await screen.findByRole('menu', { name: 'Ada Lovelace' });
    expect(within(menu).getByRole('menuitem', { name: 'Sign out' })).toBeInTheDocument();
    expect(within(menu).queryByRole('menuitem', { name: 'Help' }) !== null).toBe(
      layout === 'phone',
    );
  });

  it('opens the drawer with a touch tap', async () => {
    if (navigator.maxTouchPoints === 0 || layout === 'desktop') {
      return;
    }
    render(<Shell />);
    await commands.tap('[aria-label="Open navigation"]');
    expect(await screen.findByRole('dialog', { name: 'Main' })).toBeInTheDocument();
  });

  it('shows the version, time zone and links in the footer', () => {
    render(<Shell />);
    const footer = screen.getByRole('contentinfo');
    expect(footer.textContent).toContain('Version 2.4.0');
    expect(footer.textContent).toContain('Times are shown in America/Denver.');
    expect(within(footer).getByRole('link', { name: 'Privacy' })).toHaveAttribute(
      'href',
      '/privacy',
    );
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Shell />);
    await expectNoAxeViolations(container);
  });
});
