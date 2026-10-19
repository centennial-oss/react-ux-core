import { readFileSync } from 'node:fs';

// The stories the visual tests capture, and the name of each capture's baseline. Shared by stories.spec.ts and the
// scripts that check baselines (scripts/baselines.mjs) and pick the stories a change reaches
// (scripts/select-visual-stories.mjs).

interface IndexEntry {
  id: string;
  importPath: string;
  type: 'story' | 'docs';
  subtype?: 'story' | 'test';
  tags?: string[];
}

export interface VisualStory {
  id: string;
  /** The story file, relative to the repo root, as Storybook's index has it (`./src/…`). */
  importPath: string;
  /** Tagged `visual-page`: an overlay that renders outside the story, so the whole viewport is captured. */
  isWholePage: boolean;
}

export const THEMES = ['light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

/** Every story tagged `visual` (all stories by default; a story opts out with '!visual') in a Storybook build. */
export function visualStories(indexPath = 'storybook-static/index.json'): VisualStory[] {
  const index = JSON.parse(readFileSync(indexPath, 'utf8')) as {
    entries: Record<string, IndexEntry>;
  };
  return Object.values(index.entries)
    .filter(
      (entry) =>
        entry.type === 'story' && entry.subtype !== 'test' && entry.tags?.includes('visual'),
    )
    .map((entry) => ({
      id: entry.id,
      importPath: entry.importPath,
      isWholePage: entry.tags?.includes('visual-page') ?? false,
    }));
}

/** Only the stories listed in VISUAL_STORIES_FILE (a JSON array of ids) when it's set, as the *-changed targets do. */
export function selectedStories(stories: VisualStory[]): VisualStory[] {
  const file = process.env.VISUAL_STORIES_FILE;
  if (!file) {
    return stories;
  }
  const ids = new Set(JSON.parse(readFileSync(file, 'utf8')) as string[]);
  return stories.filter((story) => ids.has(story.id));
}

/** The baseline's file name, which Playwright places in the project's folder (snapshotPathTemplate). */
export const snapshotName = (storyId: string, theme: Theme) => `${storyId}--${theme}.png`;
