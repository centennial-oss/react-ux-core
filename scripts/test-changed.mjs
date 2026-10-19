// Runs only the unit and story tests your changes reach (see changes.mjs): each test file and story file whose
// imports include a changed file, or every test when a change reaches everything.
//
// Usage: node scripts/test-changed.mjs <since> [vitest arguments…]

import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { changedFiles, filesReaching, runAllChange } from './changes.mjs';
import { root, storyFiles } from './ts-program.mjs';

const [since, ...vitestArgs] = process.argv.slice(2);
if (!since) {
  throw new Error('usage: test-changed.mjs <since> [vitest arguments…]');
}

// The unit tests vite.config.ts includes (src/**/*.test.{ts,tsx}), and the story files the story tests run.
const testFiles = readdirSync(join(root, 'src'), { recursive: true })
  .filter((file) => /\.test\.tsx?$/.test(file))
  .map((file) => join(root, 'src', file));

const changed = changedFiles(since);
const runAll = runAllChange(changed);
const run = (args) => {
  try {
    execFileSync('npx', ['vitest', 'run', ...args, ...vitestArgs], { cwd: root, stdio: 'inherit' });
  } catch (error) {
    process.exit(error.status ?? 1);
  }
};

if (runAll) {
  console.log(`${runAll} changed, which reaches every test: running them all.`);
  run([]);
} else {
  const reached = filesReaching(changed, [...testFiles, ...storyFiles]).map((file) =>
    relative(root, file),
  );
  console.log(
    `Tests: ${reached.length} of ${testFiles.length + storyFiles.length} test and story files reached by ` +
      `${changed.length} changed file(s).`,
  );
  if (reached.length > 0) {
    run(reached);
  }
}
