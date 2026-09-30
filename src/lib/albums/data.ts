import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { getCollection } from 'astro:content';
import { CATEGORIES, type Album } from './schema';

export interface AlbumEntry extends Album {
  slug: string;
  url: string;
  categoryLabel: string;
}

const byDate = (a: { date: Date; slug: string }, b: { date: Date; slug: string }) =>
  b.date.getTime() - a.date.getTime() || a.slug.localeCompare(b.slug);

/** Published albums, newest first. Drafts are only built with ALBUM_DRAFTS=1 (never by default). */
export async function getAlbums(): Promise<AlbumEntry[]> {
  const entries = await getCollection('albums');
  const showDrafts = process.env.ALBUM_DRAFTS === '1';
  return entries
    .filter((entry) => showDrafts || !entry.data.draft)
    .map((entry) => ({
      ...entry.data,
      slug: entry.id,
      url: `/story/${entry.id}/`,
      categoryLabel: CATEGORIES[entry.data.category],
    }))
    .sort(byDate);
}

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
