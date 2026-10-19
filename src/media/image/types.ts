// Shared types for the `/media` image components: the image itself, how it fits its frame, and annotations.
import type { ReactNode } from 'react';
import type { Tone } from '../../utils/types';

/** An image to show, zoom or annotate. */
export interface MediaImage {
  /** Identifies the image in a gallery or lightbox. */
  id: string;
  src: string;
  /** Required: describes the image for people who can't see it, and is shown if it fails to load. */
  alt: string;
  /** Shown under the image in the lightbox and the gallery. */
  caption?: ReactNode;
  /** The image's intrinsic size in pixels, if known, so the frame can lay out before it loads. */
  width?: number;
  height?: number;
  /** A smaller version for thumbnails (the gallery grid and the lightbox strip). Defaults to `src`. */
  thumbnailSrc?: string;
  /** The file name offered by the lightbox's download button. */
  downloadName?: string;
}

/** How the image first fits its frame: whole (`fit`), covering it (`fill`), or at its own pixel size (`actual`). */
export type ImageFit = 'fit' | 'fill' | 'actual';

/** A point as fractions (0–1) of the image's width and height, from its top-left corner. */
export interface AnnotationPoint {
  x: number;
  y: number;
}

interface AnnotationBase {
  id: string;
  label: string;
  /** Colour of the shape and its marker. Defaults to `accent`. */
  tone?: Tone;
  note?: string;
}

/** A single point, such as a pain location on a body map. */
export interface PinAnnotation extends AnnotationBase, AnnotationPoint {
  kind: 'pin';
}

/** An axis-aligned box: its top-left corner, width and height, as fractions of the image. */
export interface RectAnnotation extends AnnotationBase, AnnotationPoint {
  kind: 'rect';
  width: number;
  height: number;
}

/** A closed outline of three or more points. */
export interface PolygonAnnotation extends AnnotationBase {
  kind: 'polygon';
  points: readonly AnnotationPoint[];
}

/** A labelled mark on an image. Coordinates are fractions of the image (0–1), so they survive resizing. */
export type Annotation = PinAnnotation | RectAnnotation | PolygonAnnotation;

export type AnnotationKind = Annotation['kind'];
