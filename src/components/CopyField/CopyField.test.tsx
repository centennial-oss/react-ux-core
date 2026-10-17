import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { UIProvider } from '../../provider/UIProvider';
import type { Messages } from '../../provider/messages';
import { expectNoAxeViolations } from '../../../test/axe';
import { describedText } from '../../../test/clipboard';
import { CopyButton } from './CopyButton';
import { CopyField } from './CopyField';
import type { CopyFieldMessages } from './messages';

const hasTouch = navigator.maxTouchPoints > 0;

// A 120-character identifier.
const longId = `urn:observatory:archive:north-ridge:surveys/2026/messier/m31/${'a'.repeat(40)}/andromeda-v12.fits`;

function overrides(messages: Partial<CopyFieldMessages>): Partial<Messages> {
  return messages;
}

function mockClipboard(result: 'resolve' | 'reject' = 'resolve') {
  return result === 'resolve'
    ? vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    : vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Denied'));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CopyField', () => {
  it('shows a labelled read-only value with a "Copy {label}" button', () => {
    render(<CopyField label="Webhook URL" value="https://hooks.example.com/t/7f3c" />);
    const input = screen.getByRole('textbox', { name: 'Webhook URL' });
    expect(input).toHaveAttribute('readonly');
    expect(input).toHaveValue('https://hooks.example.com/t/7f3c');
    expect(input.className).toContain('font-mono');
    expect(screen.getByRole('button', { name: 'Copy Webhook URL' })).toBeInTheDocument();
  });

  it('copies, flips to a check and "Copied", announces it, and flips back after 2 s', async () => {
    const writeText = mockClipboard();
    const onCopy = vi.fn();
    render(<CopyField label="Observation ID" value="OBS-42" onCopy={onCopy} />);
    const button = screen.getByRole('button', { name: 'Copy Observation ID' });
    await userEvent.click(button);
    expect(writeText).toHaveBeenCalledWith('OBS-42');
    expect(onCopy).toHaveBeenCalledOnce();
    expect(button).toHaveAttribute('data-status', 'copied');
    expect(screen.getByText('Copied', { selector: '[aria-hidden="true"]' })).toBeVisible();
    expect(document.querySelector('[aria-live="polite"]')?.textContent).toBe('Copied');
    // The name stays the same, so focus doesn't announce a different button.
    expect(button).toHaveAccessibleName('Copy Observation ID');
    await expect.poll(() => button.getAttribute('data-status'), { timeout: 3000 }).toBe('idle');
  });

  it('copies the full value of a middle-truncated 120-character identifier', async () => {
    expect(longId).toHaveLength(120);
    const writeText = mockClipboard();
    render(
      <div style={{ width: 320 }}>
        <CopyField label="Archive object" value={longId} truncate="middle" />
      </div>,
    );
    const box = screen.getByRole('textbox', { name: 'Archive object' });
    expect(box).toHaveAttribute('aria-readonly', 'true');
    // The text is the whole value, with the start cut visually and the end kept.
    expect(box.textContent).toBe(longId);
    const [head, tail] = Array.from(box.children) as HTMLElement[];
    expect(head && head.scrollWidth > head.clientWidth).toBe(true);
    expect(tail?.textContent).toBe(longId.slice(-16));
    await userEvent.click(screen.getByRole('button', { name: 'Copy Archive object' }));
    expect(writeText).toHaveBeenCalledWith(longId);
  });

  it('shows and announces a failure', async () => {
    mockClipboard('reject');
    const onCopyError = vi.fn();
    render(<CopyField label="Token ID" value="tok-1" onCopyError={onCopyError} />);
    const button = screen.getByRole('button', { name: 'Copy Token ID' });
    await userEvent.click(button);
    expect(onCopyError).toHaveBeenCalledOnce();
    expect(button).toHaveAttribute('data-status', 'failed');
    const help = 'Couldn’t copy. Select the text and copy it instead.';
    expect(describedText(screen.getByRole('textbox', { name: 'Token ID' }))).toContain(help);
    expect(document.querySelector('[aria-live="polite"]')?.textContent).toBe(help);
  });

  it('still lets the text be selected by hand', async () => {
    render(<CopyField label="Observation ID" value="OBS-2026-0042" />);
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'Observation ID' });
    await userEvent.tripleClick(input);
    expect((input.selectionEnd ?? 0) - (input.selectionStart ?? 0)).toBe('OBS-2026-0042'.length);
  });

  it('renders actions before the copy button, and a description', () => {
    render(
      <CopyField
        label="Webhook URL"
        value="https://hooks.example.com"
        description="Send events here"
        actions={<button type="button">Open</button>}
      />,
    );
    const buttons = screen.getAllByRole('button');
    expect(
      buttons.map((button) => button.textContent || button.getAttribute('aria-label')),
    ).toEqual(['Open', 'Copy Webhook URL']);
    expect(describedText(screen.getByRole('textbox'))).toBe('Send events here');
  });

  it('names the button from copyLabel or aria-label when there is no plain-text label', () => {
    render(
      <>
        <CopyField aria-label="Station ID" value="NR-1" />
        <CopyField label={<b>Key</b>} copyLabel="key ID" value="k-1" />
      </>,
    );
    expect(screen.getByRole('button', { name: 'Copy Station ID' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy key ID' })).toBeInTheDocument();
  });

  it('takes its strings from the messages', () => {
    render(
      <UIProvider messages={overrides({ copyNamed: ({ label }) => `${label} kopieren` })}>
        <CopyField label="ID" value="1" />
      </UIProvider>,
    );
    expect(screen.getByRole('button', { name: 'ID kopieren' })).toBeInTheDocument();
  });

  it.runIf(hasTouch)('copies on tap', async () => {
    const writeText = mockClipboard();
    render(<CopyField label="ID" value="OBS-7" />);
    await commands.tap('button[aria-label="Copy ID"]');
    expect(writeText).toHaveBeenCalledWith('OBS-7');
  });

  it('copies with the keyboard', async () => {
    const writeText = mockClipboard();
    render(<CopyField label="ID" value="OBS-8" />);
    await userEvent.tab();
    expect(screen.getByRole('textbox', { name: 'ID' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Copy ID' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(writeText).toHaveBeenCalledWith('OBS-8');
  });

  it('fits a 360 px page without horizontal scroll', () => {
    render(
      <div className="p-2">
        <CopyField label="Archive" value={longId} />
        <CopyField label="Archive" value={longId} truncate="middle" />
      </div>,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth,
    );
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <div className="flex flex-col gap-4">
        <CopyField label="ID" value="OBS-1" description="Shown on reports" />
        <CopyField label="Archive" value={longId} truncate="middle" />
        <CopyField label="Disabled" value="OBS-2" isDisabled />
        <CopyField label="Invalid" value="OBS-3" errorMessage="Expired" />
      </div>,
    );
    await expectNoAxeViolations(container);
  });
});

describe('CopyButton', () => {
  it('is an icon button named "Copy" or "Copy {label}" that copies its value', async () => {
    const writeText = mockClipboard();
    render(
      <>
        <CopyButton value="a" />
        <CopyButton value="b" label="station ID" />
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Copy station ID' }));
    expect(writeText).toHaveBeenCalledWith('b');
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });

  it('shows "Copied" in its tooltip after a keyboard copy', async () => {
    mockClipboard();
    render(<CopyButton value="a" label="ID" />);
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => screen.queryByRole('tooltip')?.textContent).toBe('Copied');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<CopyButton value="a" label="ID" />);
    await expectNoAxeViolations(container);
  });
});
