import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { deploys, latency, maintenance } from '../../test/charts';
import { UIProvider } from '../provider/UIProvider';
import { clusterEventMarkers, type ChartEvent } from './events';
import { TimeSeriesChart } from './TimeSeriesChart';

const isDesktop = window.innerWidth >= 1024;
const isTouch = navigator.maxTouchPoints > 0;
const isPhone = window.matchMedia('(max-width: 639.98px)').matches;

function markers(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[data-event-marker]')];
}

function marker(index: number): HTMLElement {
  const found = markers()[index];
  if (!found) {
    throw new Error(`No marker ${String(index)}`);
  }
  return found;
}

function Chart(props: {
  events?: readonly ChartEvent[];
  onEventPress?: (event: ChartEvent) => void;
}) {
  return (
    <TimeSeriesChart
      title="Latency"
      series={[latency]}
      events={deploys}
      timeZone="UTC"
      {...props}
    />
  );
}

describe('clusterEventMarkers', () => {
  const event = (id: string): ChartEvent => ({ id, at: 0, label: id });

  it('clusters markers closer than the gap, chained, at their mean position', () => {
    const clusters = clusterEventMarkers(
      [
        { event: event('a'), x: 10 },
        { event: event('c'), x: 50 },
        { event: event('b'), x: 30 },
        { event: event('d'), x: 120 },
      ],
      28,
    );
    expect(clusters.map((cluster) => cluster.events.map((entry) => entry.id))).toEqual([
      ['a', 'b', 'c'],
      ['d'],
    ]);
    expect(clusters[0]?.x).toBe(30);
    expect(clusters[1]?.x).toBe(120);
  });

  it('keeps markers at least the gap apart separate', () => {
    expect(
      clusterEventMarkers(
        [
          { event: event('a'), x: 0 },
          { event: event('b'), x: 28 },
        ],
        28,
      ),
    ).toHaveLength(2);
  });
});

describe('TimeSeriesChart events', () => {
  it('marks five deploys with four chips: two of them clustered', async () => {
    render(<Chart />);
    await expect.poll(() => markers().length).toBe(4);
    expect(markers().map((marker) => marker.getAttribute('aria-label'))).toEqual([
      'Deploy 1.4.0, Oct 6, 2026, 10:00 AM',
      'Deploy 1.4.1, Oct 7, 2026, 3:00 PM',
      '2 events: Deploy 1.5.0 and Config change',
      'Deploy 1.5.1, Oct 10, 2026, 2:00 PM',
    ]);
  });

  it.skipIf(!isDesktop)('reaches every event by keyboard', async () => {
    render(<Chart />);
    await expect.poll(() => markers().length).toBe(4);
    const focused = new Set<Element>();
    for (let press = 0; press < 12; press++) {
      await userEvent.keyboard('{Tab}');
      if (document.activeElement) {
        focused.add(document.activeElement);
      }
    }
    for (const marker of markers()) {
      expect(focused.has(marker)).toBe(true);
    }
    // The cluster opens a popover listing both of its events.
    markers()[2]?.focus();
    await userEvent.keyboard('{Enter}');
    const dialog = await screen.findByRole('dialog', { name: /2 events/ });
    expect(within(dialog).getByText('Deploy 1.5.0')).toBeVisible();
    expect(within(dialog).getByText('Config change')).toBeVisible();
    expect(
      within(dialog).getByText('Latency rose for nine hours after this release.'),
    ).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => screen.queryByRole('dialog')).toBeNull();
  });

  it('opens an event’s detail and reports the press', async () => {
    const onEventPress = vi.fn();
    render(<Chart onEventPress={onEventPress} />);
    await expect.poll(() => markers().length).toBe(4);
    await userEvent.click(marker(1));
    const dialog = await screen.findByRole('dialog', { name: 'Deploy 1.4.1' });
    expect(within(dialog).getByText('Faster dome telemetry.')).toBeVisible();
    expect(onEventPress).toHaveBeenCalledWith(deploys[1]);
  });

  it.skipIf(!isTouch)('opens an event with a tap', async () => {
    render(<Chart />);
    await expect.poll(() => markers().length).toBe(4);
    await commands.tap('[data-event-marker="deploy-5"]');
    expect(await screen.findByRole('dialog', { name: 'Deploy 1.5.1' })).toBeInTheDocument();
  });

  it('shades spans and links an event’s label', async () => {
    render(<Chart events={maintenance} />);
    await expect.poll(() => markers().length).toBe(2);
    await userEvent.click(marker(1));
    const dialog = await screen.findByRole('dialog', { name: 'Network incident' });
    expect(within(dialog).getByRole('link', { name: 'Network incident' })).toHaveAttribute(
      'href',
      'https://example.com/incidents/42',
    );
  });

  it('lists the events in the summary and the table view', async () => {
    render(<Chart />);
    const canvas = screen.getByRole('img', { name: 'Latency' });
    expect(canvas.getAttribute('aria-describedby')).toBeTruthy();
    const description = document.getElementById(canvas.getAttribute('aria-describedby') ?? '');
    expect(description?.textContent).toEqual(
      expect.stringContaining(
        '5 events: Deploy 1.4.0 at Oct 6, 2026, 10:00 AM. Deploy 1.4.1 at Oct 7, 2026, 3:00 PM.',
      ),
    );
    await userEvent.click(screen.getByRole('button', { name: 'View as table' }));
    const table = screen.getByRole(isPhone ? 'list' : 'table', { name: 'Latency' });
    expect(within(table).getByText('Config change')).toBeInTheDocument();
    if (!isPhone) {
      expect(within(table).getByRole('columnheader', { name: /Events/ })).toBeInTheDocument();
    }
  });

  it('takes the app’s strings from UIProvider', async () => {
    render(
      <UIProvider
        messages={{
          chartEventCluster: ({ count }: { count: number }) => `${String(count)} releases`,
        }}
      >
        <Chart />
      </UIProvider>,
    );
    await expect.poll(() => markers().length).toBe(4);
    expect(markers()[2]).toHaveAccessibleName('2 releases');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Chart />);
    await expect.poll(() => markers().length).toBe(4);
    await expectNoAxeViolations(container);
  });
});
