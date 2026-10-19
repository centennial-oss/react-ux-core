import { render, screen, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { storageBySite } from '../../test/plotCharts';
import { UIProvider } from '../provider/UIProvider';
import { Treemap } from './Treemap';

const isDesktop = window.innerWidth >= 1024;
const isTouch = navigator.maxTouchPoints > 0;

function Storage(props: Partial<ComponentProps<typeof Treemap>>) {
  return (
    <Treemap
      title="Storage"
      data={storageBySite}
      unit="TB"
      formatColorValue={(value) => `${value > 0 ? '+' : ''}${String(value)}%`}
      {...props}
    />
  );
}

function topLevel(): HTMLElement[] {
  return screen.getAllByRole('treeitem').filter((item) => item.getAttribute('aria-level') === '1');
}

function header(id: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(`[data-node-header="${id}"]`);
  if (!found) {
    throw new Error(`No header for ${id}`);
  }
  return found;
}

describe('Treemap', () => {
  it('is a tree named by its title, each rectangle named with its value and share', async () => {
    render(<Storage />);
    const tree = screen.getByRole('tree', { name: 'Storage' });
    await expect.poll(() => topLevel().length).toBe(3);
    expect(topLevel().map((item) => item.getAttribute('aria-label'))).toEqual([
      'Mauna Kea, 2,268 TB, 52.3%',
      'Atacama, 1,299 TB, 30%',
      'La Palma, 766 TB, 17.7%',
    ]);
    expect(tree).toHaveAccessibleDescription(
      'All sites: 40 items, 4,333 TB in all. Largest: Mauna Kea, 2,268 TB (52.3%).',
    );
    // Instruments inside a site are named with their change, in a group the site owns.
    const site = topLevel()[0];
    expect(site).toHaveAttribute('aria-expanded', 'true');
    const group = document.getElementById(site?.getAttribute('aria-owns') ?? '');
    expect(group).toHaveAttribute('role', 'group');
    const first = group ? within(group).getAllByRole('treeitem')[0] : undefined;
    expect(first).toHaveAttribute('aria-level', '2');
    expect(first).toHaveAccessibleName(/^[A-Za-z -]+, \d+ TB, [\d.]+%, [+-]?\d+%$/);
  });

  it.skipIf(!isDesktop)(
    'moves with the arrow keys, drills in with Enter and back with Backspace',
    async () => {
      render(<Storage />);
      await expect.poll(() => topLevel().length).toBe(3);
      for (
        let press = 0;
        press < 6 && document.activeElement?.getAttribute('role') !== 'treeitem';
        press++
      ) {
        await userEvent.keyboard('{Tab}');
      }
      const mauna = topLevel()[0];
      expect(mauna).toHaveFocus();
      await userEvent.keyboard('{ArrowRight}');
      expect(document.activeElement?.getAttribute('aria-level')).toBe('2');
      await userEvent.keyboard('{ArrowLeft}');
      expect(topLevel()[0]).toHaveFocus();
      await userEvent.keyboard('{End}');
      expect(document.activeElement?.getAttribute('aria-level')).toBe('2');
      await userEvent.keyboard('{Home}');
      expect(topLevel()[0]).toHaveFocus();
      await userEvent.keyboard('{Enter}');
      await expect.poll(() => topLevel().length).toBe(15);
      expect(screen.getByRole('list', { name: 'Levels' })).toBeInTheDocument();
      expect(document.activeElement?.getAttribute('aria-label')).toMatch(/^Spectrograph/);
      await userEvent.keyboard('{Backspace}');
      await expect.poll(() => topLevel().length).toBe(3);
      expect(topLevel()[0]).toHaveFocus();
      expect(screen.queryByRole('list', { name: 'Levels' })).toBeNull();
    },
  );

  it('drills into a site when it’s pressed, and back with the breadcrumbs', async () => {
    const onNodePress = vi.fn();
    render(<Storage onNodePress={onNodePress} />);
    await expect.poll(() => topLevel().length).toBe(3);
    await userEvent.click(header('atacama'));
    expect(onNodePress).toHaveBeenCalledWith('atacama');
    await expect.poll(() => topLevel().length).toBe(13);
    const levels = screen.getByRole('list', { name: 'Levels' });
    expect(within(levels).getByText('Atacama')).toHaveAttribute('aria-current', 'location');
    await userEvent.click(within(levels).getByRole('button', { name: 'All sites' }));
    await expect.poll(() => topLevel().length).toBe(3);
  });

  it.skipIf(!isTouch)('drills in with a tap', async () => {
    render(<Storage />);
    await expect.poll(() => topLevel().length).toBe(3);
    await commands.tap('[data-node-header="la-palma"]');
    await expect.poll(() => topLevel().length).toBe(12);
  });

  it('reports a press on a leaf without drilling', async () => {
    const onNodePress = vi.fn();
    render(<Storage onNodePress={onNodePress} defaultPath={['la-palma']} />);
    await expect.poll(() => topLevel().length).toBe(12);
    const leaf = topLevel()[0];
    if (!leaf) {
      throw new Error('No leaf');
    }
    await userEvent.click(leaf);
    expect(onNodePress).toHaveBeenCalledWith(leaf.dataset.node);
    expect(topLevel()).toHaveLength(12);
  });

  it('doesn’t drill when isDrillable is false', async () => {
    render(<Storage isDrillable={false} />);
    await expect.poll(() => topLevel().length).toBe(3);
    await userEvent.click(header('atacama'));
    expect(topLevel()).toHaveLength(3);
  });

  it('shows the whole hierarchy as a nested list in the table view', async () => {
    render(<Storage />);
    await userEvent.click(screen.getByRole('button', { name: 'View as table' }));
    const region = screen.getByRole('region', { name: 'Storage' });
    expect(within(region).getAllByRole('listitem')).toHaveLength(43);
    expect(within(region).getByText('Mauna Kea')).toBeInTheDocument();
  });

  it('takes the app’s strings from UIProvider', async () => {
    render(
      <UIProvider
        messages={{
          treemapNode: ({ label }: { label: string }) => `Site ${label}`,
        }}
      >
        <Storage />
      </UIProvider>,
    );
    await expect.poll(() => topLevel().length).toBe(3);
    expect(topLevel()[0]).toHaveAccessibleName(/^Site Mauna Kea/);
  });

  it('fits a phone without scrolling sideways', async () => {
    render(
      <div className="p-4">
        <Storage />
      </div>,
    );
    await expect.poll(() => topLevel().length).toBe(3);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });

  it('has no accessibility violations, at the top and drilled in', async () => {
    const { container, unmount } = render(<Storage />);
    await expect.poll(() => topLevel().length).toBe(3);
    await expectNoAxeViolations(container);
    unmount();
    const drilled = render(<Storage defaultPath={['mauna-kea']} />);
    await expect.poll(() => topLevel().length).toBe(15);
    await expectNoAxeViolations(drilled.container);
  });
});
