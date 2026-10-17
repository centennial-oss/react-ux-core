// The `/dicom` entry point's strings and their English defaults. Apps override any of them through `UIProvider`'s
// `messages`.
import { useEntryMessages } from '../provider/context';
import type { CoreMessages } from '../provider/messages';

export interface DicomMessages {
  /** The viewer's accessible name when the app gives none. */
  dicomViewer: string;
  /** The notice under the viewer: it's a review viewer, not a diagnostic one. */
  dicomDisclaimer: string;
  /** The toolbar's accessible name. */
  dicomToolbar: string;
  /** Names the group (or menu) of mouse and touch tools. */
  dicomTool: string;
  /** The tool menu's button on phones, naming the current tool. */
  dicomCurrentTool: (params: { tool: string }) => string;
  dicomToolScroll: string;
  dicomToolWindowLevel: string;
  dicomToolPan: string;
  dicomToolZoom: string;
  dicomToolLength: string;
  dicomToolAngle: string;
  dicomToolRoi: string;
  dicomToolRectangleRoi: string;
  /** The window preset menu's button. */
  dicomPresets: string;
  /** The preset that goes back to the image's own window. */
  dicomPresetDefault: string;
  dicomPresetSoftTissue: string;
  dicomPresetLung: string;
  dicomPresetBone: string;
  dicomPresetBrain: string;
  dicomPresetAbdomen: string;
  dicomInvert: string;
  dicomResetView: string;
  /** Toggles the overlay text in the image corners (pressed while it's shown). */
  dicomOverlays: string;
  dicomFullScreen: string;
  dicomExitFullScreen: string;
  /** The image area's accessible name. */
  dicomImage: string;
  /** Read after the image area's name: the keyboard controls. */
  dicomKeyboardHelp: string;
  /** The overlay text, for screen readers. */
  dicomImageInformation: string;
  /** The slice slider's label. */
  dicomSlice: string;
  /** The slice position; `location` (already formatted) is the slice's position in mm, when the image has one. */
  dicomSlicePosition: (params: { slice: number; total: number; location?: string }) => string;
  /** The current window, formatted. */
  dicomWindowValue: (params: { width: string; center: string }) => string;
  /** The zoom, formatted as a percentage. */
  dicomZoomValue: (params: { zoom: string }) => string;
  /** Names the series thumbnails. */
  dicomSeries: string;
  /** The number of images in a series, under its thumbnail. */
  dicomSeriesImageCount: (params: { count: number }) => string;
  /** The current series, in the status line. */
  dicomSeriesValue: (params: { series: string }) => string;
  dicomNoImages: string;
  dicomLoadFailed: string;
  /** Shown when an image uses a compressed transfer syntax the built-in parser can't decode. */
  dicomCompressed: string;
  /** Names the list of measurements. */
  dicomMeasurements: string;
  dicomLengthMm: (params: { length: string }) => string;
  dicomLengthPx: (params: { length: string }) => string;
  dicomAreaMm: (params: { area: string }) => string;
  dicomAreaPx: (params: { area: string }) => string;
  /** A length measurement; `length` already has its unit. */
  dicomLengthMeasurement: (params: { length: string; slice: number }) => string;
  dicomAngleMeasurement: (params: { degrees: string; slice: number }) => string;
  /** An elliptical region; `area` already has its unit; `mean` and `stdDev` are in modality units. */
  dicomEllipseMeasurement: (params: {
    area: string;
    mean: string;
    stdDev: string;
    slice: number;
  }) => string;
  dicomRectangleMeasurement: (params: {
    area: string;
    mean: string;
    stdDev: string;
    slice: number;
  }) => string;
  dicomRemoveMeasurement: (params: { measurement: string }) => string;
  /** Announced when a measurement is finished. */
  dicomMeasurementAdded: (params: { measurement: string }) => string;
  /** Announced while placing a measurement's points from the keyboard. */
  dicomPointPlaced: (params: { placed: number; total: number }) => string;
  /** Announced when a measurement in progress is cancelled with Escape. */
  dicomMeasurementCancelled: string;
}

export const defaultDicomMessages: DicomMessages = {
  dicomViewer: 'Image viewer',
  dicomDisclaimer: 'For review only. Not for diagnostic use.',
  dicomToolbar: 'Image tools',
  dicomTool: 'Tool',
  dicomCurrentTool: ({ tool }) => `Tool: ${tool}`,
  dicomToolScroll: 'Scroll slices',
  dicomToolWindowLevel: 'Window and level',
  dicomToolPan: 'Pan',
  dicomToolZoom: 'Zoom',
  dicomToolLength: 'Length',
  dicomToolAngle: 'Angle',
  dicomToolRoi: 'Elliptical region',
  dicomToolRectangleRoi: 'Rectangular region',
  dicomPresets: 'Window',
  dicomPresetDefault: 'Image default',
  dicomPresetSoftTissue: 'Soft tissue',
  dicomPresetLung: 'Lung',
  dicomPresetBone: 'Bone',
  dicomPresetBrain: 'Brain',
  dicomPresetAbdomen: 'Abdomen',
  dicomInvert: 'Invert',
  dicomResetView: 'Reset view',
  dicomOverlays: 'Overlay text',
  dicomFullScreen: 'Full screen',
  dicomExitFullScreen: 'Exit full screen',
  dicomImage: 'Image',
  dicomKeyboardHelp:
    'Page Up and Page Down change slice, Home and End go to the first and last slice. Plus and minus zoom, 0 resets the view. The arrow keys use the current tool: they change slice, window and level, pan or zoom; with a measuring tool they move a cursor, Enter places a point and Escape cancels.',
  dicomImageInformation: 'Image information',
  dicomSlice: 'Slice',
  dicomSlicePosition: ({ slice, total, location }) =>
    location === undefined
      ? `Slice ${String(slice)} of ${String(total)}`
      : `Slice ${String(slice)} of ${String(total)}, ${location} mm`,
  dicomWindowValue: ({ width, center }) => `Window ${width}, level ${center}`,
  dicomZoomValue: ({ zoom }) => `Zoom ${zoom}`,
  dicomSeries: 'Series',
  dicomSeriesImageCount: ({ count }) => (count === 1 ? '1 image' : `${String(count)} images`),
  dicomSeriesValue: ({ series }) => `Series: ${series}`,
  dicomNoImages: 'No images',
  dicomLoadFailed: 'Couldn’t load the image',
  dicomCompressed:
    'This image is compressed in a format the viewer can’t decode. The app needs to provide an image loader for it.',
  dicomMeasurements: 'Measurements',
  dicomLengthMm: ({ length }) => `${length} mm`,
  dicomLengthPx: ({ length }) => `${length} px`,
  dicomAreaMm: ({ area }) => `${area} mm²`,
  dicomAreaPx: ({ area }) => `${area} px²`,
  dicomLengthMeasurement: ({ length, slice }) => `Length ${length}, slice ${String(slice)}`,
  dicomAngleMeasurement: ({ degrees, slice }) => `Angle ${degrees}°, slice ${String(slice)}`,
  dicomEllipseMeasurement: ({ area, mean, stdDev, slice }) =>
    `Ellipse ${area}, mean ${mean} ± ${stdDev}, slice ${String(slice)}`,
  dicomRectangleMeasurement: ({ area, mean, stdDev, slice }) =>
    `Rectangle ${area}, mean ${mean} ± ${stdDev}, slice ${String(slice)}`,
  dicomRemoveMeasurement: ({ measurement }) => `Remove ${measurement}`,
  dicomMeasurementAdded: ({ measurement }) => `Added ${measurement}`,
  dicomPointPlaced: ({ placed, total }) => `Point ${String(placed)} of ${String(total)} placed`,
  dicomMeasurementCancelled: 'Measurement cancelled',
};

/** The strings `/dicom` components read: the core strings and `/dicom`'s own. */
export type DicomStrings = CoreMessages & DicomMessages;

/** `/dicom`'s strings, with the app's overrides from `UIProvider`. */
export function useDicomMessages(): DicomStrings {
  return useEntryMessages(defaultDicomMessages);
}
