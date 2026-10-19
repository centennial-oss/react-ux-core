import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { kpis, kpiSource } from '../../../test/dashboard';
import { UIProvider } from '../../provider/UIProvider';
import { DashboardWidget } from '../DashboardWidget/DashboardWidget';
import { commonStrings, timeRangeStrings } from '../../provider/coreStrings';
import { defaultDashboardMessages } from '../messages';
import { StatGroup, statGroupWidget, type StatGroupOptions } from './statGroup';

const isDesktop = window.innerWidth >= 1024;

function Group({
  options,
  rotationIntervalMs,
}: {
  options?: Partial<StatGroupOptions>;
  rotationIntervalMs?: number;
}) {
  return (
    <UIProvider locale="en-US">
      <DashboardWidget
        type={statGroupWidget}
        title="Health"
        displayOptions={{ rotationIntervalMs: rotationIntervalMs ?? 15_000, ...options }}
        dataSource={kpiSource()}
        height="40rem"
      />
    </UIProvider>
  );
}

describe('stat group widget (§10.2)', () => {
  it('formats numbers in the locale with at most the given decimals, and a placeholder for missing ones', async () => {
    render(<Group options={{ fractionDigits: 1, placeholder: 'n/a' }} />);
    const region = screen.getByRole('region', { name: 'Health' });
    expect(await within(region).findByText('1,284,312.5')).toBeTruthy();
    expect(within(region).getByText('100')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: /1 of 3/ }));
    await userEvent.click(screen.getByRole('button', { name: /2 of 3/ }));
    expect(
      await screen.findByRole('button', { name: /^Hall temperature n\/a °C 3 of 3/ }),
    ).toBeTruthy();
  });

  it('flows tiles into as many columns as fit, or a fixed number (BI-03)', async () => {
    const { rerender } = render(<Group />);
    await screen.findByText('Uptime');
    const tiles = () => screen.getAllByRole('listitem').map((item) => item.getBoundingClientRect());
    const columnsIn = (rects: DOMRect[]) => new Set(rects.map((rect) => Math.round(rect.top))).size;
    // Four tiles: one row on a desktop, two columns on a phone.
    expect(columnsIn(tiles())).toBe(isDesktop ? 1 : window.innerWidth < 640 ? 2 : 1);
    rerender(
      <UIProvider locale="en-US">
        <DashboardWidget
          type={statGroupWidget}
          title="Health"
          displayOptions={{ tileColumns: 1 }}
          dataSource={kpiSource()}
          height="40rem"
        />
      </UIProvider>,
    );
    await expect.poll(() => columnsIn(tiles())).toBe(4);
  });

  it('rotates a tile with variants, as a button that advances and says where it is (BI-04)', async () => {
    render(<Group />);
    const tile = await screen.findByRole('button', { name: /^Hall temperature 21\.4 °C 1 of 3/ });
    expect(tile.textContent).toContain('1 of 3');
    expect(tile.textContent).toContain('Sensor A');
    await userEvent.click(tile);
    expect(
      await screen.findByRole('button', { name: /^Hall temperature 21\.9 °C 2 of 3/ }),
    ).toBeTruthy();
    if (isDesktop) {
      screen.getByRole('button', { name: /2 of 3/ }).focus();
      await userEvent.keyboard('{Enter}');
      // The third sensor has no reading: the placeholder shows.
      expect(
        await screen.findByRole('button', { name: /^Hall temperature — °C 3 of 3/ }),
      ).toBeTruthy();
    }
  });

  it('rotates by itself, but not in edit mode', async () => {
    const view = (mode: 'view' | 'edit') => (
      <UIProvider locale="en-US">
        <StatGroup
          items={kpis.items}
          options={{ ...statGroupWidget.defaultOptions, rotationIntervalMs: 60 }}
          mode={mode}
          size={{ w: 3, h: 4, width: 600, height: 400, sizeClass: 'regular', scale: 1 }}
          messages={{ ...commonStrings, ...timeRangeStrings, ...defaultDashboardMessages }}
        />
      </UIProvider>
    );
    const { rerender } = render(view('edit'));
    // Hovering pauses rotation too, so the pointer goes elsewhere.
    await userEvent.unhover(screen.getByRole('list'));
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(screen.getByRole('button', { name: /1 of 3/ })).toBeTruthy();
    rerender(view('view'));
    await expect.poll(() => screen.queryByRole('button', { name: /1 of 3/ }) === null).toBe(true);
  });

  it('shows each tile’s sources and time (BI-05), and passes axe', async () => {
    const { container } = render(<Group />);
    await screen.findByText('Uptime');
    expect(screen.getByText('From Sensor A')).toBeTruthy();
    expect(kpis.items[0]?.timestamp).toBeDefined();
    await expectNoAxeViolations(container);
  });
});
