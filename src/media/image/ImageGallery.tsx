import { useState, type HTMLAttributes, type Ref } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import { Carousel } from '../../components/Carousel/Carousel';
import { Grid, type MinItemWidth } from '../../components/Layout/Layout';
import { cn } from '../../utils/cn';
import { Lightbox } from './Lightbox';
import { useMediaImageMessages } from './messages';
import type { ImageFit, MediaImage } from './types';

/** Square thumbnails in a grid, or one image at a time in a carousel. */
export type ImageGalleryLayout = 'grid' | 'carousel';

export interface ImageGalleryProps extends Omit<
  HTMLAttributes<HTMLElement>,
  'className' | 'style' | 'children'
> {
  images: readonly MediaImage[];
  /**
   * `grid`: square thumbnails, as many columns as fit. `carousel`: one image at a time, with thumbnails to jump to any.
   * Defaults to `grid`.
   */
  layout?: ImageGalleryLayout;
  /** Each grid thumbnail is at least this wide; as many columns fit as the container allows. Defaults to `8rem`. */
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

const imageButtonClasses = cn(
  'relative block w-full cursor-pointer overflow-hidden rounded-control bg-surface-3 outline-none',
  'data-focus-visible:focus-ring',
  'after:pointer-events-none after:absolute after:inset-0 after:bg-fg after:opacity-0 data-hovered:after:opacity-[0.08] data-pressed:after:opacity-[0.14]',
);

/** The carousel layout's thumbnail of an image. */
function thumbnailOf(image: MediaImage) {
  return (
    <img
      src={image.thumbnailSrc ?? image.src}
      alt=""
      loading="lazy"
      draggable={false}
      className="size-full object-cover"
    />
  );
}

/**
 * A responsive grid of square thumbnails, or a carousel of the images (`layout="carousel"`). Choosing one opens the
 * Lightbox at that image; closing it returns focus to the image that opened it.
 */
export function ImageGallery({
  images,
  layout = 'grid',
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
  const openAt = (at: number) => {
    changeIndex(at);
    setOpen(true);
  };

  return (
    <>
      {layout === 'carousel' ? (
        <Carousel
          {...rest}
          ref={ref}
          aria-label={ariaLabel ?? messages.imageGallery}
          items={images}
          // The carousel follows the lightbox, so closing it leaves the carousel on the image it showed last.
          index={index}
          onIndexChange={setIndex}
          renderThumbnail={thumbnailOf}
          className={className}
        >
          {(image, at) => (
            <figure className="flex min-w-0 flex-col gap-1">
              <AriaButton
                aria-haspopup="dialog"
                onPress={() => {
                  openAt(at);
                }}
                className={cn(imageButtonClasses, 'aspect-[4/3]')}
              >
                {/* Not loading="lazy": the carousel renders a slide only once it's near the view, and a lazy
                    image clipped beside the view wouldn't load until it slid in, flashing empty. */}
                <img
                  src={image.src}
                  alt={image.alt}
                  width={image.width}
                  height={image.height}
                  draggable={false}
                  className="size-full object-contain"
                />
              </AriaButton>
              {hasCaptions && image.caption !== undefined && (
                <figcaption className="truncate text-center text-sm text-fg-muted">
                  {image.caption}
                </figcaption>
              )}
            </figure>
          )}
        </Carousel>
      ) : (
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
                  openAt(at);
                }}
                className={cn(imageButtonClasses, 'aspect-square')}
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
      )}
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
