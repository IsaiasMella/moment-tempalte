/**
 * Typed helpers to read the content collections (see src/content.config.ts).
 * Pages call these in their frontmatter, e.g. `const settings = await getSiteSettings();`.
 *
 * React/Next.js equivalent: the data-fetching functions a Server Component
 * awaits (or `getStaticProps`), except everything runs once, at build time.
 */
import { getCollection, getEntry } from 'astro:content';
import {
  CATEGORIES,
  type Album,
  type ContactPage,
  type HomePage,
  type PricingPage,
  type PrivacyPage,
  type SiteSettings,
  type StudioPage,
} from './schemas';

/** Global settings from src/content/settings/site.yml. */
export async function getSiteSettings(): Promise<SiteSettings> {
  const entry = await getEntry('siteSettings', 'site');
  if (!entry) throw new Error('Missing src/content/settings/site.yml');
  return entry.data;
}

/** Page data by id, i.e. the file name in src/content/pages/<id>.yml. */
export interface PageContent {
  home: HomePage;
  studio: StudioPage;
  pricing: PricingPage;
  contact: ContactPage;
  privacy: PrivacyPage;
}
export type PageId = keyof PageContent;

const pageCollection = {
  home: 'homePage',
  studio: 'studioPage',
  pricing: 'pricingPage',
  contact: 'contactPage',
  privacy: 'privacyPage',
} as const satisfies Record<PageId, string>;

/** Content of one editable page, e.g. `await getPage('privacy')`. */
export async function getPage<Id extends PageId>(id: Id): Promise<PageContent[Id]> {
  const entry = await getEntry(pageCollection[id], id);
  if (!entry) throw new Error(`Missing src/content/pages/${id}.yml`);
  return entry.data as PageContent[Id];
}

/** An album plus the values derived from its file name and category. */
export interface AlbumEntry extends Album {
  /** File name without extension; also the URL segment. */
  slug: string;
  /** Page URL: /story/<slug>/. */
  url: string;
  /** Human label of the category, e.g. "Weddings". */
  categoryLabel: string;
}

/**
 * Published albums, newest first (ties by slug). Drafts are left out unless
 * the build runs with ALBUM_DRAFTS=1.
 */
export async function getAlbums(): Promise<AlbumEntry[]> {
  const showDrafts = process.env.ALBUM_DRAFTS === '1';
  const entries = await getCollection('albums', ({ data }) => showDrafts || !data.draft);
  return entries
    .map((entry) => ({
      ...entry.data,
      slug: entry.id,
      url: `/story/${entry.id}/`,
      categoryLabel: CATEGORIES[entry.data.category],
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime() || a.slug.localeCompare(b.slug));
}
