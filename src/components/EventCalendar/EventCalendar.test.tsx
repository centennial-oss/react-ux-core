import { render, screen, within } from '@testing-library/react';
import { Profiler, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import {
  busyMonth,
  EVENTS_NOW,
  EVENTS_WEEK_START,
  eventsWeek,
  octoberEvents,
  octoberGrid,
} from '../../../test/events';
import { observatoryItems, SCHEDULE_NOW, weekRange } from '../../../test/schedule';
import type { Messages } from '../../provider/messages';
import { UIProvider } from '../../provider/UIProvider';
import type { TimelineRange } from '../ScheduleTimeline';
import { EventCalendar, type EventCalendarProps } from './EventCalendar';
import type { EventCalendarItem, EventCalendarView } from './layout';

const isDesktop = window.innerWidth >= 1024;
const isNarrow = window.innerWidth < 640;
const hasTouch = navigator.maxTouchPoints > 0;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const oct = (day: number, hour = 0, minute = 0) => new Date(Date.UTC(2026, 9, day, hour, minute));

function Calendar(props: Partial<EventCalendarProps>) {
  return (
    <UIProvider locale="en-GB">
      <EventCalendar
        items={octoberEvents}
        defaultRange={octoberGrid}
        now={EVENTS_NOW}
        timeZone="UTC"
        firstDayOfWeek={1}
        aria-label="Team calendar"
        {...props}
      />
    </UIProvider>
  );
}

/** A calendar that applies its own changes, like an app would. */
function EditableCalendar({
  onItemChange,
  ...props
}: Partial<EventCalendarProps> & { onItemChange: (item: EventCalendarItem) => void }) {
  const [items, setItems] = useState<readonly EventCalendarItem[]>(props.items ?? octoberEvents);
  return (
    <Calendar
      {...props}
      items={items}
      isEditable
      onItemChange={(changed) => {
        onItemChange(changed);
        setItems((current) => current.map((item) => (item.id === changed.id ? changed : item)));
      }}
    />
  );
}

function cell(name: RegExp | string) {
  return screen.getByRole('gridcell', { name });
}

/** The toolbar's own previous or next button, not a month or year Cycler's. */
function periodButton(name: 'Previous' | 'Next') {
  const button = screen
    .getAllByRole('button', { name })
    .find((candidate) => !candidate.closest('[role="group"]'));
  if (!button) {
    throw new Error(`No ${name} button`);
  }
  return button;
}

function pointer(element: Element, type: string, clientX: number, clientY: number) {
  element.dispatchEvent(
    new PointerEvent(type, {
      clientX,
      clientY,
      button: 0,
      buttons: type === 'pointerup' ? 0 : 1,
      pointerId: 9,
      pointerType: 'mouse',
      bubbles: true,
      cancelable: true,
    }),
  );
}

/** Presses `element` at (x, y), drags by (dx, dy) and lets go. */
function drag(element: Element, x: number, y: number, dx: number, dy: number) {
  pointer(element, 'pointerdown', x, y);
  pointer(element, 'pointermove', x + dx / 2, y + dy / 2);
  pointer(element, 'pointermove', x + dx, y + dy);
  pointer(element, 'pointerup', x + dx, y + dy);
}

function centre(element: Element) {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

describe('EventCalendar (month)', () => {
  it('is a named grid of weeks and days, each day naming its date and how many events it has', () => {
    render(<Calendar />);
    const grid = screen.getByRole('grid', { name: 'Team calendar' });
    // The weekday row and five weeks (28 September to 1 November).
    expect(within(grid).getAllByRole('row')).toHaveLength(6);
    expect(
      within(grid)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    const today = cell('Wednesday 14 October, 6 events');
    expect(today).toHaveAttribute('aria-current', 'date');
    expect(cell('Sunday 11 October')).toBeTruthy();
    // One tab stop: today.
    expect(today).toHaveAttribute('tabindex', '0');
    expect(cell('Thursday 15 October, 6 events')).toHaveAttribute('tabindex', '-1');
  });

  it('draws events across days as bars, and timed events as chips with their start', () => {
    render(<Calendar />);
    const offsite = cell(/^Team offsite, 5\D+7 Oct$/);
    const sprintParts = screen.getAllByRole('gridcell', { name: /^Sprint 42/ });
    // Sprint 42 runs 15 to 28 October: three weeks, three bars.
    expect(sprintParts).toHaveLength(3);
    expect(offsite.getBoundingClientRect().width).toBeGreaterThan(
      2 * cell(/^Monday 5 October/).getBoundingClientRect().width,
    );
    if (!isNarrow) {
      // Phones have room for fewer rows, so these are behind "+N more" there.
      expect(cell(/^Server migration, Fri 22:00 to Sat 02:00$/)).toBeTruthy();
      expect(cell(/^Design review, 9:30 to 11:00$/).textContent).toBe('Design review 9:30');
    }
  });

  it('counts what doesn’t fit behind "+N more", which lists the whole day', async () => {
    render(<Calendar />);
    const hidden = isNarrow ? 7 : 5;
    const more = screen.getByRole('button', {
      name: `${String(hidden)} more on Thursday 8 October`,
    });
    expect(more.textContent).toBe(isNarrow ? `+${String(hidden)}` : `+${String(hidden)} more`);
    await userEvent.click(more);
    const dialog = await screen.findByRole('dialog', { name: 'Thursday 8 October' });
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(8);
    expect(dialog.textContent).toEqual(expect.stringContaining('Stand-up'));
  });

  it('shows an event’s details in a popover when pressed', async () => {
    render(<Calendar />);
    await userEvent.click(cell(/^Team offsite/));
    const dialog = await screen.findByRole('dialog', { name: 'Team offsite' });
    expect(dialog.textContent).toEqual(expect.stringContaining('Lakeside lodge; bring a laptop.'));
  });

  it('draws only what fits, however many events there are', () => {
    const items = busyMonth(10);
    expect(items.length).toBeGreaterThan(400);
    render(<Calendar items={items} />);
    const perDay = isNarrow ? 2 : 4;
    // Each of the 35 days shows at most its rows (a bar counts once however many days it covers).
    expect(screen.getAllByRole('gridcell').length).toBeLessThanOrEqual(35 + 35 * perDay);
    expect(cell(/^Thursday 8 October, 18 events$/)).toBeTruthy();
  });

  it.runIf(isDesktop)('moves through days and their events with the arrow keys', async () => {
    render(<Calendar />);
    cell(/^Thursday 15 October/).focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement?.getAttribute('aria-label')).toMatch(/^Sprint 42/);
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement?.getAttribute('aria-label')).toMatch(/^Stand-up/);
    await userEvent.keyboard('{Escape}');
    expect(cell(/^Thursday 15 October/)).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(cell(/^Wednesday 14 October/)).toHaveFocus();
    // Up from a day goes to the last thing in the day above: its "+2 more".
    await userEvent.keyboard('{ArrowUp}');
    expect(screen.getByRole('button', { name: '2 more on Wednesday 7 October' })).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(cell('Sunday 11 October')).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(cell(/^Monday 5 October/)).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(cell('Sunday 4 October')).toHaveFocus();
  });

  it.runIf(isDesktop)(
    'moves and resizes an event by whole days with Alt and the arrow keys, and announces it',
    async () => {
      const onItemChange = vi.fn();
      render(<EditableCalendar onItemChange={onItemChange} />);
      const offsite = cell(/^Team offsite/);
      expect(offsite).toHaveAccessibleDescription(/Alt and the arrow keys move it/);
      offsite.focus();
      await userEvent.keyboard('{Alt>}{ArrowRight}{/Alt}');
      expect(onItemChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: 'offsite', start: oct(6), end: oct(9) }),
      );
      expect(screen.getByText(/^Team offsite moved to 6\D+8 Oct$/)).toBeInTheDocument();
      await expect
        .poll(() => document.activeElement?.getAttribute('aria-label'))
        .toMatch(/^Team offsite, 6\D+8 Oct/);
      await userEvent.keyboard('{Alt>}{Shift>}{ArrowLeft}{/Shift}{/Alt}');
      expect(onItemChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ start: oct(6), end: oct(8) }),
      );
      // A week later, keeping focus on it in its new week.
      await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');
      expect(onItemChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ start: oct(13), end: oct(15) }),
      );
      await expect
        .poll(() => document.activeElement?.getAttribute('aria-label'))
        .toMatch(/^Team offsite, 13\D+14 Oct/);
    },
  );

  it.runIf(isDesktop)('moves an event to another day by drag, keeping its time', () => {
    const onItemChange = vi.fn();
    render(<EditableCalendar onItemChange={onItemChange} />);
    const offsite = cell(/^Team offsite/);
    const dayWidth = cell(/^Monday 5 October/).getBoundingClientRect().width;
    const { x, y } = centre(offsite);
    drag(offsite, x, y, 2 * dayWidth, 0);
    expect(onItemChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'offsite', start: oct(7), end: oct(10) }),
    );
  });

  it.runIf(isDesktop)('adds an all-day event by dragging across days, or with Enter', async () => {
    const onCreate = vi.fn();
    render(<Calendar isEditable onCreate={onCreate} />);
    const monday = cell(/^Monday 19 October/);
    expect(monday).toHaveAccessibleDescription('Press Enter to add an event.');
    const rect = monday.getBoundingClientRect();
    drag(monday, rect.left + 10, rect.top + 10, 2 * rect.width, 0);
    expect(onCreate).toHaveBeenLastCalledWith({ start: oct(19), end: oct(22), isAllDay: true });
    cell(/^Saturday 24 October/).focus();
    await userEvent.keyboard('{Enter}');
    expect(onCreate).toHaveBeenLastCalledWith({ start: oct(24), end: oct(25), isAllDay: true });
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Calendar isEditable onCreate={() => undefined} />);
    await expectNoAxeViolations(container);
  });
});

describe('EventCalendar (week and day)', () => {
  function Week(props: Partial<EventCalendarProps>) {
    return <Calendar defaultView="week" defaultRange={eventsWeek} {...props} />;
  }

  it('is a grid of day columns with an all-day row, hours down the side and the now line', () => {
    render(<Week />);
    const grid = screen.getByRole('grid', { name: 'Team calendar' });
    const headers = within(grid).getAllByRole('columnheader');
    // The hour column and seven days.
    expect(headers).toHaveLength(8);
    expect(screen.getByRole('columnheader', { name: 'Wednesday 14 October' })).toHaveAttribute(
      'aria-current',
      'date',
    );
    expect(within(grid).getByRole('rowheader', { name: 'All day' })).toBeTruthy();
    expect(cell(/^Holiday, All day$/)).toBeTruthy();
    expect(cell(/^Sprint 42/)).toBeTruthy();
    expect(document.querySelector('[data-now-line]')).not.toBeNull();
    expect(screen.getByText(/^12\D+18 Oct 2026$/)).toBeInTheDocument();
  });

  it('places overlapping events side by side, and splits one that runs past midnight', () => {
    render(<Week />);
    const design = cell(/^Design review, 9:30 to 11:00$/).getBoundingClientRect();
    const budget = cell(/^Budget sync/).getBoundingClientRect();
    const hiring = cell(/^Hiring panel/).getBoundingClientRect();
    const column = screen
      .getByRole('columnheader', { name: 'Wednesday 14 October' })
      .getBoundingClientRect();
    expect(design.left).toBeLessThan(budget.left);
    expect(budget.left).toBeLessThan(hiring.left);
    expect(design.width).toBeLessThan(column.width / 3);
    // 9:30 to 11:00 is 1.5 hours tall.
    expect(design.height).toBeCloseTo(72, 0);
    expect(screen.getAllByRole('gridcell', { name: /^Server migration/ })).toHaveLength(2);
  });

  it('draws no now line when asked not to', () => {
    render(<Week hasNowLine={false} />);
    expect(document.querySelector('[data-now-line]')).toBeNull();
  });

  it('shows the same items as ScheduleTimeline, by time', () => {
    render(
      <Calendar
        items={observatoryItems}
        defaultView="week"
        defaultRange={weekRange}
        now={SCHEDULE_NOW}
      />,
    );
    expect(screen.getAllByRole('gridcell')).toHaveLength(80);
  });

  it.runIf(isDesktop)(
    'moves from a day header through its events with the arrow keys',
    async () => {
      render(<Week />);
      screen.getByRole('columnheader', { name: 'Wednesday 14 October' }).focus();
      await userEvent.keyboard('{ArrowDown}');
      expect(document.activeElement?.getAttribute('aria-label')).toMatch(/^Stand-up/);
      await userEvent.keyboard('{ArrowDown}');
      expect(cell(/^Design review/)).toHaveFocus();
      await userEvent.keyboard('{ArrowRight}');
      // The same place in Thursday: its second event.
      expect(document.activeElement?.getAttribute('aria-label')).toMatch(/^Stand-up/);
      await userEvent.keyboard('{ArrowUp}');
      expect(document.activeElement?.getAttribute('aria-label')).toMatch(/^Sprint 42/);
      await userEvent.keyboard('{ArrowUp}');
      expect(screen.getByRole('columnheader', { name: 'Thursday 15 October' })).toHaveFocus();
    },
  );

  it.runIf(isDesktop)(
    'moves by 15 minutes and by days, and changes the end, with Alt and the arrow keys',
    async () => {
      const onItemChange = vi.fn();
      render(
        <EditableCalendar
          defaultView="week"
          defaultRange={eventsWeek}
          onItemChange={onItemChange}
        />,
      );
      const design = cell(/^Design review/);
      design.focus();
      await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');
      expect(onItemChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: 'design', start: oct(14, 9, 45), end: oct(14, 11, 15) }),
      );
      expect(screen.getByText('Design review moved to 9:45 to 11:15')).toBeInTheDocument();
      await expect.poll(() => document.activeElement?.getAttribute('aria-label')).toMatch(/9:45/);
      await userEvent.keyboard('{Alt>}{Shift>}{ArrowDown}{/Shift}{/Alt}');
      expect(onItemChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ start: oct(14, 9, 45), end: oct(14, 11, 30) }),
      );
      await userEvent.keyboard('{Alt>}{ArrowRight}{/Alt}');
      expect(onItemChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ start: oct(15, 9, 45), end: oct(15, 11, 30) }),
      );
      await expect
        .poll(() => document.activeElement?.getAttribute('aria-label'))
        .toBe('Design review, 9:45 to 11:30');
    },
  );

  it.runIf(isDesktop)('won’t move a locked event', async () => {
    const onItemChange = vi.fn();
    render(
      <EditableCalendar defaultView="week" defaultRange={eventsWeek} onItemChange={onItemChange} />,
    );
    const locked = cell(/^Release freeze, 14:00 to 16:00, locked$/);
    expect(locked).toHaveAttribute('aria-readonly', 'true');
    locked.focus();
    await userEvent.keyboard('{Alt>}{ArrowUp}{/Alt}');
    expect(onItemChange).not.toHaveBeenCalled();
    expect(screen.getByText('Release freeze is locked')).toBeInTheDocument();
    const { x, y } = centre(locked);
    drag(locked, x, y, 0, 96);
    expect(onItemChange).not.toHaveBeenCalled();
  });

  it.runIf(isDesktop)(
    'moves, resizes and adds timed events by drag, snapping to 15 minutes',
    async () => {
      const onItemChange = vi.fn();
      const onCreate = vi.fn();
      render(
        <EditableCalendar
          defaultView="week"
          defaultRange={eventsWeek}
          onItemChange={onItemChange}
          onCreate={onCreate}
        />,
      );
      // An hour (48 px) and a bit later snaps to the hour.
      const design = cell(/^Design review/);
      const { x, y } = centre(design);
      drag(design, x, y, 0, 50);
      expect(onItemChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ start: oct(14, 10, 30), end: oct(14, 12) }),
      );
      // To the next day.
      await expect
        .poll(() => cell(/^Design review/).getAttribute('aria-label'))
        .toBe('Design review, 10:30 to 12:00');
      const dayWidth = screen
        .getByRole('columnheader', { name: 'Wednesday 14 October' })
        .getBoundingClientRect().width;
      const moved = cell(/^Design review/);
      const point = centre(moved);
      drag(moved, point.x, point.y, dayWidth, 0);
      expect(onItemChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ start: oct(15, 10, 30), end: oct(15, 12) }),
      );
      // Half an hour longer from its bottom edge.
      const budget = cell(/^Budget sync/);
      const handle = budget.querySelector('[data-handle="end"]');
      if (!handle) {
        throw new Error('No end handle');
      }
      const bottom = budget.getBoundingClientRect().bottom - 2;
      drag(handle, centre(budget).x, bottom, 0, 24);
      expect(onItemChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: 'budget', start: oct(14, 10), end: oct(14, 12) }),
      );
      // A new hour on Tuesday from 16:00.
      const tuesday = document.querySelector('[role="row"] [data-day="1"]:not([aria-hidden])');
      if (!tuesday) {
        throw new Error('No Tuesday column');
      }
      const top = tuesday.getBoundingClientRect().top;
      drag(tuesday, centre(tuesday).x, top + 16 * 48 + 2, 0, 48);
      expect(onCreate).toHaveBeenLastCalledWith({
        start: oct(13, 16),
        end: oct(13, 17),
        isAllDay: false,
      });
    },
  );

  it.runIf(isDesktop)('adds an hour from now with Enter on today’s header', async () => {
    const onCreate = vi.fn();
    render(<Week isEditable onCreate={onCreate} />);
    const header = screen.getByRole('columnheader', { name: 'Wednesday 14 October' });
    expect(header).toHaveAccessibleDescription('Press Enter to add an event.');
    header.focus();
    await userEvent.keyboard('{Enter}');
    expect(onCreate).toHaveBeenCalledWith({
      start: oct(14, 10, 30),
      end: oct(14, 11, 30),
      isAllDay: false,
    });
  });

  it('shows one day', () => {
    render(<Calendar defaultView="day" defaultRange={eventsWeek} />);
    // The middle of the week: Thursday.
    expect(screen.getAllByRole('columnheader')).toHaveLength(2);
    expect(screen.getByRole('columnheader', { name: 'Thursday 15 October' })).toBeTruthy();
    expect(cell(/^Release freeze/)).toBeTruthy();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Week isEditable onCreate={() => undefined} />);
    await expectNoAxeViolations(container);
  });
});

describe('EventCalendar (agenda)', () => {
  it('lists the month’s events by day', () => {
    render(<Calendar defaultView="agenda" />);
    expect(screen.queryByRole('grid')).toBeNull();
    const days = screen.getAllByRole('heading', { level: 3 });
    // Every weekday has events; weekends only when something runs over them.
    expect(days[0]?.textContent).toBe('Thursday 1 October');
    // Each event once, under the day it starts.
    expect(screen.getAllByRole('listitem')).toHaveLength(octoberEvents.length);
    expect(screen.getByText('Lakeside lodge; bring a laptop.')).toBeInTheDocument();
  });

  it('says when there’s nothing', () => {
    render(<Calendar defaultView="agenda" items={[]} />);
    expect(screen.getByText('Nothing scheduled')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Calendar defaultView="agenda" />);
    await expectNoAxeViolations(container);
  });
});

describe.runIf(hasTouch)('EventCalendar (touch)', () => {
  it('opens an event’s details with a tap', async () => {
    render(<Calendar />);
    await commands.tap('[data-key="event:offsite"]');
    const dialog = await screen.findByRole('dialog', { name: 'Team offsite' });
    expect(dialog.textContent).toEqual(expect.stringContaining('Lakeside lodge'));
  });

  it('adds an all-day event with a tap on an empty day, leaving drags to scroll', async () => {
    const onCreate = vi.fn();
    render(<Calendar isEditable onCreate={onCreate} />);
    // Sunday 11 October, which has nothing on it.
    await commands.tap('[data-key="day:13"]');
    expect(onCreate).toHaveBeenCalledWith({ start: oct(11), end: oct(12), isAllDay: true });
  });

  it('adds an hour with a tap on empty time', async () => {
    // Sunday 18 October, with no timed events to tap by mistake.
    const onCreate = vi.fn();
    render(
      <Calendar
        defaultView="day"
        defaultRange={{ start: oct(18), end: oct(19) }}
        isEditable
        onCreate={onCreate}
      />,
    );
    await commands.tap('[role="row"] [data-day="0"]:not([aria-hidden])');
    expect(onCreate).toHaveBeenCalledTimes(1);
    const [{ start, end, isAllDay }] = onCreate.mock.calls[0] as [
      { start: Date; end: Date; isAllDay: boolean },
    ];
    expect(isAllDay).toBe(false);
    expect(end.getTime() - start.getTime()).toBe(HOUR);
    expect(start.getTime()).toBeGreaterThanOrEqual(oct(18).getTime());
    expect(end.getTime()).toBeLessThanOrEqual(oct(19).getTime());
  });
});

describe('EventCalendar (navigation)', () => {
  it('switches views and steps through ranges, reporting each visible range', async () => {
    const onRangeChange = vi.fn();
    const onViewChange = vi.fn();
    render(<Calendar onRangeChange={onRangeChange} onViewChange={onViewChange} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Week' }));
    expect(onViewChange).toHaveBeenLastCalledWith('week');
    expect(onRangeChange).toHaveBeenLastCalledWith(eventsWeek);
    await userEvent.click(periodButton('Next'));
    expect(onRangeChange).toHaveBeenLastCalledWith({
      start: new Date(EVENTS_WEEK_START + 7 * DAY),
      end: new Date(EVENTS_WEEK_START + 14 * DAY),
    });
    await userEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(onRangeChange).toHaveBeenLastCalledWith(eventsWeek);
    await userEvent.click(screen.getByRole('radio', { name: 'Day' }));
    expect(onRangeChange).toHaveBeenLastCalledWith({ start: oct(14), end: oct(15) });
    await userEvent.click(periodButton('Previous'));
    expect(onRangeChange).toHaveBeenLastCalledWith({ start: oct(13), end: oct(14) });
    await userEvent.click(screen.getByRole('radio', { name: 'Agenda' }));
    expect(onRangeChange).toHaveBeenLastCalledWith({ start: oct(1), end: oct(32) });
    await userEvent.click(screen.getByRole('radio', { name: 'Month' }));
    expect(onRangeChange).toHaveBeenLastCalledWith(octoberGrid);
    await userEvent.click(periodButton('Next'));
    // November: 26 October to 6 December.
    expect(onRangeChange).toHaveBeenLastCalledWith({ start: oct(26), end: oct(68) });
  });

  it('jumps to a month or a year with the Cyclers', async () => {
    const onRangeChange = vi.fn();
    render(<Calendar defaultView="week" defaultRange={eventsWeek} onRangeChange={onRangeChange} />);
    const month = screen.getByRole('group', { name: 'Month' });
    await userEvent.click(within(month).getByRole('button', { name: 'Next' }));
    // 14 November's week.
    expect(onRangeChange).toHaveBeenLastCalledWith({ start: oct(40), end: oct(47) });
    const year = screen.getByRole('group', { name: 'Year' });
    await userEvent.click(within(year).getByRole('button', { name: 'Previous' }));
    expect(onRangeChange).toHaveBeenCalledTimes(2);
  });

  it('follows controlled view and range props', async () => {
    const onRangeChange = vi.fn();
    const onViewChange = vi.fn();
    function Controlled() {
      const [view, setView] = useState<EventCalendarView>('day');
      const [range, setRange] = useState<TimelineRange>({ start: oct(14), end: oct(15) });
      return (
        <Calendar
          view={view}
          range={range}
          onViewChange={(next) => {
            onViewChange(next);
            setView(next);
          }}
          onRangeChange={(next) => {
            onRangeChange(next);
            setRange(next);
          }}
        />
      );
    }
    render(<Controlled />);
    expect(screen.getByRole('radio', { name: 'Day' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(screen.getByRole('radio', { name: 'Month' }));
    expect(onViewChange).toHaveBeenLastCalledWith('month');
    expect(onRangeChange).toHaveBeenLastCalledWith(octoberGrid);
    expect(cell(/^Wednesday 14 October/)).toBeTruthy();
  });

  it('stays on a controlled view the app doesn’t change', async () => {
    const onViewChange = vi.fn();
    render(<Calendar view="week" range={eventsWeek} onViewChange={onViewChange} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Day' }));
    expect(onViewChange).toHaveBeenLastCalledWith('day');
    expect(screen.getByRole('radio', { name: 'Week' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getAllByRole('columnheader')).toHaveLength(8);
  });

  it('offers only the views it’s given', () => {
    render(<Calendar views={['month', 'agenda']} />);
    expect(screen.getAllByRole('radio').map((radio) => radio.textContent)).toEqual([
      'Month',
      'Agenda',
    ]);
  });

  it('takes its strings from UIProvider', () => {
    const overrides: Partial<Messages> = {
      scheduleToday: 'Heute',
      eventCalendarViewMonth: 'Monat',
      eventCalendarLabel: 'Kalender',
      eventCalendarEvent: ({ label }) => `Termin ${label}`,
    };
    render(
      <UIProvider locale="en-GB" messages={overrides}>
        <EventCalendar
          items={octoberEvents}
          defaultRange={octoberGrid}
          now={EVENTS_NOW}
          timeZone="UTC"
        />
      </UIProvider>,
    );
    expect(screen.getByRole('button', { name: 'Heute' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Monat' })).toBeInTheDocument();
    expect(screen.getByRole('grid', { name: 'Kalender' })).toBeInTheDocument();
    expect(cell('Termin Team offsite')).toBeTruthy();
  });

  it('never makes the page scroll sideways (the week scrolls inside)', () => {
    const { unmount } = render(
      <div className="p-2">
        <Calendar defaultView="week" defaultRange={eventsWeek} />
      </div>,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    unmount();
    render(
      <div className="p-2">
        <Calendar />
      </div>,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });

  it('stops rendering once settled', async () => {
    // Inline merged refs that re-measure on every render, or a clock that re-renders the whole calendar, would keep
    // it committing.
    let commits = 0;
    render(
      <Profiler
        id="calendar"
        onRender={() => {
          commits += 1;
        }}
      >
        <Calendar defaultView="week" defaultRange={eventsWeek} />
      </Profiler>,
    );
    const settled = async () => {
      const before = commits;
      await new Promise((resolve) => {
        setTimeout(resolve, 300);
      });
      return commits - before;
    };
    await expect.poll(settled, { timeout: 10_000 }).toBe(0);
  });
});
