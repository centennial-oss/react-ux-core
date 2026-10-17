// The canvas entry point's strings and their English defaults. Apps override them through `UIProvider`'s `messages`.
import { useEntryMessages } from '../provider/context';
import type { CoreMessages } from '../provider/messages';

export interface CanvasMessages {
  /** The canvas's accessible name when the app doesn't give one. */
  canvasLabel: string;
  /** Read as the canvas region's role, instead of "region". */
  canvasRoleDescription: string;
  /** Names the list of items on the canvas. */
  canvasItems: string;
  /** How to work the canvas, read as its description. */
  canvasInstructions: string;
  /** How to work an item, read as its description when it can move. */
  canvasItemInstructions: string;
  /** Names the zoom toolbar. */
  canvasZoomControls: string;
  canvasZoomIn: string;
  canvasZoomOut: string;
  canvasZoomToFit: string;
  /** The button that shows the zoom level and resets it to 100%. */
  canvasResetZoom: (params: { percent: string }) => string;
  /** Announced when the zoom level changes. */
  canvasZoomLevel: (params: { percent: string }) => string;
  /** Announced after keyboard nudging, with the item's new position in world units. */
  canvasItemMoved: (params: { x: string; y: string }) => string;
  /** Announced after marquee selection. */
  canvasSelectedCount: (params: { count: number }) => string;
}

export const defaultCanvasMessages: CanvasMessages = {
  canvasLabel: 'Canvas',
  canvasRoleDescription: 'canvas',
  canvasItems: 'Items',
  canvasInstructions:
    'Use plus and minus to zoom, 0 for 100%, and the arrow keys to pan. Tab moves to the items.',
  canvasItemInstructions:
    'Arrow keys move it, Shift and arrow keys move it a grid step, Delete removes it.',
  canvasZoomControls: 'Zoom',
  canvasZoomIn: 'Zoom in',
  canvasZoomOut: 'Zoom out',
  canvasZoomToFit: 'Zoom to fit',
  canvasResetZoom: ({ percent }) => `Zoom ${percent}, reset to 100%`,
  canvasZoomLevel: ({ percent }) => `Zoom ${percent}`,
  canvasItemMoved: ({ x, y }) => `Moved to ${x}, ${y}`,
  canvasSelectedCount: ({ count }) => (count === 1 ? '1 item selected' : `${count} items selected`),
};

/** The strings `/canvas` components read: the core strings and `/canvas`'s own. */
export type CanvasStrings = CoreMessages & CanvasMessages;

/** `/canvas`'s strings, with the app's overrides from `UIProvider`. */
export function useCanvasMessages(): CanvasStrings {
  return useEntryMessages(defaultCanvasMessages);
}
