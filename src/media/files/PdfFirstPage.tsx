// The first page of a PDF as a small picture, for FilePreview's thumbnails. pdf.js loads on demand (the same loader
// as PdfViewer, so `/media` never imports pdfjs-dist statically); the document is destroyed once the page is drawn.

import type { PDFDocumentLoadingTask, RenderTask } from 'pdfjs-dist';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Skeleton } from '../../components/Skeleton/Skeleton';
import { cn } from '../../utils/cn';
import { isRunCurrent, type EffectRun } from '../player/mediaDom';
import { loadPdfjs } from '../player/pdfjs';

export interface PdfFirstPageProps {
  /** A URL (same origin or CORS-enabled) or a Blob, such as a chosen File. */
  source: string | Blob;
  /** The width to draw at, in CSS pixels. Defaults to 240. */
  width?: number;
  /** Shown instead when the document can't be read. */
  fallback: ReactNode;
  /** pdf.js's worker URL, as for PdfViewer. */
  workerSrc?: string;
  className?: string;
}

/** Draws page 1 of a PDF into a canvas (decorative: the file's name labels whatever shows it). */
export function PdfFirstPage({
  source,
  width = 240,
  fallback,
  workerSrc,
  className,
}: PdfFirstPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<{ source: string | Blob | null; status: 'ready' | 'error' }>({
    source: null,
    status: 'ready',
  });
  const status = state.source === source ? state.status : 'loading';

  useEffect(() => {
    const run: EffectRun = { isCurrent: true };
    let task: PDFDocumentLoadingTask | undefined;
    let render: RenderTask | undefined;
    void (async () => {
      try {
        const lib = await loadPdfjs(workerSrc);
        const data =
          typeof source === 'string' ? undefined : new Uint8Array(await source.arrayBuffer());
        if (!isRunCurrent(run)) {
          return;
        }
        task = lib.getDocument(typeof source === 'string' ? { url: source } : { data });
        const doc = await task.promise;
        const page = await doc.getPage(1);
        const canvas = canvasRef.current;
        if (!isRunCurrent(run) || !canvas) {
          return;
        }
        const ratio = window.devicePixelRatio || 1;
        const viewport = page.getViewport({
          scale: (width * ratio) / page.getViewport({ scale: 1 }).width,
        });
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        render = page.render({ canvas, viewport });
        await render.promise;
        if (isRunCurrent(run)) {
          setState({ source, status: 'ready' });
        }
      } catch {
        if (isRunCurrent(run)) {
          setState({ source, status: 'error' });
        }
      } finally {
        if (isRunCurrent(run)) {
          void task?.destroy();
        }
      }
    })();
    return () => {
      run.isCurrent = false;
      render?.cancel();
      void task?.destroy();
    };
  }, [source, width, workerSrc]);

  if (status === 'error') {
    return <>{fallback}</>;
  }
  return (
    <span
      aria-hidden="true"
      data-status={status}
      className={cn(
        'relative block overflow-hidden bg-surface-1 [color-scheme:only_light]',
        className,
      )}
    >
      <canvas ref={canvasRef} className="block h-auto w-full" />
      {status === 'loading' && (
        <Skeleton shape="rect" className="absolute inset-0 size-full rounded-none" />
      )}
    </span>
  );
}
