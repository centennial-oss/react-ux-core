// Minimal static file server for the built Storybook, used by the visual tests. No dependencies, so it runs inside
// the Playwright Docker image with the host's node_modules mounted.
//
//   node scripts/serve-static.mjs <dir> <port>

import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const [dirArg = 'storybook-static', portArg = '6007'] = process.argv.slice(2);
const root = resolve(dirArg);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  let file = normalize(join(root, decodeURIComponent(url.pathname)));
  if (!file.startsWith(root)) {
    response.writeHead(403).end();
    return;
  }
  try {
    if (statSync(file).isDirectory()) {
      file = join(file, 'index.html');
    }
    statSync(file);
  } catch {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(response);
}).listen(Number(portArg), '127.0.0.1', () => {
  console.log(`Serving ${root} at http://127.0.0.1:${portArg}`);
});
