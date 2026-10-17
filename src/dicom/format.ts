// Text for measurements: the full description (lists, announcements) and the short label drawn beside the shape.

import type { DicomMeasurement } from './measurements';
import type { DicomStrings } from './messages';

export interface MeasurementFormatter {
  /** The full description, such as "Length 42.3 mm, slice 57". */
  describe: (measurement: DicomMeasurement) => string;
  /** The short label drawn on the image, such as "42.3 mm". */
  label: (measurement: DicomMeasurement) => string;
}

export function createMeasurementFormatter(
  messages: DicomStrings,
  locale: string,
): MeasurementFormatter {
  const one = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const whole = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });

  const length = (measurement: DicomMeasurement & { kind: 'length' }) =>
    measurement.unit === 'mm'
      ? messages.dicomLengthMm({ length: one.format(measurement.length) })
      : messages.dicomLengthPx({ length: one.format(measurement.length) });
  const area = (measurement: DicomMeasurement & { kind: 'ellipse' | 'rectangle' }) =>
    measurement.unit === 'mm'
      ? messages.dicomAreaMm({ area: whole.format(measurement.area) })
      : messages.dicomAreaPx({ area: whole.format(measurement.area) });

  return {
    describe(measurement) {
      const slice = measurement.sliceIndex + 1;
      switch (measurement.kind) {
        case 'length':
          return messages.dicomLengthMeasurement({ length: length(measurement), slice });
        case 'angle':
          return messages.dicomAngleMeasurement({
            degrees: one.format(measurement.degrees),
            slice,
          });
        default: {
          const params = {
            area: area(measurement),
            mean: one.format(measurement.mean),
            stdDev: one.format(measurement.stdDev),
            slice,
          };
          return measurement.kind === 'ellipse'
            ? messages.dicomEllipseMeasurement(params)
            : messages.dicomRectangleMeasurement(params);
        }
      }
    },
    label(measurement) {
      switch (measurement.kind) {
        case 'length':
          return length(measurement);
        case 'angle':
          return `${one.format(measurement.degrees)}°`;
        default:
          return `${area(measurement)} · ${one.format(measurement.mean)} ± ${one.format(measurement.stdDev)}`;
      }
    },
  };
}
