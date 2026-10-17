import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { itemAt, JPEG_BASELINE, phantomFiles, toImageIds, writeDicom } from '../../test/dicom';
import { DicomViewer } from './DicomViewer';
import { computeMeasurement, type DicomMeasurement } from './measurements';
import { decodeDicomImage } from './parseDicom';

// A synthetic CT-like phantom, generated in code and served from Blob URLs: deterministic, nothing downloaded.
const axialFiles = phantomFiles({ slices: 20, size: 256, seriesDescription: 'Axial 5 mm' });
const axialIds = toImageIds(axialFiles);
const thinIds = toImageIds(
  phantomFiles({ slices: 40, size: 192, seriesDescription: 'Axial 2.5 mm', seriesUid: '1.2.3.9' }),
);
const scoutIds = toImageIds(
  phantomFiles({ slices: 1, size: 128, seriesDescription: 'Scout', seriesUid: '1.2.3.10' }),
);

const overlays = {
  topLeft: ['Phantom, Ada', 'ID PHANTOM-001', 'Born 1815-12-10'],
  topRight: ['Ring phantom study', 'Observatory imaging lab', '2026-10-16'],
  bottomLeft: ['Axial 5 mm'],
  bottomRight: ['120 kV'],
};

// Measurements on slice 10, computed on that slice's pixels.
const slice = 9;
const sliceImage = decodeDicomImage(itemAt(axialFiles, slice));
const sliceId = itemAt(axialIds, slice);
const measurements: DicomMeasurement[] = [
  computeMeasurement(
    {
      id: 'length',
      kind: 'length',
      imageId: sliceId,
      sliceIndex: slice,
      points: [
        { x: 40, y: 128 },
        { x: 216, y: 128 },
      ],
    },
    sliceImage,
  ),
  computeMeasurement(
    {
      id: 'angle',
      kind: 'angle',
      imageId: sliceId,
      sliceIndex: slice,
      points: [
        { x: 70, y: 200 },
        { x: 128, y: 128 },
        { x: 200, y: 190 },
      ],
    },
    sliceImage,
  ),
  computeMeasurement(
    {
      id: 'ellipse',
      kind: 'ellipse',
      imageId: sliceId,
      sliceIndex: slice,
      points: [
        { x: 116, y: 116 },
        { x: 140, y: 140 },
      ],
    },
    sliceImage,
  ),
  computeMeasurement(
    {
      id: 'rectangle',
      kind: 'rectangle',
      imageId: sliceId,
      sliceIndex: slice,
      points: [
        { x: 150, y: 60 },
        { x: 186, y: 84 },
      ],
    },
    sliceImage,
  ),
];

const meta = {
  title: 'DICOM/DicomViewer',
  component: DicomViewer,
  args: { imageIds: axialIds, overlays },
} satisfies Meta<typeof DicomViewer>;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A 20-slice phantom stack with overlay text. Scroll with the wheel, a drag, the slider or Page Up/Page Down; pick a
 * tool and a window preset from the toolbar. A review viewer only, not for diagnostic use.
 */
export const PhantomStack: Story = {};

/** Measurements on slice 10: a length in mm, an angle, and elliptical and rectangular regions with mean and area. */
export const Measurements: Story = {
  args: {
    defaultSliceIndex: slice,
    defaultMeasurements: measurements,
    defaultTool: 'length',
  },
};

/** Several series, switched from the thumbnails. */
export const Series: Story = {
  args: {
    imageIds: undefined,
    series: [
      { id: 'axial', label: 'Axial 5 mm', imageIds: axialIds },
      { id: 'thin', label: 'Axial 2.5 mm', imageIds: thinIds },
      { id: 'scout', label: 'Scout', imageIds: scoutIds },
    ],
  },
};

/** Overlay text hidden, for a clean screenshot. */
export const OverlaysHidden: Story = {
  args: { defaultOverlayHidden: true, defaultSliceIndex: 12 },
};

/** Only some tools, no presets, and no full screen. */
export const LimitedTools: Story = {
  args: {
    tools: ['scroll', 'windowLevel', 'length'],
    presets: [],
    hasFullScreen: false,
  },
};

/** MR-style presets of the app's own. */
export const CustomPresets: Story = {
  args: {
    presets: [
      { id: 'narrow', label: 'Narrow', windowWidth: 200, windowCenter: 0 },
      { id: 'wide', label: 'Wide', windowWidth: 2000, windowCenter: 0 },
    ],
  },
};

/** In a narrow container (or on a phone) the tools and toggles collapse into menus. */
export const Narrow: Story = {
  render: (args) => (
    <div className="max-w-[360px]">
      <DicomViewer {...args} />
    </div>
  ),
};

/** No images. */
export const Empty: Story = {
  args: { imageIds: [] },
};

/** A compressed (JPEG) image the built-in parser can't decode: the app needs a custom `loadImage`. */
export const CompressedImage: Story = {
  args: {
    imageIds: toImageIds([
      writeDicom({
        rows: 2,
        columns: 2,
        pixels: new Uint16Array(4),
        transferSyntax: JPEG_BASELINE,
      }),
    ]),
  },
};

/** While the first image loads. */
export const Loading: Story = {
  tags: ['!visual'],
  args: { loadImage: () => new Promise(() => undefined) },
};

/**
 * A real anonymised CT series, if one has been added to `.storybook/public/media/ct-series/` with a `manifest.json`
 * listing its files in stack order (uncompressed DICOM). Falls back to the phantom otherwise.
 */
export const RealCtSeries: Story = {
  tags: ['!visual'],
  render: function RealCtSeries(args) {
    const [ids, setIds] = useState<string[] | null>(null);
    useEffect(() => {
      let isCurrent = true;
      void fetch('media/ct-series/manifest.json')
        .then((response) => (response.ok ? (response.json() as Promise<string[]>) : []))
        .catch(() => [])
        .then((files) => {
          if (isCurrent) {
            setIds(files.map((file) => `wadouri:media/ct-series/${file}`));
          }
        });
      return () => {
        isCurrent = false;
      };
    }, []);
    if (ids === null) {
      return <p className="text-sm text-fg-muted">Looking for a CT series…</p>;
    }
    return (
      <div className="flex flex-col gap-2">
        {ids.length === 0 && (
          <p className="text-sm text-fg-muted">
            No CT series in .storybook/public/media/ct-series/, so this shows the phantom.
          </p>
        )}
        <DicomViewer {...args} imageIds={ids.length > 0 ? ids : axialIds} overlays={undefined} />
      </div>
    );
  },
};
