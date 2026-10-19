import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { Option } from '../ListBox';
import { ComboBox } from './ComboBox';

interface Customer {
  id: string;
  name: string;
}

const customers: Customer[] = [
  { id: 'acme', name: 'Acme Corporation' },
  { id: 'globex', name: 'Globex' },
  { id: 'initech', name: 'Initech' },
  { id: 'umbrella', name: 'Umbrella' },
];

function StaticExample(props: {
  onChange?: (key: unknown) => void;
  allowsCustomValue?: boolean;
  onInputChange?: (v: string) => void;
}) {
  return (
    <ComboBox label="Customer" items={customers} {...props}>
      {(customer) => <Option id={customer.id}>{customer.name}</Option>}
    </ComboBox>
  );
}

/**
 * Waits until the suggestions are visible. On touch screens React Aria reveals the popover only after the on-screen
 * keyboard settles, and options must be clicked through Playwright's role locators, which skip the hidden copy React
 * Aria uses to build its collection.
 */
async function suggestions() {
  await expect
    .poll(
      () => {
        const listbox = document.querySelector('[role="listbox"]');
        return listbox
          ? getComputedStyle(listbox.closest('[data-placement]') ?? listbox).opacity
          : '';
      },
      { timeout: 3000 },
    )
    .toBe('1');
  return screen.getByRole('listbox');
}

const hasTouch = navigator.maxTouchPoints > 0;

describe('ComboBox', () => {
  it('filters static items as you type and chooses one', async () => {
    const onChange = vi.fn();
    render(<StaticExample onChange={onChange} />);
    const input = screen.getByRole('combobox', { name: 'Customer' });
    await userEvent.type(input, 'gl');
    const listbox = await suggestions();
    expect(
      within(listbox)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Globex']);
    // A real mouse click; force skips Playwright's frame-stability wait, which never settles for this popover.
    await userEvent.click(within(listbox).getByRole('option', { name: 'Globex' }), { force: true });
    expect(onChange.mock.calls.at(-1)?.[0]).toBe('globex');
    expect(input).toHaveValue('Globex');
  });

  // React Aria doesn't open the list from arrow keys on mobile devices (their key events come from on-screen
  // keyboards), so this runs on the desktop instance.
  it.runIf(!hasTouch)('is keyboard operable', async () => {
    const onChange = vi.fn<(key: unknown) => void>();
    render(<StaticExample onChange={onChange} />);
    screen.getByRole('combobox', { name: 'Customer' }).focus();
    const input = screen.getByRole('combobox', { name: 'Customer' });
    await userEvent.keyboard('{ArrowDown}');
    await suggestions();
    await userEvent.keyboard('{ArrowDown}');
    await expect.poll(() => input.getAttribute('aria-activedescendant') ?? '').toContain('globex');
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => onChange.mock.calls.at(-1)?.[0]).toBe('globex');
  });

  it('shows "No results" when nothing matches', async () => {
    render(<StaticExample />);
    await userEvent.type(screen.getByRole('combobox', { name: 'Customer' }), 'zzz');
    expect(await screen.findByText('No results')).toBeInTheDocument();
  });

  it('keeps typed text with allowsCustomValue', async () => {
    const onInputChange = vi.fn();
    render(<StaticExample allowsCustomValue onInputChange={onInputChange} />);
    const input = screen.getByRole('combobox', { name: 'Customer' });
    await userEvent.type(input, 'Hooli');
    await userEvent.keyboard('{Tab}');
    expect(input).toHaveValue('Hooli');
    expect(onInputChange).toHaveBeenLastCalledWith('Hooli');
  });

  describe('async', () => {
    it('debounces loading and aborts superseded queries', async () => {
      const signals: AbortSignal[] = [];
      const loadItems = vi.fn(async (query: string, signal: AbortSignal) => {
        signals.push(signal);
        await new Promise((resolve) => setTimeout(resolve, 150));
        return customers.filter((customer) =>
          customer.name.toLowerCase().includes(query.toLowerCase()),
        );
      });
      render(
        <ComboBox label="Customer" loadItems={loadItems} loadDelay={200}>
          {(customer) => <Option id={customer.id}>{customer.name}</Option>}
        </ComboBox>,
      );
      await expect.poll(() => loadItems.mock.calls.length).toBe(1);
      await userEvent.type(screen.getByRole('combobox', { name: 'Customer' }), 'init');
      await expect.poll(() => loadItems.mock.calls.length, { timeout: 2000 }).toBe(2);
      expect(loadItems.mock.calls[1]?.[0]).toBe('init');
      await suggestions();
      await expect
        .poll(() => screen.queryByRole('option', { name: 'Initech' }), { timeout: 3000 })
        .not.toBeNull();
    });

    it('aborts an in-flight request when a newer query starts', async () => {
      const signals: AbortSignal[] = [];
      const loadItems = vi.fn(async (_query: string, signal: AbortSignal) => {
        signals.push(signal);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        return customers;
      });
      render(
        <ComboBox label="Customer" loadItems={loadItems} loadDelay={0}>
          {(customer) => <Option id={customer.id}>{customer.name}</Option>}
        </ComboBox>,
      );
      const input = screen.getByRole('combobox', { name: 'Customer' });
      await userEvent.type(input, 'a');
      await expect.poll(() => signals.length).toBeGreaterThanOrEqual(2);
      const inFlight = signals.at(-1);
      await userEvent.type(input, 'c');
      await expect.poll(() => signals.length).toBeGreaterThanOrEqual(3);
      // useAsyncList starts the new load before React renders the update that aborts the old one, so wait for it.
      await expect.poll(() => inFlight?.aborted).toBe(true);
    });

    it('shows loading and error states', async () => {
      const loadItems = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 300));
        throw new Error('offline');
      });
      render(
        <ComboBox label="Customer" loadItems={loadItems} loadDelay={0} menuTrigger="focus">
          {(customer: Customer) => <Option id={customer.id}>{customer.name}</Option>}
        </ComboBox>,
      );
      screen.getByRole('combobox', { name: 'Customer' }).focus();
      await userEvent.keyboard('{ArrowDown}');
      expect(await screen.findByText('Loading')).toBeInTheDocument();
      expect(
        await screen.findByText('Couldn’t load options', {}, { timeout: 2000 }),
      ).toBeInTheDocument();
    });
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<StaticExample />);
    await expectNoAxeViolations(container);
    await userEvent.type(screen.getByRole('combobox', { name: 'Customer' }), 'a');
    await expectNoAxeViolations(await suggestions());
  });
});
