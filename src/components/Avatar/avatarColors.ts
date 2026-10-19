// Initials and colours for avatars. Every class is a complete static string so Tailwind finds it.

import { toneSoftClasses } from '../../utils/toneClasses';

/** An avatar colour: a chart palette slot or a tone (the same names as `/chart`'s `ChartColor`). */
export type AvatarColor =
  | 'chart-1'
  | 'chart-2'
  | 'chart-3'
  | 'chart-4'
  | 'chart-5'
  | 'chart-6'
  | 'chart-7'
  | 'chart-8'
  | 'chart-9'
  | 'chart-10'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral';

/**
 * Background and text for each colour. Chart slots are a tint (the slot mixed into `surface-1`) under `fg`, so the
 * initials keep text contrast in every theme (checked in avatarColors.test.ts); tones use their own bg/fg pair.
 */
export const avatarColorClasses: Record<AvatarColor, string> = {
  'chart-1': 'bg-[color-mix(in_srgb,var(--color-chart-1)_24%,var(--color-surface-1))] text-fg',
  'chart-2': 'bg-[color-mix(in_srgb,var(--color-chart-2)_24%,var(--color-surface-1))] text-fg',
  'chart-3': 'bg-[color-mix(in_srgb,var(--color-chart-3)_24%,var(--color-surface-1))] text-fg',
  'chart-4': 'bg-[color-mix(in_srgb,var(--color-chart-4)_24%,var(--color-surface-1))] text-fg',
  'chart-5': 'bg-[color-mix(in_srgb,var(--color-chart-5)_24%,var(--color-surface-1))] text-fg',
  'chart-6': 'bg-[color-mix(in_srgb,var(--color-chart-6)_24%,var(--color-surface-1))] text-fg',
  'chart-7': 'bg-[color-mix(in_srgb,var(--color-chart-7)_24%,var(--color-surface-1))] text-fg',
  'chart-8': 'bg-[color-mix(in_srgb,var(--color-chart-8)_24%,var(--color-surface-1))] text-fg',
  'chart-9': 'bg-[color-mix(in_srgb,var(--color-chart-9)_24%,var(--color-surface-1))] text-fg',
  'chart-10': 'bg-[color-mix(in_srgb,var(--color-chart-10)_24%,var(--color-surface-1))] text-fg',
  ...toneSoftClasses,
};

/** How much of the chart slot goes into the tint (keep in step with the classes above). */
export const AVATAR_TINT = 0.24;

// The slots a name can land on: chart-10 is the palette's grey, which reads as "unknown" rather than a person.
const NAME_COLORS: readonly AvatarColor[] = [
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'chart-6',
  'chart-7',
  'chart-8',
  'chart-9',
];

/** A stable colour for a name (FNV-1a hash), so a person keeps the same colour everywhere. */
export function avatarColorFor(name: string): AvatarColor {
  let hash = 0x811c9dc5;
  for (const char of name.trim().toLocaleLowerCase()) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return NAME_COLORS[hash % NAME_COLORS.length] ?? 'chart-1';
}

/** Up to two letters from a name: the first letters of its first and last words ("Ada Lovelace" → "AL"). */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words.at(-1)?.[0] ?? '') : '';
  return `${first}${last}`.toLocaleUpperCase();
}
