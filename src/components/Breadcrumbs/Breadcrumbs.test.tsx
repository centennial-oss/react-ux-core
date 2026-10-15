import { render, screen, within } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { UIProvider } from '../../provider/UIProvider';
import type { LinkComponentProps } from '../../provider/link';
import { Breadcrumbs, type BreadcrumbItem } from './Breadcrumbs';
import { computeCollapsedRange } from './useCollapsedRange';

const hasTouch = navigator.maxTouchPoints > 0;

const SHORT: BreadcrumbItem[] = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'sites', label: 'Sites', href: '/sites' },
  { id: 'plant', label: 'Plant 12', href: '/sites/12' },
];

const LONG: BreadcrumbItem[] = [
  { id: 'org', label: 'Centennial Utilities', href: '/' },
  { id: 'region', label: 'Northern region', href: '/regions/north' },
  { id: 'sites', label: 'Industrial sites', href: '/regions/north/sites' },
  { id: 'plant', label: 'Plant 12 (Riverside)', href: '/sites/12' },
  { id: 'meters', label: 'Meters', href: '/sites/12/meters' },
  { id: 'meter', label: 'Meter M-1042' },
];

/** A router-style link that records navigation instead of leaving the page. */
function createAppLink() {
  const navigate = vi.fn();
  function AppLink({ href, onClick, children, ...props }: LinkComponentProps) {
    return (
      <a
        {...props}
        href={href}
        data-app-link=""
        onClick={(event) => {
          onClick?.(event);
          event.preventDefault();
          navigate(href);
        }}
      >
        {children}
      </a>
    );
  }
  return { AppLink, navigate };
}

function Column({ width, items }: { width: number; items: readonly BreadcrumbItem[] }) {
  return (
    <div style={{ width }} data-testid="column">
      <Breadcrumbs items={items} />
    </div>
  );
}

const trigger = () => screen.queryByRole('button', { name: 'Show hidden breadcrumbs' });

async function openMenu() {
  const button = trigger();
  if (!button) {
    throw new Error('No collapsed menu');
  }
  await userEvent.click(button);
  const menu = await screen.findByRole('menu');
  // Phone menus open as animated bottom sheets, so focus may land a moment later.
  await expect.poll(() => menu.contains(document.activeElement), { timeout: 2000 }).toBe(true);
  return menu;
}

describe('Breadcrumbs', () => {
  it('is a labelled nav with a list of links and the current page last', () => {
    render(<Breadcrumbs items={SHORT} />);
    const nav = screen.getByRole('navigation', { name: 'Breadcrumbs' });
    const list = within(nav).getByRole('list');
    // The nav carries the name; the list isn't labelled a second time.
    expect(list).not.toHaveAttribute('aria-label');
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);

    expect(within(nav).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(within(nav).getByRole('link', { name: 'Sites' })).toHaveAttribute('href', '/sites');
    const current = within(nav).getByRole('link', { name: 'Plant 12' });
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current).not.toHaveAttribute('href');
    expect(current).toHaveAttribute('aria-disabled', 'true');
    expect(
      within(nav)
        .getAllByRole('link')
        .filter((link) => link.hasAttribute('aria-current')),
    ).toEqual([current]);
  });

  it('draws decorative separators between items', () => {
    render(<Breadcrumbs items={SHORT} />);
    const list = screen.getByRole('list');
    const separators = list.querySelectorAll('svg');
    expect(separators).toHaveLength(2);
    for (const separator of separators) {
      expect(separator).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('shows an item without an href as text', () => {
    render(
      <Breadcrumbs
        items={[
          { id: 'home', label: 'Home', href: '/' },
          { id: 'reports', label: 'Reports' },
          { id: 'usage', label: 'Usage' },
        ]}
      />,
    );
    expect(screen.queryByRole('link', { name: 'Reports' })).toBeNull();
    expect(within(screen.getByRole('list')).getByText('Reports')).toBeInTheDocument();
  });

  it('renders every link through the LinkComponent, by pointer and keyboard', async () => {
    const { AppLink, navigate } = createAppLink();
    render(
      <UIProvider LinkComponent={AppLink}>
        <Breadcrumbs items={SHORT} />
      </UIProvider>,
    );
    const home = screen.getByRole('link', { name: 'Home' });
    const sites = screen.getByRole('link', { name: 'Sites' });
    expect(home).toHaveAttribute('data-app-link');
    expect(sites).toHaveAttribute('data-app-link');
    // The current page isn't a link, so it doesn't go through the LinkComponent.
    expect(screen.getByRole('link', { name: 'Plant 12' })).not.toHaveAttribute('data-app-link');

    await userEvent.keyboard('{Tab}');
    expect(home).toHaveFocus();
    expect(home).toHaveAttribute('data-focus-visible', 'true');
    await userEvent.keyboard('{Enter}');
    expect(navigate).toHaveBeenLastCalledWith('/');
    await userEvent.keyboard('{Tab}');
    expect(sites).toHaveFocus();
    // The current page isn't focusable: Tab leaves the trail.
    await userEvent.keyboard('{Tab}');
    expect(screen.getByRole('navigation').contains(document.activeElement)).toBe(false);

    await userEvent.click(sites);
    expect(navigate).toHaveBeenLastCalledWith('/sites');
  });

  it('shows the whole trail when it fits', () => {
    render(<Column width={340} items={SHORT} />);
    expect(trigger()).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('collapses middle items into a menu of links when space is short', async () => {
    const { AppLink, navigate } = createAppLink();
    render(
      <UIProvider LinkComponent={AppLink}>
        <Column width={300} items={LONG} />
      </UIProvider>,
    );
    const list = screen.getByRole('list');
    // First and last stay; the middle collapses behind the menu button.
    expect(within(list).getByRole('link', { name: 'Centennial Utilities' })).toBeInTheDocument();
    expect(within(list).getByRole('link', { name: 'Meter M-1042' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(list).queryByRole('link', { name: 'Northern region' })).toBeNull();
    expect(trigger()).not.toBeNull();
    expect(list.contains(trigger())).toBe(true);

    const menu = await openMenu();
    const menuItems = within(menu).getAllByRole('menuitem');
    const visibleLinks = within(list).getAllByRole('link');
    // Every item is either visible or in the menu, in order.
    expect(menuItems.length + visibleLinks.length).toBe(LONG.length);
    expect(menuItems[0]?.textContent).toBe('Northern region');
    for (const item of menuItems) {
      expect(item.tagName).toBe('A');
      expect(item).toHaveAttribute('data-app-link');
      const source = LONG.find((entry) => entry.label === item.textContent);
      expect(item).toHaveAttribute('href', source?.href);
    }
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Northern region' }));
    expect(navigate).toHaveBeenLastCalledWith('/regions/north');
  });

  it('opens the collapsed menu from the keyboard and closes it with Escape', async () => {
    render(<Column width={300} items={LONG} />);
    const button = trigger();
    button?.focus();
    await userEvent.keyboard('{Enter}');
    const menu = await screen.findByRole('menu');
    await expect
      .poll(() => document.activeElement?.getAttribute('role'), { timeout: 2000 })
      .toBe('menuitem');
    expect(menu.contains(document.activeElement)).toBe(true);
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => screen.queryByRole('menu'), { timeout: 3000 }).toBeNull();
    await expect.poll(() => document.activeElement).toBe(button);
  });

  it.runIf(hasTouch)('opens the collapsed menu when tapped', async () => {
    render(<Column width={300} items={LONG} />);
    await commands.tap('button[aria-label="Show hidden breadcrumbs"]');
    const menu = await screen.findByRole('menu');
    expect(within(menu).getAllByRole('menuitem').length).toBeGreaterThan(0);
  });

  it('collapses and expands as its container resizes', async () => {
    render(
      <Column
        width={1000}
        items={[
          { id: 'a', label: 'Home', href: '/' },
          { id: 'b', label: 'Region', href: '/r' },
          { id: 'c', label: 'Sites', href: '/s' },
          { id: 'd', label: 'Plant', href: '/p' },
          { id: 'e', label: 'Meter' },
        ]}
      />,
    );
    const column = screen.getByTestId('column');
    // Short labels fit on every screen size (the column is capped at the viewport), but not in 120 px.
    column.style.maxWidth = '100%';
    await expect.poll(() => trigger(), { timeout: 2000 }).toBeNull();
    column.style.width = '120px';
    await expect.poll(() => trigger(), { timeout: 2000 }).not.toBeNull();
    column.style.width = '1000px';
    await expect.poll(() => trigger(), { timeout: 2000 }).toBeNull();
    expect(screen.getAllByRole('link')).toHaveLength(5);
  });

  it('never makes the page scroll sideways, even with very long labels', () => {
    render(
      <Column
        width={240}
        items={[
          { id: 'org', label: 'Centennial Utilities Holdings International', href: '/' },
          { id: 'a', label: 'Northern region', href: '/a' },
          { id: 'b', label: 'Meter M-1042 on the main incoming supply at Riverside' },
        ]}
      />,
    );
    const column = screen.getByTestId('column');
    expect(trigger()).not.toBeNull();
    expect(column.scrollWidth).toBeLessThanOrEqual(column.clientWidth);
    expect(screen.getByRole('list').scrollWidth).toBeLessThanOrEqual(240);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth,
    );
  });

  it('takes a className, ref, aria-label and data attributes on the nav', () => {
    const ref = createRef<HTMLElement>();
    render(
      <Breadcrumbs
        ref={ref}
        items={SHORT}
        className="mb-4"
        aria-label="Site location"
        data-testid="crumbs"
      />,
    );
    const nav = screen.getByRole('navigation', { name: 'Site location' });
    expect(ref.current).toBe(nav);
    expect(screen.getByTestId('crumbs')).toBe(nav);
    expect(nav.className).toContain('mb-4');
  });

  it('uses the messages from UIProvider', () => {
    render(
      <UIProvider messages={{ breadcrumbs: 'Brotkrumen', showHiddenBreadcrumbs: 'Mehr anzeigen' }}>
        <Column width={300} items={LONG} />
      </UIProvider>,
    );
    expect(screen.getByRole('navigation', { name: 'Brotkrumen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mehr anzeigen' })).toBeInTheDocument();
  });

  // Separate tests, so each axe run gets the whole test timeout.
  it('has no accessibility violations when not collapsed', async () => {
    const { container } = render(<Column width={340} items={SHORT} />);
    await expectNoAxeViolations(container);
  });

  it('has no accessibility violations when collapsed, with the menu open', async () => {
    const { container } = render(<Column width={300} items={LONG} />);
    expect(trigger()).not.toBeNull();
    await expectNoAxeViolations(container);
    await expectNoAxeViolations(await openMenu());
  });
});

describe('computeCollapsedRange', () => {
  it('collapses nothing when everything fits', () => {
    expect(computeCollapsedRange([50, 50, 50], 30, 150)).toBeNull();
    expect(computeCollapsedRange([500, 500], 30, 100)).toBeNull();
  });

  it('keeps the first item and as many trailing items as fit', () => {
    // 6 items of 50 px, menu 30 px: first + menu + last = 130.
    const widths = [50, 50, 50, 50, 50, 50];
    expect(computeCollapsedRange(widths, 30, 130)).toEqual({ start: 1, end: 5 });
    expect(computeCollapsedRange(widths, 30, 180)).toEqual({ start: 1, end: 4 });
    expect(computeCollapsedRange(widths, 30, 279)).toEqual({ start: 1, end: 3 });
    expect(computeCollapsedRange(widths, 30, 280)).toEqual({ start: 1, end: 2 });
    expect(computeCollapsedRange(widths, 30, 299)).toEqual({ start: 1, end: 2 });
    expect(computeCollapsedRange(widths, 30, 300)).toBeNull();
  });

  it('collapses down to first, menu and last even when that does not fit', () => {
    expect(computeCollapsedRange([200, 50, 50, 200], 30, 100)).toEqual({ start: 1, end: 3 });
  });
});
