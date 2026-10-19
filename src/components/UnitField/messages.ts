import { formatIecValueInEnglish, type IecValueFormatter } from './format';

/** Strings for DurationField, ByteSizeField and BitrateField. */
export interface UnitFieldMessages {
  /** The unit select's accessible name, from the field's label ("Unit for TTL"). */
  unitFieldUnitFor: (params: { label: string }) => string;
  /** The unit select's accessible name when the field has no text label. */
  unitFieldUnit: string;
  /** Shown when the value is below `minValue`; `min` is formatted in friendly units ("1 min"). */
  unitFieldTooSmall: (params: { min: string }) => string;
  /** Shown when the value is above `maxValue`; `max` is formatted in friendly units ("1 day"). */
  unitFieldTooLarge: (params: { max: string }) => string;
  /** Shown when a DurationField's text can't be read. */
  durationFieldInvalid: string;
  /** Shown when a DurationField with `allowsCompound={false}` gets several units ("1h30m"). */
  durationFieldSingleUnit: string;
  /** Shown when a ByteSizeField's text can't be read. */
  byteSizeFieldInvalid: string;
  /** Shown when a BitrateField's text can't be read. */
  bitrateFieldInvalid: string;
  /** A binary byte amount in words, which Intl has no names for ("1.5 mebibytes"); read by screen readers. */
  unitFieldIecValue: IecValueFormatter;
}

export const defaultUnitFieldMessages: UnitFieldMessages = {
  unitFieldUnitFor: ({ label }) => `Unit for ${label}`,
  unitFieldUnit: 'Unit',
  unitFieldTooSmall: ({ min }) => `Must be at least ${min}`,
  unitFieldTooLarge: ({ max }) => `Must be at most ${max}`,
  durationFieldInvalid: 'Enter a duration such as 90s or 1h 30m',
  durationFieldSingleUnit: 'Enter a single amount, such as 90 or 90m',
  byteSizeFieldInvalid: 'Enter a size such as 512 MiB',
  bitrateFieldInvalid: 'Enter a bitrate such as 4.5 Mbps',
  unitFieldIecValue: formatIecValueInEnglish,
};
