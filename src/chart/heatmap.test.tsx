import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { CalendarHeatmap } from './CalendarHeatmap';
import { HeatmapChart } from './HeatmapChart';

const rows = [
  { id: 'r1', label: 'Kinematics' },
  { id: 'r2', label: 'Optics' },
];
const columns = [
  { id: 'c1', label: 'Oct 5' },
  { id: 'c2', label: 'Oct 12' },
  { id: 'c3', label: 'Oct 19' },
];
const values = [
  [71, 64, null],
  [48, 55, 80],
];

function Chart(props: { onCellPress?: (row: string, column: string) => void }) {
  return (
    <HeatmapChart
      title="Quiz scores"
      rows={rows}
      columns={columns}
      values={values}
      unit="%"
      {...props}
    />
  );
}

describe('HeatmapChart', () => {
  it('is a grid named by its title, with each cell named by its row, column and value', () => {
    render(<Chart />);
    const grid = screen.getByRole('grid', { name: 'Quiz scores' });
    expect(
      within(grid).getByRole('gridcell', { name: 'Kinematics, Oct 5, 71 %' }),
    ).toBeInTheDocument();
    expect(
      within(grid).getByRole('gridcell', { name: 'Kinematics, Oct 19, No data' }),
    ).toBeInTheDocument();
    expect(grid).toHaveAccessibleDescription(
      '2 rows by 3 columns. Lowest: Optics, Oct 5, 48 %. Highest: Optics, Oct 19, 80 %.',
    );
  });

  it('moves cell to cell with the arrow keys, Home and End, with one tab stop', async () => {
    render(<Chart />);
    // Tab past the chart's toolbar to the grid's one tab stop.
    for (
      let press = 0;
      press < 5 && document.activeElement?.getAttribute('role') !== 'gridcell';
      press++
    ) {
      await userEvent.keyboard('{Tab}');
    }
    expect(screen.getByRole('gridcell', { name: /Kinematics, Oct 5/ })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('gridcell', { name: /Kinematics, Oct 12/ })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('gridcell', { name: /Optics, Oct 12/ })).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('gridcell', { name: /Optics, Oct 19/ })).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(screen.getByRole('gridcell', { name: /Optics, Oct 5/ })).toHaveFocus();
    expect(screen.getAllByRole('gridcell').filter((cell) => cell.tabIndex === 0)).toHaveLength(1);
  });

  it('calls onCellPress on a click or Enter', async () => {
    const onCellPress = vi.fn();
    render(<Chart onCellPress={onCellPress} />);
    await userEvent.click(screen.getByRole('gridcell', { name: /Optics, Oct 12/ }));
    expect(onCellPress).toHaveBeenLastCalledWith('r2', 'c2');
    await userEvent.keyboard('{ArrowUp}{Enter}');
    expect(onCellPress).toHaveBeenLastCalledWith('r1', 'c2');
  });

  it('shows the same values as a table', async () => {
    render(
      // Wide enough for the table (not the phone cards) on every test screen.
      <div style={{ width: 900 }}>
        <Chart />
      </div>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'View as table' }));
    const table = screen.getByRole('table', { name: 'Quiz scores' });
    expect(
      within(table)
        .getAllByRole('rowheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Kinematics', 'Optics']);
    expect(
      within(table)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['71', '64', '', '48', '55', '80']);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Chart />);
    await expectNoAxeViolations(container);
  });
});

/** A theme token as the rgb() string the browser reports for a background colour. */
function tokenColor(name: string): string {
  const probe = document.createElement('span');
  probe.style.backgroundColor = `var(${name})`;
  document.body.append(probe);
  const color = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return color;
}

function dayColors(): string[] {
  return screen
    .getAllByRole('gridcell')
    .filter((cell) => cell.getAttribute('aria-hidden') !== 'true')
    .map((cell) => getComputedStyle(cell).backgroundColor);
}

describe('CalendarHeatmap', () => {
  it.each([
    ['no values', {}],
    ['all-zero values', { '2026-10-06': 0, '2026-10-07': 0 }],
  ])('draws an empty calendar (%s) in the lowest colour, with a notice', (_, values) => {
    render(<CalendarHeatmap title="Study" start="2026-10-05" end="2026-10-18" values={values} />);
    const lowest = tokenColor('--color-heat-accent-1');
    const colors = dayColors();
    expect(colors).toHaveLength(14);
    expect(new Set(colors)).toEqual(new Set([lowest]));
    expect(screen.getByText('No activity yet')).toBeVisible();
    // The legend has one entry, not a gradient from 0 to 0.
    const legend = screen.getByRole('group', { name: 'Scale' });
    expect(legend.textContent).toBe('0');
  });

  it('draws a single active day at the top of the ramp', () => {
    render(
      <CalendarHeatmap
        title="Study"
        start="2026-10-05"
        end="2026-10-18"
        values={{ '2026-10-07': 3 }}
      />,
    );
    expect(screen.getByRole('gridcell', { name: /October 7, 2026, 3$/ })).toHaveStyle({
      backgroundColor: tokenColor('--color-heat-accent-7'),
    });
    expect(screen.getByRole('gridcell', { name: /October 8, 2026, 0$/ })).toHaveStyle({
      backgroundColor: tokenColor('--color-heat-accent-1'),
    });
    expect(screen.queryByText('No activity yet')).toBeNull();
  });

  it('scrolls a long calendar inside the plot, never the page', () => {
    render(
      // A page's usual side padding (the toolbar's touch targets reach a little past its buttons).
      <div className="px-4">
        <CalendarHeatmap
          title="Study"
          start="2026-04-16"
          end="2026-10-15"
          values={{ '2026-05-01': 2 }}
        />
      </div>,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth,
    );
  });

  it('names each day by its date and reports presses as ISO dates', async () => {
    const onDayPress = vi.fn();
    render(
      <CalendarHeatmap
        title="Study"
        start="2026-10-05"
        end="2026-10-18"
        values={{ '2026-10-07': 3 }}
        unit="sessions"
        onDayPress={onDayPress}
      />,
    );
    const day = screen.getByRole('gridcell', { name: /October 7, 2026, 3 sessions/ });
    await userEvent.click(day);
    expect(onDayPress).toHaveBeenCalledWith('2026-10-07');
    // Days in the range without a value count as 0.
    expect(
      screen.getByRole('gridcell', { name: /October 8, 2026, 0 sessions/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('gridcell', { name: /October 19, 2026/ })).toBeNull();
  });
});
