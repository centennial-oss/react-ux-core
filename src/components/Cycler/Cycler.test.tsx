import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { Cycler, type CyclerOption } from './Cycler';

const sizes = [
  { id: 'xs', label: 'Extra small' },
  { id: 'sm', label: 'Small' },
  { id: 'md', label: 'Medium' },
  { id: 'lg', label: 'Large' },
] as const satisfies readonly CyclerOption[];

const years: CyclerOption<number>[] = Array.from({ length: 30 }, (_, index) => {
  const year = 2000 + index;
  const decade = year - (year % 10);
  return { id: year, label: String(year), group: `${String(decade)} – ${String(decade + 9)}` };
});

/** Waits for the picker's fade-in (or the phone sheet's slide-in) and for focus to move into it. */
async function openPicker(name: RegExp) {
  await userEvent.click(screen.getByRole('button', { name }));
  const dialog = await screen.findByRole('dialog');
  await expect.poll(() => document.querySelector('[data-entering]'), { timeout: 3000 }).toBeNull();
  await expect.poll(() => dialog.contains(document.activeElement), { timeout: 3000 }).toBe(true);
  return dialog;
}

describe('Cycler', () => {
  it('is a labelled group whose arrows step through the options', async () => {
    const onChange = vi.fn();
    render(<Cycler aria-label="Size" options={sizes} defaultValue="sm" onChange={onChange} />);
    const group = screen.getByRole('group', { name: 'Size' });
    expect(within(group).getByRole('button', { name: 'Size Small' })).toBeInTheDocument();
    await userEvent.click(within(group).getByRole('button', { name: 'Next' }));
    expect(onChange).toHaveBeenLastCalledWith('md');
    await userEvent.click(within(group).getByRole('button', { name: 'Previous' }));
    await userEvent.click(within(group).getByRole('button', { name: 'Previous' }));
    expect(onChange).toHaveBeenLastCalledWith('xs');
    expect(within(group).getByRole('button', { name: 'Size Extra small' })).toBeInTheDocument();
  });

  it('wraps past the ends by default', async () => {
    const onChange = vi.fn();
    render(<Cycler aria-label="Size" options={sizes} defaultValue="lg" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onChange).toHaveBeenLastCalledWith('xs');
  });

  it('stops at the ends without isWrapping', () => {
    render(<Cycler aria-label="Size" options={sizes} defaultValue="xs" isLooping={false} />);
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
  });

  it('skips disabled options', async () => {
    const onChange = vi.fn();
    render(
      <Cycler
        aria-label="Size"
        options={sizes.map((option) => ({ ...option, isDisabled: option.id === 'md' }))}
        defaultValue="sm"
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onChange).toHaveBeenLastCalledWith('lg');
  });

  it('announces the value the arrows step to', async () => {
    render(<Cycler aria-label="Size" options={sizes} defaultValue="sm" />);
    const live = document.querySelector('[aria-live="polite"]');
    expect(live).toHaveTextContent('Small');
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(document.querySelector('[aria-live="polite"]')).toBe(live);
    expect(live).toHaveTextContent('Medium');
  });

  it('works controlled', async () => {
    function Controlled() {
      const [value, setValue] = useState<(typeof sizes)[number]['id']>('md');
      return (
        <>
          <Cycler aria-label="Size" options={sizes} value={value} onChange={setValue} />
          <output data-testid="value">{value}</output>
        </>
      );
    }
    render(<Controlled />);
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByTestId('value')).toHaveTextContent('lg');
  });

  it('jumps to any option from the picker, then closes and returns focus', async () => {
    const onChange = vi.fn();
    render(<Cycler aria-label="Size" options={sizes} defaultValue="sm" onChange={onChange} />);
    const dialog = await openPicker(/Size Small/);
    const listbox = within(dialog).getByRole('listbox', { name: 'Size' });
    const options = within(listbox).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual([
      'Extra small',
      'Small',
      'Medium',
      'Large',
    ]);
    expect(within(listbox).getByRole('option', { name: 'Small' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(document.activeElement).toBe(within(listbox).getByRole('option', { name: 'Small' }));
    await userEvent.click(within(listbox).getByRole('option', { name: 'Large' }));
    expect(onChange).toHaveBeenLastCalledWith('lg');
    await expect.poll(() => screen.queryByRole('dialog'), { timeout: 3000 }).toBeNull();
    await expect
      .poll(() => document.activeElement === screen.getByRole('button', { name: 'Size Large' }))
      .toBe(true);
  });

  it('closes without a change when the current option is picked again', async () => {
    const onChange = vi.fn();
    render(<Cycler aria-label="Size" options={sizes} defaultValue="sm" onChange={onChange} />);
    const dialog = await openPicker(/Size Small/);
    await userEvent.click(within(dialog).getByRole('option', { name: 'Small' }));
    await expect.poll(() => screen.queryByRole('dialog'), { timeout: 3000 }).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('pages through grouped options, opening on the current page', async () => {
    const onChange = vi.fn();
    render(<Cycler aria-label="Year" options={years} defaultValue={2014} onChange={onChange} />);
    const dialog = await openPicker(/Year 2014/);
    expect(dialog.textContent).toContain('2010 – 2019');
    expect(within(dialog).getAllByRole('option')).toHaveLength(10);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Next page' }));
    expect(dialog.textContent).toContain('2020 – 2029');
    expect(within(dialog).getByRole('button', { name: 'Next page' })).toBeDisabled();
    await userEvent.click(within(dialog).getByRole('option', { name: '2027' }));
    expect(onChange).toHaveBeenLastCalledWith(2027);
  });

  it('lets onStep take over the arrows', async () => {
    const onStep = vi.fn();
    const onChange = vi.fn();
    render(
      <Cycler
        aria-label="Size"
        options={sizes}
        defaultValue="lg"
        isLooping={false}
        onStep={onStep}
        onChange={onChange}
        isPreviousDisabled
      />,
    );
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    // Past the last option: onStep decides.
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onStep).toHaveBeenCalledWith('next');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows the value without a button when hasPicker is false', () => {
    render(<Cycler aria-label="Size" options={sizes} defaultValue="sm" hasPicker={false} />);
    expect(screen.queryByRole('button', { name: /Small/ })).toBeNull();
    expect(screen.getByRole('group', { name: 'Size' }).textContent).toContain('Small');
  });

  it('disables everything with isDisabled', () => {
    render(<Cycler aria-label="Size" options={sizes} defaultValue="sm" isDisabled />);
    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled();
    }
  });

  it('has no accessibility violations, closed or open', async () => {
    const { container } = render(<Cycler aria-label="Year" options={years} defaultValue={2014} />);
    await expectNoAxeViolations(container);
    await expectNoAxeViolations(await openPicker(/Year 2014/));
  });
});
