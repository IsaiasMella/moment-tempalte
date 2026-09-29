import fs from 'node:fs';
import path from 'node:path';
import { site } from '../config/site';

const root = path.resolve('src/reference');

export function referencePages(): { route: string; file: string }[] {
  const result: { route: string; file: string }[] = [];
  function walk(directory: string, prefix: string) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(file, `${prefix}${entry.name}/`);
      else if (entry.name === 'index.html') result.push({ route: prefix, file });
    }
  }
  walk(root, '');
  return result;
}

export function renderReference(file: string, origin: string): string {
  const destination = origin.replace(/\/$/, '');
  let html = fs.readFileSync(file, 'utf8')
    .replaceAll(site.referenceOrigin, destination)
    .replaceAll(encodeURIComponent(site.referenceOrigin), encodeURIComponent(destination));
  // Keep the public demo's disabled forms unless a real provider is configured.
  for (const [className, action] of [['subscribe-form', site.newsletterAction], ['contact-form', site.enquiryAction]]) {
    if (!action) continue;
    const escaped = action.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
    html = html.replace(new RegExp(`<form\\b[^>]*class="[^"]*${className}[^"]*"[^>]*>[\\s\\S]*?<\\/form>`, 'g'), form =>
      form.replace('<form ', `<form action="${escaped}" `).replace(/ disabled(?=[\s>])/g, '').replace(/<p[^>]*class="[^"]*form-note[^"]*"[^>]*>[\s\S]*?<\/p>/g, '')
    );
  }
  return html;
}
