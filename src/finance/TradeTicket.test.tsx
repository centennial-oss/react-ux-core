import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { cometYesEstimate } from '../../test/finance';
import { expectNoAxeViolations } from '../../test/axe';
import type { Messages } from '../provider/messages';
import { UIProvider } from '../provider/UIProvider';
import type { FinanceMessages } from './messages';
import { TradeTicket, type TradeTicketProps } from './TradeTicket';

const hasTouch = navigator.maxTouchPoints > 0;

const cometQuote = { bid: '0.61', ask: '0.62', last: '0.62' };
const starQuote = { bid: '101.20', ask: '101.25', last: '101.25' };

function row(id: string): string {
  return document.querySelector(`[data-row="${id}"] dd`)?.textContent ?? '';
}

function cometTicket(props: Partial<TradeTicketProps> = {}) {
  return (
    <TradeTicket
      kind="binary"
      quote={cometQuote}
      currency="USD"
      defaultDraft={{ amount: '50.00' }}
      estimate={cometYesEstimate}
      onSubmit={() => Promise.resolve()}
      {...props}
    />
  );
}

describe('TradeTicket', () => {
  it('shows cost, payout and return for $50 of YES at 0.62', () => {
    render(cometTicket({ balance: '1250.00' }));
    expect(screen.getByRole('radio', { name: 'Yes $0.62' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'No $0.39' })).not.toBeChecked();
    expect(screen.getByRole('textbox', { name: 'Amount' })).toHaveValue('50.00');
    const estimate = screen.getByRole('group', { name: 'Estimate' });
    expect(estimate).toBeVisible();
    expect(row('averagePrice')).toBe('$0.62');
    expect(row('quantity')).toBe('80.64');
    expect(row('cost')).toBe('$50.00');
    expect(row('fees')).toBe('$0.00');
    expect(row('payout')).toBe('$80.64');
    expect(row('return')).toBe('+61.28%');
    expect(row('balance')).toBe('$1,250.00');
  });

  it('chooses the side and order type with radio groups', async () => {
    const onSideChange = vi.fn();
    const onOrderTypeChange = vi.fn();
    render(cometTicket({ onSideChange, onOrderTypeChange }));
    expect(screen.getByRole('radiogroup', { name: 'Side' })).toBeInTheDocument();
    await userEvent.click(screen.getByText('No $0.39'));
    expect(onSideChange).toHaveBeenLastCalledWith('no');
    await userEvent.click(screen.getByText('Limit'));
    expect(onOrderTypeChange).toHaveBeenLastCalledWith('limit');
    expect(screen.getByRole('textbox', { name: 'Limit price' })).toBeInTheDocument();
  });

  it.runIf(hasTouch)('takes taps on the side', async () => {
    const onSideChange = vi.fn();
    render(cometTicket({ onSideChange }));
    await commands.tap('label:has(input[value="no"])');
    expect(onSideChange).toHaveBeenLastCalledWith('no');
  });

  it.skipIf(hasTouch)('places a limit order by keyboard alone', async () => {
    const onDraftChange = vi.fn();
    const onSubmit = vi.fn(() => Promise.resolve());
    render(
      <TradeTicket
        kind="exchange"
        quote={starQuote}
        currency="USD"
        quantityUnit="STAR"
        onDraftChange={onDraftChange}
        onSubmit={onSubmit}
      />,
    );
    await userEvent.tab();
    expect(screen.getByRole('radio', { name: 'Buy' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Sell' })).toBeChecked();
    await userEvent.tab();
    expect(screen.getByRole('radio', { name: 'Market' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Limit' })).toBeChecked();
    await userEvent.tab();
    expect(screen.getByRole('textbox', { name: 'Limit price' })).toHaveFocus();
    await userEvent.keyboard('101.3');
    await userEvent.tab();
    expect(screen.getByRole('textbox', { name: 'Amount' })).toHaveFocus();
    await userEvent.keyboard('500');
    await userEvent.tab();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Review order' })).toHaveFocus();
    expect(onDraftChange).toHaveBeenLastCalledWith({ price: '101.30', amount: '500.00' });
    await userEvent.keyboard('{Enter}');
    const dialog = await screen.findByRole('dialog', { name: 'Confirm your order' });
    expect(dialog.textContent).toEqual(expect.stringContaining('Sell'));
    expect(dialog.textContent).toEqual(expect.stringContaining('$101.30'));
    expect(dialog.textContent).toEqual(expect.stringContaining('$500.00'));
    const place = within(dialog).getByRole('button', { name: 'Place order' });
    for (let step = 0; step < 5 && document.activeElement !== place; step += 1) {
      await userEvent.tab();
    }
    expect(place).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onSubmit).toHaveBeenCalledTimes(1);
    await expect.poll(() => screen.queryByRole('dialog')).toBeNull();
  });

  it('asks for missing fields instead of opening the confirmation', async () => {
    render(
      <TradeTicket
        kind="exchange"
        quote={starQuote}
        currency="USD"
        defaultOrderType="limit"
        onSubmit={() => Promise.resolve()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Review order' }));
    expect(screen.getByText('Enter a limit price')).toBeInTheDocument();
    expect(screen.getByText('Enter an amount')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Limit price' })).toHaveFocus();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('confirms orders at or over the threshold in an alertdialog', async () => {
    const { rerender } = render(cometTicket({ confirmThreshold: '50.00' }));
    await userEvent.click(screen.getByRole('button', { name: 'Review order' }));
    const alert = await screen.findByRole('alertdialog', { name: 'Confirm your order' });
    expect(alert.textContent).toEqual(expect.stringContaining('This order is $50.00 or more.'));
    expect(alert.textContent).toEqual(expect.stringContaining('$80.64'));
    await userEvent.click(within(alert).getByRole('button', { name: 'Cancel' }));
    await expect.poll(() => screen.queryByRole('alertdialog')).toBeNull();
    rerender(cometTicket({ confirmThreshold: '1000' }));
    await userEvent.click(screen.getByRole('button', { name: 'Review order' }));
    const dialog = await screen.findByRole('dialog', { name: 'Confirm your order' });
    expect(dialog.textContent).not.toEqual(expect.stringContaining('or more'));
  });

  it('shows a pending state and keeps the confirmation open with the error when the order fails', async () => {
    let reject: (reason: Error) => void = vi.fn();
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((_resolve, fail) => {
          reject = fail;
        }),
    );
    render(cometTicket({ onSubmit }));
    await userEvent.click(screen.getByRole('button', { name: 'Review order' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Place order' }));
    await expect.poll(() => dialog.getAttribute('aria-busy')).toBe('true');
    reject(new Error('The market is closed.'));
    expect(await within(dialog).findByText('The market is closed.')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(dialog).not.toHaveAttribute('aria-busy');
  });

  it('announces estimate changes once they settle', async () => {
    const { rerender } = render(cometTicket());
    const status = screen
      .getAllByRole('status')
      .find((element) => element.classList.contains('sr-only'));
    expect(status?.textContent).toBe('');
    rerender(
      cometTicket({
        estimate: {
          ...cometYesEstimate,
          quantity: '161.29',
          cost: '100.00',
          payout: '161.29',
        },
      }),
    );
    await expect
      .poll(() => status?.textContent, { timeout: 3000 })
      .toBe('Estimate: 161.29 for $100.00. Pays $161.29 if right, a +61.28% return.');
  });

  it('shows the app’s warnings in a banner', () => {
    render(cometTicket({ warnings: ['Slippage over 1%', 'Balance too low'] }));
    const alert = screen.getByRole('alert');
    expect(within(alert).getAllByRole('listitem')).toHaveLength(2);
  });

  it('switches to entering a quantity, reported as a decimal string', async () => {
    const onDraftChange = vi.fn();
    render(
      <TradeTicket
        kind="exchange"
        quote={starQuote}
        currency="USD"
        quantityUnit="STAR"
        quantityDecimals={3}
        onDraftChange={onDraftChange}
        onSubmit={() => Promise.resolve()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Enter a quantity instead' }));
    const quantity = screen.getByRole('textbox', { name: 'Quantity' });
    await userEvent.type(quantity, '2.5');
    await userEvent.keyboard('{Enter}');
    expect(onDraftChange).toHaveBeenLastCalledWith({ price: undefined, quantity: '2.500' });
    expect(screen.getByRole('button', { name: 'Enter an amount instead' })).toBeInTheDocument();
  });

  it('fills the limit price from outside (an order book press)', () => {
    function Filled() {
      const [draft] = useState({ price: '101.15', amount: '200.00' });
      return (
        <TradeTicket
          kind="exchange"
          quote={starQuote}
          currency="USD"
          orderType="limit"
          draft={draft}
          onSubmit={() => Promise.resolve()}
        />
      );
    }
    render(<Filled />);
    expect(screen.getByRole('textbox', { name: 'Limit price' })).toHaveValue('101.15');
  });

  it('takes the app’s strings from UIProvider', () => {
    render(
      <UIProvider
        messages={
          {
            tradeReview: 'Vérifier',
            tradePayout: 'Gain si juste',
          } satisfies Partial<FinanceMessages> as Partial<Messages>
        }
      >
        {cometTicket()}
      </UIProvider>,
    );
    expect(screen.getByRole('button', { name: 'Vérifier' })).toBeInTheDocument();
    expect(screen.getByText('Gain si juste')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      cometTicket({ balance: '1250.00', warnings: ['Slippage over 1%'] }),
    );
    await expectNoAxeViolations(container);
    await userEvent.click(screen.getByRole('button', { name: 'Review order' }));
    await screen.findByRole('dialog');
    await expectNoAxeViolations(document.body);
  });
});
