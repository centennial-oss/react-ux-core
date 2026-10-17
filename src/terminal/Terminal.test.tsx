import { act, render, screen } from '@testing-library/react';
import { createRef, useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { createEchoShell, jobLog } from '../../test/terminal';
import { UIProvider } from '../provider/UIProvider';
import type { Messages } from '../provider/messages';
import type { ThemePreference } from '../provider/theme';
import type { TerminalMessages } from './messages';
import {
  Terminal,
  type TerminalConnectionStatus,
  type TerminalHandle,
  type TerminalProps,
} from './Terminal';
import { ansiTokens, readTerminalLook } from './theme';

const isDesktop = window.innerWidth >= 1024;
const isTouch = navigator.maxTouchPoints > 0;

/** The terminal's rendered text (its rows). */
function screenText(container: HTMLElement): string {
  return container.querySelector('.xterm-rows')?.textContent ?? '';
}

function input(): HTMLTextAreaElement {
  return screen.getByRole('textbox', { name: 'Terminal input' });
}

function EchoTerminal(props: Partial<TerminalProps> & { onSend?: (data: string) => void }) {
  const handle = useRef<TerminalHandle>(null);
  const { onSend, ...rest } = props;
  const echo = useRef<((data: string) => void) | null>(null);
  return (
    <Terminal
      title="Shell"
      handleRef={handle}
      onData={(data) => {
        onSend?.(data);
        echo.current ??= createEchoShell((reply) => {
          handle.current?.write(reply);
        });
        echo.current(data);
      }}
      {...rest}
    />
  );
}

function paste(text: string) {
  const data = new DataTransfer();
  data.setData('text/plain', text);
  input().dispatchEvent(
    new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
  );
}

function relativeLuminance(hex: string): number {
  const value = parseInt(hex.slice(1), 16);
  const channels = [value >> 16, (value >> 8) & 255, value & 255].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (channels[0] ?? 0) + 0.7152 * (channels[1] ?? 0) + 0.0722 * (channels[2] ?? 0);
}

function contrast(a: string, b: string): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

describe('terminal theme', () => {
  it.each(['light', 'dark', 'high-contrast'])(
    'maps every ANSI colour to a token that reads on the background (%s)',
    (theme) => {
      const element = document.createElement('div');
      element.dataset.theme = theme;
      document.body.append(element);
      const { theme: colors } = readTerminalLook(element);
      for (const name of Object.keys(ansiTokens) as (keyof typeof ansiTokens)[]) {
        const color = colors[name] ?? '';
        expect(color, name).toMatch(/^#[0-9a-f]{6}$/i);
        expect(
          contrast(color, colors.background ?? ''),
          `${name} on ${theme}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
      element.remove();
    },
  );
});

describe('Terminal', () => {
  it('is a section named by its title, with a labelled input and the way out', async () => {
    const { container } = render(<EchoTerminal />);
    expect(screen.getByRole('region', { name: 'Shell' })).toBeInTheDocument();
    await expect.poll(() => container.querySelector('textarea')).not.toBeNull();
    expect(input()).toHaveAccessibleDescription('Press Ctrl+Shift+Esc to leave the terminal.');
    expect(screen.getByText('Press Ctrl+Shift+Esc to leave the terminal.')).toBeVisible();
  });

  it('sends keystrokes through onData and shows what the socket writes back', async () => {
    const onSend = vi.fn();
    const { container } = render(<EchoTerminal onSend={onSend} />);
    await expect.poll(() => container.querySelector('textarea')).not.toBeNull();
    input().focus();
    await userEvent.keyboard('ls -la{Enter}');
    expect(onSend).toHaveBeenCalledWith('l');
    expect(onSend).toHaveBeenCalledWith('\r');
    await expect.poll(() => screenText(container)).toContain('you typed: ls -la');
  });

  it('writes output given before it was ready, and clears it', async () => {
    const handle = createRef<TerminalHandle>();
    const { container } = render(
      <Terminal
        handleRef={(value) => {
          handle.current = value;
          // Written straight away, before the terminal exists.
          value?.write('early output');
        }}
      />,
    );
    await expect.poll(() => screenText(container)).toContain('early output');
    act(() => {
      handle.current?.write('\r\nmore');
      handle.current?.clear();
    });
    await expect.poll(() => screenText(container)).not.toContain('early output');
    // The cursor's line stays.
    expect(screenText(container)).toContain('more');
  });

  it('reports its size, and again when its container resizes', async () => {
    const onResize = vi.fn();
    const { container } = render(
      <div className="w-[320px]" data-testid="box">
        <Terminal onResize={onResize} />
      </div>,
    );
    await expect.poll(() => onResize.mock.calls.length).toBeGreaterThan(0);
    const [first] = onResize.mock.lastCall as [{ cols: number; rows: number }];
    expect(first.cols).toBeGreaterThan(10);
    expect(first.rows).toBeGreaterThan(5);
    const box = container.querySelector<HTMLElement>('[data-testid="box"]');
    box?.classList.replace('w-[320px]', 'w-[300px]');
    box?.setAttribute('class', 'w-[200px]');
    await expect
      .poll(() => (onResize.mock.lastCall as [{ cols: number }] | undefined)?.[0].cols)
      .toBeLessThan(first.cols);
  });

  it.skipIf(!isDesktop)('Ctrl+Shift+Esc moves focus to what follows the terminal', async () => {
    const { container } = render(
      <>
        <EchoTerminal hasSearch={false} hasFullScreen={false} />
        <button type="button">After</button>
      </>,
    );
    await expect.poll(() => container.querySelector('textarea')).not.toBeNull();
    input().focus();
    await userEvent.keyboard('{Tab}');
    // Tab is the shell's (completion), so focus stays.
    expect(input()).toHaveFocus();
    await userEvent.keyboard('{Control>}{Shift>}{Escape}{/Shift}{/Control}');
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
  });

  it.skipIf(!isDesktop)('is read-only without onData: no hint, and Tab moves on', async () => {
    const { container } = render(
      <>
        <Terminal title="Log" hasSearch={false} hasFullScreen={false} />
        <button type="button">After</button>
      </>,
    );
    await expect.poll(() => container.querySelector('textarea')).not.toBeNull();
    expect(screen.queryByText('Press Ctrl+Shift+Esc to leave the terminal.')).toBeNull();
    input().focus();
    await userEvent.keyboard('{Tab}');
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
  });

  it('asks before pasting several lines, and pastes one line straight away', async () => {
    const onSend = vi.fn();
    const { container } = render(<EchoTerminal onSend={onSend} />);
    await expect.poll(() => container.querySelector('textarea')).not.toBeNull();
    paste('uptime\n');
    expect(onSend).toHaveBeenCalledWith('uptime\r');
    onSend.mockClear();

    paste('cd /data\nrm -r old\n');
    const dialog = await screen.findByRole('alertdialog', { name: 'Paste several lines?' });
    expect(dialog.textContent).toEqual(expect.stringContaining('This text has 2 lines.'));
    expect(onSend).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await expect.poll(() => screen.queryByRole('alertdialog')).toBeNull();
    expect(onSend).not.toHaveBeenCalled();

    paste('cd /data\nrm -r old\n');
    await userEvent.click(await screen.findByRole('button', { name: 'Paste' }));
    await expect.poll(() => onSend.mock.calls.flat().join('')).toContain('cd /data\rrm -r old\r');
  });

  it('shows the connection status, pauses input until open, and reconnects', async () => {
    const onSend = vi.fn();
    function Connected() {
      const [status, setStatus] = useState<TerminalConnectionStatus>('closed');
      return (
        <EchoTerminal
          onSend={onSend}
          connection={{
            status,
            onReconnect: () => {
              setStatus('open');
            },
          }}
        />
      );
    }
    const { container } = render(<Connected />);
    await expect.poll(() => container.querySelector('textarea')).not.toBeNull();
    expect(screen.getByRole('status').textContent).toBe('Disconnected');
    input().focus();
    await userEvent.keyboard('x');
    expect(onSend).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Reconnect' }));
    expect(screen.getByRole('status').textContent).toBe('Connected');
    expect(screen.queryByRole('button', { name: 'Reconnect' })).toBeNull();
    input().focus();
    await userEvent.keyboard('y');
    expect(onSend).toHaveBeenCalledWith('y');
  });

  it('searches the scrollback', async () => {
    const handle = createRef<TerminalHandle>();
    render(<Terminal title="Log" handleRef={handle} />);
    act(() => {
      handle.current?.write(jobLog);
    });
    await userEvent.click(screen.getByRole('button', { name: 'Search the terminal' }));
    const field = screen.getByRole('searchbox', { name: 'Search the terminal' });
    expect(field).toHaveFocus();
    await userEvent.type(field, 'Exposure');
    await expect.poll(() => screen.getByText(/of 3$/).textContent).toBe('1 of 3');
    await userEvent.click(screen.getByRole('button', { name: 'Next match' }));
    await expect.poll(() => screen.getByText(/of 3$/).textContent).toBe('2 of 3');
    await userEvent.clear(field);
    await userEvent.type(field, 'nebula');
    expect(await screen.findByText('No matches')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Search the terminal' }));
    expect(screen.queryByRole('searchbox')).toBeNull();
  });

  it.skipIf(!isTouch)('opens search with a tap', async () => {
    render(<Terminal title="Log" />);
    await commands.tap('button[aria-label="Search the terminal"]');
    expect(
      await screen.findByRole('searchbox', { name: 'Search the terminal' }),
    ).toBeInTheDocument();
  });

  it('goes full screen and back', async () => {
    render(<Terminal title="Log" />);
    const region = screen.getByRole('region', { name: 'Log' });
    await userEvent.click(screen.getByRole('button', { name: 'Full screen' }));
    expect(region.getBoundingClientRect().height).toBe(window.innerHeight);
    await userEvent.click(screen.getByRole('button', { name: 'Exit full screen' }));
    expect(region.getBoundingClientRect().height).toBeLessThan(window.innerHeight);
  });

  it('switches colours live with the theme', async () => {
    function Themed({ preference }: { preference: ThemePreference }) {
      return (
        <UIProvider themePreference={preference}>
          <Terminal title="Log" />
        </UIProvider>
      );
    }
    const { container, rerender } = render(<Themed preference="light" />);
    // The text colour is the code foreground token's.
    const foreground = () =>
      getComputedStyle(container.querySelector('.xterm-rows') ?? container).color;
    await expect.poll(foreground).toBe('rgb(26, 29, 35)');
    rerender(<Themed preference="dark" />);
    await expect.poll(foreground).toBe('rgb(232, 234, 238)');
  });

  it('takes its strings from UIProvider messages', async () => {
    const overrides: Partial<TerminalMessages> = {
      terminalInput: 'Eingabe',
      terminalFocusHint: 'Strg+Umschalt+Esc verlässt das Terminal.',
      terminalSearch: 'Suchen',
    };
    const { container } = render(
      <UIProvider messages={overrides as Partial<Messages>}>
        <EchoTerminal />
      </UIProvider>,
    );
    await expect.poll(() => container.querySelector('textarea')).not.toBeNull();
    expect(screen.getByRole('textbox', { name: 'Eingabe' })).toHaveAccessibleDescription(
      'Strg+Umschalt+Esc verlässt das Terminal.',
    );
    expect(screen.getByRole('button', { name: 'Suchen' })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <EchoTerminal connection={{ status: 'error', onReconnect: () => undefined }} />,
    );
    await expect.poll(() => container.querySelector('textarea')).not.toBeNull();
    await expectNoAxeViolations(container);
  });
});
