// Updates versions.json at the root of the Storybook site, which the docs' version switcher reads.
//
//   node .github/scripts/update-versions.mjs <site-dir> <version>
//
// Stable versions are added to `versions` (newest first) and become `latest`. Prereleases only replace `next`.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [siteDir, version] = process.argv.slice(2);
if (!siteDir || !version) {
  console.error('usage: update-versions.mjs <site-dir> <version>');
  process.exit(2);
}

const file = join(siteDir, 'versions.json');
const data = existsSync(file)
  ? JSON.parse(readFileSync(file, 'utf8'))
  : { latest: null, next: null, versions: [] };

function compare(a, b) {
  const [pa, pb] = [a, b].map((v) => v.split('.').map(Number));
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) {
      return pa[i] - pb[i];
    }
  }
  return 0;
}

if (version.includes('-')) {
  data.next = version;
} else {
  data.versions = [...new Set([version, ...data.versions])].sort((a, b) => compare(b, a));
  data.latest = data.versions[0];
}

writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
console.log(
  `versions.json: latest ${data.latest ?? 'none'}, next ${data.next ?? 'none'}, ${data.versions.length} versions`,
);
