// The `/media` image components' strings (ImageViewer, Lightbox, ImageGallery, ImageAnnotator) and their English
// defaults. Apps override any of them through `UIProvider`'s `messages`.
import type { CommonMessages } from '../../provider/coreStrings';
import { useEntryMessages } from '../../provider/context';

export interface MediaImageMessages {
  /** The viewer's accessible name when the app gives none. */
  imageViewer: string;
  /** The role description of the zoomable image area (its name is the image's alt text). */
  imageZoomable: string;
  /** Describes the image area's gestures and keys. */
  imageViewerHelp: string;
  /** Names the zoom, rotate and reset toolbar. */
  imageControls: string;
  imageZoomIn: string;
  imageZoomOut: string;
  imageRotateLeft: string;
  imageRotateRight: string;
  imageResetView: string;
  /** The zoom level, shown in the toolbar and announced when it changes; `zoom` is a formatted percentage. */
  imageZoomLevel: (params: { zoom: string }) => string;
  /** The heading shown in place of an image that failed to load (its alt text is shown under it). */
  imageLoadError: string;
  /** Names the full-screen lightbox dialog. */
  imageLightbox: string;
  imagePrevious: string;
  imageNext: string;
  /** Which image the lightbox shows, for example "3 of 12". */
  imagePosition: (params: { position: number; total: number }) => string;
  /** Names the lightbox's strip of thumbnails. */
  imageThumbnails: string;
  imageDownload: string;
  /** The gallery's accessible name when the app gives none. */
  imageGallery: string;
  /** Names the annotation list. */
  annotatorList: string;
  /** Names the group of drawing tools. */
  annotatorTools: string;
  annotatorToolSelect: string;
  /** The menu button that adds an annotation in the middle of the view. */
  annotatorAdd: string;
  /** Finishes the polygon being drawn. */
  annotatorFinishShape: string;
  /** Names the edit popover and the list's edit buttons. */
  annotatorEdit: (params: { label: string }) => string;
  annotatorDelete: (params: { label: string }) => string;
  annotatorLabel: string;
  annotatorNote: string;
  /** Shown for an annotation without a label. */
  annotatorUnlabelled: string;
  /** Shown in the list when there are no annotations. */
  annotatorEmpty: string;
  /** The editor's button that closes it (changes apply as they're made). */
  annotatorDone: string;
  /** Describes the annotator's extra keys, after the viewer's own. */
  annotatorHelp: string;
  /** Describes the polygon tool while a shape is being drawn. */
  annotatorPolygonHelp: string;
  /** Announced when an annotation is added. */
  annotatorAdded: (params: { label: string }) => string;
  /** Announced when an annotation is deleted. */
  annotatorDeleted: (params: { label: string }) => string;
  /** The kind of annotation, shown in the list. */
  annotatorKindPin: string;
  annotatorKindRect: string;
  annotatorKindPolygon: string;
}

export const defaultMediaImageMessages: MediaImageMessages = {
  imageViewer: 'Image viewer',
  imageZoomable: 'zoomable image',
  imageViewerHelp:
    'Scroll or pinch to zoom, drag to pan, and double-click or double-tap to switch to 100%. Keys: plus and minus zoom, 0 resets, the arrow keys pan, and R rotates.',
  imageControls: 'Image controls',
  imageZoomIn: 'Zoom in',
  imageZoomOut: 'Zoom out',
  imageRotateLeft: 'Rotate left',
  imageRotateRight: 'Rotate right',
  imageResetView: 'Reset view',
  imageZoomLevel: ({ zoom }) => zoom,
  imageLoadError: 'Couldn’t load the image',
  imageLightbox: 'Images',
  imagePrevious: 'Previous image',
  imageNext: 'Next image',
  imagePosition: ({ position, total }) => `${position} of ${total}`,
  imageThumbnails: 'Thumbnails',
  imageDownload: 'Download',
  imageGallery: 'Image gallery',
  annotatorList: 'Annotations',
  annotatorTools: 'Annotation tools',
  annotatorToolSelect: 'Select and move',
  annotatorAdd: 'Add',
  annotatorFinishShape: 'Finish shape',
  annotatorEdit: ({ label }) => `Edit ${label}`,
  annotatorDelete: ({ label }) => `Delete ${label}`,
  annotatorLabel: 'Label',
  annotatorNote: 'Note',
  annotatorUnlabelled: 'Unlabelled',
  annotatorEmpty: 'No annotations yet.',
  annotatorDone: 'Done',
  annotatorHelp:
    'With a drawing tool chosen, Enter adds a shape in the middle of the view. With a shape selected, the arrow keys move it (Shift for bigger steps, Alt to resize a rectangle), Enter edits it, Delete removes it and Escape deselects it.',
  annotatorPolygonHelp:
    'Tap to add points. Tap the first point, press Enter or choose Finish shape to close it.',
  annotatorAdded: ({ label }) => `${label} added`,
  annotatorDeleted: ({ label }) => `${label} deleted`,
  annotatorKindPin: 'Pin',
  annotatorKindRect: 'Rectangle',
  annotatorKindPolygon: 'Polygon',
};

/** The strings `/media` image components read: the core strings and their own. */
export type MediaImageStrings = CommonMessages & MediaImageMessages;

/** The `/media` image components' strings, with the app's overrides from `UIProvider`. */
export function useMediaImageMessages(): MediaImageStrings {
  return useEntryMessages(defaultMediaImageMessages);
}
