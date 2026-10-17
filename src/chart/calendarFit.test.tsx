import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { studyDays } from '../../test/heatmap';
import { CalendarHeatmap } from './CalendarHeatmap';

const isFine = window.matchMedia('(pointer: fine)').matches;

function scrollArea(): HTMLElement {
  const area = screen.getByRole('grid').parentElement;
  if (!area) {
    throw new Error('No scroll area');
  }
  return area;
}

function Calendar(props: Partial<React.ComponentProps<typeof CalendarHeatmap>>) {
  return (
    <CalendarHeatmap
      title="Study"
      start="2026-04-16"
      end="2026-10-15"
      values={studyDays('2026-04-16', 183)}
      {...props}
    />
  );
}

describe('CalendarHeatmap sizing', () => {
  it.skipIf(!isFine || window.innerWidth < 1024)(
    'fits all 26 weeks of six months in a 1000 px card without scrolling',
    async () => {
      render(
        <div style={{ width: 1000 }}>
          <Calendar />
        </div>,
      );
      await expect
        .poll(() => scrollArea().scrollWidth - scrollArea().clientWidth)
        .toBeLessThanOrEqual(0);
      expect(screen.queryByText('Scroll sideways for more')).toBeNull();
      // A year fits too, on smaller cells.
    },
  );

  it.skipIf(!isFine || window.innerWidth < 1024)('fits a whole year on a desktop', async () => {
    render(
      <div style={{ width: 1000 }}>
        <Calendar start="2025-10-16" end="2026-10-15" values={studyDays('2025-10-16', 365)} />
      </div>,
    );
    await expect
      .poll(() => scrollArea().scrollWidth - scrollArea().clientWidth)
      .toBeLessThanOrEqual(0);
  });

  it('opens a calendar that still scrolls on its latest weeks, with the hint pointing back', async () => {
    render(
      <div style={{ width: 300 }}>
        <Calendar cellSize="lg" />
      </div>,
    );
    const area = scrollArea();
    expect(area.scrollWidth).toBeGreaterThan(area.clientWidth);
    await expect
      .poll(() => area.scrollLeft)
      .toBeGreaterThanOrEqual(area.scrollWidth - area.clientWidth - 1);
    const hint = await screen.findByText('Scroll sideways for more');
    // One arrow, before the text: there's more toward the start only.
    expect(hint.querySelectorAll('svg')).toHaveLength(1);
    expect(hint.firstElementChild?.tagName.toLowerCase()).toBe('svg');
  });

  it('can open at the start instead', () => {
    render(
      <div style={{ width: 300 }}>
        <Calendar cellSize="lg" initialScroll="start" />
      </div>,
    );
    expect(scrollArea().scrollLeft).toBe(0);
  });

  it('shows month names over the weeks, keeping each week’s date for screen readers', () => {
    render(
      <div style={{ width: 1000 }}>
        <Calendar />
      </div>,
    );
    const headers = screen.getAllByRole('columnheader').slice(1);
    expect(headers).toHaveLength(27);
    expect(headers[1]?.textContent).toEqual(expect.stringContaining('Apr 19'));
    const months = headers.flatMap((header) =>
      [...header.querySelectorAll('[aria-hidden="true"]')].map((mark) => mark.textContent),
    );
    expect(months).toEqual(expect.arrayContaining(['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct']));
  });
});
