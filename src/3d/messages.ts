// The 3D entry point's strings: their types and English defaults, merged with the app's overrides.
import { useEntryMessages } from '../provider/context';
import type { CoreMessages } from '../provider/messages';

export interface ModelViewerMessages {
  /** The progress bar's label while the model downloads. */
  modelLoading: string;
  modelLoadFailed: string;
  modelLoadFailedHint: string;
  /** The browser can't draw 3D (no WebGL). */
  modelUnsupported: string;
  modelUnsupportedHint: string;
  /** The toolbar's name. */
  modelControls: string;
  /** View presets. */
  modelViewFront: string;
  modelViewTop: string;
  modelViewRight: string;
  modelViewIso: string;
  modelWireframe: string;
  /** Starts and stops the turntable's spin. */
  modelTurntable: string;
  modelMeasure: string;
  modelClearMeasure: string;
  /** Measuring: before the first point, and before the second. */
  modelMeasureStart: string;
  modelMeasureNext: string;
  /** The measured distance, already formatted with its unit. */
  modelDistance: (params: { distance: string }) => string;
  /** The model's size along its x, y and z axes, each already formatted with its unit. */
  modelDimensions: (params: { x: string; y: string; z: string }) => string;
  /** The triangle count, already formatted. */
  modelTriangles: (params: { count: string }) => string;
  /** The canvas's text description for assistive technology. */
  modelDescription: (params: { title: string; dimensions: string; triangles: string }) => string;
  /** Shown above the triangle limit. */
  modelLargeWarning: (params: { count: string }) => string;
}

export const defaultModelViewerMessages: ModelViewerMessages = {
  modelLoading: 'Loading model',
  modelLoadFailed: 'The model couldn’t load',
  modelLoadFailedHint: 'Check the file and your connection, then try again.',
  modelUnsupported: '3D view unavailable',
  modelUnsupportedHint: 'This browser or device can’t show 3D graphics.',
  modelControls: 'View controls',
  modelViewFront: 'Front',
  modelViewTop: 'Top',
  modelViewRight: 'Right',
  modelViewIso: 'Iso',
  modelWireframe: 'Wireframe',
  modelTurntable: 'Turntable',
  modelMeasure: 'Measure',
  modelClearMeasure: 'Clear measurement',
  modelMeasureStart: 'Select a point on the model.',
  modelMeasureNext: 'Select a second point.',
  modelDistance: ({ distance }) => `Distance: ${distance}`,
  modelDimensions: ({ x, y, z }) => `${x} × ${y} × ${z}`,
  modelTriangles: ({ count }) => `${count} triangles`,
  modelDescription: ({ title, dimensions, triangles }) =>
    `3D model of ${title}, ${dimensions}, ${triangles}.`,
  modelLargeWarning: ({ count }) =>
    `This model has ${count} triangles, so it may be slow to move on some devices.`,
};

/** The strings `/3d` components read: the core strings and `/3d`'s own. */
export type ModelViewerStrings = CoreMessages & ModelViewerMessages;

/** `/3d`'s strings, with the app's overrides from `UIProvider`. */
export function useModelViewerMessages(): ModelViewerStrings {
  return useEntryMessages(defaultModelViewerMessages);
}
