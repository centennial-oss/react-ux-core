import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import {
  exposureLadder,
  ladderColumns,
  newRung,
  PREVIOUS_RUNG_ERROR,
  rungLabel,
  validateLadder,
  type Rung,
} from '../../test/exposureLadder';
import type { Messages } from '../provider/messages';
import { UIProvider } from '../provider/UIProvider';
import type { EditableTableMessages } from './editableMessages';
import { EditableTable, type EditableTableProps } from './EditableTable';

const hasTouch = navigator.maxTouchPoints > 0;
const isDesktop = !hasTouch;

function Ladder({
  initial = exposureLadder,
  onRows,
  width = 900,
  ...props
}: Partial<EditableTableProps<Rung>> & {
  initial?: Rung[];
  onRows?: (rows: Rung[]) => void;
  width?: number;
}) {
  const [rows, setRows] = useState(initial);
  return (
    <div style={{ width, padding: 8 }}>
      <EditableTable<Rung>
        aria-label="Exposure ladder"
        rows={rows}
        columns={ladderColumns}
        getRowId={(rung) => rung.id}
        getRowLabel={rungLabel}
        onChange={(next) => {
          setRows(next);
          onRows?.(next);
        }}
        validate={validateLadder}
        newRow={() => newRung(rows)}
        duplicateRow={(rung) => ({ ...newRung(rows), ...rung, id: newRung(rows).id })}
        isReorderable
        maxRows={7}
        {...props}
      />
    </div>
  );
}

function active(): HTMLElement {
  return document.activeElement as HTMLElement;
}

function cell(row: string, col: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(
    `[data-cell-row="${row}"][data-cell-col="${col}"]`,
  );
  if (!element) {
    throw new Error(`No cell ${row}/${col}`);
  }
  return element;
}

/** The exposure cells' values (without their error text). */
function exposures() {
  return [...document.querySelectorAll('[data-cell-col="exposureMs"]')].map(
    (element) => element.firstChild?.textContent?.trim() ?? '',
  );
}

/** Whether some element (the summary heading, or its live announcement) has the text. */
function hasText(text: string) {
  return screen.queryAllByText(text).length > 0;
}

function overrides(messages: Partial<EditableTableMessages>): Partial<Messages> {
  return messages;
}

describe('EditableTable', () => {
  it('renders a labelled grid with column headers, row headers and one tab stop', async () => {
    render(<Ladder />);
    const grid = await screen.findByRole('grid', { name: 'Exposure ladder' });
    expect(
      within(grid)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual([
      'Rung',
      'Resolution',
      'Exposure (ms)',
      'Gain (dB)',
      'Frame rate (fps)',
      'More actions',
    ]);
    expect(
      within(grid)
        .getAllByRole('rowheader')
        .map((header) => header.textContent),
    ).toEqual(['Rung 1', 'Rung 2', 'Rung 3', 'Rung 4', 'Rung 5', 'Rung 6']);
    expect(grid.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    expect(grid).toHaveAccessibleDescription(/arrow keys/);
    expect(cell('r1', 'rung')).toHaveAttribute('aria-readonly', 'true');
    expect(cell('r1', 'exposureMs')).not.toHaveAttribute('aria-readonly');
  });

  it.skipIf(!isDesktop)(
    'edits a 6-rung ladder with the keyboard only, showing the error on the right cell',
    async () => {
      const onRows = vi.fn();
      render(
        <>
          <button type="button">Before</button>
          <Ladder onRows={onRows} />
        </>,
      );
      await screen.findByRole('grid');
      screen.getByRole('button', { name: 'Before' }).focus();
      await userEvent.tab();
      expect(active()).toBe(cell('r1', 'rung'));

      await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowRight}{ArrowRight}');
      expect(active()).toBe(cell('r3', 'exposureMs'));

      // Enter edits; typing replaces the value; Enter keeps it and returns to the cell.
      await userEvent.keyboard('{Enter}');
      expect(active()).toHaveAccessibleName('Exposure, Rung 3');
      await userEvent.keyboard('1{Enter}');
      expect(active()).toBe(cell('r3', 'exposureMs'));
      expect(onRows).toHaveBeenLastCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: 'r3', exposureMs: 1 })]),
      );
      const invalid = cell('r3', 'exposureMs');
      expect(invalid).toHaveAttribute('aria-invalid', 'true');
      expect(invalid).toHaveAccessibleDescription(PREVIOUS_RUNG_ERROR);
      expect(cell('r4', 'exposureMs')).not.toHaveAttribute('aria-invalid');
      expect(hasText('1 problem to fix')).toBe(true);
      expect(
        screen.getByRole('button', { name: `Rung 3, Exposure: ${PREVIOUS_RUNG_ERROR}` }),
      ).toBeInTheDocument();

      // Escape cancels an edit.
      await userEvent.keyboard('{Enter}99{Escape}');
      expect(active()).toBe(cell('r3', 'exposureMs'));
      expect(exposures()[2]).toEqual(expect.stringContaining('1'));
      expect(exposures()[2]).not.toEqual(expect.stringContaining('99'));

      // Tab moves between editable cells while editing, and Shift+Tab back.
      await userEvent.keyboard('{Enter}');
      await userEvent.keyboard('{Tab}');
      expect(active()).toHaveAccessibleName('Gain, Rung 3');
      await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
      expect(active()).toHaveAccessibleName('Exposure, Rung 3');
      await userEvent.keyboard('3{Enter}');
      expect(cell('r3', 'exposureMs')).not.toHaveAttribute('aria-invalid');
      expect(hasText('1 problem to fix')).toBe(false);

      // Home, End and Ctrl+End.
      await userEvent.keyboard('{Home}');
      expect(active()).toBe(cell('r3', 'rung'));
      await userEvent.keyboard('{End}');
      expect(active()).toHaveAccessibleName('Actions for Rung 3');
      await userEvent.keyboard('{Control>}{Home}{/Control}');
      expect(active()).toBe(cell('r1', 'rung'));
    },
  );

  it.skipIf(!isDesktop)('adds, reorders and removes rows from the keyboard', async () => {
    render(<Ladder />);
    await screen.findByRole('grid');
    const add = screen.getByRole('button', { name: 'Add row' });
    add.focus();
    await userEvent.keyboard('{Enter}');
    expect(screen.getAllByRole('rowheader')).toHaveLength(7);
    // The new row's first editable cell is being edited.
    expect(active()).toHaveAccessibleName(/Resolution, Rung 7/);
    expect(add).toBeDisabled();
    expect(screen.getByText('Up to 7 rows')).toBeInTheDocument();
    expect(cell('r7', 'exposureMs')).toHaveAccessibleDescription('Exposure is required');
    expect(screen.getByText('Rung 7 added')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(active()).toBe(cell('r7', 'resolution'));
    await userEvent.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}{ArrowUp}{End}');
    expect(active()).toHaveAccessibleName('Actions for Rung 3');
    // Arrow keys move between cells; they don't open the menu.
    await userEvent.keyboard('{Enter}');
    const moveUp = await screen.findByRole('menuitem', { name: 'Move Rung 3 up' });
    expect(moveUp).toBeInTheDocument();
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => exposures().slice(0, 3)).toEqual(['1', '5', '2']);
    await expect
      .poll(() => screen.queryByText('Rung 3, moved to position 2 of 7'))
      .toBeInTheDocument();

    // Remove the row now at position 2; focus moves to the next row's actions.
    await expect.poll(() => active()).toHaveAccessibleName('Actions for Rung 2');
    await userEvent.keyboard('{Enter}');
    const remove = await screen.findByRole('menuitem', { name: 'Remove' });
    await userEvent.click(remove);
    await expect.poll(() => screen.getAllByRole('rowheader')).toHaveLength(6);
    expect(exposures().slice(0, 3)).toEqual(['1', '2', '10']);
    await expect.poll(() => active()).toHaveAccessibleName('Actions for Rung 2');
  });

  it.skipIf(!isDesktop)(
    'edits on double-click and always shows editors in always mode',
    async () => {
      const { unmount } = render(<Ladder />);
      await screen.findByRole('grid');
      await userEvent.dblClick(cell('r2', 'gain'));
      expect(active()).toHaveAccessibleName('Gain, Rung 2');
      unmount();

      render(<Ladder editMode="always" />);
      await screen.findByRole('grid');
      expect(screen.getAllByRole('textbox', { name: /^Exposure, Rung/ })).toHaveLength(6);
      await userEvent.click(screen.getByRole('textbox', { name: 'Gain, Rung 4' }));
      await userEvent.keyboard('{Escape}');
      expect(active()).toBe(cell('r4', 'gain'));
      await userEvent.keyboard('{ArrowDown}');
      expect(active()).toBe(cell('r5', 'gain'));
    },
  );

  it('shows an editable card per row in a narrow container', async () => {
    const onRows = vi.fn<(rows: Rung[]) => void>();
    render(<Ladder width={340} onRows={onRows} />);
    const list = await screen.findByRole('list', { name: 'Exposure ladder' });
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
    const cards = [...list.querySelectorAll(':scope > li > [role="group"]')];
    expect(cards).toHaveLength(6);
    expect(cards[0]).toHaveAccessibleName('Rung 1');
    expect(screen.getByRole('textbox', { name: 'Exposure, Rung 3' })).toBeInTheDocument();

    if (hasTouch) {
      await commands.tap('[data-card-row="r2"] [data-card-action="up"]');
    } else {
      await userEvent.click(screen.getByRole('button', { name: 'Move Rung 2 up' }));
    }
    await expect
      .poll(() => onRows.mock.lastCall?.[0].map((rung) => rung.id))
      .toEqual(['r2', 'r1', 'r3', 'r4', 'r5', 'r6']);
    // r1 (exposure 1) now follows r2 (exposure 2).
    const input = screen.getByRole('textbox', { name: 'Exposure, Rung 2' });
    expect(input).toHaveAccessibleDescription(PREVIOUS_RUNG_ERROR);
  });

  it('has no axe violations as a grid with an error, and as cards', async () => {
    const broken = exposureLadder.map((rung) =>
      rung.id === 'r4' ? { ...rung, exposureMs: 3 } : rung,
    );
    const { container, unmount } = render(<Ladder initial={broken} />);
    await screen.findByRole('grid');
    expect(hasText('1 problem to fix')).toBe(true);
    await expectNoAxeViolations(container);
    unmount();
    const cards = render(<Ladder initial={broken} width={340} />);
    await screen.findByRole('list', { name: 'Exposure ladder' });
    await expectNoAxeViolations(cards.container);
  });

  it('reads its strings from UIProvider messages', async () => {
    render(
      <UIProvider
        messages={overrides({
          editableAddRow: 'Add rung',
          editableErrorCount: ({ count }) => `${String(count)} to fix`,
        })}
      >
        <Ladder initial={exposureLadder.slice(0, 5)} />
      </UIProvider>,
    );
    await screen.findByRole('grid');
    await userEvent.click(screen.getByRole('button', { name: 'Add rung' }));
    await expect.poll(() => hasText('1 to fix')).toBe(true);
  });
});
