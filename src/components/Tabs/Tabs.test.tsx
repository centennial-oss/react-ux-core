import { render, screen, within } from '@testing-library/react';
import { Bell, Settings } from 'lucide-react';
import { createRef, useState } from 'react';
import type { Key } from 'react-aria-components';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { UIProvider } from '../../provider/UIProvider';
import type { LinkComponentProps } from '../../provider/link';
import { MenuItem, OverflowMenu } from '../Menu';
import { Tab, TabList, TabPanel, Tabs, type TabsProps } from './Tabs';

const hasTouch = navigator.maxTouchPoints > 0;

function Basic(props: Omit<TabsProps, 'children'>) {
  return (
    <Tabs {...props}>
      <TabList aria-label="Site sections">
        <Tab id="overview">Overview</Tab>
        <Tab id="meters">Meters</Tab>
        <Tab id="billing" isDisabled>
          Billing
        </Tab>
        <Tab id="settings">Settings</Tab>
      </TabList>
      <TabPanel id="overview">Overview panel</TabPanel>
      <TabPanel id="meters">Meters panel</TabPanel>
      <TabPanel id="billing">Billing panel</TabPanel>
      <TabPanel id="settings">Settings panel</TabPanel>
    </Tabs>
  );
}

const SECTIONS = [
  'Overview',
  'Meters',
  'Readings',
  'Tariffs',
  'Invoices',
  'Contacts',
  'Documents',
  'Activity',
  'Settings',
];

function Many({
  selectedKey,
  onSelectionChange,
  defaultSelectedKey,
}: {
  selectedKey?: Key;
  onSelectionChange?: (key: Key) => void;
  defaultSelectedKey?: Key;
}) {
  return (
    <div style={{ width: 320 }} data-testid="column">
      <Tabs
        selectedKey={selectedKey}
        onSelectionChange={onSelectionChange}
        defaultSelectedKey={defaultSelectedKey}
      >
        <TabList aria-label="Site sections" data-testid="list">
          {SECTIONS.map((name) => (
            <Tab key={name} id={name}>
              {name}
            </Tab>
          ))}
        </TabList>
        {SECTIONS.map((name) => (
          <TabPanel key={name} id={name}>
            {name} panel
          </TabPanel>
        ))}
      </Tabs>
    </div>
  );
}

/** Whether `tab` lies fully inside the visible part of `list`. */
function isInView(tab: Element, list: Element) {
  const tabRect = tab.getBoundingClientRect();
  const listRect = list.getBoundingClientRect();
  return tabRect.left >= listRect.left - 1 && tabRect.right <= listRect.right + 1;
}

describe('Tabs', () => {
  it('has tablist, tab and tabpanel semantics', () => {
    render(<Basic />);
    const list = screen.getByRole('tablist', { name: 'Site sections' });
    const tabs = within(list).getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'Overview',
      'Meters',
      'Billing',
      'Settings',
    ]);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    const panel = screen.getByRole('tabpanel');
    expect(panel.textContent).toBe('Overview panel');
    expect(tabs[0]?.getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.getAttribute('aria-labelledby')).toBe(tabs[0]?.id);
  });

  it('moves and selects with arrow keys, Home and End, skipping disabled tabs', async () => {
    const onSelectionChange = vi.fn();
    render(<Basic onSelectionChange={onSelectionChange} />);
    await userEvent.keyboard('{Tab}');
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveFocus();

    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Meters' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Meters' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel').textContent).toBe('Meters panel');
    expect(onSelectionChange).toHaveBeenLastCalledWith('meters');

    // Billing is disabled, so the next stop is Settings.
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveAttribute('aria-selected', 'true');

    // Tab moves from the tab list into the panel.
    await userEvent.keyboard('{Tab}');
    expect(screen.getByRole('tabpanel')).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveAttribute('data-focus-visible', 'true');
  });

  it('only moves focus with arrow keys under manual activation', async () => {
    render(<Basic keyboardActivation="manual" />);
    await userEvent.keyboard('{Tab}{ArrowRight}');
    const meters = screen.getByRole('tab', { name: 'Meters' });
    expect(meters).toHaveFocus();
    expect(meters).toHaveAttribute('aria-selected', 'false');
    await userEvent.keyboard('{Enter}');
    expect(meters).toHaveAttribute('aria-selected', 'true');
  });

  it('shows an inset focus ring for keyboard focus only', async () => {
    render(<Basic />);
    const overview = screen.getByRole('tab', { name: 'Overview' });
    await userEvent.click(overview);
    expect(overview).not.toHaveAttribute('data-focus-visible');
    await userEvent.keyboard('{ArrowRight}');
    const meters = screen.getByRole('tab', { name: 'Meters' });
    expect(meters).toHaveAttribute('data-focus-visible', 'true');
    const style = getComputedStyle(meters);
    expect(style.outlineStyle).toBe('solid');
    // Inside the tab, because the scrolling list would clip a ring drawn outside it.
    expect(parseFloat(style.outlineOffset)).toBeLessThan(0);
  });

  it('selects with the pointer, but not disabled tabs', async () => {
    const onSelectionChange = vi.fn();
    render(<Basic onSelectionChange={onSelectionChange} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Settings' }));
    expect(screen.getByRole('tabpanel').textContent).toBe('Settings panel');
    expect(onSelectionChange).toHaveBeenCalledWith('settings');

    const billing = screen.getByRole('tab', { name: 'Billing' });
    expect(billing).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(billing, { force: true });
    expect(billing).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tabpanel').textContent).toBe('Settings panel');
  });

  it('disables tabs with disabledKeys and the whole set with isDisabled', () => {
    const { unmount } = render(<Basic disabledKeys={['meters']} />);
    expect(screen.getByRole('tab', { name: 'Meters' })).toHaveAttribute('aria-disabled', 'true');
    unmount();
    render(<Basic isDisabled />);
    for (const tab of screen.getAllByRole('tab')) {
      expect(tab).toHaveAttribute('aria-disabled', 'true');
    }
  });

  it.runIf(hasTouch)('selects when tapped, with touch-sized tabs', async () => {
    render(<Basic />);
    await commands.tap('[role="tab"]:nth-child(2)');
    expect(screen.getByRole('tab', { name: 'Meters' })).toHaveAttribute('aria-selected', 'true');
    const hitSize = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--hit-size'),
    );
    expect(hitSize).toBe(44);
    for (const tab of screen.getAllByRole('tab')) {
      const rect = tab.getBoundingClientRect();
      expect(rect.height).toBeGreaterThanOrEqual(hitSize);
      expect(rect.width).toBeGreaterThanOrEqual(hitSize);
    }
  });

  it('follows a controlled selectedKey', async () => {
    function Controlled() {
      const [tab, setTab] = useState<Key>('meters');
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setTab('settings');
            }}
          >
            Open settings
          </button>
          <Basic selectedKey={tab} onSelectionChange={setTab} />
        </>
      );
    }
    render(<Controlled />);
    expect(screen.getByRole('tab', { name: 'Meters' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Open settings' }));
    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByRole('tab', { name: 'Overview' }));
    expect(screen.getByRole('tabpanel').textContent).toBe('Overview panel');
  });

  it('stays put when a controlled selectedKey is not updated', async () => {
    const onSelectionChange = vi.fn();
    render(<Basic selectedKey="meters" onSelectionChange={onSelectionChange} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Settings' }));
    expect(onSelectionChange).toHaveBeenCalledWith('settings');
    expect(screen.getByRole('tab', { name: 'Meters' })).toHaveAttribute('aria-selected', 'true');
  });

  it('scrolls the tab list, not the page, when tabs overflow', () => {
    render(<Many />);
    const list = screen.getByRole('tablist');
    const column = screen.getByTestId('column');
    expect(list.scrollWidth).toBeGreaterThan(list.clientWidth);
    expect(getComputedStyle(list).overflowX).toBe('auto');
    expect(column.scrollWidth).toBeLessThanOrEqual(column.clientWidth);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth,
    );
  });

  it('scrolls the initially selected tab into view', () => {
    render(<Many defaultSelectedKey="Activity" />);
    const list = screen.getByRole('tablist');
    expect(list.scrollLeft).toBeGreaterThan(0);
    expect(isInView(screen.getByRole('tab', { name: 'Activity' }), list)).toBe(true);
  });

  it('keeps the selected tab in view when a controlled selection changes', async () => {
    const { rerender } = render(<Many selectedKey="Overview" />);
    const list = screen.getByRole('tablist');
    expect(list.scrollLeft).toBe(0);
    rerender(<Many selectedKey="Settings" />);
    const settings = screen.getByRole('tab', { name: 'Settings' });
    await expect.poll(() => isInView(settings, list), { timeout: 2000 }).toBe(true);
    rerender(<Many selectedKey="Meters" />);
    const meters = screen.getByRole('tab', { name: 'Meters' });
    await expect.poll(() => isInView(meters, list), { timeout: 2000 }).toBe(true);
  });

  it('keeps the focused tab in view while arrowing through an overflowing list', async () => {
    render(<Many />);
    const list = screen.getByRole('tablist');
    await userEvent.keyboard('{Tab}{End}');
    const settings = screen.getByRole('tab', { name: 'Settings' });
    expect(settings).toHaveFocus();
    await expect.poll(() => isInView(settings, list), { timeout: 2000 }).toBe(true);
  });

  it('renders actions after the tab list, outside it', async () => {
    const onAction = vi.fn();
    render(
      <Tabs>
        <TabList
          aria-label="Site sections"
          actions={
            <OverflowMenu onAction={onAction}>
              <MenuItem id="export">Export</MenuItem>
            </OverflowMenu>
          }
        >
          <Tab id="overview">Overview</Tab>
          <Tab id="meters">Meters</Tab>
        </TabList>
        <TabPanel id="overview">Overview panel</TabPanel>
        <TabPanel id="meters">Meters panel</TabPanel>
      </Tabs>,
    );
    const list = screen.getByRole('tablist');
    const trigger = screen.getByRole('button', { name: 'More actions' });
    expect(list.contains(trigger)).toBe(false);
    expect(list.parentElement?.contains(trigger)).toBe(true);
    expect(within(list).getAllByRole('tab')).toHaveLength(2);

    // Tab order: the selected tab, then the actions, then the panel.
    await userEvent.keyboard('{Tab}');
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveFocus();
    await userEvent.keyboard('{Tab}');
    expect(trigger).toHaveFocus();

    await userEvent.click(trigger);
    const menu = await screen.findByRole('menu');
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Export' }));
    expect(onAction.mock.calls[0]?.[0]).toBe('export');
  });

  it('shows an icon and a badge, which is part of the name', () => {
    render(
      <Tabs>
        <TabList aria-label="Account">
          <Tab id="alerts" icon={Bell} badge={3}>
            Alerts
          </Tab>
          <Tab id="settings" icon={Settings}>
            Settings
          </Tab>
        </TabList>
        <TabPanel id="alerts">Alerts panel</TabPanel>
        <TabPanel id="settings">Settings panel</TabPanel>
      </Tabs>,
    );
    const alerts = screen.getByRole('tab', { name: 'Alerts 3' });
    expect(alerts.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders link tabs through the LinkComponent', async () => {
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
    render(
      <UIProvider LinkComponent={AppLink}>
        <Tabs selectedKey="overview">
          <TabList aria-label="Site sections">
            <Tab id="overview" href="/sites/12/overview">
              Overview
            </Tab>
            <Tab id="meters" href="/sites/12/meters">
              Meters
            </Tab>
          </TabList>
          <TabPanel id="overview">Overview panel</TabPanel>
          <TabPanel id="meters">Meters panel</TabPanel>
        </Tabs>
      </UIProvider>,
    );
    const meters = screen.getByRole('tab', { name: 'Meters' });
    expect(meters.tagName).toBe('A');
    expect(meters).toHaveAttribute('data-app-link');
    expect(meters).toHaveAttribute('href', '/sites/12/meters');
    await userEvent.click(meters);
    expect(navigate).toHaveBeenCalledWith('/sites/12/meters');
  });

  it('keeps force-mounted inactive panels hidden and inert', async () => {
    render(
      <Tabs>
        <TabList aria-label="Form steps">
          <Tab id="one">One</Tab>
          <Tab id="two">Two</Tab>
        </TabList>
        <TabPanel id="one" shouldForceMount>
          <label>
            Name <input />
          </label>
        </TabPanel>
        <TabPanel id="two" shouldForceMount>
          Second panel
        </TabPanel>
      </Tabs>,
    );
    const second = screen.getByText('Second panel');
    expect(second.checkVisibility()).toBe(false);
    expect(second.closest('[inert]')).not.toBeNull();
    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Ada');
    await userEvent.click(screen.getByRole('tab', { name: 'Two' }));
    expect(second.checkVisibility()).toBe(true);
    // The first panel stayed mounted, so its input kept its value.
    expect(
      screen.getByRole<HTMLInputElement>('textbox', { name: 'Name', hidden: true }).value,
    ).toBe('Ada');
  });

  it('forwards refs and className to the outer elements', () => {
    const tabsRef = createRef<HTMLDivElement>();
    const rowRef = createRef<HTMLDivElement>();
    render(
      <Tabs ref={tabsRef} className="gap-2" data-testid="tabs">
        <TabList ref={rowRef} className="border-b-0" aria-label="Sections">
          <Tab id="a">A</Tab>
        </TabList>
        <TabPanel id="a">A panel</TabPanel>
      </Tabs>,
    );
    expect(tabsRef.current).toBe(screen.getByTestId('tabs'));
    expect(rowRef.current?.contains(screen.getByRole('tablist'))).toBe(true);
    expect(rowRef.current?.className).toContain('border-b-0');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <>
        <Basic />
        <Many />
      </>,
    );
    await expectNoAxeViolations(container);
  });
});
