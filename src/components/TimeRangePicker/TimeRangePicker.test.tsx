import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import type { TimeRange } from './resolveTimeRange';
import { TimeRangePicker } from './TimeRangePicker';

const isPhone = window.matchMedia('(max-width: 639.98px)').matches;
const hasTouch = navigator.maxTouchPoints > 0;

const last24h: TimeRange = { kind: 'relative', from: '-24h', to: 'now' };
const october: TimeRange = {
  kind: 'absolute',
  start: '2025-10-01T06:00:00.000Z',
  end: '2025-10-08T06:00:00.000Z',
};

/** Waits for the popover's fade-in or the sheet's slide-in, and for focus to move in. */
async function settle(dialog: HTMLElement) {
  await expect.poll(() => document.querySelector('[data-entering]'), { timeout: 3000 }).toBeNull();
  if (isPhone) {
    await expect.poll(() => dialog.closest('[data-expanded]'), { timeout: 3000 }).not.toBeNull();
  }
  await expect.poll(() => dialog.contains(document.activeElement), { timeout: 3000 }).toBe(true);
  return dialog;
}

async function open(name = /Time range/) {
  await userEvent.click(screen.getByRole('button', { name }));
  return settle(await screen.findByRole('dialog'));
}

async function closed() {
  await expect.poll(() => screen.queryByRole('dialog'), { timeout: 3000 }).toBeNull();
}

describe('TimeRangePicker', () => {
  it('names the trigger with its label and the current range', () => {
    render(
      <>
        <TimeRangePicker label="Time range" defaultValue={last24h} />
        <TimeRangePicker aria-label="Chart range" defaultValue={{ ...last24h, from: '-3h' }} />
        <TimeRangePicker aria-label="Empty" />
        <TimeRangePicker defaultValue={{ ...last24h, from: '-7d' }} />
      </>,
    );
    expect(screen.getByRole('button', { name: 'Time range Last 24 hours' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chart range Last 3 hours' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Empty Select…' })).toBeInTheDocument();
    // Without a label, the trigger falls back to the "Time range" message.
    expect(screen.getByRole('button', { name: 'Time range Last 7 days' })).toBeInTheDocument();
  });

  it('applies a preset with one press and closes', async () => {
    const onChange = vi.fn();
    render(<TimeRangePicker label="Time range" defaultValue={last24h} onChange={onChange} />);
    const dialog = await open();
    const presets = within(dialog).getByRole('listbox', { name: 'Presets' });
    expect(within(presets).getByRole('option', { name: 'Last 24 hours' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await userEvent.click(within(presets).getByRole('option', { name: 'Last 7 days' }));
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'relative', from: '-7d', to: 'now' });
    await closed();
    expect(screen.getByRole('button', { name: /Time range/ }).textContent).toContain('Last 7 days');
  });

  it('closes when the current preset is pressed again', async () => {
    const onChange = vi.fn();
    render(<TimeRangePicker label="Time range" defaultValue={last24h} onChange={onChange} />);
    const dialog = await open();
    await userEvent.click(within(dialog).getByRole('option', { name: 'Last 24 hours' }));
    expect(onChange).toHaveBeenLastCalledWith(last24h);
    await closed();
  });

  it('works from the keyboard: arrows move through presets, Enter applies', async () => {
    const onChange = vi.fn();
    render(<TimeRangePicker label="Time range" defaultValue={last24h} onChange={onChange} />);
    screen.getByRole('button', { name: /Time range/ }).focus();
    await userEvent.keyboard('{Enter}');
    await settle(await screen.findByRole('dialog'));
    if (isPhone) {
      // The sheet focuses itself; Tab passes the close button and reaches the presets.
      await userEvent.tab();
      await userEvent.tab();
    }
    await expect.poll(() => document.activeElement?.textContent ?? '').toBe('Last 24 hours');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await expect.poll(() => document.activeElement?.textContent ?? '').toBe('Last 30 days');
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'relative', from: '-30d', to: 'now' });
    await closed();
    await expect
      .poll(() => document.activeElement === screen.getByRole('button', { name: /Time range/ }))
      .toBe(true);
  });

  it('applies a relative range from the amount and unit', async () => {
    const onChange = vi.fn();
    render(<TimeRangePicker label="Time range" defaultValue={last24h} onChange={onChange} />);
    const dialog = await open();
    await userEvent.click(within(dialog).getByRole('tab', { name: 'Relative' }));
    const amount = within(dialog).getByRole('textbox', { name: 'Amount' });
    expect(amount).toHaveAccessibleDescription('Last 24 hours');
    expect(within(dialog).getByRole('radiogroup', { name: 'Unit' })).toBeInTheDocument();
    await userEvent.tripleClick(amount);
    await userEvent.keyboard('3');
    await userEvent.click(within(dialog).getByRole('radio', { name: 'days' }));
    expect(within(dialog).getByText('Last 3 days')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Apply' }));
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'relative', from: '-3d', to: 'now' });
    await closed();
    expect(screen.getByRole('button', { name: /Time range/ }).textContent).toContain('Last 3 days');
  });

  it('disables Apply while the amount is empty', async () => {
    render(<TimeRangePicker label="Time range" defaultValue={last24h} />);
    const dialog = await open();
    const amount = within(dialog).getByRole('textbox', { name: 'Amount' });
    expect(amount).toHaveAccessibleDescription('Last 24 hours');
    expect(within(dialog).getByRole('radiogroup', { name: 'Unit' })).toBeInTheDocument();
    await userEvent.tripleClick(amount);
    await userEvent.keyboard('{Backspace}');
    // The number field commits its value when it loses focus.
    await userEvent.tab();
    await expect
      .poll(() => within(dialog).getByRole('button', { name: 'Apply' }).hasAttribute('disabled'))
      .toBe(true);
  });

  it('applies an absolute range as UTC instants, entered in its time zone', async () => {
    const onChange = vi.fn();
    render(
      <TimeRangePicker
        label="Time range"
        timeZone="America/Denver"
        hourCycle={24}
        defaultValue={october}
        onChange={onChange}
      />,
    );
    const trigger = screen.getByRole('button', { name: /Time range/ });
    expect(trigger.textContent).toContain('Oct 1');
    expect(trigger.textContent).toContain('Oct 8');
    const dialog = await open();
    expect(within(dialog).getByRole('tab', { name: 'Absolute' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const to = within(dialog).getByRole('group', { name: 'To' });
    await userEvent.click(within(to).getByRole('spinbutton', { name: /day/i }));
    await userEvent.keyboard('15');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Apply' }));
    expect(onChange).toHaveBeenLastCalledWith({
      kind: 'absolute',
      start: '2025-10-01T06:00:00.000Z',
      end: '2025-10-15T06:00:00.000Z',
    });
  });

  it('marks an end before the start invalid and disables Apply', async () => {
    render(
      <TimeRangePicker
        label="Time range"
        timeZone="America/Denver"
        hourCycle={24}
        defaultValue={october}
      />,
    );
    const dialog = await open();
    const to = within(dialog).getByRole('group', { name: 'To' });
    const month = within(to).getByRole('spinbutton', { name: /month/i });
    await userEvent.click(month);
    await userEvent.keyboard('09');
    await expect.poll(() => month.getAttribute('aria-invalid')).toBe('true');
    expect(within(dialog).getByRole('button', { name: 'Apply' })).toBeDisabled();
  });

  it('takes custom presets', async () => {
    const onChange = vi.fn();
    render(
      <TimeRangePicker
        label="Time range"
        presets={[
          { id: 'today', label: 'Today', value: { kind: 'relative', from: 'now/d', to: 'now' } },
          { id: 'week', label: 'This week', value: { kind: 'relative', from: 'now/w', to: 'now' } },
        ]}
        defaultValue={{ kind: 'relative', from: 'now/d', to: 'now' }}
        onChange={onChange}
      />,
    );
    expect(screen.getByRole('button', { name: /Time range/ }).textContent).toContain('Today');
    const dialog = await open();
    expect(within(dialog).getAllByRole('option')).toHaveLength(2);
    await userEvent.click(within(dialog).getByRole('option', { name: 'This week' }));
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'relative', from: 'now/w', to: 'now' });
  });

  it('works controlled', async () => {
    function Controlled() {
      const [value, setValue] = useState<TimeRange>(last24h);
      return (
        <>
          <TimeRangePicker label="Time range" value={value} onChange={setValue} />
          <output data-testid="value">{JSON.stringify(value)}</output>
        </>
      );
    }
    render(<Controlled />);
    const dialog = await open();
    await userEvent.click(within(dialog).getByRole('option', { name: 'Last hour' }));
    await expect
      .poll(() => screen.getByTestId('value').textContent)
      .toBe('{"kind":"relative","from":"-1h","to":"now"}');
    expect(screen.getByRole('button', { name: /Time range/ }).textContent).toContain('Last hour');
  });

  it('cancels without changing the range', async () => {
    const onChange = vi.fn();
    render(<TimeRangePicker label="Time range" defaultValue={last24h} onChange={onChange} />);
    const dialog = await open();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await closed();
    expect(onChange).not.toHaveBeenCalled();
  });

  it.runIf(hasTouch)('opens with a tap', async () => {
    render(<TimeRangePicker label="Time range" defaultValue={last24h} data-testid="picker" />);
    await commands.tap('[data-testid="picker"] button');
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it.runIf(isPhone)('is a full-screen sheet with the presets first on phones', async () => {
    render(
      <div className="p-4">
        <TimeRangePicker label="Time range" defaultValue={last24h} />
      </div>,
    );
    const dialog = await open();
    expect(dialog.closest('[data-position="bottom"]')).not.toBeNull();
    const presets = within(dialog).getByRole('listbox');
    const tabs = within(dialog).getByRole('tablist');
    expect(presets.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      tabs.getBoundingClientRect().top,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });

  it.runIf(!isPhone)('is a popover anchored under the trigger on tablet and desktop', async () => {
    render(<TimeRangePicker label="Time range" defaultValue={last24h} />);
    const dialog = await open();
    expect(dialog.closest('[data-placement]')).not.toBeNull();
    expect(dialog.getBoundingClientRect().top).toBeGreaterThan(
      screen.getByRole('button', { name: /Time range/ }).getBoundingClientRect().bottom,
    );
  });

  it.runIf(hasTouch)('has a trigger at least the minimum touch target tall', () => {
    render(<TimeRangePicker label="Time range" size="sm" defaultValue={last24h} />);
    expect(
      screen.getByRole('button', { name: /Time range/ }).getBoundingClientRect().height,
    ).toBeGreaterThanOrEqual(44);
  });

  it('has no accessibility violations, closed or open', async () => {
    const { container } = render(
      <>
        <TimeRangePicker label="Time range" defaultValue={last24h} />
        <TimeRangePicker aria-label="Other range" isDisabled />
      </>,
    );
    await expectNoAxeViolations(container);
    const dialog = await open();
    await expectNoAxeViolations(dialog);
    await userEvent.click(within(dialog).getByRole('tab', { name: 'Absolute' }));
    await expectNoAxeViolations(dialog);
  });
});
