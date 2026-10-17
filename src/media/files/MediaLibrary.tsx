// MediaLibrary (FR-066): the app's stored files in a grid of cards (or a list), with search (debounced), a type
// filter, paging by cursor ("Load more"), upload by drop zone or file chooser with progress, a details panel
// (SplitView) to edit the name, alt text and tags, bulk delete with confirmation, and picking one or many files for
// `onSelect`. Tiles are named by the file's name and kind; images without alt text are flagged; uploads, deletions
// and saves are announced.

import { LayoutGrid, List, PanelRightOpen, Trash2, TriangleAlert, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type Ref } from 'react';
import { FileTrigger, useLocale } from 'react-aria-components';
import { Button } from '../../components/Button/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { ErrorState } from '../../components/ErrorState/ErrorState';
import { DropZone } from '../../components/FileField/DropZone';
import { fileKind } from '../../components/FileField/fileKind';
import { FileKindIcon } from '../../components/FileField/FileKindIcon';
import { acceptsFile, formatFileSize, uploadErrorMessage } from '../../components/FileField/files';
import { Option } from '../../components/ListBox/ListBoxParts';
import { Pillbox } from '../../components/Pillbox/Pillbox';
import { ProgressBar } from '../../components/ProgressBar/ProgressBar';
import { SearchField } from '../../components/SearchField/SearchField';
import { Select } from '../../components/Select/Select';
import { Skeleton } from '../../components/Skeleton/Skeleton';
import { SplitView } from '../../components/SplitView/SplitView';
import { TileGrid, type TileOption } from '../../components/TilePicker/TileGrid';
import { cn } from '../../utils/cn';
import { useControllableState } from '../../utils/useControllableState';
import { AssetDetails } from './AssetDetails';
import {
  isMissingAlt,
  type MediaAsset,
  type MediaAssetType,
  type MediaUploadOptions,
} from './assets';
import { fileKindLabel } from './fileSource';
import { useMediaFilesMessages, type MediaFilesStrings } from './messages';
import { useAssetPages, type LoadAssets } from './useAssetPages';

const ALL_TYPES: readonly MediaAssetType[] = ['image', 'video', 'audio', 'document'];

const typeLabelKeys = {
  image: 'libraryTypeImage',
  video: 'libraryTypeVideo',
  audio: 'libraryTypeAudio',
  document: 'libraryTypeDocument',
} as const satisfies Record<MediaAssetType, keyof MediaFilesStrings>;

export interface MediaLibraryProps {
  /** The app's paged search: a page of assets for the query, and the next page's cursor. Abort when `signal` aborts. */
  loadAssets: LoadAssets;
  /**
   * Uploads chosen or dropped files and resolves with their new assets (added to the top of the library). Report
   * progress (0–1) through `onProgress` for a progress bar; otherwise it's indeterminate. Without it, there's no
   * upload area.
   */
  onUpload?: (files: File[], options: MediaUploadOptions) => Promise<MediaAsset[]>;
  /** Saves an asset's edited name, alt text and tags. Without it, the details panel is read-only. */
  onUpdate?: (asset: MediaAsset) => Promise<void>;
  /** Deletes assets (after the user confirms). Turns on selecting several tiles to delete together. */
  onDelete?: (ids: string[]) => Promise<void>;
  /** Picking: `single` or `multiple` tiles, handed to `onSelect` by the Choose button. Defaults to `none`. */
  selectionMode?: 'none' | 'single' | 'multiple';
  /** Called with the chosen assets when Choose is pressed. */
  onSelect?: (assets: MediaAsset[]) => void;
  /** Accepted upload types, as in an input's `accept`: `image/*,.pdf`. Other files are turned away with a message. */
  accept?: string;
  /** The type filter's choices, besides "All types". Defaults to images, videos, audio and documents. */
  types?: readonly MediaAssetType[];
  /** The type filter's starting value, uncontrolled (such as `image` for a featured image picker). */
  defaultType?: MediaAssetType;
  /** `grid` or `list`, controlled. */
  view?: 'grid' | 'list';
  /** Defaults to `grid`. */
  defaultView?: 'grid' | 'list';
  onViewChange?: (view: 'grid' | 'list') => void;
  /** The height of the files and details area, as a CSS length. Defaults to `min(36rem, 70dvh)`. */
  height?: string;
  /** pdf.js's worker URL, for PDF previews. */
  workerSrc?: string;
  /** Names the library. Defaults to the `library` message. */
  'aria-label'?: string;
  className?: string;
  ref?: Ref<HTMLElement>;
}

/** An asset's tile picture: the image itself, or the icon for its kind. */
function AssetThumb({ asset, className }: { asset: MediaAsset; className?: string }) {
  const kind = fileKind(asset);
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex items-center justify-center overflow-hidden bg-surface-3 text-fg-muted',
        className,
      )}
    >
      {kind === 'image' ? (
        <img
          src={asset.thumbnailUrl ?? asset.url}
          alt=""
          loading="lazy"
          draggable={false}
          className="size-full object-cover"
        />
      ) : (
        <FileKindIcon kind={kind} className="size-8" />
      )}
    </span>
  );
}

/** The ids added to a selection, or the asset that stays in view as the details panel's subject. */
function nextActiveId(previous: readonly string[], next: readonly string[], activeId?: string) {
  const added = next.filter((id) => !previous.includes(id));
  if (added.length > 0) {
    return added[added.length - 1];
  }
  return activeId !== undefined && next.includes(activeId) ? activeId : next[next.length - 1];
}

/** Stored files to browse, upload, describe, delete and pick from. */
export function MediaLibrary({
  loadAssets,
  onUpload,
  onUpdate,
  onDelete,
  selectionMode = 'none',
  onSelect,
  accept,
  types = ALL_TYPES,
  defaultType,
  view: viewProp,
  defaultView = 'grid',
  onViewChange,
  height = 'min(36rem, 70dvh)',
  workerSrc,
  'aria-label': ariaLabel,
  className,
  ref,
}: MediaLibraryProps) {
  const messages = useMediaFilesMessages();
  const { locale } = useLocale();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<MediaAssetType | undefined>(defaultType);
  const [view, setView] = useControllableState(viewProp, defaultView, onViewChange);
  const pages = useAssetPages(loadAssets, search, type);
  // The selected assets themselves, so a selection survives a new search that hides them.
  const [selection, setSelection] = useState<readonly MediaAsset[]>([]);
  const selected = useMemo(() => selection.map((asset) => asset.id), [selection]);
  const [activeId, setActiveId] = useState<string>();
  const [announcement, setAnnouncement] = useState('');
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const [isDetailsOpen, setDetailsOpen] = useState(false);
  const [isStacked, setStacked] = useState(false);
  const [upload, setUpload] = useState<
    | { status: 'idle' }
    | { status: 'uploading'; count: number; progress?: number }
    | { status: 'error'; message: string }
  >({ status: 'idle' });
  const [rejections, setRejections] = useState<string[]>([]);
  const uploadController = useRef<AbortController | null>(null);
  useEffect(() => {
    const uploads = uploadController;
    return () => {
      uploads.current?.abort();
    };
  }, []);

  const acceptList = useMemo(
    () =>
      accept
        ?.split(',')
        .map((entry) => entry.trim())
        .filter(Boolean),
    [accept],
  );
  const gridMode: 'single' | 'multiple' =
    selectionMode === 'single'
      ? 'single'
      : selectionMode === 'multiple' || onDelete
        ? 'multiple'
        : 'single';
  const isPicking = selectionMode !== 'none';
  const activeAsset = selection.find((asset) => asset.id === activeId);

  const changeSelection = (next: string[]) => {
    setActiveId(nextActiveId(selected, next, activeId));
    setSelection(
      next.flatMap((id) => {
        const asset =
          pages.assets.find((entry) => entry.id === id) ??
          selection.find((entry) => entry.id === id);
        return asset ? [asset] : [];
      }),
    );
  };

  const uploadFiles = async (files: readonly File[]) => {
    if (!onUpload || files.length === 0) {
      return;
    }
    const accepted = files.filter((file) => acceptsFile(file, acceptList));
    setRejections(
      files
        .filter((file) => !accepted.includes(file))
        .map((file) => messages.fileTypeNotAccepted({ name: file.name })),
    );
    if (accepted.length === 0) {
      return;
    }
    uploadController.current?.abort();
    const controller = new AbortController();
    uploadController.current = controller;
    setUpload({ status: 'uploading', count: accepted.length });
    setAnnouncement(messages.libraryUploading({ count: accepted.length }));
    try {
      const assets = await onUpload(accepted, {
        signal: controller.signal,
        onProgress: (progress) => {
          if (!controller.signal.aborted) {
            setUpload({
              status: 'uploading',
              count: accepted.length,
              progress: Math.min(1, Math.max(0, progress)),
            });
          }
        },
      });
      if (controller.signal.aborted) {
        return;
      }
      pages.prepend(assets);
      setUpload({ status: 'idle' });
      setAnnouncement(messages.libraryUploaded({ count: assets.length }));
    } catch (error: unknown) {
      if (controller.signal.aborted) {
        return;
      }
      const message = uploadErrorMessage(error, messages.libraryUploadFailed);
      setUpload({ status: 'error', message });
      setAnnouncement(message);
    }
  };

  const deleteSelected = async () => {
    if (!onDelete) {
      return;
    }
    const ids = [...selected];
    await onDelete(ids);
    pages.removeIds(ids);
    setSelection([]);
    setActiveId(undefined);
    setAnnouncement(messages.libraryDeleted({ count: ids.length }));
  };

  const tiles = useMemo(
    () =>
      pages.assets.map((asset): TileOption<MediaAsset> => {
        const kindLabel = fileKindLabel(fileKind(asset), messages);
        const details =
          asset.size === undefined
            ? kindLabel
            : messages.fileKindAndSize({
                kind: kindLabel,
                size: formatFileSize(asset.size, locale),
              });
        return {
          id: asset.id,
          label: asset.name,
          description: details,
          data: asset,
          media: <AssetThumb asset={asset} className="aspect-[4/3] w-full" />,
          status: isMissingAlt(asset)
            ? { tone: 'warning', label: messages.libraryMissingAlt, icon: TriangleAlert }
            : undefined,
        };
      }),
    [pages.assets, messages, locale],
  );

  const hasQuery = search !== '' || type !== undefined;
  const files = (() => {
    if (pages.status === 'loading') {
      return (
        <div
          aria-busy="true"
          className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3"
        >
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} shape="rect" height={160} className="w-full" />
          ))}
          <span className="sr-only">{messages.loading}</span>
        </div>
      );
    }
    if (pages.status === 'error') {
      return (
        <ErrorState title={messages.libraryLoadError} onRetry={pages.reload} headingLevel={3} />
      );
    }
    if (pages.assets.length === 0 && !hasQuery) {
      return (
        <EmptyState
          title={messages.libraryEmpty}
          hint={onUpload ? messages.libraryEmptyHint : undefined}
        />
      );
    }
    return (
      <div className="flex flex-col gap-3">
        <TileGrid<TileOption<MediaAsset>>
          aria-label={messages.libraryFiles}
          items={tiles}
          selectionMode={gridMode}
          value={selected}
          onChange={changeSelection}
          density="card"
          minTileWidth={view === 'list' ? '100%' : '8.5rem'}
          emptyContent={messages.libraryNoMatches}
          renderTile={
            view === 'list'
              ? (option, state) => {
                  const asset = option.data;
                  return asset ? (
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        aria-hidden="true"
                        className={cn(
                          'flex size-4 shrink-0 items-center justify-center rounded-full border',
                          state.isSelected
                            ? 'border-accent-solid bg-accent-solid'
                            : 'border-border-strong bg-surface-1',
                        )}
                      >
                        {state.isSelected && (
                          <span className="size-1.5 rounded-full bg-accent-on-solid" />
                        )}
                      </span>
                      <AssetThumb asset={asset} className="size-10 shrink-0 rounded-control" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{asset.name}</span>
                        <span className="block truncate text-xs text-fg-muted">
                          {option.description}
                        </span>
                      </span>
                      {option.status && (
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs text-warning-fg">
                          <TriangleAlert aria-hidden="true" className="size-3.5" />
                          <span className="sr-only sm:not-sr-only">{option.status.label}</span>
                        </span>
                      )}
                    </span>
                  ) : null;
                }
              : undefined
          }
          className={view === 'list' ? '[&_[role=option]]:py-2' : undefined}
        />
        {pages.hasMore && (
          <Button
            variant="outline"
            className="self-center"
            isPending={pages.status === 'loading-more'}
            onPress={pages.loadMore}
          >
            {messages.loadMore}
          </Button>
        )}
        {pages.status === 'more-error' && (
          <p role="alert" className="text-center text-sm font-medium text-danger-fg">
            {messages.libraryLoadError}
          </p>
        )}
      </div>
    );
  })();

  const details = activeAsset ? (
    <AssetDetails
      key={activeAsset.id}
      asset={activeAsset}
      onUpdate={onUpdate}
      workerSrc={workerSrc}
      onSaved={(saved) => {
        setSelection((current) => current.map((asset) => (asset.id === saved.id ? saved : asset)));
        pages.replace(saved);
        setAnnouncement(messages.librarySaved);
      }}
    />
  ) : (
    <p className="p-4 text-sm text-fg-muted">{messages.libraryDetailsEmpty}</p>
  );

  return (
    <section
      ref={ref}
      aria-label={ariaLabel ?? messages.library}
      className={cn('relative flex min-w-0 flex-col gap-3 text-sm text-fg', className)}
    >
      <div className="flex flex-wrap items-end gap-2">
        <SearchField
          aria-label={messages.librarySearch}
          placeholder={messages.librarySearch}
          onSearch={setSearch}
          className="min-w-48 flex-1"
        />
        <Select<object, string>
          aria-label={messages.libraryTypeFilter}
          value={type ?? 'all'}
          onChange={(next) => {
            setType(next === 'all' ? undefined : (next as MediaAssetType));
          }}
          className="w-40"
        >
          <Option id="all">{messages.libraryTypeAll}</Option>
          {types.map((entry) => (
            <Option key={entry} id={entry}>
              {messages[typeLabelKeys[entry]]}
            </Option>
          ))}
        </Select>
        <Pillbox
          aria-label={messages.libraryView}
          isIconOnly
          value={view}
          onChange={setView}
          options={[
            { id: 'grid', label: messages.libraryViewGrid, icon: LayoutGrid },
            { id: 'list', label: messages.libraryViewList, icon: List },
          ]}
        />
      </div>

      {onUpload && (
        <DropZone
          label={messages.libraryDropLabel}
          onDrop={(dropped) => {
            void uploadFiles(dropped);
          }}
          isDisabled={upload.status === 'uploading'}
          className="flex-row flex-wrap p-3"
        >
          <FileTrigger
            acceptedFileTypes={acceptList}
            allowsMultiple
            onSelect={(list) => {
              if (list) {
                void uploadFiles(Array.from(list));
              }
            }}
          >
            <Button variant="outline" size="sm" isDisabled={upload.status === 'uploading'}>
              {messages.chooseFiles}
            </Button>
          </FileTrigger>
        </DropZone>
      )}
      {upload.status === 'uploading' && (
        <ProgressBar
          label={messages.libraryUploading({ count: upload.count })}
          value={upload.progress === undefined ? undefined : upload.progress * 100}
          isIndeterminate={upload.progress === undefined}
          size="sm"
        />
      )}
      {upload.status === 'error' && (
        <p className="text-sm font-medium text-danger-fg">{upload.message}</p>
      )}
      {rejections.length > 0 && (
        <ul role="alert" className="flex flex-col gap-0.5 text-xs font-medium text-danger-fg">
          {rejections.map((rejection, index) => (
            <li key={index}>{rejection}</li>
          ))}
        </ul>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-control bg-surface-2 px-3 py-1.5">
          <span className="font-medium tabular-nums">
            {messages.librarySelected({ count: selected.length })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            icon={X}
            onPress={() => {
              changeSelection([]);
            }}
          >
            {messages.libraryClearSelection}
          </Button>
          <span className="flex-1" />
          {isStacked && (
            <Button
              variant="outline"
              size="sm"
              icon={PanelRightOpen}
              onPress={() => {
                setDetailsOpen(true);
              }}
            >
              {messages.libraryDetails}
            </Button>
          )}
          {onDelete && (
            <Button
              variant="outline"
              tone="danger"
              size="sm"
              icon={Trash2}
              onPress={() => {
                setConfirmOpen(true);
              }}
            >
              {messages.delete}
            </Button>
          )}
          {isPicking && (
            <Button
              tone="accent"
              size="sm"
              onPress={() => {
                onSelect?.([...selection]);
              }}
            >
              {messages.libraryChoose({ count: selection.length })}
            </Button>
          )}
        </div>
      )}

      <div
        className="min-h-0 overflow-hidden rounded-card border border-border bg-surface-1"
        // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the app's height for the panes
        style={{ height }}
      >
        <SplitView
          paneLabels={[messages.libraryFiles, messages.libraryDetails]}
          defaultSizes={[66, 34]}
          minSizes={['14rem', '16rem']}
          isSecondaryOpen={isDetailsOpen}
          onSecondaryOpenChange={setDetailsOpen}
          onStackedChange={setStacked}
        >
          <div className="h-full min-w-0 overflow-auto p-3">{files}</div>
          {details}
        </SplitView>
      </div>

      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
      {onDelete && (
        <ConfirmDialog
          isOpen={isConfirmOpen}
          onOpenChange={setConfirmOpen}
          tone="danger"
          title={messages.libraryDeleteTitle({ count: selected.length })}
          consequence={messages.libraryDeleteConsequence}
          confirmLabel={messages.delete}
          onConfirm={deleteSelected}
        />
      )}
    </section>
  );
}
