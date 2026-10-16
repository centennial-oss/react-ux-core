import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { TileGrid, type TileOption, type TileRow } from './TileGrid';
import { TilePicker } from './TilePicker';

type Fruit = TileOption<{ colour: string }>;

const rows: TileRow<Fruit>[] = [
  {
    id: 'berries',
    title: 'Berries',
    items: [
      { id: 'straw', label: 'Strawberry', data: { colour: 'red' } },
      { id: 'blue', label: 'Blueberry', data: { colour: 'blue' } },
      { id: 'rasp', label: 'Raspberry', data: { colour: 'red' } },
    ],
  },
  {
    id: 'citrus',
    title: 'Citrus',
    items: [
      { id: 'lemon', label: 'Lemon', keywords: ['sour'], data: { colour: 'yellow' } },
      { id: 'lime', label: 'Lime', data: { colour: 'green' }, isDisabled: true },
    ],
  },
];

const renderTile = (option: Fruit) => <span>{option.label}</span>;

describe('TileGrid', () => {
  it('shows each row under its title, and selects a tile', async () => {
    const onSelectionChange = vi.fn();
    render(
      <TileGrid
        aria-label="Fruit"
        rows={rows}
        renderTile={renderTile}
        selectionMode="single"
        onSelectionChange={onSelectionChange}
      />,
    );
    const berries = screen.getByRole('group', { name: 'Berries' });
    expect(within(berries).getAllByRole('option')).toHaveLength(3);
    expect(screen.getByRole('group', { name: 'Citrus' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Lime' })).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(screen.getByRole('option', { name: 'Blueberry' }));
    expect(screen.getByRole('option', { name: 'Blueberry' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(onSelectionChange).toHaveBeenCalled();
  });

  it('moves with the arrow keys, across rows too', async () => {
    render(
      <div className="w-60">
        <TileGrid
          aria-label="Fruit"
          rows={rows}
          renderTile={renderTile}
          selectionMode="single"
          minTileWidth="4rem"
        />
      </div>,
    );
    await userEvent.keyboard('{Tab}');
    expect(screen.getByRole('option', { name: 'Strawberry' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('option', { name: 'Blueberry' })).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}{ArrowDown}');
    // Down goes to the tile below, in the next row.
    expect(screen.getByRole('option', { name: 'Lemon' })).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    expect(screen.getByRole('option', { name: 'Strawberry' })).toHaveFocus();
  });
});

describe('TilePicker', () => {
  it('chooses a tile and hands back the option with its data', async () => {
    const onChange = vi.fn();
    render(
      <TilePicker
        label="Fruit"
        rows={rows}
        renderTile={renderTile}
        placeholder="None"
        onChange={onChange}
      />,
    );
    const trigger = screen.getByRole('button', { name: /Fruit/ });
    expect(trigger).toHaveTextContent('None');
    await userEvent.click(trigger);
    await userEvent.click(await screen.findByRole('option', { name: 'Raspberry' }));
    expect(onChange).toHaveBeenLastCalledWith('rasp', rows[0]?.items[2]);
    expect(screen.getByRole('button', { name: /Fruit/ })).toHaveTextContent('Raspberry');
  });

  it('searches labels and keywords across rows, hiding rows with no match', async () => {
    render(
      <TilePicker label="Fruit" rows={rows} renderTile={renderTile} searchLabel="Search fruit" />,
    );
    await userEvent.click(screen.getByRole('button', { name: /Fruit/ }));
    await userEvent.type(await screen.findByRole('searchbox', { name: 'Search fruit' }), 'sour');
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Lemon']);
    expect(screen.queryByRole('group', { name: 'Berries' })).toBeNull();
  });

  it('draws the chosen option in the trigger', () => {
    render(
      <TilePicker
        label="Fruit"
        rows={rows}
        renderTile={renderTile}
        defaultValue="lemon"
        renderValue={(option) => <span>{`${option.label} (${option.data?.colour ?? ''})`}</span>}
      />,
    );
    expect(screen.getByRole('button', { name: /Fruit/ })).toHaveTextContent('Lemon (yellow)');
  });

  it('has no accessibility violations, open', async () => {
    const { baseElement } = render(
      <TilePicker
        label="Fruit"
        rows={rows}
        renderTile={renderTile}
        searchLabel="Search fruit"
        defaultValue="blue"
        defaultOpen
      />,
    );
    await screen.findByRole('listbox');
    await expectNoAxeViolations(baseElement);
  });
});
