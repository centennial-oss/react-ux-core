// PdfViewer (FR-036): shows a PDF with pdf.js, loaded on demand (`/media` never imports pdfjs-dist statically).
// Pages render only near the viewport (the visible ones and a screen's worth either side), each with a text layer
// for selection, screen readers and search with highlights. The toolbar has the page number ("3 of 40"), zoom
// (fit width, fit page or a percentage), search, download and print, and folds into a compact row on narrow
// containers. A thumbnails sidebar sits beside wide viewers and opens as a drawer on narrow ones. Protected
// documents ask for their password in a dialog; loading shows skeleton pages, and failure an error with "Download
// instead". Page changes are announced, and a document without text (a scan) says so.
//
// Worker: pdf.js parses in a web worker. By default its URL is `new URL('pdfjs-dist/build/pdf.worker.min.mjs',
// import.meta.url)`, which Vite, webpack 5 and Parcel resolve to the app's own pdfjs-dist; otherwise pass
// `workerSrc` (for example a copy of that file served beside the app).

import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  PanelLeft,
  Printer,
  Search,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Ref,
} from 'react';
import { Button as AriaButton } from 'react-aria-components';
import { Button } from '../../components/Button/Button';
import { Dialog } from '../../components/Dialog/Dialog';
import { Drawer } from '../../components/Drawer/Drawer';
import { ErrorState } from '../../components/ErrorState/ErrorState';
import { IconButton } from '../../components/IconButton/IconButton';
import { InfoTip } from '../../components/InfoTip/InfoTip';
import { Menu, MenuItem, MenuTrigger } from '../../components/Menu/Menu';
import { NumberField } from '../../components/NumberField/NumberField';
import { SearchField } from '../../components/SearchField/SearchField';
import { Skeleton } from '../../components/Skeleton/Skeleton';
import { TextField } from '../../components/TextField/TextField';
import { Tooltip } from '../../components/Tooltip/Tooltip';
import { cn } from '../../utils/cn';
import { mergeRefs } from '../../utils/mergeRefs';
import { useDebouncedCallback } from '../../utils/timers';
import { useControllableState } from '../../utils/useControllableState';
import { useElementWidth } from '../../utils/useElementWidth';
import { isRunCurrent, type EffectRun } from './mediaDom';
import { useMediaPlayerMessages } from './messages';
import { downloadPdf, pdfFileName, printPdf, saveBytes, saveLink } from './pdfActions';
import { loadPdfjs } from './pdfjs';
import { PdfPage, PdfThumbnail, type PdfPageSize } from './PdfPage';
import { findPageMatches, type PdfMatch, type PdfMatchPart, type PdfPageText } from './pdfSearch';

type PdfJs = typeof import('pdfjs-dist');

/** `fit-width`, `fit-page`, or a percentage of the page's actual size (100 = printed size on screen). */
export type PdfZoom = 'fit-width' | 'fit-page' | number;

export interface PdfViewerProps {
  /** A URL (same origin or CORS-enabled), an ArrayBuffer, or a Blob. */
  source: string | ArrayBuffer | Blob;
  /** Names the document for assistive technology, and the downloaded file. */
  title: string;
  /** The page in view (1-based), controlled. */
  page?: number;
  /** The page to open at, uncontrolled. Defaults to 1. */
  defaultPage?: number;
  onPageChange?: (page: number) => void;
  /** The zoom, controlled. */
  zoom?: PdfZoom;
  /** The zoom to open at, uncontrolled. Defaults to `fit-width`. */
  defaultZoom?: PdfZoom;
  onZoomChange?: (zoom: PdfZoom) => void;
  /** Page thumbnails: a sidebar on wide viewers (open at first), a drawer on narrow ones. Defaults to true. */
  hasThumbnails?: boolean;
  /** In-document text search with highlights. Defaults to true. */
  hasSearch?: boolean;
  /** Defaults to true. */
  hasDownload?: boolean;
  /** Defaults to true. */
  hasPrint?: boolean;
  /** Fetch headers for authenticated documents (URL sources only). */
  httpHeaders?: Readonly<Record<string, string>>;
  /** The viewer's height. Defaults to `min(48rem, 85dvh)`. */
  height?: string;
  /**
   * Where pdf.js's worker script is served. Defaults to `new URL('pdfjs-dist/build/pdf.worker.min.mjs',
   * import.meta.url)`, which bundlers resolve to the app's own pdfjs-dist at build time. Where that doesn't resolve
   * (Vite's dev server pre-bundles dependencies, for example), pass it explicitly: in Vite,
   * `import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'`; elsewhere, a copy of that file served beside
   * the app. The worker is global to pdf.js, so the last value set applies to every viewer.
   */
  workerSrc?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/** CSS pixels per PDF point: 100% shows a page at its printed size. */
const CSS_UNITS = 96 / 72;
const PAGE_GAP = 16;
const ZOOM_STEPS = [25, 50, 75, 100, 125, 150, 200, 300, 400] as const;
const MAX_ZOOM = 400;
const WIDE_VIEWER = 640;
const SIDEBAR_VIEWER = 768;
const LAYOUT_SLACK = 32;

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; lib: PdfJs; doc: PDFDocumentProxy; size: PdfPageSize }
  | { status: 'error'; reason: 'invalid' | 'not-found' | 'password' | 'generic'; details?: string };

interface PasswordRequest {
  update: (password: string) => void;
  isRetry: boolean;
  /** A password was sent and pdf.js hasn't answered yet; the dialog stays open, busy. */
  isPending?: boolean;
}

/** Scales a scroll position, keeping the reading position across zooms. */
function scaleScroll(element: HTMLElement, ratio: number) {
  element.scrollTop *= ratio;
}

/** Tracks which observed elements are within `rootMargin` of `root`'s visible area. */
function useNearSet(root: Element | null, rootMargin: string) {
  const [near, setNear] = useState<ReadonlySet<number>>(() => new Set());
  const observer = useRef<IntersectionObserver | null>(null);
  const elements = useRef(new Map<number, Element>());
  useEffect(() => {
    if (!root) {
      return;
    }
    const instance = new IntersectionObserver(
      (entries) => {
        setNear((previous) => {
          const next = new Set(previous);
          for (const entry of entries) {
            const number = Number((entry.target as HTMLElement).dataset.near);
            if (entry.isIntersecting) {
              next.add(number);
            } else {
              next.delete(number);
            }
          }
          return next;
        });
      },
      { root, rootMargin },
    );
    observer.current = instance;
    for (const element of elements.current.values()) {
      instance.observe(element);
    }
    return () => {
      instance.disconnect();
      observer.current = null;
    };
  }, [root, rootMargin]);
  const register = useCallback(
    (number: number) => (element: HTMLElement | null) => {
      const previous = elements.current.get(number);
      if (previous && previous !== element) {
        observer.current?.unobserve(previous);
        elements.current.delete(number);
      }
      if (element) {
        element.dataset.near = String(number);
        elements.current.set(number, element);
        observer.current?.observe(element);
      }
    },
    [],
  );
  return { near, register };
}

/** Shows a PDF with on-demand pages, a text layer, search, zoom, thumbnails, download and print. */
export function PdfViewer({
  source,
  title,
  page: pageProp,
  defaultPage = 1,
  onPageChange,
  zoom: zoomProp,
  defaultZoom = 'fit-width',
  onZoomChange,
  hasThumbnails = true,
  hasSearch = true,
  hasDownload = true,
  hasPrint = true,
  httpHeaders,
  height = 'min(48rem, 85dvh)',
  workerSrc,
  className,
  ref,
}: PdfViewerProps) {
  const messages = useMediaPlayerMessages();
  const [page, setPage] = useControllableState(pageProp, defaultPage, onPageChange);
  const [zoom, setZoom] = useControllableState<PdfZoom>(zoomProp, defaultZoom, onZoomChange);
  const [rootWidthRef, rootWidth = 0] = useElementWidth();
  // Layout thresholds with some slack once crossed, so a page scrollbar appearing (because the layout changed) can't
  // flip the layout back and forth.
  const [layout, setLayout] = useState({ isWide: false, canHaveSidebar: false });
  const nextLayout = {
    isWide: rootWidth >= WIDE_VIEWER - (layout.isWide ? LAYOUT_SLACK : 0),
    canHaveSidebar: rootWidth >= SIDEBAR_VIEWER - (layout.canHaveSidebar ? LAYOUT_SLACK : 0),
  };
  if (
    rootWidth > 0 &&
    (nextLayout.isWide !== layout.isWide || nextLayout.canHaveSidebar !== layout.canHaveSidebar)
  ) {
    setLayout(nextLayout);
  }
  const { isWide, canHaveSidebar } = layout;
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [isPrinting, setPrinting] = useState(false);
  const headersKey = JSON.stringify(httpHeaders ?? {});

  // Load the document (and pdf.js, the first time). The load state and password prompt belong to their request,
  // so a new source shows as loading straight away.
  const request = useMemo(
    () => ({ source, headersKey, workerSrc }),
    [source, headersKey, workerSrc],
  );
  const [loaded, setLoaded] = useState<{ request: typeof request; state: LoadState } | null>(null);
  const [prompt, setPrompt] = useState<{
    request: typeof request;
    password: PasswordRequest | null;
  } | null>(null);
  const load: LoadState = loaded?.request === request ? loaded.state : { status: 'loading' };
  const password = prompt?.request === request ? prompt.password : null;
  const setLoad = useCallback(
    (state: LoadState) => {
      setLoaded({ request, state });
    },
    [request],
  );
  const setPassword = useCallback(
    (next: PasswordRequest | null) => {
      setPrompt({ request, password: next });
    },
    [request],
  );
  const taskRef = useRef<PDFDocumentLoadingTask | null>(null);
  useEffect(() => {
    const run: EffectRun = { isCurrent: true };
    const headers = JSON.parse(headersKey) as Record<string, string>;
    void (async () => {
      try {
        const lib = await loadPdfjs(workerSrc);
        const data =
          typeof source === 'string'
            ? undefined
            : source instanceof Blob
              ? new Uint8Array(await source.arrayBuffer())
              : // pdf.js transfers the buffer to its worker; a copy keeps the app's intact.
                new Uint8Array(source.slice(0));
        if (!isRunCurrent(run)) {
          return;
        }
        const task = lib.getDocument(
          typeof source === 'string' ? { url: source, httpHeaders: headers } : { data },
        );
        taskRef.current = task;
        task.onPassword = (update: (password: string) => void, reason: number) => {
          if (isRunCurrent(run)) {
            setPassword({ update, isRetry: reason === lib.PasswordResponses.INCORRECT_PASSWORD });
          }
        };
        const doc = await task.promise;
        const first = await doc.getPage(1);
        const viewport = first.getViewport({ scale: 1 });
        if (isRunCurrent(run)) {
          setPassword(null);
          setLoad({
            status: 'ready',
            lib,
            doc,
            size: { width: viewport.width, height: viewport.height },
          });
        }
      } catch (error: unknown) {
        if (!isRunCurrent(run)) {
          return;
        }
        const name = error instanceof Error ? error.name : '';
        const status = (error as { status?: number } | null)?.status;
        setPassword(null);
        setLoad({
          status: 'error',
          reason:
            name === 'InvalidPDFException'
              ? 'invalid'
              : name === 'PasswordException'
                ? 'password'
                : status === 404 || status === 410 || name === 'MissingPDFException'
                  ? 'not-found'
                  : 'generic',
          details: error instanceof Error ? error.message : undefined,
        });
      }
    })();
    return () => {
      run.isCurrent = false;
      void taskRef.current?.destroy();
      taskRef.current = null;
    };
  }, [source, headersKey, workerSrc, setLoad, setPassword]);

  const doc = load.status === 'ready' ? load.doc : null;
  const total = doc?.numPages ?? 0;

  // Page sizes: the first page's until each page loads its own.
  const [sizeState, setSizeState] = useState<{
    doc: PDFDocumentProxy;
    sizes: ReadonlyMap<number, PdfPageSize>;
  } | null>(null);
  const sizes = useMemo<ReadonlyMap<number, PdfPageSize>>(
    () => (sizeState?.doc === doc ? sizeState.sizes : new Map()),
    [sizeState, doc],
  );
  const onSize = useCallback(
    (number: number, size: PdfPageSize) => {
      if (!doc) {
        return;
      }
      setSizeState((previous) => {
        const known = previous?.doc === doc ? previous.sizes : new Map<number, PdfPageSize>();
        const current = known.get(number);
        if (previous && current?.width === size.width && current.height === size.height) {
          return previous;
        }
        return { doc, sizes: new Map(known).set(number, size) };
      });
    },
    [doc],
  );

  // The scroll area's size decides the fit zooms.
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const [area, setArea] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!scroller) {
      return;
    }
    const observer = new ResizeObserver(() => {
      setArea({ width: scroller.clientWidth, height: scroller.clientHeight });
    });
    observer.observe(scroller);
    return () => {
      observer.disconnect();
    };
  }, [scroller]);
  const base = load.status === 'ready' ? load.size : { width: 612, height: 792 };
  const fitWidth = Math.max(0.1, (area.width - PAGE_GAP * 2) / base.width);
  const fitPage = Math.max(0.1, Math.min(fitWidth, (area.height - PAGE_GAP * 2) / base.height));
  const scale =
    zoom === 'fit-width' ? fitWidth : zoom === 'fit-page' ? fitPage : (zoom / 100) * CSS_UNITS;
  const percent = Math.round((scale / CSS_UNITS) * 100);

  // Keep the reading position when the zoom changes.
  const lastScale = useRef(scale);
  useLayoutEffect(() => {
    if (scroller && lastScale.current !== scale && lastScale.current > 0) {
      scaleScroll(scroller, scale / lastScale.current);
    }
    lastScale.current = scale;
  }, [scale, scroller]);

  // Pages near the viewport render; the rest hold their place.
  const { near, register } = useNearSet(scroller, '100% 0px 100% 0px');
  const pageElements = useRef(new Map<number, HTMLDivElement>());
  const pageRef = useCallback(
    (number: number) => {
      const observe = register(number);
      return (element: HTMLDivElement | null) => {
        observe(element);
        if (element) {
          pageElements.current.set(number, element);
        } else {
          pageElements.current.delete(number);
        }
      };
    },
    [register],
  );
  const pageRefs = useMemo(
    () => Array.from({ length: total }, (_, index) => pageRef(index + 1)),
    [total, pageRef],
  );

  // The current page follows scrolling; changing the page (toolbar, prop) scrolls to it.
  const scrolledPage = useRef(page);
  const scrollToPage = useCallback((number: number) => {
    scrolledPage.current = number;
    pageElements.current.get(number)?.scrollIntoView({ block: 'start' });
  }, []);
  useEffect(() => {
    if (doc && page !== scrolledPage.current) {
      scrollToPage(Math.min(Math.max(1, page), doc.numPages));
    }
  }, [doc, page, scrollToPage]);
  const isFirstReady = useRef(true);
  useEffect(() => {
    if (doc && isFirstReady.current) {
      isFirstReady.current = false;
      if (page > 1) {
        // Open at the requested page once its placeholder exists.
        requestAnimationFrame(() => {
          scrollToPage(Math.min(page, doc.numPages));
        });
      }
    }
  }, [doc, page, scrollToPage]);
  useEffect(() => {
    if (!scroller || !doc) {
      return;
    }
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const top = scroller.getBoundingClientRect().top + scroller.clientHeight / 3;
        let current = 1;
        for (const [number, element] of pageElements.current) {
          if (element.getBoundingClientRect().top <= top && number > current) {
            current = number;
          }
        }
        if (current !== scrolledPage.current) {
          scrolledPage.current = current;
          setPage(current);
        }
      });
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [scroller, doc, setPage]);

  // Page changes are announced once scrolling settles.
  const [announcement, setAnnouncement] = useState('');
  const announce = useDebouncedCallback((text: string) => {
    setAnnouncement(text);
  }, 600);
  useEffect(() => {
    if (total > 0) {
      announce.run(messages.pdfPageOf({ page, total }));
    }
    // The announcement follows the page; the debounced function is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, total]);

  // Text, for search and for telling whether the document has any.
  const texts = useRef(new Map<number, Promise<PdfPageText>>());
  useEffect(() => {
    texts.current = new Map();
  }, [doc]);
  const pageText = useCallback(
    (number: number): Promise<PdfPageText> => {
      if (!doc) {
        return Promise.resolve({ items: [] });
      }
      let text = texts.current.get(number);
      if (!text) {
        text = doc
          .getPage(number)
          .then((loaded) => loaded.getTextContent())
          .then((content) => {
            const runs = content.items.filter((item) => 'str' in item);
            return {
              items: runs.map((item) => item.str),
              endsLine: runs.map((item) => item.hasEOL),
            };
          })
          // The document was closed (a new source, or unmounting) before the text arrived.
          .catch((): PdfPageText => ({ items: [] }));
        texts.current.set(number, text);
      }
      return text;
    },
    [doc],
  );
  const [hasText, setHasText] = useState(true);
  useEffect(() => {
    if (!doc) {
      return;
    }
    let isCurrent = true;
    const sample = Array.from({ length: Math.min(3, doc.numPages) }, (_, index) =>
      pageText(index + 1),
    );
    void Promise.all(sample).then((pages) => {
      if (isCurrent) {
        setHasText(pages.some((text) => text.items.some((item) => item.trim() !== '')));
      }
    });
    return () => {
      isCurrent = false;
    };
  }, [doc, pageText]);

  // Search.
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState('');
  const [matches, setMatches] = useState<PdfMatch[]>([]);
  const [activeMatch, setActiveMatch] = useState(0);
  const searchRun = useRef(0);
  const runSearch = useCallback(
    async (text: string) => {
      const run = (searchRun.current += 1);
      setSearched(text);
      if (!doc || text.trim() === '') {
        setMatches([]);
        return;
      }
      const found: PdfMatch[] = [];
      for (let number = 1; number <= doc.numPages; number += 1) {
        found.push(...findPageMatches(number, await pageText(number), text));
        if (run !== searchRun.current) {
          return;
        }
      }
      setMatches(found);
      setActiveMatch(0);
      const first = found[0];
      if (first) {
        scrollToPage(first.page);
        setPage(first.page);
      }
    },
    [doc, pageText, scrollToPage, setPage],
  );
  const goToMatch = (index: number) => {
    if (matches.length === 0) {
      return;
    }
    const next = (index + matches.length) % matches.length;
    setActiveMatch(next);
    const match = matches[next];
    if (match) {
      scrollToPage(match.page);
      setPage(match.page);
    }
  };
  const partsByPage = useMemo(() => {
    const map = new Map<number, PdfMatchPart[]>();
    for (const match of matches) {
      const list = map.get(match.page) ?? [];
      list.push(...match.parts);
      map.set(match.page, list);
    }
    return map;
  }, [matches]);
  const active = matches[activeMatch];
  const noParts = useMemo<PdfMatchPart[]>(() => [], []);

  const fileName = pdfFileName(title);
  const download = () => {
    if (doc) {
      void downloadPdf(doc, fileName);
    } else if (typeof source === 'string') {
      saveLink(source, fileName);
    } else {
      saveBytes(source, fileName);
    }
  };
  const print = () => {
    if (!doc) {
      return;
    }
    setPrinting(true);
    void printPdf(doc, title).finally(() => {
      setPrinting(false);
    });
  };

  const zoomBy = (direction: 1 | -1) => {
    const next =
      direction > 0
        ? ZOOM_STEPS.find((step) => step > percent)
        : [...ZOOM_STEPS].reverse().find((step) => step < percent);
    if (next !== undefined) {
      setZoom(next);
    }
  };

  // Password prompt.
  const passwordFormId = useId();
  const [passwordValue, setPasswordValue] = useState('');
  const submitPassword = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    if (!password || password.isPending) {
      return;
    }
    // The dialog stays open (busy) until pdf.js answers: it asks again when the password is wrong.
    setPassword({ ...password, isPending: true });
    password.update(passwordValue);
    setPasswordValue('');
  };
  const cancelPassword = () => {
    setPassword(null);
    setPasswordValue('');
    void taskRef.current?.destroy();
    setLoad({ status: 'error', reason: 'password' });
  };

  const showSidebar = hasThumbnails && canHaveSidebar && isSidebarOpen && doc !== null;
  const [sidebar, setSidebar] = useState<HTMLElement | null>(null);
  const { near: nearThumbs, register: registerThumb } = useNearSet(sidebar, '50% 0px');

  const thumbnailList = (onChoose?: () => void, nearSet?: ReadonlySet<number>) =>
    doc ? (
      <ol className="m-0 flex list-none flex-col items-center gap-3 p-0">
        {Array.from({ length: total }, (_, index) => {
          const number = index + 1;
          const isCurrent = number === page;
          return (
            <li key={number} ref={nearSet ? registerThumb(number) : undefined}>
              <AriaButton
                aria-label={messages.pdfPageOf({ page: number, total })}
                aria-current={isCurrent ? 'page' : undefined}
                onPress={() => {
                  scrollToPage(number);
                  setPage(number);
                  onChoose?.();
                }}
                className={cn(
                  'flex cursor-pointer flex-col items-center gap-1 rounded-control p-1 outline-none',
                  'data-focus-visible:focus-ring data-hovered:bg-surface-3',
                  isCurrent && 'bg-accent-bg',
                )}
              >
                <PdfThumbnail
                  doc={doc}
                  number={number}
                  isNear={nearSet ? nearSet.has(number) : true}
                  size={sizes.get(number) ?? base}
                />
                <span
                  className={cn(
                    'text-xs tabular-nums',
                    isCurrent ? 'font-semibold text-accent-fg' : 'text-fg-muted',
                  )}
                >
                  {number}
                </span>
              </AriaButton>
            </li>
          );
        })}
      </ol>
    ) : null;

  const zoomKey = typeof zoom === 'number' ? String(zoom) : zoom;
  const zoomMenu = (
    <MenuTrigger>
      <Button
        size="sm"
        variant="ghost"
        aria-label={messages.pdfZoomValue({ percent })}
        isDisabled={!doc}
        className="min-w-16 tabular-nums"
      >
        {messages.pdfZoomPercent({ percent })}
        <ChevronDown aria-hidden="true" className="size-3.5" />
      </Button>
      <Menu
        aria-label={messages.pdfZoom}
        selectionMode="single"
        selectedKeys={[zoomKey]}
        disallowEmptySelection
        onAction={(key) => {
          setZoom(key === 'fit-width' || key === 'fit-page' ? key : Number(key));
        }}
      >
        <MenuItem id="fit-width">{messages.pdfFitWidth}</MenuItem>
        <MenuItem id="fit-page">{messages.pdfFitPage}</MenuItem>
        {ZOOM_STEPS.map((step) => (
          <MenuItem key={step} id={String(step)}>
            {messages.pdfZoomPercent({ percent: step })}
          </MenuItem>
        ))}
      </Menu>
    </MenuTrigger>
  );

  const pageField = (
    <div className="flex items-center gap-1 text-sm">
      <NumberField
        aria-label={messages.pdfPageLabel}
        value={total > 0 ? page : null}
        minValue={1}
        maxValue={Math.max(1, total)}
        step={1}
        size="sm"
        isDisabled={!doc}
        onChange={(value) => {
          if (value !== null) {
            scrollToPage(value);
            setPage(value);
          }
        }}
        className="w-16"
      />
      <span className="whitespace-nowrap text-fg-muted tabular-nums">
        {messages.pdfPageCount({ total })}
      </span>
    </div>
  );

  const matchStatus =
    searched.trim() === ''
      ? ''
      : matches.length === 0
        ? messages.pdfNoMatches
        : messages.pdfMatchOf({ current: activeMatch + 1, total: matches.length });
  const searchControls = hasSearch ? (
    <div className="flex min-w-0 flex-1 items-center gap-1">
      <SearchField
        aria-label={messages.pdfSearch}
        placeholder={messages.pdfSearch}
        size="sm"
        value={query}
        onChange={setQuery}
        onSearch={(value) => {
          void runSearch(value);
        }}
        onSubmit={(value) => {
          if (value === searched && matches.length > 0) {
            goToMatch(activeMatch + 1);
          }
        }}
        isDisabled={!doc}
        className="min-w-0 flex-1 sm:max-w-56"
      />
      <span
        aria-live="polite"
        className="min-w-0 shrink-0 truncate text-xs whitespace-nowrap text-fg-muted tabular-nums"
      >
        {matchStatus}
      </span>
      <IconButton
        icon={ChevronUp}
        size="sm"
        aria-label={messages.pdfPreviousMatch}
        isDisabled={matches.length === 0}
        onPress={() => {
          goToMatch(activeMatch - 1);
        }}
      />
      <IconButton
        icon={ChevronDown}
        size="sm"
        aria-label={messages.pdfNextMatch}
        isDisabled={matches.length === 0}
        onPress={() => {
          goToMatch(activeMatch + 1);
        }}
      />
    </div>
  ) : null;

  const noTextTip =
    !hasText && doc ? (
      <InfoTip aria-label={messages.pdfNoTextLabel}>{messages.pdfNoText}</InfoTip>
    ) : null;

  const thumbnailsButton = hasThumbnails ? (
    <Tooltip content={messages.pdfThumbnails}>
      {canHaveSidebar ? (
        <IconButton
          icon={PanelLeft}
          size="sm"
          aria-label={messages.pdfThumbnails}
          isSelected={isSidebarOpen}
          onChange={setSidebarOpen}
          isDisabled={!doc}
        />
      ) : (
        <IconButton
          icon={PanelLeft}
          size="sm"
          aria-label={messages.pdfThumbnails}
          isDisabled={!doc}
          onPress={() => {
            setDrawerOpen(true);
          }}
        />
      )}
    </Tooltip>
  ) : null;

  const actionButtons = (
    <>
      {hasDownload && (
        <Tooltip content={messages.pdfDownload}>
          <IconButton
            icon={Download}
            size="sm"
            aria-label={messages.pdfDownload}
            onPress={download}
          />
        </Tooltip>
      )}
      {hasPrint && (
        <Tooltip content={messages.pdfPrint}>
          <IconButton
            icon={Printer}
            size="sm"
            aria-label={messages.pdfPrint}
            isDisabled={!doc}
            isPending={isPrinting}
            onPress={print}
          />
        </Tooltip>
      )}
    </>
  );

  const toolbar = (
    <div
      role="toolbar"
      aria-label={messages.pdfToolbar}
      className="flex shrink-0 flex-col gap-1 border-b border-border bg-surface-2 px-2 py-1.5"
    >
      <div className="flex min-w-0 items-center gap-1">
        {thumbnailsButton}
        {isWide && (
          <IconButton
            icon={ChevronLeft}
            size="sm"
            aria-label={messages.pdfPreviousPage}
            isDisabled={!doc || page <= 1}
            onPress={() => {
              const target = Math.max(1, page - 1);
              scrollToPage(target);
              setPage(target);
            }}
            className="rtl:rotate-180"
          />
        )}
        {pageField}
        {isWide && (
          <IconButton
            icon={ChevronRight}
            size="sm"
            aria-label={messages.pdfNextPage}
            isDisabled={!doc || page >= total}
            onPress={() => {
              const target = Math.min(total, page + 1);
              scrollToPage(target);
              setPage(target);
            }}
            className="rtl:rotate-180"
          />
        )}
        <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
        {isWide && (
          <IconButton
            icon={ZoomOut}
            size="sm"
            aria-label={messages.pdfZoomOut}
            isDisabled={!doc || percent <= ZOOM_STEPS[0]}
            onPress={() => {
              zoomBy(-1);
            }}
          />
        )}
        {zoomMenu}
        {isWide && (
          <IconButton
            icon={ZoomIn}
            size="sm"
            aria-label={messages.pdfZoomIn}
            isDisabled={!doc || percent >= MAX_ZOOM}
            onPress={() => {
              zoomBy(1);
            }}
          />
        )}
        {isWide ? (
          <>
            <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
            {searchControls}
          </>
        ) : (
          <span className="flex-1" />
        )}
        {noTextTip}
        {!isWide && hasSearch && (
          <IconButton
            icon={Search}
            size="sm"
            aria-label={messages.pdfSearch}
            isSelected={isSearchOpen}
            onChange={setSearchOpen}
            isDisabled={!doc}
          />
        )}
        {actionButtons}
      </div>
      {!isWide && isSearchOpen && searchControls}
    </div>
  );

  const errorDescription =
    load.status === 'error'
      ? load.reason === 'invalid'
        ? messages.pdfInvalid
        : load.reason === 'not-found'
          ? messages.pdfNotFound
          : load.reason === 'password'
            ? messages.pdfPasswordRequired
            : messages.pdfLoadErrorDescription
      : undefined;

  return (
    <div
      ref={mergeRefs(ref, rootWidthRef)}
      role="region"
      aria-label={title}
      aria-busy={load.status === 'loading' || undefined}
      className={cn(
        'flex min-w-0 flex-col overflow-hidden rounded-card border border-border bg-surface-1 text-fg',
        className,
      )}
      // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the app's height for the viewer
      style={{ height }}
    >
      {toolbar}
      <div className="flex min-h-0 flex-1">
        {showSidebar && (
          <nav
            ref={setSidebar}
            aria-label={messages.pdfThumbnails}
            className="w-32 shrink-0 overflow-y-auto border-e border-border bg-surface-2 py-3"
          >
            {thumbnailList(undefined, nearThumbs)}
          </nav>
        )}
        <div
          ref={setScroller}
          // The pages scroll; keyboard users scroll them with the arrows and Page Up/Down.
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          aria-label={title}
          role="document"
          className="relative min-h-0 min-w-0 flex-1 overflow-auto bg-surface-3 outline-none focus-visible:focus-ring"
        >
          {load.status === 'loading' && (
            <div className="flex flex-col items-center gap-4 p-4">
              {[0, 1].map((index) => (
                <Skeleton
                  key={index}
                  shape="rect"
                  className="aspect-[8.5/11] w-full max-w-2xl rounded-none"
                />
              ))}
            </div>
          )}
          {load.status === 'error' && (
            <div className="flex flex-col items-center gap-3 p-6">
              <ErrorState
                title={messages.pdfLoadError}
                description={errorDescription}
                details={load.details}
              />
              {hasDownload && load.reason !== 'invalid' && (
                <Button variant="outline" icon={Download} onPress={download}>
                  {messages.pdfDownloadInstead}
                </Button>
              )}
            </div>
          )}
          {load.status === 'ready' && (
            <div className="flex w-max min-w-full flex-col items-center gap-4 p-4">
              {pageRefs.map((refForPage, index) => {
                const number = index + 1;
                return (
                  <PdfPage
                    key={number}
                    ref={refForPage}
                    lib={load.lib}
                    doc={load.doc}
                    number={number}
                    scale={scale}
                    size={sizes.get(number) ?? load.size}
                    isNear={near.has(number) || Math.abs(number - page) <= 1}
                    label={messages.pdfPageOf({ page: number, total })}
                    parts={partsByPage.get(number) ?? noParts}
                    activeParts={active?.page === number ? active.parts : noParts}
                    onSize={onSize}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
      {hasThumbnails && !canHaveSidebar && (
        <Drawer
          title={messages.pdfThumbnails}
          isOpen={isDrawerOpen}
          onOpenChange={setDrawerOpen}
          side="start"
        >
          {thumbnailList(() => {
            setDrawerOpen(false);
          })}
        </Drawer>
      )}
      <Dialog
        title={messages.pdfPasswordTitle}
        description={messages.pdfPasswordDescription({ title })}
        isOpen={password !== null}
        isBusy={password?.isPending === true}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            cancelPassword();
          }
        }}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onPress={cancelPassword}>
              {messages.cancel}
            </Button>
            <Button type="submit" form={passwordFormId} tone="accent">
              {messages.pdfOpen}
            </Button>
          </div>
        }
      >
        <form id={passwordFormId} onSubmit={submitPassword}>
          <TextField
            type="password"
            label={messages.pdfPassword}
            value={passwordValue}
            onChange={setPasswordValue}
            isInvalid={password?.isRetry === true}
            // The error comes from pdf.js, not the field, so it mustn't block the form's next submission.
            validationBehavior="aria"
            errorMessage={messages.pdfPasswordIncorrect}
            // The dialog opens to enter the password, so its field takes focus.
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
        </form>
      </Dialog>
    </div>
  );
}
