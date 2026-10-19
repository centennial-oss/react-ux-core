import { render, renderHook, screen } from '@testing-library/react';
import { userEvent } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { LiveRegion, useAnnouncer } from './LiveRegion';

function Announcing({ text }: { text: string }) {
  const { ref, announce } = useAnnouncer();
  return (
    <>
      <button
        type="button"
        onClick={() => {
          announce(text);
        }}
      >
        Announce
      </button>
      <LiveRegion ref={ref} />
    </>
  );
}

function region() {
  return document.querySelector('[aria-live]');
}

describe('LiveRegion', () => {
  it('is a hidden polite region by default, assertive and atomic on request', () => {
    const { rerender } = render(<LiveRegion>Saved</LiveRegion>);
    expect(region()).toHaveClass('sr-only');
    expect(region()).toHaveAttribute('aria-live', 'polite');
    expect(region()).not.toHaveAttribute('aria-atomic');
    rerender(
      <LiveRegion politeness="assertive" isAtomic>
        Failed
      </LiveRegion>,
    );
    expect(region()).toHaveAttribute('aria-live', 'assertive');
    expect(region()).toHaveAttribute('aria-atomic', 'true');
    expect(region()?.textContent).toBe('Failed');
  });

  it('announces through useAnnouncer, and announces the same text again', async () => {
    render(<Announcing text="Row 1 added." />);
    const button = screen.getByRole('button', { name: 'Announce' });
    await userEvent.click(button);
    expect(region()?.textContent).toBe('Row 1 added.');
    await userEvent.click(button);
    await expect.poll(() => region()?.textContent).toBe('Row 1 added.');
  });

  it('clears the region before repeating the same text', async () => {
    const { result } = renderHook(() => useAnnouncer());
    const live = document.createElement('span');
    result.current.ref.current = live;
    const { announce } = result.current;
    announce('Copied');
    expect(live.textContent).toBe('Copied');
    announce('Copied');
    expect(live.textContent).toBe('');
    await expect.poll(() => live.textContent).toBe('Copied');
    // A different text replaces it at once.
    announce('Removed');
    expect(live.textContent).toBe('Removed');
  });
});
