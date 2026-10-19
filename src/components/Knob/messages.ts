/** Strings for Knob. */
export interface KnobMessages {
  /** The value with its unit, as shown and announced ("−6 dB", "440 Hz"). */
  knobValueWithUnit: (params: { value: string; unit: string }) => string;
  /** The accessible name of the inline field for typing a value, from the knob's label ("Gain value"). */
  knobValueInput: (params: { label: string }) => string;
}

export const defaultKnobMessages: KnobMessages = {
  knobValueWithUnit: ({ value, unit }) => `${value} ${unit}`,
  knobValueInput: ({ label }) => `${label} value`,
};
