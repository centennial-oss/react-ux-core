import { CalendarDate } from '@internationalized/date';
import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { DateRangePicker, type DateRange } from './DateRangePicker';

const isPhone = window.matchMedia('(max-width: 639.98px)').matches;

const march = { start: new CalendarDate(2025, 3, 10), end: new CalendarDate(2025, 3, 14) };

/**
 * Waits for the popover's fade-in or the sheet's slide-in to finish: colour checks need full opacity, and a sheet
 * moves focus in only once it has arrived.
 */
async function settle(dialog: HTMLElement) {
  await expect.poll(() => document.querySelector('[data-entering]'), { timeout: 3000 }).toBeNull();
  if (isPhone) {
    await expect.poll(() => dialog.closest('[data-expanded]'), { timeout: 3000 }).not.toBeNull();
  }
  await expect.poll(() => dialog.contains(document.activeElement), { timeout: 3000 }).toBe(true);
  return dialog;
}

async function openCalendar() {
  await userEvent.click(screen.getByRole('button', { name: 'Calendar Stay' }));
  return settle(await screen.findByRole('dialog'));
}

function dayButton(dialog: HTMLElement, day: number) {
  const cell = within(dialog)
    .getAllByRole('button', { name: new RegExp(`\\b${String(day)}\\b`) })
    .find((button) => button.closest('td') && button.closest('[data-outside-month]') === null);
  if (!cell) {
    throw new Error(`No day ${String(day)}`);
  }
  return cell;
}

describe('DateRangePicker', () => {
  it('has start and end segments and reports typed ranges', async () => {
    const onChange = vi.fn();
    render(<DateRangePicker label="Stay" onChange={onChange} />);
    const group = screen.getByRole('group', { name: 'Stay' });
    const months = within(group).getAllByRole('spinbutton', { name: /month/i });
    expect(months).toHaveLength(2);
    await userEvent.click(months[0] ?? group);
    await userEvent.keyboard('03102025');
    await userEvent.keyboard('03142025');
    expect(onChange).toHaveBeenLastCalledWith(march);
  });

  it('picks the start and then the end in the calendar with the pointer', async () => {
    const onChange = vi.fn();
    render(<DateRangePicker label="Stay" defaultValue={march} onChange={onChange} />);
    const dialog = await openCalendar();
    expect(dayButton(dialog, 12).closest('[data-selected]')).not.toBeNull();
    await userEvent.click(dayButton(dialog, 20));
    await userEvent.click(dayButton(dialog, 24));
    expect(onChange).toHaveBeenLastCalledWith({
      start: new CalendarDate(2025, 3, 20),
      end: new CalendarDate(2025, 3, 24),
    });
    await expect.poll(() => screen.queryByRole('dialog'), { timeout: 3000 }).toBeNull();
  });

  it('works from the keyboard', async () => {
    const onChange = vi.fn();
    render(<DateRangePicker label="Stay" defaultValue={march} onChange={onChange} />);
    screen.getByRole('button', { name: 'Calendar Stay' }).focus();
    await userEvent.keyboard('{Enter}');
    await settle(await screen.findByRole('dialog'));
    expect(document.activeElement?.getAttribute('aria-label')).toContain('March 10, 2025');
    // Enter picks the first end; React Aria then moves focus on by a day to show a range is being picked.
    await userEvent.keyboard('{Enter}');
    await expect
      .poll(() => document.activeElement?.getAttribute('aria-label') ?? '')
      .toContain('March 11, 2025');
    await userEvent.keyboard('{ArrowRight}{Enter}');
    expect(onChange).toHaveBeenLastCalledWith({
      start: new CalendarDate(2025, 3, 10),
      end: new CalendarDate(2025, 3, 12),
    });
  });

  it('limits the range length with maxRangeDays once the first end is picked', async () => {
    render(<DateRangePicker label="Stay" defaultValue={march} maxRangeDays={7} />);
    const dialog = await openCalendar();
    expect(dayButton(dialog, 25)).not.toHaveAttribute('data-unavailable');
    await userEvent.click(dayButton(dialog, 18));
    // 18th–24th is 7 days; 25th would be 8.
    expect(dayButton(dialog, 24)).not.toHaveAttribute('data-unavailable');
    expect(dayButton(dialog, 25)).toHaveAttribute('data-unavailable', 'true');
    expect(dayButton(dialog, 11)).toHaveAttribute('data-unavailable', 'true');
    expect(dayButton(dialog, 12)).not.toHaveAttribute('data-unavailable');
  });

  it('marks a typed range longer than maxRangeDays invalid', async () => {
    render(
      <DateRangePicker
        label="Stay"
        defaultValue={march}
        maxRangeDays={7}
        validationBehavior="aria"
        errorMessage="Choose 7 days or fewer"
      />,
    );
    const days = screen.getAllByRole('spinbutton', { name: /day/i });
    await userEvent.click(days[1] ?? document.body);
    await userEvent.keyboard('28');
    await expect.poll(() => screen.queryByText('Choose 7 days or fewer')).not.toBeNull();
    expect(days[1]).toHaveAttribute('aria-invalid', 'true');
  });

  it('explains a too-long range by default', async () => {
    render(
      <DateRangePicker
        label="Stay"
        defaultValue={march}
        maxRangeDays={7}
        validationBehavior="aria"
      />,
    );
    const days = screen.getAllByRole('spinbutton', { name: /day/i });
    await userEvent.click(days[1] ?? document.body);
    await userEvent.keyboard('28');
    await expect.poll(() => screen.queryByText('Choose a range of 7 days or fewer')).not.toBeNull();
  });

  it('still shows React Aria’s own checks, such as minValue, with maxRangeDays', async () => {
    render(
      <DateRangePicker
        label="Stay"
        defaultValue={march}
        maxRangeDays={31}
        minValue={new CalendarDate(2025, 3, 5)}
        validationBehavior="aria"
      />,
    );
    const days = screen.getAllByRole('spinbutton', { name: /day/i });
    await userEvent.click(days[0] ?? document.body);
    await userEvent.keyboard('01');
    await expect.poll(() => days[0]?.getAttribute('aria-invalid')).toBe('true');
    // React Aria's own message, localised by it.
    expect(screen.getByText(/or later/)).toBeInTheDocument();
  });

  it('works controlled', async () => {
    function Controlled() {
      const [value, setValue] = useState<DateRange | null>(march);
      return (
        <>
          <DateRangePicker label="Stay" value={value} onChange={setValue} />
          <output data-testid="value">
            {value ? `${value.start.toString()}/${value.end.toString()}` : 'none'}
          </output>
        </>
      );
    }
    render(<Controlled />);
    const dialog = await openCalendar();
    await userEvent.click(dayButton(dialog, 3));
    await userEvent.click(dayButton(dialog, 5));
    await expect.poll(() => screen.getByTestId('value').textContent).toBe('2025-03-03/2025-03-05');
  });

  it('shows the error message when invalid', () => {
    render(<DateRangePicker label="Stay" isInvalid errorMessage="Required" />);
    expect(screen.getByText('Required')).toBeInTheDocument();
    for (const segment of screen.getAllByRole('spinbutton')) {
      expect(segment).toHaveAttribute('aria-invalid', 'true');
    }
  });

  it.runIf(isPhone)('is a full-screen sheet on phones', async () => {
    render(
      <div className="p-4">
        <DateRangePicker label="Stay" defaultValue={march} />
      </div>,
    );
    const dialog = await openCalendar();
    expect(dialog.closest('[data-position="bottom"]')).not.toBeNull();
    expect(dayButton(dialog, 20).getBoundingClientRect().width).toBeGreaterThanOrEqual(44);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });

  it('has no accessibility violations, closed or open', async () => {
    const { container } = render(
      <>
        <DateRangePicker label="Stay" defaultValue={march} description="Check-in to check-out" />
        <DateRangePicker label="Other" isInvalid errorMessage="Required" />
      </>,
    );
    await expectNoAxeViolations(container);
    await expectNoAxeViolations(await openCalendar());
  });
});
