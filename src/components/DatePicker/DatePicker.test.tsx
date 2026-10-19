import { CalendarDate, today } from '@internationalized/date';
import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { settleOverlay } from '../../../test/overlays';
import { DatePicker } from './DatePicker';

const isPhone = window.matchMedia('(max-width: 639.98px)').matches;
const hasTouch = navigator.maxTouchPoints > 0;

/** Opens the calendar from the field's button and waits for the dialog (sheets animate in on phones). */
async function openCalendar(name = 'Calendar Start date') {
  await userEvent.click(screen.getByRole('button', { name }));
  return settleOverlay(await screen.findByRole('dialog'));
}

/** The day button for `day` in the open calendar (outside-month days are hidden, so the visible one). */
function dayButton(dialog: HTMLElement, day: number) {
  return within(dialog)
    .getAllByRole('button', { name: new RegExp(`\\b${String(day)}\\b`) })
    .find((cell) => cell.closest('[data-outside-month]') === null && cell.closest('td'));
}

describe('DatePicker', () => {
  it('is a labelled group of segments and reports typed dates as CalendarDate', async () => {
    const onChange = vi.fn();
    render(
      <DatePicker label="Start date" description="When the contract begins" onChange={onChange} />,
    );
    const group = screen.getByRole('group', { name: 'Start date' });
    const month = within(group).getByRole('spinbutton', { name: /month/i });
    expect(month).toHaveAccessibleDescription('When the contract begins');
    await userEvent.click(month);
    await userEvent.keyboard('03152025');
    expect(onChange).toHaveBeenLastCalledWith(new CalendarDate(2025, 3, 15));
  });

  it('picks a date from the calendar with the pointer, then closes and returns focus', async () => {
    const onChange = vi.fn();
    render(
      <DatePicker
        label="Start date"
        defaultValue={new CalendarDate(2025, 3, 15)}
        onChange={onChange}
      />,
    );
    const dialog = await openCalendar();
    expect(within(dialog).getByRole('heading').textContent).toContain('March 2025');
    const day = dayButton(dialog, 20);
    expect(day).toBeDefined();
    if (day) {
      await userEvent.click(day);
    }
    expect(onChange).toHaveBeenLastCalledWith(new CalendarDate(2025, 3, 20));
    await expect.poll(() => screen.queryByRole('dialog'), { timeout: 3000 }).toBeNull();
    await expect
      .poll(
        () =>
          document.activeElement === screen.getByRole('button', { name: 'Calendar Start date' }),
      )
      .toBe(true);
  });

  it('works from the keyboard: Enter opens, arrows move, Enter picks', async () => {
    const onChange = vi.fn();
    render(
      <DatePicker
        label="Start date"
        defaultValue={new CalendarDate(2025, 3, 15)}
        onChange={onChange}
      />,
    );
    screen.getByRole('button', { name: 'Calendar Start date' }).focus();
    await userEvent.keyboard('{Enter}');
    const dialog = await settleOverlay(await screen.findByRole('dialog'));
    expect(document.activeElement?.getAttribute('aria-label')).toContain('March 15, 2025');
    await userEvent.keyboard('{ArrowRight}{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenLastCalledWith(new CalendarDate(2025, 3, 23));
    await expect.poll(() => dialog.isConnected, { timeout: 3000 }).toBe(false);
  });

  it('steps segments with the arrow keys', async () => {
    const onChange = vi.fn();
    render(
      <DatePicker
        label="Start date"
        defaultValue={new CalendarDate(2025, 3, 15)}
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole('spinbutton', { name: /day/i }));
    await userEvent.keyboard('{ArrowUp}');
    expect(onChange).toHaveBeenLastCalledWith(new CalendarDate(2025, 3, 16));
  });

  it.runIf(hasTouch)('opens the calendar with a tap', async () => {
    render(<DatePicker label="Start date" defaultValue={new CalendarDate(2025, 3, 15)} />);
    await commands.tap('button[aria-label="Calendar"]');
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it.runIf(isPhone)('is a full-screen sheet with a close button on phones', async () => {
    // A page gutter, as in an app: the field's button hit areas reach a few pixels past its border.
    render(
      <div className="p-4">
        <DatePicker label="Start date" defaultValue={new CalendarDate(2025, 3, 15)} />
      </div>,
    );
    const dialog = await openCalendar();
    const sheet = dialog.closest('[data-position="bottom"]');
    expect(sheet).not.toBeNull();
    await expect
      .poll(() => Math.round(dialog.getBoundingClientRect().height + 8), { timeout: 3000 })
      .toBeGreaterThanOrEqual(window.innerHeight * 0.9);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await expect.poll(() => screen.queryByRole('dialog'), { timeout: 3000 }).toBeNull();
  });

  it.runIf(isPhone)('uses touch-sized day buttons on phones', async () => {
    render(<DatePicker label="Start date" defaultValue={new CalendarDate(2025, 3, 15)} />);
    const dialog = await openCalendar();
    const day = dayButton(dialog, 20);
    expect(day?.getBoundingClientRect().width).toBeGreaterThanOrEqual(44);
  });

  it.runIf(!isPhone)('is a popover anchored under the field on tablet and desktop', async () => {
    render(<DatePicker label="Start date" defaultValue={new CalendarDate(2025, 3, 15)} />);
    const dialog = await openCalendar();
    expect(dialog.closest('[data-position]')).toBeNull();
    expect(dialog.closest('[data-placement]')).not.toBeNull();
    expect(dialog.getBoundingClientRect().top).toBeGreaterThan(
      screen.getByRole('group', { name: 'Start date' }).getBoundingClientRect().bottom,
    );
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => screen.queryByRole('dialog'), { timeout: 3000 }).toBeNull();
  });

  it('works controlled', async () => {
    function Controlled() {
      const [value, setValue] = useState<CalendarDate | null>(new CalendarDate(2025, 3, 15));
      return (
        <>
          <DatePicker label="Start date" value={value} onChange={setValue} />
          <output data-testid="value">{value?.toString() ?? 'none'}</output>
        </>
      );
    }
    render(<Controlled />);
    const dialog = await openCalendar();
    const day = dayButton(dialog, 3);
    if (day) {
      await userEvent.click(day);
    }
    await expect.poll(() => screen.getByTestId('value').textContent).toBe('2025-03-03');
    expect(screen.getByRole('spinbutton', { name: /day/i }).textContent).toBe('3');
  });

  it('disables days outside minValue/maxValue and marks unavailable days', async () => {
    render(
      <DatePicker
        label="Start date"
        defaultValue={new CalendarDate(2025, 3, 15)}
        minValue={new CalendarDate(2025, 3, 10)}
        maxValue={new CalendarDate(2025, 3, 25)}
        isDateUnavailable={(date) => date.day === 18}
      />,
    );
    const dialog = await openCalendar();
    expect(dayButton(dialog, 5)).toHaveAttribute('aria-disabled', 'true');
    expect(dayButton(dialog, 28)).toHaveAttribute('aria-disabled', 'true');
    expect(dayButton(dialog, 18)).toHaveAttribute('data-unavailable', 'true');
    expect(dayButton(dialog, 20)).not.toHaveAttribute('aria-disabled');
  });

  it('shows the error message when invalid', () => {
    render(
      <DatePicker
        label="Start date"
        isInvalid
        errorMessage="Pick a weekday"
        defaultValue={new CalendarDate(2025, 3, 15)}
      />,
    );
    expect(screen.getByText('Pick a weekday')).toBeInTheDocument();
    const day = screen.getByRole('spinbutton', { name: /day/i });
    expect(day).toHaveAttribute('aria-invalid', 'true');
    expect(day).toHaveAccessibleDescription(/Pick a weekday/);
  });

  it('marks today in the given time zone, not the browser’s', async () => {
    // These zones are 25 hours apart, so their calendar dates always differ.
    const ahead = today('Pacific/Kiritimati');
    const behind = today('Pacific/Pago_Pago');
    render(<DatePicker label="Start date" timeZone="Pacific/Kiritimati" />);
    const dialog = await openCalendar();
    const todayCell = dayButton(dialog, ahead.day);
    expect(todayCell?.className).toContain('font-bold');
    if (behind.month === ahead.month) {
      expect(dayButton(dialog, behind.day)?.className).not.toContain('font-bold');
    }
  });

  it.runIf(isPhone)('uses at least 16px text on phones', () => {
    render(<DatePicker label="Start date" />);
    expect(
      parseFloat(getComputedStyle(screen.getByRole('spinbutton', { name: /month/i })).fontSize),
    ).toBeGreaterThanOrEqual(16);
  });

  it.runIf(hasTouch)('is at least the minimum touch target tall on touch screens', () => {
    render(<DatePicker label="Start date" size="sm" />);
    expect(
      screen.getByRole('group', { name: 'Start date' }).getBoundingClientRect().height,
    ).toBeGreaterThanOrEqual(44);
  });

  it('shows several months with visibleMonths, starting at the selected month', async () => {
    const onChange = vi.fn();
    render(
      <DatePicker
        label="Start date"
        defaultValue={new CalendarDate(2025, 3, 15)}
        visibleMonths={2}
        onChange={onChange}
      />,
    );
    const dialog = await openCalendar();
    const grids = Array.from(dialog.querySelectorAll('table'));
    expect(grids.map((grid) => grid.previousElementSibling?.textContent)).toEqual([
      'March 2025',
      'April 2025',
    ]);
    const day = dayButton(grids[1] as HTMLElement, 8);
    expect(day).toBeDefined();
    if (day) {
      await userEvent.click(day);
    }
    expect(onChange).toHaveBeenLastCalledWith(new CalendarDate(2025, 4, 8));
  });

  it('jumps to a year from the calendar’s year Cycler and stays open', async () => {
    const onChange = vi.fn();
    render(
      <DatePicker
        label="Birth date"
        defaultValue={new CalendarDate(1990, 6, 15)}
        onChange={onChange}
      />,
    );
    const dialog = await openCalendar('Calendar Birth date');
    const year = within(dialog).getByRole('group', { name: 'Year' });
    await userEvent.click(within(year).getByRole('button', { name: 'Year 1990' }));
    const listbox = await screen.findByRole('listbox', { name: 'Year' });
    await expect.poll(() => listbox.contains(document.activeElement), { timeout: 3000 }).toBe(true);
    await userEvent.click(within(listbox).getByRole('option', { name: '1994' }));
    await expect.poll(() => screen.queryByRole('listbox'), { timeout: 3000 }).toBeNull();
    // The calendar is still open, now on June 1994; pick a day there.
    expect(screen.getByRole('dialog')).toBe(dialog);
    expect(within(year).getByRole('button', { name: 'Year 1994' })).toBeInTheDocument();
    const day = dayButton(dialog, 20);
    expect(day).toBeDefined();
    if (day) {
      await userEvent.click(day);
    }
    expect(onChange).toHaveBeenLastCalledWith(new CalendarDate(1994, 6, 20));
  });

  it('shows plain arrows in the calendar with headerControls="arrows"', async () => {
    render(
      <DatePicker
        label="Start date"
        defaultValue={new CalendarDate(2025, 3, 15)}
        headerControls="arrows"
      />,
    );
    const dialog = await openCalendar();
    expect(within(dialog).queryByRole('group', { name: 'Month' })).toBeNull();
    expect(within(dialog).getAllByRole('button', { name: 'Next' }).length).toBeGreaterThan(0);
  });

  it('forwards ref and className to the field root', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<DatePicker label="Start date" ref={ref} className="custom-root" />);
    expect(ref.current).toHaveClass('custom-root');
    expect(ref.current).toBe(
      screen.getByRole('group', { name: 'Start date' }).closest('.custom-root'),
    );
  });

  it('has no accessibility violations, closed or open', async () => {
    const { container } = render(
      <>
        <DatePicker label="Start date" description="Help" isRequired />
        <DatePicker label="End date" isInvalid errorMessage="Required" />
        <DatePicker label="Fixed" defaultValue={new CalendarDate(2025, 3, 15)} isReadOnly />
      </>,
    );
    await expectNoAxeViolations(container);
    const dialog = await openCalendar();
    await expectNoAxeViolations(dialog);
  });
});
