// The visual baselines the visual tests expect (each story tagged `visual`, in each theme, at each screen size) against
// the ones on disk and in git. Shared by check-snapshots.mjs and select-visual-stories.mjs. Needs a Storybook build.

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import config from '../playwright.config.ts';
import { snapshotName, THEMES, visualStories } from '../test/visual/visual-stories.ts';
import { root } from './ts-program.mjs';

export const STORYBOOK_INDEX = join(root, 'storybook-static/index.json');

// Where Playwright keeps each project's baselines, from playwright.config.ts's snapshotPathTemplate.
const TEMPLATE_END = '/{arg}{ext}';
if (!config.snapshotPathTemplate.endsWith(TEMPLATE_END)) {
  throw new Error(`baselines.mjs expects a snapshotPathTemplate ending in ${TEMPLATE_END}`);
}
const projectDir = (project) =>
  join(
    root,
    config.snapshotPathTemplate
      .slice(0, -TEMPLATE_END.length)
      .replace('{testDir}', config.testDir)
      .replace('{projectName}', project),
  );
export const BASELINES_DIR = dirname(projectDir(config.projects[0].name));

/**
 * The visual stories, and their baselines: `expected` maps each baseline's path to its story's id; `missing`,
 * `orphaned` (no story) and `untracked` (on disk but not added to git) are absolute paths.
 */
export function readBaselines() {
  if (!existsSync(STORYBOOK_INDEX)) {
    console.error(`${relative(root, STORYBOOK_INDEX)} is missing: run make storybook-build first.`);
    process.exit(1);
  }
  const stories = visualStories(STORYBOOK_INDEX);
  const expected = new Map();
  for (const { name: project } of config.projects) {
    for (const story of stories) {
      for (const theme of THEMES) {
        expected.set(join(projectDir(project), snapshotName(story.id, theme)), story.id);
      }
    }
  }

  const existing = new Set(
    readdirSync(BASELINES_DIR, { recursive: true })
      .filter((file) => file.endsWith('.png'))
      .map((file) => join(BASELINES_DIR, file)),
  );

  // Skipped where git can't read the repository (no git, or a CI container's ownership check): there, every
  // baseline on disk came from the checkout.
  let untracked = [];
  try {
    untracked = execFileSync(
      'git',
      ['ls-files', '--others', '--exclude-standard', '--full-name', '--', BASELINES_DIR],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    )
      .split('\n')
      .filter((file) => file.endsWith('.png'))
      .map((file) => join(root, file));
  } catch {
    // Nothing to compare against.
  }

  return {
    stories,
    expected,
    missing: [...expected.keys()].filter((file) => !existing.has(file)),
    orphaned: [...existing].filter((file) => !expected.has(file)),
    untracked,
  };
}
