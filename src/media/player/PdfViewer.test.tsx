import { render, screen, within } from '@testing-library/react';
import { Profiler } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { buildPdf, statementPages } from '../../../test/media';
import type { Messages } from '../../provider/messages';
import { UIProvider } from '../../provider/UIProvider';
import { PdfViewer } from './PdfViewer';
import type { MediaPlayerMessages } from './messages';

/** Overrides of this entry's strings (its interface joins `Messages` when the entry is wired up). */
const overrides = (strings: Partial<MediaPlayerMessages>) =>
  strings as unknown as Partial<Messages>;

const isWideScreen = window.innerWidth >= 768;
const statement = buildPdf(statementPages);
const scan = buildPdf([[], []], { isScanned: true });
const asBuffer = (bytes: Uint8Array) => bytes.slice().buffer;

/** Waits until a page's text layer has rendered text. */
async function pageText(number: number, total = 5) {
  const page = await screen.findByRole(
    'group',
    { name: `Page ${String(number)} of ${String(total)}` },
    { timeout: 10_000 },
  );
  await expect.poll(() => page.textContent, { timeout: 10_000 }).not.toBe('');
  return page;
}

describe('PdfViewer', () => {
  it('opens a document with its page count, rendering pages with a text layer', async () => {
    render(<PdfViewer source={asBuffer(statement)} title="March statement" />);
    expect(screen.getByRole('region', { name: 'March statement' })).toBeInTheDocument();
    expect(screen.getByRole('toolbar', { name: 'Document tools' })).toBeInTheDocument();
    const first = await pageText(1);
    expect(first.textContent).toEqual(expect.stringContaining('Statement page 1'));
    expect(first.querySelector('canvas')).not.toBeNull();
    // The text layer is transparent text laid over the canvas, not visible text.
    const run = first.querySelector<HTMLElement>('span[role="presentation"]');
    expect(run && getComputedStyle(run).position).toBe('absolute');
    expect(run && getComputedStyle(run).color).toBe('rgba(0, 0, 0, 0)');
    expect(run?.getBoundingClientRect().width).toBeLessThan(first.getBoundingClientRect().width);
    expect(screen.getByText('of 5')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Page' })).toHaveValue('1');
  });

  it('opens a Blob too, and renders only pages near the viewport', async () => {
    const pages = Array.from({ length: 30 }, (_, index) => [`Page heading ${String(index + 1)}`]);
    render(
      <PdfViewer
        source={new Blob([buildPdf(pages) as BlobPart], { type: 'application/pdf' })}
        title="Long report"
        height="30rem"
      />,
    );
    await pageText(1, 30);
    const last = screen.getByRole('group', { name: 'Page 30 of 30' });
    expect(last.querySelector('canvas')).toBeNull();
  });

  it('searches the text, highlighting matches and stepping through them', async () => {
    render(<PdfViewer source={asBuffer(statement)} title="March statement" />);
    await pageText(1);
    if (!isWideScreen) {
      await userEvent.click(screen.getByRole('button', { name: 'Search document' }));
    }
    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Search document' }),
      'inv-01044{Enter}',
    );
    await expect.poll(() => screen.queryByText('1 of 2')).toBeInTheDocument();
    const page = await pageText(3);
    await expect.poll(() => page.querySelectorAll('[data-hit]').length).toBe(2);
    expect(page.querySelector('[data-hit]')?.textContent.toLowerCase()).toBe('inv-01044');
    await userEvent.click(screen.getByRole('button', { name: 'Next match' }));
    expect(screen.getByText('2 of 2')).toBeInTheDocument();
    await userEvent.clear(screen.getByRole('searchbox', { name: 'Search document' }));
    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Search document' }),
      'nebula{Enter}',
    );
    await expect.poll(() => screen.queryByText('No matches')).toBeInTheDocument();
  });

  it('goes to a page from the page field, reporting and announcing it', async () => {
    const onPageChange = vi.fn();
    render(
      <PdfViewer
        source={asBuffer(statement)}
        title="March statement"
        onPageChange={onPageChange}
      />,
    );
    await pageText(1);
    const field = screen.getByRole('textbox', { name: 'Page' });
    await userEvent.clear(field);
    await userEvent.type(field, '4{Enter}');
    expect(onPageChange).toHaveBeenCalledWith(4);
    await pageText(4);
    await expect
      .poll(() => document.querySelector('.sr-only[aria-live="polite"]')?.textContent, {
        timeout: 3000,
      })
      .toBe('Page 4 of 5');
  });

  it.runIf(isWideScreen)('pages with the previous and next buttons', async () => {
    render(<PdfViewer source={asBuffer(statement)} title="March statement" />);
    await pageText(1);
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await expect.poll(() => screen.getByRole('textbox', { name: 'Page' })).toHaveValue('2');
    await userEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    await expect.poll(() => screen.getByRole('textbox', { name: 'Page' })).toHaveValue('1');
  });

  it('zooms from the zoom menu', async () => {
    render(<PdfViewer source={asBuffer(statement)} title="March statement" />);
    const page = await pageText(1);
    const before = page.getBoundingClientRect().width;
    await userEvent.click(screen.getByRole('button', { name: /^Zoom, \d+%$/ }));
    await userEvent.click(await screen.findByRole('menuitemradio', { name: '300%' }));
    await expect.poll(() => page.getBoundingClientRect().width).toBeGreaterThan(before);
    expect(screen.getByRole('button', { name: 'Zoom, 300%' })).toBeInTheDocument();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });

  it('says when a document has no text layer', async () => {
    render(<PdfViewer source={asBuffer(scan)} title="Scanned receipt" />);
    const info = await screen.findByRole(
      'button',
      { name: 'About this document’s text' },
      { timeout: 10_000 },
    );
    await userEvent.click(info);
    expect(await screen.findByText(/scanned image without a text layer/)).toBeInTheDocument();
  });

  it('asks for the password of a protected document, and says when it’s wrong', async () => {
    const locked = buildPdf(statementPages.slice(0, 2), { password: 'orbit' });
    render(<PdfViewer source={asBuffer(locked)} title="Locked statement" />);
    const dialog = await screen.findByRole(
      'dialog',
      { name: 'Password required' },
      { timeout: 10_000 },
    );
    await userEvent.type(within(dialog).getByLabelText('Password'), 'comet');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Open' }));
    const retry = await screen.findByRole(
      'dialog',
      { name: 'Password required' },
      { timeout: 10_000 },
    );
    await expect
      .poll(() => retry.textContent)
      .toEqual(expect.stringContaining('That password isn’t right'));
    await userEvent.type(within(retry).getByLabelText('Password'), 'orbit');
    await userEvent.click(within(retry).getByRole('button', { name: 'Open' }));
    const page = await pageText(1, 2);
    expect(page.textContent).toEqual(expect.stringContaining('Statement page 1'));
  });

  it('shows an error when the password prompt is cancelled', async () => {
    const locked = buildPdf(statementPages.slice(0, 1), { password: 'orbit' });
    render(<PdfViewer source={asBuffer(locked)} title="Locked statement" />);
    const dialog = await screen.findByRole(
      'dialog',
      { name: 'Password required' },
      { timeout: 10_000 },
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toEqual(expect.stringContaining('needs a password'));
  });

  it('shows an error for an invalid file', async () => {
    render(<PdfViewer source={new TextEncoder().encode('not a pdf').buffer} title="Broken" />);
    const alert = await screen.findByRole('alert', {}, { timeout: 10_000 });
    expect(alert.textContent).toEqual(expect.stringContaining('Couldn’t open this document'));
    expect(alert.textContent).toEqual(expect.stringContaining('isn’t a valid PDF'));
  });

  it('offers to download instead when a document can’t be loaded', async () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    render(<PdfViewer source="/media-fixtures-missing/statement.pdf" title="Lost statement" />);
    const button = await screen.findByRole(
      'button',
      { name: 'Download instead' },
      { timeout: 10_000 },
    );
    await userEvent.click(button);
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });

  it('downloads the document under its title', async () => {
    let fileName = '';
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      fileName = this.download;
    });
    render(<PdfViewer source={asBuffer(statement)} title="March statement" />);
    await pageText(1);
    await userEvent.click(screen.getByRole('button', { name: 'Download' }));
    await expect.poll(() => fileName).toBe('March statement.pdf');
    click.mockRestore();
  });

  it('prints every page as an image in a hidden frame', async () => {
    const print = vi.fn();
    // The frame's own window opens the print dialog; stand in for it.
    const contentWindow = vi
      .spyOn(HTMLIFrameElement.prototype, 'contentWindow', 'get')
      .mockReturnValue({ focus: () => undefined, print } as unknown as Window);
    render(<PdfViewer source={asBuffer(statement)} title="March statement" />);
    await pageText(1);
    await userEvent.click(screen.getByRole('button', { name: 'Print' }));
    await expect.poll(() => print.mock.calls.length, { timeout: 10_000 }).toBe(1);
    const frame = document.querySelector('iframe');
    expect(frame?.contentDocument?.querySelectorAll('img')).toHaveLength(5);
    expect(frame?.contentDocument?.title).toBe('March statement');
    contentWindow.mockRestore();
  });

  it.runIf(isWideScreen)('jumps to a page from the thumbnails sidebar', async () => {
    render(<PdfViewer source={asBuffer(statement)} title="March statement" />);
    await pageText(1);
    const sidebar = screen.getByRole('navigation', { name: 'Pages' });
    await userEvent.click(within(sidebar).getByRole('button', { name: 'Page 3 of 5' }));
    await expect.poll(() => screen.getByRole('textbox', { name: 'Page' })).toHaveValue('3');
    expect(within(sidebar).getByRole('button', { name: 'Page 3 of 5' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('stops rendering once the document, its pages and thumbnails are shown', async () => {
    // Inline ref callbacks that re-observed an element on every render, and an observer update that always made a new
    // set (or a new measure), kept the viewer re-rendering every frame, forever.
    let commits = 0;
    render(
      <Profiler
        id="viewer"
        onRender={() => {
          commits += 1;
        }}
      >
        <PdfViewer source={asBuffer(statement)} title="March statement" />
      </Profiler>,
    );
    await pageText(1);
    const settled = async () => {
      const before = commits;
      await new Promise((resolve) => {
        setTimeout(resolve, 300);
      });
      return commits - before;
    };
    await expect.poll(settled, { timeout: 10_000 }).toBe(0);
  });

  it.runIf(!isWideScreen)('opens the thumbnails in a drawer on narrow viewers', async () => {
    render(<PdfViewer source={asBuffer(statement)} title="March statement" />);
    await pageText(1);
    await userEvent.click(screen.getByRole('button', { name: 'Pages' }));
    const drawer = await screen.findByRole('dialog', { name: 'Pages' });
    // The sheet slides up; click once it has settled (scrolling a sheet mid-slide would dismiss it).
    const thumbnail = within(drawer).getByRole('button', { name: 'Page 2 of 5' });
    let lastTop = Number.NaN;
    await expect
      .poll(() => {
        const { top } = thumbnail.getBoundingClientRect();
        const isSettled = top === lastTop && top + 40 < window.innerHeight;
        lastTop = top;
        return isSettled;
      })
      .toBe(true);
    await userEvent.click(thumbnail);
    await expect.poll(() => screen.getByRole('textbox', { name: 'Page' })).toHaveValue('2');
  });

  it('takes its strings from UIProvider messages', async () => {
    render(
      <UIProvider
        messages={overrides({
          pdfToolbar: 'Outils',
          pdfPageCount: ({ total }) => `sur ${String(total)}`,
        })}
      >
        <PdfViewer source={asBuffer(statement)} title="Relevé" />
      </UIProvider>,
    );
    expect(screen.getByRole('toolbar', { name: 'Outils' })).toBeInTheDocument();
    expect(await screen.findByText('sur 5', {}, { timeout: 10_000 })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <PdfViewer source={asBuffer(statement)} title="March statement" />,
    );
    await pageText(1);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    await expectNoAxeViolations(container);
  });
});
