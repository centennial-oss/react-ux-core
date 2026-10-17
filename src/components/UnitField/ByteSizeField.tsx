import { useMemo } from 'react';
import { useLocale } from 'react-aria-components';
import { useEntryMessages } from '../../provider/context';
import { exactUnit, intlUnitName, formatBytes } from './format';
import { defaultUnitFieldMessages } from './messages';
import { formatPlainNumber } from './number';
import { parseBytesResult } from './parse';
import { UnitFieldBase, type UnitChoice, type UnitFieldSharedProps } from './UnitFieldBase';
import { byteUnits, type ByteUnit } from './units';

export interface ByteSizeFieldProps extends UnitFieldSharedProps {
  /**
   * `iec` (default) offers binary units (KiB = 1024 B), `si` decimal ones (kB = 1000 B). Typed decimal-looking
   * symbols ("MB") follow it too; binary symbols ("MiB") are always binary.
   */
  system?: 'iec' | 'si';
  /** The unit selected while the field is empty. Defaults to `MiB` (or `MB`). */
  defaultUnit?: ByteUnit;
}

/**
 * A size in bytes, typed as friendly units: a number with a unit Select, or text such as "512 MiB" or "1.5G". Once
 * committed it shows in the largest unit that keeps it exact ("1.5" MiB, not "1536" KiB), and announces it in words.
 */
export function ByteSizeField({ system = 'iec', defaultUnit, ...rest }: ByteSizeFieldProps) {
  const { locale } = useLocale();
  const messages = useEntryMessages(defaultUnitFieldMessages);
  const units = byteUnits(system);
  const choices = useMemo<UnitChoice<ByteUnit>[]>(
    () =>
      units.map((unit) => ({
        id: unit.id,
        factor: unit.factor,
        label: unit.id,
        name: unit.intlUnit ? intlUnitName(locale, unit.intlUnit, 'long') : undefined,
      })),
    [units, locale],
  );

  return (
    <UnitFieldBase<ByteUnit>
      {...rest}
      locale={locale}
      units={choices}
      initialUnit={defaultUnit ?? (system === 'iec' ? 'MiB' : 'MB')}
      parse={(text, unit) => parseBytesResult(text, { locale, system, defaultUnit: unit })}
      present={(value) => {
        const unit = exactUnit(value, units);
        return { text: formatPlainNumber(value / unit.factor, locale, 3), unit: unit.id };
      }}
      formatShort={(value) => formatBytes(value, { locale, system, maximumFractionDigits: 3 })}
      formatLong={(value) =>
        formatBytes(value, {
          locale,
          system,
          unitDisplay: 'long',
          maximumFractionDigits: 3,
          formatIecValue: messages.unitFieldIecValue,
        })
      }
      invalidMessage={() => messages.byteSizeFieldInvalid}
    />
  );
}
