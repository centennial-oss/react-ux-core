import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import {
  dayRange,
  observatoryItems,
  observatoryLanes,
  SCHEDULE_NOW,
  smallItems,
  smallLanes,
  WEEK_START,
  weekRange,
} from '../../../test/schedule';
import type { Messages } from '../../provider/messages';
import { UIProvider } from '../../provider/UIProvider';
import type { TimelineItem } from './layout';
import type { ScheduleTimelineMessages } from './messages';
import { ScheduleTimeline, type ScheduleTimelineProps } from './ScheduleTimeline';

const isDesktop = window.innerWidth >= 1024;
const isWide = window.innerWidth >= 700;
const HOUR = 3_600_000;

function Timeline(props: Partial<ScheduleTimelineProps>) {
  return (
    <UIProvider locale="en-GB">
      <ScheduleTimeline
        lanes={smallLanes}
        items={smallItems}
        defaultRange={dayRange}
        now={SCHEDULE_NOW}
        timeZone="UTC"
        firstDayOfWeek={1}
        aria-label="Bookings"
        {...props}
      />
    </UIProvider>
  );
}

/** A timeline that applies its own changes, like an app would. */
function EditableTimeline({
  onItemChange,
  ...props
}: Partial<ScheduleTimelineProps> & { onItemChange: (item: TimelineItem) => void }) {
  const [items, setItems] = useState<readonly TimelineItem[]>(props.items ?? smallItems);
  return (
    <Timeline
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

function pointer(element: Element, type: string, clientX: number, clientY: number) {
  element.dispatchEvent(
    new PointerEvent(type, {
      clientX,
      clientY,
      button: 0,
      buttons: type === 'pointerup' ? 0 : 1,
      pointerId: 7,
      pointerType: 'mouse',
      bubbles: true,
      cancelable: true,
    }),
  );
}

/** Drags `element` from its point at `fromX` by `dx` pixels (and `dy`). */
function drag(element: Element, fromX: number, dx: number, dy = 0) {
  const rect = element.getBoundingClientRect();
  const y = rect.top + rect.height / 2;
  pointer(element, 'pointerdown', fromX, y);
  pointer(element, 'pointermove', fromX + dx / 2, y + dy / 2);
  pointer(element, 'pointermove', fromX + dx, y + dy);
  pointer(element, 'pointerup', fromX + dx, y + dy);
}

/** Pixels per minute, measured from an item of known length. */
function pxPerMinute(element: Element, minutes: number) {
  return element.getBoundingClientRect().width / minutes;
}

describe.runIf(isWide)('ScheduleTimeline (grid)', () => {
  it('is a named grid of lanes and items, each item announcing lane, label, times and conflicts', () => {
    render(<Timeline />);
    const grid = screen.getByRole('grid', { name: 'Bookings' });
    expect(within(grid).getAllByRole('row')).toHaveLength(3);
    expect(
      within(grid)
        .getAllByRole('rowheader')
        .map((header) => header.textContent),
    ).toEqual(['Pier 1', 'Pier 2']);
    expect(within(grid).getAllByRole('columnheader')).toHaveLength(2);
    expect(cell('Pier 1, Flat fields, 14:00 to 15:30, conflicts with Dark frames')).toHaveAttribute(
      'data-conflict',
    );
    expect(cell('Pier 1, Dark frames, 15:00 to 16:00, conflicts with Flat fields')).toBeTruthy();
    expect(cell('Pier 1, M31 imaging, 20:00 to 23:00')).not.toHaveAttribute('data-conflict');
    expect(cell('Pier 2, Jupiter transit, 19:00 to 21:00, locked')).toBeTruthy();
    // One tab stop: the first item.
    expect(cell(/^Pier \d, Flat fields/)).toHaveAttribute('tabindex', '0');
    expect(cell(/^Pier \d, Dark frames/)).toHaveAttribute('tabindex', '-1');
  });

  it('shows a week of 10 lanes with 80 bookings and 2 conflicts, hatched and marked', () => {
    render(<Timeline lanes={observatoryLanes} items={observatoryItems} defaultRange={weekRange} />);
    const grid = screen.getByRole('grid');
    expect(within(grid).getAllByRole('rowheader')).toHaveLength(10);
    expect(within(grid).getAllByRole('gridcell')).toHaveLength(80);
    const conflicted = grid.querySelectorAll('[data-conflict]');
    expect(conflicted).toHaveLength(4);
    for (const element of conflicted) {
      const hatch = [...element.querySelectorAll('span')].some((span) =>
        span.className.includes('repeating-linear-gradient'),
      );
      expect(hatch).toBe(true);
      expect(element.querySelector('.lucide-triangle-alert')).not.toBeNull();
      expect(element.getAttribute('aria-label')).toEqual(expect.stringContaining('conflicts with'));
    }
    // Week days label the axis.
    expect(grid.textContent).toEqual(expect.stringContaining('Mon 12'));
    expect(grid.textContent).toEqual(expect.stringContaining('Sun 18'));
  });

  it('draws the now line only when asked and when now is in range', () => {
    const { unmount } = render(<Timeline />);
    expect(document.querySelector('[data-now-line]')).not.toBeNull();
    unmount();
    render(<Timeline hasNowLine={false} />);
    expect(document.querySelector('[data-now-line]')).toBeNull();
  });

  it('hides conflict marks when shouldShowConflicts is false', () => {
    render(<Timeline shouldShowConflicts={false} />);
    expect(document.querySelector('[data-conflict]')).toBeNull();
    expect(cell('Pier 1, Flat fields, 14:00 to 15:30')).toBeTruthy();
  });

  it.runIf(isDesktop)('moves between lane headers and items with the arrow keys', async () => {
    render(<Timeline />);
    cell(/^Pier \d, Flat fields/).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(cell(/^Pier \d, Dark frames/)).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(cell(/M31 imaging/)).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(cell(/Jupiter transit/)).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(screen.getByRole('rowheader', { name: 'Pier 2' })).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    expect(screen.getByRole('rowheader', { name: 'Pier 1' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(cell(/^Pier \d, Flat fields/)).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('rowheader', { name: 'Pier 1' })).toHaveFocus();
  });

  it.runIf(isDesktop)(
    'moves and resizes with Alt and the arrow keys, snapping to 15 minutes, and announces it',
    async () => {
      const onItemChange = vi.fn();
      render(<EditableTimeline onItemChange={onItemChange} />);
      const flat = cell(/^Pier \d, Flat fields/);
      expect(flat).toHaveAccessibleDescription(/Alt and the arrow keys/);
      flat.focus();
      await userEvent.keyboard('{Alt>}{ArrowRight}{/Alt}');
      expect(onItemChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          id: 'a',
          laneId: 'pier-1',
          start: new Date(Date.UTC(2026, 9, 14, 14, 15)),
          end: new Date(Date.UTC(2026, 9, 14, 15, 45)),
        }),
      );
      expect(screen.getByText('Flat fields moved to Pier 1, 14:15 to 15:45')).toBeInTheDocument();
      await userEvent.keyboard('{Alt>}{Shift>}{ArrowRight}{/Shift}{/Alt}');
      expect(onItemChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ end: new Date(Date.UTC(2026, 9, 14, 16, 0)) }),
      );
      await userEvent.keyboard('{Alt>}{Shift>}{ArrowLeft}{ArrowLeft}{/Shift}{/Alt}');
      expect(onItemChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ end: new Date(Date.UTC(2026, 9, 14, 15, 30)) }),
      );
      // To the next lane, keeping focus on the item.
      await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');
      expect(onItemChange).toHaveBeenLastCalledWith(expect.objectContaining({ laneId: 'pier-2' }));
      await expect
        .poll(() => document.activeElement?.getAttribute('aria-label'))
        .toBe('Pier 2, Flat fields, 14:15 to 15:30');
    },
  );

  it.runIf(isDesktop)('won’t move a locked item', async () => {
    const onItemChange = vi.fn();
    render(<EditableTimeline onItemChange={onItemChange} />);
    const locked = cell(/Jupiter transit/);
    expect(locked).toHaveAttribute('aria-readonly', 'true');
    locked.focus();
    await userEvent.keyboard('{Alt>}{ArrowRight}{/Alt}');
    expect(onItemChange).not.toHaveBeenCalled();
    expect(screen.getByText('Jupiter transit is locked')).toBeInTheDocument();
    drag(locked, locked.getBoundingClientRect().left + 10, 80);
    expect(onItemChange).not.toHaveBeenCalled();
  });

  it.runIf(isDesktop)('moves by drag, snapping to 15 minutes, and across lanes', async () => {
    const onItemChange = vi.fn();
    render(<EditableTimeline onItemChange={onItemChange} />);
    const flat = cell(/^Pier \d, Flat fields/);
    const perMinute = pxPerMinute(flat, 90);
    const x = flat.getBoundingClientRect().left + 30;
    // 52 minutes later snaps to 45.
    drag(flat, x, 52 * perMinute);
    expect(onItemChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        start: new Date(Date.UTC(2026, 9, 14, 14, 45)),
        end: new Date(Date.UTC(2026, 9, 14, 16, 15)),
      }),
    );
    // Down a lane and an hour earlier.
    await expect
      .poll(() => cell(/^Pier \d, Flat fields/).getAttribute('aria-label'))
      .toEqual(expect.stringContaining('14:45 to 16:15'));
    const moved = cell(/^Pier \d, Flat fields/);
    const laneHeight = screen.getAllByRole('row')[1]?.getBoundingClientRect().height ?? 44;
    drag(moved, moved.getBoundingClientRect().left + 30, -60 * perMinute, laneHeight);
    expect(onItemChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        laneId: 'pier-2',
        start: new Date(Date.UTC(2026, 9, 14, 13, 45)),
      }),
    );
  });

  it.runIf(isDesktop)('resizes from an edge by drag', () => {
    const onItemChange = vi.fn();
    render(<EditableTimeline onItemChange={onItemChange} />);
    const imaging = cell(/M31 imaging/);
    const perMinute = pxPerMinute(imaging, 180);
    const handle = imaging.querySelector('[data-handle="end"]');
    if (!handle) {
      throw new Error('No end handle');
    }
    const rect = imaging.getBoundingClientRect();
    // Pointer events on the handle bubble to the item, which owns the drag.
    const y = rect.top + rect.height / 2;
    pointer(handle, 'pointerdown', rect.right - 2, y);
    pointer(imaging, 'pointermove', rect.right - 2 + 30 * perMinute, y);
    pointer(imaging, 'pointerup', rect.right - 2 + 30 * perMinute, y);
    expect(onItemChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        start: new Date(Date.UTC(2026, 9, 14, 20, 0)),
        end: new Date(Date.UTC(2026, 9, 14, 23, 30)),
      }),
    );
  });

  it.runIf(isDesktop)('creates an item by dragging on empty space', () => {
    const onCreate = vi.fn();
    render(<Timeline isEditable onCreate={onCreate} />);
    const imaging = cell(/M31 imaging/);
    const perMinute = pxPerMinute(imaging, 180);
    const track = imaging.parentElement;
    if (!track) {
      throw new Error('No track');
    }
    const trackLeft = track.getBoundingClientRect().left;
    // From 17:05 to 18:10 in Pier 1: 17:00 to 18:15.
    const fromX = trackLeft + (17 * 60 + 5) * perMinute;
    drag(track, fromX, 65 * perMinute);
    expect(onCreate).toHaveBeenCalledWith({
      laneId: 'pier-1',
      start: new Date(Date.UTC(2026, 9, 14, 17, 0)),
      end: new Date(Date.UTC(2026, 9, 14, 18, 15)),
    });
  });

  it.runIf(isDesktop)('creates an hour from a lane header with Enter', async () => {
    const onCreate = vi.fn();
    render(<Timeline isEditable onCreate={onCreate} />);
    const header = screen.getByRole('rowheader', { name: 'Pier 2' });
    expect(header).toHaveAccessibleDescription('Press Enter to add an item to this lane.');
    header.focus();
    await userEvent.keyboard('{Enter}');
    // From now (21:30), on the grid.
    expect(onCreate).toHaveBeenCalledWith({
      laneId: 'pier-2',
      start: new Date(Date.UTC(2026, 9, 14, 21, 30)),
      end: new Date(Date.UTC(2026, 9, 14, 22, 30)),
    });
  });

  it('shows an item’s details in a popover when pressed', async () => {
    render(<Timeline />);
    await userEvent.click(cell(/^Pier \d, Flat fields/));
    const dialog = await screen.findByRole('dialog', { name: 'Flat fields' });
    expect(dialog.textContent).toEqual(expect.stringContaining('Conflicts with Dark frames'));
    expect(dialog.textContent).toEqual(expect.stringContaining('14:00 to 15:30'));
  });

  it('changes views and steps through ranges from the toolbar', async () => {
    const onRangeChange = vi.fn();
    render(<Timeline onRangeChange={onRangeChange} />);
    expect(screen.getByText('Wednesday 14 October')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Week' }));
    expect(onRangeChange).toHaveBeenLastCalledWith({
      start: new Date(WEEK_START),
      end: new Date(WEEK_START + 7 * 24 * HOUR),
    });
    expect(screen.getByText(/^12\D+18 Oct 2026$/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onRangeChange).toHaveBeenLastCalledWith({
      start: new Date(WEEK_START + 7 * 24 * HOUR),
      end: new Date(WEEK_START + 14 * 24 * HOUR),
    });
    await userEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(onRangeChange).toHaveBeenLastCalledWith({
      start: new Date(WEEK_START),
      end: new Date(WEEK_START + 7 * 24 * HOUR),
    });
    await userEvent.click(screen.getByRole('radio', { name: 'Custom' }));
    expect(screen.getByRole('radio', { name: 'Custom' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('textbox', { name: 'Days' })).toHaveValue('7');
    await userEvent.click(screen.getByRole('radio', { name: 'Day' }));
    expect(onRangeChange).toHaveBeenLastCalledWith({
      start: new Date(WEEK_START + 2 * 24 * HOUR),
      end: new Date(WEEK_START + 3 * 24 * HOUR),
    });
  });

  it('takes its strings from UIProvider', () => {
    const overrides: Partial<ScheduleTimelineMessages> = {
      scheduleToday: 'Heute',
      scheduleItem: ({ lane, label }) => `${label} auf ${lane}`,
    };
    render(
      <UIProvider locale="en-GB" messages={overrides as Partial<Messages>}>
        <ScheduleTimeline
          lanes={smallLanes}
          items={smallItems}
          defaultRange={dayRange}
          now={SCHEDULE_NOW}
          timeZone="UTC"
        />
      </UIProvider>,
    );
    expect(screen.getByRole('button', { name: 'Heute' })).toBeInTheDocument();
    expect(cell('Flat fields auf Pier 1')).toBeTruthy();
    expect(screen.getByRole('grid', { name: 'Schedule' })).toBeInTheDocument();
  });

  it('never makes the page scroll sideways (the week scrolls inside)', () => {
    render(
      <div className="p-2">
        <Timeline lanes={observatoryLanes} items={observatoryItems} defaultRange={weekRange} />
      </div>,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <Timeline
        lanes={observatoryLanes}
        items={observatoryItems}
        defaultRange={weekRange}
        isEditable
      />,
    );
    await expectNoAxeViolations(container);
  });
});

describe('ScheduleTimeline (agenda)', () => {
  function Narrow(props: Partial<ScheduleTimelineProps>) {
    return (
      <div className="w-[340px]">
        <Timeline {...props} />
      </div>
    );
  }

  it('lists items by lane and day in a narrow container', () => {
    render(<Narrow lanes={observatoryLanes} items={observatoryItems} defaultRange={weekRange} />);
    expect(screen.queryByRole('grid')).toBeNull();
    const laneHeadings = screen.getAllByRole('heading', { level: 3 });
    expect(laneHeadings.map((heading) => heading.textContent)).toEqual(
      observatoryLanes.map((lane) => lane.label),
    );
    const pier2 = screen.getByRole('region', { name: 'Pier 2' });
    expect(within(pier2).getAllByRole('heading', { level: 4 })).toHaveLength(7);
    expect(within(pier2).getAllByRole('listitem')).toHaveLength(8);
    expect(pier2.textContent).toEqual(expect.stringContaining('Conflicts with Calibration frames'));
  });

  it('shows empty lanes and uses the toolbar on phones too', async () => {
    const onRangeChange = vi.fn();
    render(<Narrow items={[]} onRangeChange={onRangeChange} />);
    expect(screen.getAllByText('Nothing scheduled')).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onRangeChange).toHaveBeenLastCalledWith({
      start: new Date(WEEK_START + 1 * 24 * HOUR),
      end: new Date(WEEK_START + 2 * 24 * HOUR),
    });
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Narrow />);
    await expectNoAxeViolations(container);
  });
});
