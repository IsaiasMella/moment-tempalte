import fs from 'node:fs';
import path from 'node:path';
const reference = 'https://moments.xocoweb.workers.dev';
const origin = (process.env.SITE_URL || 'http://localhost:4321').replace(/\/$/, '');
for (const name of ['robots.txt', 'sitemap-index.xml', 'sitemap-0.xml', 'site.webmanifest']) {
  const file = path.resolve('dist', name);
  if (fs.existsSync(file)) fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replaceAll(reference, origin));
}
const errorPage = path.resolve('dist/404/index.html');
if (fs.existsSync(errorPage)) fs.copyFileSync(errorPage, path.resolve('dist/404.html'));
