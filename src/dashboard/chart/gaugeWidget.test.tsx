import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UIProvider } from '../../provider/UIProvider';
import { DashboardWidget } from '../DashboardWidget/DashboardWidget';
import { gaugeWidget } from './gaugeWidget';

describe('gauge widget (§10.6)', () => {
  it('shows the value against its range and thresholds, under the frame’s one title', async () => {
    render(
      <UIProvider locale="en-US">
        <DashboardWidget
          type={gaugeWidget}
          title="Load"
          load={() =>
            Promise.resolve({
              value: 82,
              maxValue: 100,
              unit: '%',
              thresholds: { warning: 70, danger: 90 },
            })
          }
          height="16rem"
        />
      </UIProvider>,
    );
    const region = screen.getByRole('region', { name: 'Load' });
    const meter = await within(region).findByRole('meter', { name: 'Load' });
    expect(meter.getAttribute('aria-valuetext')).toBe('82 %, Warning');
    // The gauge's own label is for screen readers only: one visible title.
    const visible = within(region)
      .getAllByText('Load')
      .filter((element) => element.getBoundingClientRect().width > 1);
    expect(visible).toHaveLength(1);
  });

  it('shows the frame’s empty state without a value', async () => {
    render(
      <UIProvider locale="en-US">
        <DashboardWidget
          type={gaugeWidget}
          title="Load"
          load={() => Promise.resolve({ value: null, maxValue: 100 })}
          height="16rem"
        />
      </UIProvider>,
    );
    expect(await screen.findByText('No data')).toBeTruthy();
    expect(screen.queryByRole('meter')).toBeNull();
  });
});
