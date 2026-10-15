import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { UIProvider } from '../../provider/UIProvider';
import { formatRelativeTime, RelativeTime } from './RelativeTime';

const NOW = Date.UTC(2026, 9, 14, 15, 30, 0);

describe('formatRelativeTime', () => {
  it.each([
    [NOW - 10_000, 'now'],
    [NOW - 5 * 60_000, '5 minutes ago'],
    [NOW - 3 * 3_600_000, '3 hours ago'],
    [NOW - 24 * 3_600_000, 'yesterday'],
    [NOW + 2 * 86_400_000, 'in 2 days'],
    [NOW - 90 * 86_400_000, '3 months ago'],
  ])('formats %s as "%s"', (value, expected) => {
    expect(formatRelativeTime(new Date(value), NOW, 'en-US')).toBe(expected);
  });

  it('formats for the locale', () => {
    expect(formatRelativeTime(new Date(NOW - 5 * 60_000), NOW, 'de-DE')).toBe('vor 5 Minuten');
  });
});

describe('RelativeTime', () => {
  it('renders a time element with the exact timestamp in the given time zone for screen readers', () => {
    render(
      <UIProvider locale="en-US">
        <RelativeTime value={NOW - 5 * 60_000} timeZone="America/Denver" />
      </UIProvider>,
    );
    const time = document.querySelector('time');
    expect(time).toHaveAttribute('datetime', new Date(NOW - 5 * 60_000).toISOString());
    expect(time?.querySelector('.sr-only')?.textContent).toMatch(/\(Oct 14, 2026, 9:25 AM MDT\)$/);
  });

  it('stays current from the shared clock', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date', 'performance'], now: NOW });
    try {
      render(
        <UIProvider locale="en-US">
          <RelativeTime value={NOW} />
        </UIProvider>,
      );
      expect(document.querySelector('time [aria-hidden]')?.textContent).toBe('now');
      act(() => {
        vi.advanceTimersByTime(2 * 60_000);
      });
      expect(document.querySelector('time [aria-hidden]')?.textContent).toBe('2 minutes ago');
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows the exact timestamp in a tooltip on keyboard focus', async () => {
    render(
      <UIProvider locale="en-US" timeZone="UTC">
        <RelativeTime value={NOW} />
      </UIProvider>,
    );
    await userEvent.keyboard('{Tab}');
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip.textContent).toContain('Oct 14, 2026');
    expect(tooltip.textContent).toContain('UTC');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<RelativeTime value={Date.now() - 60_000} />);
    await expectNoAxeViolations(container);
  });
});
