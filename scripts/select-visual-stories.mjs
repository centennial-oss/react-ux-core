// Picks the stories the *-changed visual targets capture: the stories your changes reach (see changes.mjs), the
// stories with a changed or missing baseline, or every story when a change reaches everything. Writes their ids as
// JSON for test/visual/stories.spec.ts, which reads them from VISUAL_STORIES_FILE. Needs a Storybook build.
//
// Usage: node scripts/select-visual-stories.mjs <since> <out-file>

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { readBaselines } from './baselines.mjs';
import { changedFiles, filesReaching, runAllChange } from './changes.mjs';
import { root } from './ts-program.mjs';

const [since, out] = process.argv.slice(2);
if (!since || !out) {
  throw new Error('usage: select-visual-stories.mjs <since> <out-file>');
}

const { stories, expected, missing } = readBaselines();
const changed = changedFiles(since);
const runAll = runAllChange(changed);

let selected;
let reason;
if (runAll) {
  selected = stories.map((story) => story.id);
  reason = `${runAll} changed, which reaches every story`;
} else {
  const storyPath = (story) => join(root, story.importPath);
  const reached = new Set(filesReaching(changed, [...new Set(stories.map(storyPath))]));
  const byChange = stories
    .filter((story) => reached.has(storyPath(story)))
    .map((story) => story.id);
  const byBaseline = [...changed.map((file) => join(root, file)), ...missing]
    .map((file) => expected.get(file))
    .filter(Boolean);
  selected = [...new Set([...byChange, ...byBaseline])].sort();
  reason =
    `${byChange.length} reached by ${changed.length} changed file(s), ` +
    `${new Set(byBaseline).size} with changed or missing baselines`;
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(selected));
console.log(
  `Visual stories: ${selected.length} of ${stories.length} (${reason}), listed in ${relative(root, out)}.`,
);
