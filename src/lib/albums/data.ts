import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

export { getAlbums, type AlbumEntry } from '../content';

/**
 * Minimal synchronous read of the album front matter, for the one place that
 * cannot await (route filtering). Only counts per listing are derived from it.
 */
export function albumSummariesSync(): { slug: string; category: string; tags: string[] }[] {
  const dir = path.resolve('src/content/albums');
  if (!fs.existsSync(dir)) return [];
  const showDrafts = process.env.ALBUM_DRAFTS === '1';
  const out: { slug: string; category: string; tags: string[] }[] = [];
  for (const file of fs.readdirSync(dir)) {
    const match = file.match(/^([^_].*)\.(md|mdx|ya?ml)$/);
    if (!match) continue;
    const source = fs.readFileSync(path.join(dir, file), 'utf8');
    const front = /\.ya?ml$/.test(file) ? source : source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
    try {
      const data = (yaml.load(front) ?? {}) as { draft?: boolean; category?: string; tags?: string[] | null };
      if (data.draft && !showDrafts) continue;
      out.push({ slug: match[1], category: String(data.category ?? ''), tags: (data.tags ?? []).map(String) });
    } catch { /* invalid YAML: the content collection reports it */ }
  }
  return out;
}

export const slugify = (value: string) => value
  .normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().trim().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-');

export const tagSlug = (tag: string) => slugify(tag).replace(/-+/g, '-').replace(/^-|-$/g, '');
