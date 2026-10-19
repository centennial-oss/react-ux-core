import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import type { Key } from 'react-aria-components';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { Option } from '../ListBox';
import { MultiSelect } from './MultiSelect';

const regions = [
  { id: 'north', name: 'North' },
  { id: 'south', name: 'South' },
  { id: 'east', name: 'East' },
  { id: 'west', name: 'West' },
];

/** Waits for the suggestions (touch screens reveal them after a short delay) and returns the list. */
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

async function choose(name: string) {
  const listbox = await suggestions();
  // force: skip Playwright's frame-stability wait, which never settles for combo box popovers.
  await userEvent.click(within(listbox).getByRole('option', { name }), { force: true });
}

/** Closes the list: while it's open, React Aria hides everything but the input and list from assistive tech. */
async function closeList() {
  const input = screen.getByRole('combobox');
  // Escape first clears unmatched text, then closes the list.
  for (let press = 0; press < 2 && input.getAttribute('aria-expanded') === 'true'; press++) {
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => input.getAttribute('aria-expanded'), { timeout: 1000 }).toBeDefined();
  }
  await expect.poll(() => input.getAttribute('aria-expanded'), { timeout: 3000 }).toBe('false');
}

function chips() {
  return screen.queryAllByRole('button', { name: /^Remove / }).map((button) => button.textContent);
}

describe('MultiSelect', () => {
  it('adds chosen options as chips and reports their ids', async () => {
    const onChange = vi.fn<(keys: Key[]) => void>();
    render(
      <MultiSelect label="Regions" items={regions} onChange={onChange}>
        {(region) => <Option id={region.id}>{region.name}</Option>}
      </MultiSelect>,
    );
    const input = screen.getByRole('combobox', { name: 'Regions' });
    await userEvent.type(input, 'no');
    await choose('North');
    // Choosing clears the query, so the next search starts fresh.
    expect(input).toHaveValue('');
    await userEvent.type(input, 'ea');
    await choose('East');
    expect(onChange).toHaveBeenLastCalledWith(['north', 'east']);
    await closeList();
    expect(await screen.findByRole('button', { name: 'Remove North' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Remove East' })).toBeInTheDocument();
  });

  it('removes values from a chip button or with Backspace in the empty input', async () => {
    const onChange = vi.fn<(keys: Key[]) => void>();
    render(
      <MultiSelect
        label="Regions"
        items={regions}
        defaultValue={['north', 'south', 'east']}
        onChange={onChange}
      >
        {(region) => <Option id={region.id}>{region.name}</Option>}
      </MultiSelect>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Remove South' }));
    expect(onChange).toHaveBeenLastCalledWith(['north', 'east']);
    await userEvent.click(screen.getByRole('combobox', { name: 'Regions' }));
    await userEvent.keyboard('{Backspace}');
    expect(onChange).toHaveBeenLastCalledWith(['north']);
    expect(chips()).toHaveLength(1);
  });

  it('drops chosen options from the suggestions', async () => {
    render(
      <MultiSelect label="Regions" items={regions} defaultValue={['north']}>
        {(region) => <Option id={region.id}>{region.name}</Option>}
      </MultiSelect>,
    );
    await userEvent.type(screen.getByRole('combobox', { name: 'Regions' }), 'o');
    const listbox = await suggestions();
    expect(within(listbox).queryByRole('option', { name: 'North' })).toBeNull();
    expect(within(listbox).getByRole('option', { name: 'South' })).toBeInTheDocument();
  });

  it('keeps chip labels when the list is filtered', async () => {
    render(
      <MultiSelect label="Regions" items={regions} defaultValue={['west']}>
        {(region) => <Option id={region.id}>{region.name}</Option>}
      </MultiSelect>,
    );
    await userEvent.type(screen.getByRole('combobox', { name: 'Regions' }), 'zzz');
    await closeList();
    expect(await screen.findByRole('button', { name: 'Remove West' })).toBeInTheDocument();
  });

  it('works controlled', async () => {
    function Controlled() {
      const [value, setValue] = useState<Key[]>(['south']);
      return (
        <>
          <MultiSelect label="Regions" items={regions} value={value} onChange={setValue}>
            {(region) => <Option id={region.id}>{region.name}</Option>}
          </MultiSelect>
          <span data-testid="value">{value.join(',')}</span>
        </>
      );
    }
    render(<Controlled />);
    await userEvent.type(screen.getByRole('combobox', { name: 'Regions' }), 'we');
    await choose('West');
    expect(screen.getByTestId('value').textContent).toBe('south,west');
  });

  it('chooses from async results and keeps labels when the results change', async () => {
    const loadItems = vi.fn(async (query: string) => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return regions.filter((region) => region.name.toLowerCase().startsWith(query.toLowerCase()));
    });
    render(
      <MultiSelect label="Regions" loadItems={loadItems} loadDelay={0}>
        {(region) => <Option id={region.id}>{region.name}</Option>}
      </MultiSelect>,
    );
    const input = screen.getByRole('combobox', { name: 'Regions' });
    await userEvent.type(input, 'so');
    await expect
      .poll(() => screen.queryByRole('option', { name: 'South' }), { timeout: 3000 })
      .not.toBeNull();
    await choose('South');
    await userEvent.type(input, 'n');
    await expect
      .poll(() => screen.queryByRole('option', { name: 'North' }), { timeout: 3000 })
      .not.toBeNull();
    await closeList();
    expect(await screen.findByRole('button', { name: 'Remove South' })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <MultiSelect label="Regions" items={regions} defaultValue={['north', 'east']}>
        {(region) => <Option id={region.id}>{region.name}</Option>}
      </MultiSelect>,
    );
    await expectNoAxeViolations(container);
  });
});
