import { act, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { Button } from '../Button';
import { Banner } from './Banner';

describe('Banner', () => {
  it('uses role=status for neutral, info and success, and role=alert for warning and danger', () => {
    render(
      <>
        <Banner tone="info" title="Heads up" />
        <Banner tone="success" title="Saved" />
        <Banner tone="warning" title="Quota nearly used" />
        <Banner tone="danger" title="Sync failed" />
      </>,
    );
    expect(screen.getByRole('status', { name: 'Heads up' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Saved' })).toBeInTheDocument();
    expect(screen.getByRole('alert', { name: 'Quota nearly used' })).toBeInTheDocument();
    expect(screen.getByRole('alert', { name: 'Sync failed' })).toBeInTheDocument();
  });

  it('renders body and actions', () => {
    render(
      <Banner title="Update available" actions={<Button size="sm">Reload</Button>}>
        A new version is ready.
      </Banner>,
    );
    expect(screen.getByText('A new version is ready.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
  });

  it('dismisses itself when uncontrolled and reports the change', async () => {
    const onOpenChange = vi.fn();
    render(<Banner title="Saved" isDismissable onOpenChange={onOpenChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('status')).toBeNull();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('stays visible when controlled until the parent closes it', async () => {
    function Controlled() {
      const [isOpen, setOpen] = useState(true);
      return (
        <>
          <Banner title="Saved" isDismissable isOpen={isOpen} onOpenChange={setOpen} />
          <span>{isOpen ? 'open' : 'closed'}</span>
        </>
      );
    }
    render(<Controlled />);
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.getByText('closed')).toBeInTheDocument();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('hides at expiresAt, and never shows if already expired', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date', 'performance'] });
    try {
      const onOpenChange = vi.fn();
      render(
        <>
          <Banner
            title="Maintenance tonight"
            expiresAt={Date.now() + 5000}
            onOpenChange={onOpenChange}
          />
          <Banner title="Old notice" expiresAt={Date.now() - 1} />
        </>,
      );
      expect(screen.getByRole('status', { name: 'Maintenance tonight' })).toBeInTheDocument();
      expect(screen.queryByRole('status', { name: 'Old notice' })).toBeNull();
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(screen.queryByRole('status', { name: 'Maintenance tonight' })).toBeNull();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('uses translated labels', () => {
    render(
      <UIProviderWithFrench>
        <Banner title="Enregistré" isDismissable />
      </UIProviderWithFrench>,
    );
    expect(screen.getByRole('button', { name: 'Fermer' })).toBeInTheDocument();
  });

  it('has no accessibility violations in any tone', async () => {
    const { container } = render(
      <>
        {(['neutral', 'info', 'success', 'warning', 'danger'] as const).map((tone) => (
          <Banner key={tone} tone={tone} title={tone} isDismissable>
            Body text
          </Banner>
        ))}
      </>,
    );
    await expectNoAxeViolations(container);
  });
});

import { UIProvider } from '../../provider/UIProvider';
function UIProviderWithFrench({ children }: { children: React.ReactNode }) {
  return <UIProvider messages={{ dismiss: 'Fermer' }}>{children}</UIProvider>;
}
