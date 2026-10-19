import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../../test/axe';
import type { Messages } from '../../provider/messages';
import { UIProvider } from '../../provider/UIProvider';
import type { SegmentedMeterMessages } from './messages';
import { SegmentedMeter, type SegmentedMeterProps } from './SegmentedMeter';

const quota: SegmentedMeterProps = {
  label: 'Archive storage',
  unit: 'GiB',
  maxValue: 100,
  segments: [
    { id: 'used', label: 'Used', value: 62 },
    { id: 'reserved', label: 'Reserved', value: 10 },
  ],
  markers: [{ value: 80, label: 'Soft limit' }],
};

describe('SegmentedMeter', () => {
  it('is a meter whose value text names every part and the maximum', () => {
    render(<SegmentedMeter {...quota} />);
    const meter = screen.getByRole('meter', { name: 'Archive storage' });
    expect(meter).toHaveAttribute('aria-valuetext', 'Used 62 GiB, Reserved 10 GiB, of 100 GiB');
    expect(meter).toHaveAttribute('aria-valuenow', '72');
    expect(meter).toHaveAttribute('aria-valuemax', '100');
    expect(meter.textContent).toContain('72 of 100 GiB');
  });

  it('lists used, reserved, free and the soft limit with values in the legend', () => {
    render(<SegmentedMeter {...quota} />);
    const legend = screen.getByRole('list', { name: 'Archive storage, breakdown' });
    expect(
      within(legend)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Used62 GiB', 'Reserved10 GiB', 'Free28 GiB', 'Soft limit80 GiB']);
  });

  it('sizes segments in proportion and places the marker', () => {
    const { container } = render(<SegmentedMeter {...quota} />);
    const used = container.querySelector<HTMLElement>('[data-segment="used"]');
    const reserved = container.querySelector<HTMLElement>('[data-segment="reserved"]');
    const marker = container.querySelector<HTMLElement>('[data-marker="Soft limit"]');
    expect(used?.style.width).toBe('62%');
    expect(reserved?.style.width).toBe('10%');
    expect(reserved?.style.insetInlineStart).toBe('62%');
    expect(marker?.style.insetInlineStart).toBe('80%');
  });

  it('warns when the total passes a marker', () => {
    render(
      <SegmentedMeter
        {...quota}
        segments={[
          { id: 'used', label: 'Used', value: 74 },
          { id: 'reserved', label: 'Reserved', value: 12 },
        ]}
      />,
    );
    expect(screen.getByText('Over Soft limit (80 GiB)')).toBeVisible();
    expect(screen.getByRole('meter').getAttribute('aria-valuetext')).toContain(
      'Over Soft limit (80 GiB)',
    );
  });

  it('hatches the share past capacity and reports how far over it is', () => {
    const { container } = render(
      <SegmentedMeter
        {...quota}
        segments={[
          { id: 'used', label: 'Used', value: 96 },
          { id: 'reserved', label: 'Reserved', value: 29 },
        ]}
      />,
    );
    const meter = screen.getByRole('meter');
    expect(meter).toHaveAttribute('data-over-capacity', 'true');
    expect(screen.getByText('Over capacity by 25 GiB')).toBeVisible();
    // The scale stretches to the 125 GiB total; capacity sits at 80% and the last 20% is hatched.
    expect(container.querySelector<HTMLElement>('[data-overflow]')?.style.width).toBe('20%');
    // Nothing is free, so the legend leaves it out.
    expect(screen.queryByText('Free')).toBeNull();
  });

  it('can hide the legend and format currency without a unit', () => {
    render(
      <SegmentedMeter
        label="Outreach budget"
        maxValue={12000}
        formatOptions={{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }}
        segments={[{ id: 'spent', label: 'Spent', value: 7400 }]}
        hasLegend={false}
      />,
    );
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuetext', 'Spent $7,400, of $12,000');
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('fits a 360 px phone without horizontal scrolling', () => {
    const { container } = render(
      <div className="w-[360px] p-4">
        <SegmentedMeter {...quota} />
      </div>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);
    const legend = screen.getByRole('list');
    for (const item of within(legend).getAllByRole('listitem')) {
      expect(item.getBoundingClientRect().right).toBeLessThanOrEqual(
        root.getBoundingClientRect().right,
      );
    }
  });

  it('takes the app’s strings from UIProvider', () => {
    const overrides: Partial<SegmentedMeterMessages> = {
      segmentedMeterFree: 'Available',
      segmentedMeterSummary: ({ parts, max }) => `${parts} / ${max}`,
    };
    // Until SegmentedMeterMessages joins the Messages union, the overrides need widening.
    render(
      <UIProvider messages={overrides as unknown as Partial<Messages>}>
        <SegmentedMeter {...quota} />
      </UIProvider>,
    );
    expect(screen.getByText('Available')).toBeVisible();
    expect(screen.getByRole('meter')).toHaveAttribute(
      'aria-valuetext',
      'Used 62 GiB, Reserved 10 GiB / 100 GiB',
    );
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <SegmentedMeter
        {...quota}
        segments={[
          { id: 'used', label: 'Used', value: 96 },
          { id: 'reserved', label: 'Reserved', value: 16 },
        ]}
      />,
    );
    await expectNoAxeViolations(container);
  });
});
