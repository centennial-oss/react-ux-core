// FlagProvider: the app's countries and where their flag images live, for every Flag and FlagPicker inside it.
// Providers nest: each merges its countries over the outer ones by code.

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  findCountry,
  mergeCountries,
  stockCountries,
  type CountryInfo,
  type CountryRegistration,
} from './countries';

/** Where flag images are served from when the app doesn't say. */
export const DEFAULT_FLAG_BASE_PATH = '/images/flags';

interface FlagContextValue {
  countries: ReadonlyMap<string, CountryInfo>;
  basePath: string;
}

const FlagContext = createContext<FlagContextValue>({
  countries: mergeCountries(new Map(), stockCountries),
  basePath: DEFAULT_FLAG_BASE_PATH,
});

export interface FlagProviderProps {
  /** Countries to add, or fields to add to known ones (by `code`). The stock countries are always included. */
  countries?: readonly CountryRegistration[];
  /**
   * The URL path flag images are served from, as `<basePath>/<code>.svg`. Defaults to the outer provider's, or
   * `/images/flags`. Use a relative path (`images/flags`) for a site served from a subdirectory.
   */
  basePath?: string;
  children: ReactNode;
}

/** Registers the app's countries and flag image location. Pass a stable `countries` array. */
export function FlagProvider({ countries, basePath, children }: FlagProviderProps) {
  const outer = useContext(FlagContext);
  const value = useMemo(
    () => ({
      countries: countries ? mergeCountries(outer.countries, countries) : outer.countries,
      basePath: basePath ?? outer.basePath,
    }),
    [outer, countries, basePath],
  );
  return <FlagContext.Provider value={value}>{children}</FlagContext.Provider>;
}

/** Every registered country, by code, and the flag image base path. */
export function useFlags(): FlagContextValue {
  return useContext(FlagContext);
}

/**
 * A registered country by code, English name or native name (ignoring case), with any fields the app registered for
 * it (cast to the app's own type to read them).
 */
export function useCountry(country: string): CountryInfo | undefined {
  const { countries } = useFlags();
  return useMemo(() => findCountry(countries, country), [countries, country]);
}
