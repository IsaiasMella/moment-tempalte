/**
 * Everything the album listings share: page size, tag URLs, date formats and
 * the fixed copy of the archive pages (/work/, /collection/<category>/, /tag/<tag>/).
 *
 * React/Next.js equivalent: a plain `lib/` module of helpers and constants.
 */
import type { AlbumEntry } from './content';
import { CATEGORIES, type Category } from './schemas';

/** Albums per listing page (/work/, /work/2/, …). */
export const PAGE_SIZE = 12;
/** Slides in the home page hero carousel. */
export const HOME_HERO_SLIDES = 3;

/** "Late June" -> "late-june"; accents are dropped ("Été" -> "ete"). */
export const tagSlug = (tag: string): string => tag
  .normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().trim().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-')
  .replace(/-+/g, '-').replace(/^-|-$/g, '');

export const tagUrl = (tag: string): string => `/tag/${tagSlug(tag)}/`;
export const categoryUrl = (category: Category): string => `/collection/${category}/`;

/** Every tag used by the albums, keyed by slug (first spelling wins). */
export function albumTags(albums: AlbumEntry[]): Map<string, string> {
  const tags = new Map<string, string>();
  for (const album of albums) {
    for (const tag of album.tags) {
      const slug = tagSlug(tag);
      if (slug && !tags.has(slug)) tags.set(slug, tag);
    }
  }
  return tags;
}

const longDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const monthYear = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
/** "29 August 2026" */
export const formatLong = (date: Date): string => longDate.format(date);
/** "August 2026" */
export const formatMonth = (date: Date): string => monthYear.format(date);

/** Heading, intro line and meta description of each listing. */
export const ARCHIVE_COPY = {
  work: {
    title: 'Work',
    lede: 'A wall of pictures. Every frame opens the day it came from.',
    description: 'Every story, in one wall of photographs.',
  },
  collections: {
    weddings: {
      lede: 'Whole days, photographed from the quiet of the morning through to whenever the music stops.',
    },
    portraits: {
      lede: 'Two hours, one place, and a photograph of yourself you do not mind looking at.',
    },
  } satisfies Record<Category, { lede: string }>,
  tag: (label: string) => ({
    title: `Tagged ${label}`,
    lede: `Everything filed under ${label}.`,
    description: `Stories tagged ${label}.`,
  }),
};

export const categoryLabel = (category: Category): string => CATEGORIES[category];
