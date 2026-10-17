import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { TileGrid, type TileOption } from './TileGrid';

const questions: TileOption[] = [1, 2, 3, 4].map((number) => ({
  id: String(number),
  label: String(number),
  textValue: `Question ${String(number)}`,
  status:
    number === 2 ? { tone: 'warning', label: 'Flagged' } : { tone: 'success', label: 'Answered' },
}));

const people: TileOption[] = ['Ada', 'Grace', 'Katherine', 'Alan'].map((name) => ({
  id: name.toLowerCase(),
  label: name,
}));

describe('TileGrid', () => {
  it('is a navigator: pressing a tile calls onAction, and the current tile is marked', async () => {
    const onAction = vi.fn();
    render(
      <TileGrid
        label="Questions"
        items={questions}
        density="compact"
        selectionMode="none"
        currentId="3"
        onAction={onAction}
      />,
    );
    const grid = screen.getByRole('listbox', { name: 'Questions' });
    const current = within(grid).getByRole('option', { name: 'Question 3, Answered' });
    expect(current).toHaveAttribute('aria-current', 'true');
    expect(getComputedStyle(current).outlineStyle).toBe('solid');
    await userEvent.click(within(grid).getByRole('option', { name: 'Question 2, Flagged' }));
    expect(onAction).toHaveBeenCalledWith('2');
    await userEvent.keyboard('{ArrowRight}{Enter}');
    expect(onAction).toHaveBeenLastCalledWith('3');
  });

  it('explains statuses in a legend', () => {
    render(
      <TileGrid
        label="Questions"
        items={questions}
        density="compact"
        selectionMode="none"
        legend={[
          { tone: 'success', label: 'Answered' },
          { tone: 'warning', label: 'Flagged' },
        ]}
      />,
    );
    const legend = screen.getByRole('list', { name: 'Legend' });
    expect(
      within(legend)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Answered', 'Flagged']);
  });

  it('chooses up to maxSelected, then disables the rest and announces the count', async () => {
    const onChange = vi.fn();
    render(
      <TileGrid
        label="Candidates"
        items={people}
        selectionMode="multiple"
        maxSelected={2}
        onChange={onChange}
      />,
    );
    const grid = screen.getByRole('listbox', { name: 'Candidates' });
    expect(grid).toHaveAccessibleDescription('Choose up to 2.');
    await userEvent.click(screen.getByRole('option', { name: 'Ada' }));
    await userEvent.click(screen.getByRole('option', { name: 'Grace' }));
    expect(onChange).toHaveBeenLastCalledWith(['ada', 'grace']);
    expect(screen.getByText('2 of 2 chosen')).toHaveAttribute('aria-live', 'polite');
    const katherine = screen.getByRole('option', { name: 'Katherine' });
    expect(katherine).toHaveAttribute('aria-disabled', 'true');
    // Playwright won't click a disabled element on its own; force it to show the click does nothing.
    await userEvent.click(katherine, { force: true });
    expect(onChange).toHaveBeenCalledTimes(2);
    await userEvent.click(screen.getByRole('option', { name: 'Ada' }));
    expect(onChange).toHaveBeenLastCalledWith(['grace']);
    expect(screen.getByRole('option', { name: 'Katherine' })).not.toHaveAttribute('aria-disabled');
  });

  it('keeps a read-only view readable and unchangeable', async () => {
    const onChange = vi.fn();
    render(
      <TileGrid
        label="Your votes"
        items={people}
        selectionMode="multiple"
        value={['ada']}
        isReadOnly
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole('option', { name: 'Grace' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('option', { name: 'Ada' })).toHaveAttribute('aria-selected', 'true');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <TileGrid
        label="Questions"
        items={questions}
        density="compact"
        selectionMode="none"
        currentId="1"
        legend={[{ tone: 'success', label: 'Answered' }]}
      />,
    );
    await expectNoAxeViolations(container);
  });
});
