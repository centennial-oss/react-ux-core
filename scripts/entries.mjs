// Shared by the scripts that read the package's public API with the TypeScript compiler: the entry points
// (src/index.ts and src/*/index.ts), a program and checker over them, and helpers for walking their exports.

import { existsSync, readdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import ts from 'typescript';
import { createProgram, SRC, root } from './ts-program.mjs';

export { root };

export const entries = [join(root, 'src/index.ts')];
for (const dir of readdirSync(join(root, 'src'))) {
  const entry = join(root, 'src', dir, 'index.ts');
  if (existsSync(entry)) {
    entries.push(entry);
  }
}

export const program = createProgram(entries);
export const checker = program.getTypeChecker();

export const isOwn = (node) => node.getSourceFile().fileName.startsWith(SRC);
export const entryLabel = (entry) => (entry === entries[0] ? '.' : './' + basename(dirname(entry)));

export function exportsOf(entry) {
  const moduleSymbol = checker.getSymbolAtLocation(program.getSourceFile(entry));
  return checker.getExportsOfModule(moduleSymbol).map((exported) => ({
    name: exported.getName(),
    symbol: exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported,
  }));
}
