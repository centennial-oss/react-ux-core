// License gate: every runtime dependency must be under an Apache-2.0-compatible license.
//
// Checks the packages in package.json's dependencies and peerDependencies, plus everything they depend on at
// runtime, as installed in node_modules. Copyleft (GPL, LGPL, AGPL, SSPL), missing and unrecognised licenses fail.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ALLOWED = new Set(['MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', '0BSD']);

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rootPkg = readJson(join(root, 'package.json'));

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

// Finds an installed package the way Node does: in node_modules folders from `fromDir` up to the repo root.
function findPackageDir(name, fromDir) {
  for (let dir = fromDir; dir.startsWith(root); dir = dirname(dir)) {
    const candidate = join(dir, 'node_modules', name);
    if (existsSync(join(candidate, 'package.json'))) {
      return candidate;
    }
    if (dir === root) {
      break;
    }
  }
  return null;
}

function licenseOf(pkg) {
  if (typeof pkg.license === 'string') {
    return pkg.license;
  }
  if (pkg.license && typeof pkg.license.type === 'string') {
    return pkg.license.type;
  }
  if (Array.isArray(pkg.licenses)) {
    return pkg.licenses.map((entry) => entry.type).join(' OR ');
  }
  return null;
}

// Evaluates a simple SPDX expression: "A OR B" passes if any part passes, "A AND B" only if all do.
function isAllowed(expression) {
  const clean = expression.replace(/[()]/g, ' ').trim();
  if (/\sOR\s/.test(clean)) {
    return clean.split(/\s+OR\s+/).some(isAllowed);
  }
  if (/\sAND\s/.test(clean)) {
    return clean.split(/\s+AND\s+/).every(isAllowed);
  }
  return ALLOWED.has(clean);
}

const direct = Object.keys({ ...rootPkg.dependencies, ...rootPkg.peerDependencies });
const queue = direct.map((name) => ({ name, fromDir: root, via: 'package.json' }));
const seen = new Map();
const failures = [];

while (queue.length > 0) {
  const { name, fromDir, via } = queue.shift();
  const dir = findPackageDir(name, fromDir);
  if (!dir) {
    failures.push(`${name} (required by ${via}) is not installed, so its license can't be checked`);
    continue;
  }
  if (seen.has(dir)) {
    continue;
  }
  const pkg = readJson(join(dir, 'package.json'));
  const license = licenseOf(pkg);
  seen.set(dir, `${pkg.name}@${pkg.version} ${license ?? 'UNKNOWN'}`);
  if (!license || !isAllowed(license)) {
    failures.push(
      `${pkg.name}@${pkg.version} has license "${license ?? 'none'}" (required by ${via})`,
    );
  }
  for (const dep of Object.keys(pkg.dependencies ?? {})) {
    queue.push({ name: dep, fromDir: dir, via: pkg.name });
  }
}

if (failures.length > 0) {
  console.error('License check failed. Allowed licenses:', [...ALLOWED].join(', '));
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}
console.log(
  `License check passed: ${seen.size} runtime packages, all ${[...ALLOWED].join(' / ')}.`,
);
