// Emoji data for EmojiPicker and ReactionBar: emojibase's compact English dataset (CLDR names and keywords, groups
// and skin tones), loaded with a dynamic import the first time a picker opens, so `/chat` costs nothing until then.
// Apps can load another locale (or their own list) by passing a loader of the same shape.

/** One emoji as emojibase's compact datasets describe it (only the fields used here). */
export interface EmojiSourceEntry {
  unicode: string;
  /** The CLDR name, such as "thumbs up". */
  label: string;
  hexcode: string;
  /** emojibase's group number: 0 smileys, 1 people, 2 components, 3 animals … 9 flags. */
  group?: number;
  /** CLDR keywords. */
  tags?: readonly string[];
  skins?: readonly { unicode: string; hexcode: string }[];
}

/** Loads the emoji list, such as `() => import('emojibase-data/fr/compact.json').then((m) => m.default)`. */
export type EmojiDataLoader = () => Promise<readonly EmojiSourceEntry[]>;

/** 1 is the default (yellow) tone; 2 to 6 are the Fitzpatrick tones from light to dark. */
export type SkinTone = 1 | 2 | 3 | 4 | 5 | 6;

export const SKIN_TONES: readonly SkinTone[] = [1, 2, 3, 4, 5, 6];

export type EmojiGroup =
  | 'smileys'
  | 'people'
  | 'animals'
  | 'food'
  | 'travel'
  | 'activities'
  | 'objects'
  | 'symbols'
  | 'flags';

export const EMOJI_GROUPS: readonly EmojiGroup[] = [
  'smileys',
  'people',
  'animals',
  'food',
  'travel',
  'activities',
  'objects',
  'symbols',
  'flags',
];

/** emojibase group numbers to ours (2, skin tone and hair components, isn't offered). */
const GROUP_BY_NUMBER: readonly (EmojiGroup | undefined)[] = [
  'smileys',
  'people',
  undefined,
  'animals',
  'food',
  'travel',
  'activities',
  'objects',
  'symbols',
  'flags',
];

export interface EmojiEntry {
  emoji: string;
  label: string;
  tags: readonly string[];
  group: EmojiGroup;
  /** The emoji in skin tones 2 to 6, when it has them. */
  skins?: readonly string[];
}

export interface EmojiData {
  entries: readonly EmojiEntry[];
  /** Every emoji (and skin-tone variant, without variation selectors) to its entry. */
  byEmoji: ReadonlyMap<string, EmojiEntry>;
}

/** Drops variation selectors, so "❤" and "❤️" find the same entry. */
export function emojiKey(emoji: string): string {
  return emoji.replace(/️/g, '');
}

const SKIN_MODIFIERS = ['1F3FB', '1F3FC', '1F3FD', '1F3FE', '1F3FF'];

/** The skin variant whose every tone modifier is the one for `tone` (2–6), such as both people in "🧑🏽‍🤝‍🧑🏽". */
function skinFor(
  skins: readonly { unicode: string; hexcode: string }[],
  tone: number,
): string | undefined {
  const modifier = SKIN_MODIFIERS[tone - 2];
  return skins.find((skin) => {
    const codes = skin.hexcode.split('-').filter((code) => SKIN_MODIFIERS.includes(code));
    return codes.length > 0 && codes.every((code) => code === modifier);
  })?.unicode;
}

/** Turns an emojibase-shaped list into picker data. */
export function normalizeEmojiData(source: readonly EmojiSourceEntry[]): EmojiData {
  const entries: EmojiEntry[] = [];
  const byEmoji = new Map<string, EmojiEntry>();
  for (const item of source) {
    const group = item.group === undefined ? undefined : GROUP_BY_NUMBER[item.group];
    if (!group) {
      continue;
    }
    const skinList =
      item.skins && item.skins.length > 0
        ? [2, 3, 4, 5, 6].map((tone) => (item.skins ? skinFor(item.skins, tone) : undefined))
        : undefined;
    const skins = skinList?.every((skin) => skin !== undefined) ? skinList : undefined;
    const entry: EmojiEntry = {
      emoji: item.unicode,
      label: item.label,
      tags: item.tags ?? [],
      group,
      ...(skins ? { skins } : {}),
    };
    entries.push(entry);
    byEmoji.set(emojiKey(entry.emoji), entry);
    for (const skin of item.skins ?? []) {
      byEmoji.set(emojiKey(skin.unicode), entry);
    }
  }
  return { entries, byEmoji };
}

/** The emoji in a skin tone (itself for tone 1 or when it has no tones). */
export function withSkinTone(entry: EmojiEntry, tone: SkinTone): string {
  return tone === 1 ? entry.emoji : (entry.skins?.[tone - 2] ?? entry.emoji);
}

/** Entries whose name or keywords match every word of `query` (word prefixes, ignoring case), best first. */
export function searchEmoji(data: EmojiData, query: string): EmojiEntry[] {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [];
  }
  const scored: { entry: EmojiEntry; score: number; index: number }[] = [];
  data.entries.forEach((entry, index) => {
    const label = entry.label.toLowerCase();
    const terms = [...label.split(/[\s:,-]+/), ...entry.tags.map((tag) => tag.toLowerCase())];
    const isMatch = words.every((word) => terms.some((term) => term.startsWith(word)));
    if (!isMatch) {
      return;
    }
    const whole = words.join(' ');
    const score = label === whole ? 0 : label.startsWith(whole) ? 1 : 2;
    scored.push({ entry, score, index });
  });
  return scored.sort((a, b) => a.score - b.score || a.index - b.index).map(({ entry }) => entry);
}

const defaultLoader: EmojiDataLoader = () =>
  import('emojibase-data/en/compact.json').then(
    (module) => module.default as unknown as readonly EmojiSourceEntry[],
  );

const loads = new WeakMap<EmojiDataLoader, Promise<EmojiData>>();
const loaded = new WeakMap<EmojiDataLoader, EmojiData>();

/**
 * Loads (once per loader) and normalises the emoji data. Defaults to emojibase's English compact dataset, which
 * needs the optional peer `emojibase-data`. Call it early (say, when a chat opens) to have the picker ready at once.
 */
export function loadEmojiData(loader: EmojiDataLoader = defaultLoader): Promise<EmojiData> {
  let pending = loads.get(loader);
  if (!pending) {
    pending = loader().then((source) => {
      const data = normalizeEmojiData(source);
      loaded.set(loader, data);
      return data;
    });
    // Let a failed load be retried.
    pending.catch(() => {
      loads.delete(loader);
    });
    loads.set(loader, pending);
  }
  return pending;
}

/** The data, if `loader` has already loaded it. */
export function peekEmojiData(loader: EmojiDataLoader = defaultLoader): EmojiData | undefined {
  return loaded.get(loader);
}

/** An emoji's CLDR name, if the default data has loaded (ReactionBar uses it to name reactions). */
export function emojiName(
  emoji: string,
  loader: EmojiDataLoader = defaultLoader,
): string | undefined {
  return loaded.get(loader)?.byEmoji.get(emojiKey(emoji))?.label;
}
