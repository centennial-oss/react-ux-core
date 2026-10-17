// Slugs for URLs: lower case ASCII letters and digits joined by single hyphens. Accents are transliterated
// ("Café Déjà Vu!" → "cafe-deja-vu"); scripts without a Latin spelling are dropped.

// Latin letters that don't decompose into a base letter and a combining mark.
const SPECIAL_LETTERS: Readonly<Record<string, string>> = {
  ß: 'ss',
  æ: 'ae',
  œ: 'oe',
  ø: 'o',
  đ: 'd',
  ð: 'd',
  ł: 'l',
  þ: 'th',
  ı: 'i',
  ħ: 'h',
  ŋ: 'ng',
  ſ: 's',
};
const SPECIAL_PATTERN = new RegExp(`[${Object.keys(SPECIAL_LETTERS).join('')}]`, 'g');

export interface SlugifyOptions {
  /** The longest slug; a longer one is cut at the last hyphen that fits (or mid-word when there's none). */
  maxLength?: number;
}

/** Lower case, accents transliterated and apostrophes dropped, with every other run of characters a hyphen. */
function toSlugCharacters(text: string): string {
  return (
    text
      .normalize('NFKD')
      // Combining marks left by the decomposition (é → e + ´).
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(SPECIAL_PATTERN, (letter) => SPECIAL_LETTERS[letter] ?? '')
      // "Ada's notes" → "adas-notes", not "ada-s-notes".
      .replace(/['’‘`]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
  );
}

/** Makes a URL slug from text: `slugify('Café Déjà Vu!')` is `cafe-deja-vu`. */
export function slugify(text: string, { maxLength }: SlugifyOptions = {}): string {
  const slug = toSlugCharacters(text).replace(/^-+|-+$/g, '');
  if (maxLength === undefined || slug.length <= maxLength) {
    return slug;
  }
  const cut = slug.slice(0, maxLength);
  const lastHyphen = cut.lastIndexOf('-');
  return (lastHyphen > 0 ? cut.slice(0, lastHyphen) : cut).replace(/-+$/, '');
}

/**
 * Cleans a slug while it's typed: like `slugify`, but a trailing hyphen stays so the next word can follow it.
 * `slugify` finishes it when the field loses focus.
 */
export function slugifyPartial(text: string): string {
  return toSlugCharacters(text).replace(/^-+/, '');
}
