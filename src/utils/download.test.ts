import { afterEach, describe, expect, it, vi } from 'vitest';
import { saveBlob, saveUrl, withExtension } from './download';

afterEach(() => {
  vi.restoreAllMocks();
});

/** Records the links clicked, without starting real downloads. */
function captureClicks() {
  const links: { href: string; download: string; target: string; isAttached: boolean }[] = [];
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    links.push({
      href: this.href,
      download: this.download,
      target: this.target,
      isAttached: this.isConnected,
    });
  });
  return links;
}

describe('withExtension', () => {
  it('adds the extension unless present', () => {
    expect(withExtension('report', '.csv')).toBe('report.csv');
    expect(withExtension('report.csv', '.csv')).toBe('report.csv');
    expect(withExtension('REPORT.CSV', '.csv')).toBe('REPORT.CSV');
  });
});

describe('saveUrl', () => {
  it('clicks a temporary attached link, then removes it', () => {
    const links = captureClicks();
    saveUrl('https://example.com/a.pdf', 'a.pdf', { isNewTab: true });
    expect(links).toEqual([
      { href: 'https://example.com/a.pdf', download: 'a.pdf', target: '_blank', isAttached: true },
    ]);
    expect(document.querySelector('a[download]')).toBeNull();
  });

  it('stays in the same tab by default', () => {
    const links = captureClicks();
    saveUrl('data:text/plain,hi', 'hi.txt');
    expect(links[0]?.target).toBe('');
  });
});

describe('saveBlob', () => {
  it('saves through an object URL and revokes it afterwards', async () => {
    const links = captureClicks();
    const revoke = vi.spyOn(URL, 'revokeObjectURL');
    saveBlob('a,b\r\n', 'data.csv', 'text/csv');
    expect(links[0]?.href).toMatch(/^blob:/);
    expect(links[0]?.download).toBe('data.csv');
    expect(revoke).not.toHaveBeenCalled();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(revoke).toHaveBeenCalledWith(links[0]?.href);
  });
});
