// FlagPicker: choose a country from flag thumbnails in titled rows, such as continents. Rows list countries by code or
// name; their flags and data come from the countries the app registered (FlagProvider), and choosing a flag hands
// that country's data back.

import { useMemo } from 'react';
import { useEntryMessages } from '../../provider/context';
import type { FlagPickerMessages } from '../../provider/messages';
import { cn } from '../../utils/cn';
import { findCountry, flagImageSrc, type CountryInfo } from '../Flag/countries';
import { FlagImage } from '../Flag/Flag';
import { useFlags } from '../Flag/FlagProvider';
import type { TileOption, TileRow } from '../TilePicker/TileGrid';
import { TilePicker, type TilePickerProps } from '../TilePicker/TilePicker';

/** English defaults of FlagPicker's strings (see `Messages`). */
export const defaultFlagPickerMessages: FlagPickerMessages = {
  searchCountries: 'Search countries',
  noCountry: 'No country',
};

/** A row of flags under a title, such as "Europe". */
export interface FlagRow {
  id: string;
  title?: string;
  /** Countries by code (`fr`), English name or native name; unknown ones are left out. */
  countries: readonly string[];
}

type CountryOption = TileOption<CountryInfo> & { data: CountryInfo };

export interface FlagPickerProps<C extends CountryInfo = CountryInfo> extends Omit<
  TilePickerProps<CountryOption>,
  'rows' | 'renderTile' | 'renderValue' | 'searchLabel' | 'onChange' | 'minTileWidth'
> {
  rows: readonly FlagRow[];
  /**
   * Called with the chosen country's code and its registered data, or null when cleared. Name the app's own country
   * type to read the fields it registered: `<FlagPicker<MyCountry> … />`.
   */
  onChange?: (value: string | null, country: C | null) => void;
  /** Shows a search field above the flags (by English name, native name or code). Defaults to true. */
  isSearchable?: boolean;
  /** Shows each country's name under its flag. Defaults to true; without, names are read by screen readers only. */
  hasLabels?: boolean;
  /** Overrides FlagProvider's image path. */
  basePath?: string;
}

/**
 * Choose a country from flag thumbnails in titled rows that wrap to the panel's width, with a search. The value is the
 * country's code; `onChange` also receives the country's registered data (names, languages and the app's own fields).
 */
export function FlagPicker<C extends CountryInfo = CountryInfo>({
  rows,
  onChange,
  isSearchable = true,
  hasLabels = true,
  basePath,
  placeholder,
  ...rest
}: FlagPickerProps<C>) {
  const messages = useEntryMessages(defaultFlagPickerMessages);
  const flags = useFlags();
  const imagePath = basePath ?? flags.basePath;
  const tileRows = useMemo(
    () =>
      rows.map((row): TileRow<CountryOption> => ({
        id: row.id,
        ...(row.title !== undefined ? { title: row.title } : {}),
        items: row.countries.flatMap((query) => {
          const country = findCountry(flags.countries, query);
          return country
            ? [
                {
                  id: country.code,
                  label: country.name,
                  keywords: [country.nativeName, country.code],
                  data: country,
                },
              ]
            : [];
        }),
      })),
    [rows, flags.countries],
  );
  return (
    <TilePicker<CountryOption>
      {...rest}
      rows={tileRows}
      onChange={(value, option) => {
        onChange?.(value, (option?.data ?? null) as C | null);
      }}
      placeholder={placeholder ?? messages.noCountry}
      searchLabel={isSearchable ? messages.searchCountries : undefined}
      minTileWidth={hasLabels ? '4.5rem' : '3rem'}
      renderTile={(option) => (
        <>
          <FlagImage src={flagImageSrc(option.data, imagePath)} className="w-full max-w-10" />
          <span className={cn('w-full truncate text-center text-xs', !hasLabels && 'sr-only')}>
            {option.label}
          </span>
        </>
      )}
      renderValue={(option) => (
        <>
          <FlagImage src={flagImageSrc(option.data, imagePath)} className="w-5" />
          <span className="truncate">{option.label}</span>
        </>
      )}
    />
  );
}
