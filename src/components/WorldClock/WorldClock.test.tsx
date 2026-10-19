import { act, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '../../../test/axe';
import { UIProvider } from '../../provider/UIProvider';
import { zoneCity, type WorldClockItem } from './clockInfo';
import { WorldClock, type WorldClockProps } from './WorldClock';

// Wednesday 14 October 2026, 5:30:12 PM in New York.
const NOW = Date.UTC(2026, 9, 14, 21, 30, 12);

const items: WorldClockItem[] = [
  { id: 'sf', timeZone: 'America/Los_Angeles', label: 'San Francisco' },
  { id: 'london', timeZone: 'Europe/London' },
  { id: 'tokyo', timeZone: 'Asia/Tokyo' },
  { id: 'kolkata', timeZone: 'Asia/Kolkata' },
];

function renderClock(props: Partial<WorldClockProps> = {}) {
  return render(
    <UIProvider locale="en-US" timeZone="America/New_York">
      <WorldClock items={items} now={NOW} {...props} />
    </UIProvider>,
  );
}

/** Each clock's full name, read from its hidden text or its analog face. */
function clockNames(): string[] {
  return screen
    .getAllByRole('listitem')
    .map(
      (item) =>
        item.querySelector('.sr-only')?.textContent ??
        item.querySelector('[role="img"]')?.getAttribute('aria-label') ??
        '',
    );
}

describe('zoneCity', () => {
  it.each([
    ['America/New_York', 'New York'],
    ['America/Argentina/Buenos_Aires', 'Buenos Aires'],
    ['UTC', 'UTC'],
  ])('names %s "%s"', (zone, city) => {
    expect(zoneCity(zone)).toBe(city);
  });
});

describe('WorldClock', () => {
  it('is a labelled group with each clock named in full, to the minute', () => {
    renderClock();
    expect(screen.getByRole('group', { name: 'World clock' })).toBeInTheDocument();
    const [sf, london, tokyo, kolkata] = clockNames();
    expect(sf).toMatch(/^San Francisco, 2:30\sPM, Wednesday, October 14, -3 hours, Day$/);
    expect(london).toMatch(/^London, 10:30\sPM, Wednesday, October 14, \+5 hours, Night$/);
    expect(tokyo).toMatch(/^Tokyo, 6:30\sAM, Thursday, October 15, \+13 hours, Tomorrow, Day$/);
    expect(kolkata).toMatch(/^Kolkata, 3:00\sAM, .*\+9\.5 hours, Tomorrow, Night$/);
  });

  it('shows the date, the difference from the local zone and, on request, the UTC offset', () => {
    renderClock({ hasOffset: true });
    const tokyo = screen.getAllByRole('listitem')[2];
    expect(tokyo).toMatchTextContent('Thu, Oct 15');
    expect(tokyo).toMatchTextContent('+13h · Tomorrow');
    expect(tokyo).toMatchTextContent('GMT+9');
  });

  it('follows the hour cycle and shows seconds at second granularity', () => {
    renderClock({ hourCycle: 24, granularity: 'second' });
    expect(screen.getAllByRole('listitem')[1]).toMatchTextContent('22:30:12');
    // The name stays to the minute, so it doesn't change every second.
    expect(clockNames()[1]).toMatch(/^London, 22:30, /);
  });

  it('shows working hours when given them', () => {
    renderClock({ workingHours: { start: 9, end: 17 }, layout: 'list' });
    const [sf, london] = screen.getAllByRole('listitem');
    expect(sf).toMatchTextContent('Working hours');
    expect(london).toMatchTextContent('Outside working hours');
    expect(clockNames()[1]).toMatch(/, Outside working hours$/);
  });

  it('shows an error on a clock with an unknown zone, and only on that clock', () => {
    renderClock({ items: [...items.slice(0, 1), { id: 'mars', timeZone: 'Mars/Olympus_Mons' }] });
    const [sf, mars] = screen.getAllByRole('listitem');
    expect(mars).toMatchTextContent('Unknown time zone: Mars/Olympus_Mons');
    expect(sf).not.toMatchTextContent('Unknown');
    expect(sf).toMatchTextContent('2:30');
  });

  it('draws analog faces as images named to the minute, with hands turned by CSS transforms', () => {
    renderClock({ variant: 'analog', granularity: 'second' });
    const london = within(screen.getAllByRole('listitem')[1] ?? document.body).getByRole('img');
    expect(london).toHaveAccessibleName(/^London, 10:30\sPM, /);
    const hands = london.querySelectorAll<SVGLineElement>('line[style]');
    // Hour (22:30 is 315°), minute (30 min 12 s is 181.2°) and second (12 s is 72°).
    expect([...hands].map((hand) => hand.style.transform)).toEqual([
      'rotate(315deg)',
      'rotate(181.2deg)',
      'rotate(72deg)',
    ]);
  });

  it('ticks from the shared clock when no `now` is given', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date', 'performance'], now: NOW });
    try {
      render(
        <UIProvider locale="en-US" timeZone="UTC">
          <WorldClock
            items={[{ id: 'utc', timeZone: 'UTC' }]}
            granularity="second"
            hourCycle={24}
          />
        </UIProvider>,
      );
      const clock = screen.getByRole('listitem');
      expect(clock).toMatchTextContent('21:30:12');
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(clock).toMatchTextContent('21:30:13');
    } finally {
      vi.useRealTimers();
    }
  });

  it('has no accessibility violations', async () => {
    const { container } = renderClock({ workingHours: { start: 9, end: 17 }, hasOffset: true });
    await expectNoAxeViolations(container);
  });

  it('has no accessibility violations as analog faces', async () => {
    const { container } = renderClock({ variant: 'analog' });
    await expectNoAxeViolations(container);
  });
});
