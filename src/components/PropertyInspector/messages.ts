/** Strings for PropertyInspector. */
export interface PropertyInspectorMessages {
  /** The placeholder of a property whose value differs between the selected objects. */
  propertyMixed: string;
  /** Shown when nothing is selected (without an `emptyState`). */
  propertyEmpty: string;
  /** How many objects are being edited together ("2 objects selected"). */
  propertySelectionCount: (params: { count: number }) => string;
  /** The name of a vector's first component. */
  propertyAxisX: string;
  /** The name of a vector's second component. */
  propertyAxisY: string;
  /** The unit shown after an angle. */
  propertyDegrees: string;
}

export const defaultPropertyInspectorMessages: PropertyInspectorMessages = {
  propertyMixed: 'Mixed',
  propertyEmpty: 'Select something to see its properties.',
  propertySelectionCount: ({ count }) => `${String(count)} objects selected`,
  propertyAxisX: 'X',
  propertyAxisY: 'Y',
  propertyDegrees: '°',
};
