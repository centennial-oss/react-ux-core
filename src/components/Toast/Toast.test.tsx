import { act, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { UIProvider } from '../../provider/UIProvider';
import { Button } from '../Button';
import { Dialog } from '../Dialog';
import { DEFAULT_TOAST_TIMEOUT, toast, toastStore } from './toastStore';

const isPhone = window.matchMedia('(max-width: 639.98px)').matches;
const hasTouch = navigator.maxTouchPoints > 0;

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Finds text inside the visible toasts (the live regions repeat it for screen readers). */
function inToasts(text: string) {
  const region = screen.queryByRole('region', { name: 'Notifications' });
  return region ? within(region).queryByText(text) : null;
}

function show(...args: Parameters<typeof toast>) {
  let id = '';
  act(() => {
    id = toast(...args);
  });
  return id;
}

afterEach(() => {
  act(() => {
    toast.clear();
  });
});

describe('toast store', () => {
  it('returns ids and uses tone-based default timeouts', () => {
    const success = toast.success('Saved');
    const error = toast.error({ title: 'Sync failed' });
    const [errorRecord, successRecord] = toastStore.getSnapshot().toasts;
    expect(typeof success).toBe('string');
    expect(errorRecord?.id).toBe(error);
    expect(errorRecord?.tone).toBe('danger');
    expect(errorRecord?.timeout).toBeNull();
    expect(successRecord?.timeout).toBe(DEFAULT_TOAST_TIMEOUT);
  });

  it('replaces a toast with the same id and calls onClose when dismissed', () => {
    const onClose = vi.fn();
    toast({ id: 'upload', title: 'Uploading…', timeout: null, onClose });
    toast({ id: 'upload', title: 'Uploaded', tone: 'success', onClose });
    expect(toastStore.getSnapshot().toasts).toHaveLength(1);
    expect(toastStore.getSnapshot().toasts[0]?.title).toBe('Uploaded');
    toast.dismiss('upload');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(toastStore.getSnapshot().toasts).toHaveLength(0);
  });
});

describe('ToastRegion', () => {
  it('shows toasts in a labelled region and announces them politely or assertively by tone', () => {
    render(<UIProvider />);
    show({ tone: 'success', title: 'Tariff saved' });
    const region = screen.getByRole('region', { name: 'Notifications' });
    expect(within(region).getByText('Tariff saved')).toBeInTheDocument();
    const polite = document.querySelector('[aria-live="polite"]');
    expect(polite?.textContent).toContain('Tariff saved');

    show({ tone: 'danger', title: 'Sync failed' });
    expect(document.querySelector('[aria-live="assertive"]')?.textContent).toContain('Sync failed');
  });

  it('dismisses timed toasts on their own, and keeps persistent ones', async () => {
    render(<UIProvider />);
    show({ tone: 'info', title: 'Quick note', timeout: 300 });
    show({ tone: 'warning', title: 'Quota nearly used' });
    await expect.poll(() => inToasts('Quick note'), { timeout: 2000 }).toBeNull();
    expect(inToasts('Quota nearly used')).not.toBeNull();
  });

  it.runIf(!hasTouch)('pauses every countdown while hovered', async () => {
    render(<UIProvider />);
    // The timeout leaves room for the pointer to arrive under load; the wait then outlasts it.
    show({ tone: 'info', title: 'Paused note', timeout: 1500 });
    await userEvent.hover(document.body);
    const note = inToasts('Paused note') ?? document.body;
    await userEvent.hover(note);
    await wait(2000);
    expect(inToasts('Paused note')).not.toBeNull();
    await userEvent.unhover(note);
    await expect.poll(() => inToasts('Paused note'), { timeout: 4000 }).toBeNull();
  });

  it('pauses while focus is inside, and dismissing moves focus to the next toast', async () => {
    render(<UIProvider />);
    show({ tone: 'info', title: 'First', timeout: 400 });
    show({ tone: 'info', title: 'Second', timeout: 400 });
    const [firstDismiss, secondDismiss] = screen.getAllByRole('button', { name: 'Dismiss' });
    firstDismiss?.focus();
    await wait(700);
    expect(inToasts('First')).not.toBeNull();
    await userEvent.keyboard('{Enter}');
    expect(screen.getAllByRole('button', { name: 'Dismiss' })).toHaveLength(1);
    expect(document.activeElement).toBe(secondDismiss);
  });

  it('runs the action and dismisses the toast', async () => {
    const onPress = vi.fn();
    render(<UIProvider />);
    show({ title: 'Meter archived', action: { label: 'Undo', onPress } });
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(inToasts('Meter archived')).toBeNull();
  });

  it('offers "Clear all" from three dismissable toasts', async () => {
    render(<UIProvider />);
    show({ title: 'One', timeout: null });
    show({ title: 'Two', timeout: null });
    expect(screen.queryByRole('button', { name: 'Clear all' })).toBeNull();
    show({ title: 'Three', timeout: null });
    await userEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(screen.queryByRole('region', { name: 'Notifications' })).toBeNull();
  });

  it('shows a countdown ring only on timed toasts', () => {
    render(<UIProvider />);
    show({ tone: 'success', title: 'Timed' });
    show({ tone: 'danger', title: 'Persistent' });
    const timed = inToasts('Timed')?.closest('li');
    const persistent = inToasts('Persistent')?.closest('li');
    expect(timed?.querySelector('circle[stroke-dasharray]')).not.toBeNull();
    expect(persistent?.querySelector('circle[stroke-dasharray]')).toBeNull();
  });

  it('stays usable while a modal dialog is open', async () => {
    render(
      <UIProvider>
        <Dialog title="Editing" isOpen>
          <Button>Inside</Button>
        </Dialog>
      </UIProvider>,
    );
    await screen.findByRole('dialog', { name: 'Editing' });
    show({ tone: 'danger', title: 'Connection lost' });
    const region = screen.getByRole('region', { name: 'Notifications' });
    expect(region.closest('[aria-hidden="true"], [inert]')).toBeNull();
    await userEvent.click(within(region).getByRole('button', { name: 'Dismiss' }));
    expect(inToasts('Connection lost')).toBeNull();
  });

  it.runIf(isPhone)('stacks at the bottom, full width, on phones', () => {
    render(<UIProvider toastPlacement="top-end" />);
    show({ title: 'Saved' });
    const item = inToasts('Saved')?.closest('li');
    const rect = item?.getBoundingClientRect();
    expect(rect?.width).toBeGreaterThan(window.innerWidth - 32);
    expect(rect?.bottom).toBeGreaterThan(window.innerHeight - 40);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<UIProvider />);
    show({ tone: 'success', title: 'Saved', description: 'Tariff updated' });
    show({
      tone: 'danger',
      title: 'Sync failed',
      action: { label: 'Retry', onPress: () => undefined },
    });
    await expectNoAxeViolations(container);
  });
});
