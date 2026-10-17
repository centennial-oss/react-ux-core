// PdfViewer's download and print: download saves the document's bytes under its title; print renders every page to
// an image in a hidden frame and prints that, so it works the same in every browser (and for documents loaded with
// auth headers, which the browser's own PDF viewer couldn't fetch).

import type { PDFDocumentProxy } from 'pdfjs-dist';

/** A file name from a title: unsafe characters replaced, ".pdf" added. */
export function pdfFileName(title: string): string {
  const base = title.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'document';
  return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
}

/** Saves `href` under `fileName` through a temporary link. */
export function saveLink(href: string, fileName: string): void {
  const link = document.createElement('a');
  link.href = href;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
}

/** Saves bytes (or a Blob) as a PDF file. */
export function saveBytes(data: Uint8Array | ArrayBuffer | Blob, fileName: string): void {
  const blob =
    data instanceof Blob ? data : new Blob([data as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  saveLink(url, fileName);
  // The download has started by the next task; revoke on the next frame after that.
  requestAnimationFrame(() => {
    URL.revokeObjectURL(url);
  });
}

/** Saves the loaded document's bytes. */
export async function downloadPdf(doc: PDFDocumentProxy, fileName: string): Promise<void> {
  saveBytes(await doc.getData(), fileName);
}

let printFrame: HTMLIFrameElement | null = null;
let printUrls: string[] = [];

function cleanUpPrint() {
  printFrame?.remove();
  printFrame = null;
  for (const url of printUrls) {
    URL.revokeObjectURL(url);
  }
  printUrls = [];
}

/** Renders every page at print resolution into a hidden frame and opens the print dialog. */
export async function printPdf(doc: PDFDocumentProxy, title: string): Promise<void> {
  cleanUpPrint();
  const urls: string[] = [];
  for (let number = 1; number <= doc.numPages; number += 1) {
    const page = await doc.getPage(number);
    // 150 dpi: PDF points are 1/72 inch.
    const viewport = page.getViewport({ scale: 150 / 72 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    await page.render({ canvas, viewport, intent: 'print' }).promise;
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/png');
    });
    if (blob) {
      urls.push(URL.createObjectURL(blob));
    }
    page.cleanup();
  }
  printUrls = urls;
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  frame.style.cssText =
    'position:fixed;inset:0;width:0;height:0;border:0;opacity:0;pointer-events:none';
  const escapedTitle = title.replace(/[<>&"]/g, (char) => `&#${String(char.charCodeAt(0))};`);
  frame.srcdoc = `<!doctype html><html><head><title>${escapedTitle}</title><style>@page{margin:0}html,body{margin:0}img{display:block;width:100%;break-after:page}img:last-child{break-after:auto}</style></head><body>${urls.map((url) => `<img src="${url}" alt="">`).join('')}</body></html>`;
  printFrame = frame;
  await new Promise<void>((resolve) => {
    frame.addEventListener(
      'load',
      () => {
        resolve();
      },
      { once: true },
    );
    document.body.append(frame);
  });
  frame.contentWindow?.focus();
  frame.contentWindow?.print();
}
