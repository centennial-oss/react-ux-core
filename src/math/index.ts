// Public API for @centennial-oss/react-ux-core/math: MathFormula (TeX as native MathML) and texToMathML, which need
// the optional peer dependency temml; MathInput (formula entry), which also needs mathlive (loaded on first use); and
// CoordinatePlane (function plots and geometry in SVG, no dependencies beyond temml for its TeX labels).
export { MathFormula, type MathFormulaProps } from './MathFormula';
export { texToMathML, MathSyntaxError, type MathErrorReason, type TexToMathMLOptions } from './tex';
export { MathInput, type MathInputProps } from './MathInput';
export type { MathInputMode } from './mathPalette';
export {
  CoordinatePlane,
  // The spec's name for the same component, for apps that think of it as a function plot.
  CoordinatePlane as FunctionPlot,
  type CoordinatePlaneProps,
  type PlanePoint,
  type PlanePolygon,
  type PlaneSegment,
  type PlotFunction,
} from './CoordinatePlane';
export {
  sampleFunction,
  niceTicks,
  niceStep,
  ticksAtStep,
  piTicks,
  formatPiMultiple,
  linearScale,
  type PiTick,
  type PlotPoint,
  type SampleOptions,
  type Ticks,
} from './plot';
export {
  defaultMathMessages,
  useMathMessages,
  type GreekLetterName,
  type MathMessages,
} from './messages';
