// Carousel classes. Complete static strings, so Tailwind finds them.

import { cn } from '../../utils/cn';
import type { Columns, GridColumns, Space } from '../Layout/Layout';

/** Slides in view at the carousel's own width: the same container breakpoints as Grid. */
const baseColumnClasses: Record<Columns, string> = {
  1: '[--rux-carousel-columns:1]',
  2: '[--rux-carousel-columns:2]',
  3: '[--rux-carousel-columns:3]',
  4: '[--rux-carousel-columns:4]',
  5: '[--rux-carousel-columns:5]',
  6: '[--rux-carousel-columns:6]',
};
const smColumnClasses: Record<Columns, string> = {
  1: '@sm:[--rux-carousel-columns:1]',
  2: '@sm:[--rux-carousel-columns:2]',
  3: '@sm:[--rux-carousel-columns:3]',
  4: '@sm:[--rux-carousel-columns:4]',
  5: '@sm:[--rux-carousel-columns:5]',
  6: '@sm:[--rux-carousel-columns:6]',
};
const mdColumnClasses: Record<Columns, string> = {
  1: '@2xl:[--rux-carousel-columns:1]',
  2: '@2xl:[--rux-carousel-columns:2]',
  3: '@2xl:[--rux-carousel-columns:3]',
  4: '@2xl:[--rux-carousel-columns:4]',
  5: '@2xl:[--rux-carousel-columns:5]',
  6: '@2xl:[--rux-carousel-columns:6]',
};
const lgColumnClasses: Record<Columns, string> = {
  1: '@5xl:[--rux-carousel-columns:1]',
  2: '@5xl:[--rux-carousel-columns:2]',
  3: '@5xl:[--rux-carousel-columns:3]',
  4: '@5xl:[--rux-carousel-columns:4]',
  5: '@5xl:[--rux-carousel-columns:5]',
  6: '@5xl:[--rux-carousel-columns:6]',
};
const xlColumnClasses: Record<Columns, string> = {
  1: '@7xl:[--rux-carousel-columns:1]',
  2: '@7xl:[--rux-carousel-columns:2]',
  3: '@7xl:[--rux-carousel-columns:3]',
  4: '@7xl:[--rux-carousel-columns:4]',
  5: '@7xl:[--rux-carousel-columns:5]',
  6: '@7xl:[--rux-carousel-columns:6]',
};

export function columnClasses(columns: Columns | GridColumns): string {
  if (typeof columns === 'number') {
    return baseColumnClasses[columns];
  }
  return cn(
    baseColumnClasses[columns.base ?? 1],
    columns.sm && smColumnClasses[columns.sm],
    columns.md && mdColumnClasses[columns.md],
    columns.lg && lgColumnClasses[columns.lg],
    columns.xl && xlColumnClasses[columns.xl],
  );
}

/** The space between slides, on Layout's spacing scale. */
export const gapClasses: Record<Space, string> = {
  none: '[--rux-carousel-gap:0px]',
  xs: '[--rux-carousel-gap:--spacing(1)]',
  sm: '[--rux-carousel-gap:--spacing(2)]',
  md: '[--rux-carousel-gap:--spacing(4)]',
  lg: '[--rux-carousel-gap:--spacing(6)]',
  xl: '[--rux-carousel-gap:--spacing(8)]',
};

// Every slide sits in the track's one grid cell (so the track is as tall as its tallest slide), moved along by its
// slot. The track moves by whole slides, plus the drag offset while a pointer drags it.
export const trackClasses = [
  'grid grid-cols-[calc((100%-(var(--rux-carousel-columns)-1)*var(--rux-carousel-gap))/var(--rux-carousel-columns))]',
  'translate-x-[calc(var(--rux-carousel-position)*-1*(100%+var(--rux-carousel-gap))/var(--rux-carousel-columns)+var(--rux-carousel-drag,0px))]',
  'rtl:translate-x-[calc(var(--rux-carousel-position)*(100%+var(--rux-carousel-gap))/var(--rux-carousel-columns)+var(--rux-carousel-drag,0px))]',
  'transition-[translate] duration-(--duration-slow) ease-standard data-dragging:transition-none data-instant:transition-none',
].join(' ');

export const slideClasses = [
  'col-start-1 row-start-1 min-w-0',
  'translate-x-[calc(var(--rux-carousel-slot)*(100%+var(--rux-carousel-gap)))]',
  'rtl:translate-x-[calc(var(--rux-carousel-slot)*-1*(100%+var(--rux-carousel-gap)))]',
].join(' ');

export const dotClasses = [
  'group hit-area relative flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full outline-none',
  'data-focus-visible:focus-ring',
].join(' ');

export const dotMarkClasses =
  'h-2 w-2 rounded-full bg-border-strong transition-[width,background-color] duration-(--duration-normal) ease-standard group-data-hovered:bg-fg-muted group-data-selected:w-5 group-data-selected:bg-accent-solid';

/** A thumbnail is THUMBNAIL_SIZE square (`size-14`), THUMBNAIL_GAP apart (`gap-2`), with THUMBNAIL_PADDING round the strip (`p-1`). */
export const THUMBNAIL_SIZE = 56;
export const THUMBNAIL_GAP = 8;
export const THUMBNAIL_PADDING = 4;

export const thumbnailClasses = [
  'relative size-14 shrink-0 cursor-pointer overflow-hidden rounded-control border-2 border-transparent outline-none',
  'data-selected:border-accent-solid data-focus-visible:focus-ring',
].join(' ');

/** The strip of every thumbnail, centred while it fits. */
export const thumbnailStripClasses =
  'mx-auto flex w-max max-w-full gap-2 overflow-x-auto overscroll-x-contain p-1 outline-none';

/** The virtualized strip: one thumbnail high, the layout places them (with the gap and padding above). */
export const virtualThumbnailStripClasses =
  'h-16 w-full overflow-x-auto overscroll-x-contain outline-none';

/** The strip of dots, centred while it fits; touch targets reach past the dots on touch screens. */
export const dotStripClasses =
  'mx-auto flex w-max max-w-full overflow-x-auto overscroll-x-contain p-1 outline-none pointer-coarse:px-2.5';
