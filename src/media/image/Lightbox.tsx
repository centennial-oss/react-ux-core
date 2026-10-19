import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react';
import { useEffect, useRef, type KeyboardEvent } from 'react';
import { preload } from 'react-dom';
import {
  Dialog as AriaDialog,
  ListBox,
  ListBoxItem,
  Modal,
  ModalOverlay,
  useLocale,
  type Key,
  type Selection,
} from 'react-aria-components';
import { Button } from '../../components/Button/Button';
import { IconButton } from '../../components/IconButton/IconButton';
import { cn } from '../../utils/cn';
import { saveUrl } from '../../utils/download';
import { clamp } from '../../utils/math';
import { useControllableState } from '../../utils/useControllableState';
import { ImageViewerBase } from './ImageViewer';
import { useMediaImageMessages } from './messages';
import type { ImageFit, MediaImage } from './types';

export interface LightboxProps {
  images: readonly MediaImage[];
  /** The index of the image shown, controlled. */
  index?: number;
  /** The index of the image shown first, uncontrolled. Defaults to 0. */
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Controlled open state. */
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  /** Shows a download button for the current image (named by its `downloadName`). */
  hasDownload?: boolean;
  /** Shows the strip of thumbnails when there's more than one image. Defaults to true. */
  hasThumbnails?: boolean;
  /** How each image first fits the screen. Defaults to `fit`. */
  fit?: ImageFit;
  minZoom?: number;
  maxZoom?: number;
  /** Names the dialog. Defaults to the `imageLightbox` message. */
  'aria-label'?: string;
}

function firstKey(keys: Selection): string | undefined {
  if (keys === 'all') {
    return undefined;
  }
  const key: Key | undefined = keys.values().next().value;
  return key === undefined ? undefined : String(key);
}

/**
 * A full-screen dialog for browsing images: each one can be zoomed, panned and rotated as in ImageViewer. Previous
 * and next buttons, the arrow keys (when the image isn't panning), swipes and a strip of thumbnails change image, and
 * the neighbouring images are preloaded. Focus is trapped inside and returns where it was on close.
 */
export function Lightbox({
  images,
  index,
  defaultIndex = 0,
  onIndexChange,
  isOpen,
  defaultOpen = false,
  onOpenChange,
  hasDownload = false,
  hasThumbnails = true,
  fit,
  minZoom,
  maxZoom,
  'aria-label': ariaLabel,
}: LightboxProps) {
  const messages = useMediaImageMessages();
  const { direction } = useLocale();
  const [open, setOpen] = useControllableState(isOpen, defaultOpen, onOpenChange);
  const [currentIndex, setCurrentIndex] = useControllableState(index, defaultIndex, onIndexChange);
  const total = images.length;
  const position = clamp(currentIndex, 0, Math.max(0, total - 1));
  const image = images[position];
  const stripRef = useRef<HTMLDivElement>(null);

  // Preload the neighbours, so changing image is instant.
  const neighbours = [images[position - 1], images[position + 1]];
  if (open) {
    for (const neighbour of neighbours) {
      if (neighbour) {
        preload(neighbour.src, { as: 'image' });
      }
    }
  }

  // Keep the current thumbnail in view.
  const imageId = image?.id;
  useEffect(() => {
    if (!open || imageId === undefined) {
      return;
    }
    const thumbnail = [...(stripRef.current?.querySelectorAll('[data-key]') ?? [])].find(
      (element) => element.getAttribute('data-key') === imageId,
    );
    thumbnail?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [open, imageId]);

  const go = (to: number) => {
    if (to >= 0 && to < total && to !== position) {
      setCurrentIndex(to);
    }
  };
  const isRtl = direction === 'rtl';
  const PreviousIcon = isRtl ? ChevronRight : ChevronLeft;
  const NextIcon = isRtl ? ChevronLeft : ChevronRight;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Toolbars and the thumbnail strip move focus with the arrow keys; a panning image has used the key already.
    if (
      event.defaultPrevented ||
      !(event.target instanceof Element) ||
      event.target.closest('[role="toolbar"], [role="listbox"]')
    ) {
      return;
    }
    switch (event.key) {
      case isRtl ? 'ArrowRight' : 'ArrowLeft':
        go(position - 1);
        break;
      case isRtl ? 'ArrowLeft' : 'ArrowRight':
        go(position + 1);
        break;
      case 'Home':
        go(0);
        break;
      case 'End':
        go(total - 1);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  return (
    <ModalOverlay
      isOpen={open}
      onOpenChange={setOpen}
      isDismissable={false}
      className={cn(
        'fixed inset-0 z-modal h-(--visual-viewport-height) bg-scrim',
        'data-entering:animate-[rux-fade-in_var(--duration-normal)_var(--ease-standard)]',
        'data-exiting:animate-[rux-fade-out_var(--duration-fast)_var(--ease-standard)]',
      )}
    >
      <Modal className="flex size-full flex-col bg-surface-1 text-fg outline-none">
        <AriaDialog
          aria-label={ariaLabel ?? messages.imageLightbox}
          className="flex min-h-0 flex-1 flex-col outline-none"
        >
          {({ close }) =>
            image && (
              // Keys bubbling up from the dialog's controls change image.
              // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- see above.
              <div
                onKeyDown={onKeyDown}
                className="flex min-h-0 flex-1 flex-col gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
              >
                <header className="flex shrink-0 items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg-muted tabular-nums">
                    {messages.imagePosition({ position: position + 1, total })}
                  </span>
                  {hasDownload && (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Download}
                      onPress={() => {
                        // A cross-origin image ignores `download`, so it opens in a new tab instead.
                        saveUrl(image.src, image.downloadName ?? '', { isNewTab: true });
                      }}
                    >
                      {messages.imageDownload}
                    </Button>
                  )}
                  <IconButton icon={X} aria-label={messages.close} onPress={close} />
                </header>
                <div className="relative flex min-h-0 flex-1 flex-col">
                  <ImageViewerBase
                    image={image}
                    fit={fit}
                    minZoom={minZoom}
                    maxZoom={maxZoom}
                    isFill
                    shouldAutoFocus
                    onSwipe={(swipe) => {
                      go(swipe === 'next' ? position + 1 : position - 1);
                    }}
                  />
                  {total > 1 && (
                    <>
                      <IconButton
                        icon={PreviousIcon}
                        aria-label={messages.imagePrevious}
                        variant="soft"
                        isDisabled={position === 0}
                        onPress={() => {
                          go(position - 1);
                        }}
                        className="absolute start-2 top-[calc(50%-2rem)] shadow-overlay"
                      />
                      <IconButton
                        icon={NextIcon}
                        aria-label={messages.imageNext}
                        variant="soft"
                        isDisabled={position === total - 1}
                        onPress={() => {
                          go(position + 1);
                        }}
                        className="absolute end-2 top-[calc(50%-2rem)] shadow-overlay"
                      />
                    </>
                  )}
                </div>
                {image.caption !== undefined && (
                  <div className="shrink-0 text-center text-sm text-fg">{image.caption}</div>
                )}
                {hasThumbnails && total > 1 && (
                  <div ref={stripRef} className="shrink-0">
                    <ListBox
                      aria-label={messages.imageThumbnails}
                      orientation="horizontal"
                      selectionMode="single"
                      selectionBehavior="replace"
                      disallowEmptySelection
                      selectedKeys={[image.id]}
                      onSelectionChange={(keys) => {
                        const key = firstKey(keys);
                        go(images.findIndex((candidate) => candidate.id === key));
                      }}
                      className="flex gap-2 overflow-x-auto overscroll-x-contain p-1 outline-none sm:justify-center"
                    >
                      {images.map((item) => (
                        <ListBoxItem
                          key={item.id}
                          id={item.id}
                          textValue={item.alt}
                          className={cn(
                            'relative size-14 shrink-0 cursor-pointer overflow-hidden rounded-control border-2 border-transparent outline-none',
                            'data-selected:border-accent-solid data-focus-visible:focus-ring',
                          )}
                        >
                          <img
                            src={item.thumbnailSrc ?? item.src}
                            alt={item.alt}
                            draggable={false}
                            loading="lazy"
                            className="size-full object-cover"
                          />
                        </ListBoxItem>
                      ))}
                    </ListBox>
                  </div>
                )}
              </div>
            )
          }
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}
