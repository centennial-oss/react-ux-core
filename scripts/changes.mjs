// What your changes reach, for the *-changed make targets. The changes are the files committed since a commit (the
// Makefile passes where this branch left main, or on main the last commit), plus staged, unstaged and untracked
// files. A test or story is reached when its imports, followed to the end (static and dynamic, the repo's own files
// only), include a changed file. A change under one of RUN_ALL_PATHS (Storybook's config, the global styles, test
// setup, dependencies, build config) reaches every test.
//
// Vitest's own --changed can't be used: test/styles.css has Tailwind scan src/, so in Vite's module graph every
// source file is a dependency of every unit test.
//
// Usage: node scripts/changes.mjs <since>   prints the changed files that still exist, one per line.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { compilerOptions, root } from './ts-program.mjs';

const RUN_ALL_PATHS = [
  '.storybook/',
  'src/styles/',
  'test/setup.ts',
  'test/styles.css',
  'test/visual/',
  'package.json',
  'package-lock.json',
  'vite.config.ts',
  'playwright.config.ts',
  'tsconfig.json',
];

const git = (...args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);

/** Changed files, relative to the repo root, including deleted ones. */
export function changedFiles(since) {
  return [
    ...new Set([
      ...git('diff', '--name-only', `${since}...HEAD`),
      ...git('diff', '--name-only', '--cached'),
      ...git('ls-files', '--others', '--modified', '--exclude-standard'),
    ]),
  ].sort();
}

/** The first changed file (relative to the repo root) that reaches every test, if any. */
export const runAllChange = (changed) =>
  changed.find((file) =>
    RUN_ALL_PATHS.some((path) => (path.endsWith('/') ? file.startsWith(path) : file === path)),
  );

/** The files (absolute paths) among `candidates` whose imports reach one of `changed` (relative paths). */
export function filesReaching(changed, candidates) {
  const changedPaths = new Set(changed.map((file) => join(root, file)));
  const options = compilerOptions();
  const importsOf = new Map();
  const imports = (file) => {
    if (!importsOf.has(file)) {
      const { importedFiles } = ts.preProcessFile(readFileSync(file, 'utf8'), true, true);
      importsOf.set(
        file,
        importedFiles
          .map(
            ({ fileName }) => ts.resolveModuleName(fileName, file, options, ts.sys).resolvedModule,
          )
          .filter((resolved) => resolved && !resolved.isExternalLibraryImport)
          .map((resolved) => resolved.resolvedFileName),
      );
    }
    return importsOf.get(file);
  };
  return candidates.filter((candidate) => {
    const seen = new Set([candidate]);
    const queue = [candidate];
    while (queue.length > 0) {
      const file = queue.pop();
      if (changedPaths.has(file)) {
        return true;
      }
      for (const next of imports(file)) {
        if (!seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    return false;
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const file of changedFiles(process.argv[2] ?? 'HEAD')) {
    if (existsSync(join(root, file))) {
      console.log(file);
    }
  }
}
