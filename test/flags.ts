// Demo countries for the Flag and FlagPicker stories and tests: the stock four plus more, each with the app's own
// `currency` field to show how apps add data. Their images are in .storybook/public/images/flags.
import type { CountryInfo, CountryRegistration } from '../src/components/Flag/countries';
import type { FlagRow } from '../src/components/FlagPicker/FlagPicker';

export interface DemoCountry extends CountryInfo {
  currency: string;
}

/** Stories are served from a version folder (/latest/), so the images are found relative to the page. */
export const demoFlagPath = 'images/flags';

export const demoCountries: readonly (CountryRegistration & { currency: string })[] = [
  // Stock countries: only the extra field is registered.
  { code: 'us', currency: 'USD' },
  { code: 'fr', currency: 'EUR' },
  { code: 'cn', currency: 'CNY' },
  { code: 'br', currency: 'BRL' },
  // New countries.
  { code: 'de', name: 'Germany', nativeName: 'Deutschland', languages: ['de'], currency: 'EUR' },
  { code: 'it', name: 'Italy', nativeName: 'Italia', languages: ['it'], currency: 'EUR' },
  { code: 'nl', name: 'Netherlands', nativeName: 'Nederland', languages: ['nl'], currency: 'EUR' },
  { code: 'pl', name: 'Poland', nativeName: 'Polska', languages: ['pl'], currency: 'PLN' },
  { code: 'ua', name: 'Ukraine', nativeName: 'Україна', languages: ['uk'], currency: 'UAH' },
  { code: 'jp', name: 'Japan', nativeName: '日本', languages: ['ja'], currency: 'JPY' },
  { code: 'id', name: 'Indonesia', nativeName: 'Indonesia', languages: ['id'], currency: 'IDR' },
  { code: 'bd', name: 'Bangladesh', nativeName: 'বাংলাদেশ', languages: ['bn'], currency: 'BDT' },
  { code: 'ng', name: 'Nigeria', nativeName: 'Nigeria', languages: ['en'], currency: 'NGN' },
  { code: 'pe', name: 'Peru', nativeName: 'Perú', languages: ['es', 'qu', 'ay'], currency: 'PEN' },
  { code: 'co', name: 'Colombia', nativeName: 'Colombia', languages: ['es'], currency: 'COP' },
];

export const demoFlagRows: readonly FlagRow[] = [
  { id: 'north-america', title: 'North America', countries: ['us'] },
  { id: 'south-america', title: 'South America', countries: ['Brazil', 'Colombia', 'Peru'] },
  { id: 'europe', title: 'Europe', countries: ['fr', 'de', 'it', 'nl', 'pl', 'ua'] },
  { id: 'asia', title: 'Asia', countries: ['cn', 'jp', 'id', 'bd'] },
  { id: 'africa', title: 'Africa', countries: ['ng'] },
];
