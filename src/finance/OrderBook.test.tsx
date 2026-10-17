import { act, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { cometBook, starBook, starBookWithOwnOrders } from '../../test/finance';
import { expectNoAxeViolations } from '../../test/axe';
import type { Messages } from '../provider/messages';
import { UIProvider } from '../provider/UIProvider';
import type { FinanceMessages } from './messages';
import { OrderBook } from './OrderBook';

const hasTouch = navigator.maxTouchPoints > 0;

function overrides(messages: Partial<FinanceMessages>): Partial<Messages> {
  return messages;
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });
}

/** Each row header's text as a screen reader gets it (without the aria-hidden copy of the price). */
function rowHeaders(): string[] {
  return screen.getAllByRole('rowheader').map((cell) => {
    const copy = cell.cloneNode(true) as HTMLElement;
    copy.querySelectorAll('[aria-hidden="true"]').forEach((node) => {
      node.remove();
    });
    return copy.textContent;
  });
}

describe('OrderBook', () => {
  it('is a table with headers: asks above, the spread, then bids', () => {
    const { bids, asks } = starBook(3);
    render(<OrderBook bids={bids} asks={asks} currency="USD" />);
    const table = screen.getByRole('table', { name: 'Order book' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Price (USD)', 'Size', 'Total']);
    // Asks run from the highest price down to the best ask beside the spread.
    expect(rowHeaders()).toEqual([
      'Ask 101.35',
      'Ask 101.30',
      'Ask 101.25',
      'Spread',
      'Bid 101.20',
      'Bid 101.15',
      'Bid 101.10',
    ]);
    const spread = screen.getByRole('rowheader', { name: 'Spread' }).closest('tr');
    expect(spread?.textContent).toEqual(expect.stringContaining('0.05 · Mid 101.225'));
  });

  it('shows cumulative totals and size bars', () => {
    render(
      <OrderBook
        bids={[
          { price: '10.00', size: '1.5' },
          { price: '9.90', size: '3' },
        ]}
        asks={[{ price: '10.10', size: '0.75' }]}
      />,
    );
    const bid = screen.getByRole('rowheader', { name: /Bid 9\.90/ }).closest('tr');
    const cells = within(bid as HTMLElement).getAllByRole('cell');
    expect(cells[0]?.textContent).toEqual(expect.stringContaining('3.00'));
    expect(cells[1]?.textContent).toBe('4.50');
    // The largest size has a full-width bar.
    expect(bid?.querySelector<HTMLElement>('[style]')?.style.width).toBe('100%');
  });

  it('limits each side to `depth` levels', () => {
    const { bids, asks } = starBook(20);
    render(<OrderBook bids={bids} asks={asks} depth={5} />);
    expect(screen.getAllByRole('rowheader', { name: /^Ask/ })).toHaveLength(5);
    expect(screen.getAllByRole('rowheader', { name: /^Bid/ })).toHaveLength(5);
  });

  it('groups prices with the grouping select', async () => {
    const onGroupingChange = vi.fn();
    const { bids, asks } = starBook(10);
    render(
      <OrderBook
        bids={bids}
        asks={asks}
        defaultGrouping="0.05"
        groupingOptions={['0.05', '0.1', '1']}
        onGroupingChange={onGroupingChange}
      />,
    );
    expect(screen.getAllByRole('rowheader', { name: /^Bid/ })).toHaveLength(10);
    const select = screen.getByRole('button', { name: /Grouping/ });
    if (hasTouch) {
      await userEvent.click(select);
    } else {
      select.focus();
      await userEvent.keyboard('{ArrowDown}');
    }
    await userEvent.click(await screen.findByRole('option', { name: '1' }));
    expect(onGroupingChange).toHaveBeenLastCalledWith('1');
    // Ten bids from 101.20 down to 100.75 fall into 101 and 100.
    await expect.poll(() => screen.getAllByRole('rowheader', { name: /^Bid/ }).length).toBe(2);
    expect(rowHeaders()).toContain('Bid 101');
  });

  it('reports a pressed level’s side and price, by pointer and keyboard', async () => {
    const onLevelPress = vi.fn();
    const { bids, asks } = starBook(3);
    render(<OrderBook bids={bids} asks={asks} onLevelPress={onLevelPress} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ask 101.30' }));
    expect(onLevelPress).toHaveBeenLastCalledWith('ask', '101.30');
    if (!hasTouch) {
      screen.getByRole('button', { name: 'Bid 101.15' }).focus();
      await userEvent.keyboard('{Enter}');
      expect(onLevelPress).toHaveBeenLastCalledWith('bid', '101.15');
    }
  });

  it.runIf(hasTouch)('takes a tap on a level', async () => {
    const onLevelPress = vi.fn();
    const { bids, asks } = starBook(3);
    render(<OrderBook bids={bids} asks={asks} onLevelPress={onLevelPress} />);
    await commands.tap('tbody:last-of-type tr:first-child button');
    expect(onLevelPress).toHaveBeenLastCalledWith('bid', '101.20');
  });

  it('batches a burst of updates into a frame and marks changed sizes', async () => {
    const first = starBook(20, 0);
    const { rerender } = render(<OrderBook bids={first.bids} asks={first.asks} depth={20} />);
    // 20 levels a side, many updates before the next frame: nothing throws and the last one wins.
    for (let version = 1; version <= 20; version += 1) {
      const book = starBook(20, version);
      rerender(<OrderBook bids={book.bids} asks={book.asks} depth={20} />);
    }
    const last = starBook(20, 20);
    await act(async () => {
      await nextFrame();
      await nextFrame();
    });
    const bestBid = screen.getByRole('rowheader', { name: /Bid 101\.20/ }).closest('tr');
    expect(within(bestBid as HTMLElement).getAllByRole('cell')[0]?.textContent).toEqual(
      expect.stringContaining(last.bids[0]?.size ?? '-'),
    );
    const changed = document.querySelectorAll('tr[data-changed]');
    expect(changed.length).toBeGreaterThan(0);
    // Changed sizes get ▲ or ▼ (and words for screen readers), not only a flash.
    expect(changed[0]?.textContent).toMatch(/[▲▼](up|down)/);
    // The marks go away after a moment.
    await expect
      .poll(() => document.querySelectorAll('tr[data-changed]').length, { timeout: 4000 })
      .toBe(0);
  });

  it('highlights levels with the user’s own orders', () => {
    const { bids, asks } = starBookWithOwnOrders(4);
    render(<OrderBook bids={bids} asks={asks} />);
    const own = screen.getAllByText('Your order');
    expect(own).toHaveLength(2);
    expect(own[0]?.closest('tr')?.dataset.side).toBe('ask');
  });

  it('reads the best prices on request', async () => {
    const { bids, asks } = starBook(3);
    render(<OrderBook bids={bids} asks={asks} />);
    const status = screen.getByRole('status');
    expect(status.textContent).toBe('');
    await userEvent.click(screen.getByRole('button', { name: 'Read best prices' }));
    await expect
      .poll(() => status.textContent)
      .toBe('Best bid 101.20, best ask 101.25, spread 0.05.');
  });

  it('shows 0–1 prices as percentages for prediction markets', () => {
    const { bids, asks } = cometBook(3);
    render(<OrderBook bids={bids} asks={asks} priceFormat="probability" />);
    expect(rowHeaders()).toContain('Bid 61%');
    expect(rowHeaders()).toContain('Ask 62%');
  });

  it('says when a side is empty', () => {
    render(<OrderBook bids={[]} asks={[{ price: '1.00', size: '1' }]} />);
    expect(screen.getByText('No bids')).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Spread' }).closest('tr')?.textContent).toEqual(
      expect.stringContaining('none'),
    );
  });

  it('takes the app’s strings from UIProvider', () => {
    const { bids, asks } = starBook(2);
    render(
      <UIProvider
        messages={overrides({
          orderBookLabel: 'Carnet',
          orderBookBidAt: ({ price }) => `Achat ${price}`,
          orderBookSpread: 'Écart',
        })}
      >
        <OrderBook bids={bids} asks={asks} />
      </UIProvider>,
    );
    expect(screen.getByRole('table', { name: 'Carnet' })).toBeInTheDocument();
    expect(rowHeaders()).toContain('Écart');
    expect(rowHeaders()).toContain('Achat 101.20');
  });

  it('has no accessibility violations', async () => {
    const { bids, asks } = starBookWithOwnOrders(6);
    const { container } = render(
      <OrderBook
        bids={bids}
        asks={asks}
        currency="USD"
        groupingOptions={['0.05', '0.1']}
        defaultGrouping="0.05"
        onLevelPress={vi.fn()}
      />,
    );
    await expectNoAxeViolations(container);
  });
});
