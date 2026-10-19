import { CalendarDate, today } from '@internationalized/date';
import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { Calendar, RangeCalendar } from './Calendar';

const march15 = new CalendarDate(2025, 3, 15);

/** The day button for `day` in the month it belongs to (outside-month days are hidden, so the visible one). */
function dayButton(day: number, container: HTMLElement = document.body) {
  const cell = within(container)
    .getAllByRole('button', { name: new RegExp(`\\b${String(day)},`) })
    .find((button) => button.closest('td') && button.closest('[data-outside-month]') === null);
  if (!cell) {
    throw new Error(`No visible day ${String(day)}`);
  }
  return cell;
}

/**
 * The calendar's own previous or next button: not the hidden "Next" React Aria adds for screen readers, nor a month or
 * year Cycler's arrows.
 */
function navButton(name: 'Previous' | 'Next') {
  const button = screen
    .getAllByRole('button', { name })
    .find(
      (candidate) =>
        candidate.getAttribute('tabindex') !== '-1' && candidate.closest('[role="group"]') === null,
    );
  if (!button) {
    throw new Error(`No ${name} button`);
  }
  return button;
}

function dayCells(container: HTMLElement) {
  return Array.from(container.querySelectorAll('td [role="button"]')).filter(
    (cell) => cell.closest('[data-outside-month]') === null,
  );
}

describe('Calendar', () => {
  it('is a labelled calendar that reports the picked day as a CalendarDate', async () => {
    const onChange = vi.fn();
    render(<Calendar aria-label="Delivery date" defaultValue={march15} onChange={onChange} />);
    const calendar = screen.getByRole('application', { name: /Delivery date, March 2025/ });
    expect(calendar).toBeInTheDocument();
    await userEvent.click(dayButton(20));
    expect(onChange).toHaveBeenLastCalledWith(new CalendarDate(2025, 3, 20));
    expect(dayButton(20)).toHaveAttribute('data-selected', 'true');
  });

  it('opens on today in its time zone when nothing is selected', () => {
    render(<Calendar aria-label="Date" timeZone="Pacific/Kiritimati" />);
    const now = today('Pacific/Kiritimati');
    const month = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(
      now.toDate('UTC'),
    );
    expect(
      screen.getByRole('application', { name: new RegExp(`${month} ${String(now.year)}`) }),
    ).toBeInTheDocument();
    expect(dayButton(now.day)).toHaveClass('font-bold');
  });

  it('works from the keyboard', async () => {
    const onChange = vi.fn();
    render(<Calendar aria-label="Date" defaultValue={march15} onChange={onChange} />);
    await userEvent.click(dayButton(15));
    await userEvent.keyboard('{ArrowRight}{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenLastCalledWith(new CalendarDate(2025, 3, 23));
  });

  it('selects and deselects several days with selectionMode="multiple"', async () => {
    const onChange = vi.fn();
    function Multiple() {
      const [value, setValue] = useState<CalendarDate[]>([march15]);
      return (
        <Calendar
          aria-label="Days off"
          selectionMode="multiple"
          value={value}
          onChange={(next) => {
            onChange(next);
            setValue(next);
          }}
        />
      );
    }
    render(<Multiple />);
    await userEvent.click(dayButton(18));
    expect(onChange).toHaveBeenLastCalledWith([march15, new CalendarDate(2025, 3, 18)]);
    expect(Array.isArray(onChange.mock.lastCall?.[0])).toBe(true);
    expect(dayButton(15)).toHaveAttribute('data-selected', 'true');
    expect(dayButton(18)).toHaveAttribute('data-selected', 'true');
    await userEvent.click(dayButton(15));
    expect(onChange).toHaveBeenLastCalledWith([new CalendarDate(2025, 3, 18)]);
  });

  it('shows several months with their own headings and pages by the whole set', async () => {
    const { container } = render(
      <Calendar
        aria-label="Date"
        defaultValue={march15}
        visibleMonths={2}
        selectionAlignment="start"
      />,
    );
    expect(container.querySelectorAll('table')).toHaveLength(2);
    const headings = () =>
      Array.from(container.querySelectorAll('table')).map(
        (table) => table.previousElementSibling?.textContent,
      );
    expect(headings()).toEqual(['March 2025', 'April 2025']);
    // One previous and one next button for the whole calendar.
    expect(screen.getAllByRole('button', { name: 'Previous' })).toHaveLength(1);
    await userEvent.click(navButton('Next'));
    expect(headings()).toEqual(['May 2025', 'June 2025']);
  });

  it('shows one week at a time with view="week"', async () => {
    const { container } = render(<Calendar aria-label="Date" defaultValue={march15} view="week" />);
    const days = dayCells(container);
    expect(days).toHaveLength(7);
    expect(days.map((day) => day.textContent)).toEqual(['9', '10', '11', '12', '13', '14', '15']);
    await userEvent.click(navButton('Next'));
    expect(dayCells(container).map((day) => day.textContent)).toEqual([
      '16',
      '17',
      '18',
      '19',
      '20',
      '21',
      '22',
    ]);
  });

  it('keeps every day of a week that spans two months visible', () => {
    const { container } = render(
      <Calendar aria-label="Date" defaultValue={new CalendarDate(2025, 3, 31)} view="week" />,
    );
    expect(dayCells(container).map((day) => day.textContent)).toEqual([
      '30',
      '31',
      '1',
      '2',
      '3',
      '4',
      '5',
    ]);
  });

  it('draws day content, describes it to screen readers and tints highlighted days', () => {
    render(
      <Calendar
        aria-label="Departure"
        defaultValue={march15}
        size="lg"
        getDayInfo={(date) =>
          date.day === 20
            ? { content: '$129', description: 'From $129', tone: 'success' }
            : undefined
        }
      />,
    );
    const day = dayButton(20);
    expect(day.textContent).toContain('$129');
    expect(day).toHaveAccessibleDescription('From $129');
    expect(day).toHaveClass('bg-success-bg');
    expect(dayButton(21)).not.toHaveAttribute('aria-describedby');
  });

  it('marks unavailable days and refuses them', async () => {
    const onChange = vi.fn();
    render(
      <Calendar
        aria-label="Date"
        defaultValue={march15}
        isDateUnavailable={(date) => date.day === 20}
        onChange={onChange}
      />,
    );
    expect(dayButton(20)).toHaveAttribute('data-unavailable', 'true');
    expect(dayButton(20)).toHaveAttribute('aria-disabled', 'true');
    // Playwright won't press an aria-disabled element, so use the keyboard.
    await userEvent.click(dayButton(19));
    await userEvent.keyboard('{ArrowRight}{Enter}');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith(new CalendarDate(2025, 3, 19));
  });

  it('shows the error message while invalid', () => {
    render(
      <Calendar aria-label="Date" defaultValue={march15} isInvalid errorMessage="Pick a weekday" />,
    );
    expect(screen.getByText('Pick a weekday')).toBeInTheDocument();
    expect(dayButton(15)).toHaveAccessibleDescription('Pick a weekday');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <Calendar
        aria-label="Date"
        defaultValue={march15}
        visibleMonths={2}
        size="lg"
        getDayInfo={(date) =>
          date.day % 5 === 0 ? { content: '•', description: 'Busy' } : undefined
        }
      />,
    );
    await expectNoAxeViolations(container);
  });
});

describe('Calendar month and year Cyclers (the default header)', () => {
  /** The month or year Cycler: its group, value button and arrows. */
  function cycler(name: 'Month' | 'Year') {
    const group = screen.getByRole('group', { name });
    return {
      group,
      value: () => within(group).getByRole('button', { name: new RegExp(`^${name} `) }),
      previous: within(group).getByRole('button', { name: 'Previous' }),
      next: within(group).getByRole('button', { name: 'Next' }),
    };
  }

  /** Opens a Cycler's picker and waits for focus to move into it. */
  async function openPicker(name: 'Month' | 'Year') {
    await userEvent.click(cycler(name).value());
    const listbox = await screen.findByRole('listbox', { name });
    await expect.poll(() => listbox.contains(document.activeElement), { timeout: 3000 }).toBe(true);
    return listbox;
  }

  function headingOf(container: HTMLElement) {
    return container.querySelector('[role="application"]')?.getAttribute('aria-label');
  }

  it('shows month and year Cyclers whose arrows page the calendar', async () => {
    const { container } = render(<Calendar aria-label="Date" defaultValue={march15} />);
    expect(cycler('Month').value()).toHaveAccessibleName('Month March');
    expect(cycler('Year').value()).toHaveAccessibleName('Year 2025');
    await userEvent.click(cycler('Month').next);
    expect(headingOf(container)).toContain('April 2025');
    await userEvent.click(cycler('Year').next);
    expect(headingOf(container)).toContain('April 2026');
    expect(cycler('Month').value()).toHaveAccessibleName('Month April');
  });

  it('rolls the month arrows over into the next and previous year', async () => {
    const { container } = render(
      <Calendar aria-label="Date" defaultValue={new CalendarDate(2025, 12, 10)} />,
    );
    await userEvent.click(cycler('Month').next);
    expect(headingOf(container)).toContain('January 2026');
    expect(cycler('Year').value()).toHaveAccessibleName('Year 2026');
    await userEvent.click(cycler('Month').previous);
    expect(headingOf(container)).toContain('December 2025');
  });

  it('jumps straight to a month or a year from the pickers', async () => {
    const onChange = vi.fn();
    const { container } = render(
      <Calendar aria-label="Date" defaultValue={march15} onChange={onChange} />,
    );
    let listbox = await openPicker('Month');
    expect(within(listbox).getAllByRole('option')).toHaveLength(12);
    await userEvent.click(within(listbox).getByRole('option', { name: 'October' }));
    expect(headingOf(container)).toContain('October 2025');

    listbox = await openPicker('Year');
    // A decade at a time, opening on the current one.
    expect(
      within(listbox)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(Array.from({ length: 10 }, (_, index) => String(2020 + index)));
    await userEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    await userEvent.click(within(listbox).getByRole('option', { name: '2012' }));
    expect(headingOf(container)).toContain('October 2012');
    // Jumping moves the view, not the selection.
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps to minValue and maxValue', async () => {
    render(
      <Calendar
        aria-label="Date"
        defaultValue={new CalendarDate(2025, 3, 10)}
        minValue={new CalendarDate(2025, 3, 5)}
        maxValue={new CalendarDate(2026, 2, 20)}
      />,
    );
    expect(cycler('Month').previous).toBeDisabled();
    const listbox = await openPicker('Year');
    expect(
      within(listbox)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['2025', '2026']);
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => screen.queryByRole('listbox'), { timeout: 3000 }).toBeNull();
    const months = await openPicker('Month');
    expect(within(months).getByRole('option', { name: 'February' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(within(months).getByRole('option', { name: 'March' })).not.toHaveAttribute(
      'aria-disabled',
    );
  });

  it('offers the years of yearRange', async () => {
    render(
      <Calendar
        aria-label="Birth date"
        defaultFocusedValue={new CalendarDate(1990, 6, 1)}
        yearRange={{ start: 1985, end: 1994 }}
      />,
    );
    const listbox = await openPicker('Year');
    expect(within(listbox).getAllByRole('option')).toHaveLength(5);
    await userEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(
      within(listbox)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['1985', '1986', '1987', '1988', '1989']);
  });

  it('works in week view and keeps arrows with several months', () => {
    const { unmount } = render(<Calendar aria-label="Date" defaultValue={march15} view="week" />);
    expect(cycler('Month').value()).toHaveAccessibleName('Month March');
    unmount();
    render(<Calendar aria-label="Date" defaultValue={march15} visibleMonths={2} />);
    expect(screen.queryByRole('group', { name: 'Month' })).toBeNull();
    expect(navButton('Next')).toBeInTheDocument();
  });

  it('works on a range calendar', async () => {
    const { container } = render(
      <RangeCalendar
        aria-label="Stay"
        defaultValue={{ start: march15, end: new CalendarDate(2025, 3, 18) }}
      />,
    );
    await userEvent.click(cycler('Year').previous);
    expect(headingOf(container)).toContain('March 2024');
  });

  it('shows plain arrows with headerControls="arrows"', async () => {
    const { container } = render(
      <Calendar aria-label="Date" defaultValue={march15} headerControls="arrows" />,
    );
    expect(screen.queryByRole('group', { name: 'Month' })).toBeNull();
    expect(screen.queryByRole('group', { name: 'Year' })).toBeNull();
    await userEvent.click(navButton('Next'));
    expect(headingOf(container)).toContain('April 2025');
  });

  it('steps a week at a time in week view, under the Cyclers', async () => {
    const { container } = render(<Calendar aria-label="Date" defaultValue={march15} view="week" />);
    expect(cycler('Month').value()).toHaveAccessibleName('Month March');
    await userEvent.click(navButton('Next'));
    expect(dayCells(container).map((day) => day.textContent)).toEqual([
      '16',
      '17',
      '18',
      '19',
      '20',
      '21',
      '22',
    ]);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Calendar aria-label="Date" defaultValue={march15} />);
    await expectNoAxeViolations(container);
  });
});

describe('RangeCalendar', () => {
  it('picks the start and then the end', async () => {
    const onChange = vi.fn();
    render(<RangeCalendar aria-label="Stay" defaultFocusedValue={march15} onChange={onChange} />);
    await userEvent.click(dayButton(10));
    await userEvent.click(dayButton(14));
    expect(onChange).toHaveBeenLastCalledWith({
      start: new CalendarDate(2025, 3, 10),
      end: new CalendarDate(2025, 3, 14),
    });
  });

  it('limits the range length with maxRangeDays once the first end is picked', async () => {
    render(<RangeCalendar aria-label="Stay" defaultFocusedValue={march15} maxRangeDays={5} />);
    expect(dayButton(20)).not.toHaveAttribute('data-unavailable');
    await userEvent.click(dayButton(10));
    expect(dayButton(14)).not.toHaveAttribute('data-unavailable');
    expect(dayButton(15)).toHaveAttribute('data-unavailable', 'true');
  });

  it('shows several months and describes day content', () => {
    const { container } = render(
      <RangeCalendar
        aria-label="Stay"
        defaultValue={{ start: march15, end: new CalendarDate(2025, 3, 18) }}
        visibleMonths={2}
        selectionAlignment="start"
        getDayInfo={(date) => (date.day === 1 ? { description: 'Peak season' } : undefined)}
      />,
    );
    expect(container.querySelectorAll('table')).toHaveLength(2);
    expect(
      dayButton(1, container.querySelectorAll('table')[1] as HTMLElement),
    ).toHaveAccessibleDescription('Peak season');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <RangeCalendar
        aria-label="Stay"
        defaultValue={{ start: march15, end: new CalendarDate(2025, 3, 18) }}
      />,
    );
    await expectNoAxeViolations(container);
  });
});
