import { render, screen, within } from '@testing-library/react';
import { Activity, Pencil } from 'lucide-react';
import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { kpiSource, trafficSource } from '../../../test/dashboard';
import type { Messages } from '../../provider/messages';
import { UIProvider } from '../../provider/UIProvider';
import { DashboardWidget } from '../DashboardWidget/DashboardWidget';
import { statsShape } from '../data/shapes';
import type { WidgetRenderProps } from '../types';
import { defineWidget } from '../widgets/define';
import { statGroupWidget } from '../widgets/statGroup';
import { DashboardContextProvider } from '../context/DashboardContexts';
import { resolveDataShapes } from '../widgets/define';
import { WidgetFrame } from './WidgetFrame';
import { WidgetView } from './WidgetView';

describe('WidgetFrame', () => {
  it('is a region named by its title, also when the title is hidden (WID-07)', () => {
    const { rerender } = render(
      <UIProvider>
        <WidgetFrame title="Revenue" icon={Activity}>
          <p>Body</p>
        </WidgetFrame>
      </UIProvider>,
    );
    expect(screen.getByRole('region', { name: 'Revenue' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Revenue' }).className).not.toContain('sr-only');
    rerender(
      <UIProvider>
        <WidgetFrame title="Revenue" isTitleHidden>
          <p>Body</p>
        </WidgetFrame>
      </UIProvider>,
    );
    expect(screen.getByRole('region', { name: 'Revenue' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Revenue' }).className).toContain('sr-only');
  });

  it('has one action menu with every action, danger ones last (WID-08)', async () => {
    const onEdit = vi.fn();
    const onRemove = vi.fn();
    render(
      <UIProvider>
        <WidgetFrame
          title="Revenue"
          updatedAt={new Date()}
          actions={[
            { id: 'remove', label: 'Remove', tone: 'danger', onAction: onRemove },
            { id: 'edit', label: 'Edit', icon: Pencil, onAction: onEdit },
          ]}
        >
          <p>Body</p>
        </WidgetFrame>
      </UIProvider>,
    );
    expect(screen.getAllByRole('button', { name: 'Actions for Revenue' })).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Revenue' }));
    const menu = await screen.findByRole('menu');
    const items = within(menu).getAllByRole('menuitem');
    expect(items.map((item) => item.textContent)).toEqual(['Updated now', 'Edit', 'Remove']);
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Edit' }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('shows a refreshing indicator, and a retry for a failed refresh (WID-09, DATA-09)', async () => {
    const onRetry = vi.fn();
    render(
      <UIProvider>
        <WidgetFrame title="Revenue" isRefreshing onRefreshErrorRetry={onRetry}>
          <p>Body</p>
        </WidgetFrame>
      </UIProvider>,
    );
    expect(screen.getByRole('progressbar', { name: 'Refreshing' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: /Couldn’t refresh/ }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('in edit mode, makes the body inert and shows the lock and setup status (WID-10, WID-11, EDIT-21)', async () => {
    const onConfigure = vi.fn();
    render(
      <UIProvider>
        <WidgetFrame title="Revenue" mode="edit" isLocked hasSetupIssue onConfigure={onConfigure}>
          <button type="button">Inside</button>
        </WidgetFrame>
      </UIProvider>,
    );
    expect(screen.getByText('Inside').closest('[inert]')).not.toBeNull();
    expect(screen.getByText('Locked')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Needs setup' }));
    expect(onConfigure).toHaveBeenCalledTimes(1);
  });

  it('accents the frame when highlighted, and passes axe', async () => {
    const { container } = render(
      <UIProvider>
        <WidgetFrame title="Revenue" isHighlighted titleNote="Uses its own time range: Last 7 days">
          <p>Body</p>
        </WidgetFrame>
      </UIProvider>,
    );
    expect(screen.getByRole('region', { name: 'Revenue' }).dataset.highlighted).toBe('true');
    expect(screen.getByRole('img', { name: 'Uses its own time range: Last 7 days' })).toBeTruthy();
    await expectNoAxeViolations(container);
  });
});

describe('widget states (§7.4)', () => {
  it('shows a placeholder while loading, then the widget', async () => {
    render(
      <UIProvider>
        <DashboardWidget
          type={statGroupWidget}
          title="Health"
          dataSource={kpiSource({ latencyMs: 60 })}
        />
      </UIProvider>,
    );
    const region = screen.getByRole('region', { name: 'Health' });
    expect(within(region).queryByText('Uptime')).toBeNull();
    expect(region.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(await within(region).findByText('Uptime')).toBeTruthy();
  });

  it('shows an empty state with the instance’s own message', async () => {
    render(
      <UIProvider>
        <DashboardWidget
          type={statGroupWidget}
          title="Health"
          displayOptions={{ emptyMessage: 'Nothing measured yet' }}
          dataSource={kpiSource({ isEmpty: true })}
        />
      </UIProvider>,
    );
    expect(await screen.findByRole('heading', { name: 'Nothing measured yet' })).toBeTruthy();
  });

  it('shows an error with Retry and the details collapsed, and formats it with formatError (DATA-13)', async () => {
    let shouldFail = true;
    const { rerender } = render(
      <UIProvider>
        <DashboardWidget
          type={statGroupWidget}
          title="Health"
          load={() =>
            shouldFail ? Promise.reject(new Error('HTTP 503')) : Promise.resolve({ items: [] })
          }
        />
      </UIProvider>,
    );
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Couldn’t load this widget’s data');
    expect(screen.getByRole('button', { name: 'Details' }).getAttribute('aria-expanded')).toBe(
      'false',
    );
    rerender(
      <UIProvider>
        <DashboardWidget
          type={statGroupWidget}
          title="Health"
          load={() =>
            shouldFail ? Promise.reject(new Error('HTTP 503')) : Promise.resolve({ items: [] })
          }
          formatError={() => 'The metrics service is down.'}
        />
      </UIProvider>,
    );
    expect(await screen.findByText('The metrics service is down.')).toBeTruthy();
    shouldFail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { name: 'No data' })).toBeTruthy();
  });

  it('contains a widget that throws, reports it, and reloads it (WID-13, acceptance 9)', async () => {
    let shouldThrow = true;
    const onWidgetError = vi.fn();
    const fragile = defineWidget<Record<string, never>, null>({
      type: 'test.fragile',
      displayName: 'Fragile',
      dataShape: null,
      defaultSize: { w: 2, h: 2 },
      defaultOptions: {},
      component: () => {
        if (shouldThrow) {
          throw new Error('render broke');
        }
        return <p>Recovered</p>;
      },
    });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <UIProvider>
        <DashboardWidget type={fragile} title="Fragile" onWidgetError={onWidgetError} />
        <DashboardWidget type={statGroupWidget} title="Health" dataSource={kpiSource()} />
        <DashboardWidget
          type={statGroupWidget}
          title="Broken source"
          dataSource={kpiSource({ failWith: 'down' }, 'other')}
        />
      </UIProvider>,
    );
    expect(await screen.findByText('This widget stopped working')).toBeTruthy();
    expect(onWidgetError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'render broke' }),
      {
        widgetId: expect.any(String) as string,
        type: 'test.fragile',
        phase: 'render',
      },
    );
    expect(await screen.findByText('Uptime')).toBeTruthy();
    const broken = screen.getByRole('region', { name: 'Broken source' });
    expect(await within(broken).findByRole('button', { name: 'Retry' })).toBeTruthy();
    shouldThrow = false;
    await userEvent.click(screen.getByRole('button', { name: 'Reload widget' }));
    expect(await screen.findByText('Recovered')).toBeTruthy();
  });

  it('hands the states to a component that draws its own (WID-12)', async () => {
    const seen: string[] = [];
    function Own({
      isLoading,
      dataState: data,
    }: WidgetRenderProps<Record<string, never>, unknown>) {
      useEffect(() => {
        seen.push(`${String(isLoading)}:${data.status}`);
      });
      return <p>{isLoading ? 'drawing my own skeleton' : 'loaded'}</p>;
    }
    const own = defineWidget<Record<string, never>, unknown>({
      type: 'test.own',
      displayName: 'Own',
      dataShape: statsShape.id,
      defaultSize: { w: 2, h: 2 },
      defaultOptions: {},
      hasOwnStates: true,
      component: Own,
    });
    render(
      <UIProvider>
        <DashboardWidget type={own} title="Own" dataSource={kpiSource({ latencyMs: 30 })} />
      </UIProvider>,
    );
    expect(screen.getByText('drawing my own skeleton')).toBeTruthy();
    expect(await screen.findByText('loaded')).toBeTruthy();
    expect(seen).toContain('true:loading');
    await expect.poll(() => seen.at(-1)).toBe('false:success');
  });

  function ChartWithExport({ setActions }: WidgetRenderProps<Record<string, never>, unknown>) {
    useEffect(() => {
      setActions([{ id: 'export', label: 'Export', onAction: () => undefined }]);
    }, [setActions]);
    return <p>Chart</p>;
  }

  it('shows a setup prompt for a widget without data, and lets widget types add actions', async () => {
    const withAction = defineWidget<Record<string, never>, unknown>({
      type: 'test.actions',
      displayName: 'Actions',
      dataShape: 'timeSeries',
      defaultSize: { w: 2, h: 2 },
      defaultOptions: {},
      component: ChartWithExport,
    });
    render(
      <UIProvider>
        <DashboardWidget type={statGroupWidget} title="Unbound" />
        <DashboardWidget type={withAction} title="Traffic" dataSource={trafficSource()} />
      </UIProvider>,
    );
    expect(screen.getByText('This widget isn’t set up yet')).toBeTruthy();
    expect(await screen.findByText('Chart')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Traffic' }));
    const menu = await screen.findByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: 'Refresh' })).toBeTruthy();
    expect(within(menu).getByRole('menuitem', { name: 'Export' })).toBeTruthy();
  });

  it('keeps a widget of an unknown type, naming the type (WID-19)', () => {
    render(
      <UIProvider>
        <DashboardContextProvider
          timeZone="UTC"
          dataSources={new Map()}
          dataShapes={resolveDataShapes()}
        >
          <WidgetView
            instance={{ id: 'x', type: 'acme.retired', title: 'Old chart', layout: { w: 2, h: 2 } }}
            definition={undefined}
            cell={{ w: 2, h: 2, width: 300, height: 200, scale: 1 }}
            scope={{ breakpoint: 'full', mode: 'view', scale: 1 }}
          />
        </DashboardContextProvider>
      </UIProvider>,
    );
    expect(screen.getByRole('region', { name: 'Old chart' })).toBeTruthy();
    expect(screen.getByText('Unknown widget type “acme.retired”')).toBeTruthy();
  });

  it('reads its strings from UIProvider', () => {
    const messages: Partial<Messages> = { unconfiguredTitle: 'Noch nicht eingerichtet' };
    render(
      <UIProvider messages={messages}>
        <DashboardWidget type={statGroupWidget} title="Unbound" />
      </UIProvider>,
    );
    expect(screen.getByText('Noch nicht eingerichtet')).toBeTruthy();
  });
});
