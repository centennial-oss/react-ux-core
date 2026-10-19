import { render, screen, within } from '@testing-library/react';
import { Factory, Home, Sun } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { IconPicker } from '../IconPicker/IconPicker';
import { ColorField } from './ColorField';

describe('ColorField', () => {
  it('chooses a palette slot, which is the value', async () => {
    const onChange = vi.fn();
    render(<ColorField label="Series colour" defaultValue="chart-1" onChange={onChange} />);
    const group = screen.getByRole('group', { name: 'Series colour' });
    const swatches = within(group).getAllByRole('option');
    expect(swatches).toHaveLength(10);
    expect(swatches[0]).toHaveAttribute('aria-selected', 'true');
    const third = swatches[2];
    if (!third) {
      throw new Error('Expected ten swatches');
    }
    await userEvent.click(third);
    expect(onChange).toHaveBeenLastCalledWith('chart-3');
  });

  it('takes a custom colour as hex', async () => {
    const onChange = vi.fn();
    render(<ColorField label="Series colour" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Custom colour' }));
    const hex = await screen.findByRole('textbox', { name: 'Hex' });
    await userEvent.clear(hex);
    await userEvent.type(hex, '#7a3df0{Enter}');
    expect(onChange).toHaveBeenLastCalledWith('#7a3df0');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ColorField label="Series colour" defaultValue="chart-2" />);
    await expectNoAxeViolations(container);
  });
});

const icons = [
  { id: 'home', label: 'Home', icon: Home, keywords: ['house'] },
  { id: 'factory', label: 'Factory', icon: Factory, keywords: ['plant'] },
  { id: 'solar', label: 'Solar', icon: Sun },
];

describe('IconPicker', () => {
  it('filters the grid by name or keyword and chooses an icon', async () => {
    const onChange = vi.fn();
    render(<IconPicker label="Site icon" icons={icons} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /Site icon/ }));
    const search = await screen.findByRole('searchbox', { name: 'Search icons' });
    await userEvent.type(search, 'plant');
    const grid = screen.getByRole('listbox');
    expect(
      within(grid)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Factory']);
    await userEvent.click(within(grid).getByRole('option', { name: 'Factory' }));
    expect(onChange).toHaveBeenLastCalledWith('factory');
    expect(screen.getByRole('button', { name: /Site icon/ })).toHaveTextContent('Factory');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <IconPicker label="Site icon" icons={icons} defaultValue="solar" />,
    );
    await expectNoAxeViolations(container);
  });
});
