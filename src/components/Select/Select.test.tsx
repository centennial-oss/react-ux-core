import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import type { Key } from 'react-aria-components';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { Option, OptionSection } from '../ListBox';
import { Select } from './Select';

const isPhone = window.matchMedia('(max-width: 639.98px)').matches;

const regions = [
  { id: 'north', name: 'North' },
  { id: 'south', name: 'South' },
  { id: 'east', name: 'East' },
  { id: 'west', name: 'West' },
];

function RegionSelect(props: { onChange?: (key: Key | null) => void; isInvalid?: boolean }) {
  return (
    <Select label="Region" items={regions} errorMessage="Choose a region" {...props}>
      {(region) => <Option id={region.id}>{region.name}</Option>}
    </Select>
  );
}

async function openList() {
  await userEvent.click(screen.getByRole('button', { name: /Region/ }));
  const listbox = await screen.findByRole('listbox');
  await expect.poll(() => listbox.contains(document.activeElement), { timeout: 2000 }).toBe(true);
  return listbox;
}

describe('Select', () => {
  it('shows a placeholder and is labelled', () => {
    render(<RegionSelect />);
    const trigger = screen.getByRole('button', { name: /Region/ });
    expect(trigger.textContent).toContain('Select…');
  });

  it('chooses an option with the mouse and reports its id', async () => {
    const onChange = vi.fn();
    render(<RegionSelect onChange={onChange} />);
    const listbox = await openList();
    await userEvent.click(within(listbox).getByRole('option', { name: 'East' }));
    expect(onChange.mock.calls[0]?.[0]).toBe('east');
    await expect.poll(() => screen.queryByRole('listbox'), { timeout: 3000 }).toBeNull();
    expect(screen.getByRole('button', { name: /Region/ }).textContent).toContain('East');
  });

  it('is keyboard operable with typeahead', async () => {
    const onChange = vi.fn();
    render(<RegionSelect onChange={onChange} />);
    screen.getByRole('button', { name: /Region/ }).focus();
    await userEvent.keyboard('{ArrowDown}');
    const listbox = await screen.findByRole('listbox');
    await expect.poll(() => listbox.contains(document.activeElement), { timeout: 2000 }).toBe(true);
    await userEvent.keyboard('w');
    await expect.poll(() => document.activeElement?.textContent).toContain('West');
    await userEvent.keyboard('{Enter}');
    expect(onChange.mock.calls[0]?.[0]).toBe('west');
  });

  it('works controlled', async () => {
    function Controlled() {
      const [value, setValue] = useState<Key | null>('south');
      return (
        <>
          <Select label="Region" items={regions} value={value} onChange={setValue}>
            {(region) => <Option id={region.id}>{region.name}</Option>}
          </Select>
          <span data-testid="value">{String(value)}</span>
        </>
      );
    }
    render(<Controlled />);
    expect(screen.getByRole('button', { name: /Region/ }).textContent).toContain('South');
    const listbox = await openList();
    await userEvent.click(within(listbox).getByRole('option', { name: 'North' }));
    expect(screen.getByTestId('value').textContent).toBe('north');
  });

  it('supports sections and disabled options', async () => {
    render(
      <Select label="Region" disabledKeys={['legacy']}>
        <OptionSection title="Active">
          <Option id="north">North</Option>
        </OptionSection>
        <OptionSection title="Retired">
          <Option id="legacy">Legacy</Option>
        </OptionSection>
      </Select>,
    );
    const listbox = await openList();
    expect(within(listbox).getByRole('group', { name: 'Active' })).toBeInTheDocument();
    expect(within(listbox).getByRole('option', { name: 'Legacy' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('shows the error message when invalid', () => {
    render(<RegionSelect isInvalid />);
    expect(screen.getByText('Choose a region')).toBeInTheDocument();
  });

  it.runIf(isPhone)('opens as a bottom sheet on phones', async () => {
    render(<RegionSelect />);
    const listbox = await openList();
    expect(listbox.closest('[data-position="bottom"]')).not.toBeNull();
  });

  it.runIf(!isPhone)('opens as an anchored popover on tablet and desktop', async () => {
    render(<RegionSelect />);
    const listbox = await openList();
    expect(listbox.closest('[data-placement]')).not.toBeNull();
  });

  it('has no accessibility violations, closed and open', async () => {
    const { container } = render(<RegionSelect />);
    await expectNoAxeViolations(container);
    await expectNoAxeViolations(await openList());
  });
});
