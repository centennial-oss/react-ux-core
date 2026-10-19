// Component count: prints how many React components the package exports, per entry point, and how many Storybook
// story files document them.
//
// Every exported PascalCase value declared under src/ whose call signature returns JSX counts (function, forwardRef,
// memo and lazy components alike), so sub-parts such as MenuItem or Tab count on their own. Contexts don't count. A
// component exported from several entry points is counted once, under the first entry that exports it.
//
// Usage: node scripts/count-components.mjs [--list]
//   --list  also print every component's name, grouped by entry point.

import ts from 'typescript';
import { checker, entries, entryLabel, exportsOf, isOwn } from './entries.mjs';
import { storyFiles } from './ts-program.mjs';

const isList = process.argv.includes('--list');

// The checker prints JSX.Element as plain `Element`; the word boundary keeps HTMLElement and friends out.
const RETURNS_JSX = /\b(?:Element|ReactElement|ReactNode)\b/;

function isComponent(symbol) {
  const decl = symbol.declarations?.[0];
  if (!decl || !isOwn(decl)) {
    return false;
  }
  const type = checker.getTypeOfSymbolAtLocation(symbol, decl);
  // React 19 contexts are callable as components too, but they aren't controls.
  if (type.getProperty('Provider') && type.getProperty('Consumer')) {
    return false;
  }
  return type
    .getCallSignatures()
    .some((signature) => RETURNS_JSX.test(checker.typeToString(signature.getReturnType())));
}

const byEntry = new Map();
const seen = new Set();
for (const entry of entries) {
  const names = [];
  for (const { name, symbol } of exportsOf(entry)) {
    if (
      !/^[A-Z]/.test(name) ||
      !(symbol.flags & (ts.SymbolFlags.Function | ts.SymbolFlags.Variable)) ||
      seen.has(symbol) ||
      !isComponent(symbol)
    ) {
      continue;
    }
    seen.add(symbol);
    names.push(name);
  }
  if (names.length) {
    byEntry.set(entryLabel(entry), names.sort());
  }
}

const width = Math.max(...[...byEntry.keys()].map((label) => label.length));
for (const [label, names] of byEntry) {
  console.log(`  ${label.padEnd(width)}  ${String(names.length).padStart(4)}`);
  if (isList) {
    console.log(`      ${names.join(', ')}`);
  }
}
console.log(`Components exported: ${seen.size} (${storyFiles.length} Storybook story files)`);
