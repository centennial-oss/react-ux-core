// Package contents gate: only dist/, LICENSE, NOTICE, README.md and package.json may be published.
// A published npm version is permanent, so this runs before every publish. Run it after `make build`.

import { execFileSync } from 'node:child_process';

const ALWAYS_ALLOWED = new Set(['package.json', 'README.md', 'LICENSE', 'NOTICE']);
const REQUIRED = [
  'dist/index.js',
  'dist/index.d.ts',
  'dist/styles.css',
  'LICENSE',
  'NOTICE',
  'README.md',
];
const FORBIDDEN_IN_DIST = /\.(test|test-d|stories)\.|__screenshots__|\.tsbuildinfo$/;

const [report] = JSON.parse(
  execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { encoding: 'utf8' }),
);
const files = report.files.map((file) => file.path);

const failures = [];
for (const file of files) {
  if (ALWAYS_ALLOWED.has(file)) {
    continue;
  }
  if (!file.startsWith('dist/')) {
    failures.push(`${file} is outside dist/ and must not be published`);
  } else if (FORBIDDEN_IN_DIST.test(file)) {
    failures.push(`${file} is a test, story or build artefact and must not be published`);
  }
}
for (const file of REQUIRED) {
  if (!files.includes(file)) {
    failures.push(`${file} is missing from the package (run make build first)`);
  }
}

if (failures.length > 0) {
  console.error('Package contents check failed:');
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}
console.log(
  `Package contents check passed: ${files.length} files, ${(report.size / 1024).toFixed(1)} kB packed (${report.filename}).`,
);
