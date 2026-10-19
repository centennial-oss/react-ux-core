// Loads pdf.js on demand: `/media` never imports pdfjs-dist statically, so apps that don't show PDFs never download it.

type PdfJs = typeof import('pdfjs-dist');

let pdfjs: Promise<PdfJs> | undefined;

/**
 * The worker pdf.js parses documents in. Bundlers that understand `new URL(…, import.meta.url)` (Vite, webpack 5,
 * Parcel, esbuild with a plugin) emit the worker file from the app's own pdfjs-dist and point this at it. Pass
 * PdfViewer's `workerSrc` to load it from elsewhere (a CDN, or a copy served beside the app).
 */
export function defaultPdfWorkerSrc(): string {
  return new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;
}

/** pdf.js, loaded once, with its worker set (an explicit `workerSrc` wins over the default). */
export function loadPdfjs(workerSrc?: string): Promise<PdfJs> {
  pdfjs ??= import('pdfjs-dist');
  return pdfjs.then((module) => {
    if (workerSrc) {
      module.GlobalWorkerOptions.workerSrc = workerSrc;
    } else if (!module.GlobalWorkerOptions.workerSrc) {
      module.GlobalWorkerOptions.workerSrc = defaultPdfWorkerSrc();
    }
    return module;
  });
}
