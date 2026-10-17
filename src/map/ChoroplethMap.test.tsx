import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { offlineStyle } from '../../test/maplibre';
import { expectNoAxeViolations } from '../../test/axe';
import { gridRegions, gridValues } from '../../test/regions';
import { UIProvider } from '../provider/UIProvider';
import type { ChoroplethLayer } from './choropleth';
import { MapView } from './MapView';

const isDesktop = window.innerWidth >= 1024;

const layer: ChoroplethLayer = {
  shapes: gridRegions,
  values: gridValues,
  scale: { steps: 5 },
  unit: 'req/s',
};

const sortedText = [
  'Lambda1,120 req/s',
  'Gamma1,060 req/s',
  'Theta952 req/s',
  'Nu844 req/s',
  'Epsilon784 req/s',
  'Beta616 req/s',
  'Omicron568 req/s',
  'Eta508 req/s',
  'Mu400 req/s',
  'Delta340 req/s',
  'Iota232 req/s',
  'Alpha172 req/s',
  'Xi124 req/s',
  'Zeta64 req/s',
  'KappaNo data',
];

async function openRegions() {
  const toggle = screen.getByRole('button', { name: 'Regions (15)' });
  if (toggle.getAttribute('aria-expanded') !== 'true') {
    await userEvent.click(toggle);
  }
  return screen.getByRole('listbox', { name: 'Traffic: regions by value' });
}

/** Waits for MapLibre to load the style and draw the regions. */
async function mapReady() {
  await screen.findByRole('button', { name: 'Zoom in' }, { timeout: 10_000 });
  const canvas = document.querySelector('canvas.maplibregl-canvas');
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('no canvas');
  }
  // Give MapLibre a few frames to fit the regions and render them.
  for (let frame = 0; frame < 10; frame += 1) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  return canvas;
}

describe('Map choropleth', () => {
  it('lists the regions sorted by value, with a summary naming the highest and lowest', async () => {
    render(<MapView aria-label="Traffic" styleUrl="/no-such-style.json" choropleth={layer} />);
    await screen.findByText('Map unavailable', {}, { timeout: 10_000 });
    const list = await openRegions();
    expect(
      within(list)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(sortedText);
    expect(within(list).getByRole('option', { name: 'Lambda 1,120 req/s' })).toBeInTheDocument();
    const summary = 'Highest: Lambda, 1,120 req/s. Lowest: Zeta, 64 req/s.';
    expect(screen.getByText(summary)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Traffic' })).toHaveAccessibleDescription(summary);
    // No markers: no markers list.
    expect(screen.queryByRole('button', { name: /^Places/ })).toBeNull();
  });

  it('shows a 5-step legend, and the list’s colours use those 5 steps', async () => {
    render(<MapView aria-label="Traffic" styleUrl="/no-such-style.json" choropleth={layer} />);
    await screen.findByText('Map unavailable', {}, { timeout: 10_000 });
    const legend = screen.getByRole('group', { name: 'Scale' });
    expect(legend.textContent).toEqual(expect.stringContaining('64 req/s'));
    expect(legend.textContent).toEqual(expect.stringContaining('1,120 req/s'));
    expect(legend.textContent).toEqual(expect.stringContaining('No data'));
    const steps = legend.querySelectorAll('[aria-hidden="true"] > span');
    expect(steps).toHaveLength(5);
    const stepColours = new Set(
      [...steps].map((step) => (step as HTMLElement).style.backgroundColor),
    );
    const list = await openRegions();
    const swatches = [...list.querySelectorAll<HTMLElement>('[role="option"] > [aria-hidden]')]
      .map((swatch) => swatch.style.backgroundColor)
      .filter((colour) => colour !== '');
    expect(swatches).toHaveLength(14);
    expect(new Set(swatches)).toEqual(stepColours);
  });

  it('calls onShapePress from the list', async () => {
    const onShapePress = vi.fn();
    render(
      <MapView
        aria-label="Traffic"
        styleUrl="/no-such-style.json"
        choropleth={{ ...layer, onShapePress }}
      />,
    );
    await screen.findByText('Map unavailable', {}, { timeout: 10_000 });
    const list = await openRegions();
    await userEvent.click(within(list).getByRole('option', { name: /^Gamma / }));
    expect(onShapePress).toHaveBeenLastCalledWith('gamma');
  });

  it('draws the regions under the markers; pressing one calls onShapePress and shows its tooltip', async () => {
    const onShapePress = vi.fn();
    render(
      <MapView
        aria-label="Traffic"
        styleUrl={offlineStyle}
        choropleth={{ ...layer, onShapePress }}
        markers={[{ id: 'station', label: 'Station', position: [-40, 20] }]}
      />,
    );
    const canvas = await mapReady();
    expect(screen.getByRole('button', { name: 'Station' })).toBeInTheDocument();
    // The middle of the map is Theta, the middle of the grid.
    await userEvent.click(canvas);
    await expect.poll(() => onShapePress.mock.lastCall).toEqual(['theta']);
    const tooltip = document.querySelector('[data-choropleth-tooltip]');
    expect(tooltip?.textContent).toBe('Theta952 req/s');
  });

  it.skipIf(!isDesktop)(
    'highlights the region focused in the list with its tooltip, and Enter presses it',
    async () => {
      const onShapePress = vi.fn();
      render(
        <MapView
          aria-label="Traffic"
          styleUrl={offlineStyle}
          choropleth={{ ...layer, onShapePress }}
        />,
      );
      await mapReady();
      const list = await openRegions();
      within(list).getAllByRole('option')[0]?.focus();
      await userEvent.keyboard('{ArrowDown}');
      expect(within(list).getByRole('option', { name: /^Gamma / })).toHaveFocus();
      await expect
        .poll(() => document.querySelector('[data-choropleth-tooltip]')?.textContent)
        .toBe('Gamma1,060 req/s');
      await userEvent.keyboard('{Enter}');
      expect(onShapePress).toHaveBeenLastCalledWith('gamma');
      await userEvent.tab();
      await expect.poll(() => document.querySelector('[data-choropleth-tooltip]')).toBeNull();
    },
  );

  it.skipIf(!isDesktop)('shows the hovered region’s name and value', async () => {
    render(<MapView aria-label="Traffic" styleUrl={offlineStyle} choropleth={layer} />);
    const canvas = await mapReady();
    await userEvent.hover(canvas);
    await expect
      .poll(() => document.querySelector('[data-choropleth-tooltip]')?.textContent)
      .toBe('Theta952 req/s');
  });

  it('takes its strings from UIProvider', async () => {
    render(
      <UIProvider
        messages={{
          choroplethRegionCount: ({ count }: { count: number }) => `Régions (${String(count)})`,
        }}
      >
        <MapView aria-label="Traffic" styleUrl="/no-such-style.json" choropleth={layer} />
      </UIProvider>,
    );
    expect(
      await screen.findByRole('button', { name: 'Régions (15)' }, { timeout: 10_000 }),
    ).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <MapView aria-label="Traffic" styleUrl="/no-such-style.json" choropleth={layer} />,
    );
    await screen.findByText('Map unavailable', {}, { timeout: 10_000 });
    await expectNoAxeViolations(container);
  });
});
