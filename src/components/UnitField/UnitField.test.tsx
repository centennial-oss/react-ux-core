import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import type { Messages } from '../../provider/messages';
import { UIProvider } from '../../provider/UIProvider';
import { expectNoAxeViolations } from '../../../test/axe';
import { BitrateField } from './BitrateField';
import { ByteSizeField } from './ByteSizeField';
import { DurationField } from './DurationField';
import type { UnitFieldMessages } from './messages';

const hasTouch = navigator.maxTouchPoints > 0;
const isPhone = window.innerWidth < 640;

function input(name: string) {
  return screen.getByRole<HTMLInputElement>('textbox', { name });
}

function unitSelect(name: string) {
  return screen.getByRole('button', { name: new RegExp(name) });
}

/** The selected unit's text in a unit select's trigger. */
function selectedUnit(name: string) {
  return unitSelect(name).textContent;
}

async function typeAndCommit(field: HTMLInputElement, text: string) {
  await userEvent.clear(field);
  await userEvent.type(field, text);
  await userEvent.keyboard('{Enter}');
}

describe('DurationField', () => {
  it('stores "1h30m" as 5,400,000 ms and shows it in friendly units', async () => {
    const onChange = vi.fn();
    render(<DurationField label="TTL" onChange={onChange} />);
    const field = input('TTL');
    await typeAndCommit(field, '1h30m');
    expect(onChange).toHaveBeenLastCalledWith(5_400_000);
    expect(field).toHaveValue('1h 30m');
    expect(selectedUnit('Unit for TTL')).toBe('h');
    expect(field).toHaveAccessibleDescription('1 hour 30 minutes');
  });

  it('switches the unit when a single unit is typed', async () => {
    const onChange = vi.fn();
    render(<DurationField label="Timeout" onChange={onChange} />);
    const field = input('Timeout');
    await typeAndCommit(field, '2h');
    expect(onChange).toHaveBeenLastCalledWith(7_200_000);
    expect(field).toHaveValue('2');
    expect(selectedUnit('Unit for Timeout')).toBe('h');
  });

  it('reads a plain number in the selected unit, and keeps the digits when the unit changes', async () => {
    const onChange = vi.fn();
    render(<DurationField label="Retention" defaultUnit="m" onChange={onChange} />);
    const field = input('Retention');
    await typeAndCommit(field, '45');
    expect(onChange).toHaveBeenLastCalledWith(2_700_000);
    expect(field).toHaveValue('45');

    await userEvent.click(unitSelect('Unit for Retention'));
    await userEvent.click(await screen.findByRole('option', { name: 'h' }));
    expect(onChange).toHaveBeenLastCalledWith(162_000_000);
    expect(field).toHaveValue('45');
    expect(selectedUnit('Unit for Retention')).toBe('h');
  });

  it('re-expresses typed units in a newly chosen unit', async () => {
    const onChange = vi.fn();
    render(<DurationField label="TTL" defaultValue={5_400_000} onChange={onChange} />);
    await userEvent.click(unitSelect('Unit for TTL'));
    await userEvent.click(await screen.findByRole('option', { name: 'm' }));
    expect(input('TTL')).toHaveValue('90');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows the largest whole unit with display="single"', () => {
    render(<DurationField label="TTL" defaultValue={5_400_000} display="single" />);
    expect(input('TTL')).toHaveValue('90');
    expect(selectedUnit('Unit for TTL')).toBe('m');
  });

  it('checks min and max in the base unit, with friendly messages', async () => {
    const onChange = vi.fn();
    render(<DurationField label="Session" maxValue={86_400_000} onChange={onChange} />);
    const field = input('Session');
    await typeAndCommit(field, '25h');
    expect(onChange).toHaveBeenLastCalledWith(90_000_000);
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(document.body.textContent).toEqual(expect.stringContaining('Must be at most 1 day'));
  });

  it('shows an error for unreadable text without reporting it', async () => {
    const onChange = vi.fn();
    render(<DurationField label="TTL" onChange={onChange} />);
    const field = input('TTL');
    await typeAndCommit(field, 'soon');
    expect(onChange).not.toHaveBeenCalled();
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveValue('soon');
    expect(document.body.textContent).toEqual(
      expect.stringContaining('Enter a duration such as 90s or 1h 30m'),
    );
  });

  it('refuses compound text with allowsCompound={false}', async () => {
    render(<DurationField label="TTL" allowsCompound={false} />);
    await typeAndCommit(input('TTL'), '1h30m');
    expect(document.body.textContent).toEqual(
      expect.stringContaining('Enter a single amount, such as 90 or 90m'),
    );
  });

  it('commits when leaving the field and submits the base value with a form', async () => {
    const onChange = vi.fn();
    const { container } = render(
      <form>
        <DurationField label="TTL" name="ttl" onChange={onChange} />
      </form>,
    );
    await userEvent.type(input('TTL'), '90s');
    await userEvent.keyboard('{Tab}');
    expect(onChange).toHaveBeenLastCalledWith(90_000);
    expect(container.querySelector<HTMLInputElement>('input[name="ttl"]')?.value).toBe('90000');
  });

  it('follows a controlled value', () => {
    const { rerender } = render(<DurationField label="TTL" value={60_000} />);
    expect(input('TTL')).toHaveValue('1');
    rerender(<DurationField label="TTL" value={7_200_000} />);
    expect(input('TTL')).toHaveValue('2');
    expect(selectedUnit('Unit for TTL')).toBe('h');
    rerender(<DurationField label="TTL" value={null} />);
    expect(input('TTL')).toHaveValue('');
  });

  it.runIf(hasTouch)('takes typed text after a tap', async () => {
    const onChange = vi.fn();
    render(<DurationField label="TTL" onChange={onChange} />);
    await commands.tap('input[type="text"]');
    expect(input('TTL')).toHaveFocus();
    await userEvent.keyboard('2h{Enter}');
    expect(onChange).toHaveBeenLastCalledWith(7_200_000);
  });

  it.runIf(isPhone)('fits a phone screen without page scroll', () => {
    render(<DurationField label="Cache TTL" defaultValue={5_400_000} />);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });

  it('takes the app’s strings from UIProvider', async () => {
    const messages: Partial<Messages & UnitFieldMessages> = {
      unitFieldUnitFor: ({ label }) => `Einheit für ${label}`,
      unitFieldTooSmall: ({ min }) => `Mindestens ${min}`,
    };
    render(
      <UIProvider messages={messages}>
        <DurationField label="TTL" minValue={60_000} />
      </UIProvider>,
    );
    expect(unitSelect('Einheit für TTL')).toBeInTheDocument();
    await typeAndCommit(input('TTL'), '5s');
    expect(document.body.textContent).toEqual(expect.stringContaining('Mindestens 1 min'));
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <div className="flex flex-col gap-4">
        <DurationField label="TTL" defaultValue={5_400_000} description="How long to cache" />
        <DurationField label="Invalid" maxValue={1000} defaultValue={5000} />
        <ByteSizeField label="Quota" defaultValue={1_073_741_824} />
        <BitrateField label="Bitrate" defaultValue={4_500_000} isDisabled />
      </div>,
    );
    await expectNoAxeViolations(container);
  });
});

describe('ByteSizeField', () => {
  it('stores bytes and shows the largest exact unit', async () => {
    const onChange = vi.fn();
    render(<ByteSizeField label="Buffer" onChange={onChange} />);
    const field = input('Buffer');
    await typeAndCommit(field, '512 MiB');
    expect(onChange).toHaveBeenLastCalledWith(536_870_912);
    expect(field).toHaveValue('512');
    expect(selectedUnit('Unit for Buffer')).toBe('MiB');
    expect(field).toHaveAccessibleDescription('512 mebibytes');
    await typeAndCommit(field, '1536');
    expect(selectedUnit('Unit for Buffer')).toBe('GiB');
    expect(field).toHaveValue('1.5');
  });

  it('uses decimal units with system="si"', () => {
    render(<ByteSizeField label="Quota" system="si" defaultValue={1_500_000_000} />);
    expect(input('Quota')).toHaveValue('1.5');
    expect(selectedUnit('Unit for Quota')).toBe('GB');
    expect(input('Quota')).toHaveAccessibleDescription('1.5 gigabytes');
  });
});

describe('BitrateField', () => {
  it('shows 4,500,000 bps as 4.5 Mbps', () => {
    render(<BitrateField label="Video" defaultValue={4_500_000} />);
    expect(input('Video')).toHaveValue('4.5');
    expect(selectedUnit('Unit for Video')).toBe('Mbps');
    expect(input('Video')).toHaveAccessibleDescription('4.5 megabits per second');
  });

  it('parses typed bitrates', async () => {
    const onChange = vi.fn();
    render(<BitrateField label="Audio" onChange={onChange} />);
    await typeAndCommit(input('Audio'), '128k');
    expect(onChange).toHaveBeenLastCalledWith(128_000);
    expect(selectedUnit('Unit for Audio')).toBe('kbps');
  });
});
