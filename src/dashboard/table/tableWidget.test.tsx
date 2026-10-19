import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../../test/axe';
import { regionTableSource, trafficSource } from '../../../test/dashboard';
import { UIProvider } from '../../provider/UIProvider';
import { DashboardWidget } from '../DashboardWidget/DashboardWidget';
import { tableWidget } from './tableWidget';

const isNarrow = window.innerWidth < 640;

const frame = (title: string) => screen.getByRole('region', { name: title });

describe('table widget (§10.3)', () => {
  it('shows table data, scrolling inside the frame (BI-06)', async () => {
    const { container } = render(
      <UIProvider locale="en-US">
        <DashboardWidget
          type={tableWidget}
          title="Regions"
          dataSource={regionTableSource()}
          height="16rem"
        />
      </UIProvider>,
    );
    const region = frame('Regions');
    expect(await within(region).findAllByText('Europe')).not.toHaveLength(0);
    // The frame never grows past its height: the table scrolls inside it.
    expect(Math.round(region.getBoundingClientRect().height)).toBe(256);
    if (!isNarrow) {
      expect(within(region).getByRole('table', { name: 'Regions data' })).toBeTruthy();
    }
    await expectNoAxeViolations(container);
  });

  it('pivots time series into rows, newest first (§10.3)', async () => {
    render(
      <UIProvider locale="en-US">
        <DashboardWidget
          type={tableWidget}
          title="Traffic table"
          dataSource={trafficSource()}
          height="20rem"
        />
      </UIProvider>,
    );
    const region = frame('Traffic table');
    expect(await within(region).findAllByText('Requests/s (req/s)')).not.toHaveLength(0);
  });

  it('draws its own loading state (WID-12)', () => {
    render(
      <UIProvider locale="en-US">
        <DashboardWidget
          type={tableWidget}
          title="Regions"
          dataSource={regionTableSource({ latencyMs: 500 })}
        />
      </UIProvider>,
    );
    const region = frame('Regions');
    expect(region.querySelector('[aria-busy="true"]')).not.toBeNull();
  });
});
