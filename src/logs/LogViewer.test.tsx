import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { LOG_START, logLine, logLines, nightLog } from '../../test/logs';
import type { Messages } from '../provider/messages';
import { UIProvider } from '../provider/UIProvider';
import { stripAnsi } from './ansi';
import type { LogLine } from './format';
import { LogViewer } from './LogViewer';
import type { LogViewerMessages } from './messages';

const isDesktop = window.innerWidth >= 1024;

// React Aria's live announcer also uses `log` regions, so find ours by its `aria-live="off"`.
function getLog() {
  const log = document.querySelector<HTMLElement>('[role="log"][aria-live="off"]');
  if (!log) {
    throw new Error('No log region');
  }
  return log;
}

function rows() {
  return [...getLog().querySelectorAll<HTMLElement>('[data-log-row]')];
}

/** The visible search position (not the live region that also announces it). */
function position(text: string) {
  return screen.getByText(text, { selector: 'span:not([aria-live])' });
}

function isAtBottom(element: HTMLElement) {
  return element.scrollHeight - element.clientHeight - element.scrollTop <= 2;
}

function scrollLog(top: number) {
  const log = getLog();
  log.scrollTop = top;
  log.dispatchEvent(new Event('scroll'));
}

describe('LogViewer', () => {
  it('is a named log region that is silent by default, with badges, sources and plain messages', () => {
    render(<LogViewer lines={nightLog} timeZone="UTC" aria-label="Night run log" />);
    const log = screen.getByRole('log', { name: 'Night run log' });
    expect(log).toHaveAttribute('aria-live', 'off');
    expect(log).toHaveAttribute('tabindex', '0');
    const first = rows()[0];
    expect(first?.textContent).toEqual(expect.stringContaining('22:00:00.000'));
    expect(first?.textContent).toEqual(expect.stringContaining('INFO'));
    expect(first?.textContent).toEqual(expect.stringContaining('scheduler'));
    expect(log.querySelector('time')).toHaveAttribute('dateTime', '2026-10-14T22:00:00.000Z');
    // ANSI codes become token-coloured spans; no escape characters reach the page.
    expect(log.textContent).not.toContain('\u001b');
    const timeout = within(log).getByText('Shutter timeout');
    expect(timeout).toHaveClass('text-danger-fg', 'font-bold');
    expect(within(log).getByText('FATAL')).toHaveClass('bg-danger-solid');
  });

  it('renders markup in messages as text', () => {
    const lines: LogLine[] = [
      { id: 'x', message: '\u001b[31m<img src=x onerror="window.hacked=1"><script>1</script>' },
    ];
    render(<LogViewer lines={lines} />);
    expect(getLog().querySelector('img, script')).toBeNull();
    expect(getLog().textContent).toContain('<img src=x');
  });

  it('formats timestamps in the time zone', () => {
    render(<LogViewer lines={nightLog.slice(0, 1)} timeZone="Asia/Tokyo" />);
    expect(rows()[0]?.textContent).toEqual(expect.stringContaining('07:00:00.000'));
  });

  it('keeps only a window of rows in the page and follows a 15,000-line batch to the newest line', async () => {
    const first = logLines(15_000);
    const { rerender } = render(<LogViewer lines={first} maxHeight="20rem" />);
    const log = getLog();
    await expect.poll(() => isAtBottom(log)).toBe(true);
    expect(rows().length).toBeLessThan(80);
    await expect
      .poll(() => log.textContent)
      .toEqual(expect.stringContaining(stripAnsi(logLine(14_999).message)));

    // Append another 15,000 lines in one batch, as a busy stream would.
    const second = first.concat(logLines(15_000, 15_000));
    rerender(<LogViewer lines={second} maxHeight="20rem" />);
    await expect.poll(() => isAtBottom(log)).toBe(true);
    await expect
      .poll(() => rows().at(-1)?.getAttribute('data-index'))
      .toBe(String(second.length - 1));
    expect(rows().length).toBeLessThan(80);
    expect(screen.queryByRole('button', { name: /Jump to latest/ })).toBeNull();
  });

  it('pauses when scrolled up, counts what arrives, and jumps back to the latest', async () => {
    const onFollowingChange = vi.fn();
    const lines = logLines(300);
    const { rerender } = render(
      <LogViewer lines={lines} maxHeight="16rem" onFollowingChange={onFollowingChange} />,
    );
    const log = getLog();
    await expect.poll(() => isAtBottom(log)).toBe(true);
    scrollLog(log.scrollTop - 400);
    await expect.poll(() => onFollowingChange).toHaveBeenCalledWith(false);
    expect(screen.getByRole('button', { name: 'Follow new lines' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: 'Jump to latest' })).toBeInTheDocument();
    const pausedTop = log.scrollTop;

    // 37 lines arrive in two batches; the view stays where it is.
    const more = lines.concat(logLines(20, 300));
    rerender(<LogViewer lines={more} maxHeight="16rem" onFollowingChange={onFollowingChange} />);
    const most = more.concat(logLines(17, 320));
    rerender(<LogViewer lines={most} maxHeight="16rem" onFollowingChange={onFollowingChange} />);
    expect(log.scrollTop).toBe(pausedTop);
    const jump = screen.getByRole('button', { name: 'Jump to latest (37 new)' });

    await userEvent.click(jump);
    expect(onFollowingChange).toHaveBeenLastCalledWith(true);
    await expect.poll(() => isAtBottom(log)).toBe(true);
    expect(screen.queryByRole('button', { name: /Jump to latest/ })).toBeNull();
  });

  it('counts only new lines at the visible levels', async () => {
    const lines = logLines(300);
    const { rerender } = render(
      <LogViewer lines={lines} maxHeight="16rem" defaultFollowing={false} levels={['error']} />,
    );
    expect(screen.getByRole('button', { name: 'Jump to latest' })).toBeInTheDocument();
    // Lines 300–399 include errors at 329, 376 (every 47th).
    rerender(
      <LogViewer
        lines={lines.concat(logLines(100, 300))}
        maxHeight="16rem"
        defaultFollowing={false}
        levels={['error']}
      />,
    );
    expect(
      await screen.findByRole('button', { name: 'Jump to latest (2 new)' }),
    ).toBeInTheDocument();
  });

  it('searches text and /regex/, steps through matches, and announces the count', async () => {
    const { container } = render(<LogViewer lines={nightLog} timeZone="UTC" />);
    const field = screen.getByRole('searchbox', { name: 'Search the log' });
    await userEvent.type(field, 'exposure');
    await expect.poll(() => getLog().querySelectorAll('mark').length).toBe(3);
    expect(position('1 of 3')).toBeInTheDocument();
    const live = container.querySelector('[aria-live="polite"]');
    await expect.poll(() => live?.textContent).toBe('3 matches');
    expect(getLog().querySelector('mark[data-current]')?.textContent).toBe('Exposure');

    await userEvent.keyboard('{Enter}');
    expect(position('2 of 3')).toBeInTheDocument();
    expect(live?.textContent).toBe('2 of 3');
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}');
    expect(position('1 of 3')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Previous match' }));
    expect(position('3 of 3')).toBeInTheDocument();

    await userEvent.clear(field);
    await userEvent.type(field, '/shutter|mount fault/i');
    // "Shutter opening", "the shutter limit", "Shutter timeout" and "Mount fault".
    await expect.poll(() => getLog().querySelectorAll('mark').length).toBe(4);
    await userEvent.clear(field);
    await userEvent.type(field, '/(unclosed/');
    await expect.poll(() => live?.textContent).toBe('Invalid regular expression');
    expect(position('Invalid regular expression')).toHaveClass('text-danger-fg');
    expect(getLog().querySelectorAll('mark')).toHaveLength(0);
  });

  it.runIf(isDesktop)('filters by level from the toolbar menu', async () => {
    const onLevelsChange = vi.fn();
    render(<LogViewer lines={nightLog} timeZone="UTC" onLevelsChange={onLevelsChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Levels' }));
    await userEvent.click(await screen.findByRole('menuitemcheckbox', { name: 'TRACE' }));
    expect(onLevelsChange).toHaveBeenLastCalledWith(['debug', 'info', 'warn', 'error', 'fatal']);
    await userEvent.keyboard('{Escape}');
    expect(getLog().querySelector('[data-level="trace"]')).toBeNull();
    // A line without a level always shows.
    expect(getLog().textContent).toContain('Calibrated 2 frames');
    expect(screen.getByRole('button', { name: 'Levels (5 of 6)' })).toBeInTheDocument();
  });

  it('expands structured fields into a description list', async () => {
    render(<LogViewer lines={nightLog} timeZone="UTC" />);
    const buttons = screen.getAllByRole('button', { name: 'Show fields' });
    const errorButton = buttons[2];
    if (!errorButton) {
      throw new Error('No fields button on the error line');
    }
    expect(errorButton).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(errorButton);
    expect(errorButton).toHaveAttribute('aria-expanded', 'true');
    const panel = document.getElementById(errorButton.getAttribute('aria-controls') ?? '');
    expect(panel?.querySelector('dl')?.textContent).toEqual(expect.stringContaining('timeoutMs'));
    expect(panel?.textContent).toEqual(expect.stringContaining('{"state":"stuck","position":0.4}'));
  });

  it('wraps long lines from the toolbar', async () => {
    render(<LogViewer lines={nightLog} timeZone="UTC" />);
    const toggle = screen.getByRole('button', { name: 'Wrap lines' });
    expect(rows()[0]?.firstElementChild).toHaveClass('whitespace-pre');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(rows()[0]?.firstElementChild).toHaveClass('whitespace-pre-wrap');
  });

  it('copies a selection across rows as plain lines', () => {
    render(<LogViewer lines={nightLog} timeZone="UTC" />);
    const [, second, third] = rows();
    const range = document.createRange();
    range.setStart(second as Node, 0);
    range.setEnd(third?.querySelector('[id]')?.firstChild ?? (third as Node), 1);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    const event = new ClipboardEvent('copy', {
      clipboardData: new DataTransfer(),
      bubbles: true,
      cancelable: true,
    });
    getLog().dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(event.clipboardData?.getData('text/plain')).toBe(
      '22:00:01.200 DEBUG dome Shutter opening (azimuth 182°)\n22:00:01.400 TRACE guider Loop rate 2 Hz',
    );
    expect(event.clipboardData?.getData('text/html')).toBe('');
    selection?.removeAllRanges();
  });

  it('downloads the visible lines as a .log file', async () => {
    let blob: Blob | undefined;
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockImplementation((value) => {
      blob = value as Blob;
      return 'blob:log';
    });
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    let downloadName = '';
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloadName = this.download;
    });
    render(
      <LogViewer
        lines={nightLog}
        levels={['error', 'fatal']}
        downloadFileName="night.log"
        timeZone="UTC"
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Download visible lines' }));
    expect(downloadName).toBe('night.log');
    const text = (await blob?.text()) ?? '';
    expect(text.split('\n')).toEqual([
      '2026-10-14T22:01:02.250Z ERROR camera-1 Shutter timeout on exposure 2; retrying (attempt 1 of 3) {"exposure":2,"timeoutMs":5000,"shutter":{"state":"stuck","position":0.4}}',
      '2026-10-14T22:01:30.000Z FATAL pier-2 Mount fault: axis 1 encoder lost; observing halted {"axis":1,"code":"ENC_LOST"}',
      // The line without a level shows at every filter.
      expect.stringContaining('pipeline Calibrated 2 frames'),
      '',
    ]);
    createObjectURL.mockRestore();
    revoke.mockRestore();
    click.mockRestore();
  });

  it('announces new error lines when "Announce errors" is on, throttled', async () => {
    const base = nightLog.slice(0, 3);
    const errorLine = (id: string, message: string): LogLine => ({
      id,
      at: LOG_START,
      level: 'error',
      source: 'camera-1',
      message,
    });
    const { container, rerender } = render(<LogViewer lines={base} timeZone="UTC" />);
    const live = container.querySelector('[aria-live="assertive"]');
    rerender(<LogViewer lines={[...base, errorLine('e0', 'Ignored')]} timeZone="UTC" />);
    expect(live?.textContent).toBe('');

    await userEvent.click(screen.getByRole('button', { name: 'Announce errors' }));
    const withFirst = [...base, errorLine('e0', 'Ignored'), errorLine('e1', 'Shutter timeout')];
    rerender(<LogViewer lines={withFirst} timeZone="UTC" />);
    await expect.poll(() => live?.textContent).toBe('ERROR: Shutter timeout');

    // Two more within the throttle window are summarised once it ends.
    const withMore = [
      ...withFirst,
      errorLine('e2', 'Filter wheel stalled'),
      { id: 'i1', message: 'info line', level: 'info' as const },
      errorLine('e3', 'Cooler fault'),
    ];
    rerender(<LogViewer lines={withMore} timeZone="UTC" />);
    expect(live?.textContent).toBe('ERROR: Shutter timeout');
    await expect
      .poll(() => live?.textContent, { timeout: 5000 })
      .toBe('2 new errors. Latest: Cooler fault');
  });

  it('loads older lines at the top and keeps the view in place', async () => {
    const onLoadOlder = vi.fn();
    const lines = logLines(200, 1000);
    const { rerender } = render(
      <LogViewer
        lines={lines}
        defaultFollowing={false}
        onLoadOlder={onLoadOlder}
        maxHeight="16rem"
      />,
    );
    const log = getLog();
    scrollLog(300);
    await expect.poll(() => rows()[0]?.dataset.index).not.toBe('0');
    scrollLog(0);
    await expect.poll(() => onLoadOlder).toHaveBeenCalledTimes(1);
    rerender(
      <LogViewer
        lines={lines}
        defaultFollowing={false}
        onLoadOlder={onLoadOlder}
        isLoadingOlder
        maxHeight="16rem"
      />,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    rerender(
      <LogViewer
        lines={[...logLines(100, 900), ...lines]}
        defaultFollowing={false}
        onLoadOlder={onLoadOlder}
        maxHeight="16rem"
      />,
    );
    // The line that was at the top (line 1000, now index 100) is still at the top.
    expect(log.scrollTop).toBeGreaterThanOrEqual(100 * 20);
    await expect
      .poll(() => {
        const top = log.getBoundingClientRect().top;
        return rows().find((row) => row.getBoundingClientRect().bottom > top + 1)?.dataset.index;
      })
      .toBe('100');
    expect(onLoadOlder).toHaveBeenCalledTimes(1);
  });

  it('shows an empty state', () => {
    render(<LogViewer lines={[]} />);
    expect(getLog().textContent).toBe('No log lines');
    expect(screen.getByRole('button', { name: 'Download visible lines' })).toBeDisabled();
  });

  it('takes its strings from UIProvider', async () => {
    const overrides: Partial<LogViewerMessages> = {
      logLabel: 'Protokoll',
      logJumpToLatest: ({ count }) => `Zum Neuesten (${String(count)} neu)`,
    };
    render(
      <UIProvider messages={overrides as Partial<Messages>}>
        <LogViewer lines={logLines(50)} defaultFollowing={false} />
      </UIProvider>,
    );
    expect(screen.getByRole('log', { name: 'Protokoll' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Zum Neuesten (0 neu)' })).toBeInTheDocument();
  });

  it('never makes the page scroll sideways', () => {
    render(
      <div className="p-2">
        <LogViewer lines={nightLog} timeZone="UTC" />
      </div>,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <LogViewer
        lines={nightLog}
        timeZone="UTC"
        defaultSearch="exposure"
        defaultExpandedIds={['n7']}
        defaultFollowing={false}
      />,
    );
    await expectNoAxeViolations(container);
  });
});
