// Prints one version's section of CHANGELOG.md (written by Changesets), for the GitHub release notes.
//
//   node .github/scripts/changelog-section.mjs <version> [CHANGELOG.md]

import { readFileSync } from 'node:fs';

const [version, file = 'CHANGELOG.md'] = process.argv.slice(2);
if (!version) {
  console.error('usage: changelog-section.mjs <version> [CHANGELOG.md]');
  process.exit(2);
}

const lines = readFileSync(file, 'utf8').split('\n');
const start = lines.findIndex((line) => line.trim() === `## ${version}`);
if (start === -1) {
  console.error(`${file} has no "## ${version}" section`);
  process.exit(1);
}
const rest = lines.slice(start + 1);
const end = rest.findIndex((line) => line.startsWith('## '));
const section = (end === -1 ? rest : rest.slice(0, end)).join('\n').trim();
console.log(section || `Release ${version}.`);
