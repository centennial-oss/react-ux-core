import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { safeChanges, sampleChanges } from '../../test/diff';
import type { Messages } from '../provider/messages';
import { UIProvider } from '../provider/UIProvider';
import type { DiffMessages } from './messages';
import { PlanReview } from './PlanReview';

const isDesktop = window.innerWidth >= 1024;
const hasTouch = navigator.maxTouchPoints > 0;

const textOf = (element: Element | null | undefined) => element?.textContent ?? '';

async function openApply() {
  await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
  const dialog = await screen.findByRole('alertdialog');
  await expect.poll(() => dialog.contains(document.activeElement), { timeout: 2000 }).toBe(true);
  return dialog;
}

describe('PlanReview', () => {
  it('summarises the plan in one sentence, with destroys stressed', () => {
    render(<PlanReview changes={sampleChanges} />);
    const region = screen.getByRole('region', { name: 'Planned changes' });
    const status = within(region).getAllByRole('status')[0];
    expect(textOf(status)).toEqual(
      expect.stringContaining('23 to add, 11 to change, 2 to replace, 3 to destroy, 1 to read.'),
    );
    const destroy = within(region).getByText('3 to destroy');
    expect(destroy.className).toContain('bg-danger-solid');
    expect(textOf(screen.getByText(/^Showing/))).toBe('Showing 40 of 40 changes');
  });

  it('spells out each action beside its address, as a disclosure', () => {
    render(<PlanReview changes={sampleChanges} />);
    const button = screen.getByRole('button', { name: /storage_bucket\.scratch/ });
    expect(textOf(button)).toContain('will be destroyed');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.getByRole('button', { name: /database_instance\.catalog/ }).textContent,
    ).toContain('Forces replacement');
  });

  it('shows which attributes force a replacement, and unknown values', async () => {
    render(<PlanReview changes={sampleChanges} />);
    const button = screen.getByRole('button', { name: /storage_bucket\.archive/ });
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    const item = button.closest('li');
    expect(textOf(item)).toContain('This attribute forces replacement:');
    expect(within(item as HTMLElement).getByText('region', { selector: 'code' })).toBeVisible();
    const diff = within(item as HTMLElement).getByRole('figure', {
      name: 'storage_bucket.archive',
    });
    expect(textOf(diff)).toContain('"id": (known after apply)');
    expect(textOf(diff)).toContain('"region-2"');
  });

  it('lists every attribute forcing the database replacement', async () => {
    render(<PlanReview changes={sampleChanges} defaultExpandedIds={['replace-db']} />);
    const item = screen.getByRole('button', { name: /database_instance\.catalog/ }).closest('li');
    expect(textOf(item)).toContain('These attributes force replacement:');
    const codes = within(item as HTMLElement)
      .getAllByRole('listitem')
      .map((element) => textOf(element));
    expect(codes).toEqual(['version', 'zone']);
    await expectNoAxeViolations(item as HTMLElement);
  });

  it('masks sensitive values until revealed', async () => {
    render(<PlanReview changes={sampleChanges} defaultExpandedIds={['update-db-password']} />);
    const item = screen.getByRole('button', { name: /database_user\.reducer/ }).closest('li');
    expect(textOf(item)).toContain('(sensitive value, changed)');
    expect(textOf(item)).not.toContain('n3w-s3cret');
    await userEvent.click(
      within(item as HTMLElement).getByRole('button', { name: 'Show sensitive values' }),
    );
    expect(textOf(item)).toContain('n3w-s3cret');
    expect(
      within(item as HTMLElement).getByRole('button', { name: 'Hide sensitive values' }),
    ).toBeInTheDocument();
  });

  it.runIf(hasTouch)('expands a change with a tap', async () => {
    render(<PlanReview changes={safeChanges} />);
    await commands.tap('li[data-action="create"] button[slot="trigger"]');
    await expect
      .poll(() => screen.queryByRole('figure', { name: 'storage_bucket.images' }))
      .not.toBeNull();
  });

  it.runIf(isDesktop)('filters by action and type, announcing the count', async () => {
    render(<PlanReview changes={sampleChanges} />);
    await userEvent.click(screen.getByRole('button', { name: /Action/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Destroy' }));
    await expect.poll(() => textOf(screen.getByText(/^Showing/))).toBe('Showing 3 of 40 changes');
    expect(screen.getByText(/^Showing/)).toHaveAttribute('aria-live', 'polite');
    await userEvent.click(screen.getByRole('button', { name: /Type/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'dns_record' }));
    await expect.poll(() => textOf(screen.getByText(/^Showing/))).toBe('Showing 1 of 40 changes');
    expect(screen.getByRole('button', { name: /dns_record\.legacy/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Action/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Create' }));
    expect(await screen.findByText('No changes match these filters.')).toBeInTheDocument();
  });

  it('needs the typed confirmation to apply a destructive plan', async () => {
    const onApply = vi.fn(() => Promise.resolve());
    render(<PlanReview changes={sampleChanges} onApply={onApply} />);
    const dialog = await openApply();
    expect(textOf(dialog)).toContain('This destroys 3 resources and replaces 2.');
    const confirm = within(dialog).getByRole('button', { name: 'Apply' });
    expect(confirm).toBeDisabled();
    await userEvent.type(within(dialog).getByRole('textbox', { name: /Type apply/ }), 'apply');
    expect(confirm).toBeEnabled();
    await userEvent.click(confirm);
    await expect.poll(() => onApply.mock.calls.length).toBe(1);
    await expect.poll(() => screen.queryByRole('alertdialog'), { timeout: 3000 }).toBeNull();
  });

  it('confirms a non-destructive plan without a typed word', async () => {
    const onApply = vi.fn();
    render(<PlanReview changes={safeChanges} onApply={onApply} />);
    const dialog = await openApply();
    expect(within(dialog).queryByRole('textbox')).toBeNull();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Apply' }));
    await expect.poll(() => onApply.mock.calls.length).toBe(1);
  });

  it('skips the typed word when shouldConfirmDestructive is false', async () => {
    render(
      <PlanReview
        changes={sampleChanges}
        onApply={() => undefined}
        shouldConfirmDestructive={false}
      />,
    );
    const dialog = await openApply();
    expect(within(dialog).queryByRole('textbox')).toBeNull();
    expect(within(dialog).getByRole('button', { name: 'Apply' })).toBeEnabled();
  });

  it('shows warnings and an empty plan', () => {
    const { unmount } = render(
      <PlanReview changes={safeChanges} warnings={['First warning', 'Second warning']} />,
    );
    expect(screen.getByText('2 warnings')).toBeInTheDocument();
    expect(screen.getByText('Second warning')).toBeInTheDocument();
    unmount();
    render(<PlanReview changes={[]} onApply={() => undefined} />);
    expect(screen.getByText(/^No changes\./)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apply' })).toBeNull();
  });

  it('takes the app’s strings from UIProvider', () => {
    const messages: Partial<Messages & DiffMessages> = {
      planTitle: 'Change set',
      planToDestroy: ({ count }) => `${count} to remove`,
    };
    render(
      <UIProvider messages={messages}>
        <PlanReview changes={sampleChanges} />
      </UIProvider>,
    );
    expect(screen.getByRole('region', { name: 'Change set' })).toBeInTheDocument();
    expect(screen.getByText('3 to remove')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <PlanReview
        changes={sampleChanges}
        onApply={() => undefined}
        warnings={['Catalog will be briefly unavailable.']}
        defaultExpandedIds={['replace-archive']}
      />,
    );
    await expectNoAxeViolations(container);
  });
});
