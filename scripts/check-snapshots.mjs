// Visual baselines gate: every capture the visual tests make (each story tagged `visual`, in each theme, at each
// screen size) has a committed baseline, and every baseline belongs to one. It reads only the Storybook index, so it
// takes seconds where the visual run takes most of an hour, and `make check` runs it before the slow gates: a run
// with a missing baseline fails at the start instead of at the end. Run `make storybook-build` first.

import { relative } from 'node:path';
import { readBaselines } from './baselines.mjs';
import { root } from './ts-program.mjs';

const { expected, missing, orphaned, untracked } = readBaselines();

const report = (files, problem, fix) => {
  if (files.length === 0) {
    return;
  }
  console.error(`${files.length} visual baseline(s) ${problem}:`);
  for (const file of files.sort()) {
    console.error(`  ${relative(root, file)}`);
  }
  console.error(`${fix}\n`);
};

report(
  missing,
  'missing',
  'Record just those (and whatever your changes reach) with `make storybook-build update-snapshots-changed`, in ' +
    'Docker so they match CI, then review the images and commit them.',
);
report(
  orphaned,
  'with no story (renamed or removed, or tagged !visual)',
  'Delete them, or record the renamed stories with `make storybook-build update-snapshots-changed`.',
);
report(
  untracked,
  'not added to git',
  'Review them, then `git add test/visual/__snapshots__` so CI has them.',
);

if (missing.length + orphaned.length + untracked.length > 0) {
  process.exit(1);
}
console.log(`Visual baselines: all ${expected.size} present and committed.`);
