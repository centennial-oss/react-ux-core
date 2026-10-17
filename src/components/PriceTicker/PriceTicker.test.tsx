import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import type { Messages } from '../../provider/messages';
import { UIProvider } from '../../provider/UIProvider';
import type { PriceTickerMessages } from './messages';
import { PriceTicker } from './PriceTicker';
import { TickerTape } from './TickerTape';

const hasTouch = navigator.maxTouchPoints > 0;

/** Makes `prefers-reduced-motion: reduce` match for the rest of the test. */
function emulateReducedMotion() {
  const original = window.matchMedia.bind(window);
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) =>
    query.includes('prefers-reduced-motion')
      ? ({
          matches: true,
          media: query,
          onchange: null,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          addListener: () => undefined,
          removeListener: () => undefined,
          dispatchEvent: () => false,
        } satisfies MediaQueryList)
      : original(query),
  );
}

function flashAnimations(container: HTMLElement, direction: 'up' | 'down') {
  return container.querySelector<HTMLElement>(`[data-flash="${direction}"]`)?.getAnimations() ?? [];
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PriceTicker', () => {
  it('shows the value and its change with an arrow, tone and words', () => {
    const { container } = render(<PriceTicker label="Viewers" value={12480} reference={12170} />);
    const group = screen.getByRole('group', { name: 'Viewers' });
    expect(group.textContent).toContain('12,480');
    const change = container.querySelector('[data-change]');
    expect(change).toHaveAttribute('data-change', 'up');
    expect(change).toHaveClass('text-success-fg');
    expect(change?.textContent).toContain('▲ 310 (2.55%)');
    expect(within(group).getByText('Up 310 (2.55%)')).toHaveClass('sr-only');
  });

  it('shows falls with ▼, and swaps the tones when up is bad', () => {
    const { container, rerender } = render(
      <PriceTicker label="Comet brightness (mag)" value={6.8} reference={7.4} />,
    );
    const change = () => container.querySelector('[data-change]');
    expect(change()?.textContent).toContain('▼ 0.6 (8.11%)');
    expect(change()).toHaveClass('text-danger-fg');
    rerender(<PriceTicker label="Comet brightness (mag)" value={6.8} reference={7.4} isUpBad />);
    expect(change()).toHaveClass('text-success-fg');
    expect(screen.getByText('Down 0.6 (8.11%)')).toBeInTheDocument();
  });

  it('formats currencies, and shows text that isn’t a number as it is', () => {
    const { rerender } = render(
      <PriceTicker label="Telescope hour" value={1840} reference={1795.5} currency="EUR" />,
    );
    expect(screen.getByRole('group').textContent).toContain('€1,840.00');
    expect(screen.getByRole('group').textContent).toContain('€44.50');
    rerender(<PriceTicker label="Seeing" value="—" reference={1} />);
    expect(screen.getByRole('group').textContent).toContain('—');
    expect(screen.queryByText(/Up|Down/)).toBeNull();
  });

  it('flashes up or down when the value changes', () => {
    const { container, rerender } = render(<PriceTicker label="Viewers" value={100} />);
    expect(flashAnimations(container, 'up')).toHaveLength(0);
    rerender(<PriceTicker label="Viewers" value={101} />);
    expect(flashAnimations(container, 'up')).toHaveLength(1);
    expect(flashAnimations(container, 'down')).toHaveLength(0);
    rerender(<PriceTicker label="Viewers" value={99} />);
    expect(flashAnimations(container, 'down')).toHaveLength(1);
  });

  it('doesn’t flash when turned off or with reduced motion', () => {
    const { container, rerender } = render(
      <PriceTicker label="Viewers" value={100} hasFlash={false} />,
    );
    rerender(<PriceTicker label="Viewers" value={101} hasFlash={false} />);
    expect(flashAnimations(container, 'up')).toHaveLength(0);

    emulateReducedMotion();
    const reduced = render(<PriceTicker label="Sunspots" value={100} />);
    reduced.rerender(<PriceTicker label="Sunspots" value={120} />);
    expect(flashAnimations(reduced.container, 'up')).toHaveLength(0);
  });

  it('greys out a stale value and shows when it last updated', () => {
    const updatedAt = Date.UTC(2026, 2, 14, 9, 26, 53);
    render(
      <PriceTicker
        label="Kp index"
        value={4.33}
        updatedAt={updatedAt}
        staleAfterMs={30_000}
        timeZone="UTC"
      />,
    );
    const group = screen.getByRole('group', { name: 'Kp index' });
    expect(group).toHaveAttribute('data-stale', 'true');
    expect(group.textContent).toContain('Stale');
    expect(group.textContent).toContain('Last update 9:26:53');
    expect(group.querySelector('[data-value]')).toHaveClass('text-fg-muted');
  });

  it('turns stale when no update arrives in time, and fresh again on an update', async () => {
    const { rerender } = render(
      <PriceTicker label="Viewers" value={10} updatedAt={Date.now()} staleAfterMs={150} />,
    );
    const group = screen.getByRole('group');
    expect(group).not.toHaveAttribute('data-stale');
    await expect.poll(() => group.getAttribute('data-stale')).toBe('true');
    rerender(<PriceTicker label="Viewers" value={11} updatedAt={Date.now()} staleAfterMs={5000} />);
    expect(group).not.toHaveAttribute('data-stale');
  });

  it('isn’t live by default, and announces only moves past the threshold', () => {
    const { container, rerender } = render(<PriceTicker label="Viewers" value={100} />);
    expect(container.querySelector('[aria-live]')).toBeNull();

    rerender(<PriceTicker label="Viewers" value={100} reference={90} announceThreshold={5} />);
    const live = container.querySelector('[aria-live="polite"]');
    expect(live?.textContent).toBe('');
    rerender(<PriceTicker label="Viewers" value={103} reference={90} announceThreshold={5} />);
    expect(live?.textContent).toBe('');
    rerender(<PriceTicker label="Viewers" value={106} reference={90} announceThreshold={5} />);
    expect(live?.textContent).toBe('Viewers 106, Up 16 (17.78%)');
  });

  it('keeps 30 updating tickers still: tabular figures, no layout shift', () => {
    const tickers = (step: number) => (
      <div className="grid w-[960px] grid-cols-6 gap-2">
        {Array.from({ length: 30 }, (_, index) => (
          <PriceTicker
            key={index}
            size="sm"
            label={`Reading ${String(index + 1)}`}
            value={100 + index + ((step * 37 + index * 11) % 9) / 10}
            reference={100 + index}
            format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
          />
        ))}
      </div>
    );
    const { container, rerender } = render(tickers(0));
    const rects = () =>
      Array.from(container.querySelectorAll('[data-value]'), (element) => {
        const { left, top, width, height } = element.getBoundingClientRect();
        return [left, top, width, height];
      });
    const before = rects();
    for (let step = 1; step <= 5; step += 1) {
      rerender(tickers(step));
      expect(rects()).toEqual(before);
    }
  });

  it('takes the app’s strings from UIProvider', () => {
    const overrides: Partial<PriceTickerMessages> = { priceTickerStale: 'Veraltet' };
    // Until PriceTickerMessages joins the Messages union, the overrides need widening.
    render(
      <UIProvider
        messages={{ ...(overrides as unknown as Partial<Messages>), deltaUp: () => 'Hoch' }}
      >
        <PriceTicker label="Viewers" value={12} reference={10} updatedAt={0} staleAfterMs={1000} />
      </UIProvider>,
    );
    expect(screen.getByText('Veraltet')).toBeVisible();
    expect(screen.getByText('Hoch')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <div className="flex flex-col gap-2">
        <PriceTicker label="Viewers" value={12480} reference={12170} sparkline={[1, 3, 2, 5]} />
        <PriceTicker label="Kp index" value={4.33} updatedAt={0} staleAfterMs={1} />
        <PriceTicker variant="inline" label="Solar wind" value={431} reference={498} />
      </div>,
    );
    await expectNoAxeViolations(container);
  });
});

const tape = (
  <div className="w-[300px] p-2">
    <TickerTape label="Space weather" speed={60}>
      <PriceTicker variant="inline" label="Viewers" value={12480} reference={12170} />
      <PriceTicker variant="inline" label="Solar wind (km/s)" value={431.2} reference={498.1} />
      <PriceTicker variant="inline" label="Sunspot number" value={142} reference={138} />
    </TickerTape>
  </div>
);

function trackAnimation() {
  const list = screen.getByRole('list');
  return list.parentElement?.getAnimations()[0];
}

describe('TickerTape', () => {
  it('scrolls a row wider than its container over a hidden second copy', async () => {
    const { container } = render(tape);
    const group = screen.getByRole('group', { name: 'Space weather' });
    await expect.poll(() => group.getAttribute('data-moving')).toBe('true');
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(3);
    const copy = container.querySelector('ul[aria-hidden="true"]');
    expect(copy).toHaveAttribute('inert');
    expect(copy?.querySelectorAll('li')).toHaveLength(3);
    expect(trackAnimation()?.playState).toBe('running');
    // The page itself never scrolls sideways.
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });

  it.skipIf(hasTouch)('pauses while hovered', async () => {
    render(tape);
    await expect.poll(() => trackAnimation()?.playState).toBe('running');
    // The tape's frame, not the moving list, which Playwright won't hover until it stops.
    const group = screen.getByRole('group', { name: 'Space weather' });
    await userEvent.hover(group);
    await expect.poll(() => trackAnimation()?.playState).toBe('paused');
    await userEvent.unhover(group);
    await expect.poll(() => trackAnimation()?.playState).toBe('running');
  });

  it.skipIf(hasTouch)('pauses while focused, and the toggle stops it', async () => {
    render(tape);
    const toggle = await screen.findByRole('button', { name: 'Pause scrolling' });
    await userEvent.tab();
    expect(toggle).toHaveFocus();
    await expect.poll(() => trackAnimation()?.playState).toBe('paused');
    await userEvent.keyboard(' ');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await userEvent.tab();
    // Still stopped after focus leaves, until the toggle is pressed again.
    expect(trackAnimation()?.playState).toBe('paused');
  });

  it.runIf(hasTouch)('stops with a touch tap on the toggle', async () => {
    render(tape);
    const toggle = await screen.findByRole('button', { name: 'Pause scrolling' });
    await commands.tap('[aria-label="Pause scrolling"]');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => trackAnimation()?.playState).toBe('paused');
  });

  it('is a static wrapped list under reduced motion', () => {
    emulateReducedMotion();
    const { container } = render(tape);
    const group = screen.getByRole('group', { name: 'Space weather' });
    expect(group).not.toHaveAttribute('data-moving');
    expect(container.querySelector('ul[aria-hidden="true"]')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByRole('list')).toHaveClass('flex-wrap');
  });

  it('stays still when everything fits', async () => {
    render(
      <TickerTape label="Space weather">
        <PriceTicker variant="inline" label="Viewers" value={12} />
      </TickerTape>,
    );
    await expect
      .poll(() => screen.getByRole('list').getBoundingClientRect().width)
      .toBeGreaterThan(0);
    expect(screen.getByRole('group', { name: 'Space weather' })).not.toHaveAttribute('data-moving');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(tape);
    await screen.findByRole('button', { name: 'Pause scrolling' });
    await expectNoAxeViolations(container);
  });
});
