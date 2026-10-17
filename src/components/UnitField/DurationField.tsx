import { useMemo } from 'react';
import { useLocale } from 'react-aria-components';
import { useEntryMessages } from '../../provider/context';
import { durationParts, formatDuration, intlUnitName } from './format';
import { defaultUnitFieldMessages } from './messages';
import { formatPlainNumber } from './number';
import { parseDurationResult } from './parse';
import { UnitFieldBase, type UnitChoice, type UnitFieldSharedProps } from './UnitFieldBase';
import { DEFAULT_DURATION_UNITS, durationUnits, type DurationUnit } from './units';

export interface DurationFieldProps extends UnitFieldSharedProps {
  /** The units offered, in any order. Defaults to seconds, minutes, hours and days. */
  units?: readonly DurationUnit[];
  /** The unit selected while the field is empty. Defaults to the smallest offered. */
  defaultUnit?: DurationUnit;
  /** Accepts typed compound values like "1h30m" or "1 hour 30 minutes". Defaults to true. */
  allowsCompound?: boolean;
  /**
   * How a committed value is shown: `compound` (default) uses as many units as needed ("1h 30m"); `single` the
   * largest unit that keeps it whole ("90" minutes).
   */
  display?: 'compound' | 'single';
}

/**
 * A duration in milliseconds, typed as friendly units: a number with a unit Select, or text such as "90s", "2h" or
 * "1h30m". Shows the value in the largest units that keep it whole once committed, and announces it in words ("1 hour
 * 30 minutes"). Min and max are in milliseconds, with errors in friendly units.
 */
export function DurationField({
  units = DEFAULT_DURATION_UNITS,
  defaultUnit,
  allowsCompound = true,
  display = 'compound',
  ...rest
}: DurationFieldProps) {
  const { locale } = useLocale();
  const messages = useEntryMessages(defaultUnitFieldMessages);
  const offered = useMemo(
    () => durationUnits(units.length > 0 ? units : DEFAULT_DURATION_UNITS),
    [units],
  );
  const ids = useMemo(() => offered.map((unit) => unit.id), [offered]);
  const choices = useMemo<UnitChoice<DurationUnit>[]>(
    () =>
      offered.map((unit) => ({
        id: unit.id,
        factor: unit.factor,
        label: intlUnitName(locale, unit.intlUnit ?? unit.id, 'narrow'),
        name: intlUnitName(locale, unit.intlUnit ?? unit.id, 'long'),
      })),
    [offered, locale],
  );
  const smallest = ids[0] ?? 's';

  return (
    <UnitFieldBase<DurationUnit>
      {...rest}
      locale={locale}
      units={choices}
      initialUnit={defaultUnit ?? smallest}
      parse={(text, unit) =>
        parseDurationResult(text, { locale, defaultUnit: unit, allowsCompound })
      }
      present={(value) => {
        const parts = durationParts(value, ids, display);
        const [first] = parts;
        if (parts.length === 1 && first) {
          return { text: formatPlainNumber(first.amount, locale, 3), unit: first.unit };
        }
        return {
          text: formatDuration(value, { locale, units: ids, style: display }),
          unit: first?.unit ?? smallest,
        };
      }}
      formatShort={(value) => formatDuration(value, { locale, units: ids, unitDisplay: 'short' })}
      formatLong={(value) => formatDuration(value, { locale, units: ids, unitDisplay: 'long' })}
      invalidMessage={(error) =>
        error === 'compound' ? messages.durationFieldSingleUnit : messages.durationFieldInvalid
      }
    />
  );
}
