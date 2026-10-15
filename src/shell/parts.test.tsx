import { render, screen, within } from '@testing-library/react';
import { FileText } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { Button } from '../components/Button/Button';
import { MenuItem } from '../components/Menu/Menu';
import { TabPanel } from '../components/Tabs/Tabs';
import { UIProvider } from '../provider/UIProvider';
import { Footer } from './Footer';
import { PageHeader } from './PageHeader';
import { SettingsMenu } from './SettingsMenu';
import { sortAlerts, StatusBar, worstSeverity } from './StatusBar';
import type { StatusCategory } from './types';
import { initialsOf, UserMenu } from './UserMenu';

const isPhone = window.innerWidth < 640;

describe('PageHeader', () => {
  it('shows the title as the page heading, with breadcrumbs and actions', async () => {
    const onExport = vi.fn();
    render(
      <PageHeader
        breadcrumbs={[
          { id: 'sites', label: 'Sites', href: '/sites' },
          { id: 'plant', label: 'Plant 12' },
        ]}
        title="Plant 12"
        subtitle="Denver, CO"
        primaryAction={<Button>Add meter</Button>}
        secondaryActions={[{ id: 'export', label: 'Export', icon: FileText, onPress: onExport }]}
        quickActions={<MenuItem id="archive">Archive</MenuItem>}
      />,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Plant 12' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Breadcrumbs' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add meter' })).toBeInTheDocument();
    if (isPhone) {
      // Secondary actions move into the quick-actions menu.
      expect(screen.queryByRole('button', { name: 'Export' })).toBeNull();
      await userEvent.click(screen.getByRole('button', { name: 'More actions' }));
      const menu = await screen.findByRole('menu');
      expect(within(menu).getByRole('menuitem', { name: 'Archive' })).toBeInTheDocument();
      await userEvent.click(within(menu).getByRole('menuitem', { name: 'Export' }));
    } else {
      await userEvent.click(screen.getByRole('button', { name: 'Export' }));
    }
    expect(onExport).toHaveBeenCalledOnce();
  });

  it('owns tabs, with the quick actions at the end of the tab row', async () => {
    const onTabChange = vi.fn();
    const tabs = ['Overview', 'Meters', 'Tariff', 'Contacts', 'History'].map((label) => ({
      id: label.toLowerCase(),
      label,
    }));
    render(
      <PageHeader
        title="Plant 12"
        tabs={tabs}
        onTabChange={onTabChange}
        quickActions={<MenuItem id="archive">Archive</MenuItem>}
      >
        {tabs.map((tab) => (
          <TabPanel key={tab.id} id={tab.id}>
            {`${tab.label} panel`}
          </TabPanel>
        ))}
      </PageHeader>,
    );
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Overview panel');
    if (isPhone) {
      // More than four tabs become a Select on phones.
      await userEvent.click(screen.getByRole('button', { name: /Page sections/ }));
      await userEvent.click(await screen.findByRole('option', { name: 'Tariff' }));
    } else {
      const list = screen.getByRole('tablist', { name: 'Page sections' });
      await userEvent.click(within(list).getByRole('tab', { name: 'Tariff' }));
    }
    expect(onTabChange).toHaveBeenLastCalledWith('tariff');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Tariff panel');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <PageHeader
        title="Plant 12"
        subtitle="Denver, CO"
        tabs={[
          { id: 'a', label: 'Overview' },
          { id: 'b', label: 'Meters' },
        ]}
        quickActions={<MenuItem id="archive">Archive</MenuItem>}
      >
        <TabPanel id="a">A</TabPanel>
        <TabPanel id="b">B</TabPanel>
      </PageHeader>,
    );
    await expectNoAxeViolations(container);
  });
});

const categories: StatusCategory[] = [
  {
    id: 'meters',
    label: 'Meters',
    severity: 'warning',
    alerts: [{ id: 'offline', text: 'Meters not reporting', count: 3, severity: 'warning' }],
  },
  {
    id: 'sync',
    label: 'Integrations',
    severity: 'error',
    alerts: [
      {
        id: 'failed',
        text: 'Accounting sync failed',
        severity: 'error',
        action: { label: 'Retry sync', onPress: vi.fn() },
      },
    ],
  },
  { id: 'billing', label: 'Billing', severity: 'ok', alerts: [] },
];

describe('StatusBar', () => {
  it('ranks severities', () => {
    expect(worstSeverity(['ok', 'warning', 'unknown'])).toBe('warning');
    expect(worstSeverity(['ok', 'error', 'warning'])).toBe('error');
    expect(worstSeverity([])).toBe('ok');
  });

  it('lists each category’s alerts', async () => {
    render(<StatusBar categories={categories} asOf={Date.UTC(2026, 9, 15, 15, 42)} />);
    if (isPhone) {
      // One dot with the worst severity opens every list.
      await userEvent.click(screen.getByRole('button', { name: 'Status: Error' }));
      const sheet = await screen.findByRole('dialog', { name: 'Status' });
      expect(within(sheet).getByRole('heading', { name: /Meters/ })).toBeInTheDocument();
      expect(within(sheet).getByText('No alerts')).toBeInTheDocument();
      return;
    }
    const group = screen.getByRole('group', { name: 'Status' });
    expect(within(group).getByRole('button', { name: 'Billing: OK' })).toBeInTheDocument();
    await userEvent.click(within(group).getByRole('button', { name: 'Meters: Warning, 3 alerts' }));
    const popover = await screen.findByRole('dialog', { name: 'Meters' });
    expect(within(popover).getByText('Meters not reporting')).toBeInTheDocument();
    expect(within(popover).getByText(/^As of/)).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<StatusBar categories={categories} />);
    await expectNoAxeViolations(container);
  });
});

describe('UserMenu and SettingsMenu', () => {
  it('takes initials from the name', () => {
    expect(initialsOf('Ada Lovelace')).toBe('AL');
    expect(initialsOf('  grace  ')).toBe('G');
    expect(initialsOf('Jean-Luc de la Croix')).toBe('JC');
  });

  it('falls back to initials when the picture fails to load', async () => {
    render(<UserMenu name="Ada Lovelace" avatarSrc="/missing.png" />);
    const trigger = screen.getByRole('button', { name: 'Account: Ada Lovelace' });
    await expect.poll(() => trigger.querySelector('[data-initials="AL"]')).not.toBeNull();
  });

  it('switches the theme', async () => {
    render(
      <UIProvider defaultThemePreference="light">
        <SettingsMenu />
      </UIProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }));
    const menu = await screen.findByRole('menu', { name: 'Settings' });
    const dark = within(menu).getByRole('menuitemradio', { name: 'Dark' });
    expect(within(menu).getByRole('menuitemradio', { name: 'Light' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await userEvent.click(dark);
    expect(dark).toHaveAttribute('aria-checked', 'true');
    // Choices keep the menu open.
    expect(menu).toBeInTheDocument();
  });
});

describe('StatusBar polish', () => {
  it('sorts alerts worst first, then newest', () => {
    const sorted = sortAlerts([
      { id: 'a', text: 'a', severity: 'warning', at: 1 },
      { id: 'b', text: 'b', severity: 'error', at: 1 },
      { id: 'c', text: 'c', severity: 'warning', at: 5 },
    ]);
    expect(sorted.map((alert) => alert.id)).toEqual(['b', 'c', 'a']);
  });

  it('announces when the status gets worse', () => {
    const ok: StatusCategory[] = [{ id: 'm', label: 'Meters', severity: 'ok', alerts: [] }];
    const { rerender } = render(<StatusBar categories={ok} />);
    const region = screen.getByRole('status');
    expect(region).toHaveTextContent('');
    rerender(
      <StatusBar categories={[{ id: 'm', label: 'Meters', severity: 'error', alerts: [] }]} />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Status: Error');
  });
});

describe('entry messages', () => {
  it('take the app’s overrides from UIProvider, and default the rest', () => {
    render(
      <UIProvider timeZone="UTC" messages={{ timeZoneNote: ({ zone }) => `Heures en ${zone}.` }}>
        <Footer version="1.0" />
      </UIProvider>,
    );
    expect(screen.getByText('Heures en UTC.')).toBeInTheDocument();
    expect(screen.getByText('Version 1.0')).toBeInTheDocument();
  });
});
