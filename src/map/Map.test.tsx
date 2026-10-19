import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { offlineStyle } from '../../test/maplibre';
import { expectNoAxeViolations } from '../../test/axe';
import { MapView } from './MapView';
import type { MapMarker } from './types';

const markers: MapMarker[] = [
  { id: 'denver', label: 'Denver', position: [-104.99, 39.74], tone: 'warning' },
  { id: 'boulder', label: 'Boulder', position: [-105.27, 40.01] },
  { id: 'pueblo', label: 'Pueblo', position: [-104.61, 38.25], tone: 'danger' },
];

describe('Map', () => {
  it('lists every marker, and selecting one in the list selects it', async () => {
    const onSelectionChange = vi.fn();
    render(
      <MapView
        aria-label="Sites"
        styleUrl={offlineStyle}
        markers={markers}
        onSelectionChange={onSelectionChange}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Places (3)' }));
    const list = screen.getByRole('listbox', { name: 'Sites' });
    await userEvent.click(within(list).getByRole('option', { name: 'Boulder' }));
    expect(onSelectionChange).toHaveBeenLastCalledWith('boulder');
  });

  it('shows markers as buttons and the selected one’s card', async () => {
    render(
      <MapView
        aria-label="Sites"
        styleUrl={offlineStyle}
        markers={markers}
        hasClustering={false}
        defaultSelectedId="pueblo"
        renderPopup={(marker) => <p>{`Card for ${marker.label}`}</p>}
      />,
    );
    expect(
      await screen.findByRole('button', { name: 'Zoom in' }, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: 'Denver', pressed: false }),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Pueblo' })).toHaveTextContent('Card for Pueblo');
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog', { name: 'Pueblo' })).toBeNull();
  });

  it('says when the map can’t load and opens the list', async () => {
    render(<MapView aria-label="Sites" styleUrl="/no-such-style.json" markers={markers} />);
    expect(await screen.findByText('Map unavailable', {}, { timeout: 10_000 })).toBeInTheDocument();
    expect(screen.getByRole('listbox', { name: 'Sites' })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <MapView aria-label="Sites" styleUrl="/no-such-style.json" markers={markers} />,
    );
    await screen.findByText('Map unavailable', {}, { timeout: 10_000 });
    await expectNoAxeViolations(container);
  });
});
