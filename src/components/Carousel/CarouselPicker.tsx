// The Carousel's picker: dots for each stop, thumbnails for each slide, or the position when there are too many stops
// for dots. Memoized, so the carousel's hover, focus and drag state don't render it again; a long strip of thumbnails
// renders only those in view.

import { memo, useEffect, useMemo, useRef, type ReactNode } from 'react';
import {
  ListBox,
  ListBoxItem,
  ListLayout,
  Virtualizer,
  type Key,
  type ListLayoutOptions,
  type Selection,
} from 'react-aria-components';
import type { CoreMessages } from '../../provider/messages';
import { scrollIntoViewInline, scrollSpanIntoView } from '../../utils/scroll';
import {
  dotClasses,
  dotMarkClasses,
  dotStripClasses,
  THUMBNAIL_GAP,
  THUMBNAIL_PADDING,
  THUMBNAIL_SIZE,
  thumbnailClasses,
  thumbnailStripClasses,
  virtualThumbnailStripClasses,
} from './Carousel.styles';
import type { CarouselMoveBy } from './carouselMath';

/** With more stops than this the picker shows the position ("3 of 40") instead of dots. */
export const MAX_DOTS = 20;
/** Longer strips of thumbnails render only those in view. */
export const MAX_PLAIN_THUMBNAILS = 24;

const thumbnailLayout: ListLayoutOptions = {
  orientation: 'horizontal',
  rowHeight: THUMBNAIL_SIZE,
  gap: THUMBNAIL_GAP,
  padding: THUMBNAIL_PADDING,
};

type PickerMessages = Pick<
  CoreMessages,
  'carouselPicker' | 'carouselGoToSlide' | 'carouselGoToPage' | 'carouselSlideLabel'
>;

export interface CarouselPickerProps {
  count: number;
  /** How many stops there are (the dots). */
  snaps: number;
  /** The dot shown as current. */
  currentSnap: number;
  /** The thumbnail shown as current. */
  currentSlide: number;
  /** The first slide in view, for the position. */
  firstIndex: number;
  moveBy: CarouselMoveBy;
  /** Draws a slide's thumbnail; without it the picker shows dots. */
  thumbnailOf?: (slide: number) => ReactNode;
  messages: PickerMessages;
  onChooseSnap: (snap: number) => void;
  onChooseSlide: (slide: number) => void;
}

function keyOf(keys: Selection): number | undefined {
  const [key]: (Key | undefined)[] = keys === 'all' ? [] : [...keys];
  return typeof key === 'number' ? key : undefined;
}

export const CarouselPicker = memo(function CarouselPicker({
  count,
  snaps,
  currentSnap,
  currentSlide,
  firstIndex,
  moveBy,
  thumbnailOf,
  messages,
  onChooseSnap,
  onChooseSlide,
}: CarouselPickerProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const isVirtualized = thumbnailOf !== undefined && count > MAX_PLAIN_THUMBNAILS;
  const thumbnails = useMemo(
    () => (thumbnailOf ? Array.from({ length: count }, (_, id) => ({ id })) : []),
    [count, thumbnailOf],
  );

  // Keep the current dot or thumbnail in view, without scrolling the page. A virtualized thumbnail may not be drawn
  // yet, so thumbnails go by their known place in the strip.
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) {
      return;
    }
    if (thumbnailOf) {
      scrollSpanIntoView(
        strip,
        THUMBNAIL_PADDING + currentSlide * (THUMBNAIL_SIZE + THUMBNAIL_GAP),
        THUMBNAIL_SIZE,
      );
      return;
    }
    const selected = strip.querySelector('[aria-selected="true"]');
    if (selected) {
      scrollIntoViewInline(strip, selected);
    }
  }, [thumbnailOf, currentSlide, currentSnap]);

  if (thumbnailOf) {
    const strip = (
      <ListBox
        ref={stripRef}
        aria-label={messages.carouselPicker}
        orientation="horizontal"
        selectionMode="single"
        selectionBehavior="replace"
        disallowEmptySelection
        selectedKeys={[currentSlide]}
        onSelectionChange={(keys) => {
          const slide = keyOf(keys);
          if (slide !== undefined) {
            onChooseSlide(slide);
          }
        }}
        items={thumbnails}
        dependencies={[thumbnailOf, messages]}
        className={isVirtualized ? virtualThumbnailStripClasses : thumbnailStripClasses}
      >
        {({ id }) => (
          <ListBoxItem
            id={id}
            textValue={String(id + 1)}
            aria-label={messages.carouselGoToSlide({ position: id + 1, total: count })}
            className={thumbnailClasses}
          >
            {thumbnailOf(id)}
          </ListBoxItem>
        )}
      </ListBox>
    );
    return isVirtualized ? (
      <Virtualizer layout={ListLayout} layoutOptions={thumbnailLayout}>
        {strip}
      </Virtualizer>
    ) : (
      strip
    );
  }

  if (snaps > MAX_DOTS) {
    return (
      <p className="text-center text-sm text-fg-muted tabular-nums">
        {messages.carouselSlideLabel({ position: firstIndex + 1, total: count })}
      </p>
    );
  }

  return (
    <ListBox
      ref={stripRef}
      aria-label={messages.carouselPicker}
      orientation="horizontal"
      selectionMode="single"
      selectionBehavior="replace"
      disallowEmptySelection
      selectedKeys={[currentSnap]}
      onSelectionChange={(keys) => {
        const snap = keyOf(keys);
        if (snap !== undefined) {
          onChooseSnap(snap);
        }
      }}
      className={dotStripClasses}
    >
      {Array.from({ length: snaps }, (_, snap) => (
        <ListBoxItem
          key={snap}
          id={snap}
          textValue={String(snap + 1)}
          aria-label={
            moveBy === 'page'
              ? messages.carouselGoToPage({ position: snap + 1, total: snaps })
              : messages.carouselGoToSlide({ position: snap + 1, total: count })
          }
          className={dotClasses}
        >
          <span className={dotMarkClasses} />
        </ListBoxItem>
      ))}
    </ListBox>
  );
});
