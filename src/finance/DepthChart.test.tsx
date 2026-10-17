import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { cometBook, starBook } from '../../test/finance';
import { expectNoAxeViolations } from '../../test/axe';
import type { Messages } from '../provider/messages';
import { UIProvider } from '../provider/UIProvider';
import { DepthChart, niceTicks } from './DepthChart';
import type { FinanceMessages } from './messages';

describe('niceTicks', () => {
  it('picks round steps', () => {
    expect(niceTicks(0, 10, 5)).toEqual({ ticks: [0, 2, 4, 6, 8, 10], digits: 0 });
    expect(niceTicks(100.25, 101.2, 4)).toEqual({ ticks: [100.5, 101], digits: 1 });
    expect(niceTicks(100.25, 101.2, 8)).toEqual({
      ticks: [100.4, 100.6, 100.8, 101, 101.2],
      digits: 1,
    });
    expect(niceTicks(5, 5, 3)).toEqual({ ticks: [5], digits: 0 });
  });
});

describe('DepthChart', () => {
  it('draws a step area per side, named by its title and described by a summary', async () => {
    const { bids, asks } = starBook(4);
    const { container } = render(<DepthChart title="STAR/USD depth" bids={bids} asks={asks} />);
    const plot = screen.getByRole('img', { name: 'STAR/USD depth' });
    expect(plot).toHaveAccessibleDescription(/Bids: 4 levels from 101\.20 to 101\.05/);
    expect(plot).toHaveAccessibleDescription(/Mid 101\.225\./);
    await expect.poll(() => plot.querySelectorAll('svg path').length).toBe(4);
    expect(container.querySelector('[data-side="bid"]')?.textContent).toBe('Bids');
    expect(container.querySelector('[data-side="ask"]')?.textContent).toBe('Asks');
    expect(container.querySelector('[data-mid]')?.textContent).toBe('Mid 101.225');
  });

  it('switches to a table of cumulative sizes', async () => {
    render(
      <DepthChart
        title="Depth"
        bids={[
          { price: '10.00', size: '1.5' },
          { price: '9.90', size: '3' },
        ]}
        asks={[{ price: '10.10', size: '2' }]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'View as table' }));
    const table = screen.getByRole('table', { name: 'Depth' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((row) => row.textContent)).toEqual([
      'Bid10.001.51.5',
      'Bid9.903.04.5',
      'Ask10.102.02.0',
    ]);
    expect(screen.getByRole('button', { name: 'View as table' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('shows probabilities as percentages', () => {
    const { bids, asks } = cometBook(3);
    render(<DepthChart title="Comet" bids={bids} asks={asks} priceFormat="probability" />);
    expect(screen.getByRole('img', { name: 'Comet' })).toHaveAccessibleDescription(
      /Asks: 3 levels from 62% to 64%/,
    );
  });

  it('shows loading, empty and error states', async () => {
    const onRetry = vi.fn();
    const { rerender } = render(<DepthChart title="Depth" bids={[]} asks={[]} />);
    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
    rerender(
      <DepthChart title="Depth" bids={[]} asks={[]} error="Feed offline" onRetry={onRetry} />,
    );
    expect(screen.getByText('Feed offline')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalled();
    rerender(<DepthChart title="Depth" bids={[]} asks={[]} isLoading />);
    expect(screen.queryByText('No data')).toBeNull();
  });

  it('takes the app’s strings from UIProvider', () => {
    const { bids, asks } = starBook(2);
    render(
      <UIProvider
        messages={
          {
            depthChartViewAsTable: 'Tableau',
            depthChartMid: ({ price }) => `Milieu ${price}`,
          } satisfies Partial<FinanceMessages> as Partial<Messages>
        }
      >
        <DepthChart title="Profondeur" bids={bids} asks={asks} />
      </UIProvider>,
    );
    expect(screen.getByRole('button', { name: 'Tableau' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Profondeur' })).toHaveAccessibleDescription(
      /Milieu 101\.225\./,
    );
  });

  it('has no accessibility violations, as a chart and as a table', async () => {
    const { bids, asks } = starBook(10);
    const { container } = render(<DepthChart title="STAR/USD depth" bids={bids} asks={asks} />);
    await expectNoAxeViolations(container);
    await userEvent.click(screen.getByRole('button', { name: 'View as table' }));
    await expectNoAxeViolations(container);
  });
});
