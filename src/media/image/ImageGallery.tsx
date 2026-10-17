import { useState, type HTMLAttributes, type Ref } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import { Grid, type MinItemWidth } from '../../components/Layout/Layout';
import { cn } from '../../utils/cn';
import { Lightbox } from './Lightbox';
import { useMediaImageMessages } from './messages';
import type { ImageFit, MediaImage } from './types';

export interface ImageGalleryProps extends Omit<
  HTMLAttributes<HTMLElement>,
  'className' | 'style' | 'children'
> {
  images: readonly MediaImage[];
  /** Each thumbnail is at least this wide; as many columns fit as the container allows. Defaults to `8rem`. */
  minItemWidth?: MinItemWidth;
  /** Shows each image's caption under its thumbnail. Defaults to false (the lightbox always shows captions). */
  hasCaptions?: boolean;
  /** Shows the lightbox's download button. */
  hasDownload?: boolean;
  /** How each image first fits the lightbox. Defaults to `fit`. */
  fit?: ImageFit;
  maxZoom?: number;
  /** Called with the index of the image the lightbox shows, as it opens or changes. */
  onIndexChange?: (index: number) => void;
  /** Names the gallery. Defaults to the `imageGallery` message. */
  'aria-label'?: string;
  className?: string;
  ref?: Ref<HTMLElement>;
}

/**
 * A responsive grid of square thumbnails. Choosing one opens the Lightbox at that image; closing it returns focus to
 * the thumbnail that opened it.
 */
export function ImageGallery({
  images,
  minItemWidth = '8rem',
  hasCaptions = false,
  hasDownload = false,
  fit,
  maxZoom,
  onIndexChange,
  'aria-label': ariaLabel,
  className,
  ref,
  ...rest
}: ImageGalleryProps) {
  const messages = useMediaImageMessages();
  const [index, setIndex] = useState(0);
  const [isOpen, setOpen] = useState(false);
  const changeIndex = (next: number) => {
    setIndex(next);
    onIndexChange?.(next);
  };

  return (
    <>
      <Grid
        {...rest}
        ref={ref}
        as="ul"
        gap="sm"
        minItemWidth={minItemWidth}
        aria-label={ariaLabel ?? messages.imageGallery}
        className={className}
      >
        {images.map((image, at) => (
          <figure key={image.id} className="flex min-w-0 flex-col gap-1">
            <AriaButton
              aria-haspopup="dialog"
              onPress={() => {
                changeIndex(at);
                setOpen(true);
              }}
              className={cn(
                'relative block aspect-square w-full cursor-pointer overflow-hidden rounded-control bg-surface-3 outline-none',
                'data-focus-visible:focus-ring',
                'after:pointer-events-none after:absolute after:inset-0 after:bg-fg after:opacity-0 data-hovered:after:opacity-[0.08] data-pressed:after:opacity-[0.14]',
              )}
            >
              <img
                src={image.thumbnailSrc ?? image.src}
                alt={image.alt}
                loading="lazy"
                draggable={false}
                className="size-full object-cover"
              />
            </AriaButton>
            {hasCaptions && image.caption !== undefined && (
              <figcaption className="truncate text-sm text-fg-muted">{image.caption}</figcaption>
            )}
          </figure>
        ))}
      </Grid>
      <Lightbox
        images={images}
        index={index}
        onIndexChange={changeIndex}
        isOpen={isOpen}
        onOpenChange={setOpen}
        hasDownload={hasDownload}
        fit={fit}
        maxZoom={maxZoom}
      />
    </>
  );
}
