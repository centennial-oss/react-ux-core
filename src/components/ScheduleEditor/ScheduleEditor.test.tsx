import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { TierEditor } from '../TierEditor/TierEditor';
import { ScheduleEditor } from './ScheduleEditor';

/** The element at `index`, failing the test if there isn't one. */
function nth(elements: HTMLElement[], index: number): HTMLElement {
  const element = elements[index];
  if (!element) {
    throw new Error(`No element at ${String(index)}`);
  }
  return element;
}

describe('ScheduleEditor', () => {
  it('adds a period over the first uncovered time and edits its value', async () => {
    const onChange = vi.fn();
    render(
      <ScheduleEditor
        label="Demand limit"
        defaultValue={[{ start: '00:00', end: '06:00', value: 40 }]}
        onChange={onChange}
        unit="kW"
        newRowValue={50}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Add period' }));
    expect(onChange).toHaveBeenLastCalledWith([
      { start: '00:00', end: '06:00', value: 40 },
      { start: '06:00', end: '24:00', value: 50 },
    ]);
    const rows = within(screen.getByRole('group', { name: 'Demand limit' })).getAllByRole(
      'listitem',
    );
    expect(rows).toHaveLength(2);
    const value = within(nth(rows, 1)).getByRole('textbox', { name: 'Value' });
    await userEvent.clear(value);
    await userEvent.type(value, '75{Enter}');
    expect(onChange).toHaveBeenLastCalledWith([
      { start: '00:00', end: '06:00', value: 40 },
      { start: '06:00', end: '24:00', value: 75 },
    ]);
  });

  it('describes the day in its preview, and flags problems on each period', () => {
    render(
      <ScheduleEditor
        label="Windows"
        defaultValue={[
          { start: '00:00', end: '05:00', value: 1 },
          { start: '04:00', end: '07:00', value: 2 },
        ]}
        isFullDayRequired
      />,
    );
    const preview = screen.getByRole('img', { name: /^Schedule over the day/ });
    expect(preview.getAttribute('aria-label')).toContain('Not covered');
    const first = screen.getByRole('group', { name: /12:00\sAM–5:00\sAM|00:00–05:00/ });
    expect(first).toHaveAccessibleDescription(/Overlaps/);
    expect(screen.getByText(/^Not covered: /)).toBeInTheDocument();
  });

  it('removes a period', async () => {
    const onChange = vi.fn();
    render(
      <ScheduleEditor
        label="Limits"
        defaultValue={[
          { start: '00:00', end: '12:00', value: 1 },
          { start: '12:00', end: '24:00', value: 2 },
        ]}
        onChange={onChange}
      />,
    );
    await userEvent.click(nth(screen.getAllByRole('button', { name: /^Remove / }), 0));
    expect(onChange).toHaveBeenLastCalledWith([{ start: '12:00', end: '24:00', value: 2 }]);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <ScheduleEditor label="Limits" defaultValue={[{ start: '00:00', end: '24:00', value: 1 }]} />,
    );
    await expectNoAxeViolations(container);
  });
});

describe('TierEditor', () => {
  it('adds a tier from the last upper bound and flags gaps', async () => {
    const onChange = vi.fn();
    render(
      <TierEditor
        label="Energy price"
        defaultValue={[
          { from: 0, to: 500, value: 0.18 },
          { from: 600, to: 900, value: 0.15 },
        ]}
        onChange={onChange}
        boundUnit="kWh"
      />,
    );
    expect(
      screen.getByText('Should start at 500 kWh, where the previous tier ends'),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Add tier' }));
    expect(onChange).toHaveBeenLastCalledWith([
      { from: 0, to: 500, value: 0.18 },
      { from: 600, to: 900, value: 0.15 },
      { from: 900, to: null, value: 0 },
    ]);
    expect(screen.getByRole('group', { name: '900 kWh and above' })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <TierEditor label="Energy price" defaultValue={[{ from: 0, to: null, value: 0.18 }]} />,
    );
    await expectNoAxeViolations(container);
  });
});
