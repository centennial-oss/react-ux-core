import { parseAbsolute, Time } from '@internationalized/date';
import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { UIProvider } from '../../provider/UIProvider';
import { TimeField } from './TimeField';

const isPhone = window.matchMedia('(max-width: 639.98px)').matches;
const hasTouch = navigator.maxTouchPoints > 0;

describe('TimeField', () => {
  it('is labelled and described, and reports typed times as Time', async () => {
    const onChange = vi.fn();
    render(
      <TimeField label="Opens at" description="Local time" hourCycle={24} onChange={onChange} />,
    );
    const group = screen.getByRole('group', { name: 'Opens at' });
    const hour = within(group).getByRole('spinbutton', { name: /hour/i });
    expect(hour).toHaveAccessibleDescription('Local time');
    await userEvent.click(hour);
    await userEvent.keyboard('0930');
    expect(onChange).toHaveBeenLastCalledWith(new Time(9, 30));
  });

  it('steps segments with the arrow keys', async () => {
    const onChange = vi.fn();
    render(<TimeField label="Opens at" defaultValue={new Time(9, 30)} onChange={onChange} />);
    await userEvent.click(screen.getByRole('spinbutton', { name: /minute/i }));
    await userEvent.keyboard('{ArrowDown}');
    expect(onChange).toHaveBeenLastCalledWith(new Time(9, 29));
  });

  it.runIf(hasTouch)('focuses a segment with a tap', async () => {
    render(<TimeField label="Opens at" defaultValue={new Time(9, 30)} />);
    await commands.tap('[role="spinbutton"][aria-label^="minute"]');
    await expect
      .poll(() => document.activeElement?.getAttribute('aria-label') ?? '')
      .toMatch(/^minute/);
  });

  it('shows 12- or 24-hour time from hourCycle, and seconds with granularity', () => {
    render(
      <>
        <TimeField label="Twelve" defaultValue={new Time(14, 5)} hourCycle={12} />
        <TimeField
          label="Twenty-four"
          defaultValue={new Time(14, 5, 9)}
          hourCycle={24}
          granularity="second"
        />
      </>,
    );
    const twelve = screen.getByRole('group', { name: 'Twelve' });
    expect(within(twelve).getByRole('spinbutton', { name: /AM\/PM/i })).toBeInTheDocument();
    expect(twelve.textContent).toContain('2');
    const twentyFour = screen.getByRole('group', { name: 'Twenty-four' });
    expect(within(twentyFour).queryByRole('spinbutton', { name: /AM\/PM/i })).toBeNull();
    expect(twentyFour.textContent).toContain('14');
    expect(within(twentyFour).getByRole('spinbutton', { name: /second/i }).textContent).toBe('09');
  });

  it('shows zoned values in its time zone, or the provider’s, and can hide the zone', () => {
    const instant = parseAbsolute('2025-03-15T20:30:00Z', 'UTC');
    render(
      <UIProvider timeZone="Asia/Tokyo">
        <TimeField label="Denver" timeZone="America/Denver" hourCycle={24} defaultValue={instant} />
        <TimeField label="Tokyo" hourCycle={24} defaultValue={instant} hideTimeZone />
      </UIProvider>,
    );
    const denver = screen.getByRole('group', { name: 'Denver' });
    expect(denver.textContent).toContain('14');
    expect(denver.textContent).toContain('MDT');
    const tokyo = screen.getByRole('group', { name: 'Tokyo' });
    expect(tokyo.textContent).toContain('05');
    expect(within(tokyo).queryByRole('textbox', { name: /time zone/i })).toBeNull();
  });

  it('works controlled', async () => {
    function Controlled() {
      const [value, setValue] = useState<Time | null>(new Time(9, 30));
      return (
        <>
          <TimeField label="Opens at" hourCycle={24} value={value} onChange={setValue} />
          <output data-testid="value">{value?.toString() ?? 'none'}</output>
        </>
      );
    }
    render(<Controlled />);
    await userEvent.click(screen.getByRole('spinbutton', { name: /hour/i }));
    await userEvent.keyboard('{ArrowUp}');
    await expect.poll(() => screen.getByTestId('value').textContent).toBe('10:30:00');
  });

  it('shows the error message when invalid', () => {
    render(
      <TimeField
        label="Opens at"
        defaultValue={new Time(3)}
        isInvalid
        errorMessage="Choose a time in business hours"
      />,
    );
    expect(screen.getByText('Choose a time in business hours')).toBeInTheDocument();
    const hour = screen.getByRole('spinbutton', { name: /hour/i });
    expect(hour).toHaveAttribute('aria-invalid', 'true');
    expect(hour).toHaveAccessibleDescription(/Choose a time in business hours/);
  });

  it.runIf(isPhone)('has large, touch-sized segments on phones', () => {
    render(<TimeField label="Opens at" defaultValue={new Time(9, 30)} />);
    const hour = screen.getByRole('spinbutton', { name: /hour/i });
    expect(hour.getBoundingClientRect().width).toBeGreaterThanOrEqual(44);
    expect(parseFloat(getComputedStyle(hour).fontSize)).toBeGreaterThanOrEqual(18);
    expect(
      screen.getByRole('group', { name: 'Opens at' }).getBoundingClientRect().height,
    ).toBeGreaterThanOrEqual(48);
  });

  it.runIf(hasTouch)('is at least the minimum touch target tall on touch screens', () => {
    render(<TimeField label="Opens at" size="sm" />);
    expect(
      screen.getByRole('group', { name: 'Opens at' }).getBoundingClientRect().height,
    ).toBeGreaterThanOrEqual(44);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <>
        <TimeField label="Opens at" description="Local time" isRequired />
        <TimeField label="Closes at" isInvalid errorMessage="Required" />
        <TimeField label="Fixed" defaultValue={new Time(9)} isReadOnly />
        <TimeField label="Disabled" defaultValue={new Time(9)} isDisabled />
      </>,
    );
    await expectNoAxeViolations(container);
  });
});
