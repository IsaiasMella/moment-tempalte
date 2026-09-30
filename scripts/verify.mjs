/**
 * Checks the built site (dist/): every internal link, image, stylesheet, script,
 * srcset candidate and CSS url() must point to a file that exists.
 * Run after `npm run build`:  npm run verify
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('dist');
if (!fs.existsSync(root)) throw new Error('No dist/ folder: run `npm run build` first.');
const all = fs.readdirSync(root, { recursive: true }).map(String);
const pages = all.filter((file) => file.endsWith('.html'));
const styles = all.filter((file) => file.endsWith('.css'));
if (pages.length < 30) throw new Error(`Incomplete build: only ${pages.length} HTML pages.`);

const missing = new Set();
let checked = 0;

/** Resolves a site-relative URL ("/story/x/", "/_astro/a.webp") against dist/. */
function check(from, raw) {
  if (!raw.startsWith('/') || raw.startsWith('//')) return; // external or relative-to-scheme
  const url = decodeURIComponent(raw.split(/[?#]/)[0]);
  checked++;
  const local = path.join(root, url);
  if (!fs.existsSync(local) || (fs.statSync(local).isDirectory() && !fs.existsSync(path.join(local, 'index.html')))) {
    missing.add(`${from}: ${raw}`);
  }
}

for (const file of pages) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  for (const [, url] of html.matchAll(/\s(?:src|href|data-lightbox-src|poster)="([^"]+)"/g)) check(file, url);
  for (const [, list] of html.matchAll(/\s(?:srcset|data-lightbox-srcset|imagesrcset)="([^"]+)"/g)) {
    for (const candidate of list.split(',')) check(file, candidate.trim().split(/\s+/)[0]);
  }
}
for (const file of styles) {
  const css = fs.readFileSync(path.join(root, file), 'utf8');
  for (const [, url] of css.matchAll(/url\((?:'|")?([^'")]+)/g)) check(file, url);
}

console.log(`${pages.length} pages, ${styles.length} stylesheets; ${checked} local references checked.`);
if (missing.size) {
  console.error(`Missing:\n${[...missing].join('\n')}`);
  process.exitCode = 1;
} else console.log('All local links and assets resolve.');
