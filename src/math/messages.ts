// The math entry point's strings (MathFormula, MathInput, CoordinatePlane), with English defaults.
import type { CommonMessages } from '../provider/coreStrings';
import { useEntryMessages } from '../provider/context';

/** A Greek letter the MathInput palette offers. */
export type GreekLetterName =
  | 'alpha'
  | 'beta'
  | 'gamma'
  | 'delta'
  | 'theta'
  | 'lambda'
  | 'mu'
  | 'pi'
  | 'sigma'
  | 'phi'
  | 'omega';

export interface MathMessages {
  /** Heading of the (i) explanation beside a formula that couldn't be converted. */
  formulaError: string;
  /** Label of the (i) button beside a formula that couldn't be converted. */
  formulaErrorDetails: string;
  /** Explains that `\ce{…}` was used in a formula without `hasChemistry`. */
  formulaChemistryDisabled: string;
  /** Names a long block formula's scroll region, such as "Equation (3)" or "Formula". */
  formulaRegion: (params: { label: string }) => string;

  /** Names MathInput's palette toolbar. */
  mathPalette: string;
  /** MathInput's palette buttons. */
  paletteFraction: string;
  paletteSquareRoot: string;
  paletteNthRoot: string;
  palettePower: string;
  paletteSubscript: string;
  paletteParentheses: string;
  paletteAbsoluteValue: string;
  paletteTimes: string;
  paletteDivide: string;
  palettePlusMinus: string;
  paletteLessOrEqual: string;
  paletteGreaterOrEqual: string;
  paletteNotEqual: string;
  paletteIntegral: string;
  paletteSum: string;
  paletteLimit: string;
  paletteInfinity: string;
  paletteMatrix: string;
  /** A Greek letter's palette button, by its English name. */
  paletteGreekLetter: (params: { name: GreekLetterName }) => string;
  /** Palette buttons that move the cursor through the formula's structure. */
  paletteMoveLeft: string;
  paletteMoveRight: string;
  /** Toggle between the visual editor and plain TeX entry. */
  mathEditAsTex: string;
  /** Description of the plain TeX text field. */
  mathTexSourceHint: string;

  /** CoordinatePlane toolbar. */
  planeZoomIn: string;
  planeZoomOut: string;
  planeResetView: string;
  planeViewAsTable: string;
  /** Names the list of plotted functions. */
  planeFunctions: string;
  /** The plane's summary for assistive technology (numbers already formatted). */
  planeSummary: (params: {
    xMin: string;
    xMax: string;
    yMin: string;
    yMax: string;
    functionCount: number;
    pointCount: number;
  }) => string;
  /** How to pan and zoom the focused plot by keyboard. */
  planeKeyboardHint: string;
  /** A point's accessible name with its coordinates (already formatted). */
  planePoint: (params: { label: string; x: string; y: string }) => string;
  /** Describes a draggable point. */
  planePointHint: string;
  /** Announced after a draggable point moves. */
  planePointMoved: (params: { label: string; x: string; y: string }) => string;
  /** A coordinate pair, such as "(1.5, −0.25)". */
  planeCoordinates: (params: { x: string; y: string }) => string;
  /** The crosshair readout's x value, such as "x = 1.5". */
  planeReadoutX: (params: { x: string }) => string;
  /** Shown in the readout until the plot is pointed at or touched. */
  planeReadoutHint: string;
  /** Names the table view of sampled values. */
  planeTable: string;
  /** A table cell where the function isn't defined. */
  planeUndefined: string;
}

export const defaultMathMessages: MathMessages = {
  formulaError: 'This formula couldn’t be displayed',
  formulaErrorDetails: 'Formula error details',
  formulaChemistryDisabled:
    'Chemical notation (\\ce) needs chemistry turned on for this formula (hasChemistry).',
  formulaRegion: ({ label }) => (label ? `Equation ${label}` : 'Formula'),

  mathPalette: 'Math templates',
  paletteFraction: 'Fraction',
  paletteSquareRoot: 'Square root',
  paletteNthRoot: 'Root',
  palettePower: 'Power',
  paletteSubscript: 'Subscript',
  paletteParentheses: 'Parentheses',
  paletteAbsoluteValue: 'Absolute value',
  paletteTimes: 'Times',
  paletteDivide: 'Divide',
  palettePlusMinus: 'Plus or minus',
  paletteLessOrEqual: 'Less than or equal to',
  paletteGreaterOrEqual: 'Greater than or equal to',
  paletteNotEqual: 'Not equal to',
  paletteIntegral: 'Integral',
  paletteSum: 'Sum',
  paletteLimit: 'Limit',
  paletteInfinity: 'Infinity',
  paletteMatrix: 'Matrix',
  paletteGreekLetter: ({ name }) => `${name.charAt(0).toUpperCase()}${name.slice(1)}`,
  paletteMoveLeft: 'Move left',
  paletteMoveRight: 'Move right',
  mathEditAsTex: 'Edit as TeX',
  mathTexSourceHint: 'TeX source, such as \\frac{1}{2}x^2',

  planeZoomIn: 'Zoom in',
  planeZoomOut: 'Zoom out',
  planeResetView: 'Reset view',
  planeViewAsTable: 'View as table',
  planeFunctions: 'Functions',
  planeSummary: ({ xMin, xMax, yMin, yMax, functionCount, pointCount }) => {
    const functions =
      functionCount === 0
        ? ''
        : ` ${String(functionCount)} ${functionCount === 1 ? 'function' : 'functions'}.`;
    const points =
      pointCount === 0 ? '' : ` ${String(pointCount)} ${pointCount === 1 ? 'point' : 'points'}.`;
    return `Coordinate plane, x from ${xMin} to ${xMax}, y from ${yMin} to ${yMax}.${functions}${points}`;
  },
  planeKeyboardHint: 'Use the arrow keys to pan, and plus or minus to zoom.',
  planePoint: ({ label, x, y }) => `${label}, (${x}, ${y})`,
  planePointHint: 'Drag, or use the arrow keys, to move this point.',
  planePointMoved: ({ label, x, y }) => `${label} moved to (${x}, ${y})`,
  planeCoordinates: ({ x, y }) => `(${x}, ${y})`,
  planeReadoutX: ({ x }) => `x = ${x}`,
  planeReadoutHint: 'Point at or touch the plot to read its values.',
  planeTable: 'Sampled values',
  planeUndefined: 'Undefined',
};

/** The strings `/math` components read: the core strings and `/math`'s own. */
export type MathStrings = CommonMessages & MathMessages;

/** `/math`'s strings, with the app's overrides from `UIProvider`. */
export function useMathMessages(): MathStrings {
  return useEntryMessages(defaultMathMessages);
}
