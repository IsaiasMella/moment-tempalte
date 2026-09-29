import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('dist');
const files = fs.readdirSync(root, { recursive: true }).filter(f => f.endsWith('.html'));
const missing = new Set();
if (files.length < 30) throw new Error(`Incomplete build: only ${files.length} HTML pages.`);
let references = 0;
for (const file of files) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  for (const match of html.matchAll(/(?:src|href|data-lightbox-src)="(\/[^"#?]*)/g)) {
    const url = decodeURIComponent(match[1]);
    if (url.startsWith('//')) continue;
    references++;
    const local = path.join(root, url);
    if (!fs.existsSync(local) && !fs.existsSync(path.join(local, 'index.html'))) missing.add(`${file}: ${url}`);
  }
}
console.log(`${files.length} pages; ${references} local references checked.`);
if (missing.size) { console.error([...missing].join('\n')); process.exitCode = 1; }
else console.log('All local links and assets resolve.');
