import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Teach tailwind-merge the custom names from src/styles so they merge against Tailwind's built-in classes
// (for example, a consumer's `rounded-none` replaces our `rounded-control`).
const twMerge = extendTailwindMerge<'hit-area' | 'focus-ring'>({
  extend: {
    theme: {
      radius: ['control', 'card'],
      shadow: ['raised', 'overlay'],
    },
    classGroups: {
      z: [{ z: ['sticky', 'dropdown', 'overlay', 'modal', 'toast'] }],
      'hit-area': ['hit-area'],
      'focus-ring': ['focus-ring'],
    },
  },
});

/** Joins class names and resolves Tailwind conflicts so later classes (such as a consumer's `className`) win. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
