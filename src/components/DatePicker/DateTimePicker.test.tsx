import { parseAbsolute, parseZonedDateTime, type ZonedDateTime } from '@internationalized/date';
import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { UIProvider } from '../../provider/UIProvider';
import { DateTimePicker } from './DateTimePicker';

const isPhone = window.matchMedia('(max-width: 639.98px)').matches;

const denver = 'America/Denver';
const meeting = parseZonedDateTime('2025-03-15T14:30[America/Denver]');

/**
 * Waits for the popover's fade-in or the sheet's slide-in to finish: colour checks need full opacity, and a sheet
 * moves focus in only once it has arrived.
 */
async function settle(dialog: HTMLElement) {
  await expect.poll(() => document.querySelector('[data-entering]'), { timeout: 3000 }).toBeNull();
  if (isPhone) {
    await expect.poll(() => dialog.closest('[data-expanded]'), { timeout: 3000 }).not.toBeNull();
  }
  await expect.poll(() => dialog.contains(document.activeElement), { timeout: 3000 }).toBe(true);
  return dialog;
}

async function openCalendar() {
  await userEvent.click(screen.getByRole('button', { name: 'Calendar Meeting' }));
  return settle(await screen.findByRole('dialog'));
}

function dayButton(dialog: HTMLElement, day: number) {
  const cell = within(dialog)
    .getAllByRole('button', { name: new RegExp(`\\b${String(day)}\\b`) })
    .find((button) => button.closest('td') && button.closest('[data-outside-month]') === null);
  if (!cell) {
    throw new Error(`No day ${String(day)}`);
  }
  return cell;
}

/** The text of the field's segments, joined. */
function fieldText() {
  return screen.getByRole('group', { name: 'Meeting' }).textContent;
}

describe('DateTimePicker', () => {
  it('reports typed dates and times as ZonedDateTime in its time zone', async () => {
    const onChange = vi.fn();
    render(<DateTimePicker label="Meeting" timeZone={denver} hourCycle={24} onChange={onChange} />);
    await userEvent.click(screen.getByRole('spinbutton', { name: /month/i }));
    await userEvent.keyboard('031520251430');
    const value = onChange.mock.lastCall?.[0] as ZonedDateTime;
    expect(value.toString()).toBe('2025-03-15T14:30:00-06:00[America/Denver]');
  });

  it('shows a value from another zone as the same instant in its time zone, with the zone', () => {
    render(
      <DateTimePicker
        label="Meeting"
        timeZone={denver}
        defaultValue={parseAbsolute('2025-03-15T20:30:00Z', 'UTC')}
      />,
    );
    expect(fieldText()).toContain('2:30');
    expect(fieldText()).toContain('MDT');
  });

  it('uses the provider’s time zone by default and hides the zone with hideTimeZone', () => {
    render(
      <UIProvider timeZone="Asia/Tokyo">
        <DateTimePicker
          label="Meeting"
          hideTimeZone
          hourCycle={24}
          defaultValue={parseAbsolute('2025-03-15T00:00:00Z', 'UTC')}
        />
      </UIProvider>,
    );
    expect(fieldText()).toContain('09:00');
    expect(screen.queryByRole('textbox', { name: /time zone/i })).toBeNull();
  });

  it('shows 24-hour or 12-hour time from hourCycle', () => {
    render(
      <>
        <DateTimePicker label="Meeting" timeZone={denver} defaultValue={meeting} hourCycle={24} />
        <DateTimePicker label="Other" timeZone={denver} defaultValue={meeting} hourCycle={12} />
      </>,
    );
    expect(fieldText()).toContain('14');
    const other = screen.getByRole('group', { name: 'Other' });
    expect(within(other).getByRole('spinbutton', { name: /AM\/PM/i })).toBeInTheDocument();
  });

  it('picks a day in the calendar and the time below it, keeping the popover open', async () => {
    const onChange = vi.fn();
    render(
      <DateTimePicker
        label="Meeting"
        timeZone={denver}
        hourCycle={24}
        defaultValue={meeting}
        onChange={onChange}
      />,
    );
    const dialog = await openCalendar();
    await userEvent.click(dayButton(dialog, 20));
    expect((onChange.mock.lastCall?.[0] as ZonedDateTime).toString()).toBe(
      '2025-03-20T14:30:00-06:00[America/Denver]',
    );
    expect(dialog.isConnected).toBe(true);
    const hour = within(dialog).getByRole('spinbutton', { name: /hour/i });
    await userEvent.click(hour);
    await userEvent.keyboard('{ArrowUp}');
    expect((onChange.mock.lastCall?.[0] as ZonedDateTime).toString()).toBe(
      '2025-03-20T15:30:00-06:00[America/Denver]',
    );
  });

  it('commits a day picked without a time at midnight in the zone when it closes', async () => {
    const onChange = vi.fn();
    render(<DateTimePicker label="Meeting" timeZone={denver} onChange={onChange} />);
    const dialog = await openCalendar();
    await userEvent.click(dayButton(dialog, 20));
    expect(onChange).not.toHaveBeenCalled();
    if (isPhone) {
      await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    } else {
      await userEvent.keyboard('{Escape}');
    }
    await expect.poll(() => onChange.mock.calls.length, { timeout: 3000 }).toBe(1);
    const value = onChange.mock.lastCall?.[0] as ZonedDateTime;
    expect([value.day, value.hour, value.minute, value.second, value.timeZone]).toEqual([
      20,
      0,
      0,
      0,
      denver,
    ]);
  });

  it('works controlled', async () => {
    function Controlled() {
      const [value, setValue] = useState<ZonedDateTime | null>(meeting);
      return (
        <>
          <DateTimePicker label="Meeting" timeZone={denver} value={value} onChange={setValue} />
          <output data-testid="value">{value?.toAbsoluteString() ?? 'none'}</output>
        </>
      );
    }
    render(<Controlled />);
    await userEvent.click(screen.getByRole('spinbutton', { name: /minute/i }));
    await userEvent.keyboard('{ArrowUp}');
    await expect
      .poll(() => screen.getByTestId('value').textContent)
      .toBe('2025-03-15T20:31:00.000Z');
  });

  it('shows the error message and marks the segments invalid', () => {
    render(
      <DateTimePicker
        label="Meeting"
        timeZone={denver}
        defaultValue={meeting}
        isInvalid
        errorMessage="Pick a time in office hours"
      />,
    );
    expect(screen.getByText('Pick a time in office hours')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /hour/i })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it.runIf(isPhone)('has large, touch-sized time segments in the phone sheet', async () => {
    render(<DateTimePicker label="Meeting" timeZone={denver} defaultValue={meeting} />);
    const dialog = await openCalendar();
    expect(dialog.closest('[data-position="bottom"]')).not.toBeNull();
    const hour = within(dialog).getByRole('spinbutton', { name: /hour/i });
    expect(hour.getBoundingClientRect().width).toBeGreaterThanOrEqual(44);
    expect(parseFloat(getComputedStyle(hour).fontSize)).toBeGreaterThanOrEqual(18);
  });

  it('has no accessibility violations, closed or open', async () => {
    const { container } = render(
      <>
        <DateTimePicker label="Meeting" timeZone={denver} defaultValue={meeting} />
        <DateTimePicker label="Other" timeZone={denver} isInvalid errorMessage="Required" />
      </>,
    );
    await expectNoAxeViolations(container);
    await expectNoAxeViolations(await openCalendar());
  });
});
