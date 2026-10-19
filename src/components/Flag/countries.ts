// Countries for Flag and FlagPicker. The library ships a few stock entries as a reference; apps register their own
// (with their flag images and any extra data) through FlagProvider, merged over these by code.

/**
 * A country (or region) a flag stands for. Apps add their own fields (a currency, a dialling code) by registering
 * them with FlagProvider (as a `MyCountry[]`, where `interface MyCountry extends CountryInfo { currency: string }`),
 * which merges entries by `code`. They come back from `useCountry` (cast it: `as MyCountry | undefined`) and
 * `FlagPicker<MyCountry>`'s `onChange`.
 */
export interface CountryInfo {
  /** ISO 3166-1 alpha-2 code in lower case (`fr`), or a subdivision such as `gb-sct`. Names the image file. */
  code: string;
  /** The name in English. */
  name: string;
  /** The name in the country's most common national language (`Brasil`, `中国`). */
  nativeName: string;
  /** BCP 47 language tags, most common first (`['pt-BR']`). */
  languages: readonly string[];
  /** The flag image's URL, when it isn't `<basePath>/<code>.svg`. */
  imageSrc?: string;
}

/** A registration: a whole new country, or new or changed fields for a known one (matched by `code`). */
export type CountryRegistration = Partial<CountryInfo> & Pick<CountryInfo, 'code'>;

/** Reference entries that are always available. Their images come from the app, like every other flag. */
export const stockCountries: readonly CountryInfo[] = [
  { code: 'us', name: 'United States', nativeName: 'United States', languages: ['en-US'] },
  { code: 'fr', name: 'France', nativeName: 'France', languages: ['fr'] },
  { code: 'cn', name: 'China', nativeName: '中国', languages: ['zh-CN'] },
  { code: 'br', name: 'Brazil', nativeName: 'Brasil', languages: ['pt-BR'] },
];

/** Merges registrations over `base` by code; a registration without a name for a new code is skipped. */
export function mergeCountries(
  base: ReadonlyMap<string, CountryInfo>,
  registrations: readonly CountryRegistration[],
): Map<string, CountryInfo> {
  const merged = new Map(base);
  for (const registration of registrations) {
    const code = registration.code.toLowerCase();
    const existing = merged.get(code);
    const next = { ...existing, ...registration, code };
    if (next.name !== undefined) {
      merged.set(code, {
        ...next,
        name: next.name,
        nativeName: next.nativeName ?? next.name,
        languages: next.languages ?? [],
      });
    }
  }
  return merged;
}

/** Finds a country by code, English name or native name, ignoring case. */
export function findCountry(
  countries: ReadonlyMap<string, CountryInfo>,
  query: string,
): CountryInfo | undefined {
  const wanted = query.trim().toLocaleLowerCase();
  const byCode = countries.get(wanted);
  if (byCode) {
    return byCode;
  }
  for (const country of countries.values()) {
    if (
      country.name.toLocaleLowerCase() === wanted ||
      country.nativeName.toLocaleLowerCase() === wanted
    ) {
      return country;
    }
  }
  return undefined;
}

/** The flag image's URL: the country's own `imageSrc`, or `<basePath>/<code>.svg`. */
export function flagImageSrc(country: CountryInfo, basePath: string): string {
  return country.imageSrc ?? `${basePath.replace(/\/+$/, '')}/${country.code}.svg`;
}
