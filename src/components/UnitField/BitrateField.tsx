import { useMemo } from 'react';
import { useLocale } from 'react-aria-components';
import { useEntryMessages } from '../../provider/context';
import { exactUnit, intlUnitName, formatBitrate } from './format';
import { defaultUnitFieldMessages } from './messages';
import { formatPlainNumber } from './number';
import { parseBitrateResult } from './parse';
import { UnitFieldBase, type UnitChoice, type UnitFieldSharedProps } from './UnitFieldBase';
import { BITRATE_UNITS, type BitrateUnit } from './units';

export interface BitrateFieldProps extends UnitFieldSharedProps {
  /** The unit selected while the field is empty. Defaults to `Mbps`. */
  defaultUnit?: BitrateUnit;
}

/**
 * A bitrate in bits per second, typed as friendly units: a number with a unit Select, or text such as "4.5 Mbps",
 * "4500k" or "4.5M". Once committed it shows in the largest unit that keeps it exact (4,500,000 bps is "4.5" Mbps), and
 * announces it in words ("4.5 megabits per second").
 */
export function BitrateField({ defaultUnit = 'Mbps', ...rest }: BitrateFieldProps) {
  const { locale } = useLocale();
  const messages = useEntryMessages(defaultUnitFieldMessages);
  const choices = useMemo<UnitChoice<BitrateUnit>[]>(
    () =>
      BITRATE_UNITS.map((unit) => ({
        id: unit.id,
        factor: unit.factor,
        label: unit.id,
        name: unit.intlUnit ? intlUnitName(locale, unit.intlUnit, 'long') : undefined,
      })),
    [locale],
  );

  return (
    <UnitFieldBase<BitrateUnit>
      {...rest}
      locale={locale}
      units={choices}
      initialUnit={defaultUnit}
      parse={(text, unit) => parseBitrateResult(text, { locale, defaultUnit: unit })}
      present={(value) => {
        const unit = exactUnit(value, BITRATE_UNITS);
        return { text: formatPlainNumber(value / unit.factor, locale, 3), unit: unit.id };
      }}
      formatShort={(value) => formatBitrate(value, { locale, maximumFractionDigits: 3 })}
      formatLong={(value) =>
        formatBitrate(value, { locale, unitDisplay: 'long', maximumFractionDigits: 3 })
      }
      invalidMessage={() => messages.bitrateFieldInvalid}
    />
  );
}
