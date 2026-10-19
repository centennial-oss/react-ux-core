import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { StatTile } from './StatTile';

describe('StatTile', () => {
  it('is a group labelled by its label, showing value and unit', () => {
    render(<StatTile label="Energy today" value="1,284" unit="kWh" />);
    const tile = screen.getByRole('group', { name: 'Energy today' });
    expect(tile.textContent).toContain('1,284');
    expect(tile.textContent).toContain('kWh');
  });

  it('describes the change in words, not only with an arrow and colour', () => {
    render(<StatTile label="Revenue" value="$12k" delta={{ value: '12%', direction: 'up' }} />);
    expect(screen.getByText('Up 12%')).toHaveClass('sr-only');
  });

  it('lets the delta tone be set when up is bad', () => {
    render(
      <StatTile
        label="Errors"
        value="42"
        delta={{ value: '8', direction: 'up', tone: 'danger' }}
      />,
    );
    expect(screen.getByText('Up 8').parentElement?.className).toContain('text-danger-fg');
  });

  it('shows a placeholder and aria-busy while loading', () => {
    render(<StatTile label="Revenue" value="$12k" isLoading />);
    expect(screen.getByRole('group', { name: 'Revenue' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('$12k')).toBeNull();
  });

  it('fits a long value within a narrow tile', () => {
    render(
      <div style={{ width: 160 }}>
        <StatTile label="Lifetime energy" value="123,456,789,012" unit="kWh" />
      </div>,
    );
    const tile = screen.getByRole('group', { name: 'Lifetime energy' });
    expect(tile.scrollWidth).toBeLessThanOrEqual(tile.clientWidth);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <StatTile
        label="Energy today"
        value="1,284"
        unit="kWh"
        delta={{ value: '4%', direction: 'down' }}
        sparkline={[3, 5, 4, 8, 6]}
        footer="vs. yesterday"
      />,
    );
    await expectNoAxeViolations(container);
  });

  it('can be a button named by what it shows, then what pressing does (pressable mode)', async () => {
    const onPress = vi.fn();
    const onHoverChange = vi.fn();
    const { container } = render(
      <StatTile
        label="Hall temperature"
        value="21.4"
        unit="°C"
        footer="2 of 3"
        onPress={onPress}
        pressHint="Show the next value"
        onHoverChange={onHoverChange}
      />,
    );
    const button = screen.getByRole('button', {
      name: 'Hall temperature 21.4 °C 2 of 3 Show the next value',
    });
    expect(screen.queryByRole('group')).toBeNull();
    await userEvent.click(button);
    expect(onPress).toHaveBeenCalledTimes(1);
    await expectNoAxeViolations(container);
  });
});
