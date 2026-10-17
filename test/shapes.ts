// Shared fixtures for PropertyInspector: shapes on a sky chart, and an exposure with every property type.
import type { PropertyDef } from '../src/components/PropertyInspector/PropertyInspector';

export const shapeProperties: PropertyDef[] = [
  { id: 'name', label: 'Name', type: 'text' },
  { id: 'position', label: 'Position', type: 'vector2', group: 'Transform', unit: 'px' },
  { id: 'width', label: 'Width', type: 'number', group: 'Transform', unit: 'px', min: 0 },
  { id: 'height', label: 'Height', type: 'number', group: 'Transform', unit: 'px', min: 0 },
  { id: 'rotation', label: 'Rotation', type: 'angle', group: 'Transform', min: -360, max: 360 },
  { id: 'fill', label: 'Fill', type: 'color', group: 'Appearance' },
  {
    id: 'strokeWidth',
    label: 'Stroke width',
    type: 'number',
    group: 'Appearance',
    unit: 'px',
    min: 0,
    step: 0.5,
  },
  {
    id: 'blend',
    label: 'Blend mode',
    type: 'enum',
    group: 'Appearance',
    options: [
      { id: 'normal', label: 'Normal' },
      { id: 'multiply', label: 'Multiply' },
      { id: 'screen', label: 'Screen' },
    ],
  },
  { id: 'isVisible', label: 'Visible', type: 'boolean', group: 'Appearance' },
];

export const moonShape = {
  name: 'Moon',
  position: { x: 120, y: 80 },
  width: 64,
  height: 64,
  rotation: 0,
  fill: 'chart-1',
  strokeWidth: 2,
  blend: 'normal',
  isVisible: true,
};

export const marsShape = {
  name: 'Mars',
  position: { x: 240, y: 80 },
  width: 48,
  height: 48,
  rotation: 15,
  fill: 'chart-3',
  strokeWidth: 2,
  blend: 'normal',
  isVisible: true,
};

/** One property of every type. */
export const exposureProperties: PropertyDef[] = [
  { id: 'target', label: 'Target', type: 'text', description: 'The object observed.' },
  { id: 'frames', label: 'Frames', type: 'number', min: 1, max: 500 },
  { id: 'isGuided', label: 'Guided', type: 'boolean' },
  {
    id: 'filter',
    label: 'Filter',
    type: 'enum',
    options: [
      { id: 'r', label: 'Red' },
      { id: 'g', label: 'Green' },
      { id: 'b', label: 'Blue' },
    ],
  },
  { id: 'overlay', label: 'Overlay', type: 'color' },
  { id: 'exposure', label: 'Exposure', type: 'duration', group: 'Capture' },
  { id: 'fileSize', label: 'File size', type: 'bytes', group: 'Capture', isReadOnly: true },
  { id: 'cost', label: 'Telescope time', type: 'money', unit: 'EUR', min: 0, group: 'Capture' },
  { id: 'offset', label: 'Offset', type: 'vector2', unit: '″', group: 'Pointing' },
  { id: 'angle', label: 'Position angle', type: 'angle', min: 0, max: 359, group: 'Pointing' },
  { id: 'header', label: 'FITS header', type: 'json', group: 'Advanced' },
];

export const exposureValues = {
  target: 'M31',
  frames: 24,
  isGuided: true,
  filter: 'r',
  overlay: 'chart-2',
  exposure: 300_000,
  fileSize: 33_554_432,
  cost: '120.00',
  offset: { x: 1.5, y: -0.5 },
  angle: 38,
  header: { TELESCOP: 'NR-1', INSTRUME: 'Ada 2' },
};
