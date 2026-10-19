// The map's parity with charts and tables (§20): loading, error and empty states over a map that stays mounted,
// filling its container, and cooperative gestures so a page's scrolling is never captured (RESP-16).
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { offlineStyle } from '../../test/maplibre';
import { expectNoAxeViolations } from '../../test/axe';
import { MapView } from './MapView';

const markers = [{ id: 'denver', label: 'Denver', position: [-104.99, 39.74] as const }];
const ready = () => screen.findByRole('button', { name: 'Zoom in' }, { timeout: 10_000 });

describe('Map: states and sizing (§20)', () => {
  it('shows loading over the map, then the markers, without remounting the map', async () => {
    const { rerender } = render(
      <MapView aria-label="Sites" styleUrl={offlineStyle} markers={[]} isLoading />,
    );
    const region = screen.getByRole('region', { name: 'Sites' });
    expect(region).toHaveAttribute('aria-busy', 'true');
    await ready();
    expect(region).toHaveAttribute('aria-busy', 'true');
    const canvas = region.querySelector('canvas');
    rerender(<MapView aria-label="Sites" styleUrl={offlineStyle} markers={markers} />);
    expect(await within(region).findByRole('button', { name: 'Denver' })).toBeTruthy();
    expect(region).not.toHaveAttribute('aria-busy');
    expect(region.querySelector('canvas')).toBe(canvas);
  });

  it('shows a load error with Retry, and an empty state when there’s nothing to show', async () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <MapView
        aria-label="Sites"
        styleUrl={offlineStyle}
        markers={[]}
        error="HTTP 503"
        onRetry={onRetry}
      />,
    );
    await ready();
    expect(screen.getByText('HTTP 503')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    rerender(
      <MapView
        aria-label="Sites"
        styleUrl={offlineStyle}
        markers={[]}
        emptyState={<p className="p-3">No sites yet</p>}
      />,
    );
    expect(await screen.findByText('No sites yet')).toBeTruthy();
    await expectNoAxeViolations(screen.getByRole('region', { name: 'Sites' }));
  });

  it('fills its container with `100%`, and takes gestures cooperatively when asked (RESP-16)', async () => {
    render(
      <div className="flex h-[320px] flex-col">
        <MapView
          aria-label="Sites"
          styleUrl={offlineStyle}
          markers={markers}
          height="100%"
          hasCooperativeGestures
        />
      </div>,
    );
    await ready();
    const region = screen.getByRole('region', { name: 'Sites' });
    expect(region.getBoundingClientRect().height).toBeLessThanOrEqual(320);
    const map = region.querySelector('.maplibregl-map');
    expect(map?.getBoundingClientRect().height).toBeGreaterThan(160);
    // MapLibre's cooperative mode: its hint screen, in the app's words.
    expect(region.querySelector('.maplibregl-cooperative-gesture-screen')?.textContent).toMatch(
      /two fingers/,
    );
  });
});
