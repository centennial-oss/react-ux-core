import { render, screen } from '@testing-library/react';
import { WifiOff } from 'lucide-react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { UIProvider } from '../../provider/UIProvider';
import { ErrorState } from './ErrorState';

const hasTouch = navigator.maxTouchPoints > 0;

describe('ErrorState', () => {
  it('announces the message with a heading and description', () => {
    render(
      <ErrorState
        title="Couldn't load customers"
        description="Check your connection and try again."
        headingLevel={2}
      />,
    );
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain("Couldn't load customers");
    expect(alert.textContent).toContain('Check your connection and try again.');
    expect(screen.getByRole('heading', { level: 2, name: "Couldn't load customers" })).toBe(
      alert.querySelector('h2'),
    );
  });

  it('has no retry button or details without onRetry and details', () => {
    render(<ErrorState title="Something went wrong" />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
  });

  it('retries with the pointer and the keyboard', async () => {
    const onRetry = vi.fn();
    render(<ErrorState title="Couldn't load" onRetry={onRetry} />);
    const retry = screen.getByRole('button', { name: 'Retry' });
    await userEvent.keyboard('{Tab}');
    expect(retry).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onRetry).toHaveBeenCalledTimes(1);

    await userEvent.click(retry);
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it.runIf(hasTouch)('retries when tapped', async () => {
    const onRetry = vi.fn();
    render(<ErrorState title="Couldn't load" onRetry={onRetry} />);
    await commands.tap('button');
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows the retry as pending and blocks presses while retrying', async () => {
    const onRetry = vi.fn();
    render(<ErrorState title="Couldn't load" onRetry={onRetry} isRetrying />);
    const retry = screen.getByRole('button', { name: 'Retry' });
    expect(retry).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(retry, { force: true });
    expect(onRetry).not.toHaveBeenCalled();
    // The pending button isn't part of the live region, so its spinner isn't announced as a new alert.
    expect(screen.getByRole('alert').contains(retry)).toBe(false);
  });

  it('keeps details in a collapsed disclosure one heading level down', async () => {
    render(
      <ErrorState
        title="Couldn't save"
        headingLevel={2}
        details="Error 503: upstream timed out (request 8f2c)"
      />,
    );
    const trigger = screen.getByRole('button', { name: 'Details' });
    expect(trigger.closest('h3')).not.toBeNull();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    const details = screen.getByText('Error 503: upstream timed out (request 8f2c)');
    expect(details.tagName).toBe('PRE');
    expect(details.checkVisibility()).toBe(false);

    trigger.focus();
    await userEvent.keyboard('{Enter}');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(details.checkVisibility()).toBe(true);
  });

  it('uses the messages from UIProvider', () => {
    render(
      <UIProvider messages={{ retry: 'Erneut versuchen', details: 'Einzelheiten' }}>
        <ErrorState title="Fehler" onRetry={() => undefined} details="x" />
      </UIProvider>,
    );
    expect(screen.getByRole('button', { name: 'Erneut versuchen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Einzelheiten' })).toBeInTheDocument();
  });

  it('takes a custom icon, className, ref and data attributes', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <ErrorState
        ref={ref}
        title="Offline"
        icon={WifiOff}
        className="py-4"
        data-testid="error-state"
      />,
    );
    const root = screen.getByTestId('error-state');
    expect(ref.current).toBe(root);
    expect(root.className).toContain('py-4');
    expect(root.className).not.toContain('py-10');
    expect(root.querySelector('svg.lucide-wifi-off')).not.toBeNull();
  });

  it('fits a 320 px column without overflowing, even with long details', async () => {
    render(
      <div style={{ width: 320 }} data-testid="column">
        <ErrorState
          title="Couldn't load the meter readings for this site"
          onRetry={() => undefined}
          details={'x'.repeat(400)}
        />
      </div>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Details' }));
    const column = screen.getByTestId('column');
    expect(column.scrollWidth).toBeLessThanOrEqual(column.clientWidth);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth,
    );
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <ErrorState
        title="Couldn't load customers"
        description="Try again in a moment."
        onRetry={() => undefined}
        details="Error 503"
      />,
    );
    await expectNoAxeViolations(container);
    await userEvent.click(screen.getByRole('button', { name: 'Details' }));
    await expectNoAxeViolations(container);
  });
});
