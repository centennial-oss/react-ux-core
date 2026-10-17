import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { services, uptimeDays } from '../../../test/people';
import type { Messages } from '../../provider/messages';
import { UIProvider } from '../../provider/UIProvider';
import type { UptimeBarMessages } from './messages';
import { summarizeUptime, UptimeBar, uptimeStatus, type UptimeDay } from './UptimeBar';

const hasTouch = navigator.maxTouchPoints > 0;

/** Ninety days ending Oct 16, 2026: two below 99.9% (one of them below 99%), one without data, the rest 100%. */
const days: UptimeDay[] = uptimeDays(90).map((day, index) => {
  if (index === 87) {
    return { date: day.date, uptime: 99.5, incidents: 1 };
  }
  if (index === 60) {
    return { date: day.date, uptime: 98.0, incidents: 3 };
  }
  if (index === 10) {
    return { date: day.date, uptime: null };
  }
  return { date: day.date, uptime: 100, incidents: 0 };
});

describe('uptime maths', () => {
  it('colours a day by the thresholds', () => {
    expect(uptimeStatus(100)).toBe('ok');
    expect(uptimeStatus(99.9)).toBe('ok');
    expect(uptimeStatus(99.89)).toBe('warning');
    expect(uptimeStatus(98.99)).toBe('danger');
    expect(uptimeStatus(null)).toBe('none');
    expect(uptimeStatus(99.95, { warning: 100, danger: 99.9 })).toBe('warning');
  });

  it('averages the days with data and counts the days below the warning line', () => {
    const { uptime, belowCount } = summarizeUptime(days);
    expect(uptime).toBeCloseTo((87 * 100 + 99.5 + 98) / 89);
    expect(belowCount).toBe(2);
    expect(summarizeUptime([{ date: '2026-10-16', uptime: null }])).toEqual({
      uptime: null,
      belowCount: 0,
    });
  });
});

describe('UptimeBar', () => {
  it('shows the overall uptime and a summary, and lists the days by their full names', () => {
    render(
      <UIProvider locale="en-US">
        <UptimeBar label="Telescope array" days={days} />
      </UIProvider>,
    );
    expect(screen.getByText('99.97%')).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Telescope array' });
    expect(list).toHaveAccessibleDescription('99.97% over 90 days, 2 days below 99.9%');
    const buttons = within(list).getAllByRole('button');
    expect(buttons).toHaveLength(90);
    expect(buttons[87]).toHaveAccessibleName('Oct 14, 2026: 99.5% uptime, 1 incident');
    expect(buttons[60]).toHaveAccessibleName('Sep 17, 2026: 98% uptime, 3 incidents');
    expect(buttons[10]).toHaveAccessibleName('Jul 29, 2026: no data');
    expect(buttons[89]).toHaveAccessibleName('Oct 16, 2026: 100% uptime, no incidents');
    expect(buttons[87]).toHaveClass('bg-warning-solid');
    expect(buttons[60]).toHaveClass('bg-danger-solid');
    expect(buttons[10]).toHaveClass('bg-border-strong');
    expect(buttons[0]).toHaveClass('bg-success-solid');
  });

  it('takes its own thresholds', () => {
    render(<UptimeBar label="Archive" days={days} thresholds={{ warning: 99.99, danger: 99.6 }} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[87]).toHaveClass('bg-danger-solid');
    expect(screen.getByRole('list')).toHaveAccessibleDescription(
      expect.stringContaining('below 99.99%') as string,
    );
  });

  it('says when there is no data at all', () => {
    render(<UptimeBar label="Archive" days={[{ date: '2026-10-16', uptime: null }]} />);
    expect(screen.getByRole('list')).toHaveAccessibleDescription('No data over 1 day');
  });

  it('is one tab stop; arrow keys, Home and End move between days, each showing its details', async () => {
    const onDayPress = vi.fn();
    render(
      <UIProvider locale="en-US">
        <UptimeBar label="Telescope array" days={days} onDayPress={onDayPress} />
      </UIProvider>,
    );
    const buttons = screen.getAllByRole('button');
    await userEvent.keyboard('{Tab}');
    expect(buttons[89]).toHaveFocus();
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip.textContent).toEqual(expect.stringContaining('Oct 16, 2026'));
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}{ArrowLeft}');
    expect(buttons[86]).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(buttons[87]).toHaveFocus();
    await expect
      .poll(() => screen.getByRole('tooltip').textContent)
      .toEqual(expect.stringContaining('99.5% uptime'));
    expect(screen.getByRole('tooltip').textContent).toEqual(expect.stringContaining('1 incident'));
    await userEvent.keyboard('{Enter}');
    expect(onDayPress).toHaveBeenCalledWith(days[87]?.date);
    await userEvent.keyboard('{Home}');
    expect(buttons[0]).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(buttons[89]).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => screen.queryByRole('tooltip')).toBeNull();
    // Tabbing away leaves the list; tabbing back returns to the last focused day.
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    expect(document.body).toHaveFocus();
    await userEvent.keyboard('{Tab}');
    expect(buttons[89]).toHaveFocus();
  });

  it.runIf(!hasTouch)('shows a day’s details on hover and presses it on click', async () => {
    const onDayPress = vi.fn();
    render(<UptimeBar label="Telescope array" days={days} onDayPress={onDayPress} />);
    const day = screen.getAllByRole('button')[60];
    if (!day) {
      throw new Error('no day');
    }
    await userEvent.hover(day);
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip.textContent).toEqual(expect.stringContaining('3 incidents'));
    await userEvent.click(day);
    expect(onDayPress).toHaveBeenCalledWith(days[60]?.date);
    await userEvent.unhover(day);
  });

  it.runIf(hasTouch)(
    'shows a day’s details on the first tap and presses it on the second',
    async () => {
      const onDayPress = vi.fn();
      render(<UptimeBar label="Telescope array" days={days} onDayPress={onDayPress} />);
      const selector = '[aria-label^="Sep 17, 2026"]';
      await commands.tap(selector);
      const tooltip = await screen.findByRole('tooltip');
      expect(tooltip.textContent).toEqual(expect.stringContaining('98% uptime'));
      expect(onDayPress).not.toHaveBeenCalled();
      await commands.tap(selector);
      expect(onDayPress).toHaveBeenCalledWith(days[60]?.date);
    },
  );

  it('fits 90 days at 360 px without scrolling sideways', () => {
    render(
      <div className="w-[360px] px-4">
        <UptimeBar label="Telescope array" days={days} />
      </div>,
    );
    const list = screen.getByRole('list');
    expect(list.scrollWidth).toBeLessThanOrEqual(list.clientWidth);
    const widths = screen
      .getAllByRole('button')
      .map((button) => button.getBoundingClientRect().width);
    expect(Math.min(...widths)).toBeGreaterThanOrEqual(2);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });

  it('renders a grid of 12 services by 90 days quickly', () => {
    const grid = services.map((service, index) => ({ service, days: uptimeDays(90, index) }));
    const start = performance.now();
    render(
      <div>
        {grid.map(({ service, days: serviceDays }) => (
          <UptimeBar key={service} label={service} days={serviceDays} />
        ))}
      </div>,
    );
    const elapsed = performance.now() - start;
    expect(screen.getAllByRole('list')).toHaveLength(12);
    // A loose bound for a development build in a test browser; production renders well under the 50 ms target.
    expect(elapsed).toBeLessThan(500);
  });

  it('takes the app’s strings from UIProvider', () => {
    const overrides: Partial<UptimeBarMessages> = {
      uptimeSummary: ({ uptime, dayCount }) => `${uptime ?? '–'} in ${String(dayCount)} Tagen`,
      uptimeDay: ({ date, uptime }) => `${date}: ${uptime ?? 'keine Daten'}`,
    };
    render(
      <UIProvider locale="de-DE" messages={overrides as Partial<Messages>}>
        <UptimeBar label="Archiv" days={days.slice(85)} />
      </UIProvider>,
    );
    expect(screen.getByRole('list')).toHaveAccessibleDescription(/^99,9\s%\sin 5 Tagen$/);
    expect(screen.getAllByRole('button')[2]).toHaveAccessibleName(/^14\.10\.2026: 99,5\s%$/);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <div className="p-2">
        <UptimeBar label="Telescope array" days={days} />
      </div>,
    );
    await expectNoAxeViolations(container);
  });
});
