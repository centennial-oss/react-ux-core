// One PDF page for PdfViewer: a placeholder at the page's size until it's near the viewport, then a canvas at the
// screen's pixel density with pdf.js's text layer over it (transparent text that can be selected, searched and read
// by screen readers), with search matches highlighted in it. Also the small page images of the thumbnails sidebar.

import type { PDFDocumentProxy, PDFPageProxy, RenderTask, TextLayer } from 'pdfjs-dist';
import { useEffect, useRef, useState, type CSSProperties, type Ref } from 'react';
import { Skeleton } from '../../components/Skeleton/Skeleton';
import type { PdfMatchPart } from './pdfSearch';

type PdfJs = typeof import('pdfjs-dist');

/** A page's size in PDF points at scale 1. */
export interface PdfPageSize {
  width: number;
  height: number;
}

// pdf.js's text layer styles (from its pdf_viewer.css), as utilities: transparent, absolutely placed runs sized by
// the scale factor. Highlights are spans inside runs, marked `data-hit`, so the run rules skip them.
// Written out in full so Tailwind finds every class.
const textLayerClasses = [
  'absolute inset-0 z-0 origin-top-left overflow-clip leading-none [forced-color-adjust:none] [text-size-adjust:none]',
  '[--text-scale-factor:calc(var(--total-scale-factor)*var(--min-font-size,1))] [--min-font-size-inv:calc(1/var(--min-font-size,1))]',
  '[&_span:not(.markedContent):not([data-hit])]:absolute [&_span:not(.markedContent):not([data-hit])]:origin-top-left [&_span:not(.markedContent):not([data-hit])]:cursor-text',
  '[&_span:not(.markedContent):not([data-hit])]:whitespace-pre [&_span:not(.markedContent):not([data-hit])]:text-transparent [&_span:not(.markedContent):not([data-hit])]:select-text',
  '[&_span:not(.markedContent):not([data-hit])]:[font-size:calc(var(--text-scale-factor)*var(--font-height,0px))]',
  '[&_span:not(.markedContent):not([data-hit])]:[transform:rotate(var(--rotate,0deg))_scaleX(var(--scale-x,1))_scale(var(--min-font-size-inv))]',
  '[&_.markedContent]:contents [&_br]:absolute [&_br]:text-transparent',
].join(' ');

const hitClasses = 'rounded-sm bg-warning-solid/45';
const activeHitClasses = 'rounded-sm bg-accent-solid/50 outline-2 outline-accent-solid';

/** Sizes a canvas for `viewport` at the screen's density and renders the page into it. */
function renderPage(
  page: PDFPageProxy,
  canvas: HTMLCanvasElement,
  scale: number,
  maxPixels = 16_777_216,
): RenderTask {
  const viewport = page.getViewport({ scale });
  let ratio = window.devicePixelRatio || 1;
  // Very large zooms are capped so the canvas stays within browser limits.
  const pixels = viewport.width * viewport.height * ratio * ratio;
  if (pixels > maxPixels) {
    ratio *= Math.sqrt(maxPixels / pixels);
  }
  canvas.width = Math.floor(viewport.width * ratio);
  canvas.height = Math.floor(viewport.height * ratio);
  canvas.style.width = `${String(viewport.width)}px`;
  canvas.style.height = `${String(viewport.height)}px`;
  return page.render({
    canvas,
    viewport,
    transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
  });
}

/** Wraps each match part in its run with a highlight span (and restores runs without matches). */
function highlightRuns(
  layer: TextLayer,
  parts: readonly PdfMatchPart[],
  activeParts: readonly PdfMatchPart[],
): HTMLElement | null {
  const divs = layer.textDivs;
  const texts = layer.textContentItemsStr;
  const byItem = new Map<number, { start: number; end: number; isActive: boolean }[]>();
  for (const part of parts) {
    const isActive = activeParts.some(
      (active) => active.item === part.item && active.start === part.start,
    );
    const list = byItem.get(part.item) ?? [];
    list.push({ start: part.start, end: part.end, isActive });
    byItem.set(part.item, list);
  }
  let firstActive: HTMLElement | null = null;
  divs.forEach((div, index) => {
    const text = texts[index] ?? '';
    const ranges = byItem.get(index);
    if (!ranges) {
      if (div.childElementCount > 0) {
        div.textContent = text;
      }
      return;
    }
    ranges.sort((a, b) => a.start - b.start);
    const fragment = document.createDocumentFragment();
    let cursor = 0;
    for (const range of ranges) {
      if (range.start > cursor) {
        fragment.append(text.slice(cursor, range.start));
      }
      const hit = document.createElement('span');
      hit.dataset.hit = '';
      hit.className = range.isActive ? activeHitClasses : hitClasses;
      hit.textContent = text.slice(range.start, range.end);
      if (range.isActive) {
        firstActive ??= hit;
      }
      fragment.append(hit);
      cursor = range.end;
    }
    if (cursor < text.length) {
      fragment.append(text.slice(cursor));
    }
    div.replaceChildren(fragment);
  });
  return firstActive;
}

export interface PdfPageProps {
  lib: PdfJs;
  doc: PDFDocumentProxy;
  number: number;
  scale: number;
  /** The size to reserve before the page loads (usually the first page's). */
  size: PdfPageSize;
  /** Near the viewport: render it. Pages further away show a placeholder and free their canvas. */
  isNear: boolean;
  /** Names the page ("Page 3 of 40"). */
  label: string;
  /** Search matches on this page, and the active match's parts (scrolled into view). */
  parts: readonly PdfMatchPart[];
  activeParts: readonly PdfMatchPart[];
  /** Called with the page's real size once it loads. */
  onSize?: (number: number, size: PdfPageSize) => void;
  ref?: Ref<HTMLDivElement>;
}

/** A page: a placeholder until near the viewport, then a canvas with a selectable, searchable text layer. */
export function PdfPage({
  lib,
  doc,
  number,
  scale,
  size,
  isNear,
  label,
  parts,
  activeParts,
  onSize,
  ref,
}: PdfPageProps) {
  const [page, setPage] = useState<PDFPageProxy | null>(null);
  // The canvas element itself (it's replaced when the page comes back near), and the one last rendered into.
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [renderedCanvas, setRenderedCanvas] = useState<HTMLCanvasElement | null>(null);
  const isRendered = canvas !== null && renderedCanvas === canvas;
  const textRef = useRef<HTMLDivElement>(null);
  const [layer, setLayer] = useState<TextLayer | null>(null);
  const latestSize = useRef(onSize);
  useEffect(() => {
    latestSize.current = onSize;
  });

  useEffect(() => {
    if (!isNear || page) {
      return;
    }
    let isCurrent = true;
    void doc.getPage(number).then(
      (loaded) => {
        if (isCurrent) {
          setPage(loaded);
          const [x0 = 0, y0 = 0, x1 = 0, y1 = 0] = loaded.view;
          const rotated = loaded.rotate % 180 !== 0;
          const width = Math.abs(x1 - x0);
          const height = Math.abs(y1 - y0);
          latestSize.current?.(
            number,
            rotated ? { width: height, height: width } : { width, height },
          );
        }
      },
      () => undefined,
    );
    return () => {
      isCurrent = false;
    };
  }, [doc, number, isNear, page]);

  // The canvas, re-rendered at each new scale.
  useEffect(() => {
    if (!page || !isNear || !canvas) {
      return;
    }
    const task = renderPage(page, canvas, scale);
    task.promise.then(
      () => {
        setRenderedCanvas(canvas);
      },
      () => undefined,
    );
    return () => {
      task.cancel();
    };
  }, [page, isNear, scale, canvas]);

  // The text layer, laid out for the current scale.
  useEffect(() => {
    const container = textRef.current;
    if (!page || !isNear || !container) {
      return;
    }
    container.replaceChildren();
    const viewport = page.getViewport({ scale });
    const textLayer = new lib.TextLayer({
      textContentSource: page.streamTextContent(),
      container,
      viewport,
    });
    let isCurrent = true;
    textLayer.render().then(
      () => {
        if (isCurrent) {
          setLayer(textLayer);
        }
      },
      () => undefined,
    );
    return () => {
      isCurrent = false;
      textLayer.cancel();
      setLayer(null);
    };
  }, [lib, page, isNear, scale]);

  // Highlights, and the active match scrolled into view.
  useEffect(() => {
    if (!layer) {
      return;
    }
    const active = highlightRuns(layer, parts, activeParts);
    active?.scrollIntoView({ block: 'center', inline: 'nearest' });
  }, [layer, parts, activeParts]);

  const viewportSize = page
    ? page.getViewport({ scale })
    : { width: size.width * scale, height: size.height * scale };

  return (
    <div
      ref={ref}
      role="group"
      aria-label={label}
      data-page-number={number}
      className="relative mx-auto shrink-0 overflow-hidden bg-surface-1 shadow-raised [--scale-round-x:1px] [--scale-round-y:1px] [color-scheme:only_light]"
      // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the page's size at this zoom, and pdf.js's scale variable
      style={
        {
          width: `${String(viewportSize.width)}px`,
          height: `${String(viewportSize.height)}px`,
          '--total-scale-factor': String(scale),
        } as CSSProperties
      }
    >
      {isNear && <canvas ref={setCanvas} aria-hidden="true" className="absolute inset-0 block" />}
      {isNear && <div ref={textRef} className={textLayerClasses} />}
      {!isRendered && (
        <Skeleton
          shape="rect"
          className="pointer-events-none absolute inset-0 size-full rounded-none"
        />
      )}
    </div>
  );
}

export interface PdfThumbnailProps {
  doc: PDFDocumentProxy;
  number: number;
  /** Rendered once it scrolls into view. */
  isNear: boolean;
  size: PdfPageSize;
}

/** A thumbnail image of a page, rendered once it's in view. */
export function PdfThumbnail({ doc, number, isNear, size }: PdfThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendered, setRendered] = useState(false);
  const width = 88;
  const scale = width / size.width;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!isNear || isRendered || !canvas) {
      return;
    }
    let task: RenderTask | undefined;
    let isCurrent = true;
    void doc.getPage(number).then(
      (page) => {
        if (!isCurrent) {
          return;
        }
        task = renderPage(page, canvas, width / page.getViewport({ scale: 1 }).width);
        task.promise.then(
          () => {
            setRendered(true);
          },
          () => undefined,
        );
      },
      () => undefined,
    );
    return () => {
      isCurrent = false;
      task?.cancel();
    };
  }, [doc, number, isNear, isRendered]);

  return (
    <span
      className="relative block overflow-hidden bg-surface-1 shadow-raised [color-scheme:only_light]"
      // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the page's shape
      style={{ width: `${String(width)}px`, height: `${String(size.height * scale)}px` }}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="block" />
      {!isRendered && <Skeleton shape="rect" className="absolute inset-0 size-full rounded-none" />}
    </span>
  );
}
