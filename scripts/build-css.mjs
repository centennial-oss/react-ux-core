// Builds dist/styles.css: inlines the files src/styles/index.css imports, in order, into one stylesheet.
//
// The output stays Tailwind source (it uses @theme, @utility and @custom-variant), so the app's Tailwind build
// processes it. It also registers this package's dist/ folder as a Tailwind source, so Tailwind generates the
// utility classes our components use without the app adding its own @source line.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const stylesDir = resolve(root, 'src/styles');
const outFile = resolve(root, 'dist/styles.css');

const entry = readFileSync(resolve(stylesDir, 'index.css'), 'utf8');
const imports = [...entry.matchAll(/^@import '\.\/([\w-]+\.css)';$/gm)].map((match) => match[1]);
if (imports.length === 0) {
  throw new Error('src/styles/index.css has no @import lines to inline');
}

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const parts = [
  `/*! ${pkg.name} v${pkg.version} | ${pkg.license} */`,
  "@source './';",
  ...imports.map(
    (file) => `/* ${file} */\n${readFileSync(resolve(stylesDir, file), 'utf8').trim()}`,
  ),
];

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, `${parts.join('\n\n')}\n`);
console.log(`Wrote ${outFile} (${imports.join(', ')})`);
