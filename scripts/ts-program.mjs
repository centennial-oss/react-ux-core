// Shared by the scripts that read the source with the TypeScript compiler: the repo root, the src/ prefix, the
// Storybook story files, a program built with tsconfig.json's options, and the generators' common flags.

import { readdirSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const SRC = join(root, 'src') + sep;

// Every Storybook story file, as .storybook/main.ts finds them (src/**/*.stories.tsx), in a stable order.
export const storyFiles = readdirSync(join(root, 'src'), { recursive: true })
  .filter((file) => file.endsWith('.stories.tsx'))
  .map((file) => join(root, 'src', file))
  .sort();

// tsconfig.json's compiler options.
export function compilerOptions() {
  const config = ts.readConfigFile(join(root, 'tsconfig.json'), ts.sys.readFile);
  return ts.parseJsonConfigFileContent(config.config, ts.sys, root).options;
}

export function createProgram(rootNames) {
  return ts.createProgram({ rootNames, options: compilerOptions() });
}

// The generators' common flags: `--out <file>` writes somewhere other than the tracked file (the make *-check
// targets diff the two), and `--quiet` drops warnings and progress output.
export function generatorArgs(trackedFile) {
  const outIndex = process.argv.indexOf('--out');
  if (outIndex > 0 && !process.argv[outIndex + 1]) {
    throw new Error('--out needs a file path');
  }
  return {
    out: outIndex > 0 ? process.argv[outIndex + 1] : join(root, trackedFile),
    isQuiet: process.argv.includes('--quiet'),
  };
}
